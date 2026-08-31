"""
Fraud Ring X-Ray — Synthetic Data Generator
=============================================
Generates a batch of accounts + orders with:
  - Mostly legitimate, independent accounts
  - 4-6 deliberately planted "fraud rings" using different sharing patterns
  - Realistic noise (legit cases that superficially LOOK suspicious,
    e.g. a family sharing one address/device)
  - A ground_truth.json file recording which accounts are actually in a
    ring and which ring type it is — so you can compute honest
    precision/recall/false-positive-cost later.

Run:
    python generate_data.py

Outputs (in ./data/):
    accounts.csv
    orders.csv
    ground_truth.json
"""

import csv
import json
import os
import random
import uuid
from datetime import datetime, timedelta

from faker import Faker

fake = Faker("en_IN")
random.seed(42)  # reproducible — change/remove if you want fresh data each run

OUT_DIR = "data"
os.makedirs(OUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Config — tweak these numbers freely
# ---------------------------------------------------------------------------
N_LEGIT_ACCOUNTS = 260          # independent, clean accounts
N_NOISE_GROUPS = 6              # legit-but-suspicious-looking groups (false-positive bait)
NOISE_GROUP_SIZE_RANGE = (2, 4) # e.g. a family or office sharing a device/address

RING_CONFIGS = [
    # (ring_id, type, size, description)
    ("RING_A1", "device_share", 5, "Shared device fingerprint"),
    ("RING_A2", "device_share", 4, "Shared device fingerprint (smaller)"),
    ("RING_B1", "address_share", 6, "Same freight-forwarder-style shipping address"),
    ("RING_B2", "address_share", 4, "Same shipping address, different payment methods"),
    ("RING_C1", "behavioral", 5, "Signed up within minutes, similar order values, high return rate"),
    ("RING_C2", "behavioral", 4, "Signed up within minutes, high early-return rate"),
]

PAYMENT_METHODS = ["card", "upi", "netbanking", "wallet"]
ORDER_STATUSES = ["delivered", "returned", "disputed"]
ORDER_STATUS_WEIGHTS_LEGIT = [0.85, 0.13, 0.02]
ORDER_STATUS_WEIGHTS_RING = [0.45, 0.45, 0.10]  # rings return/dispute far more

BASE_DATE = datetime(2026, 6, 1)
DATE_SPREAD_DAYS = 90


def random_datetime(start=BASE_DATE, spread_days=DATE_SPREAD_DAYS):
    return start + timedelta(
        days=random.randint(0, spread_days),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )


def new_device_id():
    return "dev_" + uuid.uuid4().hex[:12]


def new_ip():
    return fake.ipv4_public()


def new_account(account_id, device_id=None, ip=None, address=None, signup_date=None):
    return {
        "account_id": account_id,
        "name": fake.name(),
        "phone": fake.msisdn()[:10],
        "email": fake.email(),
        "device_id": device_id or new_device_id(),
        "ip_address": ip or new_ip(),
        "shipping_address": address or fake.address().replace("\n", ", "),
        "signup_date": (signup_date or random_datetime()).isoformat(),
    }


def make_orders_for_account(account_id, n_orders, is_ring=False, ring_window_start=None):
    orders = []
    for _ in range(n_orders):
        if is_ring and ring_window_start:
            # rings tend to transact in tighter time clusters
            order_date = ring_window_start + timedelta(
                hours=random.randint(0, 72), minutes=random.randint(0, 59)
            )
            status = random.choices(ORDER_STATUSES, weights=ORDER_STATUS_WEIGHTS_RING)[0]
            amount = round(random.uniform(800, 2500), 2)  # rings often cluster on mid-value goods
        else:
            order_date = random_datetime()
            status = random.choices(ORDER_STATUSES, weights=ORDER_STATUS_WEIGHTS_LEGIT)[0]
            amount = round(random.uniform(150, 6000), 2)

        orders.append(
            {
                "order_id": "ORD_" + uuid.uuid4().hex[:10],
                "account_id": account_id,
                "amount": amount,
                "payment_method": random.choice(PAYMENT_METHODS),
                "order_date": order_date.isoformat(),
                "status": status,
            }
        )
    return orders


# ---------------------------------------------------------------------------
# Build the dataset
# ---------------------------------------------------------------------------
accounts = []
orders = []
ground_truth = {"rings": {}, "noise_groups": {}}  # account_id -> group info

# 1. Legit, fully independent accounts
for i in range(N_LEGIT_ACCOUNTS):
    acc = new_account(f"ACC_L{i:04d}")
    accounts.append(acc)
    orders.extend(make_orders_for_account(acc["account_id"], random.randint(1, 4)))

# 2. Noise groups — legit but structurally suspicious (false-positive bait)
#    e.g. a family sharing one device, or an office sharing one IP.
for g in range(N_NOISE_GROUPS):
    group_id = f"NOISE_{g}"
    size = random.randint(*NOISE_GROUP_SIZE_RANGE)
    shared_signal = random.choice(["device", "ip", "address"])
    shared_device = new_device_id() if shared_signal == "device" else None
    shared_ip = new_ip() if shared_signal == "ip" else None
    shared_address = fake.address().replace("\n", ", ") if shared_signal == "address" else None

    member_ids = []
    for j in range(size):
        acc_id = f"ACC_N{g}_{j}"
        acc = new_account(
            acc_id,
            device_id=shared_device,
            ip=shared_ip,
            address=shared_address,
        )
        accounts.append(acc)
        member_ids.append(acc_id)
        # noise groups behave like normal customers — low return rate
        orders.extend(make_orders_for_account(acc_id, random.randint(1, 3)))

    ground_truth["noise_groups"][group_id] = {
        "shared_signal": shared_signal,
        "members": member_ids,
        "label": "legit_false_positive_bait",
    }

# 3. Planted fraud rings
for ring_id, ring_type, size, desc in RING_CONFIGS:
    member_ids = [f"ACC_{ring_id}_{k}" for k in range(size)]
    ring_window_start = random_datetime()

    if ring_type == "device_share":
        shared_device = new_device_id()
        for acc_id in member_ids:
            acc = new_account(acc_id, device_id=shared_device, signup_date=ring_window_start)
            accounts.append(acc)
            orders.extend(
                make_orders_for_account(acc_id, random.randint(1, 3), is_ring=True, ring_window_start=ring_window_start)
            )

    elif ring_type == "address_share":
        shared_address = fake.address().replace("\n", ", ")
        for acc_id in member_ids:
            acc = new_account(acc_id, address=shared_address, signup_date=ring_window_start)
            accounts.append(acc)
            orders.extend(
                make_orders_for_account(acc_id, random.randint(1, 3), is_ring=True, ring_window_start=ring_window_start)
            )

    elif ring_type == "behavioral":
        # no single hard-shared field — signal is behavioral:
        # signups minutes apart, similar order values, high return rate.
        for k, acc_id in enumerate(member_ids):
            signup_time = ring_window_start + timedelta(minutes=random.randint(0, 20))
            acc = new_account(acc_id, signup_date=signup_time)
            accounts.append(acc)
            orders.extend(
                make_orders_for_account(acc_id, random.randint(1, 2), is_ring=True, ring_window_start=ring_window_start)
            )

    ground_truth["rings"][ring_id] = {
        "type": ring_type,
        "description": desc,
        "members": member_ids,
        "label": "fraud_ring",
    }

random.shuffle(accounts)
random.shuffle(orders)

# ---------------------------------------------------------------------------
# Write outputs
# ---------------------------------------------------------------------------
with open(os.path.join(OUT_DIR, "accounts.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(accounts[0].keys()))
    writer.writeheader()
    writer.writerows(accounts)

with open(os.path.join(OUT_DIR, "orders.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(orders[0].keys()))
    writer.writeheader()
    writer.writerows(orders)

with open(os.path.join(OUT_DIR, "ground_truth.json"), "w", encoding="utf-8") as f:
    json.dump(ground_truth, f, indent=2)

print(f"Accounts: {len(accounts)}")
print(f"Orders:   {len(orders)}")
print(f"Planted rings: {len(ground_truth['rings'])}")
print(f"Noise groups:  {len(ground_truth['noise_groups'])}")
print(f"\nFiles written to ./{OUT_DIR}/")
