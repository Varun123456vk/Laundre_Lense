"""
LaunderLens – Phase 3 tests: Data loader + synthetic generator.
Validates Parquet loading, schema normalization, IBM AML column mapping,
and synthetic ring generation across all 5 typologies plus red-team structuring.
"""
from __future__ import annotations

import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import pytest

from pipeline.config import (
    COL_AMOUNT,
    COL_FROM,
    COL_IS_LAUNDERING,
    COL_RING_ID,
    COL_TIMESTAMP,
    COL_TO,
    COL_TX_ID,
    COL_TYPOLOGY,
    REDTEAM_THRESHOLD,
)
from pipeline.load import load_transactions, normalize_transactions, save_transactions
from pipeline.synthetic import generate_structuring_ring, generate_synthetic_dataset


def test_normalize_transactions_standard():
    raw_df = pd.DataFrame([
        {
            "from_account": "ACC_01",
            "to_account": "ACC_02",
            "timestamp": "2024-03-01 10:00:00",
            "amount": "1500.50",
            "is_laundering": "0",
        },
        {
            "from_account": "ACC_02",
            "to_account": "ACC_03",
            "timestamp": "2024-03-01 08:00:00",  # earlier timestamp
            "amount": 2500,
            "is_laundering": 1,
        },
    ])
    norm = normalize_transactions(raw_df)
    assert len(norm) == 2
    # Check generated tx_id
    assert COL_TX_ID in norm.columns
    # Check sorted by timestamp ascending
    assert norm.iloc[0]["from_account"] == "ACC_02"
    assert norm.iloc[1]["from_account"] == "ACC_01"
    # Check UTC datetime type
    assert isinstance(norm[COL_TIMESTAMP].dtype, pd.DatetimeTZDtype)
    assert str(norm[COL_TIMESTAMP].dt.tz) in ("UTC", "datetime.timezone.utc")
    assert norm[COL_AMOUNT].dtype == float
    assert norm[COL_IS_LAUNDERING].dtype == int


def test_normalize_transactions_ibm_aml_mapping():
    """Verify that canonical IBM AML dataset column names are cleanly mapped."""
    ibm_df = pd.DataFrame([
        {
            "Timestamp": "2024/03/01 12:30",
            "From Bank": "BankA",
            "Account": "A100",
            "To Bank": "BankB",
            "Account.1": "B200",
            "Amount Received": 12500.0,
            "Amount Paid": 12500.0,
            "Receiving Currency": "USD",
            "Payment Currency": "USD",
            "Payment Format": "Wire",
            "Is Laundering": 1,
        }
    ])
    norm = normalize_transactions(ibm_df)
    assert norm.iloc[0][COL_FROM] == "A100"
    assert norm.iloc[0][COL_TO] == "B200"
    assert norm.iloc[0][COL_AMOUNT] == 12500.0
    assert norm.iloc[0][COL_IS_LAUNDERING] == 1


def test_normalize_filters_invalid_data():
    """Verify zero/negative amounts or missing accounts are filtered."""
    dirty_df = pd.DataFrame([
        {"from_account": "A", "to_account": "B", "timestamp": "2024-03-01T00:00:00Z", "amount": 100.0, "is_laundering": 0},
        {"from_account": "A", "to_account": "B", "timestamp": "2024-03-01T01:00:00Z", "amount": -50.0, "is_laundering": 0},
        {"from_account": "A", "to_account": "B", "timestamp": "2024-03-01T02:00:00Z", "amount": 0.0, "is_laundering": 0},
    ])
    clean = normalize_transactions(dirty_df)
    assert len(clean) == 1
    assert clean.iloc[0]["amount"] == 100.0


def test_save_and_load_parquet_roundtrip():
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir) / "test.parquet"
        df = pd.DataFrame([
            {
                COL_TX_ID: "tx_01",
                COL_FROM: "ACC_A",
                COL_TO: "ACC_B",
                COL_TIMESTAMP: pd.to_datetime("2024-03-01T12:00:00Z"),
                COL_AMOUNT: 4500.0,
                COL_IS_LAUNDERING: 0,
                COL_RING_ID: None,
                COL_TYPOLOGY: None,
            }
        ])
        save_transactions(df, tmp_path)
        assert tmp_path.exists()

        loaded = load_transactions(tmp_path)
        assert len(loaded) == 1
        assert loaded.iloc[0][COL_TX_ID] == "tx_01"
        assert loaded.iloc[0][COL_AMOUNT] == 4500.0


def test_generate_synthetic_dataset():
    df = generate_synthetic_dataset(
        n_accounts=50,
        n_background_tx=300,
        n_rings_per_typology=2,
        seed=123,
    )
    assert len(df) > 300
    # Check all 5 typologies are represented in laundering rings
    laundering_rings = df[df[COL_IS_LAUNDERING] == 1]
    assert len(laundering_rings) > 0
    typologies = set(laundering_rings[COL_TYPOLOGY].dropna().unique())
    assert typologies == {"fan_out", "fan_in", "scatter_gather", "cycle", "pass_through"}

    # Timestamps are monotonically non-decreasing
    assert df[COL_TIMESTAMP].is_monotonic_increasing


def test_generate_structuring_ring():
    df, meta = generate_structuring_ring(
        n_transfers=18,
        seed=999,
    )
    assert len(df) == 18
    # All transfers must be strictly below the $10,000 baseline threshold
    assert (df[COL_AMOUNT] < REDTEAM_THRESHOLD).all()
    assert meta["evades_threshold"] is True
    assert meta["n_transactions"] == 18
    assert (df[COL_IS_LAUNDERING] == 1).all()
    assert df[COL_TIMESTAMP].is_monotonic_increasing
