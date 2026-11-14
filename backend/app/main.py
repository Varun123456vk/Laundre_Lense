"""
LaunderLens – FastAPI application.
Serves alerts, subgraphs, disposition updates, benchmark metrics, and red-team injections.
Reads from Postgres / SQLite database with automatic fallback to mock data when DB is empty.
"""
from __future__ import annotations

import os
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.agents.agent_types import PipelineSummary, RegulatoryDossier
from app.agents.agent_6_dossier import generate_regulatory_dossier
from app.agents.orchestrator import get_cached_dossier, run_pipeline
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
    rt_alert = get_active_redteam_alert()
    if rt_alert and rt_alert.alert_id == alert_id:
        rt_graph = get_active_redteam_graph()
        if rt_graph is not None:
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


# ── Multi-Agent Pipeline Endpoints ─────────────

@app.post("/pipeline/analyze", response_model=PipelineSummary)
async def pipeline_analyze(
    request: Request,
    db: Session = Depends(get_db),
) -> PipelineSummary:
    file_bytes: bytes = b""
    fname: str = "dataset.csv"

    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("file")
        raw_text = form.get("raw_content") or form.get("content")
        fname = form.get("filename") or getattr(uploaded_file, "filename", "dataset.csv")

        if uploaded_file is not None and hasattr(uploaded_file, "read"):
            file_bytes = await uploaded_file.read()
        elif raw_text is not None:
            file_bytes = str(raw_text).encode("utf-8")
    elif "application/json" in content_type:
        body = await request.json()
        fname = body.get("filename", "dataset.csv")
        file_bytes = body.get("content", "").encode("utf-8")
    else:
        # Raw bytes stream
        file_bytes = await request.body()

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="No dataset provided. Please upload a CSV/Excel file or provide text content.",
        )

    try:
        summary = await run_pipeline(file_bytes=file_bytes, filename=fname, db=db)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline execution error: {str(e)}")


@app.get("/pipeline/dossier/{alert_id}", response_model=RegulatoryDossier)
def get_alert_dossier(alert_id: str, db: Session = Depends(get_db)) -> RegulatoryDossier:
    # 1. Check in-memory dossier cache
    dossier = get_cached_dossier(alert_id)
    if dossier is not None:
        return dossier

    # 2. Re-synthesize from database if not cached
    alert_detail = db_get_alert_detail(db, alert_id)
    if alert_detail is None:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")

    graph_payload = db_get_alert_graph(db, alert_id)
    if graph_payload is None:
        graph_payload = GraphPayload(nodes=[], edges=[])

    return generate_regulatory_dossier(alert_detail, graph_payload)


@app.get("/pipeline/sample-dataset")
def get_sample_dataset() -> dict:
    csv_content = (
        "transaction_id,source_account,target_account,amount,timestamp\n"
        # 1. Scatter-Gather Ring (Entry -> 3 Mules -> Exit)
        "TX-1001,ACC-CORP-ORIGIN,MULE-NODE-881,48500.00,2026-11-14T10:02:15Z\n"
        "TX-1002,ACC-CORP-ORIGIN,MULE-NODE-882,49200.00,2026-11-14T10:05:30Z\n"
        "TX-1003,ACC-CORP-ORIGIN,MULE-NODE-883,47800.00,2026-11-14T10:09:45Z\n"
        "TX-1004,MULE-NODE-881,ACC-OFFSHORE-EXIT,48000.00,2026-11-14T10:22:10Z\n"
        "TX-1005,MULE-NODE-882,ACC-OFFSHORE-EXIT,48900.00,2026-11-14T10:26:40Z\n"
        "TX-1006,MULE-NODE-883,ACC-OFFSHORE-EXIT,47500.00,2026-11-14T10:31:05Z\n"
        # 2. Circular Cycle Ring (Looping funds to simulate commercial activity)
        "TX-2001,ACC-SHELL-A,ACC-SHELL-B,85000.00,2026-11-14T11:00:00Z\n"
        "TX-2002,ACC-SHELL-B,ACC-SHELL-C,84200.00,2026-11-14T11:15:20Z\n"
        "TX-2003,ACC-SHELL-C,ACC-SHELL-A,83800.00,2026-11-14T11:32:45Z\n"
        # 3. Fan-out Smurfing (Under PMLA threshold)
        "TX-3001,ACC-SYNDICATE-FEEDER,ACC-RECV-01,42000.00,2026-11-14T12:05:00Z\n"
        "TX-3002,ACC-SYNDICATE-FEEDER,ACC-RECV-02,44500.00,2026-11-14T12:08:10Z\n"
        "TX-3003,ACC-SYNDICATE-FEEDER,ACC-RECV-03,43900.00,2026-11-14T12:12:30Z\n"
        "TX-3004,ACC-SYNDICATE-FEEDER,ACC-RECV-04,45100.00,2026-11-14T12:15:00Z\n"
    )
    return {"filename": "sample_aml_syndicate_inr.csv", "csv": csv_content}

