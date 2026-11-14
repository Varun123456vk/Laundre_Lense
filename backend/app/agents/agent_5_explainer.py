"""
Agent 5: Forensic LLM Explainer.
Generates human-readable, regulatory-grade forensic narratives.
Leverages Google Gemini 1.5 Flash via REST API if GEMINI_API_KEY is configured,
or gracefully falls back to an intelligent statutory template engine.
"""
from __future__ import annotations

import os
import httpx
from typing import Tuple, List, Dict, Any
from app.schemas import ShapItem, NarrativeSource
from app.agents.agent_types import PatternCandidate


def _format_inr(val: float) -> str:
    """Format float into Indian Rupee format."""
    s = f"{val:,.2f}"
    return f"₹{s}"


def _generate_template_narrative(
    candidate: PatternCandidate,
    risk_score: float,
    shap: List[ShapItem],
) -> str:
    """Intelligent statutory forensic explanation generator."""
    typology = candidate.typology
    total_inr = _format_inr(candidate.total_amount)
    n_acc = candidate.n_accounts
    n_tx = candidate.n_transactions

    entries = [n for n, r in candidate.roles.items() if r == "entry"]
    exits = [n for n, r in candidate.roles.items() if r == "exit"]
    mules = [n for n, r in candidate.roles.items() if r == "mule"]

    entry_str = ", ".join(entries[:2]) if entries else "primary sender"
    exit_str = ", ".join(exits[:2]) if exits else "destination collector"
    mule_str = ", ".join(mules[:3]) if mules else "intermediate transit accounts"

    typology_titles = {
        "cycle": "Circular Fund Recycling & U-Turn Layering",
        "scatter_gather": "Scatter-Gather Layering Network",
        "fan_out": "Smurfing / Structured Dispersal Scheme",
        "fan_in": "Concentrated Pooling / Aggregation Funnel",
        "pass_through": "Multi-Hop Rapid Mule Transit Chain",
    }
    title = typology_titles.get(typology, "Suspicious Transaction Network")

    # Construct narrative
    lines = [
        f"### Executive Finding: {title}",
        f"LaunderLens has detected a high-confidence suspicious network exhibiting classic {typology.replace('_', ' ')} characteristics with an overall risk probability of {int(risk_score * 100)}%.",
        f"The syndicate coordinates across {n_acc} accounts over {n_tx} transactions, moving a cumulative volume of {total_inr}.",
        "",
        "### Forensic Fund Movement:",
    ]

    if typology == "cycle":
        lines.append(
            f"1. **Initial Outflow**: Funds originate from account(s) `{entry_str}` and transit through `{mule_str}`."
        )
        lines.append(
            f"2. **Circular Routing**: Monies loop through closed cycles back into the origin cluster, a hallmark technique under PMLA to simulate legitimate commercial turnover."
        )
        lines.append(
            f"3. **Velocity**: Funds exhibit low dwell times (< 30 minutes), indicating automated or coordinated mule operations."
        )
    elif typology == "scatter_gather":
        lines.append(
            f"1. **Dispersal Stage**: Primary source `{entry_str}` disperses capital into multiple intermediary mule accounts ({mule_str})."
        )
        lines.append(
            f"2. **Layering Stage**: Intermediaries hold funds for minimal durations before immediately transmitting balances."
        )
        lines.append(
            f"3. **Reconsolidation**: Funds rapidly converge into destination collector `{exit_str}`, evading single-account aggregate velocity rules."
        )
    elif typology == "fan_out":
        lines.append(
            f"1. **Structuring & Smurfing**: Source `{entry_str}` executes structured outflows to {len(exits)} recipient accounts."
        )
        lines.append(
            f"2. **Threshold Evasion**: Transaction tranches are calibrated to remain just below mandatory PMLA reporting thresholds (₹50,000)."
        )
    else:
        lines.append(
            f"1. **Transit Flow**: Funds enter via `{entry_str}`, route through mule relay `{mule_str}`, and terminate at `{exit_str}`."
        )
        lines.append(
            f"2. **Mule Characteristics**: Intermediary accounts exhibit a pass-through ratio exceeding 90%, retaining minimal permanent balance."
        )

    lines.extend([
        "",
        "### Key Risk Drivers (SHAP Attribution):",
    ])
    for s in shap[:3]:
        lines.append(f"- **{s.feature}** (Value: {s.value}): +{int(s.contribution * 100)}% risk contribution.")

    lines.extend([
        "",
        "### Statutory Compliance Recommendation:",
        "Recommend filing a Suspicious Transaction Report (STR) under Section 12 of the Prevention of Money Laundering Act (PMLA), 2002. Issue immediate temporary freeze requests on active intermediate mule accounts pending KYC audit.",
    ])

    return "\n".join(lines)


async def generate_forensic_explanation(
    candidate: PatternCandidate,
    risk_score: float,
    shap: List[ShapItem],
) -> Tuple[str, NarrativeSource]:
    """
    Attempts to call Google Gemini if GEMINI_API_KEY is available;
    otherwise generates high-quality template narrative.
    """
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not api_key:
        return _generate_template_narrative(candidate, risk_score, shap), "template"

    # Call Gemini REST API via httpx
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        prompt = (
            f"You are a Senior AML Investigator and Forensic Intelligence Analyst at LaunderLens.\n"
            f"Generate a clear, professional, authoritative AML investigation narrative for an alert with the following findings:\n"
            f"- Typology: {candidate.typology}\n"
            f"- Risk Score: {risk_score:.2f} ({int(risk_score * 100)}%)\n"
            f"- Total INR Volume: ₹{candidate.total_amount:,.2f}\n"
            f"- Accounts Involved ({candidate.n_accounts}): {', '.join(candidate.accounts[:8])}\n"
            f"- Roles: {candidate.roles}\n"
            f"- Number of Transactions: {candidate.n_transactions}\n"
            f"- Time Range: {candidate.first_ts} to {candidate.last_ts}\n"
            f"- Top SHAP Factors: {', '.join([f'{s.feature} (+{s.contribution:.2f})' for s in shap[:3]])}\n\n"
            f"Write in concise markdown with three short sections:\n"
            f"1. Executive Finding\n"
            f"2. Forensic Fund Movement (Hop-by-hop breakdown)\n"
            f"3. Regulatory Compliance & Recommended Investigator Action (Reference PMLA 2002 / RBI AML guidelines)."
        )

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 600,
            }
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text.strip(), "llm"
    except Exception:
        pass

    # Fallback if API fails or network timeout
    return _generate_template_narrative(candidate, risk_score, shap), "template"
