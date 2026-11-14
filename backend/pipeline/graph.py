"""
LaunderLens – Temporal Graph Builder.
Converts tabular transaction DataFrames into directed MultiDiGraphs with temporal edge attributes.
Computes BFS hop indices with timestamp tie-breaking.
"""
from __future__ import annotations

from collections import deque
from typing import Any

import networkx as nx
import pandas as pd

from pipeline.config import (
    COL_AMOUNT,
    COL_FROM,
    COL_IS_LAUNDERING,
    COL_RING_ID,
    COL_TIMESTAMP,
    COL_TO,
    COL_TX_ID,
)


def build_transaction_graph(df: pd.DataFrame) -> nx.MultiDiGraph:
    """
    Construct a directed multi-graph from normalized transactions.
    Nodes are accounts; edges represent individual transactions with attributes:
      - tx_id: unique transaction ID
      - amount: transfer amount
      - timestamp: UTC datetime
      - is_laundering: ground truth label (1 or 0)
      - ring_id: ground truth ring ID (if any)
    """
    G = nx.MultiDiGraph()

    for _, row in df.iterrows():
        u = str(row[COL_FROM])
        v = str(row[COL_TO])
        edge_data = {
            "tx_id": str(row[COL_TX_ID]),
            "amount": float(row[COL_AMOUNT]),
            "timestamp": row[COL_TIMESTAMP],
            "is_laundering": int(row.get(COL_IS_LAUNDERING, 0)),
            "ring_id": row.get(COL_RING_ID),
        }
        G.add_edge(u, v, key=edge_data["tx_id"], **edge_data)

    return G


def compute_edge_hop_indices(
    entry_id: str,
    edges: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Compute hop_index for each edge in a cluster.
    Per frozen API contract:
      "hop_index = BFS distance from the entry account, ties by timestamp"

    Algorithm:
      1. Build local directed adjacency from cluster edges.
      2. Compute node BFS distances from entry_id (entry_id = distance 0).
      3. An edge (u -> v) has hop_index = node_dist[u] + 1.
         If u is unreachable from entry_id, hop_index defaults to 1.
      4. Ties broken by timestamp in ascending order.
    """
    if not edges:
        return []

    # Build local adjacency
    adj: dict[str, list[str]] = {}
    nodes: set[str] = set()
    for e in edges:
        u = e["source"]
        v = e["target"]
        nodes.add(u)
        nodes.add(v)
        adj.setdefault(u, []).append(v)

    # BFS from entry_id to determine shortest distance to all nodes
    node_dist: dict[str, int] = {entry_id: 0}
    queue: deque[str] = deque([entry_id])

    while queue:
        curr = queue.popleft()
        d = node_dist[curr]
        for neighbor in adj.get(curr, []):
            if neighbor not in node_dist:
                node_dist[neighbor] = d + 1
                queue.append(neighbor)

    # Assign hop_index to each edge
    annotated: list[dict[str, Any]] = []
    for e in edges:
        e_copy = dict(e)
        u = e_copy["source"]
        # Source node distance determines base hop
        u_dist = node_dist.get(u, 0)
        e_copy["hop_index"] = max(1, u_dist + 1)
        annotated.append(e_copy)

    # Sort edges: primary by hop_index ascending, ties broken by timestamp
    annotated.sort(key=lambda x: (x["hop_index"], str(x["ts"])))
    return annotated

