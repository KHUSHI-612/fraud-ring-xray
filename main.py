import csv
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Fraud Ring X-Ray API")

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"


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
