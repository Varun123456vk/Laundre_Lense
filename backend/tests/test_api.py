"""
LaunderLens – Phase 1 tests: schema validation for all mock API routes.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import (
    AlertDetail,
    AlertSummary,
    GraphPayload,
    Metrics,
    RedTeamResult,
)

client = TestClient(app)


# ── /health ───────────────────────────────────

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ── GET /alerts ───────────────────────────────

def test_list_alerts_returns_list():
    r = client.get("/alerts")
    assert r.status_code == 200
    alerts = r.json()
    assert isinstance(alerts, list)
    assert len(alerts) >= 18
    # Validate each item against schema
    for item in alerts:
        AlertSummary(**item)


def test_list_alerts_sorted_by_risk_desc():
    r = client.get("/alerts")
    alerts = r.json()
    scores = [a["risk_score"] for a in alerts]
    assert scores == sorted(scores, reverse=True)


def test_list_alerts_filter_typology():
    r = client.get("/alerts?typology=fan_out")
    assert r.status_code == 200
    alerts = r.json()
    assert len(alerts) >= 1
    for a in alerts:
        assert a["typology"] == "fan_out"


def test_list_alerts_filter_min_risk():
    r = client.get("/alerts?min_risk=0.85")
    assert r.status_code == 200
    alerts = r.json()
    for a in alerts:
        assert a["risk_score"] >= 0.85


def test_list_alerts_filter_combined():
    r = client.get("/alerts?typology=cycle&min_risk=0.8")
    assert r.status_code == 200
    alerts = r.json()
    for a in alerts:
        assert a["typology"] == "cycle"
        assert a["risk_score"] >= 0.8


def test_list_alerts_has_baseline_false():
    """At least 3 alerts should have baseline_flagged=False."""
    r = client.get("/alerts")
    alerts = r.json()
    unflagged = [a for a in alerts if not a["baseline_flagged"]]
    assert len(unflagged) >= 3


# ── GET /alerts/{id} ─────────────────────────

def test_get_alert_detail():
    r = client.get("/alerts/FO-001")
    assert r.status_code == 200
    detail = AlertDetail(**r.json())
    assert detail.alert_id == "FO-001"
    assert detail.narrative != ""
    assert len(detail.shap) >= 1


def test_get_alert_detail_404():
    r = client.get("/alerts/NONEXISTENT")
    assert r.status_code == 404


def test_get_alert_detail_all_five():
    """All 5 detailed alerts should have full narratives and SHAP."""
    for aid in ["FO-001", "FI-001", "SG-001", "CY-001", "PT-001"]:
        r = client.get(f"/alerts/{aid}")
        assert r.status_code == 200
        detail = AlertDetail(**r.json())
        assert len(detail.shap) == 5
        assert detail.narrative_source in ("llm", "template")


# ── GET /alerts/{id}/graph ───────────────────

def test_get_alert_graph():
    r = client.get("/alerts/FO-001/graph")
    assert r.status_code == 200
    graph = GraphPayload(**r.json())
    assert len(graph.nodes) >= 6
    assert len(graph.edges) >= 1


def test_get_alert_graph_404():
    r = client.get("/alerts/NONEXISTENT/graph")
    assert r.status_code == 404


def test_graph_hop_index_ordering():
    """Edges with lower hop_index should generally have earlier timestamps."""
    for aid in ["FO-001", "FI-001", "SG-001", "CY-001", "PT-001"]:
        r = client.get(f"/alerts/{aid}/graph")
        graph = GraphPayload(**r.json())
        edges = sorted(graph.edges, key=lambda e: (e.hop_index, e.ts))
        # Check that min timestamp at hop N <= min timestamp at hop N+1
        hops: dict[int, list[str]] = {}
        for e in edges:
            hops.setdefault(e.hop_index, []).append(e.ts)
        hop_indices = sorted(hops.keys())
        for i in range(len(hop_indices) - 1):
            min_ts_curr = min(hops[hop_indices[i]])
            min_ts_next = min(hops[hop_indices[i + 1]])
            assert min_ts_curr <= min_ts_next, (
                f"Alert {aid}: hop {hop_indices[i]} min_ts={min_ts_curr} "
                f"> hop {hop_indices[i+1]} min_ts={min_ts_next}"
            )


# ── POST /alerts/{id}/disposition ────────────

def test_disposition_update():
    r = client.post("/alerts/FO-001/disposition", json={"status": "confirmed"})
    assert r.status_code == 200
    updated = AlertSummary(**r.json())
    assert updated.status == "confirmed"
    # Verify it persists in the list
    r2 = client.get("/alerts/FO-001")
    assert r2.json()["status"] == "confirmed"
    # Reset
    client.post("/alerts/FO-001/disposition", json={"status": "open"})


def test_disposition_404():
    r = client.post("/alerts/NONEXISTENT/disposition", json={"status": "dismissed"})
    assert r.status_code == 404


# ── GET /metrics ──────────────────────────────

def test_metrics():
    r = client.get("/metrics")
    assert r.status_code == 200
    m = Metrics(**r.json())
    assert len(m.runs) == 2
    methods = {run.method for run in m.runs}
    assert methods == {"baseline", "launderlens"}
    assert len(m.per_typology) == 5
    # LaunderLens should beat baseline (modestly)
    ll = next(run for run in m.runs if run.method == "launderlens")
    bl = next(run for run in m.runs if run.method == "baseline")
    assert ll.f1 > bl.f1


# ── POST /redteam/inject ─────────────────────

def test_redteam_inject():
    r = client.post("/redteam/inject", json={"seed": 42})
    assert r.status_code == 200
    result = RedTeamResult(**r.json())
    assert result.alert.is_redteam is True
    assert result.baseline_flagged is False
    assert result.latency_ms >= 0
    # It should now appear in alerts list
    r2 = client.get("/alerts")
    ids = [a["alert_id"] for a in r2.json()]
    assert "RT-001" in ids
    # Clean up
    client.delete("/redteam")


# ── DELETE /redteam ───────────────────────────

def test_redteam_delete():
    # Inject first
    client.post("/redteam/inject", json={})
    r = client.delete("/redteam")
    assert r.status_code == 200
    assert r.json()["removed"] is True
    # Should be gone from alerts
    r2 = client.get("/alerts")
    ids = [a["alert_id"] for a in r2.json()]
    assert "RT-001" not in ids


def test_redteam_delete_when_none():
    r = client.delete("/redteam")
    assert r.status_code == 200
    assert r.json()["removed"] is False


# ── All typologies covered ────────────────────

def test_all_typologies_present():
    r = client.get("/alerts")
    typologies = {a["typology"] for a in r.json()}
    assert typologies == {"fan_out", "fan_in", "scatter_gather", "cycle", "pass_through"}

