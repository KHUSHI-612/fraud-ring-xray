"""
Fraud Ring X-Ray — Defense-Only Decision Support API
===================================================
DEFENSE-ONLY SYSTEM GUARANTEE:
This system operates strictly in a READ-ONLY, defense-only mode for fraud investigation.
It flags and explains suspicious network activity to assist human risk analysts.
It NEVER automatically blocks, bans, suspends, disables, or takes enforcement action against any account.
No automated enforcement endpoints (/block, /ban, /suspend) exist or are permitted.
"""

import csv
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ml_classifier_cv import get_ml_validation_metrics

app = FastAPI(
    title="Fraud Ring X-Ray API",
    description="Defense-only decision support tool for fraud ring detection and forensic explainability."
)


# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"


def format_signal_label(sig: str) -> str:
    mapping = {
        "address": "shared shipping address",
        "device": "shared device fingerprint",
        "ip": "shared IP address",
        "behavioral": "behavioral similarity",
    }
    return mapping.get(sig, sig)


def generate_explanation(account_id: str, cluster: dict) -> str:
    density = cluster["weight_density"]
    signals = cluster.get("signals_involved", [])
    signals_str = ", ".join([format_signal_label(s) for s in signals]) if signals else "no strong shared signals"
    size = cluster.get("size", len(cluster.get("members", [])))
    cid = cluster["cluster_id"]
    tier_label = cluster.get("tier_label", "Needs Review")
    conf_tier = cluster.get("confidence_tier", "needs_human_review")

    if conf_tier == "high_confidence_fraud":
        return (
            f"Account {account_id} belongs to {cid} ({size} members). "
            f"Flagged as {tier_label} with a risk density score of {density:.3f} "
            f"due to {signals_str}."
        )
    elif conf_tier == "needs_human_review":
        return (
            f"Account {account_id} belongs to {cid} ({size} members). "
            f"Flagged as {tier_label} with a risk density score of {density:.3f} "
            f"due to {signals_str}. Analyst inspection recommended."
        )
    else:
        return (
            f"Account {account_id} belongs to {cid} ({size} members). "
            f"Risk density score of {density:.3f} is below the suspicious threshold. "
            f"Likely legitimate."
        )


@app.get("/clusters")
def get_clusters():
    """Read and return the contents of data/clusters.json as JSON."""
    clusters_file = DATA_DIR / "clusters.json"
    if not clusters_file.exists():
        raise HTTPException(status_code=404, detail="clusters.json not found")
    
    with open(clusters_file, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/evaluation")
def get_evaluation():
    """Read and return the contents of data/evaluation.json as JSON."""
    evaluation_file = DATA_DIR / "evaluation.json"
    if not evaluation_file.exists():
        raise HTTPException(status_code=404, detail="evaluation.json not found")
    
    with open(evaluation_file, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/ml-validation")
def get_ml_validation():
    """Return validated ML model cross-validation metrics and feature importance coefficients."""
    return get_ml_validation_metrics()


@app.get("/early-warning-replay")
def get_early_warning_replay():
    """
    Simulates chronological account signups, builds graph iteratively,
    flags ring detection points when component weight density >= 0.5,
    and calculates preventable rupee loss (₹) from orders placed after detection.
    """
    from early_warning import compute_early_warning_simulation
    return compute_early_warning_simulation()


@app.get("/razorpay-sync-status")
def get_razorpay_sync_status():
    """Returns Razorpay test-mode API sync status and synced order count."""
    rzp_file = DATA_DIR / "razorpay_orders.json"
    if not rzp_file.exists():
        return {
            "synced": False,
            "order_count": 0,
            "badge_label": "Not Synced"
        }

    try:
        with open(rzp_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            cnt = data.get("order_count", len(data.get("orders", [])))
            return {
                "synced": True,
                "order_count": cnt,
                "source": data.get("source", "Razorpay Test-Mode API (v1/orders)"),
                "badge_label": f"Synced with Razorpay test-mode API ({cnt} orders)"
            }
    except Exception:
        return {
            "synced": False,
            "order_count": 0,
            "badge_label": "Not Synced"
        }


@app.get("/explain/{account_id}")
def explain_account(account_id: str):
    """
    Find which cluster account_id belongs to in clusters.json,
    and return confidence_tier, tier_label, weight_density, ml_confidence, and explanation.
    """
    clusters_file = DATA_DIR / "clusters.json"
    if not clusters_file.exists():
        raise HTTPException(status_code=404, detail="clusters.json not found")

    with open(clusters_file, "r", encoding="utf-8") as f:
        clusters = json.load(f)

    matching_cluster = None
    for c in clusters:
        if account_id in c.get("members", []):
            matching_cluster = c
            break

    if not matching_cluster:
        return {
            "account_id": account_id,
            "cluster_id": None,
            "confidence_tier": "likely_legitimate",
            "tier_label": "Likely Legitimate",
            "tier_color": "#34d399",
            "weight_density": 0.0,
            "ml_confidence": 0.01,
            "flagged_suspicious": False,
            "signals_involved": [],
            "explanation": f"Account {account_id} is an independent account with no shared device, address, IP, or behavioral connections. Likely legitimate."
        }

    explanation = generate_explanation(account_id, matching_cluster)

    return {
        "account_id": account_id,
        "cluster_id": matching_cluster["cluster_id"],
        "confidence_tier": matching_cluster.get("confidence_tier", "likely_legitimate"),
        "tier_label": matching_cluster.get("tier_label", "Likely Legitimate"),
        "tier_color": matching_cluster.get("tier_color", "#34d399"),
        "weight_density": matching_cluster["weight_density"],
        "ml_confidence": matching_cluster.get("ml_confidence", 0.0),
        "flagged_suspicious": matching_cluster["flagged_suspicious"],
        "signals_involved": matching_cluster.get("signals_involved", []),
        "explanation": explanation
    }



@app.get("/accounts")
def get_all_accounts():
    """Read and return list of all account IDs from data/accounts.csv and data/razorpay_orders.json."""
    account_ids = []
    accounts_file = DATA_DIR / "accounts.csv"
    if accounts_file.exists():
        with open(accounts_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                account_ids.append(row["account_id"])

    rzp_file = DATA_DIR / "razorpay_orders.json"
    if rzp_file.exists():
        try:
            with open(rzp_file, "r", encoding="utf-8") as f:
                rzp_data = json.load(f)
                for item in rzp_data.get("orders", []):
                    acc_id = item.get("notes", {}).get("account_id")
                    if acc_id and acc_id not in account_ids:
                        account_ids.append(acc_id)
        except Exception:
            pass

    return account_ids


@app.get("/accounts/{account_id}")
def get_account(account_id: str):
    """
    Find matching account_id in data/accounts.csv or data/razorpay_orders.json,
    return account's complete details and orders. Return 404 if account does not exist.
    """
    accounts_file = DATA_DIR / "accounts.csv"
    orders_file = DATA_DIR / "orders.csv"

    account_data = None

    # 1. Search in accounts.csv
    if accounts_file.exists():
        with open(accounts_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["account_id"] == account_id:
                    account_data = dict(row)
                    break

    # 2. Search in orders.csv for CSV orders
    orders = []
    if account_data and orders_file.exists():
        with open(orders_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["account_id"] == account_id:
                    order_dict = dict(row)
                    if "amount" in order_dict:
                        try:
                            order_dict["amount"] = float(order_dict["amount"])
                        except (ValueError, TypeError):
                            pass
                    orders.append(order_dict)

    # 3. If not found in CSVs, check data/razorpay_orders.json
    if not account_data:
        rzp_file = DATA_DIR / "razorpay_orders.json"
        if rzp_file.exists():
            try:
                with open(rzp_file, "r", encoding="utf-8") as f:
                    rzp_data = json.load(f)
                    rzp_orders = rzp_data.get("orders", [])

                    matching_rzp_orders = []
                    sample_notes = None

                    for item in rzp_orders:
                        notes = item.get("notes", {})
                        item_acc_id = notes.get("account_id")
                        if item_acc_id == account_id:
                            if not sample_notes:
                                sample_notes = notes
                                created_ts = item.get("created_at", 1775000000)

                            matching_rzp_orders.append({
                                "order_id": item["id"],
                                "account_id": account_id,
                                "order_date": str(item.get("created_at", "")),
                                "amount": float(item.get("amount", 0)) / 100.0,
                                "status": item.get("status", "created")
                            })

                    if sample_notes:
                        account_data = {
                            "account_id": account_id,
                            "signup_date": "2026-08-26T16:00:00",
                            "device_id": sample_notes.get("device_id", "DEV_RZP_TEST"),
                            "shipping_address": sample_notes.get("shipping_address", "12 MG Road, Bangalore"),
                            "ip_address": sample_notes.get("ip_address", "192.168.1.105"),
                            "orders": matching_rzp_orders
                        }
                        orders = matching_rzp_orders

            except Exception as e:
                print(f"Error parsing razorpay_orders.json in get_account: {e}")

    if not account_data:
        raise HTTPException(status_code=404, detail=f"Account with ID '{account_id}' not found")

    account_data["orders"] = orders
    return account_data


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

