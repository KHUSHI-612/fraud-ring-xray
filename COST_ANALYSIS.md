# Economic Cost Analysis — Fraud Ring X-Ray

This document provides a data-backed economic evaluation of false negatives (missed fraud rings) and false positives (legitimate/noise clusters incorrectly flagged) calculated directly from the synthetic order records in `data/orders.csv`, `data/accounts.csv`, `data/ground_truth.json`, and `data/threshold_sweep_results.json`.

---

## 1. 🚨 False Negative Cost Analysis (Planted Fraud Rings)

A **False Negative** occurs when a real fraud ring is missed by the detection system. The direct financial loss to the platform is equal to the total monetary value of all orders placed by accounts belonging to that fraud ring.

### Fraud Ring Financial Breakdown (`data/orders.csv`)

| Fraud Ring ID | Member Accounts | Total Orders | Total Order Value (₹) |
| :--- | :--- | :--- | :--- |
| **`RING_A1`** (Device Share) | 5 | 11 | **₹17,719.70** |
| **`RING_A2`** (Device Share) | 4 | 7 | **₹11,624.93** |
| **`RING_B1`** (Address Share) | 6 | 13 | **₹20,676.97** |
| **`RING_B2`** (Address Share) | 4 | 10 | **₹15,966.65** |
| **`RING_C1`** (Behavioral) | 5 | 8 | **₹9,211.00** |
| **`RING_C2`** (Behavioral) | 4 | 6 | **₹11,752.92** |

### Statistical Summary across 6 Planted Rings

- **Mean Order Value**: **₹14,492.03**
- **Median Order Value**: **₹13,859.78** *(Recommended Representative FN Cost)*
- **Minimum Order Value**: **₹9,211.00** (`RING_C1`)
- **Maximum Order Value**: **₹20,676.97** (`RING_B1`)

> [!TIP]
> **Recommended Representative False Negative Cost**: **₹13,859.78**
> 
> **Rationale**: The median ring order value (₹13,859.78) is recommended as the representative cost of missing a fraud ring because it is robust against outlier rings (such as the unusually large `RING_B1` at ₹20,676.97 or smaller `RING_C1` at ₹9,211.00).

---

## 2. ⚠️ False Positive Cost Analysis (Flagged Legitimate / Noise Clusters)

A **False Positive** occurs when a cluster of non-fraudulent accounts or noise-bait accounts is flagged as suspicious by the detector (`MIN_CLUSTER_WEIGHT_DENSITY = 0.5`).

### Flagged False-Positive Clusters Breakdown (`data/clusters.json`)

The current production detector flags 3 false-positive clusters (all 3 are planted noise-bait groups `N5`, `N1`, `N3`):

| Cluster ID | Ground Truth Type | Cluster Size | Total Orders | Total Order Financial Exposure (₹) |
| :--- | :--- | :--- | :--- | :--- |
| **`cluster_0`** | Known Noise Bait (`N5`) | 4 accounts | 5 | **₹17,642.67** |
| **`cluster_1`** | Known Noise Bait (`N1`) | 4 accounts | 6 | **₹20,482.54** |
| **`cluster_5`** | Known Noise Bait (`N3`) | 4 accounts | 6 | **₹18,435.68** |

### Financial Exposure Summary across FP Clusters

- **Mean Financial Exposure**: **₹18,853.63**
- **Median Financial Exposure**: **₹18,435.68** *(Gross Order Volume at Risk)*
- **Minimum Financial Exposure**: **₹17,642.67** (`cluster_0`)
- **Maximum Financial Exposure**: **₹20,482.54** (`cluster_1`)

> [!IMPORTANT]
> **Data Observability & Operational Cost Model**:
> Analyst review time and customer-friction measurements are **not directly observed in the synthetic dataset**.
> 
> To build an honest and complete cost model, we define two project assumptions:
> 1. **Fixed Analyst Review Cost**: Defined as **₹500.00** per cluster (assumes 30 minutes of manual analyst review at ₹1,000/hour).
> 2. **Customer Friction Cost**: Defined as **5% of median order exposure** (**₹921.78** per cluster) representing brand equity loss when orders are held.
> 
> **Combined Representative Operational FP Cost**: **₹500.00 + ₹921.78 = ₹1,421.78 per FP cluster** (~₹1,422).

---

## 3. ⚖️ Threshold Economic Cost Justification

Using multi-seed evaluation data from `data/threshold_sweep_results.json` (6 rings total per seed), we compare detection thresholds across expected false-negative losses and expected false-positive operational costs:

- **Representative FN Loss**: **₹13,859.78** per missed ring (median ring value).
- **Combined Representative FP Cost**: **₹1,421.78** per FP cluster (₹500 manual review + ₹921.78 customer friction).

### Threshold Economic Loss Comparison Table

| Detection Threshold | Avg Recall | Expected Missed Rings (out of 6) | Avg FP Clusters | Expected FN Loss (₹) | Expected FP Combined Cost (₹1,421.78/cluster) | Total Expected Economic Risk (₹) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`0.3`** | `0.983` | 0.10 | 9.9 | ₹1,385.98 | ₹14,075.62 | **₹15,461.60** |
| **`0.4`** | `0.983` | 0.10 | 7.8 | ₹1,385.98 | ₹11,089.88 | **₹12,475.86** |
| **`0.5`** (Production) | `0.983` | 0.10 | 7.7 | ₹1,385.98 | ₹10,947.71 | **`₹12,333.69` (GLOBAL MINIMUM)** |
| **`0.6`** | `0.650` | 2.10 | 3.5 | ₹29,105.54 | ₹4,976.23 | **₹34,081.77** |
| **`0.7`** | `0.650` | 2.10 | 1.2 | ₹29,105.54 | ₹1,706.14 | **₹30,811.68** |
| **`0.8`** | `0.650` | 2.10 | 1.2 | ₹29,105.54 | ₹1,706.14 | **₹30,811.68** |

---

## 💡 Economic Tradeoff Conclusion & Defense Justification

1. **Threshold `0.5` Wins Handily Even Under Full Operational Cost**:
   - At **Threshold `0.5`**, total expected economic risk reaches its **global minimum of ₹12,333.69**.
   - Including both analyst review (₹500) and customer friction (5% = ₹921.78) into the FP cost (**₹1,421.78/cluster**) makes the evaluation complete and transparent, while confirming that **Threshold `0.5` easily beats `0.6` (₹34,081.77) and `0.7` (₹30,811.68)**.

2. **The Asymmetric Threat of Missed Fraud**:
   - Raising the threshold from `0.5` to `0.6` drops recall from `98.3%` to `65.0%` (missing 2.1 additional fraud rings per seed).
   - Because a single missed fraud ring costs **₹13,859.78**, expected fraud losses jump from **₹1,385.98 to ₹29,105.54** (~21x loss increase), dwarfing any savings gained by reducing false positives.

3. **Recommended Representative Numbers for Defense**:
   - **Representative False Negative Cost**: **₹13,859.78** (median order value per fraud ring).
   - **Combined Representative False Positive Operational Cost**: **₹1,421.78** (~₹1,422/cluster, combining ₹500 manual review + ₹921.78 customer friction).
