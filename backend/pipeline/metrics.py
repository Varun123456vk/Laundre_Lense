"""
LaunderLens – Evaluation Metrics & Benchmark Comparison Engine.
Computes unified performance metrics (Precision, Recall, F1, FP, FPR)
for both the rule-based baseline and LaunderLens on the same test set.
Computes per-typology recall breakdowns for all 5 frozen typologies:
fan_out, fan_in, scatter_gather, cycle, pass_through.
"""
from __future__ import annotations

from typing import Sequence

from app.schemas import MethodMetrics, Metrics, PerTypologyRecall, Typology
from pipeline.detectors import CandidateCluster

ALL_TYPOLOGIES: list[Typology] = [
    "fan_out",
    "fan_in",
    "scatter_gather",
    "cycle",
    "pass_through",
]


def calculate_method_metrics(
    method_name: str,
    y_true: Sequence[bool],
    y_pred: Sequence[bool],
) -> MethodMetrics:
    """
    Compute classification metrics: alerts_count, TP, FP, Precision, Recall, F1, FPR.
    Safely handles edge cases with zero division.
    """
    alerts_count = sum(1 for p in y_pred if p)
    tp = sum(1 for t, p in zip(y_true, y_pred) if t and p)
    fp = sum(1 for t, p in zip(y_true, y_pred) if not t and p)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t and not p)
    tn = sum(1 for t, p in zip(y_true, y_pred) if not t and not p)

    precision = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1 = (2.0 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    fpr = (fp / (fp + tn)) if (fp + tn) > 0 else 0.0

    return MethodMetrics(
        method=method_name,  # type: ignore[arg-type]
        alerts_count=alerts_count,
        true_positives=tp,
        false_positives=fp,
        precision=round(precision, 3),
        recall=round(recall, 3),
        f1=round(f1, 3),
        fpr=round(fpr, 3),
    )


def compute_benchmark_metrics(
    clusters: list[CandidateCluster],
    baseline_flags: list[bool],
    launderlens_scores: list[float],
    risk_threshold: float = 0.50,
) -> Metrics:
    """
    Evaluate baseline vs LaunderLens across candidate clusters and return a Metrics object.
    
    Args:
        clusters: List of evaluated CandidateCluster objects.
        baseline_flags: Parallel boolean list indicating whether each cluster was flagged by baseline rules.
        launderlens_scores: Parallel float list of LightGBM risk scores in [0.0, 1.0].
        risk_threshold: Threshold above which LaunderLens triggers an alert (default 0.50).
    """
    if len(clusters) != len(baseline_flags) or len(clusters) != len(launderlens_scores):
        raise ValueError("clusters, baseline_flags, and launderlens_scores must have identical lengths.")

    y_true = [c.ground_truth_laundering for c in clusters]
    y_baseline = baseline_flags
    y_ours = [s >= risk_threshold for s in launderlens_scores]

    # Overall method metrics
    baseline_metrics = calculate_method_metrics("baseline", y_true, y_baseline)
    launderlens_metrics = calculate_method_metrics("launderlens", y_true, y_ours)

    # Per-typology recall breakdown
    per_typology: list[PerTypologyRecall] = []
    for typo in ALL_TYPOLOGIES:
        typo_indices = [i for i, c in enumerate(clusters) if c.typology == typo and c.ground_truth_laundering]
        n_pos = len(typo_indices)
        if n_pos == 0:
            rec_base = 0.0
            rec_ours = 0.0
        else:
            tp_base = sum(1 for i in typo_indices if y_baseline[i])
            tp_ours = sum(1 for i in typo_indices if y_ours[i])
            rec_base = round(tp_base / n_pos, 3)
            rec_ours = round(tp_ours / n_pos, 3)

        per_typology.append(
            PerTypologyRecall(
                typology=typo,
                recall_baseline=rec_base,
                recall_ours=rec_ours,
            )
        )

    return Metrics(
        runs=[baseline_metrics, launderlens_metrics],
        per_typology=per_typology,
    )

