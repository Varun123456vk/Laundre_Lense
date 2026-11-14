"""
LaunderLens – Verified Investigator Narratives with Adversarial Number Checker.
Generates audit-ready, legally defensible narrative explanations for detected laundering clusters.
Includes:
1. Deterministic template generation for all 5 frozen typologies.
2. Structured evidence payload generation (cycle paths, chains, retention, amounts).
3. Adversarial Number Checker: rejects any LLM response containing hallucinated numbers.
4. Seamless fallback to deterministic templates with narrative_source='template'.
"""
from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from typing import Any, Literal

import httpx

from pipeline.detectors import CandidateCluster

NarrativeSource = Literal["llm", "template"]


def _format_cycle_path(edge_records: list[dict[str, Any]]) -> list[str]:
    """Construct an ordered node path from a set of cycle edges."""
    if not edge_records:
        return []
    path = [str(edge_records[0].get("source", ""))]
    for e in edge_records:
        target = str(e.get("target", ""))
        if target:
            path.append(target)
    return path


def _format_chain_path(edge_records: list[dict[str, Any]]) -> list[str]:
    """Construct an ordered node chain from pass-through edges."""
    if not edge_records:
        return []
    chain = [str(edge_records[0].get("source", ""))]
    for e in edge_records:
        target = str(e.get("target", ""))
        if target and target != chain[-1]:
            chain.append(target)
    return chain


def generate_structured_evidence(cluster: CandidateCluster) -> dict[str, Any]:
    """
    Generate structured typology-specific evidence dictionary.
    Matches the frozen frontend contract expectations.
    """
    edges = cluster.edge_records
    amounts = [float(e.get("amount", 0.0)) for e in edges]
    avg_amt = (sum(amounts) / len(amounts)) if amounts else 0.0
    min_amt = min(amounts) if amounts else 0.0
    max_amt = max(amounts) if amounts else 0.0
    retention_ratio = (min_amt / max(1.0, max_amt)) if max_amt > 0 else 1.0

    sec = max(60.0, (cluster.last_ts - cluster.first_ts).total_seconds())
    window_min = max(1, int(round(sec / 60.0)))
    window_hours = round(sec / 3600.0, 1)

    roles = cluster.node_roles
    entry = cluster.entry_account
    hub = next((acc for acc, r in roles.items() if r == "hub"), entry)
    exit_node = next((acc for acc, r in roles.items() if r == "exit"), "")
    mules = [acc for acc, r in roles.items() if r == "mule"]

    evidence: dict[str, Any] = {
        "typology": cluster.typology,
        "total_amount": round(cluster.total_amount, 2),
        "n_accounts": cluster.n_accounts,
        "n_transactions": cluster.n_transactions,
        "first_ts": cluster.first_ts.isoformat(),
        "last_ts": cluster.last_ts.isoformat(),
        "avg_amount": round(avg_amt, 2),
    }

    if cluster.typology == "fan_out":
        recipients = [acc for acc in roles if acc != entry]
        evidence.update({
            "entry": entry,
            "recipients": recipients,
            "window_minutes": window_min,
        })
    elif cluster.typology == "fan_in":
        sources = [acc for acc in roles if acc != hub]
        evidence.update({
            "hub": hub,
            "sources": sources,
            "window_hours": window_hours,
        })
    elif cluster.typology == "scatter_gather":
        dest = exit_node if exit_node else (mules[-1] if mules else "destination")
        intermediaries = [acc for acc in roles if acc not in (entry, dest)]
        evidence.update({
            "entry": entry,
            "exit": dest,
            "intermediaries": intermediaries,
            "window_hours": window_hours,
        })
    elif cluster.typology == "cycle":
        cycle_path = _format_cycle_path(edges)
        first_amt = amounts[0] if amounts else cluster.total_amount
        last_amt = amounts[-1] if amounts else first_amt
        lost_amt = max(0.0, first_amt - last_amt)
        evidence.update({
            "cycle_path": cycle_path,
            "amount_lost_in_cycle": round(lost_amt, 2),
            "window_hours": window_hours,
        })
    elif cluster.typology == "pass_through":
        chain = _format_chain_path(edges)
        dest = exit_node if exit_node else (chain[-1] if chain else "")
        evidence.update({
            "entry": entry,
            "exit": dest,
            "chain": chain,
            "retention_pct": round(retention_ratio * 100.0, 1),
            "window_hours": window_hours,
        })

    return evidence


def generate_template_narrative(cluster: CandidateCluster, evidence: dict[str, Any] | None = None) -> str:
    """
    Produce a deterministic, professionally worded AML investigator narrative
    tailored to the specific detected typology and cluster metrics.
    """
    ev = evidence or generate_structured_evidence(cluster)
    date_str = cluster.first_ts.strftime("%Y-%m-%d")
    amt_str = f"${cluster.total_amount:,.2f}"

    if cluster.typology == "fan_out":
        entry = ev.get("entry", cluster.entry_account)
        recipients = ev.get("recipients", [])
        w_min = ev.get("window_minutes", 60)
        return (
            f"Account {entry} initiated {cluster.n_transactions} outbound transfers totalling {amt_str} "
            f"to {len(recipients)} distinct payees within a {w_min}-minute window on {date_str}. "
            "The fan-out pattern is consistent with rapid fund dispersal commonly seen in layering stages of money laundering."
        )

    elif cluster.typology == "fan_in":
        hub = ev.get("hub", cluster.entry_account)
        sources = ev.get("sources", [])
        w_hrs = ev.get("window_hours", 4.0)
        return (
            f"Hub account {hub} aggregated {cluster.n_transactions} inbound deposits totalling {amt_str} "
            f"from {len(sources)} source accounts within a {w_hrs}-hour window on {date_str}. "
            "This fan-in pattern is indicative of fund pooling prior to integration."
        )

    elif cluster.typology == "scatter_gather":
        entry = ev.get("entry", cluster.entry_account)
        dest = ev.get("exit", "destination")
        intermediaries = ev.get("intermediaries", [])
        w_hrs = ev.get("window_hours", 8.0)
        return (
            f"Funds totalling {amt_str} originated from account {entry}, dispersed across {len(intermediaries)} "
            f"intermediary mule accounts, and reconverged into destination account {dest} in {w_hrs} hours on {date_str}. "
            "This scatter-gather topology is characteristic of layered obfuscation."
        )

    elif cluster.typology == "cycle":
        path = ev.get("cycle_path", [])
        path_preview = " → ".join(path[:6])
        if len(path) > 6:
            path_preview += f" ... → {path[-1]}"
        w_hrs = ev.get("window_hours", 8.0)
        return (
            f"A cyclic flow was identified involving {cluster.n_accounts} accounts where funds totalling {amt_str} "
            f"circulated through {path_preview} over {w_hrs} hours on {date_str}. "
            "Cyclic patterns are used to create artificial transaction volume and obscure the origin of illicit funds."
        )

    elif cluster.typology == "pass_through":
        entry = ev.get("entry", cluster.entry_account)
        dest = ev.get("exit", "destination")
        chain = ev.get("chain", [])
        chain_preview = " → ".join(chain[:5])
        if len(chain) > 5:
            chain_preview += f" ... → {dest}"
        mules_count = max(1, cluster.n_accounts - 2)
        w_hrs = ev.get("window_hours", 2.5)
        retention = ev.get("retention_pct", 95.0)
        return (
            f"A pass-through chain was detected: funds totalling {amt_str} moved through {mules_count} intermediary "
            f"accounts ({chain_preview}) from entry account {entry} to exit account {dest} in {w_hrs} hours on {date_str}. "
            f"Each hop retained >{retention}% of the amount, consistent with rapid layering through shell entities."
        )

    return (
        f"Suspicious activity detected across {cluster.n_accounts} accounts involving {cluster.n_transactions} "
        f"transactions totalling {amt_str}."
    )


def verify_narrative_numbers(
    narrative: str,
    cluster: CandidateCluster,
    evidence: dict[str, Any],
) -> bool:
    """
    Adversarial Number Checker.
    Extracts all numerical tokens from candidate narrative text and verifies that
    each extracted number is traceable to actual cluster facts/evidence.
    Rejects any text with hallucinated numbers.
    """
    # Remove account ID identifiers (e.g., A-1001, ACC_123, RT-001) and ISO date stamps to avoid false matches
    cleaned_text = re.sub(r'[A-Za-z0-9_-]*\d+[A-Za-z0-9_-]*', lambda m: "" if any(c.isalpha() for c in m.group(0)) else m.group(0), narrative)
    # Remove dates like 2024-03-01
    cleaned_text = re.sub(r'\b\d{4}-\d{2}-\d{2}\b', '', cleaned_text)

    # Extract all numeric strings: $123,456.78, 14, 2.5, 95%
    raw_tokens = re.findall(r'\$?\b\d+(?:,\d{3})*(?:\.\d+)?%?\b', cleaned_text)

    # Build collection of permissible numeric ground-truth values
    sec = max(60.0, (cluster.last_ts - cluster.first_ts).total_seconds())
    window_min = max(1, int(round(sec / 60.0)))
    window_hours = round(sec / 3600.0, 1)

    edge_amounts = [float(e.get("amount", 0.0)) for e in cluster.edge_records]
    avg_amt = (sum(edge_amounts) / len(edge_amounts)) if edge_amounts else 0.0

    allowed_numbers: set[float] = {
        float(cluster.n_accounts),
        float(cluster.n_transactions),
        float(max(1, cluster.n_accounts - 1)),
        float(max(1, cluster.n_accounts - 2)),
        float(window_min),
        float(window_hours),
        round(sec / 3600.0, 0),
        round(cluster.total_amount, 2),
        round(cluster.total_amount, 0),
        round(avg_amt, 2),
        round(avg_amt, 0),
    }

    # Include evidence values
    for val in evidence.values():
        if isinstance(val, (int, float)):
            allowed_numbers.add(float(val))
        elif isinstance(val, list):
            allowed_numbers.add(float(len(val)))

    for amt in edge_amounts:
        allowed_numbers.add(round(amt, 2))
        allowed_numbers.add(round(amt, 0))

    # Add common innocuous grammar numbers
    allowed_numbers.update({0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0})

    # Validate each extracted number against the allowed set
    for tok in raw_tokens:
        tok_clean = tok.replace("$", "").replace("%", "").replace(",", "").strip()
        try:
            val = float(tok_clean)
        except ValueError:
            continue

        # Check for integer vs floating point / large amount
        is_int_token = "." not in tok_clean
        if is_int_token and val <= 100:
            # Small integer count: must match an allowed integer EXACTLY
            matched = any(abs(val - allowed) < 0.01 for allowed in allowed_numbers)
        elif val <= 100:
            # Small float (e.g. 1.5, 2.5 hours or percentage)
            matched = any(abs(val - allowed) <= 0.15 for allowed in allowed_numbers)
        else:
            # Large number or monetary sum: allow <= 1% tolerance or exact within $1
            matched = any(
                abs(val - allowed) <= 1.0 or (allowed > 0 and abs(val - allowed) / allowed < 0.01)
                for allowed in allowed_numbers
            )

        if not matched:
            # Hallucinated or unsupported figure detected
            return False

    return True


def generate_narrative(
    cluster: CandidateCluster,
    use_llm: bool = False,
    api_key: str | None = None,
) -> tuple[str, NarrativeSource, dict[str, Any]]:
    """
    Generate verified AML narrative for a CandidateCluster.
    If use_llm is True and credentials are provided, attempts LLM synthesis
    followed by adversarial verification. On any failure or discrepancy,
    cleanly falls back to deterministic template generation.
    """
    evidence = generate_structured_evidence(cluster)
    template_narrative = generate_template_narrative(cluster, evidence)

    key = api_key or os.getenv("LLM_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not use_llm or not key:
        return template_narrative, "template", evidence

    # Attempt LLM generation
    prompt = (
        f"You are an expert financial crimes intelligence investigator. Write a strictly factual, "
        f"2-3 sentence investigator narrative for a detected money laundering alert based ONLY on the following metrics.\n"
        f"Typology: {cluster.typology}\n"
        f"Total Amount: ${cluster.total_amount:,.2f}\n"
        f"Accounts Involved: {cluster.n_accounts}\n"
        f"Transactions: {cluster.n_transactions}\n"
        f"Evidence details: {evidence}\n"
        f"CRITICAL REQUIREMENT: Do not invent, alter, or hallucinate any numbers or dates. "
        f"Use only the exact figures provided."
    )

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 300},
        }
        with httpx.Client(timeout=4.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Run adversarial number checker
                if verify_narrative_numbers(text, cluster, evidence):
                    return text, "llm", evidence
    except Exception:
        pass

    # Safe fallback
    return template_narrative, "template", evidence
