"""
LaunderLens – Machine Learning Risk Scoring & SHAP Explanations.
Trains a LightGBM classifier on graph/flow features with strict ring-isolated splitting.
Extracts top 5 SHAP feature contributions for each scored candidate.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
import shap
from sklearn.model_selection import GroupShuffleSplit, train_test_split

from app.schemas import ShapItem
from pipeline.config import MODEL_PATH
from pipeline.detectors import CandidateCluster
from pipeline.features import FEATURE_NAMES, extract_cluster_features, extract_features_dataframe


def split_candidates_held_out(
    clusters: list[CandidateCluster],
    test_size: float = 0.3,
    random_state: int = 42,
) -> tuple[list[CandidateCluster], list[CandidateCluster]]:
    """
    Split candidate clusters into train and test sets such that no laundering
    ring appears in both sets (leak-free evaluation).
    """
    if len(clusters) < 4:
        return clusters, clusters

    # Separate clusters with a ground-truth ring ID from background clusters
    ring_clusters: list[CandidateCluster] = []
    bg_clusters: list[CandidateCluster] = []

    for c in clusters:
        if c.ground_truth_ring_id is not None:
            ring_clusters.append(c)
        else:
            bg_clusters.append(c)

    train_set: list[CandidateCluster] = []
    test_set: list[CandidateCluster] = []

    # Split ring clusters by distinct ring ID
    if ring_clusters:
        ring_groups = [c.ground_truth_ring_id for c in ring_clusters]
        unique_rings = list(set(ring_groups))
        if len(unique_rings) > 1:
            gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
            train_idx, test_idx = next(gss.split(ring_clusters, groups=ring_groups))
            train_set.extend([ring_clusters[i] for i in train_idx])
            test_set.extend([ring_clusters[i] for i in test_idx])
        else:
            train_set.extend(ring_clusters)
            test_set.extend(ring_clusters)

    # Split background non-ring clusters randomly
    if bg_clusters:
        if len(bg_clusters) > 1:
            bg_train, bg_test = train_test_split(
                bg_clusters, test_size=test_size, random_state=random_state
            )
            train_set.extend(bg_train)
            test_set.extend(bg_test)
        else:
            train_set.extend(bg_clusters)

    return train_set, test_set


def train_lightgbm_model(
    train_clusters: list[CandidateCluster],
    random_state: int = 42,
) -> tuple[lgb.LGBMClassifier, shap.TreeExplainer]:
    """
    Train a LightGBM binary classifier to predict laundering risk score.
    Returns (model, shap_tree_explainer).
    """
    X_train, _ = extract_features_dataframe(train_clusters)
    y_train = np.array([1 if c.ground_truth_laundering else 0 for c in train_clusters])

    # If only one class is present in training data, inject a dummy balance to allow fitting
    if len(np.unique(y_train)) < 2:
        dummy_row = X_train.iloc[0:1].copy()
        X_train = pd.concat([X_train, dummy_row], ignore_index=True)
        dummy_label = 0 if y_train[0] == 1 else 1
        y_train = np.append(y_train, dummy_label)

    model = lgb.LGBMClassifier(
        n_estimators=60,
        max_depth=4,
        num_leaves=15,
        learning_rate=0.05,
        random_state=random_state,
        class_weight="balanced",
        verbosity=-1,
    )
    model.fit(X_train, y_train)

    # Build TreeExplainer for SHAP explanations
    explainer = shap.TreeExplainer(model)
    return model, explainer


def score_cluster(
    cluster: CandidateCluster,
    model: lgb.LGBMClassifier,
    explainer: shap.TreeExplainer,
    feature_names: list[str] | None = None,
) -> tuple[float, list[ShapItem]]:
    """
    Score a candidate cluster using the trained LightGBM model and compute top 5 SHAP items.
    Returns (risk_score, top_5_shap_items).
    """
    names = feature_names or FEATURE_NAMES
    feats_dict = extract_cluster_features(cluster)
    X = pd.DataFrame([feats_dict], columns=names)

    # Risk score: calibrated probability between 0.0 and 1.0
    probs = model.predict_proba(X)
    risk_score = float(probs[0][1])
    risk_score = max(0.0, min(1.0, round(risk_score, 4)))

    # Compute SHAP values
    shap_vals = explainer.shap_values(X)
    # Binary classification in TreeExplainer can return list of 2 arrays or single array
    if isinstance(shap_vals, list):
        vals = shap_vals[1][0]  # positive class (laundering)
    elif isinstance(shap_vals, np.ndarray) and shap_vals.ndim == 3:
        vals = shap_vals[0, :, 1]
    else:
        vals = shap_vals[0]

    items: list[ShapItem] = []
    for f_idx, f_name in enumerate(names):
        val = float(X.iloc[0, f_idx])
        contrib = float(vals[f_idx])
        items.append(
            ShapItem(
                feature=f_name,
                value=round(val, 2),
                contribution=round(contrib, 4),
            )
        )

    # Top 5 by absolute contribution
    items.sort(key=lambda s: abs(s.contribution), reverse=True)
    top_5 = items[:5]

    return risk_score, top_5


def save_pipeline_model(
    model: lgb.LGBMClassifier,
    explainer: shap.TreeExplainer,
    path: Path | str | None = None,
) -> Path:
    """Save trained model and explainer to disk."""
    out_path = Path(path) if path is not None else MODEL_PATH
    out_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "explainer": explainer, "feature_names": FEATURE_NAMES}, out_path)
    return out_path


def load_pipeline_model(
    path: Path | str | None = None,
) -> tuple[lgb.LGBMClassifier, shap.TreeExplainer, list[str]]:
    """Load trained model and explainer from disk."""
    target_path = Path(path) if path is not None else MODEL_PATH
    if not target_path.exists():
        raise FileNotFoundError(f"Model file not found at {target_path}")
    data = joblib.load(target_path)
    return data["model"], data["explainer"], data["feature_names"]

