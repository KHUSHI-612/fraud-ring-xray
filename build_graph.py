"""
Fraud Ring X-Ray — Graph Construction & Clustering
====================================================
Reads data/accounts.csv + data/orders.csv, builds a weighted graph
connecting accounts that share identifiers (device / IP / address),
finds connected clusters, and scores each cluster's suspiciousness.

Then compares results against data/ground_truth.json to compute
honest precision / recall / false-positive info.

Run:
    python build_graph.py

Outputs (in ./data/):
    clusters.json      -- every detected cluster + its members + score
    evaluation.json     -- precision/recall/FP metrics vs ground truth
"""

import json
import os
from collections import defaultdict
from datetime import datetime

import networkx as nx
import pandas as pd

DATA_DIR = "data"

# ---------------------------------------------------------------------------
# Edge weights — how much each shared signal contributes.
# This is the fix for the "one shared IP links everyone" sparsity/density
# problem: device match is a much stronger signal than IP match.
# ---------------------------------------------------------------------------
EDGE_WEIGHTS = {
    "device": 1.0,   # strongest — device fingerprints rarely collide innocently
    "address": 0.6,  # medium — families/offices can legitimately share this
    "ip": 0.3,        # weakest — public IPs get shared by many unrelated people (NAT, cafes, offices)
}

# A cluster only counts as "suspicious" if its combined edge weight
# density clears this bar -- tune this after looking at results.
# Set via a 10-seed threshold sweep (see threshold_sweep.py / data/threshold_sweep_results.json).
# Precision/recall are flat between 0.3-0.5 (recall ~0.983 avg throughout), then recall
# falls off a cliff above 0.5 (0.983 -> 0.650) for only a modest precision gain.
# 0.5 is the last point before that cliff: the best precision achievable with no
# recall cost. Chosen deliberately because in fraud detection, missing a real ring
# is usually costlier than one extra manual review of a false positive.
MIN_CLUSTER_WEIGHT_DENSITY = 0.5


def load_data():
    accounts = pd.read_csv(os.path.join(DATA_DIR, "accounts.csv"))
    orders = pd.read_csv(os.path.join(DATA_DIR, "orders.csv"))
    return accounts, orders


def build_graph(accounts: pd.DataFrame) -> nx.Graph:
    G = nx.Graph()
    for _, row in accounts.iterrows():
        G.add_node(row["account_id"], **row.to_dict())

    # group accounts by each shared signal, then connect all pairs within a group
    for signal, col in [("device", "device_id"), ("address", "shipping_address"), ("ip", "ip_address")]:
        groups = defaultdict(list)
        for _, row in accounts.iterrows():
            groups[row[col]].append(row["account_id"])

        for value, members in groups.items():
            if len(members) < 2:
                continue  # no sharing, no edge
            for i in range(len(members)):
                for j in range(i + 1, len(members)):
                    a, b = members[i], members[j]
                    w = EDGE_WEIGHTS[signal]
                    if G.has_edge(a, b):
                        # multiple shared signals between the same pair -> stack weight
                        G[a][b]["weight"] += w
                        G[a][b]["signals"].append(signal)
                    else:
                        G.add_edge(a, b, weight=w, signals=[signal])

    return G


def behavioral_signal_boost(G: nx.Graph, accounts: pd.DataFrame, orders: pd.DataFrame):
    """
    Behavioral rings (Type C in the generator) have NO hard shared field --
    the signal is: signed up within minutes of each other AND placed orders
    in a tight time window AND have a high return rate.
    This adds soft edges for accounts that match on ALL of these at once.
    """
    accounts = accounts.copy()
    accounts["signup_date"] = pd.to_datetime(accounts["signup_date"])

    # bucket accounts into 15-minute signup windows
    accounts["signup_bucket"] = accounts["signup_date"].dt.floor("15min")

    # compute return rate per account
    order_stats = orders.groupby("account_id").agg(
        n_orders=("order_id", "count"),
        n_returned=("status", lambda s: (s.isin(["returned", "disputed"])).sum()),
    )
    order_stats["return_rate"] = order_stats["n_returned"] / order_stats["n_orders"]

    high_return_accounts = set(order_stats[order_stats["return_rate"] >= 0.4].index)

    buckets = defaultdict(list)
    for _, row in accounts.iterrows():
        if row["account_id"] in high_return_accounts:
            buckets[row["signup_bucket"]].append(row["account_id"])

    for bucket, members in buckets.items():
        if len(members) < 2:
            continue
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                a, b = members[i], members[j]
                w = 0.5  # behavioral soft signal weight
                if G.has_edge(a, b):
                    G[a][b]["weight"] += w
                    G[a][b]["signals"].append("behavioral")
                else:
                    G.add_edge(a, b, weight=w, signals=["behavioral"])


def find_clusters(G: nx.Graph):
    clusters = []
    for component in nx.connected_components(G):
        if len(component) < 2:
            continue  # isolated node, not a cluster
        subgraph = G.subgraph(component)
        n_nodes = subgraph.number_of_nodes()
        n_possible_edges = n_nodes * (n_nodes - 1) / 2
        total_weight = sum(d["weight"] for _, _, d in subgraph.edges(data=True))
        weight_density = total_weight / n_possible_edges if n_possible_edges else 0

        all_signals = set()
        for _, _, d in subgraph.edges(data=True):
            all_signals.update(d["signals"])

        clusters.append(
            {
                "cluster_id": f"cluster_{len(clusters)}",
                "members": sorted(component),
                "size": n_nodes,
                "weight_density": round(weight_density, 3),
                "signals_involved": sorted(all_signals),
                "flagged_suspicious": weight_density >= MIN_CLUSTER_WEIGHT_DENSITY,
            }
        )
    return clusters


def evaluate_against_ground_truth(clusters, ground_truth):
    """
    Compute honest precision / recall / false-positive info.
    A cluster is a 'true positive' if it substantially overlaps a real ring.
    """
    ring_member_sets = {
        rid: set(info["members"]) for rid, info in ground_truth["rings"].items()
    }
    noise_member_sets = {
        nid: set(info["members"]) for nid, info in ground_truth["noise_groups"].items()
    }

    flagged_clusters = [c for c in clusters if c["flagged_suspicious"]]

    true_positives = []
    false_positives = []
    ring_recovery = {}  # ring_id -> fraction of members recovered

    matched_ring_ids = set()

    for c in flagged_clusters:
        c_members = set(c["members"])
        best_match, best_overlap = None, 0
        for rid, members in ring_member_sets.items():
            overlap = len(c_members & members)
            if overlap > best_overlap:
                best_overlap, best_match = overlap, rid

        if best_match and best_overlap / len(ring_member_sets[best_match]) >= 0.5:
            true_positives.append({"cluster_id": c["cluster_id"], "matched_ring": best_match})
            matched_ring_ids.add(best_match)
            ring_recovery[best_match] = round(best_overlap / len(ring_member_sets[best_match]), 2)
        else:
            # check if it's actually a noise group (legit false-positive bait)
            is_noise = any(
                len(c_members & noise_members) / len(noise_members) >= 0.5
                for noise_members in noise_member_sets.values()
            )
            false_positives.append(
                {
                    "cluster_id": c["cluster_id"],
                    "members": c["members"],
                    "is_known_noise_bait": is_noise,
                }
            )

    n_true_rings = len(ring_member_sets)
    n_caught = len(matched_ring_ids)
    missed_rings = [rid for rid in ring_member_sets if rid not in matched_ring_ids]

    precision = len(true_positives) / len(flagged_clusters) if flagged_clusters else 0
    recall = n_caught / n_true_rings if n_true_rings else 0

    return {
        "total_clusters_found": len(clusters),
        "total_flagged_suspicious": len(flagged_clusters),
        "true_positives": true_positives,
        "false_positives": false_positives,
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "rings_caught": n_caught,
        "rings_total": n_true_rings,
        "rings_missed": missed_rings,
        "per_ring_member_recovery_rate": ring_recovery,
    }


def main():
    accounts, orders = load_data()
    G = build_graph(accounts)
    behavioral_signal_boost(G, accounts, orders)
    clusters = find_clusters(G)

    with open(os.path.join(DATA_DIR, "clusters.json"), "w") as f:
        json.dump(clusters, f, indent=2)

    with open(os.path.join(DATA_DIR, "ground_truth.json")) as f:
        ground_truth = json.load(f)

    evaluation = evaluate_against_ground_truth(clusters, ground_truth)
    with open(os.path.join(DATA_DIR, "evaluation.json"), "w") as f:
        json.dump(evaluation, f, indent=2)

    print(f"Total connected clusters found: {len(clusters)}")
    print(f"Flagged as suspicious: {evaluation['total_flagged_suspicious']}")
    print(f"Precision: {evaluation['precision']}")
    print(f"Recall:    {evaluation['recall']}")
    print(f"Rings caught: {evaluation['rings_caught']} / {evaluation['rings_total']}")
    print(f"Rings missed: {evaluation['rings_missed']}")
    print(f"False positives: {len(evaluation['false_positives'])}")
    for fp in evaluation["false_positives"]:
        tag = "KNOWN NOISE BAIT" if fp["is_known_noise_bait"] else "UNEXPECTED FP"
        print(f"  - {fp['cluster_id']} ({tag}): {fp['members']}")


if __name__ == "__main__":
    main()
