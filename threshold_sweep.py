"""
Fraud Ring X-Ray — Threshold Sweep
====================================
Tests several MIN_CLUSTER_WEIGHT_DENSITY threshold values, each across
multiple random seeds, to find where precision improves without recall
dropping much. This does NOT modify generate_data.py or build_graph.py --
it reads the ALREADY-GENERATED accounts.csv/orders.csv structure logic
by re-running generation + detection inline per seed, per threshold.

This produces a real precision-recall curve: instead of picking
MIN_CLUSTER_WEIGHT_DENSITY = 0.4 arbitrarily, you'll have evidence for
whichever value you choose.

Run:
    python threshold_sweep.py

Output:
    Prints a table of threshold -> avg precision / avg recall
    Saves data/threshold_sweep_results.json
"""

import random
import uuid
import json
from collections import defaultdict
from datetime import datetime, timedelta

import networkx as nx
import pandas as pd
from faker import Faker

SEEDS_TO_TEST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
THRESHOLDS_TO_TEST = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]

N_LEGIT_ACCOUNTS = 260
N_NOISE_GROUPS = 6
NOISE_GROUP_SIZE_RANGE = (2, 4)

RING_CONFIGS = [
    ("RING_A1", "device_share", 5),
    ("RING_A2", "device_share", 4),
    ("RING_B1", "address_share", 6),
    ("RING_B2", "address_share", 4),
    ("RING_C1", "behavioral", 5),
    ("RING_C2", "behavioral", 4),
]

EDGE_WEIGHTS = {"device": 1.0, "address": 0.6, "ip": 0.3}

BASE_DATE = datetime(2026, 6, 1)
DATE_SPREAD_DAYS = 90


def generate_graph_for_seed(seed: int, fake: Faker):
    """Generates one dataset + graph for a given seed. Returns (G, ring_members)."""
    random.seed(seed)
    Faker.seed(seed)

    def random_datetime():
        return BASE_DATE + timedelta(
            days=random.randint(0, DATE_SPREAD_DAYS),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        )

    def new_device_id():
        return "dev_" + uuid.uuid4().hex[:12]

    def new_ip():
        return fake.ipv4_public()

    accounts = []
    ring_members = {}

    for i in range(N_LEGIT_ACCOUNTS):
        accounts.append(
            {"account_id": f"ACC_L{i:04d}", "device_id": new_device_id(),
             "ip_address": new_ip(), "shipping_address": fake.address(),
             "signup_date": random_datetime()}
        )

    for g in range(N_NOISE_GROUPS):
        size = random.randint(*NOISE_GROUP_SIZE_RANGE)
        signal = random.choice(["device", "ip", "address"])
        shared_device = new_device_id()
        shared_ip = new_ip()
        shared_address = fake.address()
        for j in range(size):
            acc_id = f"ACC_N{g}_{j}"
            accounts.append(
                {
                    "account_id": acc_id,
                    "device_id": shared_device if signal == "device" else new_device_id(),
                    "ip_address": shared_ip if signal == "ip" else new_ip(),
                    "shipping_address": shared_address if signal == "address" else fake.address(),
                    "signup_date": random_datetime(),
                }
            )

    for ring_id, ring_type, size in RING_CONFIGS:
        members = [f"ACC_{ring_id}_{k}" for k in range(size)]
        window_start = random_datetime()
        shared_device = new_device_id()
        shared_address = fake.address()
        for acc_id in members:
            if ring_type == "device_share":
                accounts.append({"account_id": acc_id, "device_id": shared_device,
                                  "ip_address": new_ip(), "shipping_address": fake.address(),
                                  "signup_date": window_start})
            elif ring_type == "address_share":
                accounts.append({"account_id": acc_id, "device_id": new_device_id(),
                                  "ip_address": new_ip(), "shipping_address": shared_address,
                                  "signup_date": window_start})
            else:
                accounts.append({"account_id": acc_id, "device_id": new_device_id(),
                                  "ip_address": new_ip(), "shipping_address": fake.address(),
                                  "signup_date": window_start + timedelta(minutes=random.randint(0, 20))})
        ring_members[ring_id] = members

    accounts_df = pd.DataFrame(accounts)

    G = nx.Graph()
    for _, row in accounts_df.iterrows():
        G.add_node(row["account_id"])

    for signal, col in [("device", "device_id"), ("address", "shipping_address"), ("ip", "ip_address")]:
        groups = defaultdict(list)
        for _, row in accounts_df.iterrows():
            groups[row[col]].append(row["account_id"])
        for members in groups.values():
            if len(members) < 2:
                continue
            for i in range(len(members)):
                for j in range(i + 1, len(members)):
                    a, b = members[i], members[j]
                    w = EDGE_WEIGHTS[signal]
                    if G.has_edge(a, b):
                        G[a][b]["weight"] += w
                    else:
                        G.add_edge(a, b, weight=w)

    accounts_df["signup_bucket"] = pd.to_datetime(accounts_df["signup_date"]).dt.floor("15min")
    buckets = defaultdict(list)
    for _, row in accounts_df.iterrows():
        buckets[row["signup_bucket"]].append(row["account_id"])
    for members in buckets.values():
        if len(members) < 2:
            continue
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                a, b = members[i], members[j]
                if G.has_edge(a, b):
                    G[a][b]["weight"] += 0.5
                else:
                    G.add_edge(a, b, weight=0.5)

    return G, ring_members


def evaluate_at_threshold(G, ring_members, threshold):
    clusters = []
    for component in nx.connected_components(G):
        if len(component) < 2:
            continue
        subgraph = G.subgraph(component)
        n = subgraph.number_of_nodes()
        possible = n * (n - 1) / 2
        total_w = sum(d["weight"] for _, _, d in subgraph.edges(data=True))
        density = total_w / possible if possible else 0
        clusters.append({"members": set(component), "flagged": density >= threshold})

    flagged = [c for c in clusters if c["flagged"]]
    matched_rings = set()
    tp, fp = 0, 0
    for c in flagged:
        best_match, best_overlap = None, 0
        for rid, members in ring_members.items():
            overlap = len(c["members"] & set(members))
            if overlap > best_overlap:
                best_overlap, best_match = overlap, rid
        if best_match and best_overlap / len(ring_members[best_match]) >= 0.5:
            tp += 1
            matched_rings.add(best_match)
        else:
            fp += 1

    precision = tp / len(flagged) if flagged else 0
    recall = len(matched_rings) / len(ring_members)
    return precision, recall, fp


def main():
    fake = Faker("en_IN")

    # Pre-build the graph once per seed (expensive part), reuse across thresholds
    seed_graphs = {}
    for seed in SEEDS_TO_TEST:
        G, ring_members = generate_graph_for_seed(seed, fake)
        seed_graphs[seed] = (G, ring_members)

    sweep_results = []
    print(f"{'Threshold':>10} | {'Avg Precision':>14} | {'Avg Recall':>11} | {'Avg False Pos':>14}")
    print("-" * 60)

    for threshold in THRESHOLDS_TO_TEST:
        precisions, recalls, fps = [], [], []
        for seed, (G, ring_members) in seed_graphs.items():
            p, r, fp = evaluate_at_threshold(G, ring_members, threshold)
            precisions.append(p)
            recalls.append(r)
            fps.append(fp)

        avg_p = sum(precisions) / len(precisions)
        avg_r = sum(recalls) / len(recalls)
        avg_fp = sum(fps) / len(fps)

        sweep_results.append(
            {"threshold": threshold, "avg_precision": round(avg_p, 3),
             "avg_recall": round(avg_r, 3), "avg_false_positives": round(avg_fp, 2)}
        )
        print(f"{threshold:>10} | {avg_p:>14.3f} | {avg_r:>11.3f} | {avg_fp:>14.2f}")

    with open("data/threshold_sweep_results.json", "w") as f:
        json.dump(sweep_results, f, indent=2)

    print("\nSaved full results to data/threshold_sweep_results.json")
    print("\nLook for the threshold where avg_precision rises sharply")
    print("without avg_recall dropping much -- that's your evidence-backed choice.")


if __name__ == "__main__":
    main()
