# LaunderLens – Backend Intelligence & Detection Engine

> **Investigator workbench for graph-based detection of layered money laundering networks with explainable typology attribution.**

---

## 1. System Architecture

```
                                  LaunderLens Pipeline
                                  
  ┌─────────────────────────┐
  │  Transactions (Parquet) │ ── (3,105 synthetic transactions with ground truth rings)
  └────────────┬────────────┘
               │
               ▼
  ┌─────────────────────────┐
  │  Temporal DiGraph BFS   │ ── NetworkX MultiDiGraph (chronological hop distance)
  └────────────┬────────────┘
               │
               ▼
  ┌─────────────────────────┐
  │   5 Motif Detectors     │ ── fan_out, fan_in, scatter_gather, cycle, pass_through
  └────────────┬────────────┘
               │
               ▼
  ┌─────────────────────────┐
  │  GroupShuffleSplit      │ ── Zero ring leakage between train & test splits
  └────────────┬────────────┘
               │
               ▼
  ┌─────────────────────────┐
  │  LightGBM + TreeSHAP    │ ── 16 flow/graph features (zero label leak) -> Calibrated Risk & Top 5 SHAP
  └────────────┬────────────┘
               │
               ▼
  ┌─────────────────────────┐
  │ Verified Narrative Gen  │ ── Adversarial Number Checker validates figures against cluster facts
  └────────────┬────────────┘
               │
               ▼
  ┌─────────────────────────┐
  │ Postgres / SQLite DB    │ ── alerts, alert_accounts, alert_edges, metric_runs
  └────────────┬────────────┘
               │
               ▼
  ┌─────────────────────────┐
  │  FastAPI (Port 8000)    │ ── Real-time endpoints (<50ms) + In-memory Red-Team Structuring Injection
  └─────────────────────────┘
```

---

## 2. Benchmark Evaluation: Baseline vs. LaunderLens

Evaluated on held-out test subgraphs using identical evaluation logic ([pipeline/metrics.py](pipeline/metrics.py)):

| Metric | Rule-Based Baseline | LaunderLens | Improvement |
| :--- | :---: | :---: | :---: |
| **Precision** | `0.125` | **`0.909`** | **+627%** |
| **Recall** | `1.000` | **`1.000`** | Parity |
| **F1 Score** | `0.222` | **`0.952`** | **+329%** |
| **False Positive Rate (FPR)** | `0.909` | **`0.013`** | **-98.6% False Positives** |

### Per-Typology Recall Breakdown

| Typology | Baseline Recall | LaunderLens Recall | Notes |
| :--- | :---: | :---: | :--- |
| **Fan-Out** | 1.00 | **1.00** | Rapid fund dispersal from entry to payees |
| **Fan-In** | 1.00 | **1.00** | Inbound fund aggregation to central hub |
| **Scatter-Gather** | 1.00 | **1.00** | Layered dispersal through mules to exit |
| **Bounded Cycle** | 1.00 | **1.00** | Chronological loops ($3 \le L \le 6$) within 24h |
| **Pass-Through** | 1.00 | **1.00** | Multi-hop chains retaining $\ge 85\%$ volume |

---

## 3. Dynamic Red-Team Structuring Injection

Simulates an adversary structuring funds to evade detection:
- **Sub-Threshold Amounts**: 18 transactions each strictly between $\$4,000$ and $\$9,900$ (below CTR $\$10,000$ reporting limit).
- **Baseline Misses**: Standard threshold rules fail to trigger (`baseline_flagged = False`).
- **LaunderLens Detects**: Temporal scatter-gather detector flags the topology; LightGBM scores it **0.88 risk** with SHAP highlighting `sub_threshold_ratio = 1.0` as the dominant attack feature.
- **Latency**: Executed entirely in-memory in **$\sim 180$ ms** (well within $< 5$s requirement).

---

## 4. Quickstart

### Prerequisites
- Python 3.11 or 3.13
- Virtual environment (`venv`)

### 1. Setup Virtual Environment & Install Dependencies
```bash
# Windows
python -m venv .venv
.\.venv\Scripts\activate

# Linux / macOS
python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file from the example:
```bash
cp .env.example .env
```
Default `.env` configuration:
```ini
DATABASE_URL=sqlite:///./launderlens.db
ALLOWED_ORIGINS=http://localhost:3000
USE_MOCKS=false
USE_LLM=false
```

### 3. Run Precomputation Pipeline
Precomputes synthetic transaction dataset, runs graph detectors, trains LightGBM, benchmarks performance, and populates the database:
```bash
python -m pipeline.run
```

### 4. Start FastAPI Server
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at: `http://127.0.0.1:8000/docs`

### 5. Run Test Suite
```bash
pytest
```
*Current test suite: **66 tests passing (100%)** across 9 test files.*

---

## 5. API Endpoints Reference

All endpoints strictly adhere to the frozen contract in `docs/CONTRACT.md`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check endpoint (`{"status": "ok"}`) |
| `GET` | `/alerts` | List all alerts sorted by `risk_score` desc. Optional filters: `?typology=fan_out`, `?min_risk=0.8` |
| `GET` | `/alerts/{alert_id}` | Detailed investigation view: risk score, verified narrative, top 5 SHAP contributions, and evidence |
| `GET` | `/alerts/{alert_id}/graph` | Graph payload for visualization: accounts (`nodes`), directed transfers (`edges` with `hop_index` and UTC `ts`) |
| `POST` | `/alerts/{alert_id}/disposition` | Update investigator status (`"open"`, `"confirmed"`, `"dismissed"`) |
| `GET` | `/metrics` | Comparative benchmark evaluation: Baseline vs. LaunderLens metrics & per-typology recall |
| `POST` | `/redteam/inject` | Dynamically injects an in-memory structuring attack, evaluates live latency, and returns full alert detail |
| `DELETE` | `/redteam` | Cleanly removes the active red-team injection from database and memory |

---

## 6. Docker Deployment

Build and run in a single container:
```bash
docker build -t launderlens-backend .
docker run -p 8000:8000 --env-file .env launderlens-backend
```

---

## 7. 11 Build Phases Completed

- [x] **Phase 1**: Scaffold, Schemas, Mock API, and Frozen Contract
- [x] **Phase 2**: Database Layer (Supabase PostgreSQL pooler & SQLite fallback)
- [x] **Phase 3**: Transaction Loader & IBM-AML Synthetic Generator
- [x] **Phase 4**: Temporal Graph & Detectors (fan-out, fan-in, scatter-gather, pass-through)
- [x] **Phase 5**: Bounded Temporal Cycle Detector ($3 \le L \le 6$, $\le 24$h, $\ge 80\%$ retention)
- [x] **Phase 6**: Feature Extraction, Ring-Isolated Split, LightGBM, and SHAP
- [x] **Phase 7**: Rule-Based Baseline Engine & Unified Benchmarking Metrics
- [x] **Phase 8**: Verified Investigator Narratives with Adversarial Number Checker & Template Fallback
- [x] **Phase 9**: Unified Pipeline Orchestration (`python -m pipeline.run`) & Live DB Integration
- [x] **Phase 10**: Dynamic Red-Team Structuring Injection Endpoint ($< 200$ms)
- [x] **Phase 11**: Hardening, E2E Verification, Docker, and Production Packaging
