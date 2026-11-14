"""
LaunderLens – Multi-Agent Data Types and Internal Schemas.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field

from app.schemas import AlertDetail, AlertSummary, GraphPayload, ShapItem, Typology, Role, Status


class AgentLogEntry(BaseModel):
    agent_id: str
    agent_name: str
    status: Literal["idle", "working", "complete", "warning", "error"] = "working"
    action: str
    details: str
    duration_ms: float = 0.0
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class IngestionStats(BaseModel):
    filename: str
    file_type: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    unique_accounts: int
    total_volume_inr: float
    earliest_ts: str
    latest_ts: str
    columns_mapped: dict[str, str]


class PatternCandidate(BaseModel):
    typology: Typology
    accounts: list[str]
    roles: dict[str, Role]
    transactions: list[dict[str, Any]]
    total_amount: float
    n_accounts: int
    n_transactions: int
    first_ts: str
    last_ts: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class DossierSection(BaseModel):
    title: str
    content: str


class RegulatoryDossier(BaseModel):
    alert_id: str
    case_ref: str
    generated_at: str
    risk_level: str
    typology: str
    total_amount_inr: float
    total_amount_formatted: str
    participants_count: int
    transactions_count: int
    executive_summary: str
    participant_breakdown: list[dict[str, Any]]
    chronological_trail: list[dict[str, Any]]
    shap_factors: list[dict[str, Any]]
    statutory_triggers: list[str]
    recommended_actions: list[str]
    raw_markdown: str


class PipelineSummary(BaseModel):
    dataset_name: str
    stats: IngestionStats
    agent_logs: list[AgentLogEntry]
    alerts_generated: list[AlertSummary]
    high_risk_count: int
    total_suspicious_volume_inr: float
    elapsed_seconds: float
