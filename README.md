# Fraud Ring X-Ray — Investigative & Loss Prevention Console

An interactive graph analytics, forensic explainability, and early-warning loss prevention console for detecting complex e-commerce fraud rings.

---

## 🚀 Key Features

1. **Interactive Network Graph Workspace**:
   - Visualizes device fingerprint, shipping address, and IP sharing topology.
   - Highlights high-confidence fraud rings (`#E2574C`), review requests (`#BA7517`), and legitimate accounts (`#1D9E75`).

2. **Early-Warning Chronological Replay & Loss Prevention**:
   - Simulates account creation chronologically in signup order.
   - Triggers real-time alerts when connected component weight density crosses the **`0.5`** threshold.
   - Calculates **Preventable Rupee Loss (₹)** on orders placed after signup detection.

3. **Razorpay Test-Mode Orders API Integration (`razorpay_sync.py`)**:
   - Demonstrates a live connection to Razorpay's actual test-mode Orders API (`POST /v1/orders` and `GET /v1/orders`).
   - Creates test-mode orders using credentials from `.env` (`RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`).
   - Embeds shared risk signals (e.g., shipping address, device fingerprint) in the `notes` object to simulate a live coordinated fraud ring.
   - Displays a live status badge in the UI header: `Synced with Razorpay test-mode API (20 orders)`.

4. **Defense-Only Decision Support Framework**:
   - Strict read-only explainability engine ensuring no automated account bans or enforcement actions occur without human review.

---

## 🛠️ Setup & Local Execution

### 1. Backend Setup (FastAPI & Python 3.10+)

```bash
# Clone the repository
git clone https://github.com/KHUSHI-612/fraud-ring-xray.git
cd fraud-ring-xray

# Install Python dependencies
pip install -r requirements.txt

# Configure Environment Variables (.env)
cp .env.example .env # or create .env directly
```

#### `.env` File Configuration:
```env
# Razorpay Test-Mode API Credentials (from https://dashboard.razorpay.com/app/keys)
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_secret_here
```

#### Sync Razorpay Test-Mode Orders:
```bash
python3 razorpay_sync.py
```

#### Start FastAPI Server:
```bash
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

---

### 2. Frontend Setup (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5188` to view the Investigative Console.

---

## 📊 Evaluation & Machine Learning

- **Supervised Logistic Regression Classifier**: Evaluated via leave-one-seed-out cross-validation across 10 dataset seeds (119 training cluster examples).
- **Confusion Matrix & Metrics**: 0.94 Precision, 0.88 Recall, 0.91 F1 Score, 0.04 False Positive Rate.
