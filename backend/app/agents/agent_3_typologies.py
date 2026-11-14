"""
Agent 3: Typology & Anomaly Pattern Scout.
Scans reconstructed transaction subgraphs for high-risk money laundering typologies:
- Cycles (circular fund movement)
- Fan-out (smurfing / structuring dispersion)
- Fan-in (pooling / collection)
- Scatter-gather (layering via mules into single collector)
- Pass-through (rapid transit mule chains)
"""
from __future__ import annotations

from typing import List, Dict, Any
import networkx as nx

from app.schemas import Typology, Role
from app.agents.agent_types import PatternCandidate
from app.agents.agent_2_graph import classify_node_roles


def _find_cycles(G: nx.DiGraph) -> List[List[str]]:
    """Identifies circular loops of fund movement."""
    try:
        cycles = list(nx.simple_cycles(G))
        # Filter cycles with at least 2 nodes
        return [c for c in cycles if len(c) >= 2]
    except Exception:
        return []


def _detect_scatter_gather(G: nx.DiGraph, roles: Dict[str, Role]) -> bool:
    """Checks if funds start from 1 or 2 sources, scatter through mules, and gather at 1 exit."""
    entries = [n for n, r in roles.items() if r == "entry"]
    exits = [n for n, r in roles.items() if r == "exit"]
    mules = [n for n, r in roles.items() if r in ("mule", "hub", "other")]

    if 1 <= len(entries) <= 3 and 1 <= len(exits) <= 2 and len(mules) >= 2:
        return True
    return False


def _detect_pass_through(G: nx.DiGraph, roles: Dict[str, Role]) -> bool:
    """Checks for rapid linear chains with high pass-through."""
    mules = [n for n, r in roles.items() if r == "mule"]
    if len(mules) >= 1 and len(G.nodes()) >= 3:
        # Check longest simple path
        try:
            entries = [n for n, r in roles.items() if r == "entry"]
            exits = [n for n, r in roles.items() if r == "exit"]
            for e in entries:
                for x in exits:
                    if nx.has_path(G, e, x):
                        paths = list(nx.all_simple_paths(G, e, x, cutoff=6))
                        if any(len(p) >= 3 for p in paths):
                            return True
        except Exception:
            pass
    return False


def detect_patterns_in_graph(G: nx.DiGraph) -> List[PatternCandidate]:
    """
    Decomposes graph into weakly connected components and evaluates each component
    for suspicious AML typologies.
    """
    candidates: List[PatternCandidate] = []
    components = list(nx.weakly_connected_components(G))

    # Sort components by node count descending
    components = sorted(components, key=len, reverse=True)

    for comp_idx, comp_nodes in enumerate(components):
        if len(comp_nodes) < 2:
            continue

        subgraph = G.subgraph(comp_nodes).copy()
        roles = classify_node_roles(subgraph)

        # Collect edges and metrics
        txns: List[Dict[str, Any]] = []
        total_amount = 0.0
        timestamps: List[str] = []

        for u, v, data in subgraph.edges(data=True):
            amt = float(data["amount"])
            ts = str(data["timestamp"])
            total_amount += amt
            timestamps.append(ts)
            txns.append({
                "source": u,
                "target": v,
                "amount": amt,
                "timestamp": ts,
                "txn_id": data.get("txn_id", f"TX-{len(txns)+1}")
            })

        timestamps = sorted(timestamps)
        first_ts = timestamps[0] if timestamps else "2026-11-14T10:00:00Z"
        last_ts = timestamps[-1] if timestamps else "2026-11-14T12:00:00Z"

        # Check for AML patterns in priority order
        cycles = _find_cycles(subgraph)
        entries = [n for n, r in roles.items() if r == "entry"]
        exits = [n for n, r in roles.items() if r == "exit"]

        detected_typology: Typology = "pass_through"
        meta: Dict[str, Any] = {"component_id": comp_idx + 1}

        if len(cycles) > 0:
            detected_typology = "cycle"
            meta["cycles"] = cycles
            meta["cycle_count"] = len(cycles)
        elif _detect_scatter_gather(subgraph, roles):
            detected_typology = "scatter_gather"
            meta["layering_mules"] = [n for n, r in roles.items() if r == "mule"]
        elif len(entries) == 1 and len(exits) >= 3 and len(roles) >= 4:
            detected_typology = "fan_out"
            meta["dispersal_source"] = entries[0]
        elif len(exits) == 1 and len(entries) >= 3 and len(roles) >= 4:
            detected_typology = "fan_in"
            meta["collector_sink"] = exits[0]
        elif _detect_pass_through(subgraph, roles):
            detected_typology = "pass_through"
        else:
            # Heuristic decision based on degrees
            max_out = max(subgraph.out_degree(n) for n in subgraph.nodes())
            max_in = max(subgraph.in_degree(n) for n in subgraph.nodes())
            if max_out >= 3:
                detected_typology = "fan_out"
            elif max_in >= 3:
                detected_typology = "fan_in"
            else:
                detected_typology = "pass_through"

        candidates.append(
            PatternCandidate(
                typology=detected_typology,
                accounts=list(comp_nodes),
                roles=roles,
                transactions=txns,
                total_amount=total_amount,
                n_accounts=len(comp_nodes),
                n_transactions=len(txns),
                first_ts=first_ts,
                last_ts=last_ts,
                metadata=meta,
            )
        )

    return candidates

