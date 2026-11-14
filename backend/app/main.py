"""
LaunderLens – FastAPI application.
Serves alerts, subgraphs, disposition updates, benchmark metrics, and red-team injections.
Reads from Postgres / SQLite database with automatic fallback to mock data when DB is empty.
"""
from __future__ import annotations

import os
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.db import (
    get_alert_detail as db_get_alert_detail,
    get_alert_graph as db_get_alert_graph,
    get_alerts as db_get_alerts,
    get_db,
    get_latest_metrics as db_get_latest_metrics,
    init_db,
    save_alert,
    update_disposition as db_update_disposition,
)
from app.mock_data import (
    get_alert_detail as mock_get_alert_detail,
    get_alert_graph as mock_get_alert_graph,
    get_alert_summaries as mock_get_alert_summaries,
    get_metrics as mock_get_metrics,
    update_disposition as mock_update_disposition,
)
from app.redteam import (
    execute_redteam_injection,
    get_active_redteam_alert,
    get_active_redteam_graph,
    remove_redteam_alert,
)
from app.schemas import (
    AlertDetail,
    AlertSummary,
    DispositionRequest,
    GraphPayload,
    Metrics,
    RedTeamResult,
)

app = FastAPI(title="LaunderLens", version="0.1.0")

# ── CORS ──────────────────────────────────────
_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8443,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:8443",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    """Ensure database schema is initialized on startup."""
    init_db()


# ── Health ────────────────────────────────────
@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# ── Alerts ────────────────────────────────────
@app.get("/alerts", response_model=list[AlertSummary])
def list_alerts(
    typology: Optional[str] = Query(None),
    min_risk: Optional[float] = Query(None, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
) -> list[AlertSummary]:
    rt_alert = get_active_redteam_alert()
    alerts: list[AlertSummary] = []

    try:
        db_alerts = db_get_alerts(db, typology=typology, min_risk=min_risk)
        if db_alerts:
            alerts.extend(db_alerts)
    except Exception:
        pass

    if rt_alert and not any(a.alert_id == rt_alert.alert_id for a in alerts):
        alerts.insert(0, rt_alert)

    return alerts


@app.get("/alerts/{alert_id}", response_model=AlertDetail)
def get_alert(alert_id: str, db: Session = Depends(get_db)) -> AlertDetail:
    rt_alert = get_active_redteam_alert()
    if rt_alert and rt_alert.alert_id == alert_id:
        return rt_alert

    try:
        detail = db_get_alert_detail(db, alert_id)
        if detail is not None:
            return detail
    except Exception:
        pass

    raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")


@app.get("/alerts/{alert_id}/graph", response_model=GraphPayload)
def get_graph(alert_id: str, db: Session = Depends(get_db)) -> GraphPayload:
    rt_graph = get_active_redteam_graph()
    if rt_graph and rt_graph.alert_id == alert_id:
        return rt_graph

    try:
        graph = db_get_alert_graph(db, alert_id)
        if graph is not None:
            return graph
    except Exception:
        pass

    raise HTTPException(status_code=404, detail=f"Alert {alert_id} graph not found")


@app.post("/alerts/{alert_id}/disposition", response_model=AlertSummary)
def set_disposition(
    alert_id: str,
    body: DispositionRequest,
    db: Session = Depends(get_db),
) -> AlertSummary:
    try:
        result = db_update_disposition(db, alert_id, body.status)
        if result is not None:
            return result
    except Exception:
        pass

    raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")


# ── Metrics ───────────────────────────────────
@app.get("/metrics", response_model=Metrics)
def metrics(db: Session = Depends(get_db)) -> Metrics:
    try:
        m = db_get_latest_metrics(db)
        if m is not None:
            return m
    except Exception:
        pass

    return Metrics(runs=[], per_typology=[])


# ── Red-team ──────────────────────────────────
@app.post("/redteam/inject", response_model=RedTeamResult)
def redteam_inject(
    body: dict | None = None,
    db: Session = Depends(get_db),
) -> RedTeamResult:
    seed = body.get("seed") if body else None
    return execute_redteam_injection(seed=seed, db=db)


@app.delete("/redteam")
def redteam_delete(db: Session = Depends(get_db)) -> dict:
    removed = remove_redteam_alert(db=db)
    return {"removed": removed}
