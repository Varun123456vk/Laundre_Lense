"""
Tests for Phase 10: Dynamic Red-Team Structuring Injection & Attribution Engine.
Verifies:
1. Real-time deterministic generation of sub-threshold structuring attacks.
2. In-memory execution latency is strictly under 5,000 ms.
3. Baseline misses the alert (baseline_flagged=False, all transfers < $10k).
4. LaunderLens flags it with high risk score (>= 0.85) and top SHAP features highlighting sub_threshold_ratio.
5. Injection and cleanup lifecycle via FastAPI endpoints.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.redteam import (
    execute_redteam_injection,
    generate_structuring_graph_and_cluster,
    remove_redteam_alert,
)
from app.schemas import AlertDetail, GraphPayload, RedTeamResult, ShapItem

client = TestClient(app)


def test_structuring_ring_all_transfers_sub_threshold():
    """Verify that every single transfer in the structuring ring is strictly under $10,000."""
    cluster, graph = generate_structuring_graph_and_cluster(seed=42)

    assert cluster.typology == "scatter_gather"
    assert cluster.n_transactions == 18
    assert cluster.n_accounts == 10

    # Ensure zero transfers trigger the $10,000 threshold
    for edge in cluster.edge_records:
        amt = float(edge["amount"])
        assert amt < 10_000.0
        assert amt >= 4_000.0

    # Verify graph payload matches
    assert len(graph.nodes) == 10
    assert len(graph.edges) == 18

    # Hop indices: scatter = 1, gather = 2
    scatter_hops = [e.hop_index for e in graph.edges if e.source == "A-RT-001"]
    gather_hops = [e.hop_index for e in graph.edges if e.target == "A-RT-010"]
    assert all(h == 1 for h in scatter_hops)
    assert all(h == 2 for h in gather_hops)


def test_execute_redteam_injection_latency_and_scoring():
    """Verify dynamic injection executes in < 5 seconds and returns high risk score and SHAP."""
    result = execute_redteam_injection(seed=42)

    assert isinstance(result, RedTeamResult)
    assert result.latency_ms < 5000  # Strictest requirement: < 5s
    assert result.baseline_flagged is False
    assert result.alert.alert_id == "RT-001"
    assert result.alert.is_redteam is True
    assert result.alert.risk_score >= 0.85
    assert len(result.alert.shap) == 5

    # sub_threshold_ratio should be prominently identified in SHAP features
    sub_thresh_item = next(
        (s for s in result.alert.shap if s.feature == "sub_threshold_ratio"),
        None,
    )
    assert sub_thresh_item is not None
    assert sub_thresh_item.value == 1.0

    # Clean up
    remove_redteam_alert()


def test_redteam_api_endpoint_lifecycle():
    """Verify POST /redteam/inject and DELETE /redteam endpoints via FastAPI."""
    # 1. Inject red-team alert
    r_post = client.post("/redteam/inject", json={"seed": 42})
    assert r_post.status_code == 200
    res = RedTeamResult(**r_post.json())
    assert res.alert.is_redteam is True
    assert res.baseline_flagged is False
    assert res.latency_ms >= 0

    # 2. Check alert list includes RT-001
    r_list = client.get("/alerts")
    assert r_post.status_code == 200
    ids = [a["alert_id"] for a in r_list.json()]
    assert "RT-001" in ids

    # 3. Check alert detail
    r_detail = client.get("/alerts/RT-001")
    assert r_detail.status_code == 200
    detail = AlertDetail(**r_detail.json())
    assert detail.alert_id == "RT-001"
    assert detail.is_redteam is True
    assert "structuring ring" in detail.narrative.lower()

    # 4. Check alert graph
    r_graph = client.get("/alerts/RT-001/graph")
    assert r_graph.status_code == 200
    graph = GraphPayload(**r_graph.json())
    assert len(graph.nodes) == 10
    assert len(graph.edges) == 18

    # 5. Delete red-team alert
    r_del = client.delete("/redteam")
    assert r_del.status_code == 200
    assert r_del.json()["removed"] is True

    # 6. Verify RT-001 is gone
    r_list_after = client.get("/alerts")
    ids_after = [a["alert_id"] for a in r_list_after.json()]
    assert "RT-001" not in ids_after

    # 7. Second delete returns removed=False
    r_del2 = client.delete("/redteam")
    assert r_del2.status_code == 200
    assert r_del2.json()["removed"] is False

