"""
LaunderLens – Phase 4 tests: Temporal graph construction and motif detectors.
Validates graph building, BFS hop indexing, fan_out, fan_in, scatter_gather,
pass_through detection, role assignments, and GraphPayload schema conformance.
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
    COL_TYPOLOGY,
    SYNTHETIC_PARQUET,
)
from pipeline.detectors import (
    CandidateCluster,
    detect_all_motifs,
    detect_fan_in,
    detect_fan_out,
    detect_pass_through,
    detect_scatter_gather,
)
from pipeline.graph import build_transaction_graph, compute_edge_hop_indices
from pipeline.load import load_transactions


def test_build_transaction_graph():
    df = pd.DataFrame([
        {COL_TX_ID: "t1", COL_FROM: "A", COL_TO: "B", COL_TIMESTAMP: pd.to_datetime("2024-03-01T10:00:00Z"), COL_AMOUNT: 100.0, COL_IS_LAUNDERING: 0},
        {COL_TX_ID: "t2", COL_FROM: "B", COL_TO: "C", COL_TIMESTAMP: pd.to_datetime("2024-03-01T11:00:00Z"), COL_AMOUNT: 90.0, COL_IS_LAUNDERING: 1, COL_RING_ID: "r1"},
    ])
    G = build_transaction_graph(df)
    assert len(G.nodes) == 3
    assert len(G.edges) == 2
    edge_data = G.get_edge_data("B", "C")
    assert "t2" in edge_data
    assert edge_data["t2"]["amount"] == 90.0


def test_compute_edge_hop_indices():
    edges = [
        {"id": "e2", "source": "B", "target": "C", "amount": 90.0, "ts": "2024-03-01T12:00:00Z"},
        {"id": "e1", "source": "A", "target": "B", "amount": 100.0, "ts": "2024-03-01T10:00:00Z"},
        {"id": "e3", "source": "A", "target": "D", "amount": 50.0, "ts": "2024-03-01T11:00:00Z"},
    ]
    annotated = compute_edge_hop_indices("A", edges)
    hop_map = {e["id"]: e["hop_index"] for e in annotated}
    # Direct edges from A are hop 1
    assert hop_map["e1"] == 1
    assert hop_map["e3"] == 1
    # B -> C is hop 2
    assert hop_map["e2"] == 2

    # Edges sorted by hop_index ascending, ties by timestamp
    assert [e["id"] for e in annotated] == ["e1", "e3", "e2"]


def test_detect_fan_out():
    df = pd.DataFrame([
        {COL_TX_ID: "fo_1", COL_FROM: "ENTRY", COL_TO: "P1", COL_TIMESTAMP: pd.to_datetime("2024-03-01T08:00:00Z"), COL_AMOUNT: 20000.0, COL_IS_LAUNDERING: 1, COL_RING_ID: "fo_r"},
        {COL_TX_ID: "fo_2", COL_FROM: "ENTRY", COL_TO: "P2", COL_TIMESTAMP: pd.to_datetime("2024-03-01T08:15:00Z"), COL_AMOUNT: 20000.0, COL_IS_LAUNDERING: 1, COL_RING_ID: "fo_r"},
        {COL_TX_ID: "fo_3", COL_FROM: "ENTRY", COL_TO: "P3", COL_TIMESTAMP: pd.to_datetime("2024-03-01T08:30:00Z"), COL_AMOUNT: 20000.0, COL_IS_LAUNDERING: 1, COL_RING_ID: "fo_r"},
    ])
    candidates = detect_fan_out(df)
    assert len(candidates) >= 1
    cand = candidates[0]
    assert cand.typology == "fan_out"
    assert cand.entry_account == "ENTRY"
    assert cand.node_roles["ENTRY"] == "entry"
    assert cand.ground_truth_laundering is True
    # Schema validation of GraphPayload
    payload = cand.to_graph_payload()
    GraphPayload.model_validate(payload)
    assert len(payload.nodes) == 4
    assert len(payload.edges) == 3


def test_detect_fan_in():
    df = pd.DataFrame([
        {COL_TX_ID: "fi_1", COL_FROM: "S1", COL_TO: "HUB", COL_TIMESTAMP: pd.to_datetime("2024-03-01T10:00:00Z"), COL_AMOUNT: 15000.0, COL_IS_LAUNDERING: 1},
        {COL_TX_ID: "fi_2", COL_FROM: "S2", COL_TO: "HUB", COL_TIMESTAMP: pd.to_datetime("2024-03-01T10:30:00Z"), COL_AMOUNT: 15000.0, COL_IS_LAUNDERING: 1},
        {COL_TX_ID: "fi_3", COL_FROM: "S3", COL_TO: "HUB", COL_TIMESTAMP: pd.to_datetime("2024-03-01T11:00:00Z"), COL_AMOUNT: 15000.0, COL_IS_LAUNDERING: 1},
    ])
    candidates = detect_fan_in(df)
    assert len(candidates) >= 1
    cand = candidates[0]
    assert cand.typology == "fan_in"
    assert cand.node_roles["HUB"] == "hub"
    # Schema validation
    payload = cand.to_graph_payload()
    GraphPayload.model_validate(payload)
    assert len(payload.nodes) == 4
    assert len(payload.edges) == 3


def test_detect_scatter_gather():
    df = pd.DataFrame([
        # Scatter phase from SRC
        {COL_TX_ID: "sg_1", COL_FROM: "SRC", COL_TO: "M1", COL_TIMESTAMP: pd.to_datetime("2024-03-01T06:00:00Z"), COL_AMOUNT: 10000.0, COL_IS_LAUNDERING: 1},
        {COL_TX_ID: "sg_2", COL_FROM: "SRC", COL_TO: "M2", COL_TIMESTAMP: pd.to_datetime("2024-03-01T06:10:00Z"), COL_AMOUNT: 10000.0, COL_IS_LAUNDERING: 1},
        {COL_TX_ID: "sg_3", COL_FROM: "SRC", COL_TO: "M3", COL_TIMESTAMP: pd.to_datetime("2024-03-01T06:20:00Z"), COL_AMOUNT: 10000.0, COL_IS_LAUNDERING: 1},
        # Gather phase to DST
        {COL_TX_ID: "sg_4", COL_FROM: "M1", COL_TO: "DST", COL_TIMESTAMP: pd.to_datetime("2024-03-01T08:00:00Z"), COL_AMOUNT: 9800.0, COL_IS_LAUNDERING: 1},
        {COL_TX_ID: "sg_5", COL_FROM: "M2", COL_TO: "DST", COL_TIMESTAMP: pd.to_datetime("2024-03-01T08:15:00Z"), COL_AMOUNT: 9800.0, COL_IS_LAUNDERING: 1},
        {COL_TX_ID: "sg_6", COL_FROM: "M3", COL_TO: "DST", COL_TIMESTAMP: pd.to_datetime("2024-03-01T08:30:00Z"), COL_AMOUNT: 9800.0, COL_IS_LAUNDERING: 1},
    ])
    candidates = detect_scatter_gather(df)
    assert len(candidates) >= 1
    cand = candidates[0]
    assert cand.typology == "scatter_gather"
    assert cand.node_roles["SRC"] == "entry"
    assert cand.node_roles["DST"] == "exit"
    assert cand.node_roles["M1"] == "mule"
    # Schema validation
    payload = cand.to_graph_payload()
    GraphPayload.model_validate(payload)
    assert len(payload.nodes) == 5
    assert len(payload.edges) == 6


def test_detect_pass_through():
    df = pd.DataFrame([
        {COL_TX_ID: "pt_1", COL_FROM: "N1", COL_TO: "N2", COL_TIMESTAMP: pd.to_datetime("2024-03-01T08:00:00Z"), COL_AMOUNT: 50000.0, COL_IS_LAUNDERING: 1},
        {COL_TX_ID: "pt_2", COL_FROM: "N2", COL_TO: "N3", COL_TIMESTAMP: pd.to_datetime("2024-03-01T08:30:00Z"), COL_AMOUNT: 49000.0, COL_IS_LAUNDERING: 1},
        {COL_TX_ID: "pt_3", COL_FROM: "N3", COL_TO: "N4", COL_TIMESTAMP: pd.to_datetime("2024-03-01T09:00:00Z"), COL_AMOUNT: 48000.0, COL_IS_LAUNDERING: 1},
    ])
    candidates = detect_pass_through(df)
    assert len(candidates) >= 1
    cand = candidates[0]
    assert cand.typology == "pass_through"
    assert cand.node_roles["N1"] == "entry"
    assert cand.node_roles["N2"] == "mule"
    assert cand.node_roles["N3"] == "mule"
    assert cand.node_roles["N4"] == "exit"
    # Schema validation
    payload = cand.to_graph_payload()
    GraphPayload.model_validate(payload)
    assert len(payload.nodes) == 4
    assert len(payload.edges) == 3


def test_detect_all_motifs_on_synthetic_dataset():
    """Verify all 4 typologies are found on the generated synthetic transactions file."""
    assert SYNTHETIC_PARQUET.exists()
    df = load_transactions(SYNTHETIC_PARQUET)
    candidates = detect_all_motifs(df)
    assert len(candidates) > 0

    found_typologies = {c.typology for c in candidates}
    # Verify all 4 Phase 4 typologies were captured
    assert "fan_out" in found_typologies
    assert "fan_in" in found_typologies
    assert "scatter_gather" in found_typologies
    assert "pass_through" in found_typologies

    # Ensure all candidate payloads strictly pass Pydantic schema validation
    for cand in candidates[:10]:
        payload = cand.to_graph_payload()
        GraphPayload.model_validate(payload)
        # Verify edge hop indices are positive integers
        assert all(e.hop_index >= 1 for e in payload.edges)
        # Verify timestamps end with 'Z'
        assert all(e.ts.endswith("Z") for e in payload.edges)

