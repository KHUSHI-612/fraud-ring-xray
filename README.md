# Fraud Ring X-Ray — Forensic Network Graph & Machine Learning Decision Support System

Fraud Ring X-Ray is an interactive graph analytics, machine learning inference, and early-warning loss prevention console designed to detect, cluster, and explain coordinated e-commerce fraud rings.

---

## Executive Overview

Fraud Ring X-Ray analyzes shared digital identifiers—including device fingerprints, shipping addresses, and IP addresses—across account populations to reconstruct underlying entity networks. Using a combination of structural graph density scoring and cross-validated logistic regression inference, the platform highlights high-risk clusters, generates forensic explanations for human analysts, and quantifies preventable financial loss.

---

## System Architecture

The application is structured into two core tiers:

1. **Backend Service (Python 3.10+ & FastAPI)**
   - **Graph Analytics Module (`build_graph.py`)**: Reads relational entity data, constructs an undirected NetworkX graph with signal-weighted edges (Device: 1.0, Address: 0.6, IP: 0.3), and extracts connected components.
   - **Machine Learning Inference Engine (`ml_classifier_cv.py`)**: Computes cluster fraud probability using standardized logistic regression parameters trained across 10 cross-validation seeds.
   - **Early Warning Simulator (`early_warning.py`)**: Replays signup chronology to detect ring formation at the earliest moment a cluster crosses the 0.5 density threshold.
   - **Razorpay Sync Module (`razorpay_sync.py`)**: Connects to Razorpay test-mode Orders API (`POST /v1/orders`) to generate and synchronize live test-mode orders into the detection pipeline.
   - **FastAPI Application (`main.py`)**: Exposes RESTful endpoints for graph structures, evaluation metrics, account dossiers, and live test order creation.

2. **Frontend Console (React 18 + Vite & Vanilla CSS)**
   - **Interactive Graph Workspace (`GraphView.jsx`)**: Rendered using Vis-Network with physics-based layout, color-coded risk nodes, and camera fitting controls.
   - **Account Dossier Panel (`AccountPanel.jsx`)**: Slide-over panel displaying key-value account attributes, structural signal breakdown, and machine learning risk explanations.
   - **Evaluation & ML Validation Modules (`EvaluationModal.jsx`, `MLValidationModal.jsx`)**: Cross-validation metrics, confusion matrix, feature coefficients, and calibration indicators.
   - **Early Warning Replay (`EarlyWarningReplay.jsx`)**: Step-by-step playback slider with loss prevention metrics.
   - **Responsive Design System (`index.css`)**: Fully responsive layout adapted for desktop and mobile viewport resolutions.

---

## Key Capabilities

### 1. Multi-Signal Graph Clustering
- **Signal-Weighted Edges**: Device fingerprints carry a weight of 1.0 (low false positive rate), shipping addresses carry 0.6, and shared IP addresses carry 0.3.
- **Density Scoring**: Evaluates cluster tightness based on edge weight density relative to maximum possible edges.
- **Noise Filtering**: Automatically flags isolated accounts and distinguishes high-density fraud rings from legitimate shared IP networks.

### 2. Validated Machine Learning Inference
- **Model Standard**: Logistic Regression trained on 119 cluster examples with leave-one-seed-out cross-validation across 10 seeds.
- **Feature Set**: Cluster size, structural edge density, signup timestamp spread (minutes), and average order return rate.
- **Inference Pipeline**: Feature standardization via `scaler_mean` and `scaler_scale` followed by logistic sigmoid activation.

### 3. Chronological Early Warning & Loss Prevention
- Replays account signups chronologically to identify the exact tipping point where an emerging cluster becomes suspicious.
- Calculates preventable Rupee loss by summing order amounts placed after the detection timestamp.

### 4. Razorpay Test-Mode Integration
- Interacts with Razorpay's live test-mode Orders API (`https://api.razorpay.com/v1/orders`).
- Embeds shared risk signals (`shipping_address`, `device_id`, `ip_address`) inside the order `notes` object to test real-time ingestion into the graph workspace.

---

## Defense-Only Governance Policy

Fraud Ring X-Ray operates under a strict defense-only decision support guarantee:
- **No Automated Enforcement**: The system provides investigative context, risk scores, and graph topology visualization to aid human risk analysts.
- **Read-Only Scope**: The software contains no automated blocking, banning, or account suspension capabilities. All final decisions require human review.

---

## Benchmark Evaluation Metrics

Evaluation metrics are computed against the 310 synthetic account benchmark dataset:

| Metric | Benchmark Value | Description |
| :--- | :--- | :--- |
| **Accuracy** | 94.19% | Correct classification rate across benchmark accounts |
| **Precision** | 64.71% | Proportion of flagged accounts that belong to ground-truth rings |
| **Recall** | 78.57% | Proportion of actual fraud ring accounts successfully detected |
| **F1 Score** | 0.7097 | Harmonic mean of precision and recall |
| **False Positive Rate** | 4.26% | Proportion of legitimate accounts incorrectly flagged |
| **AUC-ROC** | 0.8951 | Area under receiver operating characteristic curve |
| **Calibration Score** | 0.9805 | Reliability indicator (1.0 minus Brier score loss of 0.0195) |

---

## Installation & Local Execution

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher & npm

### 1. Backend Setup

```bash
# Clone repository
git clone https://github.com/KHUSHI-612/fraud-ring-xray.git
cd fraud-ring-xray

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

#### `.env` File Format:
```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_secret_key
```

#### Process Graph Data & Generate Evaluation Metrics:
```bash
python3 build_graph.py
```

#### Start FastAPI Server:
```bash
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The web console will be accessible at `http://localhost:5188` (or the port indicated in terminal output).

---

## API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/clusters` | Returns all detected network clusters, member lists, and risk scores |
| `GET` | `/evaluation` | Returns ground-truth evaluation metrics and confusion matrix |
| `GET` | `/ml-validation` | Returns ML cross-validation metrics and feature importance coefficients |
| `GET` | `/early-warning-replay` | Returns step-by-step chronological simulation data |
| `GET` | `/razorpay-sync-status` | Returns synchronization state with Razorpay API |
| `POST` | `/razorpay/create-live-ring-order` | Issues a live order creation request to Razorpay test-mode API |
| `GET` | `/account/{account_id}` | Returns account details, connected neighbors, and risk breakdown |

---

## License

Distributed for defense-only research and loss prevention decision support.
