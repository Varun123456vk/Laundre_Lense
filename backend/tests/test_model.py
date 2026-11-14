"""
Tests for Phase 6: Machine Learning Risk Scoring & SHAP Explanations.
Verifies:
1. Feature extraction does NOT leak ground-truth labels (is_laundering).
2. Held-out ring splitting prevents data leakage across train and test sets.
3. LightGBM training produces a valid classifier and TreeExplainer.
4. Cluster scoring outputs calibrated risk score in [0.0, 1.0] and top 5 ShapItem instances.
5. Model persistence (save/load) functions correctly.
"""
from datetime import datetime, timezone
from pathlib import Path
import pytest
import numpy as np

from app.schemas import ShapItem
from pipeline.detectors import CandidateCluster
from pipeline.features import FEATURE_NAMES, extract_cluster_features, extract_features_dataframe
from pipeline.model import (
    split_candidates_held_out,
    train_lightgbm_model,
    score_cluster,
    save_pipeline_model,
    load_pipeline_model,
)


def _make_dummy_cluster(
    cluster_id: str,
    typology: str,
    amount: float,
    is_laundering: bool,
    ring_id: str | None = None,
    n_accounts: int = 4,
    n_transactions: int = 5,
) -> CandidateCluster:
    now = datetime(2026, 11, 14, 12, 0, 0, tzinfo=timezone.utc)
    accounts = [f"ACC_{cluster_id}_{i}" for i in range(n_accounts)]
    roles = {acc: ("hub" if i == 0 else "mule") for i, acc in enumerate(accounts)}
    labels = {acc: acc for acc in accounts}
    edges = [
        {
            "id": f"tx_{cluster_id}_{i}",
            "source": accounts[0],
            "target": accounts[min(i + 1, n_accounts - 1)],
            "amount": amount / n_transactions,
            "ts": now.isoformat(),
        }
        for i in range(n_transactions)
    ]
    return CandidateCluster(
        candidate_id=cluster_id,
        typology=typology,  # type: ignore[arg-type]
        entry_account=accounts[0],
        node_roles=roles,  # type: ignore[arg-type]
        node_labels=labels,
        edge_records=edges,
        total_amount=amount,
        first_ts=now,
        last_ts=datetime(2026, 11, 14, 13, 0, 0, tzinfo=timezone.utc),
        n_accounts=n_accounts,
        n_transactions=n_transactions,
        ground_truth_laundering=is_laundering,
        ground_truth_ring_id=ring_id,
    )


def test_feature_extraction_no_label_leak():
    """Verify that features never contain the is_laundering label."""
    assert "is_laundering" not in FEATURE_NAMES
    assert "ground_truth" not in "".join(FEATURE_NAMES)

    cluster = _make_dummy_cluster("c1", "fan_out", 50000.0, is_laundering=True, ring_id="ring_1")
    feats = extract_cluster_features(cluster)

    assert len(feats) == len(FEATURE_NAMES)
    for name in FEATURE_NAMES:
        assert name in feats
        assert isinstance(feats[name], (int, float))

    assert "is_laundering" not in feats
    assert "ground_truth_laundering" not in feats
    assert "ring_id" not in feats


def test_split_candidates_held_out_no_ring_leak():
    """Verify GroupShuffleSplit prevents any laundering ring from appearing in both train and test sets."""
    clusters = []
    # 4 distinct laundering rings with 3 clusters each
    for ring_idx in range(1, 5):
        ring_id = f"ring_{ring_idx}"
        for c_idx in range(3):
            clusters.append(
                _make_dummy_cluster(
                    f"c_{ring_id}_{c_idx}",
                    "cycle",
                    80000.0,
                    is_laundering=True,
                    ring_id=ring_id,
                )
            )

    # 10 background clusters
    for bg_idx in range(10):
        clusters.append(
            _make_dummy_cluster(
                f"bg_{bg_idx}",
                "pass_through",
                5000.0,
                is_laundering=False,
                ring_id=None,
            )
        )

    train_set, test_set = split_candidates_held_out(clusters, test_size=0.25, random_state=42)

    assert len(train_set) > 0
    assert len(test_set) > 0
    assert len(train_set) + len(test_set) == len(clusters)

    train_rings = {c.ground_truth_ring_id for c in train_set if c.ground_truth_ring_id is not None}
    test_rings = {c.ground_truth_ring_id for c in test_set if c.ground_truth_ring_id is not None}

    # CRITICAL: Intersection must be completely empty
    intersection = train_rings.intersection(test_rings)
    assert len(intersection) == 0, f"Ring leakage detected: {intersection}"


def test_train_and_score_cluster():
    """Verify LightGBM model training and SHAP scoring output format."""
    # Build a small balanced set of clusters
    train_clusters = []
    for i in range(8):
        train_clusters.append(
            _make_dummy_cluster(
                f"pos_{i}",
                "scatter_gather",
                120000.0,
                is_laundering=True,
                ring_id=f"ring_{i}",
                n_transactions=10,
            )
        )
        train_clusters.append(
            _make_dummy_cluster(
                f"neg_{i}",
                "fan_in",
                3000.0,
                is_laundering=False,
                ring_id=None,
                n_transactions=2,
            )
        )

    model, explainer = train_lightgbm_model(train_clusters, random_state=42)

    test_cluster = _make_dummy_cluster(
        "test_eval",
        "scatter_gather",
        95000.0,
        is_laundering=True,
        ring_id="ring_eval",
        n_transactions=8,
    )

    risk_score, shap_items = score_cluster(test_cluster, model, explainer)

    # Risk score must be a probability between 0.0 and 1.0
    assert isinstance(risk_score, float)
    assert 0.0 <= risk_score <= 1.0

    # Exactly 5 SHAP items
    assert len(shap_items) == 5
    for item in shap_items:
        assert isinstance(item, ShapItem)
        assert item.feature in FEATURE_NAMES
        assert isinstance(item.value, float)
        assert isinstance(item.contribution, float)

    # Top items must be sorted descending by absolute contribution
    abs_contribs = [abs(item.contribution) for item in shap_items]
    assert abs_contribs == sorted(abs_contribs, reverse=True)


def test_save_and_load_model(tmp_path: Path):
    """Verify model and explainer serialization and deserialization."""
    clusters = [
        _make_dummy_cluster("c_pos", "cycle", 50000.0, True, "ring_1"),
        _make_dummy_cluster("c_neg", "fan_out", 1000.0, False, None),
    ]
    model, explainer = train_lightgbm_model(clusters, random_state=42)

    model_file = tmp_path / "test_model.joblib"
    save_pipeline_model(model, explainer, path=model_file)
    assert model_file.exists()

    loaded_model, loaded_explainer, feat_names = load_pipeline_model(path=model_file)
    assert feat_names == FEATURE_NAMES

    score, shap_items = score_cluster(clusters[0], loaded_model, loaded_explainer)
    assert 0.0 <= score <= 1.0
    assert len(shap_items) == 5
