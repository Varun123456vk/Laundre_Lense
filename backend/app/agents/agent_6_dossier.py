"""
Agent 6: Regulatory Dossier & SAR Generator.
Compiles audit-ready Suspicious Activity Report (SAR / STR) dossiers
compliant with FIU-IND (Financial Intelligence Unit - India) and FATF guidelines.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Dict, Any
from app.schemas import AlertDetail, GraphPayload, ShapItem
from app.agents.agent_types import RegulatoryDossier


def generate_regulatory_dossier(
    alert: AlertDetail,
    graph: GraphPayload,
) -> RegulatoryDossier:
    """Compiles a complete regulatory case dossier."""
    case_ref = f"LL-SAR-2026-{alert.alert_id.replace('A-', '').replace('RT-', '')}"
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # Participant breakdown
    participants: List[Dict[str, Any]] = []
    for node in graph.nodes:
        inflow = sum(e.amount for e in graph.edges if e.target == node.id)
        outflow = sum(e.amount for e in graph.edges if e.source == node.id)
        participants.append({
            "account_id": node.id,
            "role": node.role.upper(),
            "inflow_inr": inflow,
            "inflow_formatted": f"₹{inflow:,.2f}",
            "outflow_inr": outflow,
            "outflow_formatted": f"₹{outflow:,.2f}",
            "net_balance_inr": inflow - outflow,
        })

    # Chronological trail
    trail: List[Dict[str, Any]] = []
    for idx, edge in enumerate(graph.edges, start=1):
        trail.append({
            "hop": f"{idx:02d}",
            "source": edge.source,
            "target": edge.target,
            "amount_inr": edge.amount,
            "amount_formatted": f"₹{edge.amount:,.2f}",
            "timestamp": edge.ts,
            "hop_index": edge.hop_index,
        })

    # Risk level calculation
    risk_level = "CRITICAL RISK" if alert.risk_score >= 0.85 else "HIGH RISK" if alert.risk_score >= 0.70 else "ELEVATED RISK"

    statutory_triggers = [
        "PMLA Section 12 (1) (b) – Mandatory reporting of suspicious cross-border and domestic structured fund transfers.",
        "RBI Master Direction – Know Your Customer (KYC) Direction, 2016 (Updated 2024), Chapter VI on Monitoring Transactions.",
        "FATF Recommendation 20 – Immediate filing of Suspicious Transaction Reports (STRs) upon detection of layering behavior.",
    ]

    recommended_actions = [
        "File electronic Suspicious Transaction Report (STR) via FINnet 2.0 portal to FIU-IND.",
        "Issue Section 54 notice for temporary debit freeze on intermediary mule accounts.",
        "Request enhanced KYC and Source of Funds (SoF) documentation from the entry origin account.",
        "Cross-reference participant identifiers against the National Cybercrime Reporting Portal (NCRP) database.",
    ]

    # Assemble comprehensive Markdown report
    md_lines = [
        f"# LAUNDERLENS FORENSIC DOSSIER & REGULATORY SAR",
        f"**Case Reference:** `{case_ref}` | **Generated:** {now_str} | **Classification:** STRICTLY CONFIDENTIAL",
        f"",
        f"---",
        f"",
        f"## 1. CASE SUMMARY",
        f"- **Alert Identifier:** `{alert.alert_id}`",
        f"- **Primary Typology:** `{alert.typology.replace('_', ' ').upper()}`",
        f"- **Assessed Risk Level:** **{risk_level}** ({int(alert.risk_score * 100)}% Probability)",
        f"- **Monitored Volume:** **₹{alert.total_amount:,.2f}**",
        f"- **Network Breadth:** {alert.n_accounts} Involved Accounts across {alert.n_transactions} Transactions",
        f"- **Temporal Window:** {alert.first_ts} to {alert.last_ts}",
        f"- **Baseline Rule Detection:** {'FLAGGED' if alert.baseline_flagged else 'MISSED BY LEGACY RULES (Detected via LaunderLens Graph AI)'}",
        f"",
        f"## 2. FORENSIC NARRATIVE & AI FINDINGS",
        alert.narrative,
        f"",
        f"## 3. SUSPICIOUS PARTICIPANT DIRECTORY",
        f"| Account ID | Role | Total Inflow (₹) | Total Outflow (₹) | Net Balance (₹) |",
        f"| :--- | :--- | :--- | :--- | :--- |",
    ]

    for p in participants:
        md_lines.append(f"| `{p['account_id']}` | **{p['role']}** | {p['inflow_formatted']} | {p['outflow_formatted']} | ₹{p['net_balance_inr']:,.2f} |")

    md_lines.extend([
        f"",
        f"## 4. HOP-BY-HOP MONEY TRAIL",
        f"| Hop | Source Account | Target Account | Amount (₹ INR) | Timestamp (UTC) |",
        f"| :--- | :--- | :--- | :--- | :--- |",
    ])

    for t in trail:
        md_lines.append(f"| {t['hop']} | `{t['source']}` | `{t['target']}` | {t['amount_formatted']} | {t['timestamp']} |")

    md_lines.extend([
        f"",
        f"## 5. MATHEMATICAL RISK ATTRIBUTION (SHAP)",
        f"| Risk Factor | Feature Value | Contribution Weight |",
        f"| :--- | :--- | :--- |",
    ])

    for s in alert.shap:
        md_lines.append(f"| {s.feature} | {s.value} | +{int(s.contribution * 100)}% |")

    md_lines.extend([
        f"",
        f"## 6. STATUTORY COMPLIANCE & LEGAL TRIGGERS",
    ])
    for trigger in statutory_triggers:
        md_lines.append(f"- {trigger}")

    md_lines.extend([
        f"",
        f"## 7. RECOMMENDED INVESTIGATOR ACTION PLAN",
    ])
    for action in recommended_actions:
        md_lines.append(f"1. {action}")

    raw_markdown = "\n".join(md_lines)

    return RegulatoryDossier(
        alert_id=alert.alert_id,
        case_ref=case_ref,
        generated_at=now_str,
        risk_level=risk_level,
        typology=alert.typology,
        total_amount_inr=alert.total_amount,
        total_amount_formatted=f"₹{alert.total_amount:,.2f}",
        participants_count=alert.n_accounts,
        transactions_count=alert.n_transactions,
        executive_summary=alert.narrative[:400] + "...",
        participant_breakdown=participants,
        chronological_trail=trail,
        shap_factors=[s.model_dump() for s in alert.shap],
        statutory_triggers=statutory_triggers,
        recommended_actions=recommended_actions,
        raw_markdown=raw_markdown,
    )

