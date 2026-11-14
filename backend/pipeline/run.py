"""
LaunderLens – Unified Pipeline Runner.
Runs the complete precomputation pipeline:
1. Loads synthetic transactions Parquet (generates if missing).
2. Detects all 5 typologies: fan_out, fan_in, scatter_gather, cycle, pass_through.
3. Splits candidate clusters with zero ring leakage (GroupShuffleSplit).
4. Trains LightGBM model and SHAP TreeExplainer, saving model artifact.
5. Scores all clusters and computes top 5 SHAP feature contributions.
6. Runs rule-based baseline heuristics and calculates unified evaluation metrics.
7. Generates verified investigator narratives and structured evidence.
8. Persists all alerts, accounts, graph subgraphs, and metrics to Postgres/SQLite.
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.db import SessionLocal, engine, init_db, save_alert, save_metric_run
from app.schemas import AlertDetail, GraphPayload, ShapItem
from pipeline.baseline import (
    flag_baseline_accounts,
    flag_baseline_transactions,
    is_cluster_flagged_by_baseline,
)
from pipeline.config import (
    DATA_DIR,
    MODEL_PATH,
    SYNTHETIC_PARQUET,
)
from pipeline.detectors import CandidateCluster, detect_all_motifs
from pipeline.load import load_transactions
from pipeline.metrics import compute_benchmark_metrics
from pipeline.model import (
    save_pipeline_model,
    score_cluster,
    split_candidates_held_out,
    train_lightgbm_model,
)
from pipeline.narrative import generate_narrative
from pipeline.synthetic import generate_synthetic_dataset

TYPOLOGY_PREFIXES = {
    "fan_out": "FO",
    "fan_in": "FI",
    "scatter_gather": "SG",
    "cycle": "CY",
    "pass_through": "PT",
}


def run_pipeline(
    data_path: Path | str | None = None,
    save_to_db: bool = True,
    use_llm: bool = False,
) -> dict[str, Any]:
    """Execute the full end-to-end LaunderLens pipeline."""
    parquet_path = Path(data_path) if data_path else SYNTHETIC_PARQUET

    print("=" * 60)
    print(" LaunderLens – AML Graph Detection & Attribution Pipeline")
    print("=" * 60)

    # 1. Dataset verification / generation
    if not parquet_path.exists():
        print(f"[*] Synthetic dataset not found at {parquet_path}. Generating now...")
        parquet_path.parent.mkdir(parents=True, exist_ok=True)
        generate_synthetic_dataset(output_path=parquet_path, seed=42)

    print(f"[+] Loading transactions from {parquet_path}...")
    df = load_transactions(parquet_path)
    n_total = len(df)
    n_laundering = int(df["is_laundering"].sum())
    print(f"    Loaded {n_total:,} transactions ({n_laundering:,} laundering ground-truth).")

    # 2. Motif Detectors
    print("\n[+] Running graph motif detectors across all 5 typologies...")
    clusters = detect_all_motifs(df)
    print(f"    Discovered {len(clusters)} candidate clusters:")
    counts: dict[str, int] = {}
    for c in clusters:
        counts[c.typology] = counts.get(c.typology, 0) + 1
    for typo, cnt in counts.items():
        print(f"      - {typo}: {cnt} clusters")

    if not clusters:
        print("[!] No candidate clusters found. Exiting early.")
        return {}

    # 3. Held-out Ring Splitting
    print("\n[+] Splitting clusters into ring-isolated train/test sets...")
    train_set, test_set = split_candidates_held_out(clusters, test_size=0.30, random_state=42)
    print(f"    Train set: {len(train_set)} clusters | Test set: {len(test_set)} clusters.")

    # 4. Train LightGBM & SHAP
    print("\n[+] Training LightGBM classifier & SHAP TreeExplainer...")
    model, explainer = train_lightgbm_model(train_set, random_state=42)
    saved_model_path = save_pipeline_model(model, explainer, MODEL_PATH)
    print(f"    Model saved to {saved_model_path}")

    # 5. Baseline Evaluation
    print("\n[+] Evaluating rule-based AML baseline heuristics...")
    baseline_accounts = flag_baseline_accounts(df)
    baseline_txs = flag_baseline_transactions(df)
    print(f"    Baseline flagged {len(baseline_accounts)} accounts and {len(baseline_txs)} transactions.")

    # 6. Benchmark Metrics on Held-Out Test Set
    print("\n[+] Computing benchmark metrics on held-out test set...")
    test_baseline_flags = [
        is_cluster_flagged_by_baseline(c, baseline_accounts, baseline_txs)
        for c in test_set
    ]
    test_scores = [score_cluster(c, model, explainer)[0] for c in test_set]
    metrics = compute_benchmark_metrics(
        clusters=test_set,
        baseline_flags=test_baseline_flags,
        launderlens_scores=test_scores,
        risk_threshold=0.50,
    )

    base_metric = next(r for r in metrics.runs if r.method == "baseline")
    ours_metric = next(r for r in metrics.runs if r.method == "launderlens")
    print("    Benchmark Results:")
    print(f"      Baseline:    Precision={base_metric.precision:.3f}, Recall={base_metric.recall:.3f}, F1={base_metric.f1:.3f}, FPR={base_metric.fpr:.3f}")
    print(f"      LaunderLens: Precision={ours_metric.precision:.3f}, Recall={ours_metric.recall:.3f}, F1={ours_metric.f1:.3f}, FPR={ours_metric.fpr:.3f}")
    print("    Per-Typology Recall:")
    for pt in metrics.per_typology:
        print(f"      - {pt.typology:<15} Baseline: {pt.recall_baseline:.2f} | LaunderLens: {pt.recall_ours:.2f}")

    # 7. Score all clusters, generate narratives, and prepare DB alerts
    print("\n[+] Scoring all clusters and synthesizing verified narratives...")
    typo_counters: dict[str, int] = {}
    scored_alerts: list[tuple[AlertDetail, GraphPayload]] = []

    for cluster in clusters:
        risk_score, top_5_shap = score_cluster(cluster, model, explainer)
        baseline_flagged = is_cluster_flagged_by_baseline(cluster, baseline_accounts, baseline_txs)
        narrative, narrative_source, evidence = generate_narrative(cluster, use_llm=use_llm)

        typo = cluster.typology
        prefix = TYPOLOGY_PREFIXES.get(typo, "AL")
        typo_counters[typo] = typo_counters.get(typo, 0) + 1
        alert_id = f"{prefix}-{typo_counters[typo]:03d}"

        # Generate GraphPayload
        graph_payload = cluster.to_graph_payload()

        # Format timestamps to ISO 8601 UTC with trailing Z
        first_ts_iso = cluster.first_ts.isoformat()
        if not first_ts_iso.endswith("Z"):
            first_ts_iso += "Z"
        last_ts_iso = cluster.last_ts.isoformat()
        if not last_ts_iso.endswith("Z"):
            last_ts_iso += "Z"

        detail = AlertDetail(
            alert_id=alert_id,
            typology=cluster.typology,
            risk_score=risk_score,
            first_ts=first_ts_iso,
            last_ts=last_ts_iso,
            n_accounts=cluster.n_accounts,
            n_transactions=cluster.n_transactions,
            total_amount=round(cluster.total_amount, 2),
            baseline_flagged=baseline_flagged,
            status="open",
            is_redteam=False,
            narrative=narrative,
            narrative_source=narrative_source,
            shap=top_5_shap,
            evidence=evidence,
        )
        scored_alerts.append((detail, graph_payload))

    # Sort alerts by risk score descending
    scored_alerts.sort(key=lambda item: item[0].risk_score, reverse=True)

    # 8. Persist to Database
    if save_to_db:
        print("\n[+] Persisting alerts and benchmark metrics to database...")
        init_db(engine)
        db = SessionLocal()
        try:
            for detail, graph in scored_alerts:
                save_alert(db, detail, graph)
            save_metric_run(db, metrics, run_id="benchmark-latest")
            print(f"    Saved {len(scored_alerts)} alerts and benchmark metrics to DB.")
        finally:
            db.close()

    print("\n" + "=" * 60)
    print(" LaunderLens Pipeline Complete!")
    print(f" Total Alerts: {len(scored_alerts)} | Highest Risk Alert: {scored_alerts[0][0].alert_id} (Score: {scored_alerts[0][0].risk_score:.2f})")
    print("=" * 60)

    return {
        "n_clusters": len(clusters),
        "alerts_count": len(scored_alerts),
        "metrics": metrics,
        "top_alert": scored_alerts[0][0].alert_id if scored_alerts else None,
    }


if __name__ == "__main__":
    use_llm_flag = os.getenv("USE_LLM", "false").lower() in ("true", "1")
    run_pipeline(use_llm=use_llm_flag)
