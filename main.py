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


from ml_classifier_cv import get_ml_validation_metrics


@app.get("/ml-validation")
def get_ml_validation():
    """Return validated ML model cross-validation metrics and feature importance coefficients."""
    return get_ml_validation_metrics()


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
    """Read and return list of all account IDs from data/accounts.csv."""
    accounts_file = DATA_DIR / "accounts.csv"
    if not accounts_file.exists():
        raise HTTPException(status_code=500, detail="accounts.csv not found")

    account_ids = []
    with open(accounts_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            account_ids.append(row["account_id"])

    return account_ids


@app.get("/accounts/{account_id}")
def get_account(account_id: str):
    """
    Find matching account_id in data/accounts.csv, return account's complete row,
    and find all orders belonging to that account_id in data/orders.csv.
    Return 404 if account does not exist.
    """
    accounts_file = DATA_DIR / "accounts.csv"
    orders_file = DATA_DIR / "orders.csv"

    if not accounts_file.exists():
        raise HTTPException(status_code=500, detail="accounts.csv not found")

    account_data = None
    with open(accounts_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["account_id"] == account_id:
                account_data = dict(row)
                break

    if not account_data:
        raise HTTPException(status_code=404, detail=f"Account with ID '{account_id}' not found")

    orders = []
    if orders_file.exists():
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

    account_data["orders"] = orders
    return account_data


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
