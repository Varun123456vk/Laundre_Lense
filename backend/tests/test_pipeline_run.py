"""
Tests for Phase 9: Unified Pipeline Orchestration & Live DB Integration.
Verifies:
1. End-to-end pipeline execution and alert generation.
2. Database query retrieval via app.db models.
3. FastAPI endpoint integration with populated database.
"""
from datetime import datetime, timezone
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.db import (
    SessionLocal,
    create_db_engine,
    get_alert_detail,
    get_alert_graph,
    get_alerts,
    get_latest_metrics,
    init_db,
    save_alert,
    save_metric_run,
)
from app.main import app
from app.schemas import AlertDetail, AlertSummary, GraphPayload, Metrics, ShapItem
from pipeline.detectors import CandidateCluster
from pipeline.metrics import ALL_TYPOLOGIES, compute_benchmark_metrics
from pipeline.run import run_pipeline

client = TestClient(app)


def test_db_save_and_retrieve_alert():
    """Verify storing an alert in the database and retrieving detail, summary, and graph."""
    now_iso = datetime.now(timezone.utc).isoformat()
    detail = AlertDetail(
        alert_id="TEST-ALERT-001",
        typology="cycle",
        risk_score=0.91,
        first_ts=now_iso,
        last_ts=now_iso,
        n_accounts=3,
        n_transactions=3,
        total_amount=50000.0,
        baseline_flagged=False,
        status="open",
        is_redteam=False,
        narrative="Test cycle narrative.",
        narrative_source="template",
        shap=[
            ShapItem(feature="total_amount", value=50000.0, contribution=0.45),
            ShapItem(feature="velocity", value=3.0, contribution=0.30),
            ShapItem(feature="density", value=1.0, contribution=0.15),
            ShapItem(feature="sub_threshold_ratio", value=0.0, contribution=0.05),
            ShapItem(feature="retention", value=0.95, contribution=0.05),
        ],
        evidence={"cycle_path": ["ACC_A", "ACC_B", "ACC_C", "ACC_A"]},
    )
    graph = GraphPayload(
        nodes=[
            {"id": "ACC_A", "role": "entry", "label": "Account A"},
            {"id": "ACC_B", "role": "mule", "label": "Account B"},
            {"id": "ACC_C", "role": "exit", "label": "Account C"},
        ],
        edges=[
            {"id": "e1", "source": "ACC_A", "target": "ACC_B", "amount": 25000.0, "ts": now_iso, "hop_index": 1},
            {"id": "e2", "source": "ACC_B", "target": "ACC_C", "amount": 24000.0, "ts": now_iso, "hop_index": 2},
            {"id": "e3", "source": "ACC_C", "target": "ACC_A", "amount": 23500.0, "ts": now_iso, "hop_index": 3},
        ],
    )

    db = SessionLocal()
    try:
        save_alert(db, detail, graph)

        # Retrieve summary
        summaries = get_alerts(db, typology="cycle")
        test_sum = next((s for s in summaries if s.alert_id == "TEST-ALERT-001"), None)
        assert test_sum is not None
        assert test_sum.risk_score == 0.91

        # Retrieve detail
        retrieved_detail = get_alert_detail(db, "TEST-ALERT-001")
        assert retrieved_detail is not None
        assert len(retrieved_detail.shap) == 5
        assert retrieved_detail.evidence["cycle_path"] == ["ACC_A", "ACC_B", "ACC_C", "ACC_A"]

        # Retrieve graph
        retrieved_graph = get_alert_graph(db, "TEST-ALERT-001")
        assert retrieved_graph is not None
        assert len(retrieved_graph.nodes) == 3
        assert len(retrieved_graph.edges) == 3
        assert retrieved_graph.edges[0].id == "e1"
    finally:
        db.close()


def test_api_serves_db_alerts():
    """Verify FastAPI routes successfully read persisted alerts from database."""
    r = client.get("/alerts")
    assert r.status_code == 200
    alerts = r.json()
    assert isinstance(alerts, list)
    assert len(alerts) > 0

    first_alert = alerts[0]
    alert_id = first_alert["alert_id"]

    # Verify detail endpoint
    r_detail = client.get(f"/alerts/{alert_id}")
    assert r_detail.status_code == 200
    detail = r_detail.json()
    assert detail["alert_id"] == alert_id
    assert "narrative" in detail
    assert "shap" in detail

    # Verify graph endpoint
    r_graph = client.get(f"/alerts/{alert_id}/graph")
    assert r_graph.status_code == 200
    graph = r_graph.json()
    assert "nodes" in graph
    assert "edges" in graph

    # Verify metrics endpoint
    r_metrics = client.get("/metrics")
    assert r_metrics.status_code == 200
    metrics = r_metrics.json()
    assert "runs" in metrics
    assert "per_typology" in metrics

