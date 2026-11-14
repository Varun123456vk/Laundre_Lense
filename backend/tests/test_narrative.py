"""
Tests for Phase 8: Verified Investigator Narratives with Adversarial Number Checker.
Verifies:
1. Template generation across all 5 typologies.
2. Structured evidence payload generation conforming to frontend expectations.
3. Adversarial Number Checker accepting faithful numbers and rejecting hallucinated figures.
4. Reliable fallback to deterministic templates.
"""
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import pytest

from pipeline.detectors import CandidateCluster
from pipeline.narrative import (
    generate_narrative,
    generate_structured_evidence,
    generate_template_narrative,
    verify_narrative_numbers,
)


def _make_sample_cluster(typology: str, total_amount: float = 75000.0) -> CandidateCluster:
    t0 = datetime(2026, 11, 14, 10, 0, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(minutes=90)
    accounts = [f"ACC_{i}" for i in range(5)]
    roles = {
        "ACC_0": "entry" if typology != "fan_in" else "mule",
        "ACC_1": "hub" if typology == "fan_in" else "mule",
        "ACC_2": "mule",
        "ACC_3": "mule",
        "ACC_4": "exit" if typology in ("pass_through", "scatter_gather") else "mule",
    }
    labels = {acc: f"Label {acc}" for acc in accounts}
    edges = [
        {
            "id": f"tx_{i}",
            "source": accounts[i],
            "target": accounts[(i + 1) % len(accounts)],
            "amount": total_amount / 4,
            "ts": (t0 + timedelta(minutes=i * 20)).isoformat(),
        }
        for i in range(4)
    ]
    return CandidateCluster(
        candidate_id=f"c_{typology}",
        typology=typology,  # type: ignore[arg-type]
        entry_account="ACC_0",
        node_roles=roles,  # type: ignore[arg-type]
        node_labels=labels,
        edge_records=edges,
        total_amount=total_amount,
        first_ts=t0,
        last_ts=t1,
        n_accounts=5,
        n_transactions=4,
        ground_truth_laundering=True,
    )


def test_template_generation_all_5_typologies():
    """Verify templates produce expected keywords and formatted amounts for all 5 typologies."""
    for typo in ["fan_out", "fan_in", "scatter_gather", "cycle", "pass_through"]:
        c = _make_sample_cluster(typo, total_amount=120_000.0)
        ev = generate_structured_evidence(c)
        text = generate_template_narrative(c, ev)

        assert "$120,000.00" in text
        assert "2026-11-14" in text

        if typo == "fan_out":
            assert "fan-out" in text
            assert "outbound transfers" in text
        elif typo == "fan_in":
            assert "fan-in" in text
            assert "inbound deposits" in text
        elif typo == "scatter_gather":
            assert "scatter-gather" in text
            assert "reconverged" in text
        elif typo == "cycle":
            assert "cyclic" in text or "Cyclic" in text
            assert "circulated" in text
        elif typo == "pass_through":
            assert "pass-through" in text
            assert "retained" in text


def test_structured_evidence_payload():
    """Verify evidence keys match frontend contract needs."""
    # Cycle evidence
    c_cy = _make_sample_cluster("cycle", total_amount=50000.0)
    ev_cy = generate_structured_evidence(c_cy)
    assert "cycle_path" in ev_cy
    assert "amount_lost_in_cycle" in ev_cy
    assert ev_cy["total_amount"] == 50000.0

    # Pass-through evidence
    c_pt = _make_sample_cluster("pass_through", total_amount=80000.0)
    ev_pt = generate_structured_evidence(c_pt)
    assert "chain" in ev_pt
    assert "retention_pct" in ev_pt
    assert "entry" in ev_pt
    assert "exit" in ev_pt


def test_number_checker_accepts_valid_numbers():
    """Verify number checker accepts truthful template narrative text."""
    c = _make_sample_cluster("fan_out", total_amount=50000.0)
    ev = generate_structured_evidence(c)
    text = generate_template_narrative(c, ev)

    is_valid = verify_narrative_numbers(text, c, ev)
    assert is_valid is True


def test_number_checker_rejects_hallucinated_figures():
    """Verify number checker detects hallucinated dollar amounts or counts."""
    c = _make_sample_cluster("fan_out", total_amount=50000.0)
    ev = generate_structured_evidence(c)
    base_text = generate_template_narrative(c, ev)

    # Inject hallucinated monetary sum: $9,500,000
    bad_amount_text = base_text.replace("$50,000.00", "$9,500,000.00")
    assert verify_narrative_numbers(bad_amount_text, c, ev) is False

    # Inject hallucinated count: 88 distinct payees
    bad_count_text = base_text.replace("4 distinct payees", "88 distinct payees")
    assert verify_narrative_numbers(bad_count_text, c, ev) is False


def test_fallback_when_llm_hallucinates():
    """Verify pipeline falls back to deterministic template if LLM outputs invalid numbers."""
    c = _make_sample_cluster("cycle", total_amount=60000.0)

    # Mock an LLM that hallucinates an imaginary $8,000,000 transfer
    hallucinated_json = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": "A massive laundering ring was discovered transferring $8,000,000 across 99 offshore accounts."}
                    ]
                }
            }
        ]
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = hallucinated_json

    with patch("httpx.Client.post", return_value=mock_resp):
        narrative, source, ev = generate_narrative(c, use_llm=True, api_key="fake-test-key")

        # Must reject hallucination and fall back to template!
        assert source == "template"
        assert "$60,000.00" in narrative
        assert "$8,000,000" not in narrative

