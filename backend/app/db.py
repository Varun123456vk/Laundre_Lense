"""
LaunderLens – Database Layer (SQLAlchemy 2.x).
Configured for Supabase PostgreSQL (transaction pooler on port 6543).
Stores ONLY pipeline results: alerts, alert_accounts, alert_edges, metric_runs.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Generator, Sequence

from dotenv import load_dotenv
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    desc,
    select,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)

from app.schemas import (
    AlertDetail,
    AlertSummary,
    GraphEdge,
    GraphNode,
    GraphPayload,
    MethodMetrics,
    Metrics,
    PerTypologyRecall,
    ShapItem,
)

load_dotenv()


# ──────────────────────────────────────────────
#  Base & ORM Models
# ──────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


class AlertDB(Base):
    __tablename__ = "alerts"

    alert_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    typology: Mapped[str] = mapped_column(String(32), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    first_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    n_accounts: Mapped[int] = mapped_column(Integer, nullable=False)
    n_transactions: Mapped[int] = mapped_column(Integer, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    baseline_flagged: Mapped[bool] = mapped_column(Boolean, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="open", nullable=False)
    is_redteam: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
    narrative_source: Mapped[str] = mapped_column(String(32), default="template", nullable=False)
    shap: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    evidence: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    accounts: Mapped[list[AlertAccountDB]] = relationship(
        "AlertAccountDB",
        back_populates="alert",
        cascade="all, delete-orphan",
        order_by="AlertAccountDB.account_id",
    )
    edges: Mapped[list[AlertEdgeDB]] = relationship(
        "AlertEdgeDB",
        back_populates="alert",
        cascade="all, delete-orphan",
        order_by="AlertEdgeDB.hop_index, AlertEdgeDB.ts",
    )


class AlertAccountDB(Base):
    __tablename__ = "alert_accounts"

    alert_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("alerts.alert_id", ondelete="CASCADE"),
        primary_key=True,
    )
    account_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False)

    alert: Mapped[AlertDB] = relationship("AlertDB", back_populates="accounts")


class AlertEdgeDB(Base):
    __tablename__ = "alert_edges"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    alert_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("alerts.alert_id", ondelete="CASCADE"),
        nullable=False,
    )
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    target: Mapped[str] = mapped_column(String(64), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    hop_index: Mapped[int] = mapped_column(Integer, nullable=False)

    alert: Mapped[AlertDB] = relationship("AlertDB", back_populates="edges")


class MetricRunDB(Base):
    __tablename__ = "metric_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), nullable=False)
    method: Mapped[str] = mapped_column(String(32), nullable=False)
    alerts_count: Mapped[int] = mapped_column(Integer, nullable=False)
    true_positives: Mapped[int] = mapped_column(Integer, nullable=False)
    false_positives: Mapped[int] = mapped_column(Integer, nullable=False)
    precision: Mapped[float] = mapped_column(Float, nullable=False)
    recall: Mapped[float] = mapped_column(Float, nullable=False)
    f1: Mapped[float] = mapped_column(Float, nullable=False)
    fpr: Mapped[float] = mapped_column(Float, nullable=False)
    per_typology: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


# ──────────────────────────────────────────────
#  Engine & Session Factory
# ──────────────────────────────────────────────

def format_iso_utc(dt: datetime | str) -> str:
    """Ensure timestamp is formatted as ISO 8601 UTC with trailing 'Z'."""
    if isinstance(dt, str):
        if not dt.endswith("Z"):
            dt = dt.replace("+00:00", "") + "Z"
        return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_iso_utc(ts_str: str) -> datetime:
    """Parse an ISO 8601 string into a timezone-aware UTC datetime."""
    clean = ts_str.rstrip("Z")
    dt = datetime.fromisoformat(clean)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def create_db_engine(url: str | None = None) -> Engine:
    """
    Create a SQLAlchemy engine configured for Supabase connection pooler
    or SQLite fallback.
    """
    db_url = url or os.getenv("DATABASE_URL", "sqlite:///./launderlens.db")

    # Fix legacy postgres:// dialect prefix for SQLAlchemy 2.x
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    connect_args: dict[str, Any] = {}
    engine_kwargs: dict[str, Any] = {}

    if db_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    else:
        # Optimized for Supabase transaction pooler (port 6543)
        engine_kwargs.update(
            pool_size=10,
            max_overflow=20,
            pool_recycle=300,
            pool_pre_ping=True,
        )

    return create_engine(db_url, connect_args=connect_args, **engine_kwargs)


# Global default engine and sessionmaker
engine: Engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for obtaining a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(target_engine: Engine | None = None) -> None:
    """Create all tables in the database if they do not exist."""
    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)


# ──────────────────────────────────────────────
#  Model conversion helpers
# ──────────────────────────────────────────────

def alert_db_to_summary(row: AlertDB) -> AlertSummary:
    return AlertSummary(
        alert_id=row.alert_id,
        typology=row.typology,  # type: ignore
        risk_score=row.risk_score,
        first_ts=format_iso_utc(row.first_ts),
        last_ts=format_iso_utc(row.last_ts),
        n_accounts=row.n_accounts,
        n_transactions=row.n_transactions,
        total_amount=row.total_amount,
        baseline_flagged=row.baseline_flagged,
        status=row.status,  # type: ignore
        is_redteam=row.is_redteam,
    )


def alert_db_to_detail(row: AlertDB) -> AlertDetail:
    shap_items = [
        ShapItem(
            feature=item["feature"],
            value=float(item["value"]),
            contribution=float(item["contribution"]),
        )
        for item in (row.shap or [])
    ]
    return AlertDetail(
        alert_id=row.alert_id,
        typology=row.typology,  # type: ignore
        risk_score=row.risk_score,
        first_ts=format_iso_utc(row.first_ts),
        last_ts=format_iso_utc(row.last_ts),
        n_accounts=row.n_accounts,
        n_transactions=row.n_transactions,
        total_amount=row.total_amount,
        baseline_flagged=row.baseline_flagged,
        status=row.status,  # type: ignore
        is_redteam=row.is_redteam,
        narrative=row.narrative or "",
        narrative_source=row.narrative_source or "template",  # type: ignore
        shap=shap_items,
        evidence=row.evidence or {},
    )


def alert_db_to_graph(row: AlertDB) -> GraphPayload:
    nodes = [
        GraphNode(id=acc.account_id, role=acc.role, label=acc.label)  # type: ignore
        for acc in row.accounts
    ]
    # hop_index = BFS distance from entry account, ties broken by timestamp
    sorted_edges = sorted(row.edges, key=lambda e: (e.hop_index, e.ts))
    prefix = f"{row.alert_id}_"
    edges = [
        GraphEdge(
            id=e.id.removeprefix(prefix),
            source=e.source,
            target=e.target,
            amount=e.amount,
            ts=format_iso_utc(e.ts),
            hop_index=e.hop_index,
        )
        for e in sorted_edges
    ]
    return GraphPayload(nodes=nodes, edges=edges)


# ──────────────────────────────────────────────
#  CRUD Repository Functions
# ──────────────────────────────────────────────

def get_alerts(
    db: Session,
    typology: str | None = None,
    min_risk: float | None = None,
) -> list[AlertSummary]:
    """Return alerts sorted by risk_score descending, with optional filters."""
    query = select(AlertDB).order_by(desc(AlertDB.risk_score))
    if typology is not None:
        query = query.where(AlertDB.typology == typology)
    if min_risk is not None:
        query = query.where(AlertDB.risk_score >= min_risk)

    rows: Sequence[AlertDB] = db.execute(query).scalars().all()
    return [alert_db_to_summary(r) for r in rows]


def get_alert_detail(db: Session, alert_id: str) -> AlertDetail | None:
    """Return full detail for an alert, or None if not found."""
    row = db.get(AlertDB, alert_id)
    if row is None:
        return None
    return alert_db_to_detail(row)


def get_alert_graph(db: Session, alert_id: str) -> GraphPayload | None:
    """Return the GraphPayload for an alert, or None if not found."""
    row = db.get(AlertDB, alert_id)
    if row is None:
        return None
    return alert_db_to_graph(row)


def update_disposition(db: Session, alert_id: str, status: str) -> AlertSummary | None:
    """Update investigation status of an alert and return updated summary."""
    row = db.get(AlertDB, alert_id)
    if row is None:
        return None
    row.status = status
    db.commit()
    db.refresh(row)
    return alert_db_to_summary(row)


def save_alert(
    db: Session,
    detail: AlertDetail,
    graph: GraphPayload | None = None,
) -> AlertDB:
    """Insert or update an alert with associated accounts and edges."""
    row = db.get(AlertDB, detail.alert_id)
    if row is None:
        row = AlertDB(alert_id=detail.alert_id)
        db.add(row)

    row.typology = detail.typology
    row.risk_score = detail.risk_score
    row.first_ts = parse_iso_utc(detail.first_ts)
    row.last_ts = parse_iso_utc(detail.last_ts)
    row.n_accounts = detail.n_accounts
    row.n_transactions = detail.n_transactions
    row.total_amount = detail.total_amount
    row.baseline_flagged = detail.baseline_flagged
    row.status = detail.status
    row.is_redteam = detail.is_redteam
    row.narrative = detail.narrative
    row.narrative_source = detail.narrative_source
    row.shap = [s.model_dump() for s in detail.shap]
    row.evidence = detail.evidence

    if graph is not None:
        # Replace accounts
        row.accounts.clear()
        for n in graph.nodes:
            row.accounts.append(
                AlertAccountDB(
                    alert_id=detail.alert_id,
                    account_id=n.id,
                    role=n.role,
                    label=n.label,
                )
            )

        # Replace edges
        row.edges.clear()
        edge_prefix = f"{detail.alert_id}_"
        for e in graph.edges:
            edge_pk = e.id if e.id.startswith(edge_prefix) else f"{edge_prefix}{e.id}"
            row.edges.append(
                AlertEdgeDB(
                    id=edge_pk,
                    alert_id=detail.alert_id,
                    source=e.source,
                    target=e.target,
                    amount=e.amount,
                    ts=parse_iso_utc(e.ts),
                    hop_index=e.hop_index,
                )
            )

    db.commit()
    db.refresh(row)
    return row


def save_metric_run(db: Session, metrics: Metrics, run_id: str = "benchmark-latest") -> None:
    """Save benchmark metric runs and per-typology recalls."""
    # Delete previous runs for this run_id
    existing = db.execute(select(MetricRunDB).where(MetricRunDB.run_id == run_id)).scalars().all()
    for e in existing:
        db.delete(e)

    per_typology_dicts = [pt.model_dump() for pt in metrics.per_typology]
    for run in metrics.runs:
        db.add(
            MetricRunDB(
                run_id=run_id,
                method=run.method,
                alerts_count=run.alerts_count,
                true_positives=run.true_positives,
                false_positives=run.false_positives,
                precision=run.precision,
                recall=run.recall,
                f1=run.f1,
                fpr=run.fpr,
                per_typology=per_typology_dicts,
            )
        )
    db.commit()


def get_latest_metrics(db: Session) -> Metrics | None:
    """Fetch the latest benchmark metrics run from Postgres."""
    latest_run = db.execute(
        select(MetricRunDB).order_by(desc(MetricRunDB.created_at))
    ).scalars().first()

    if latest_run is None:
        return None

    runs_db = db.execute(
        select(MetricRunDB).where(MetricRunDB.run_id == latest_run.run_id)
    ).scalars().all()

    method_metrics = [
        MethodMetrics(
            method=r.method,  # type: ignore
            alerts_count=r.alerts_count,
            true_positives=r.true_positives,
            false_positives=r.false_positives,
            precision=r.precision,
            recall=r.recall,
            f1=r.f1,
            fpr=r.fpr,
        )
        for r in runs_db
    ]

    per_typology = [
        PerTypologyRecall(
            typology=item["typology"],
            recall_baseline=item["recall_baseline"],
            recall_ours=item["recall_ours"],
        )
        for item in latest_run.per_typology
    ]

    return Metrics(runs=method_metrics, per_typology=per_typology)
