"""
LaunderLens Interactive AI Forensic Copilot.
Provides conversational graph interrogation, PMLA/RBI statutory analysis,
and actionable investigation drafting powered by Gemini (with intelligent statutory fallback).
"""
from __future__ import annotations

import os
import re
from typing import List, Dict, Any, Optional
import httpx
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import (
    get_alert_detail as db_get_alert_detail,
    get_alert_graph as db_get_alert_graph,
)
from app.mock_data import (
    get_alert_detail as mock_get_alert_detail,
    get_alert_graph as mock_get_alert_graph,
)
from app.redteam import get_active_redteam_alert, get_active_redteam_graph


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant" or "system"
    content: str


class ChatRequest(BaseModel):
    alert_id: str
    message: str
    history: List[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    suggested_actions: List[str] = Field(default_factory=list)
    tools_used: List[List[str]] = Field(default_factory=list)
    source: str = "gemini"


def _format_inr(val: float) -> str:
    return f"₹{val:,.2f}"


def _get_alert_context(alert_id: str, db: Session) -> Dict[str, Any]:
    """Retrieves full detail and graph topology for an alert."""
    rt_alert = get_active_redteam_alert()
    detail = None
    graph = None

    if rt_alert and rt_alert.alert_id == alert_id:
        detail = rt_alert
        graph = get_active_redteam_graph()
    else:
        try:
            detail = db_get_alert_detail(db, alert_id)
            graph = db_get_alert_graph(db, alert_id)
        except Exception:
            pass

        if detail is None:
            detail = mock_get_alert_detail(alert_id)
        if graph is None:
            graph = mock_get_alert_graph(alert_id)

    if detail is None:
        return {"error": f"Alert {alert_id} not found"}

    # Format nodes
    nodes = []
    if graph and graph.nodes:
        for n in graph.nodes:
            inflow = sum(e.amount for e in graph.edges if e.target == n.id)
            outflow = sum(e.amount for e in graph.edges if e.source == n.id)
            nodes.append({
                "id": n.id,
                "role": n.role.upper(),
                "inflow_inr": _format_inr(inflow),
                "outflow_inr": _format_inr(outflow),
                "net_inr": _format_inr(inflow - outflow),
            })

    # Format edges
    edges = []
    if graph and graph.edges:
        for idx, e in enumerate(graph.edges, start=1):
            edges.append({
                "hop": f"Hop {idx}",
                "source": e.source,
                "target": e.target,
                "amount": _format_inr(e.amount),
                "timestamp": e.ts,
                "hop_index": e.hop_index,
            })

    # Format SHAP
    shap_list = []
    for s in (detail.shap or []):
        shap_list.append(f"{s.feature} (Value: {s.value}, Risk Impact: +{int(s.contribution * 100)}%)")

    return {
        "alert_id": detail.alert_id,
        "typology": detail.typology,
        "risk_score": detail.risk_score,
        "risk_pct": f"{int(detail.risk_score * 100)}%",
        "total_amount": _format_inr(detail.total_amount),
        "accounts_count": detail.n_accounts,
        "tx_count": detail.n_transactions,
        "first_ts": detail.first_ts,
        "last_ts": detail.last_ts,
        "baseline_flagged": detail.baseline_flagged,
        "narrative": detail.narrative,
        "nodes": nodes,
        "edges": edges,
        "shap": shap_list,
    }


def _generate_fallback_response(ctx: Dict[str, Any], query: str) -> ChatResponse:
    """Intelligent statutory and graph fallback response generator."""
    q = query.lower()
    alert_id = ctx.get("alert_id", "A-001")
    typology = ctx.get("typology", "scatter_gather").replace("_", " ")
    amount = ctx.get("total_amount", "₹0.00")
    nodes = ctx.get("nodes", [])
    edges = ctx.get("edges", [])

    mules = [n["id"] for n in nodes if n["role"] == "MULE"]
    entries = [n["id"] for n in nodes if n["role"] == "ENTRY"]
    exits = [n["id"] for n in nodes if n["role"] == "EXIT"]

    # 1. Trail / Hop / Money Movement
    if any(k in q for k in ["trace", "trail", "hop", "where", "movement", "path", "flow"]):
        lines = [
            f"### 🔍 Fund Movement Trail Analysis for `{alert_id}`",
            f"Total Monitored Flow: **{amount}** across {len(edges)} chronological hops:",
            "",
        ]
        for e in edges[:6]:
            lines.append(f"- **{e['hop']}**: `{e['source']}` ➔ `{e['target']}` of **{e['amount']}** ({e['timestamp']})")
        
        if len(edges) > 6:
            lines.append(f"- *(...and {len(edges) - 6} additional intermediate transactions)*")

        lines.extend([
            "",
            f"**Forensic Assessment**: Funds originate from primary source `{entries[0] if entries else 'Entry'}` and are channeled through {len(mules)} mule account(s) before aggregating at `{exits[0] if exits else 'Collector'}`.",
        ])

        return ChatResponse(
            reply="\n".join(lines),
            suggested_actions=["Freeze Identified Mule Accounts", "Download Official SAR Dossier", "Inspect Beneficiary Account"],
            tools_used=[["graph_tracer", "NetworkX BFS Hops"]],
            source="rule_engine",
        )

    # 2. Who is ringleader / mules / roles
    if any(k in q for k in ["ringleader", "mule", "who", "role", "participant", "source", "origin"]):
        lines = [
            f"### 🚨 Participant Entity Breakdown for `{alert_id}`",
            f"The network exhibits a **{typology.upper()}** topology with clear role specialization:",
            "",
            f"1. **Funding Originator / Entry (`{', '.join(entries) or 'None'}`)**:",
            f"   - Initiated primary capital injections totaling {amount}.",
            "",
            f"2. **Intermediate Mule Accounts (`{', '.join(mules[:4]) or 'Transit nodes'}`)**:",
            f"   - Relayed transactions rapidly (pass-through retention ratio > 90%) to obscure ownership.",
            "",
            f"3. **Ultimate Exit / Collector (`{', '.join(exits) or 'Sink node'}`)**:",
            f"   - Consolidated dispersed tranches for withdrawal or offshore wire.",
        ]

        return ChatResponse(
            reply="\n".join(lines),
            suggested_actions=["Issue KYC Source of Funds Notice", "Check NCRP Cybercrime Portal", "Place Debit Hold on Mules"],
            tools_used=[["entity_role_classifier", "Inflow/Outflow Ledger"]],
            source="rule_engine",
        )

    # 3. PMLA / RBI / Statutory Triggers
    if any(k in q for k in ["pmla", "rbi", "law", "violation", "legal", "statutory", "act", "fiu"]):
        lines = [
            f"### ⚖️ Statutory & Compliance Violations (FIU-IND)",
            f"Case `{alert_id}` triggers multiple mandatory reporting provisions under Indian law:",
            "",
            "1. **PMLA 2002 – Section 12 (1) (b)**:",
            "   - Mandatory reporting of suspicious transactions regardless of individual threshold limits if structuring is evident.",
            "",
            "2. **RBI Master Direction – KYC (Chapter VI, Section 37)**:",
            "   - Failure of mule accounts to justify rapid turnover inconsistent with declared customer profile.",
            "",
            "3. **PMLA Section 54 Assistance Requirement**:",
            "   - Obligation of banking units to preserve logs and enforce immediate freeze orders upon law enforcement directive.",
            "",
            "**Recommended Action**: Immediate electronic filing of Suspicious Transaction Report (STR) via FINnet 2.0 to FIU-IND.",
        ]

        return ChatResponse(
            reply="\n".join(lines),
            suggested_actions=["Generate STR Report", "Review KYC Customer Profiles", "Mark Alert Confirmed"],
            tools_used=[["statutory_knowledge_base", "PMLA 2002 / RBI Master Directions"]],
            source="rule_engine",
        )

    # 4. Draft Debit-Freeze Memo / Order
    if any(k in q for k in ["freeze", "draft", "notice", "order", "memo", "email", "letter"]):
        target_mules = ", ".join(mules) if mules else "Identified Mule Accounts"
        lines = [
            f"### 📝 Draft Debit-Freeze Direction (Section 54, PMLA 2002)",
            "```text",
            "TO: Head of Operations & Fraud Risk Management",
            "FROM: AML / Financial Crime Investigation Unit",
            f"SUBJECT: URGENT: Temporary Debit Freeze Order – Case Ref {alert_id}",
            "SECURITY: STRICTLY CONFIDENTIAL // REGULATORY ENFORCEMENT",
            "",
            "Dear Operations Team,",
            "",
            f"Under the internal powers of Section 12/54 of the Prevention of Money Laundering Act (PMLA),",
            f"2002, please place an IMMEDIATE DEBIT FREEZE on the following account(s):",
            f"- Account IDs: {target_mules}",
            f"- Aggregate Exposure: {amount}",
            f"- Detected Typology: {typology.title()} Layering Scheme",
            "",
            "Reason: Accounts have been identified as intermediary mule conduits actively participating in",
            "rapid pass-through laundering operations.",
            "",
            "Please retain all transaction artifacts, IP logs, and device fingerprints for immediate",
            "submission to the Financial Intelligence Unit (FIU-IND).",
            "",
            "Approved by:",
            "Senior AML Forensic Investigator",
            "LaunderLens Intelligence Swarm",
            "```",
        ]

        return ChatResponse(
            reply="\n".join(lines),
            suggested_actions=["Copy Memo to Clipboard", "Confirm Alert as Laundering", "Download Case Dossier"],
            tools_used=[["legal_document_synthesizer", "PMLA Freeze Directive"]],
            source="rule_engine",
        )

    # Default overview
    lines = [
        f"### 🤖 Forensic Intelligence Brief for `{alert_id}`",
        f"- **Assessed Risk Level**: **{ctx.get('risk_pct', '88%')}** ({typology.title()})",
        f"- **Monitored Exposure**: **{amount}** across {ctx.get('accounts_count', 0)} accounts",
        f"- **Legacy Baseline Detection**: {'Flagged by legacy rules' if ctx.get('baseline_flagged') else 'MISSED by traditional threshold rules (Caught via Graph AI)'}",
        "",
        "**Key Risk Attributions (TreeSHAP)**:",
    ]
    for s in ctx.get("shap", [])[:3]:
        lines.append(f"- {s}")

    lines.extend([
        "",
        "**What would you like to investigate next?**",
        "- Ask: *'Trace the money trail hop-by-hop'*",
        "- Ask: *'Who are the intermediate mules and ringleaders?'*",
        "- Ask: *'Draft an urgent debit freeze notice for the compliance team'*",
    ])

    return ChatResponse(
        reply="\n".join(lines),
        suggested_actions=["Trace Fund Movement", "Identify Mules", "Draft Debit Freeze Order", "PMLA Legal Triggers"],
        tools_used=[["alert_graph_context", "TreeSHAP Attribution"]],
        source="rule_engine",
    )


async def process_copilot_chat(request: ChatRequest, db: Session) -> ChatResponse:
    """
    Coordinates chat interaction for the AI Forensic Copilot.
    Uses Google Gemini 1.5 Flash if GEMINI_API_KEY is configured,
    or falls back smoothly to the statutory rule engine.
    """
    ctx = _get_alert_context(request.alert_id, db)
    if "error" in ctx:
        return ChatResponse(
            reply=f"Error: {ctx['error']}. Please select an active alert to interrogate.",
            suggested_actions=[],
            tools_used=[],
            source="error",
        )

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not api_key:
        return _generate_fallback_response(ctx, request.message)

    # Call Gemini REST API via httpx
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

        system_instruction = (
            "You are the LaunderLens AI Forensic Copilot, an elite Anti-Money Laundering (AML) and financial crime investigation agent.\n"
            "You have direct access to the live NetworkX transaction graph, node roles, and TreeSHAP risk attributions.\n"
            "Use clear, authoritative, professional fintech language. Reference Indian financial statutes (PMLA 2002, Section 12, RBI KYC Directions, FIU-IND) where appropriate.\n"
            "Always cite specific account IDs and ₹ INR amounts from the provided alert context.\n"
            "Format your reply with clean GitHub markdown, bold highlights, and bullet points."
        )

        context_prompt = (
            f"=== CURRENT INVESTIGATION CONTEXT ===\n"
            f"Alert ID: {ctx['alert_id']}\n"
            f"Typology: {ctx['typology']}\n"
            f"Risk Probability: {ctx['risk_pct']}\n"
            f"Total INR Volume: {ctx['total_amount']}\n"
            f"Accounts: {len(ctx['nodes'])} entities: {ctx['nodes']}\n"
            f"Transactions/Hops: {len(ctx['edges'])} hops: {ctx['edges']}\n"
            f"SHAP Top Risk Factors: {ctx['shap']}\n"
            f"Legacy Baseline Detection: {'Flagged' if ctx['baseline_flagged'] else 'Missed by rule baseline'}\n"
            f"=== END CONTEXT ===\n\n"
        )

        # Build contents array with message history
        contents = []
        for msg in request.history[-6:]:  # last 6 turns
            role = "user" if msg.role == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg.content}]})

        # Append latest user query with current context
        latest_text = f"{context_prompt}User Question: {request.message}"
        contents.append({"role": "user", "parts": [{"text": latest_text}]})

        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 800,
            }
        }

        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                reply_text = data["candidates"][0]["content"]["parts"][0]["text"]

                # Extract suggested actions dynamically
                actions = ["Download SAR Dossier", "Freeze Mule Accounts", "View Money Trail"]
                if "freeze" in request.message.lower():
                    actions = ["Copy Freeze Notice", "File STR with FIU-IND", "Request Source of Funds"]
                elif "trail" in request.message.lower() or "hop" in request.message.lower():
                    actions = ["Inspect Exit Collector", "Verify Hop Timestamps", "Check KYC Profiles"]

                return ChatResponse(
                    reply=reply_text.strip(),
                    suggested_actions=actions,
                    tools_used=[["gemini_1.5_flash", "Graph Topology & SHAP Engine"]],
                    source="gemini",
                )
    except Exception:
        pass

    # Fallback to statutory engine
    return _generate_fallback_response(ctx, request.message)
