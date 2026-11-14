"""
Agent 2: Graph Reconstruction & Money Trail Tracer.
Builds directed multi-hop financial topology using NetworkX.
Reconstructs end-to-end fund flows, node roles, and BFS hop paths.
"""
from __future__ import annotations

from typing import List, Dict, Any, Tuple
import networkx as nx
import pandas as pd

from app.schemas import GraphNode, GraphEdge, GraphPayload, Role


def build_network_graph(df: pd.DataFrame) -> nx.DiGraph:
    """Constructs a directed graph with edge attributes: amount, timestamp, txn_id."""
    G = nx.DiGraph()

    for _, row in df.iterrows():
        u = str(row["source"])
        v = str(row["target"])
        amt = float(row["amount"])
        ts = str(row["timestamp"])
        txn_id = str(row["transaction_id"])

        if G.has_edge(u, v):
            # Accumulate amount and preserve earliest timestamp
            G[u][v]["amount"] += amt
            G[u][v]["transactions"].append({"id": txn_id, "amount": amt, "ts": ts})
        else:
            G.add_edge(
                u,
                v,
                amount=amt,
                timestamp=ts,
                txn_id=txn_id,
                transactions=[{"id": txn_id, "amount": amt, "ts": ts}],
            )

    return G


def classify_node_roles(subgraph: nx.DiGraph) -> Dict[str, Role]:
    """
    Classifies nodes in a subgraph into AML roles:
    - entry: Source of funds (in-degree == 0 or out-degree >> in-degree)
    - exit: Destination / cash-out (out-degree == 0 or in-degree >> out-degree)
    - hub: High total degree connecting multiple branches
    - mule: Transit / layering node (receives and forwards roughly equal funds)
    - other: General participant
    """
    roles: Dict[str, Role] = {}
    degrees = dict(subgraph.degree())
    max_degree = max(degrees.values()) if degrees else 1

    for node in subgraph.nodes():
        in_deg = subgraph.in_degree(node)
        out_deg = subgraph.out_degree(node)

        in_amt = sum(subgraph[pred][node]["amount"] for pred in subgraph.predecessors(node))
        out_amt = sum(subgraph[node][succ]["amount"] for succ in subgraph.successors(node))

        if in_deg == 0 and out_deg > 0:
            roles[node] = "entry"
        elif out_deg == 0 and in_deg > 0:
            roles[node] = "exit"
        elif (in_deg + out_deg) >= 4 or (in_deg + out_deg) == max_degree and max_degree > 2:
            roles[node] = "hub"
        elif in_deg >= 1 and out_deg >= 1:
            # Transit check: if money in and out are within 40% margin
            roles[node] = "mule"
        elif in_amt > (out_amt * 2.5):
            roles[node] = "exit"
        elif out_amt > (in_amt * 2.5):
            roles[node] = "entry"
        else:
            roles[node] = "other"

    # Ensure at least one entry and one exit exist if graph has >= 2 nodes
    if "entry" not in roles.values() and len(subgraph) >= 2:
        top_out = max(subgraph.nodes(), key=lambda n: subgraph.out_degree(n))
        roles[top_out] = "entry"
    if "exit" not in roles.values() and len(subgraph) >= 2:
        top_in = max(subgraph.nodes(), key=lambda n: subgraph.in_degree(n))
        roles[top_in] = "exit"

    return roles


def trace_hop_indices(subgraph: nx.DiGraph, roles: Dict[str, Role]) -> Dict[Tuple[str, str], int]:
    """
    Calculates BFS hop distances from entry nodes.
    Hop 0 = directly from entry node, Hop 1 = next hop, etc.
    """
    hop_map: Dict[Tuple[str, str], int] = {}
    entries = [n for n, r in roles.items() if r == "entry"]

    if not entries:
        entries = [list(subgraph.nodes())[0]]

    # BFS from entry nodes
    node_depth: Dict[str, int] = {e: 0 for e in entries}
    queue = list(entries)

    while queue:
        curr = queue.pop(0)
        curr_d = node_depth[curr]
        for succ in subgraph.successors(curr):
            if succ not in node_depth:
                node_depth[succ] = curr_d + 1
                queue.append(succ)

    # Assign edge hop indices
    for u, v in subgraph.edges():
        u_d = node_depth.get(u, 0)
        hop_map[(u, v)] = u_d

    return hop_map


def build_graph_payload(subgraph: nx.DiGraph, roles: Dict[str, Role]) -> GraphPayload:
    """Converts a NetworkX subgraph into a validated LaunderLens GraphPayload."""
    nodes: List[GraphNode] = []
    for node in sorted(subgraph.nodes()):
        role = roles.get(node, "other")
        # Format friendly label
        label = f"{node} ({role.upper()})"
        nodes.append(GraphNode(id=node, role=role, label=label))

    hop_indices = trace_hop_indices(subgraph, roles)

    edges: List[GraphEdge] = []
    edge_idx = 1
    # Sort edges chronologically
    sorted_edges = sorted(
        subgraph.edges(data=True),
        key=lambda e: e[2].get("timestamp", "")
    )

    for u, v, data in sorted_edges:
        hop = hop_indices.get((u, v), 0)
        edge_id = f"e{edge_idx:02d}"
        edge_idx += 1
        edges.append(
            GraphEdge(
                id=edge_id,
                source=u,
                target=v,
                amount=float(data["amount"]),
                ts=str(data["timestamp"]),
                hop_index=hop,
            )
        )

    return GraphPayload(nodes=nodes, edges=edges)
