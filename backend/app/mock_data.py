"""
LaunderLens – MOCK data for Phase 1 development.
All values here are MOCK / fabricated for API development.

Contains:
  - 18 AlertSummary records across all 5 typologies
  - Full AlertDetail + GraphPayload for alerts 1-5
  - Plausible (but MOCK) metrics where LaunderLens beats baseline modestly
  - One red-team alert (alert RT-001)
"""
from __future__ import annotations

import copy
from typing import Any

from app.schemas import (
    AlertDetail,
    AlertSummary,
    GraphEdge,
    GraphNode,
    GraphPayload,
    MethodMetrics,
    Metrics,
    PerTypologyRecall,
    RedTeamResult,
    ShapItem,
)

# ──────────────────────────────────────────────
#  MOCK alert summaries  (18 total, 3 with baseline_flagged=False)
# ──────────────────────────────────────────────

_SUMMARIES: list[dict[str, Any]] = [
    # ---- fan_out (4) ----
    dict(alert_id="FO-001", typology="fan_out", risk_score=0.92,
         first_ts="2024-03-01T08:12:00Z", last_ts="2024-03-01T09:45:00Z",
         n_accounts=8, n_transactions=14, total_amount=245_000.00,
         baseline_flagged=True, status="open"),
    dict(alert_id="FO-002", typology="fan_out", risk_score=0.78,
         first_ts="2024-03-02T14:30:00Z", last_ts="2024-03-02T16:00:00Z",
         n_accounts=6, n_transactions=10, total_amount=128_500.00,
         baseline_flagged=True, status="open"),
    dict(alert_id="FO-003", typology="fan_out", risk_score=0.64,
         first_ts="2024-03-05T10:00:00Z", last_ts="2024-03-05T11:30:00Z",
         n_accounts=7, n_transactions=9, total_amount=87_200.00,
         baseline_flagged=False, status="open"),  # baseline missed
    dict(alert_id="FO-004", typology="fan_out", risk_score=0.55,
         first_ts="2024-03-06T09:00:00Z", last_ts="2024-03-06T10:15:00Z",
         n_accounts=5, n_transactions=7, total_amount=54_300.00,
         baseline_flagged=True, status="open"),

    # ---- fan_in (4) ----
    dict(alert_id="FI-001", typology="fan_in", risk_score=0.88,
         first_ts="2024-03-01T11:00:00Z", last_ts="2024-03-01T13:20:00Z",
         n_accounts=9, n_transactions=16, total_amount=310_000.00,
         baseline_flagged=True, status="open"),
    dict(alert_id="FI-002", typology="fan_in", risk_score=0.71,
         first_ts="2024-03-03T07:45:00Z", last_ts="2024-03-03T09:00:00Z",
         n_accounts=6, n_transactions=11, total_amount=142_800.00,
         baseline_flagged=True, status="open"),
    dict(alert_id="FI-003", typology="fan_in", risk_score=0.60,
         first_ts="2024-03-04T16:20:00Z", last_ts="2024-03-04T18:00:00Z",
         n_accounts=5, n_transactions=8, total_amount=76_400.00,
         baseline_flagged=True, status="open"),
    dict(alert_id="FI-004", typology="fan_in", risk_score=0.49,
         first_ts="2024-03-07T13:00:00Z", last_ts="2024-03-07T14:30:00Z",
         n_accounts=4, n_transactions=6, total_amount=38_900.00,
         baseline_flagged=True, status="open"),

    # ---- scatter_gather (3) ----
    dict(alert_id="SG-001", typology="scatter_gather", risk_score=0.95,
         first_ts="2024-03-01T06:00:00Z", last_ts="2024-03-01T14:30:00Z",
         n_accounts=12, n_transactions=22, total_amount=520_000.00,
         baseline_flagged=True, status="open"),
    dict(alert_id="SG-002", typology="scatter_gather", risk_score=0.73,
         first_ts="2024-03-03T10:30:00Z", last_ts="2024-03-03T15:45:00Z",
         n_accounts=9, n_transactions=15, total_amount=198_600.00,
         baseline_flagged=True, status="open"),
    dict(alert_id="SG-003", typology="scatter_gather", risk_score=0.52,
         first_ts="2024-03-06T08:00:00Z", last_ts="2024-03-06T12:00:00Z",
         n_accounts=7, n_transactions=11, total_amount=91_200.00,
         baseline_flagged=False, status="open"),  # baseline missed

    # ---- cycle (4) ----
    dict(alert_id="CY-001", typology="cycle", risk_score=0.90,
         first_ts="2024-03-02T09:00:00Z", last_ts="2024-03-02T17:00:00Z",
         n_accounts=6, n_transactions=12, total_amount=280_000.00,
         baseline_flagged=True, status="open"),
    dict(alert_id="CY-002", typology="cycle", risk_score=0.82,
         first_ts="2024-03-04T08:30:00Z", last_ts="2024-03-04T14:00:00Z",
         n_accounts=5, n_transactions=10, total_amount=175_300.00,
         baseline_flagged=True, status="open"),
    dict(alert_id="CY-003", typology="cycle", risk_score=0.61,
         first_ts="2024-03-05T12:00:00Z", last_ts="2024-03-05T16:45:00Z",
         n_accounts=4, n_transactions=8, total_amount=96_800.00,
         baseline_flagged=True, status="open"),
    dict(alert_id="CY-004", typology="cycle", risk_score=0.44,
         first_ts="2024-03-08T10:00:00Z", last_ts="2024-03-08T13:30:00Z",
         n_accounts=4, n_transactions=6, total_amount=42_100.00,
         baseline_flagged=False, status="open"),  # baseline missed

    # ---- pass_through (3) ----
    dict(alert_id="PT-001", typology="pass_through", risk_score=0.85,
         first_ts="2024-03-01T15:00:00Z", last_ts="2024-03-01T17:30:00Z",
         n_accounts=6, n_transactions=10, total_amount=195_000.00,
         baseline_flagged=True, status="open"),
    dict(alert_id="PT-002", typology="pass_through", risk_score=0.67,
         first_ts="2024-03-04T11:00:00Z", last_ts="2024-03-04T13:00:00Z",
         n_accounts=5, n_transactions=8, total_amount=112_400.00,
         baseline_flagged=True, status="open"),
    dict(alert_id="PT-003", typology="pass_through", risk_score=0.51,
         first_ts="2024-03-07T09:30:00Z", last_ts="2024-03-07T11:00:00Z",
         n_accounts=4, n_transactions=6, total_amount=65_700.00,
         baseline_flagged=True, status="open"),
]

# Build mutable in-memory store keyed by alert_id
ALERTS: dict[str, dict[str, Any]] = {a["alert_id"]: a for a in _SUMMARIES}


# ──────────────────────────────────────────────
#  MOCK narratives and SHAP (for detailed alerts 1-5)
# ──────────────────────────────────────────────

_DETAILS: dict[str, dict[str, Any]] = {
    "FO-001": dict(
        narrative=(
            "Account A-1001 initiated 14 outbound transfers totalling $245,000 "
            "to 7 distinct payees within a 93-minute window on 2024-03-01. "
            "The fan-out pattern is consistent with rapid fund dispersal "
            "commonly seen in layering stages of money laundering."
        ),
        narrative_source="template",
        shap=[
            ShapItem(feature="out_degree", value=7.0, contribution=0.28),
            ShapItem(feature="total_amount", value=245000.0, contribution=0.22),
            ShapItem(feature="time_window_minutes", value=93.0, contribution=0.18),
            ShapItem(feature="avg_tx_amount", value=17500.0, contribution=0.14),
            ShapItem(feature="unique_counterparties", value=7.0, contribution=0.10),
        ],
        evidence={
            "entry_account": "A-1001",
            "dispersal_targets": ["A-2001", "A-2002", "A-2003", "A-2004",
                                  "A-2005", "A-2006", "A-2007"],
            "largest_single_tx": 42000.0,
        },
    ),
    "FI-001": dict(
        narrative=(
            "Account A-3001 received 16 inbound transfers totalling $310,000 "
            "from 8 distinct sources over 2.3 hours on 2024-03-01. The fan-in "
            "pattern suggests aggregation of layered funds, typical of a "
            "consolidation phase before final extraction."
        ),
        narrative_source="template",
        shap=[
            ShapItem(feature="in_degree", value=8.0, contribution=0.30),
            ShapItem(feature="total_amount", value=310000.0, contribution=0.24),
            ShapItem(feature="time_window_minutes", value=140.0, contribution=0.15),
            ShapItem(feature="avg_tx_amount", value=19375.0, contribution=0.12),
            ShapItem(feature="unique_senders", value=8.0, contribution=0.09),
        ],
        evidence={
            "collector_account": "A-3001",
            "source_accounts": ["A-4001", "A-4002", "A-4003", "A-4004",
                                "A-4005", "A-4006", "A-4007", "A-4008"],
            "largest_single_tx": 55000.0,
        },
    ),
    "SG-001": dict(
        narrative=(
            "A scatter-gather pattern was detected: account A-5001 dispersed "
            "$260,000 across 6 intermediary accounts which then consolidated "
            "$520,000 into account A-5012 over 8.5 hours. This two-phase "
            "pattern obscures the fund trail through layered intermediaries."
        ),
        narrative_source="template",
        shap=[
            ShapItem(feature="scatter_ratio", value=0.91, contribution=0.26),
            ShapItem(feature="total_amount", value=520000.0, contribution=0.23),
            ShapItem(feature="intermediary_count", value=6.0, contribution=0.17),
            ShapItem(feature="time_span_hours", value=8.5, contribution=0.13),
            ShapItem(feature="gather_concentration", value=0.88, contribution=0.11),
        ],
        evidence={
            "scatter_source": "A-5001",
            "gather_target": "A-5012",
            "intermediaries": ["A-5002", "A-5003", "A-5004", "A-5005",
                               "A-5006", "A-5007"],
        },
    ),
    "CY-001": dict(
        narrative=(
            "A cyclic flow was identified involving 6 accounts where funds "
            "totalling $280,000 circulated through A-6001 → A-6002 → A-6003 "
            "→ A-6004 → A-6005 → A-6006 → A-6001 over 8 hours on 2024-03-02. "
            "Cyclic patterns are used to create artificial transaction volume "
            "and obscure the origin of illicit funds."
        ),
        narrative_source="template",
        shap=[
            ShapItem(feature="cycle_length", value=6.0, contribution=0.32),
            ShapItem(feature="total_amount", value=280000.0, contribution=0.20),
            ShapItem(feature="amount_retention_ratio", value=0.94, contribution=0.16),
            ShapItem(feature="time_span_hours", value=8.0, contribution=0.12),
            ShapItem(feature="tx_count", value=12.0, contribution=0.08),
        ],
        evidence={
            "cycle_path": ["A-6001", "A-6002", "A-6003", "A-6004",
                           "A-6005", "A-6006", "A-6001"],
            "amount_lost_in_cycle": 16800.0,
        },
    ),
    "PT-001": dict(
        narrative=(
            "A pass-through chain was detected: funds totalling $195,000 "
            "moved through 4 intermediary accounts (A-7002 → A-7003 → A-7004 "
            "→ A-7005) from entry account A-7001 to exit account A-7006 in "
            "2.5 hours. Each hop retained >95% of the amount, consistent "
            "with rapid layering through shell entities."
        ),
        narrative_source="template",
        shap=[
            ShapItem(feature="chain_length", value=6.0, contribution=0.29),
            ShapItem(feature="retention_ratio", value=0.96, contribution=0.21),
            ShapItem(feature="total_amount", value=195000.0, contribution=0.18),
            ShapItem(feature="time_span_hours", value=2.5, contribution=0.14),
            ShapItem(feature="min_hop_amount", value=185000.0, contribution=0.08),
        ],
        evidence={
            "entry": "A-7001",
            "exit": "A-7006",
            "chain": ["A-7001", "A-7002", "A-7003", "A-7004", "A-7005", "A-7006"],
        },
    ),
}


# ──────────────────────────────────────────────
#  MOCK graph payloads (for detailed alerts 1-5)
#  hop_index = BFS distance from entry; timestamps increase along hops
# ──────────────────────────────────────────────

_GRAPHS: dict[str, GraphPayload] = {
    # --- FO-001: fan_out, 8 nodes ---
    "FO-001": GraphPayload(
        nodes=[
            GraphNode(id="A-1001", role="entry", label="Entry Account"),
            GraphNode(id="A-2001", role="mule", label="Payee 1"),
            GraphNode(id="A-2002", role="mule", label="Payee 2"),
            GraphNode(id="A-2003", role="mule", label="Payee 3"),
            GraphNode(id="A-2004", role="mule", label="Payee 4"),
            GraphNode(id="A-2005", role="exit", label="Payee 5 (exit)"),
            GraphNode(id="A-2006", role="exit", label="Payee 6 (exit)"),
            GraphNode(id="A-2007", role="other", label="Payee 7"),
        ],
        edges=[
            GraphEdge(id="e-fo-01", source="A-1001", target="A-2001",
                      amount=42000.0, ts="2024-03-01T08:12:00Z", hop_index=1),
            GraphEdge(id="e-fo-02", source="A-1001", target="A-2002",
                      amount=38000.0, ts="2024-03-01T08:18:00Z", hop_index=1),
            GraphEdge(id="e-fo-03", source="A-1001", target="A-2003",
                      amount=35000.0, ts="2024-03-01T08:25:00Z", hop_index=1),
            GraphEdge(id="e-fo-04", source="A-1001", target="A-2004",
                      amount=32000.0, ts="2024-03-01T08:33:00Z", hop_index=1),
            GraphEdge(id="e-fo-05", source="A-1001", target="A-2005",
                      amount=30000.0, ts="2024-03-01T08:40:00Z", hop_index=1),
            GraphEdge(id="e-fo-06", source="A-1001", target="A-2006",
                      amount=28000.0, ts="2024-03-01T08:48:00Z", hop_index=1),
            GraphEdge(id="e-fo-07", source="A-1001", target="A-2007",
                      amount=22000.0, ts="2024-03-01T08:55:00Z", hop_index=1),
            GraphEdge(id="e-fo-08", source="A-2001", target="A-2005",
                      amount=18000.0, ts="2024-03-01T09:45:00Z", hop_index=2),
        ],
    ),
    # --- FI-001: fan_in, 9 nodes ---
    "FI-001": GraphPayload(
        nodes=[
            GraphNode(id="A-4001", role="entry", label="Source 1"),
            GraphNode(id="A-4002", role="entry", label="Source 2"),
            GraphNode(id="A-4003", role="entry", label="Source 3"),
            GraphNode(id="A-4004", role="other", label="Source 4"),
            GraphNode(id="A-4005", role="other", label="Source 5"),
            GraphNode(id="A-4006", role="mule", label="Source 6"),
            GraphNode(id="A-4007", role="mule", label="Source 7"),
            GraphNode(id="A-4008", role="other", label="Source 8"),
            GraphNode(id="A-3001", role="hub", label="Collector"),
        ],
        edges=[
            GraphEdge(id="e-fi-01", source="A-4001", target="A-3001",
                      amount=55000.0, ts="2024-03-01T11:00:00Z", hop_index=1),
            GraphEdge(id="e-fi-02", source="A-4002", target="A-3001",
                      amount=48000.0, ts="2024-03-01T11:10:00Z", hop_index=1),
            GraphEdge(id="e-fi-03", source="A-4003", target="A-3001",
                      amount=42000.0, ts="2024-03-01T11:22:00Z", hop_index=1),
            GraphEdge(id="e-fi-04", source="A-4004", target="A-3001",
                      amount=38000.0, ts="2024-03-01T11:35:00Z", hop_index=1),
            GraphEdge(id="e-fi-05", source="A-4005", target="A-3001",
                      amount=35000.0, ts="2024-03-01T11:48:00Z", hop_index=1),
            GraphEdge(id="e-fi-06", source="A-4006", target="A-3001",
                      amount=32000.0, ts="2024-03-01T12:05:00Z", hop_index=1),
            GraphEdge(id="e-fi-07", source="A-4007", target="A-3001",
                      amount=30000.0, ts="2024-03-01T12:30:00Z", hop_index=1),
            GraphEdge(id="e-fi-08", source="A-4008", target="A-3001",
                      amount=30000.0, ts="2024-03-01T13:20:00Z", hop_index=1),
        ],
    ),
    # --- SG-001: scatter_gather, 12 nodes ---
    "SG-001": GraphPayload(
        nodes=[
            GraphNode(id="A-5001", role="entry", label="Scatter Source"),
            GraphNode(id="A-5002", role="mule", label="Intermediary 1"),
            GraphNode(id="A-5003", role="mule", label="Intermediary 2"),
            GraphNode(id="A-5004", role="mule", label="Intermediary 3"),
            GraphNode(id="A-5005", role="mule", label="Intermediary 4"),
            GraphNode(id="A-5006", role="mule", label="Intermediary 5"),
            GraphNode(id="A-5007", role="mule", label="Intermediary 6"),
            GraphNode(id="A-5008", role="other", label="Side Account 1"),
            GraphNode(id="A-5009", role="other", label="Side Account 2"),
            GraphNode(id="A-5010", role="other", label="Side Account 3"),
            GraphNode(id="A-5011", role="other", label="Side Account 4"),
            GraphNode(id="A-5012", role="exit", label="Gather Target"),
        ],
        edges=[
            # scatter phase (hop 1)
            GraphEdge(id="e-sg-01", source="A-5001", target="A-5002",
                      amount=52000.0, ts="2024-03-01T06:00:00Z", hop_index=1),
            GraphEdge(id="e-sg-02", source="A-5001", target="A-5003",
                      amount=48000.0, ts="2024-03-01T06:10:00Z", hop_index=1),
            GraphEdge(id="e-sg-03", source="A-5001", target="A-5004",
                      amount=45000.0, ts="2024-03-01T06:22:00Z", hop_index=1),
            GraphEdge(id="e-sg-04", source="A-5001", target="A-5005",
                      amount=41000.0, ts="2024-03-01T06:35:00Z", hop_index=1),
            GraphEdge(id="e-sg-05", source="A-5001", target="A-5006",
                      amount=39000.0, ts="2024-03-01T06:45:00Z", hop_index=1),
            GraphEdge(id="e-sg-06", source="A-5001", target="A-5007",
                      amount=35000.0, ts="2024-03-01T06:58:00Z", hop_index=1),
            # intermediate hops (hop 2) – some funds bounce through side accounts
            GraphEdge(id="e-sg-07", source="A-5002", target="A-5008",
                      amount=25000.0, ts="2024-03-01T08:00:00Z", hop_index=2),
            GraphEdge(id="e-sg-08", source="A-5003", target="A-5009",
                      amount=22000.0, ts="2024-03-01T08:15:00Z", hop_index=2),
            GraphEdge(id="e-sg-09", source="A-5004", target="A-5010",
                      amount=20000.0, ts="2024-03-01T08:30:00Z", hop_index=2),
            GraphEdge(id="e-sg-10", source="A-5005", target="A-5011",
                      amount=18000.0, ts="2024-03-01T08:45:00Z", hop_index=2),
            # gather phase (hop 2-3)
            GraphEdge(id="e-sg-11", source="A-5002", target="A-5012",
                      amount=27000.0, ts="2024-03-01T10:00:00Z", hop_index=2),
            GraphEdge(id="e-sg-12", source="A-5003", target="A-5012",
                      amount=26000.0, ts="2024-03-01T10:30:00Z", hop_index=2),
            GraphEdge(id="e-sg-13", source="A-5006", target="A-5012",
                      amount=39000.0, ts="2024-03-01T11:00:00Z", hop_index=2),
            GraphEdge(id="e-sg-14", source="A-5007", target="A-5012",
                      amount=35000.0, ts="2024-03-01T11:30:00Z", hop_index=2),
            GraphEdge(id="e-sg-15", source="A-5008", target="A-5012",
                      amount=25000.0, ts="2024-03-01T12:00:00Z", hop_index=3),
            GraphEdge(id="e-sg-16", source="A-5009", target="A-5012",
                      amount=22000.0, ts="2024-03-01T12:30:00Z", hop_index=3),
            GraphEdge(id="e-sg-17", source="A-5010", target="A-5012",
                      amount=20000.0, ts="2024-03-01T13:00:00Z", hop_index=3),
            GraphEdge(id="e-sg-18", source="A-5011", target="A-5012",
                      amount=18000.0, ts="2024-03-01T13:30:00Z", hop_index=3),
            # extra intermediate edges
            GraphEdge(id="e-sg-19", source="A-5004", target="A-5012",
                      amount=25000.0, ts="2024-03-01T14:00:00Z", hop_index=2),
            GraphEdge(id="e-sg-20", source="A-5005", target="A-5012",
                      amount=23000.0, ts="2024-03-01T14:15:00Z", hop_index=2),
            GraphEdge(id="e-sg-21", source="A-5001", target="A-5008",
                      amount=40000.0, ts="2024-03-01T07:00:00Z", hop_index=1),
            GraphEdge(id="e-sg-22", source="A-5001", target="A-5009",
                      amount=40000.0, ts="2024-03-01T07:10:00Z", hop_index=1),
        ],
    ),
    # --- CY-001: cycle, 6 nodes ---
    "CY-001": GraphPayload(
        nodes=[
            GraphNode(id="A-6001", role="entry", label="Cycle Node 1"),
            GraphNode(id="A-6002", role="hub", label="Cycle Node 2"),
            GraphNode(id="A-6003", role="mule", label="Cycle Node 3"),
            GraphNode(id="A-6004", role="mule", label="Cycle Node 4"),
            GraphNode(id="A-6005", role="mule", label="Cycle Node 5"),
            GraphNode(id="A-6006", role="exit", label="Cycle Node 6"),
        ],
        edges=[
            GraphEdge(id="e-cy-01", source="A-6001", target="A-6002",
                      amount=50000.0, ts="2024-03-02T09:00:00Z", hop_index=1),
            GraphEdge(id="e-cy-02", source="A-6002", target="A-6003",
                      amount=48500.0, ts="2024-03-02T10:00:00Z", hop_index=2),
            GraphEdge(id="e-cy-03", source="A-6003", target="A-6004",
                      amount=47000.0, ts="2024-03-02T11:30:00Z", hop_index=3),
            GraphEdge(id="e-cy-04", source="A-6004", target="A-6005",
                      amount=46000.0, ts="2024-03-02T13:00:00Z", hop_index=4),
            GraphEdge(id="e-cy-05", source="A-6005", target="A-6006",
                      amount=45200.0, ts="2024-03-02T14:30:00Z", hop_index=5),
            GraphEdge(id="e-cy-06", source="A-6006", target="A-6001",
                      amount=43300.0, ts="2024-03-02T15:45:00Z", hop_index=6),
            # second loop
            GraphEdge(id="e-cy-07", source="A-6001", target="A-6002",
                      amount=43000.0, ts="2024-03-02T16:00:00Z", hop_index=1),
            GraphEdge(id="e-cy-08", source="A-6002", target="A-6003",
                      amount=42000.0, ts="2024-03-02T16:15:00Z", hop_index=2),
            GraphEdge(id="e-cy-09", source="A-6003", target="A-6004",
                      amount=41500.0, ts="2024-03-02T16:30:00Z", hop_index=3),
            GraphEdge(id="e-cy-10", source="A-6004", target="A-6005",
                      amount=41000.0, ts="2024-03-02T16:40:00Z", hop_index=4),
            GraphEdge(id="e-cy-11", source="A-6005", target="A-6006",
                      amount=40500.0, ts="2024-03-02T16:50:00Z", hop_index=5),
            GraphEdge(id="e-cy-12", source="A-6006", target="A-6001",
                      amount=40000.0, ts="2024-03-02T17:00:00Z", hop_index=6),
        ],
    ),
    # --- PT-001: pass_through, 6 nodes ---
    "PT-001": GraphPayload(
        nodes=[
            GraphNode(id="A-7001", role="entry", label="Origin"),
            GraphNode(id="A-7002", role="mule", label="Pass-through 1"),
            GraphNode(id="A-7003", role="mule", label="Pass-through 2"),
            GraphNode(id="A-7004", role="mule", label="Pass-through 3"),
            GraphNode(id="A-7005", role="mule", label="Pass-through 4"),
            GraphNode(id="A-7006", role="exit", label="Destination"),
        ],
        edges=[
            GraphEdge(id="e-pt-01", source="A-7001", target="A-7002",
                      amount=195000.0, ts="2024-03-01T15:00:00Z", hop_index=1),
            GraphEdge(id="e-pt-02", source="A-7002", target="A-7003",
                      amount=194000.0, ts="2024-03-01T15:20:00Z", hop_index=2),
            GraphEdge(id="e-pt-03", source="A-7003", target="A-7004",
                      amount=192500.0, ts="2024-03-01T15:45:00Z", hop_index=3),
            GraphEdge(id="e-pt-04", source="A-7004", target="A-7005",
                      amount=191000.0, ts="2024-03-01T16:10:00Z", hop_index=4),
            GraphEdge(id="e-pt-05", source="A-7005", target="A-7006",
                      amount=190000.0, ts="2024-03-01T16:35:00Z", hop_index=5),
            # extra side transfers to make it non-trivial
            GraphEdge(id="e-pt-06", source="A-7001", target="A-7003",
                      amount=5000.0, ts="2024-03-01T15:30:00Z", hop_index=1),
            GraphEdge(id="e-pt-07", source="A-7002", target="A-7004",
                      amount=3500.0, ts="2024-03-01T16:00:00Z", hop_index=2),
            GraphEdge(id="e-pt-08", source="A-7003", target="A-7005",
                      amount=2800.0, ts="2024-03-01T16:20:00Z", hop_index=3),
            GraphEdge(id="e-pt-09", source="A-7004", target="A-7006",
                      amount=2200.0, ts="2024-03-01T16:50:00Z", hop_index=4),
            GraphEdge(id="e-pt-10", source="A-7005", target="A-7006",
                      amount=5000.0, ts="2024-03-01T17:30:00Z", hop_index=5),
        ],
    ),
}


# ──────────────────────────────────────────────
#  MOCK red-team alert
# ──────────────────────────────────────────────

_REDTEAM_ALERT = AlertDetail(
    alert_id="RT-001",
    typology="scatter_gather",
    risk_score=0.87,
    first_ts="2024-03-10T02:00:00Z",
    last_ts="2024-03-10T04:30:00Z",
    n_accounts=10,
    n_transactions=18,
    total_amount=89_500.00,
    baseline_flagged=False,
    status="open",
    is_redteam=True,
    narrative=(
        "Red-team injection: A synthetic structuring ring was detected where "
        "18 transfers, each under the $10,000 reporting threshold, were "
        "dispersed across 9 mule accounts and consolidated into exit account "
        "A-RT-010 within 2.5 hours. The baseline rule engine missed this "
        "pattern because no individual transfer exceeded the threshold."
    ),
    narrative_source="template",
    shap=[
        ShapItem(feature="sub_threshold_ratio", value=1.0, contribution=0.35),
        ShapItem(feature="total_amount", value=89500.0, contribution=0.22),
        ShapItem(feature="time_window_minutes", value=150.0, contribution=0.16),
        ShapItem(feature="n_intermediaries", value=9.0, contribution=0.13),
        ShapItem(feature="avg_tx_amount", value=4972.2, contribution=0.09),
    ],
    evidence={
        "pattern": "structuring_ring",
        "entry": "A-RT-001",
        "exit": "A-RT-010",
        "avg_tx_amount": 4972.22,
        "threshold": 10000.0,
        "all_under_threshold": True,
    },
)

_REDTEAM_GRAPH = GraphPayload(
    nodes=[
        GraphNode(id="A-RT-001", role="entry", label="Ring Entry"),
        GraphNode(id="A-RT-002", role="mule", label="Mule 1"),
        GraphNode(id="A-RT-003", role="mule", label="Mule 2"),
        GraphNode(id="A-RT-004", role="mule", label="Mule 3"),
        GraphNode(id="A-RT-005", role="mule", label="Mule 4"),
        GraphNode(id="A-RT-006", role="mule", label="Mule 5"),
        GraphNode(id="A-RT-007", role="mule", label="Mule 6"),
        GraphNode(id="A-RT-008", role="mule", label="Mule 7"),
        GraphNode(id="A-RT-009", role="mule", label="Mule 8"),
        GraphNode(id="A-RT-010", role="exit", label="Ring Exit"),
    ],
    edges=[
        GraphEdge(id="e-rt-01", source="A-RT-001", target="A-RT-002",
                  amount=9800.0, ts="2024-03-10T02:00:00Z", hop_index=1),
        GraphEdge(id="e-rt-02", source="A-RT-001", target="A-RT-003",
                  amount=9500.0, ts="2024-03-10T02:05:00Z", hop_index=1),
        GraphEdge(id="e-rt-03", source="A-RT-001", target="A-RT-004",
                  amount=9200.0, ts="2024-03-10T02:10:00Z", hop_index=1),
        GraphEdge(id="e-rt-04", source="A-RT-001", target="A-RT-005",
                  amount=8900.0, ts="2024-03-10T02:15:00Z", hop_index=1),
        GraphEdge(id="e-rt-05", source="A-RT-001", target="A-RT-006",
                  amount=8600.0, ts="2024-03-10T02:20:00Z", hop_index=1),
        GraphEdge(id="e-rt-06", source="A-RT-001", target="A-RT-007",
                  amount=8400.0, ts="2024-03-10T02:25:00Z", hop_index=1),
        GraphEdge(id="e-rt-07", source="A-RT-001", target="A-RT-008",
                  amount=8200.0, ts="2024-03-10T02:30:00Z", hop_index=1),
        GraphEdge(id="e-rt-08", source="A-RT-001", target="A-RT-009",
                  amount=7900.0, ts="2024-03-10T02:35:00Z", hop_index=1),
        GraphEdge(id="e-rt-09", source="A-RT-001", target="A-RT-002",
                  amount=9000.0, ts="2024-03-10T02:40:00Z", hop_index=1),
        # gather to exit (hop 2)
        GraphEdge(id="e-rt-10", source="A-RT-002", target="A-RT-010",
                  amount=9500.0, ts="2024-03-10T03:00:00Z", hop_index=2),
        GraphEdge(id="e-rt-11", source="A-RT-003", target="A-RT-010",
                  amount=9500.0, ts="2024-03-10T03:10:00Z", hop_index=2),
        GraphEdge(id="e-rt-12", source="A-RT-004", target="A-RT-010",
                  amount=9200.0, ts="2024-03-10T03:20:00Z", hop_index=2),
        GraphEdge(id="e-rt-13", source="A-RT-005", target="A-RT-010",
                  amount=8900.0, ts="2024-03-10T03:30:00Z", hop_index=2),
        GraphEdge(id="e-rt-14", source="A-RT-006", target="A-RT-010",
                  amount=8600.0, ts="2024-03-10T03:45:00Z", hop_index=2),
        GraphEdge(id="e-rt-15", source="A-RT-007", target="A-RT-010",
                  amount=8400.0, ts="2024-03-10T04:00:00Z", hop_index=2),
        GraphEdge(id="e-rt-16", source="A-RT-008", target="A-RT-010",
                  amount=8200.0, ts="2024-03-10T04:15:00Z", hop_index=2),
        GraphEdge(id="e-rt-17", source="A-RT-009", target="A-RT-010",
                  amount=7900.0, ts="2024-03-10T04:25:00Z", hop_index=2),
        GraphEdge(id="e-rt-18", source="A-RT-002", target="A-RT-010",
                  amount=9000.0, ts="2024-03-10T04:30:00Z", hop_index=2),
    ],
)

# Track whether red-team has been injected
_redteam_injected = False


# ──────────────────────────────────────────────
#  MOCK metrics  (LaunderLens beats baseline MODESTLY – these are MOCK values)
# ──────────────────────────────────────────────

MOCK_METRICS = Metrics(
    runs=[
        MethodMetrics(
            method="baseline",
            alerts_count=15,
            true_positives=11,
            false_positives=4,
            precision=0.733,
            recall=0.647,
            f1=0.688,
            fpr=0.052,
        ),
        MethodMetrics(
            method="launderlens",
            alerts_count=18,
            true_positives=15,
            false_positives=3,
            precision=0.833,
            recall=0.882,
            f1=0.857,
            fpr=0.039,
        ),
    ],
    per_typology=[
        PerTypologyRecall(typology="fan_out", recall_baseline=0.75, recall_ours=0.92),
        PerTypologyRecall(typology="fan_in", recall_baseline=0.70, recall_ours=0.85),
        PerTypologyRecall(typology="scatter_gather", recall_baseline=0.55, recall_ours=0.80),
        PerTypologyRecall(typology="cycle", recall_baseline=0.60, recall_ours=0.78),
        PerTypologyRecall(typology="pass_through", recall_baseline=0.65, recall_ours=0.82),
    ],
)


# ──────────────────────────────────────────────
#  Public accessor functions used by the API routes
# ──────────────────────────────────────────────

def get_alert_summaries(
    typology: str | None = None,
    min_risk: float | None = None,
) -> list[AlertSummary]:
    """Return alerts sorted by risk_score descending, with optional filters."""
    results = list(ALERTS.values())
    if typology is not None:
        results = [a for a in results if a["typology"] == typology]
    if min_risk is not None:
        results = [a for a in results if a["risk_score"] >= min_risk]
    results.sort(key=lambda a: a["risk_score"], reverse=True)
    return [AlertSummary(**a) for a in results]


def get_alert_detail(alert_id: str) -> AlertDetail | None:
    """Return full detail for an alert, or None if not found."""
    summary = ALERTS.get(alert_id)
    if summary is None:
        return None
    detail_extra = _DETAILS.get(alert_id)
    if detail_extra is None:
        # Alerts without full detail get a generic placeholder
        detail_extra = dict(
            narrative=f"Alert {alert_id} detected. Detailed narrative pending.",
            narrative_source="template",
            shap=[
                ShapItem(feature="placeholder", value=0.0, contribution=0.0),
            ],
            evidence={"note": "Full evidence pending pipeline run."},
        )
    merged = {**summary, **detail_extra}
    # shap items are already ShapItem objects from _DETAILS; keep as-is
    return AlertDetail(**merged)


def get_alert_graph(alert_id: str) -> GraphPayload | None:
    """Return the graph payload for an alert, or None if not found."""
    if alert_id not in ALERTS:
        return None
    graph = _GRAPHS.get(alert_id)
    if graph is None:
        # Alerts without a full graph get a minimal placeholder
        return GraphPayload(
            nodes=[GraphNode(id=f"{alert_id}-n1", role="other", label="Placeholder")],
            edges=[],
        )
    return graph


def update_disposition(alert_id: str, status: str) -> AlertSummary | None:
    """Update alert status in memory. Returns updated summary or None."""
    if alert_id not in ALERTS:
        return None
    ALERTS[alert_id]["status"] = status
    return AlertSummary(**ALERTS[alert_id])


def inject_redteam(seed: int | None = None) -> RedTeamResult:
    """Inject a red-team alert and return it. Seed is ignored in mock mode."""
    global _redteam_injected
    # Add the red-team alert to the in-memory store
    rt_dict = _REDTEAM_ALERT.model_dump()
    ALERTS["RT-001"] = {
        k: v for k, v in rt_dict.items()
        if k in AlertSummary.model_fields
    }
    _GRAPHS["RT-001"] = _REDTEAM_GRAPH
    _DETAILS["RT-001"] = {
        "narrative": rt_dict["narrative"],
        "narrative_source": rt_dict["narrative_source"],
        "shap": _REDTEAM_ALERT.shap,
        "evidence": rt_dict["evidence"],
    }
    _redteam_injected = True
    return RedTeamResult(
        alert=_REDTEAM_ALERT,
        baseline_flagged=False,
        latency_ms=42,  # MOCK latency
    )


def delete_redteam() -> bool:
    """Remove injected red-team alerts. Returns True if something was removed."""
    global _redteam_injected
    removed = "RT-001" in ALERTS
    ALERTS.pop("RT-001", None)
    _GRAPHS.pop("RT-001", None)
    _DETAILS.pop("RT-001", None)
    _redteam_injected = False
    return removed


def get_metrics() -> Metrics:
    """Return MOCK benchmark metrics."""
    return MOCK_METRICS

