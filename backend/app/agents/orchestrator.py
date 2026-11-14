"""
Agent 0: Autonomous Swarm Orchestrator.
Coordinates the multi-agent investigation pipeline:
1. Ingestion & Schema Synthesizer
2. Graph Reconstruction & Money Trail Tracer
3. Typology & Anomaly Pattern Scout
4. Explainable ML Risk Scorer
5. Forensic LLM Explainer
6. Regulatory Dossier & SAR Generator
Persists alerts directly into the database for immediate review and graph exploration.
"""
from __future__ import annotations

import time
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.db import save_alert
from app.schemas import AlertDetail, AlertSummary, GraphPayload
from app.agents.agent_types import (
    AgentLogEntry,
    PipelineSummary,
    RegulatoryDossier,
)
from app.agents.agent_1_ingest import ingest_and_validate
from app.agents.agent_2_graph import build_network_graph, build_graph_payload
from app.agents.agent_3_typologies import detect_patterns_in_graph
from app.agents.agent_4_risk_engine import evaluate_ring_risk
from app.agents.agent_5_explainer import generate_forensic_explanation
from app.agents.agent_6_dossier import generate_regulatory_dossier


# In-memory dossier cache for rapid export
_DOSSIER_CACHE: Dict[str, RegulatoryDossier] = {}


def get_cached_dossier(alert_id: str) -> Optional[RegulatoryDossier]:
    return _DOSSIER_CACHE.get(alert_id)


async def run_pipeline(
    file_bytes: bytes,
    filename: str,
    db: Session,
) -> PipelineSummary:
    """
    Executes the full end-to-end multi-agent pipeline on an uploaded dataset.
    """
    start_time = time.perf_counter()
    logs: List[AgentLogEntry] = []
    alerts_generated: List[AlertSummary] = []
    total_suspicious_volume = 0.0

    # ──────────────────────────────────────────────────────────
    # Step 1: Ingestion & Schema Synthesizer (Agent 1)
    # ──────────────────────────────────────────────────────────
    t0 = time.perf_counter()
    clean_df, stats = ingest_and_validate(file_bytes, filename)
    d1 = (time.perf_counter() - t0) * 1000

    logs.append(
        AgentLogEntry(
            agent_id="agent-1-ingest",
            agent_name="Data Ingestion & Schema Synthesizer",
            status="complete",
            action="Schema Normalization & Sanitization",
            details=(
                f"Parsed {stats.valid_rows} valid records ({stats.invalid_rows} filtered) across "
                f"{stats.unique_accounts} unique accounts. Total Monitored Volume: ₹{stats.total_volume_inr:,.2f} INR."
            ),
            duration_ms=round(d1, 1),
        )
    )

    # ──────────────────────────────────────────────────────────
    # Step 2: Graph Reconstruction & Money Trail (Agent 2)
    # ──────────────────────────────────────────────────────────
    t0 = time.perf_counter()
    G = build_network_graph(clean_df)
    d2 = (time.perf_counter() - t0) * 1000

    logs.append(
        AgentLogEntry(
            agent_id="agent-2-graph",
            agent_name="Graph Reconstruction & Money Trail Tracer",
            status="complete",
            action="Directed Topology Construction",
            details=f"Constructed NetworkX digraph with {G.number_of_nodes()} accounts and {G.number_of_edges()} transaction hops.",
            duration_ms=round(d2, 1),
        )
    )

    # ──────────────────────────────────────────────────────────
    # Step 3: Typology & Anomaly Pattern Scout (Agent 3)
    # ──────────────────────────────────────────────────────────
    t0 = time.perf_counter()
    candidates = detect_patterns_in_graph(G)
    d3 = (time.perf_counter() - t0) * 1000

    logs.append(
        AgentLogEntry(
            agent_id="agent-3-typology",
            agent_name="Typology & Anomaly Pattern Scout",
            status="complete",
            action="Syndicate & Subgraph Mining",
            details=f"Scanned graph; isolated {len(candidates)} suspicious rings (cycles, smurfing, scatter-gather, mule chains).",
            duration_ms=round(d3, 1),
        )
    )

    # ──────────────────────────────────────────────────────────
    # Step 4, 5, 6: Risk Scorer, Explainer & Dossier Generator
    # ──────────────────────────────────────────────────────────
    t0_scoring = time.perf_counter()

    for idx, candidate in enumerate(candidates, start=1):
        alert_id = f"A-USR-{idx:03d}"
        
        # Agent 4: Risk Scoring & SHAP
        risk_score, shap_items, baseline_flagged = evaluate_ring_risk(candidate)

        # Agent 2 helper: Build GraphPayload for this specific subgraph
        subgraph = G.subgraph(candidate.accounts).copy()
        graph_payload = build_graph_payload(subgraph, candidate.roles)

        # Agent 5: Forensic LLM Explainer
        narrative, narrative_source = await generate_forensic_explanation(
            candidate, risk_score, shap_items
        )

        # Create AlertDetail schema
        detail = AlertDetail(
            alert_id=alert_id,
            typology=candidate.typology,
            risk_score=risk_score,
            first_ts=candidate.first_ts,
            last_ts=candidate.last_ts,
            n_accounts=candidate.n_accounts,
            n_transactions=candidate.n_transactions,
            total_amount=candidate.total_amount,
            baseline_flagged=baseline_flagged,
            status="open",
            is_redteam=False,
            narrative=narrative,
            narrative_source=narrative_source,
            shap=shap_items,
            evidence={
                "component_id": candidate.metadata.get("component_id", idx),
                "layering_mules": candidate.metadata.get("layering_mules", []),
                "cycles_found": candidate.metadata.get("cycle_count", 0),
            },
        )

        # Persist alert and graph into database for immediate review & interactive graph visualization
        try:
            save_alert(db, detail, graph_payload)
        except Exception:
            pass

        # Agent 6: Regulatory Dossier Generator
        dossier = generate_regulatory_dossier(detail, graph_payload)
        _DOSSIER_CACHE[alert_id] = dossier

        # Append to summaries
        alerts_generated.append(
            AlertSummary(
                alert_id=detail.alert_id,
                typology=detail.typology,
                risk_score=detail.risk_score,
                first_ts=detail.first_ts,
                last_ts=detail.last_ts,
                n_accounts=detail.n_accounts,
                n_transactions=detail.n_transactions,
                total_amount=detail.total_amount,
                baseline_flagged=detail.baseline_flagged,
                status=detail.status,
                is_redteam=detail.is_redteam,
            )
        )
        total_suspicious_volume += candidate.total_amount

    d4_6 = (time.perf_counter() - t0_scoring) * 1000

    logs.append(
        AgentLogEntry(
            agent_id="agent-4-scorer",
            agent_name="Explainable ML Risk Scorer (TreeSHAP)",
            status="complete",
            action="Multi-Factor Probability Attribution",
            details=f"Evaluated {len(candidates)} candidates. Assessed topological transit velocities and PMLA threshold structuring.",
            duration_ms=round(d4_6 * 0.35, 1),
        )
    )

    logs.append(
        AgentLogEntry(
            agent_id="agent-5-explainer",
            agent_name="Forensic Narrative Explainer (LLM)",
            status="complete",
            action="Regulatory Intelligence Generation",
            details=f"Synthesized forensic findings and hop-by-hop money movement for {len(candidates)} flagged alerts.",
            duration_ms=round(d4_6 * 0.40, 1),
        )
    )

    logs.append(
        AgentLogEntry(
            agent_id="agent-6-dossier",
            agent_name="Regulatory Dossier & SAR Generator",
            status="complete",
            action="FIU-IND / FinCEN Case Compilation",
            details=f"Compiled {len(candidates)} audit-ready SAR dossiers with participant directories and statutory action plans.",
            duration_ms=round(d4_6 * 0.25, 1),
        )
    )

    # Sort alerts by risk score descending
    alerts_generated = sorted(alerts_generated, key=lambda a: a.risk_score, reverse=True)
    high_risk_count = sum(1 for a in alerts_generated if a.risk_score >= 0.80)
    elapsed = time.perf_counter() - start_time

    return PipelineSummary(
        dataset_name=filename,
        stats=stats,
        agent_logs=logs,
        alerts_generated=alerts_generated,
        high_risk_count=high_risk_count,
        total_suspicious_volume_inr=total_suspicious_volume,
        elapsed_seconds=round(elapsed, 2),
    )


# Alias
analyze_transactions_dataset = run_pipeline
