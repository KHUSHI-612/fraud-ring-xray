import json
import os
import networkx as nx
import pandas as pd
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

def compute_early_warning_simulation():
    accounts_file = DATA_DIR / "accounts.csv"
    orders_file = DATA_DIR / "orders.csv"
    gt_file = DATA_DIR / "ground_truth.json"

    if not accounts_file.exists() or not orders_file.exists() or not gt_file.exists():
        return {"error": "Dataset files missing"}

    accounts = pd.read_csv(accounts_file)
    orders = pd.read_csv(orders_file)

    with open(gt_file, "r", encoding="utf-8") as f:
        ground_truth = json.load(f)

    rings = ground_truth.get("rings", {})

    acc_to_ring = {}
    for ring_id, ring_data in rings.items():
        for m in ring_data.get("members", []):
            acc_to_ring[m] = ring_id

    accounts["signup_date_dt"] = pd.to_datetime(accounts["signup_date"])
    orders["order_date_dt"] = pd.to_datetime(orders["order_date"])

    sorted_accounts = accounts.sort_values("signup_date_dt").reset_index(drop=True)

    device_to_accs = defaultdict(list)
    address_to_accs = defaultdict(list)

    G = nx.Graph()

    ring_detections = {}
    steps = []
    cumulative_prevented = 0.0

    # Build orders lookup by member for fast calculation
    orders_by_acc = defaultdict(list)
    for _, o_row in orders.iterrows():
        orders_by_acc[o_row["account_id"]].append({
            "order_id": o_row["order_id"],
            "amount": float(o_row["amount"]),
            "order_date": o_row["order_date"],
            "order_date_dt": o_row["order_date_dt"]
        })

    for idx, row in sorted_accounts.iterrows():
        acc_id = row["account_id"]
        signup_str = row["signup_date"]
        device_id = row["device_id"]
        address = row["shipping_address"]

        G.add_node(acc_id, **row.to_dict())

        new_edges = []
        for prev_acc in device_to_accs[device_id]:
            if G.has_edge(acc_id, prev_acc):
                G[acc_id][prev_acc]["weight"] += 1.0
                if "device" not in G[acc_id][prev_acc]["signals"]:
                    G[acc_id][prev_acc]["signals"].append("device")
            else:
                G.add_edge(acc_id, prev_acc, weight=1.0, signals=["device"])
            new_edges.append({"from": acc_id, "to": prev_acc, "type": "device", "weight": 1.0})

        for prev_acc in address_to_accs[address]:
            if G.has_edge(acc_id, prev_acc):
                G[acc_id][prev_acc]["weight"] += 0.6
                if "address" not in G[acc_id][prev_acc]["signals"]:
                    G[acc_id][prev_acc]["signals"].append("address")
            else:
                G.add_edge(acc_id, prev_acc, weight=0.6, signals=["address"])
            new_edges.append({"from": acc_id, "to": prev_acc, "type": "address", "weight": 0.6})

        device_to_accs[device_id].append(acc_id)
        address_to_accs[address].append(acc_id)

        comp_nodes = list(nx.node_connected_component(G, acc_id))
        n_nodes = len(comp_nodes)

        if n_nodes >= 2:
            subG = G.subgraph(comp_nodes)
            total_weight = sum(d["weight"] for _, _, d in subG.edges(data=True))
            n_possible_edges = n_nodes * (n_nodes - 1) / 2
            density = total_weight / n_possible_edges if n_possible_edges > 0 else 0.0
        else:
            density = 0.0

        ring_flagged_info = None
        if density >= 0.5:
            rings_in_comp = set()
            for n in comp_nodes:
                if n in acc_to_ring:
                    rings_in_comp.add(acc_to_ring[n])

            for r_id in rings_in_comp:
                if r_id not in ring_detections:
                    ring_members = rings[r_id]["members"]
                    present_count = sum(1 for m in ring_members if m in G.nodes())
                    
                    det_dt = row["signup_date_dt"]

                    # Calculate prevented rupees for this ring
                    prevented_amt = 0.0
                    prevented_orders_cnt = 0
                    for m in ring_members:
                        for o in orders_by_acc.get(m, []):
                            if o["order_date_dt"] > det_dt:
                                prevented_amt += o["amount"]
                                prevented_orders_cnt += 1

                    det_obj = {
                        "ring_id": r_id,
                        "ring_type": rings[r_id].get("type", "unknown"),
                        "description": rings[r_id].get("description", ""),
                        "detection_timestamp": signup_str,
                        "members_present": present_count,
                        "total_members": len(ring_members),
                        "density": round(density, 3),
                        "prevented_rupees": round(prevented_amt, 2),
                        "prevented_orders_count": prevented_orders_cnt
                    }
                    ring_detections[r_id] = det_obj
                    ring_flagged_info = det_obj
                    cumulative_prevented += prevented_amt

        steps.append({
            "step": idx + 1,
            "account_id": acc_id,
            "timestamp": signup_str,
            "density": round(density, 3),
            "total_nodes": G.number_of_nodes(),
            "total_edges": G.number_of_edges(),
            "new_edges": new_edges,
            "ring_flagged": ring_flagged_info,
            "cumulative_prevented_rupees": round(cumulative_prevented, 2)
        })

    # Prepare response object
    sorted_detections = sorted(ring_detections.values(), key=lambda x: x["detection_timestamp"])
    total_prevented = sum(d["prevented_rupees"] for d in sorted_detections)

    return {
        "total_prevented_rupees": round(total_prevented, 2),
        "total_detected_rings": len(sorted_detections),
        "total_ground_truth_rings": len(rings),
        "ring_detections": sorted_detections,
        "timeline_steps": steps,
        "unsupported_behavioral_rings": [
            {
                "ring_id": "RING_C1",
                "reason": "Behavioral time synchronization and return rate >= 40% cannot be evaluated at signup time prior to purchase placement."
            },
            {
                "ring_id": "RING_C2",
                "reason": "Early-return rate behavior requires transaction return telemetry, which is unobservable at signup time."
            }
        ]
    }
