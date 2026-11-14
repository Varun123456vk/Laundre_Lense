"""
LaunderLens – Transaction Data Loader.
Loads, normalizes, and validates transaction data from Parquet (or CSV) files.
Accepts both canonical IBM AML transaction schemas and normalized internal format.
"""
from __future__ import annotations

import os
from pathlib import Path

import pandas as pd

from pipeline.config import (
    COL_AMOUNT,
    COL_FROM,
    COL_IS_LAUNDERING,
    COL_RING_ID,
    COL_TIMESTAMP,
    COL_TO,
    COL_TX_ID,
    COL_TYPOLOGY,
    DATA_DIR,
    IBM_AML_COLUMN_MAP,
    REQUIRED_COLUMNS,
    SYNTHETIC_PARQUET,
    TRANSACTIONS_PARQUET,
)


def normalize_transactions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardize column names, types, and timezone info for transactions.
    """
    df = df.copy()

    # Check for IBM AML raw dataset column patterns and rename
    renames: dict[str, str] = {}
    for col in df.columns:
        if col in IBM_AML_COLUMN_MAP:
            renames[col] = IBM_AML_COLUMN_MAP[col]
        elif col.lower().strip() in ("from", "source", "originator", "sender"):
            renames[col] = COL_FROM
        elif col.lower().strip() in ("to", "target", "beneficiary", "receiver"):
            renames[col] = COL_TO
        elif col.lower().strip() in ("time", "date", "datetime"):
            renames[col] = COL_TIMESTAMP
        elif col.lower().strip() in ("amt", "value", "payment"):
            renames[col] = COL_AMOUNT
        elif col.lower().strip() in ("label", "is_sar", "islaundering"):
            renames[col] = COL_IS_LAUNDERING

    if renames:
        df = df.rename(columns=renames)

    # If amount was Amount Received vs Amount Paid in IBM AML
    if COL_AMOUNT not in df.columns and "amount_paid" in df.columns:
        df[COL_AMOUNT] = df["amount_paid"]

    # Generate tx_id if missing
    if COL_TX_ID not in df.columns:
        df[COL_TX_ID] = [f"tx_{i+1:08d}" for i in range(len(df))]

    # Default optional columns
    if COL_RING_ID not in df.columns:
        df[COL_RING_ID] = None
    if COL_TYPOLOGY not in df.columns:
        df[COL_TYPOLOGY] = None

    # Verify required columns exist
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Transaction DataFrame missing required columns: {missing}")

    # Standardize types
    df[COL_TX_ID] = df[COL_TX_ID].astype(str)
    df[COL_FROM] = df[COL_FROM].astype(str)
    df[COL_TO] = df[COL_TO].astype(str)
    df[COL_AMOUNT] = pd.to_numeric(df[COL_AMOUNT], errors="coerce").astype(float)
    df[COL_IS_LAUNDERING] = pd.to_numeric(df[COL_IS_LAUNDERING], errors="coerce").fillna(0).astype(int)

    # Standardize timestamp to UTC timezone-aware datetime
    df[COL_TIMESTAMP] = pd.to_datetime(df[COL_TIMESTAMP], utc=True)

    # Data validation
    invalid_rows = (
        df[COL_AMOUNT].isna()
        | (df[COL_AMOUNT] <= 0)
        | df[COL_FROM].isna()
        | df[COL_TO].isna()
        | df[COL_TIMESTAMP].isna()
    )
    if invalid_rows.any():
        df = df[~invalid_rows].copy()

    # Sort deterministically by timestamp ascending
    df = df.sort_values(by=[COL_TIMESTAMP, COL_TX_ID]).reset_index(drop=True)

    return df


def load_transactions(path: str | Path | None = None) -> pd.DataFrame:
    """
    Load transactions from a Parquet (or CSV) file and return a normalized DataFrame.
    If path is None, tries TRANSACTIONS_PARQUET, then SYNTHETIC_PARQUET.
    """
    if path is None:
        if TRANSACTIONS_PARQUET.exists():
            target_path = TRANSACTIONS_PARQUET
        elif SYNTHETIC_PARQUET.exists():
            target_path = SYNTHETIC_PARQUET
        else:
            raise FileNotFoundError(
                f"No transaction file found at {TRANSACTIONS_PARQUET} or {SYNTHETIC_PARQUET}. "
                "Run `python -m pipeline.synthetic` or generate synthetic data first."
            )
    else:
        target_path = Path(path)

    if not target_path.exists():
        raise FileNotFoundError(f"File not found: {target_path}")

    if str(target_path).endswith(".parquet"):
        df = pd.read_parquet(target_path)
    elif str(target_path).endswith(".csv"):
        df = pd.read_csv(target_path)
    else:
        try:
            df = pd.read_parquet(target_path)
        except Exception:
            df = pd.read_csv(target_path)

    return normalize_transactions(df)


def save_transactions(df: pd.DataFrame, path: str | Path | None = None) -> Path:
    """
    Save normalized transactions to a Parquet file.
    """
    out_path = Path(path) if path is not None else TRANSACTIONS_PARQUET
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out_path, engine="pyarrow", index=False)
    return out_path
