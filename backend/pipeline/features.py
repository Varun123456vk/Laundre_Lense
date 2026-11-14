"""
LaunderLens – Feature Extraction for Candidate Clusters.
Extracts purely topological, flow, and transactional features.
CRITICAL: Never uses ground-truth labels (is_laundering) as features.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from pipeline.config import BASELINE_AMOUNT_THRESHOLD
from pipeline.detectors import CandidateCluster

FEATURE_NAMES = [
    "total_amount",
    "avg_tx_amount",
    "max_tx_amount",
    "min_tx_amount",
    "n_accounts",
    "n_transactions",
    "time_span_minutes",
    "velocity_tx_per_hour",
    "amount_retention_ratio",
    "sub_threshold_ratio",
    "density",
    "typology_fan_out",
    "typology_fan_in",
    "typology_scatter_gather",
    "typology_cycle",
    "typology_pass_through",
]


def extract_cluster_features(cluster: CandidateCluster) -> dict[str, float]:
    """
    Extract a dictionary of numerical features for a single CandidateCluster.
    Strictly uses observable graph properties without ground truth labels.
    """
    amounts = [float(e["amount"]) for e in cluster.edge_records]
    tot_amt = sum(amounts) if amounts else cluster.total_amount
    avg_amt = (tot_amt / len(amounts)) if amounts else 0.0
    max_amt = max(amounts) if amounts else 0.0
    min_amt = min(amounts) if amounts else 0.0

    # Temporal features
    time_span_sec = max(1.0, (cluster.last_ts - cluster.first_ts).total_seconds())
    time_span_min = time_span_sec / 60.0
    time_span_hours = time_span_sec / 3600.0

    velocity = cluster.n_transactions / max(0.1, time_span_hours)
    retention = (min_amt / max(1.0, max_amt)) if max_amt > 0 else 1.0

    # Fraction of transfers below the reporting threshold (structuring detector)
    sub_threshold_count = sum(1 for a in amounts if a < BASELINE_AMOUNT_THRESHOLD)
    sub_threshold_ratio = (sub_threshold_count / len(amounts)) if amounts else 0.0

    # Graph edge density
    n_nodes = max(2, cluster.n_accounts)
    max_edges = n_nodes * (n_nodes - 1)
    density = min(1.0, cluster.n_transactions / max(1, max_edges))

    feats: dict[str, float] = {
        "total_amount": float(tot_amt),
        "avg_tx_amount": float(avg_amt),
        "max_tx_amount": float(max_amt),
        "min_tx_amount": float(min_amt),
        "n_accounts": float(cluster.n_accounts),
        "n_transactions": float(cluster.n_transactions),
        "time_span_minutes": float(time_span_min),
        "velocity_tx_per_hour": float(velocity),
        "amount_retention_ratio": float(retention),
        "sub_threshold_ratio": float(sub_threshold_ratio),
        "density": float(density),
        "typology_fan_out": 1.0 if cluster.typology == "fan_out" else 0.0,
        "typology_fan_in": 1.0 if cluster.typology == "fan_in" else 0.0,
        "typology_scatter_gather": 1.0 if cluster.typology == "scatter_gather" else 0.0,
        "typology_cycle": 1.0 if cluster.typology == "cycle" else 0.0,
        "typology_pass_through": 1.0 if cluster.typology == "pass_through" else 0.0,
    }

    return feats


def extract_features_dataframe(
    clusters: list[CandidateCluster],
) -> tuple[pd.DataFrame, list[str]]:
    """
    Extract feature matrix for a list of candidate clusters.
    Returns (DataFrame, list_of_feature_names).
    """
    rows = [extract_cluster_features(c) for c in clusters]
    df_feats = pd.DataFrame(rows, columns=FEATURE_NAMES).fillna(0.0)
    return df_feats, FEATURE_NAMES

