# Fraud Ring X-Ray — Project Executive Summary

## 📌 Overview

**Fraud Ring X-Ray** is an interactive, defense-only fraud detection and graph explainability platform. It combines graph algorithms (NetworkX connected components & edge weight density), a single-source risk tiering system, a validated machine learning classifier, and a React + D3 graph visualization interface.

---

## 🚀 Key Milestones & Accomplishments

### 1. 🛡️ Defense-Only System & Safety Guardrails
- **Core Principle**: Explicitly established that the system **only flags, scores, and explains** suspicious activity; it **never automatically blocks, bans, or suspends** accounts.
- **Implementation**:
  - Backend policy documentation in [`main.py`](file:///Users/khushii/fraud-ring-xray/main.py).
  - Dedicated **Safety & Guardrails** modal UI ([`GuardrailsModal.jsx`](file:///Users/khushii/fraud-ring-xray/frontend/src/components/GuardrailsModal.jsx)) and side-panel warning banners.

---

### 2. 🎯 Single-Source Confidence Tier Architecture
- **Single Source of Truth**: Centralized in `confidence_tier(weight_density)` within [`build_graph.py`](file:///Users/khushii/fraud-ring-xray/build_graph.py):
  - 🟢 **LIKELY LEGITIMATE** (`density < 0.5`, `#34d399` emerald)
  - 🟡 **NEEDS HUMAN REVIEW** (`0.5 <= density < 1.0`, `#fbbf24` amber)
  - 🔴 **HIGH CONFIDENCE FRAUD** (`density >= 1.0`, `#f87171` red)
- **Eliminated Tier Drift**: Tiers are computed once in `build_graph.py`, saved in `data/clusters.json`, and served directly via `GET /explain/{account_id}`.

---

### 3. 💬 Plain-English Explainability Endpoint (`GET /explain/{account_id}`)
- Fast, zero-API dependency FastAPI endpoint.
- Returns cluster membership, risk density, single-source confidence tier, signals involved (`device`, `address`, `ip`, `behavioral`), ML fraud probability, and a human-readable explanation string.

---

### 4. 🤖 Validated ML Logistic Regression Classifier
- **Model Parameters Single Source of Truth**: [`data/ml_model_params.json`](file:///Users/khushii/fraud-ring-xray/data/ml_model_params.json).
- **Validation Metrics**: Evaluated via Leave-One-Seed-Out Cross-Validation (LOSO-CV) across 10 dataset seeds (119 cluster examples):
  - **Held-Out Precision**: `90.4%`
  - **Held-Out Recall**: `96.7%`
- **Validated Model Coefficients**:
  - `size`: `+1.521` (Cluster member account count)
  - `weight_density`: `+0.860` (Structural edge weight density)
  - `signup_spread_minutes`: `-2.304` (Signup timestamp spread)
  - `avg_return_rate`: `+1.209` (Average return rate across member accounts)
  - `intercept`: `-0.683`
- **Runtime Inference**: Standardizes features using `scaler_mean` and `scaler_scale`, then applies logistic sigmoid activation ($\sigma(z)$) with **zero runtime model training** or hardcoded numbers in code.
- **Dual-Signal UI**: Renders Rule-Based Assessment alongside ML Fraud Probability in [`AccountPanel.jsx`](file:///Users/khushii/fraud-ring-xray/frontend/src/components/AccountPanel.jsx).
- **ML Validation Modal**: Dedicated **ML Validation** header button and modal ([`MLValidationModal.jsx`](file:///Users/khushii/fraud-ring-xray/frontend/src/components/MLValidationModal.jsx)) displaying cross-validation performance, feature coefficient table, and disclaimer.

---

### 5. 📊 Baseline Detection & Empirical Robustness
- **Detection Algorithm**: Graph clustering with threshold `MIN_CLUSTER_WEIGHT_DENSITY = 0.5`.
- **Baseline Metrics (Seed 42)**:
  - **Precision**: `62.5%` (`0.625`)
  - **Recall**: `83.3%` (`0.833`, 5/6 rings caught)
  - **False Positives**: `3` (all 3 are planted noise bait groups `N5`, `N1`, `N3`)
  - **Documented Limitation**: `RING_C1` is documented as an honest known limitation split across 15-minute clock buckets.
- **Robustness Sweep**: Conducted a 10-seed experiment evaluating sliding-window vs fixed-bucket bucketing and minimum order requirements.

---

### 6. 🎨 Clean Graph Visualization & UI Features
- **Graph Layout**: Restored compact dot sizing (`size: 11` for suspicious, `size: 9` for normal) and clean red/gray canvas nodes (`#dc2626` / `#4b5563`) to prevent visual clutter.
- **Label Formatting**: Prevented label collisions with vertical top-node positioning (`minY - 24`).
- **Scalability Mode**: Supports Focused View (44 connected cluster accounts) and Scalability View (310 total accounts) with search autocomplete.

---

## 📁 Key File Structure

```
fraud-ring-xray/
├── main.py                          # FastAPI application & endpoints (/clusters, /evaluation, /explain, /ml-validation)
├── build_graph.py                   # Graph construction, edge weighting, clustering & confidence_tier logic
├── ml_classifier_cv.py              # ML classifier inference module loading params from ml_model_params.json
├── generate_data.py                 # Fraud ring & legitimate account synthetic data generator
├── data/
│   ├── ml_model_params.json         # Single source of truth for ML coefficients & scaler parameters
│   ├── clusters.json                # Generated clusters with rule-based tiers & ml_confidence
│   ├── evaluation.json              # Model evaluation metrics against ground truth
│   ├── ground_truth.json            # Ground truth ring & noise definitions
│   ├── accounts.csv                 # Account records
│   └── orders.csv                   # Order records
└── frontend/
    └── src/
        ├── App.jsx                  # Main dashboard layout, view toggles & modal triggers
        └── components/
            ├── GraphView.jsx        # D3 graph visualization canvas
            ├── AccountPanel.jsx     # Side panel with dual signals (Rule-based + ML)
            ├── EvaluationModal.jsx  # Evaluation metrics modal & known limitations
            ├── GuardrailsModal.jsx  # Safety & guardrails modal UI
            └── MLValidationModal.jsx# ML model validation & feature coefficient table
```
