"""
Tests for Phase 7: Rule Baseline & Evaluation Metrics Engine.
Verifies:
1. Baseline rule detection on high-value transfers and rolling aggregations.
2. Pure mathematical correctness and zero-division safety of classification metrics.
3. Comprehensive benchmark evaluation across all 5 typologies conforming to Pydantic schemas.
"""
from datetime import datetime, timezone, timedelta
import pandas as pd
import pytest

from app.schemas import MethodMetrics, Metrics, PerTypologyRecall
from pipeline.baseline import (
    flag_baseline_accounts,
    flag_baseline_transactions,
    is_cluster_flagged_by_baseline,
)
from pipeline.config import (
    BASELINE_AMOUNT_THRESHOLD,
    COL_AMOUNT,
    COL_FROM,
    COL_TIMESTAMP,
    COL_TO,
    COL_TX_ID,
)
from pipeline.detectors import CandidateCluster
from pipeline.metrics import ALL_TYPOLOGIES, calculate_method_metrics, compute_benchmark_metrics


def _make_cluster(
    candidate_id: str,
    typology: str,
    is_laundering: bool,
    entry_account: str = "ACC_1",
    total_amount: float = 25000.0,
) -> CandidateCluster:
    now = datetime(2026, 11, 14, 12, 0, 0, tzinfo=timezone.utc)
    return CandidateCluster(
        candidate_id=candidate_id,
        typology=typology,  # type: ignore[arg-type]
        entry_account=entry_account,
        node_roles={entry_account: "entry", "ACC_2": "mule", "ACC_3": "exit"},
        node_labels={entry_account: entry_account, "ACC_2": "ACC_2", "ACC_3": "ACC_3"},
        edge_records=[
            {
                "id": f"tx_{candidate_id}_1",
                "source": entry_account,
                "target": "ACC_2",
                "amount": total_amount / 2,
                "ts": now.isoformat(),
            },
            {
                "id": f"tx_{candidate_id}_2",
                "source": "ACC_2",
                "target": "ACC_3",
                "amount": total_amount / 2,
                "ts": (now + timedelta(hours=1)).isoformat(),
            },
        ],
        total_amount=total_amount,
        first_ts=now,
        last_ts=now + timedelta(hours=1),
        n_accounts=3,
        n_transactions=2,
        ground_truth_laundering=is_laundering,
    )


def test_baseline_single_high_value():
    """Verify single transfers >= $10,000 are flagged."""
    data = [
        {
            COL_TX_ID: "tx_low",
            COL_FROM: "A1",
            COL_TO: "B1",
            COL_AMOUNT: 9_999.0,
            COL_TIMESTAMP: pd.Timestamp("2026-11-14 10:00:00", tz=timezone.utc),
        },
        {
            COL_TX_ID: "tx_high",
            COL_FROM: "A2",
            COL_TO: "B2",
            COL_AMOUNT: 10_000.0,
            COL_TIMESTAMP: pd.Timestamp("2026-11-14 11:00:00", tz=timezone.utc),
        },
    ]
    df = pd.DataFrame(data)

    tx_flagged = flag_baseline_transactions(df)
    assert "tx_high" in tx_flagged
    assert "tx_low" not in tx_flagged

    acc_flagged = flag_baseline_accounts(df)
    assert "A2" in acc_flagged
    assert "B2" in acc_flagged
    assert "A1" not in acc_flagged
    assert "B1" not in acc_flagged


def test_baseline_rolling_aggregation():
    """Verify 24h rolling aggregation flags accounts with >= 4 transfers totalling >= $10,000."""
    t0 = pd.Timestamp("2026-11-14 08:00:00", tz=timezone.utc)
    # Account A sends 4 transfers of $3,000 within 4 hours (Total = $12,000)
    data = [
        {
            COL_TX_ID: f"tx_agg_{i}",
            COL_FROM: "ACC_BURST",
            COL_TO: f"MULE_{i}",
            COL_AMOUNT: 3000.0,
            COL_TIMESTAMP: t0 + pd.Timedelta(hours=i),
        }
        for i in range(4)
    ]
    # Account B sends 4 transfers of $500 within 4 hours (Total = $2,000, below $10k)
    data.extend([
        {
            COL_TX_ID: f"tx_small_{i}",
            COL_FROM: "ACC_BENIGN",
            COL_TO: f"MULE_B_{i}",
            COL_AMOUNT: 500.0,
            COL_TIMESTAMP: t0 + pd.Timedelta(hours=i),
        }
        for i in range(4)
    ])
    df = pd.DataFrame(data)

    flagged = flag_baseline_accounts(df)
    assert "ACC_BURST" in flagged
    assert "ACC_BENIGN" not in flagged


def test_is_cluster_flagged_by_baseline():
    """Verify cluster level attribution of baseline flags."""
    cluster = _make_cluster("c_test", "fan_out", True, entry_account="DIRTY_ENTRY")
    flagged_accounts = {"DIRTY_ENTRY", "OTHER_ACC"}

    assert is_cluster_flagged_by_baseline(cluster, flagged_accounts) is True

    clean_accounts = {"CLEAN_1", "CLEAN_2"}
    assert is_cluster_flagged_by_baseline(cluster, clean_accounts) is False


def test_calculate_method_metrics_accuracy_and_safety():
    """Verify precision, recall, F1, and FPR formulas and zero-division handling."""
    # Perfect classification
    y_true = [True, True, False, False]
    y_pred = [True, True, False, False]
    m = calculate_method_metrics("launderlens", y_true, y_pred)
    assert m.method == "launderlens"
    assert m.precision == 1.0
    assert m.recall == 1.0
    assert m.f1 == 1.0
    assert m.fpr == 0.0
    assert m.true_positives == 2
    assert m.false_positives == 0

    # Zero positive predictions (Zero division safe)
    y_empty_pred = [False, False, False, False]
    m_empty = calculate_method_metrics("baseline", y_true, y_empty_pred)
    assert m_empty.precision == 0.0
    assert m_empty.recall == 0.0
    assert m_empty.f1 == 0.0
    assert m_empty.fpr == 0.0
    assert m_empty.true_positives == 0
    assert m_empty.false_positives == 0

    # Typical mixed outcome
    # TP=2, FP=1, FN=1, TN=2
    # Prec = 2/3 = 0.667, Rec = 2/3 = 0.667, F1 = 0.667, FPR = 1/3 = 0.333
    y_mixed_true = [True, True, True, False, False, False]
    y_mixed_pred = [True, True, False, True, False, False]
    m_mixed = calculate_method_metrics("baseline", y_mixed_true, y_mixed_pred)
    assert m_mixed.true_positives == 2
    assert m_mixed.false_positives == 1
    assert m_mixed.precision == 0.667
    assert m_mixed.recall == 0.667
    assert m_mixed.f1 == 0.667
    assert m_mixed.fpr == 0.333


def test_compute_benchmark_metrics_all_5_typologies():
    """Verify benchmark metrics across all 5 typologies conforming to frozen schema."""
    clusters = []
    baseline_flags = []
    scores = []

    # Create 2 laundering clusters for each of the 5 typologies + 5 background clusters
    for typo in ALL_TYPOLOGIES:
        for i in range(2):
            c_id = f"c_{typo}_{i}"
            clusters.append(_make_cluster(c_id, typo, is_laundering=True))
            # Baseline catches first cluster (high amount), misses second (sub-threshold)
            baseline_flags.append(i == 0)
            # LaunderLens catches both
            scores.append(0.85 if i == 0 else 0.72)

    # 5 background negative clusters
    for i in range(5):
        clusters.append(_make_cluster(f"bg_{i}", "fan_out", is_laundering=False))
        baseline_flags.append(i == 0)  # 1 false positive for baseline
        scores.append(0.15)            # LaunderLens correctly rejects all 5

    metrics = compute_benchmark_metrics(
        clusters=clusters,
        baseline_flags=baseline_flags,
        launderlens_scores=scores,
        risk_threshold=0.50,
    )

    # Verify Pydantic schema validation
    assert isinstance(metrics, Metrics)
    assert len(metrics.runs) == 2
    assert metrics.runs[0].method == "baseline"
    assert metrics.runs[1].method == "launderlens"

    # LaunderLens should have higher F1 and lower FPR than baseline
    base_run = metrics.runs[0]
    ours_run = metrics.runs[1]
    assert ours_run.recall > base_run.recall
    assert ours_run.f1 > base_run.f1
    assert ours_run.fpr <= base_run.fpr

    # Check per-typology recall
    assert len(metrics.per_typology) == 5
    typo_names = [pt.typology for pt in metrics.per_typology]
    assert set(typo_names) == set(ALL_TYPOLOGIES)

    for pt in metrics.per_typology:
        assert isinstance(pt, PerTypologyRecall)
        assert pt.recall_baseline == 0.5   # caught 1 of 2
        assert pt.recall_ours == 1.0       # caught 2 of 2

