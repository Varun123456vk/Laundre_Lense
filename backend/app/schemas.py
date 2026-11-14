"""
LaunderLens – Pydantic v2 schemas.
Frozen API contract: do NOT rename, remove or retype any field.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ---------- enums as Literal types ----------

Typology = Literal["fan_out", "fan_in", "scatter_gather", "cycle", "pass_through"]
Role = Literal["entry", "hub", "mule", "exit", "other"]
Status = Literal["open", "confirmed", "dismissed"]
NarrativeSource = Literal["llm", "template"]
MethodName = Literal["baseline", "launderlens"]


# ---------- SHAP ----------

class ShapItem(BaseModel):
    feature: str
    value: float
    contribution: float


# ---------- Alert ----------

class AlertSummary(BaseModel):
    alert_id: str
    typology: Typology
    risk_score: float = Field(ge=0.0, le=1.0)
    first_ts: str          # ISO 8601 UTC with trailing Z
    last_ts: str
    n_accounts: int
    n_transactions: int
    total_amount: float
    baseline_flagged: bool
    status: Status = "open"
    is_redteam: bool = False


class AlertDetail(AlertSummary):
    narrative: str
    narrative_source: NarrativeSource
    shap: list[ShapItem]   # top 5
    evidence: dict


# ---------- Graph ----------

class GraphNode(BaseModel):
    id: str
    role: Role
    label: str


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    amount: float
    ts: str                # ISO 8601 UTC with trailing Z
    hop_index: int


class GraphPayload(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


# ---------- Metrics ----------

class MethodMetrics(BaseModel):
    method: MethodName
    alerts_count: int
    true_positives: int
    false_positives: int
    precision: float
    recall: float
    f1: float
    fpr: float


class PerTypologyRecall(BaseModel):
    typology: Typology
    recall_baseline: float
    recall_ours: float


class Metrics(BaseModel):
    runs: list[MethodMetrics]
    per_typology: list[PerTypologyRecall]


# ---------- Red-team ----------

class RedTeamResult(BaseModel):
    alert: AlertDetail
    baseline_flagged: bool = False
    latency_ms: int


# ---------- Disposition ----------

class DispositionRequest(BaseModel):
    status: Status

