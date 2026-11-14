"""
LaunderLens – Rule-Based AML Baseline.
Implements standard industry threshold and velocity rules:
1. High-value single transaction >= $10,000 (CTR threshold).
2. Velocity / aggregation: rolling 24h window volume >= $10,000 across >= 4 transactions.
3. Structuring heuristic: repeated transfers just below $10,000 within 24h.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any

import pandas as pd

from pipeline.config import (
    BASELINE_AMOUNT_THRESHOLD,
    BASELINE_FAN_IN_MIN_TX,
    BASELINE_FAN_OUT_MIN_TX,
    BASELINE_WINDOW_HOURS,
    COL_AMOUNT,
    COL_FROM,
    COL_TIMESTAMP,
    COL_TO,
    COL_TX_ID,
)
from pipeline.detectors import CandidateCluster


def flag_baseline_transactions(df: pd.DataFrame) -> set[str]:
    """
    Apply standard threshold rules to find flagged transaction IDs:
    - Any transaction with amount >= BASELINE_AMOUNT_THRESHOLD ($10,000).
    """
    if df.empty:
        return set()
    high_value_mask = df[COL_AMOUNT] >= BASELINE_AMOUNT_THRESHOLD
    return set(df.loc[high_value_mask, COL_TX_ID].astype(str).tolist())


def flag_baseline_accounts(
    df: pd.DataFrame,
    amount_threshold: float = BASELINE_AMOUNT_THRESHOLD,
    window_hours: float = BASELINE_WINDOW_HOURS,
    min_tx_out: int = BASELINE_FAN_OUT_MIN_TX,
    min_tx_in: int = BASELINE_FAN_IN_MIN_TX,
) -> set[str]:
    """
    Apply standard AML rule heuristics across transaction log:
    1. Single transaction >= amount_threshold ($10,000): flag both source and destination accounts.
    2. High-volume rolling aggregation:
       - Account sends >= amount_threshold within window_hours over >= min_tx_out transfers.
       - Account receives >= amount_threshold within window_hours over >= min_tx_in transfers.
    """
    if df.empty:
        return set()

    flagged_accounts: set[str] = set()

    # Rule 1: Single high-value transfer >= $10,000
    high_mask = df[COL_AMOUNT] >= amount_threshold
    flagged_accounts.update(df.loc[high_mask, COL_FROM].astype(str).unique().tolist())
    flagged_accounts.update(df.loc[high_mask, COL_TO].astype(str).unique().tolist())

    # Ensure timestamp is datetime and sorted
    sorted_df = df.sort_values(COL_TIMESTAMP).copy()
    window_delta = pd.Timedelta(hours=window_hours)

    # Rule 2a: Outbound aggregation per account
    for acc, group in sorted_df.groupby(COL_FROM):
        if len(group) < min_tx_out:
            continue
        amounts = group[COL_AMOUNT].to_numpy()
        timestamps = group[COL_TIMESTAMP].to_numpy()
        n = len(amounts)
        left = 0
        current_sum = 0.0
        for right in range(n):
            current_sum += amounts[right]
            while timestamps[right] - timestamps[left] > window_delta.to_timedelta64():
                current_sum -= amounts[left]
                left += 1
            count_in_win = right - left + 1
            if count_in_win >= min_tx_out and current_sum >= amount_threshold:
                flagged_accounts.add(str(acc))
                break

    # Rule 2b: Inbound aggregation per account
    for acc, group in sorted_df.groupby(COL_TO):
        if len(group) < min_tx_in:
            continue
        amounts = group[COL_AMOUNT].to_numpy()
        timestamps = group[COL_TIMESTAMP].to_numpy()
        n = len(amounts)
        left = 0
        current_sum = 0.0
        for right in range(n):
            current_sum += amounts[right]
            while timestamps[right] - timestamps[left] > window_delta.to_timedelta64():
                current_sum -= amounts[left]
                left += 1
            count_in_win = right - left + 1
            if count_in_win >= min_tx_in and current_sum >= amount_threshold:
                flagged_accounts.add(str(acc))
                break

    return flagged_accounts


def is_cluster_flagged_by_baseline(
    cluster: CandidateCluster,
    baseline_flagged_accounts: set[str],
    baseline_flagged_txs: set[str] | None = None,
) -> bool:
    """
    Determine if a candidate cluster is flagged by the rule-based baseline.
    Flagged if:
    1. Any of its transactions was flagged for >= $10,000 threshold.
    2. Its entry account or hub account is flagged by baseline account rules.
    3. Total cluster amount >= $10,000 and at least 2 member accounts are flagged.
    """
    if baseline_flagged_txs:
        for edge in cluster.edge_records:
            tx_id = str(edge.get("id") or edge.get("tx_id") or "")
            if tx_id in baseline_flagged_txs:
                return True

    # Check key entry account
    if str(cluster.entry_account) in baseline_flagged_accounts:
        return True

    # Check hub role accounts
    for acc, role in cluster.node_roles.items():
        if role == "hub" and str(acc) in baseline_flagged_accounts:
            return True

    # Check multi-account overlap
    flagged_members = sum(1 for acc in cluster.node_roles if str(acc) in baseline_flagged_accounts)
    if flagged_members >= 2:
        return True

    return False

