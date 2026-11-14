"""
LaunderLens – Phase 2 tests: database layer (SQLAlchemy 2.x).
Validates schema creation, CRUD operations, cascade rules, and Frozen API contract conformance.
"""
from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import (
    AlertAccountDB,
    AlertDB,
    AlertEdgeDB,
    Base,
    format_iso_utc,
    get_alert_detail,
    get_alert_graph,
    get_alerts,
    get_latest_metrics,
    init_db,
    parse_iso_utc,
    save_alert,
    save_metric_run,
    update_disposition,
)
from app.schemas import (
    AlertDetail,
    GraphEdge,
    GraphNode,
    GraphPayload,
    MethodMetrics,
    Metrics,
    PerTypologyRecall,
    ShapItem,
)


@pytest.fixture
def db_session():
    """Create an isolated in-memory SQLite database for testing the DB layer."""
    test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    init_db(test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_init_db_creates_tables(db_session):
    """Verify tables exist and can be queried."""
    alerts = db_session.query(AlertDB).all()
    assert alerts == []


def test_save_and_get_alert(db_session):
    """Verify inserting an AlertDetail + GraphPayload and querying it back."""
    detail = AlertDetail(
        alert_id="FO-TEST-01",
        typology="fan_out",
        risk_score=0.91,
        first_ts="2024-03-01T08:00:00Z",
        last_ts="2024-03-01T09:30:00Z",
        n_accounts=3,
        n_transactions=2,
        total_amount=100000.0,
        baseline_flagged=True,
        status="open",
        is_redteam=False,
        narrative="Test narrative fan out.",
        narrative_source="template",
        shap=[
            ShapItem(feature="out_degree", value=2.0, contribution=0.35),
            ShapItem(feature="total_amount", value=100000.0, contribution=0.25),
        ],
        evidence={"origin": "A-1"},
    )
    graph = GraphPayload(
        nodes=[
            GraphNode(id="A-1", role="entry", label="Source"),
            GraphNode(id="A-2", role="mule", label="Mule 1"),
            GraphNode(id="A-3", role="exit", label="Exit 1"),
        ],
        edges=[
            GraphEdge(id="e-1", source="A-1", target="A-2", amount=60000.0, ts="2024-03-01T08:00:00Z", hop_index=1),
            GraphEdge(id="e-2", source="A-2", target="A-3", amount=40000.0, ts="2024-03-01T09:00:00Z", hop_index=2),
        ],
    )

    save_alert(db_session, detail, graph)

    # 1. Test get_alerts summary
    summaries = get_alerts(db_session)
    assert len(summaries) == 1
    s = summaries[0]
    assert s.alert_id == "FO-TEST-01"
    assert s.typology == "fan_out"
    assert s.risk_score == 0.91
    assert s.first_ts.endswith("Z")
    assert s.last_ts.endswith("Z")

    # 2. Test get_alert_detail
    fetched_detail = get_alert_detail(db_session, "FO-TEST-01")
    assert fetched_detail is not None
    assert fetched_detail.narrative == "Test narrative fan out."
    assert len(fetched_detail.shap) == 2
    assert fetched_detail.shap[0].feature == "out_degree"
    assert fetched_detail.evidence["origin"] == "A-1"

    # 3. Test get_alert_graph
    fetched_graph = get_alert_graph(db_session, "FO-TEST-01")
    assert fetched_graph is not None
    assert len(fetched_graph.nodes) == 3
    assert len(fetched_graph.edges) == 2
    # Verify hop ordering
    assert fetched_graph.edges[0].hop_index <= fetched_graph.edges[1].hop_index
    assert fetched_graph.edges[0].ts.endswith("Z")


def test_get_alerts_filtering_and_sorting(db_session):
    """Verify typology, min_risk filters, and descending risk score sorting."""
    alerts_data = [
        ("A-01", "fan_out", 0.95),
        ("A-02", "cycle", 0.85),
        ("A-03", "fan_out", 0.70),
        ("A-04", "scatter_gather", 0.50),
    ]
    for aid, typ, score in alerts_data:
        d = AlertDetail(
            alert_id=aid,
            typology=typ,  # type: ignore
            risk_score=score,
            first_ts="2024-03-01T00:00:00Z",
            last_ts="2024-03-01T01:00:00Z",
            n_accounts=2,
            n_transactions=1,
            total_amount=5000.0,
            baseline_flagged=False,
            status="open",
            is_redteam=False,
            narrative="desc",
            narrative_source="template",
            shap=[],
            evidence={},
        )
        save_alert(db_session, d)

    # Risk desc order
    all_alerts = get_alerts(db_session)
    scores = [a.risk_score for a in all_alerts]
    assert scores == [0.95, 0.85, 0.70, 0.50]

    # Typology filter
    fo_alerts = get_alerts(db_session, typology="fan_out")
    assert len(fo_alerts) == 2
    assert all(a.typology == "fan_out" for a in fo_alerts)

    # min_risk filter
    high_risk = get_alerts(db_session, min_risk=0.80)
    assert len(high_risk) == 2
    assert all(a.risk_score >= 0.80 for a in high_risk)

    # Combined filter
    combined = get_alerts(db_session, typology="fan_out", min_risk=0.80)
    assert len(combined) == 1
    assert combined[0].alert_id == "A-01"


def test_update_disposition(db_session):
    """Verify changing status in DB."""
    d = AlertDetail(
        alert_id="DISP-01",
        typology="pass_through",
        risk_score=0.80,
        first_ts="2024-03-01T00:00:00Z",
        last_ts="2024-03-01T01:00:00Z",
        n_accounts=2,
        n_transactions=1,
        total_amount=5000.0,
        baseline_flagged=True,
        status="open",
        is_redteam=False,
        narrative="",
        narrative_source="template",
        shap=[],
        evidence={},
    )
    save_alert(db_session, d)

    updated = update_disposition(db_session, "DISP-01", "confirmed")
    assert updated is not None
    assert updated.status == "confirmed"

    # Verify persisted in detail
    refetched = get_alert_detail(db_session, "DISP-01")
    assert refetched is not None
    assert refetched.status == "confirmed"

    # Unknown alert returns None
    missing = update_disposition(db_session, "UNKNOWN", "dismissed")
    assert missing is None


def test_save_and_get_metrics(db_session):
    """Verify saving benchmark metrics and retrieving the latest run."""
    metrics_data = Metrics(
        runs=[
            MethodMetrics(
                method="baseline",
                alerts_count=10,
                true_positives=7,
                false_positives=3,
                precision=0.70,
                recall=0.65,
                f1=0.67,
                fpr=0.04,
            ),
            MethodMetrics(
                method="launderlens",
                alerts_count=12,
                true_positives=10,
                false_positives=2,
                precision=0.83,
                recall=0.85,
                f1=0.84,
                fpr=0.03,
            ),
        ],
        per_typology=[
            PerTypologyRecall(typology="fan_out", recall_baseline=0.7, recall_ours=0.9),
            PerTypologyRecall(typology="fan_in", recall_baseline=0.6, recall_ours=0.8),
            PerTypologyRecall(typology="scatter_gather", recall_baseline=0.5, recall_ours=0.75),
            PerTypologyRecall(typology="cycle", recall_baseline=0.6, recall_ours=0.8),
            PerTypologyRecall(typology="pass_through", recall_baseline=0.7, recall_ours=0.85),
        ],
    )

    save_metric_run(db_session, metrics_data, run_id="benchmark-v1")
    fetched = get_latest_metrics(db_session)
    assert fetched is not None
    assert len(fetched.runs) == 2
    assert len(fetched.per_typology) == 5
    ll_run = next(r for r in fetched.runs if r.method == "launderlens")
    assert ll_run.f1 == 0.84


def test_cascade_deletion(db_session):
    """Verify that deleting an alert removes its accounts and edges."""
    detail = AlertDetail(
        alert_id="CASCADE-01",
        typology="cycle",
        risk_score=0.9,
        first_ts="2024-03-01T00:00:00Z",
        last_ts="2024-03-01T01:00:00Z",
        n_accounts=2,
        n_transactions=1,
        total_amount=1000.0,
        baseline_flagged=True,
        status="open",
        is_redteam=False,
        narrative="",
        narrative_source="template",
        shap=[],
        evidence={},
    )
    graph = GraphPayload(
        nodes=[GraphNode(id="N1", role="entry", label="N1"), GraphNode(id="N2", role="exit", label="N2")],
        edges=[GraphEdge(id="E1", source="N1", target="N2", amount=1000.0, ts="2024-03-01T00:00:00Z", hop_index=1)],
    )
    row = save_alert(db_session, detail, graph)
    assert db_session.query(AlertAccountDB).filter_by(alert_id="CASCADE-01").count() == 2
    assert db_session.query(AlertEdgeDB).filter_by(alert_id="CASCADE-01").count() == 1

    db_session.delete(row)
    db_session.commit()

    assert db_session.query(AlertAccountDB).filter_by(alert_id="CASCADE-01").count() == 0
    assert db_session.query(AlertEdgeDB).filter_by(alert_id="CASCADE-01").count() == 0

