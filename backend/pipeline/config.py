"""
LaunderLens – Central Pipeline Configuration.
All paths, thresholds, and hyperparameters live here.
"""
from __future__ import annotations

import os
from pathlib import Path

# ──────────────────────────────────────────────
#  Paths
# ──────────────────────────────────────────────
PIPELINE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = PIPELINE_DIR.parent
DATA_DIR = BACKEND_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

TRANSACTIONS_PARQUET = DATA_DIR / "transactions.parquet"
SYNTHETIC_PARQUET = DATA_DIR / "synthetic_transactions.parquet"
MODEL_PATH = DATA_DIR / "lightgbm_model.txt"


# ──────────────────────────────────────────────
#  Transaction DataFrame Schema
# ──────────────────────────────────────────────
COL_TX_ID = "tx_id"
COL_FROM = "from_account"
COL_TO = "to_account"
COL_TIMESTAMP = "timestamp"
COL_AMOUNT = "amount"
COL_IS_LAUNDERING = "is_laundering"
COL_TYPOLOGY = "laundering_typology"
COL_RING_ID = "ring_id"

REQUIRED_COLUMNS = [
    COL_TX_ID,
    COL_FROM,
    COL_TO,
    COL_TIMESTAMP,
    COL_AMOUNT,
    COL_IS_LAUNDERING,
]

# IBM AML column name mappings to normalized schema
IBM_AML_COLUMN_MAP = {
    "Timestamp": COL_TIMESTAMP,
    "From Bank": "from_bank",
    "Account": COL_FROM,
    "To Bank": "to_bank",
    "Account.1": COL_TO,
    "Amount Received": COL_AMOUNT,
    "Amount Paid": "amount_paid",
    "Is Laundering": COL_IS_LAUNDERING,
}


# ──────────────────────────────────────────────
#  Baseline Rule Engine Thresholds
# ──────────────────────────────────────────────
BASELINE_AMOUNT_THRESHOLD = 10_000.0   # $10,000 reporting threshold (CTR)
BASELINE_WINDOW_HOURS = 24.0           # 24-hour aggregation window
BASELINE_FAN_OUT_MIN_TX = 4            # Minimum out-transfers for fan-out
BASELINE_FAN_IN_MIN_TX = 4             # Minimum in-transfers for fan-in


# ──────────────────────────────────────────────
#  Graph & Motif Detector Thresholds
# ──────────────────────────────────────────────
# Fan-Out: one entry disperses to >= MIN_TARGETS accounts
FAN_OUT_MIN_TARGETS = 3
FAN_OUT_MAX_WINDOW_HOURS = 6.0
FAN_OUT_MIN_TOTAL_AMOUNT = 5_000.0

# Fan-In: >= MIN_SOURCES accounts aggregate to one hub
FAN_IN_MIN_SOURCES = 3
FAN_IN_MAX_WINDOW_HOURS = 6.0
FAN_IN_MIN_TOTAL_AMOUNT = 5_000.0

# Scatter-Gather: source -> intermediaries -> target
SCATTER_GATHER_MIN_INTERMEDIARIES = 3
SCATTER_GATHER_MAX_WINDOW_HOURS = 16.0
SCATTER_GATHER_MIN_AMOUNT = 10_000.0

# Pass-Through: linear chain retaining >= MIN_RETENTION
PASS_THROUGH_MIN_HOPS = 3
PASS_THROUGH_MAX_HOPS = 6
PASS_THROUGH_MIN_RETENTION = 0.85
PASS_THROUGH_MAX_WINDOW_HOURS = 8.0

# Bounded Temporal Cycle: A -> B -> ... -> A
CYCLE_MIN_LENGTH = 3
CYCLE_MAX_LENGTH = 6
CYCLE_MAX_WINDOW_HOURS = 24.0
CYCLE_MIN_RETENTION = 0.80


# ──────────────────────────────────────────────
#  Red-team Structuring Ring Configuration
# ──────────────────────────────────────────────
REDTEAM_THRESHOLD = 10_000.0
REDTEAM_SUB_THRESHOLD_MAX = 9_900.0
REDTEAM_SUB_THRESHOLD_MIN = 4_000.0
REDTEAM_N_INTERMEDIARIES = 8
REDTEAM_MAX_WINDOW_HOURS = 4.0

