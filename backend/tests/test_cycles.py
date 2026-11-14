"""
LaunderLens – Phase 5 tests: Bounded Temporal Cycle Detector.
Validates chronological cycle detection, 2-cycle exclusion, temporal ordering,
time-window constraints, amount retention pruning, and GraphPayload schema conformance.
"""
from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd
import pytest

from app.schemas import GraphPayload
from pipeline.config import (
    COL_AMOUNT,
    COL_FROM,
    COL_IS_LAUNDERING,
    COL_RING_ID,
    COL_TIMESTAMP,
    COL_TO,
    COL_TX_ID,
    SYNTHETIC_PARQUET,
)
from pipeline.detectors import detect_all_motifs, detect_cycles
from pipeline.load import load_transactions


def test_detect_valid_3_cycle():
    """Verify detection of a 3-hop temporal cycle A -> B -> C -> A."""
    df = pd.DataFrame([
        {COL_TX_ID: "c1", COL_FROM: "A", COL_TO: "B", COL_TIMESTAMP: pd.to_datetime("2024-03-01T08:00:00Z"), COL_AMOUNT: 50000.0, COL_IS_LAUNDERING: 1, COL_RING_ID: "cy_01"},
        {COL_TX_ID: "c2", COL_FROM: "B", COL_TO: "C", COL_TIMESTAMP: pd.to_datetime("2024-03-01T09:30:00Z"), COL_AMOUNT: 49000.0, COL_IS_LAUNDERING: 1, COL_RING_ID: "cy_01"},
        {COL_TX_ID: "c3", COL_FROM: "C", COL_TO: "A", COL_TIMESTAMP: pd.to_datetime("2024-03-01T11:00:00Z"), COL_AMOUNT: 48000.0, COL_IS_LAUNDERING: 1, COL_RING_ID: "cy_01"},
    ])
    candidates = detect_cycles(df)
    assert len(candidates) == 1
    cand = candidates[0]
    assert cand.typology == "cycle"
    assert cand.entry_account == "A"
    assert cand.node_roles["A"] == "entry"
    assert cand.node_roles["C"] == "exit"
    assert cand.node_roles["B"] == "mule"
    assert cand.ground_truth_laundering is True

    # GraphPayload validation
    payload = cand.to_graph_payload()
    GraphPayload.model_validate(payload)
    assert len(payload.nodes) == 3
    assert len(payload.edges) == 3
    # Hop index verification: edges ordered by BFS hop_index (1, 2, 3)
    hops = [e.hop_index for e in payload.edges]
    assert hops == [1, 2, 3]


def test_detect_valid_4_cycle():
    """Verify detection of a 4-hop temporal cycle A -> B -> C -> D -> A."""
    df = pd.DataFrame([
        {COL_TX_ID: "c1", COL_FROM: "A", COL_TO: "B", COL_TIMESTAMP: pd.to_datetime("2024-03-01T01:00:00Z"), COL_AMOUNT: 100000.0, COL_IS_LAUNDERING: 1},
        {COL_TX_ID: "c2", COL_FROM: "B", COL_TO: "C", COL_TIMESTAMP: pd.to_datetime("2024-03-01T03:00:00Z"), COL_AMOUNT: 98000.0, COL_IS_LAUNDERING: 1},
        {COL_TX_ID: "c3", COL_FROM: "C", COL_TO: "D", COL_TIMESTAMP: pd.to_datetime("2024-03-01T05:00:00Z"), COL_AMOUNT: 96000.0, COL_IS_LAUNDERING: 1},
        {COL_TX_ID: "c4", COL_FROM: "D", COL_TO: "A", COL_TIMESTAMP: pd.to_datetime("2024-03-01T07:00:00Z"), COL_AMOUNT: 94000.0, COL_IS_LAUNDERING: 1},
    ])
    candidates = detect_cycles(df)
    assert len(candidates) == 1
    cand = candidates[0]
    assert cand.typology == "cycle"
    assert len(cand.edge_records) == 4
    assert len(cand.node_roles) == 4


def test_reject_2_cycle():
    """2-cycles (A <-> B ping-pong / refunds) must be excluded."""
    df = pd.DataFrame([
        {COL_TX_ID: "c1", COL_FROM: "A", COL_TO: "B", COL_TIMESTAMP: pd.to_datetime("2024-03-01T08:00:00Z"), COL_AMOUNT: 50000.0, COL_IS_LAUNDERING: 0},
        {COL_TX_ID: "c2", COL_FROM: "B", COL_TO: "A", COL_TIMESTAMP: pd.to_datetime("2024-03-01T09:00:00Z"), COL_AMOUNT: 50000.0, COL_IS_LAUNDERING: 0},
    ])
    candidates = detect_cycles(df)
    assert len(candidates) == 0


def test_reject_out_of_order_timestamps():
    """Cycles with simultaneous or non-increasing transfers must be rejected."""
    df = pd.DataFrame([
        {COL_TX_ID: "c1", COL_FROM: "A", COL_TO: "B", COL_TIMESTAMP: pd.to_datetime("2024-03-01T10:00:00Z"), COL_AMOUNT: 50000.0, COL_IS_LAUNDERING: 0},
        # B -> C has same timestamp as A -> B (not strictly increasing)
        {COL_TX_ID: "c2", COL_FROM: "B", COL_TO: "C", COL_TIMESTAMP: pd.to_datetime("2024-03-01T10:00:00Z"), COL_AMOUNT: 49000.0, COL_IS_LAUNDERING: 0},
        {COL_TX_ID: "c3", COL_FROM: "C", COL_TO: "A", COL_TIMESTAMP: pd.to_datetime("2024-03-01T11:00:00Z"), COL_AMOUNT: 48000.0, COL_IS_LAUNDERING: 0},
    ])
    candidates = detect_cycles(df)
    assert len(candidates) == 0


def test_reject_window_exceeded():
    """Cycles taking longer than 24 hours must be rejected."""
    df = pd.DataFrame([
        {COL_TX_ID: "c1", COL_FROM: "A", COL_TO: "B", COL_TIMESTAMP: pd.to_datetime("2024-03-01T08:00:00Z"), COL_AMOUNT: 50000.0, COL_IS_LAUNDERING: 0},
        {COL_TX_ID: "c2", COL_FROM: "B", COL_TO: "C", COL_TIMESTAMP: pd.to_datetime("2024-03-01T12:00:00Z"), COL_AMOUNT: 49000.0, COL_IS_LAUNDERING: 0},
        # C -> A completes 30 hours after start
        {COL_TX_ID: "c3", COL_FROM: "C", COL_TO: "A", COL_TIMESTAMP: pd.to_datetime("2024-03-02T14:00:00Z"), COL_AMOUNT: 48000.0, COL_IS_LAUNDERING: 0},
    ])
    candidates = detect_cycles(df)
    assert len(candidates) == 0


def test_reject_low_retention():
    """Cycles with severe amount loss (< 80%) must be rejected."""
    df = pd.DataFrame([
        {COL_TX_ID: "c1", COL_FROM: "A", COL_TO: "B", COL_TIMESTAMP: pd.to_datetime("2024-03-01T08:00:00Z"), COL_AMOUNT: 50000.0, COL_IS_LAUNDERING: 0},
        {COL_TX_ID: "c2", COL_FROM: "B", COL_TO: "C", COL_TIMESTAMP: pd.to_datetime("2024-03-01T09:00:00Z"), COL_AMOUNT: 49000.0, COL_IS_LAUNDERING: 0},
        # Return amount is only 15000 (30% retention < 80%)
        {COL_TX_ID: "c3", COL_FROM: "C", COL_TO: "A", COL_TIMESTAMP: pd.to_datetime("2024-03-01T10:00:00Z"), COL_AMOUNT: 15000.0, COL_IS_LAUNDERING: 0},
    ])
    candidates = detect_cycles(df)
    assert len(candidates) == 0


def test_detect_cycles_on_synthetic_dataset():
    """Verify temporal cycles are discovered on the full synthetic transaction parquet."""
    df = load_transactions(SYNTHETIC_PARQUET)
    cycles = detect_cycles(df)
    assert len(cycles) > 0

    # Verify ground-truth laundering ring detection
    gt_cycles = [c for c in cycles if c.ground_truth_laundering]
    assert len(gt_cycles) > 0
    assert any(c.ground_truth_ring_id and "cycle" in c.ground_truth_ring_id for c in gt_cycles)


def test_detect_all_motifs_finds_all_five_typologies():
    """Verify that detect_all_motifs now captures ALL 5 required typologies."""
    df = load_transactions(SYNTHETIC_PARQUET)
    candidates = detect_all_motifs(df)
    typologies = {c.typology for c in candidates}
    assert typologies == {"fan_out", "fan_in", "scatter_gather", "pass_through", "cycle"}
