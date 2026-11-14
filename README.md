# LaunderLens (Laundre_Lense)

> **"Find the Pattern. Trace the Money. Stop Financial Crime."**  
> *AI-powered Anti-Money Laundering (AML) investigation and forensic intelligence platform using temporal graph intelligence, explainable AI (TreeSHAP), and real-time transaction surveillance.*

---

## 🌟 Executive Summary

Traditional rule-based transaction monitoring systems analyze transactions in isolation against fixed thresholds (e.g. ₹50,000 evasion), suffering from massive false positive rates (>88%) while remaining blind to multi-tier layering, smurfing, and circular wash trading.

**LaunderLens** transforms disconnected financial transaction logs into an explainable investigation graph. It identifies complex laundering typologies across 2 to 6 hops, computes machine-learning risk scores with TreeSHAP feature attributions, and provides compliance investigators with actionable, zero-hallucination evidence dossiers compliant with **PMLA 2002**, **RBI Master Directions**, and **FATF Typologies**.

---

## 🏗️ Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LAUNDERLENS ARCHITECTURE                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Frontend (Vite + React 19 + Tailwind CSS)                           │
│   ├─ Enterprise SaaS Landing Page (Hero, Visualizer, Typologies)       │
│   ├─ Dedicated Auth Portal (Sign In & Sign Up with Role Selectors)     │
│   └─ Forensic Investigator Workbench                                   │
│      ├─ Subgraph Visualizer (Cytoscape.js)                             │
│      ├─ Risk Scoring & TreeSHAP Attribution Meters (Recharts)           │
│      ├─ Grounded Investigation Dossiers & SAR/STR Narratives           │
│      ├─ Dataset Ingestion & Manager                                    │
│      └─ Red-Team Adversarial Simulation Engine                         │
│                                                                        │
│                                   │ REST API                           │
│                                   ▼                                    │
│                                                                        │
│   Backend Engine (Python 3.12 + FastAPI)                              │
│   ├─ Network Motif Matching (NetworkX, Pandas, NumPy)                 │
│   │   • Scatter-Gather (Parallel mules → consolidator)                 │
│   │   • Fan-Out (Structuring / Smurfing)                               │
│   │   • Fan-In (Aggregation into central collector)                    │
│   │   • Circular Flow (Wash trading loops)                             │
│   │   • Pass-Through Chains (High-velocity transit mules)              │
│   ├─ Risk Classification (LightGBM)                                    │
│   ├─ Explainability Engine (TreeSHAP)                                  │
│   ├─ Database Storage (SQLAlchemy 2.x + PostgreSQL / SQLite)          │
│   └─ In-Memory Adversarial Red-Team Generator                          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Cytoscape.js, Recharts, Lucide-style SVG icons.
- **Backend**: Python 3.12, FastAPI, Uvicorn, SQLAlchemy 2.x, Pydantic v2.
- **Graph & ML**: NetworkX, Pandas, NumPy, LightGBM, TreeSHAP.
- **Database**: PostgreSQL (Supabase pooler ready) / SQLite.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18+ and `npm`
- **Python**: v3.10+ (Python 3.12 recommended)
- **Git**

---

### 1. Clone the Repository

```bash
git clone https://github.com/Varun123456vk/Laundre_Lense.git
cd Laundre_Lense
```

---

### 2. Backend Setup (FastAPI)

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows:
.\.venv\Scripts\activate

# macOS / Linux:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API will be available at [http://127.0.0.1:8000](http://127.0.0.1:8000).  
Interactive Swagger docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

### 3. Frontend Setup (React + Vite)

Open a new terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Run Vite development server
npm run dev
```

The web application will be live at [http://127.0.0.1:5173](http://127.0.0.1:5173).

---

## 🛡️ Key Features

1. **Enterprise SaaS Landing Page**:
   - 10 structured modules communicating institutional credibility.
   - Live animated financial transaction network diagram in Indian Rupees (`₹ INR`).
   - Interactive typology browser (Scatter-Gather, Fan-Out, Fan-In, Cycle, Pass-Through).
   - Before-and-after architecture comparisons and technical stack highlights.

2. **Secure Authentication & Onboarding**:
   - Segmented Sign In (existing users) and Sign Up (new institutions) modes.
   - PMLA 2002 & RBI regulatory compliance agreement certification.
   - Role-based clearance configuration (Lead Investigator, Compliance Officer, Risk Analyst, ML Specialist).

3. **Temporal Graph Forensics**:
   - Multi-hop path tracing (2 to 6 hops) uncovering smurfing and structuring.
   - Dwell time velocity analysis (<15 minutes) and value conservation metrics (>95%).
   - Interactive Cytoscape graph canvas with directed transaction edge amounts and account roles.

4. **Explainable AI (TreeSHAP)**:
   - Feature contribution meters explaining the exact reasons behind each risk score.
   - Top features tracked: dispersion ratios, structuring entropy, temporal velocity, counterparty degree.

5. **Adversarial Red-Team Simulation Engine**:
   - Compliance officers can inject synthetic laundering patterns into data streams to benchmark detection recall and compare baseline rule-based systems against graph ML.

---

## 📜 Regulatory Standards & Compliance

- **PMLA 2002**: Prevention of Money Laundering Act (India)
- **RBI Master Directions**: Know Your Customer (KYC) & Anti-Money Laundering Standards
- **FIU-IND**: Financial Intelligence Unit - Suspicious Transaction Reporting (STR)
- **FATF**: Financial Action Task Force Typology Taxonomy

---

## 📄 License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details.

