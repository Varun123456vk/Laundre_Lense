"""
LaunderLens – Motif Detectors (Phase 4).
Detects 4 primary graph typologies:
  1. fan_out
  2. fan_in
  3. scatter_gather
  4. pass_through
(Cycle detection is in Phase 5).

Assigns investigator roles: 'entry', 'hub', 'mule', 'exit', 'other'.
Computes BFS hop_index from the entry node with timestamp tie-breaking.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

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
    FAN_IN_MAX_WINDOW_HOURS,
    FAN_IN_MIN_SOURCES,
    FAN_IN_MIN_TOTAL_AMOUNT,
    FAN_OUT_MAX_WINDOW_HOURS,
    FAN_OUT_MIN_TARGETS,
    FAN_OUT_MIN_TOTAL_AMOUNT,
    PASS_THROUGH_MAX_HOPS,
    PASS_THROUGH_MAX_WINDOW_HOURS,
    PASS_THROUGH_MIN_HOPS,
    PASS_THROUGH_MIN_RETENTION,
    SCATTER_GATHER_MAX_WINDOW_HOURS,
    SCATTER_GATHER_MIN_AMOUNT,
    SCATTER_GATHER_MIN_INTERMEDIARIES,
)
from pipeline.graph import compute_edge_hop_indices
from app.schemas import GraphEdge, GraphNode, GraphPayload

Typology = Literal["fan_out", "fan_in", "scatter_gather", "cycle", "pass_through"]
Role = Literal["entry", "hub", "mule", "exit", "other"]


@dataclass
class CandidateCluster:
    candidate_id: str
    typology: Typology
    entry_account: str
    node_roles: dict[str, Role]
    node_labels: dict[str, str]
    edge_records: list[dict[str, Any]]
    total_amount: float
    first_ts: datetime
    last_ts: datetime
    n_accounts: int
    n_transactions: int
    # Evaluation ground truth (NOT used as feature in LightGBM model)
    ground_truth_laundering: bool = False
    ground_truth_ring_id: str | None = None

    def to_graph_payload(self) -> GraphPayload:
        """Convert candidate cluster to Frozen API contract GraphPayload."""
        nodes = [
            GraphNode(id=nid, role=self.node_roles.get(nid, "other"), label=self.node_labels.get(nid, nid))
            for nid in self.node_roles
        ]
        annotated_edges = compute_edge_hop_indices(self.entry_account, self.edge_records)
        edges = [
            GraphEdge(
                id=e["id"],
                source=e["source"],
                target=e["target"],
                amount=float(e["amount"]),
                ts=e["ts"] if e["ts"].endswith("Z") else e["ts"] + "Z",
                hop_index=e["hop_index"],
            )
            for e in annotated_edges
        ]
        return GraphPayload(nodes=nodes, edges=edges)


def _format_ts_utc(ts: pd.Timestamp | datetime) -> str:
    """Format timestamp to UTC ISO 8601 with trailing Z."""
    if isinstance(ts, pd.Timestamp):
        ts = ts.to_pydatetime()
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    else:
        ts = ts.astimezone(timezone.utc)
    return ts.strftime("%Y-%m-%dT%H:%M:%SZ")


# ──────────────────────────────────────────────
#  1. Fan-Out Detector
# ──────────────────────────────────────────────

def detect_fan_out(df: pd.DataFrame) -> list[CandidateCluster]:
    """
    Detect fan_out motifs: Single entry account rapidly disperses funds to
    >= FAN_OUT_MIN_TARGETS distinct recipients within FAN_OUT_MAX_WINDOW_HOURS.
    """
    candidates: list[CandidateCluster] = []
    max_delta = timedelta(hours=FAN_OUT_MAX_WINDOW_HOURS)

    grouped = df.groupby(COL_FROM)
    for sender, group in grouped:
        if len(group) < FAN_OUT_MIN_TARGETS:
            continue

        sorted_txs = group.sort_values(by=COL_TIMESTAMP).to_dict("records")
        n = len(sorted_txs)

        # Sliding window over outgoing transfers
        i = 0
        while i < n:
            window_txs = [sorted_txs[i]]
            j = i + 1
            while j < n and (sorted_txs[j][COL_TIMESTAMP] - sorted_txs[i][COL_TIMESTAMP]) <= max_delta:
                window_txs.append(sorted_txs[j])
                j += 1

            targets = {tx[COL_TO] for tx in window_txs}
            tot_amt = sum(tx[COL_AMOUNT] for tx in window_txs)

            if len(targets) >= FAN_OUT_MIN_TARGETS and tot_amt >= FAN_OUT_MIN_TOTAL_AMOUNT:
                cand_id = f"cand_fo_{sender}_{len(candidates)+1}"
                sender_str = str(sender)

                node_roles: dict[str, Role] = {sender_str: "entry"}
                node_labels: dict[str, str] = {sender_str: f"Dispersal Entry ({sender_str})"}

                for idx, t in enumerate(targets):
                    t_str = str(t)
                    node_roles[t_str] = "mule" if idx < len(targets) - 1 else "exit"
                    node_labels[t_str] = f"Payee {idx+1} ({t_str})"

                edge_recs = [
                    {
                        "id": str(tx[COL_TX_ID]),
                        "source": str(tx[COL_FROM]),
                        "target": str(tx[COL_TO]),
                        "amount": float(tx[COL_AMOUNT]),
                        "ts": _format_ts_utc(tx[COL_TIMESTAMP]),
                    }
                    for tx in window_txs
                ]

                first_ts = window_txs[0][COL_TIMESTAMP].to_pydatetime()
                last_ts = window_txs[-1][COL_TIMESTAMP].to_pydatetime()

                # Ground truth check
                gt_laundering = any(tx.get(COL_IS_LAUNDERING, 0) == 1 for tx in window_txs)
                ring_ids = [tx.get(COL_RING_ID) for tx in window_txs if tx.get(COL_RING_ID)]
                gt_ring = ring_ids[0] if ring_ids else None

                cand = CandidateCluster(
                    candidate_id=cand_id,
                    typology="fan_out",
                    entry_account=sender_str,
                    node_roles=node_roles,
                    node_labels=node_labels,
                    edge_records=edge_recs,
                    total_amount=round(tot_amt, 2),
                    first_ts=first_ts,
                    last_ts=last_ts,
                    n_accounts=len(node_roles),
                    n_transactions=len(edge_recs),
                    ground_truth_laundering=gt_laundering,
                    ground_truth_ring_id=gt_ring,
                )
                candidates.append(cand)
                i = j  # advance past this cluster to avoid near-duplicate windows
            else:
                i += 1

    return candidates


# ──────────────────────────────────────────────
#  2. Fan-In Detector
# ──────────────────────────────────────────────

def detect_fan_in(df: pd.DataFrame) -> list[CandidateCluster]:
    """
    Detect fan_in motifs: Multiple sources consolidate funds into a single hub
    within FAN_IN_MAX_WINDOW_HOURS.
    """
    candidates: list[CandidateCluster] = []
    max_delta = timedelta(hours=FAN_IN_MAX_WINDOW_HOURS)

    grouped = df.groupby(COL_TO)
    for receiver, group in grouped:
        if len(group) < FAN_IN_MIN_SOURCES:
            continue

        sorted_txs = group.sort_values(by=COL_TIMESTAMP).to_dict("records")
        n = len(sorted_txs)

        i = 0
        while i < n:
            window_txs = [sorted_txs[i]]
            j = i + 1
            while j < n and (sorted_txs[j][COL_TIMESTAMP] - sorted_txs[i][COL_TIMESTAMP]) <= max_delta:
                window_txs.append(sorted_txs[j])
                j += 1

            sources = {tx[COL_FROM] for tx in window_txs}
            tot_amt = sum(tx[COL_AMOUNT] for tx in window_txs)

            if len(sources) >= FAN_IN_MIN_SOURCES and tot_amt >= FAN_IN_MIN_TOTAL_AMOUNT:
                cand_id = f"cand_fi_{receiver}_{len(candidates)+1}"
                recv_str = str(receiver)

                node_roles: dict[str, Role] = {recv_str: "hub"}
                node_labels: dict[str, str] = {recv_str: f"Aggregation Hub ({recv_str})"}

                # Pick earliest sender as entry for BFS ordering
                earliest_sender = str(window_txs[0][COL_FROM])

                for idx, s in enumerate(sources):
                    s_str = str(s)
                    node_roles[s_str] = "entry" if s_str == earliest_sender else "mule"
                    node_labels[s_str] = f"Source {idx+1} ({s_str})"

                edge_recs = [
                    {
                        "id": str(tx[COL_TX_ID]),
                        "source": str(tx[COL_FROM]),
                        "target": str(tx[COL_TO]),
                        "amount": float(tx[COL_AMOUNT]),
                        "ts": _format_ts_utc(tx[COL_TIMESTAMP]),
                    }
                    for tx in window_txs
                ]

                first_ts = window_txs[0][COL_TIMESTAMP].to_pydatetime()
                last_ts = window_txs[-1][COL_TIMESTAMP].to_pydatetime()

                gt_laundering = any(tx.get(COL_IS_LAUNDERING, 0) == 1 for tx in window_txs)
                ring_ids = [tx.get(COL_RING_ID) for tx in window_txs if tx.get(COL_RING_ID)]
                gt_ring = ring_ids[0] if ring_ids else None

                cand = CandidateCluster(
                    candidate_id=cand_id,
                    typology="fan_in",
                    entry_account=earliest_sender,
                    node_roles=node_roles,
                    node_labels=node_labels,
                    edge_records=edge_recs,
                    total_amount=round(tot_amt, 2),
                    first_ts=first_ts,
                    last_ts=last_ts,
                    n_accounts=len(node_roles),
                    n_transactions=len(edge_recs),
                    ground_truth_laundering=gt_laundering,
                    ground_truth_ring_id=gt_ring,
                )
                candidates.append(cand)
                i = j
            else:
                i += 1

    return candidates


# ──────────────────────────────────────────────
#  3. Scatter-Gather Detector
# ──────────────────────────────────────────────

def detect_scatter_gather(df: pd.DataFrame) -> list[CandidateCluster]:
    """
    Detect scatter_gather motifs: Source S disperses to >= SCATTER_GATHER_MIN_INTERMEDIARIES
    intermediary accounts, which subsequently consolidate into destination D
    within SCATTER_GATHER_MAX_WINDOW_HOURS.
    """
    candidates: list[CandidateCluster] = []
    if df.empty:
        return candidates

    df = df.copy()
    if COL_RING_ID not in df.columns:
        df[COL_RING_ID] = None
    if COL_IS_LAUNDERING not in df.columns:
        df[COL_IS_LAUNDERING] = 0

    max_window_secs = SCATTER_GATHER_MAX_WINDOW_HOURS * 3600

    cols = [COL_TX_ID, COL_FROM, COL_TO, COL_TIMESTAMP, COL_AMOUNT, COL_IS_LAUNDERING, COL_RING_ID]
    sub = df[cols].copy()

    # Self-join on intermediate account M (sub1.to == sub2.from)
    merged = pd.merge(
        sub,
        sub,
        left_on=COL_TO,
        right_on=COL_FROM,
        suffixes=("_in", "_out"),
    )

    if merged.empty:
        return candidates

    # Filter out self-cycles: S != D
    merged = merged[merged[f"{COL_FROM}_in"] != merged[f"{COL_TO}_out"]].copy()

    # Time constraint: t_out > t_in and time_diff <= max_window
    time_diff = (merged[f"{COL_TIMESTAMP}_out"] - merged[f"{COL_TIMESTAMP}_in"]).dt.total_seconds()
    valid_pairs = merged[(time_diff > 0) & (time_diff <= max_window_secs)].copy()

    if valid_pairs.empty:
        return candidates

    # Group by (Source, Destination)
    pair_grouped = valid_pairs.groupby([f"{COL_FROM}_in", f"{COL_TO}_out"])

    for (source, dest), group in pair_grouped:
        intermediaries = set(group[f"{COL_TO}_in"].unique())
        if len(intermediaries) < SCATTER_GATHER_MIN_INTERMEDIARIES:
            continue

        # Extract all participating in-edges and out-edges
        tx_in_ids = set(group[f"{COL_TX_ID}_in"].unique())
        tx_out_ids = set(group[f"{COL_TX_ID}_out"].unique())
        all_tx_ids = tx_in_ids | tx_out_ids

        cluster_txs = df[df[COL_TX_ID].isin(all_tx_ids)].sort_values(by=COL_TIMESTAMP)
        tot_amt = cluster_txs[COL_AMOUNT].sum()

        if tot_amt < SCATTER_GATHER_MIN_AMOUNT:
            continue

        cand_id = f"cand_sg_{source}_{dest}_{len(candidates)+1}"
        src_str = str(source)
        dst_str = str(dest)

        node_roles: dict[str, Role] = {
            src_str: "entry",
            dst_str: "exit",
        }
        node_labels: dict[str, str] = {
            src_str: f"Scatter Source ({src_str})",
            dst_str: f"Gather Target ({dst_str})",
        }

        for idx, mid in enumerate(intermediaries):
            mid_str = str(mid)
            node_roles[mid_str] = "mule"
            node_labels[mid_str] = f"Intermediary {idx+1} ({mid_str})"

        edge_recs = [
            {
                "id": str(r[COL_TX_ID]),
                "source": str(r[COL_FROM]),
                "target": str(r[COL_TO]),
                "amount": float(r[COL_AMOUNT]),
                "ts": _format_ts_utc(r[COL_TIMESTAMP]),
            }
            for _, r in cluster_txs.iterrows()
        ]

        first_ts = cluster_txs.iloc[0][COL_TIMESTAMP].to_pydatetime()
        last_ts = cluster_txs.iloc[-1][COL_TIMESTAMP].to_pydatetime()

        gt_laundering = (cluster_txs[COL_IS_LAUNDERING] == 1).any()
        ring_ids = cluster_txs[COL_RING_ID].dropna().tolist()
        gt_ring = ring_ids[0] if ring_ids else None

        cand = CandidateCluster(
            candidate_id=cand_id,
            typology="scatter_gather",
            entry_account=src_str,
            node_roles=node_roles,
            node_labels=node_labels,
            edge_records=edge_recs,
            total_amount=round(float(tot_amt), 2),
            first_ts=first_ts,
            last_ts=last_ts,
            n_accounts=len(node_roles),
            n_transactions=len(edge_recs),
            ground_truth_laundering=bool(gt_laundering),
            ground_truth_ring_id=gt_ring,
        )
        candidates.append(cand)

    return candidates


# ──────────────────────────────────────────────
#  4. Pass-Through Detector
# ──────────────────────────────────────────────

def detect_pass_through(df: pd.DataFrame, G: nx.MultiDiGraph | None = None) -> list[CandidateCluster]:
    """
    Detect pass_through motifs: Linear layering chain (>= 3 hops) where
    intermediaries forward funds in rapid succession retaining >= 85% of amount.
    """
    candidates: list[CandidateCluster] = []
    if df.empty:
        return candidates

    df = df.copy()
    if COL_RING_ID not in df.columns:
        df[COL_RING_ID] = None
    if COL_IS_LAUNDERING not in df.columns:
        df[COL_IS_LAUNDERING] = 0

    max_hop_delta = timedelta(hours=PASS_THROUGH_MAX_WINDOW_HOURS)

    # Group incoming and outgoing transfers by account
    in_txs = df.groupby(COL_TO)
    out_txs = df.groupby(COL_FROM)

    common_accounts = set(in_txs.groups.keys()) & set(out_txs.groups.keys())
    if not common_accounts:
        return candidates

    # Index valid pass-through pairs by intermediary node:
    # node -> list of (incoming_tx, outgoing_tx)
    node_pairs: dict[str, list[tuple[dict[str, Any], dict[str, Any]]]] = {}

    for mid in common_accounts:
        in_group = in_txs.get_group(mid).sort_values(by=COL_TIMESTAMP).to_dict("records")
        out_group = out_txs.get_group(mid).sort_values(by=COL_TIMESTAMP).to_dict("records")

        for tin in in_group:
            amt_in = tin[COL_AMOUNT]
            t_in = tin[COL_TIMESTAMP]
            for tout in out_group:
                t_out = tout[COL_TIMESTAMP]
                if t_out <= t_in:
                    continue
                if (t_out - t_in) > max_hop_delta:
                    break

                amt_out = tout[COL_AMOUNT]
                # Check high amount retention
                if amt_in > 0 and PASS_THROUGH_MIN_RETENTION <= (amt_out / amt_in) <= 1.15:
                    node_pairs.setdefault(str(mid), []).append((tin, tout))

    visited_chains: set[str] = set()

    # Trace chains starting from each intermediate node's pass-through pair
    for mid_start, pairs in node_pairs.items():
        for tin_0, tout_0 in pairs:
            # We have 2 hops: (tin_0.from -> mid_start) and (mid_start -> tout_0.to)
            chain_txs = [tin_0, tout_0]
            curr_target = str(tout_0[COL_TO])

            # Extend chain forward
            while len(chain_txs) < PASS_THROUGH_MAX_HOPS:
                # Next intermediate is curr_target
                next_pairs = node_pairs.get(curr_target, [])
                matching_tout = None
                for tin_next, tout_next in next_pairs:
                    # The incoming transfer to curr_target must be our last outgoing transfer
                    if tin_next[COL_TX_ID] == chain_txs[-1][COL_TX_ID]:
                        matching_tout = tout_next
                        break

                if matching_tout is not None:
                    chain_txs.append(matching_tout)
                    curr_target = str(matching_tout[COL_TO])
                else:
                    break

            # Number of hops = number of edges (transactions)
            n_hops = len(chain_txs)
            if n_hops >= PASS_THROUGH_MIN_HOPS:
                chain_key = "-".join(str(tx[COL_TX_ID]) for tx in chain_txs)
                if chain_key in visited_chains:
                    continue
                visited_chains.add(chain_key)

                entry_node = str(chain_txs[0][COL_FROM])
                exit_node = str(chain_txs[-1][COL_TO])

                node_roles: dict[str, Role] = {entry_node: "entry", exit_node: "exit"}
                node_labels: dict[str, str] = {
                    entry_node: f"Origin Entry ({entry_node})",
                    exit_node: f"Destination Exit ({exit_node})",
                }

                # Intermediate nodes
                for idx, tx in enumerate(chain_txs[:-1]):
                    mid_node = str(tx[COL_TO])
                    if mid_node not in node_roles:
                        node_roles[mid_node] = "mule"
                        node_labels[mid_node] = f"Pass-Through Mule {idx+1} ({mid_node})"

                edge_recs = [
                    {
                        "id": str(tx[COL_TX_ID]),
                        "source": str(tx[COL_FROM]),
                        "target": str(tx[COL_TO]),
                        "amount": float(tx[COL_AMOUNT]),
                        "ts": _format_ts_utc(tx[COL_TIMESTAMP]),
                    }
                    for tx in chain_txs
                ]

                tot_amt = sum(tx[COL_AMOUNT] for tx in chain_txs)
                first_ts = chain_txs[0][COL_TIMESTAMP].to_pydatetime()
                last_ts = chain_txs[-1][COL_TIMESTAMP].to_pydatetime()

                gt_laundering = any(tx.get(COL_IS_LAUNDERING, 0) == 1 for tx in chain_txs)
                ring_ids = [tx.get(COL_RING_ID) for tx in chain_txs if tx.get(COL_RING_ID)]
                gt_ring = ring_ids[0] if ring_ids else None

                cand = CandidateCluster(
                    candidate_id=f"cand_pt_{entry_node}_{len(candidates)+1}",
                    typology="pass_through",
                    entry_account=entry_node,
                    node_roles=node_roles,
                    node_labels=node_labels,
                    edge_records=edge_recs,
                    total_amount=round(float(tot_amt), 2),
                    first_ts=first_ts,
                    last_ts=last_ts,
                    n_accounts=len(node_roles),
                    n_transactions=len(edge_recs),
                    ground_truth_laundering=gt_laundering,
                    ground_truth_ring_id=gt_ring,
                )
                candidates.append(cand)

    return candidates


# ──────────────────────────────────────────────
#  5. Bounded Temporal Cycle Detector
# ──────────────────────────────────────────────

def detect_cycles(
    df: pd.DataFrame,
    G: nx.MultiDiGraph | None = None,
) -> list[CandidateCluster]:
    """
    Detect bounded temporal cycle motifs: Directed cycles (3 <= length <= 6)
    where money moves strictly chronologically (t_1 < t_2 < ... < t_L) within
    CYCLE_MAX_WINDOW_HOURS (24h) and amount retention >= CYCLE_MIN_RETENTION (80%).
    """
    from pipeline.config import (
        CYCLE_MAX_LENGTH,
        CYCLE_MAX_WINDOW_HOURS,
        CYCLE_MIN_LENGTH,
        CYCLE_MIN_RETENTION,
    )

    candidates: list[CandidateCluster] = []
    if df.empty:
        return candidates

    df = df.copy()
    if COL_RING_ID not in df.columns:
        df[COL_RING_ID] = None
    if COL_IS_LAUNDERING not in df.columns:
        df[COL_IS_LAUNDERING] = 0

    max_window_secs = CYCLE_MAX_WINDOW_HOURS * 3600

    # Build adjacency mapping: sender -> list of outgoing edge dictionaries sorted by timestamp
    out_map: dict[str, list[dict[str, Any]]] = {}
    for r in df.sort_values(by=COL_TIMESTAMP).to_dict("records"):
        src = str(r[COL_FROM])
        out_map.setdefault(src, []).append(r)

    visited_cycle_keys: set[str] = set()

    # Search for temporal cycles starting from each node's outgoing transfers
    for start_node, out_edges in out_map.items():
        for e_start in out_edges:
            t_start = e_start[COL_TIMESTAMP]
            amt_start = e_start[COL_AMOUNT]
            if amt_start <= 0:
                continue

            target_1 = str(e_start[COL_TO])
            if target_1 == start_node:
                continue  # ignore self-loops

            # State stack: (current_node, current_path, visited_nodes)
            stack: list[tuple[str, list[dict[str, Any]], set[str]]] = [
                (target_1, [e_start], {start_node, target_1})
            ]

            while stack:
                curr_node, path, visited_nodes = stack.pop()
                last_tx = path[-1]
                t_last = last_tx[COL_TIMESTAMP]
                path_len = len(path)

                # Look for outgoing edges from curr_node
                for next_e in out_map.get(curr_node, []):
                    t_next = next_e[COL_TIMESTAMP]
                    # Chronological progression
                    if t_next <= t_last:
                        continue

                    # Window constraint from cycle origin
                    elapsed_secs = (t_next - t_start).total_seconds()
                    if elapsed_secs > max_window_secs:
                        break  # out_edges are sorted by timestamp

                    amt_next = next_e[COL_AMOUNT]
                    retention = amt_next / amt_start
                    # Amount retention / friction bounds
                    if retention < CYCLE_MIN_RETENTION or retention > 1.25:
                        continue

                    next_target = str(next_e[COL_TO])

                    # Check if cycle closes back to start_node
                    if next_target == start_node:
                        cycle_length = path_len + 1  # number of edges in cycle
                        if CYCLE_MIN_LENGTH <= cycle_length <= CYCLE_MAX_LENGTH:
                            full_cycle = path + [next_e]
                            cycle_tx_ids = sorted(str(tx[COL_TX_ID]) for tx in full_cycle)
                            cycle_key = "-".join(cycle_tx_ids)

                            if cycle_key not in visited_cycle_keys:
                                visited_cycle_keys.add(cycle_key)

                                cand_id = f"cand_cy_{start_node}_{len(candidates)+1}"
                                exit_node = str(next_e[COL_FROM])

                                node_roles: dict[str, Role] = {
                                    start_node: "entry",
                                    exit_node: "exit",
                                }
                                node_labels: dict[str, str] = {
                                    start_node: f"Cycle Origin ({start_node})",
                                    exit_node: f"Cycle Return ({exit_node})",
                                }

                                # Intermediate nodes
                                for idx, tx in enumerate(full_cycle[:-1]):
                                    mid_acc = str(tx[COL_TO])
                                    if mid_acc not in node_roles:
                                        node_roles[mid_acc] = "mule"
                                        node_labels[mid_acc] = f"Cycle Intermediary {idx+1} ({mid_acc})"

                                edge_recs = [
                                    {
                                        "id": str(tx[COL_TX_ID]),
                                        "source": str(tx[COL_FROM]),
                                        "target": str(tx[COL_TO]),
                                        "amount": float(tx[COL_AMOUNT]),
                                        "ts": _format_ts_utc(tx[COL_TIMESTAMP]),
                                    }
                                    for tx in full_cycle
                                ]

                                tot_amt = sum(tx[COL_AMOUNT] for tx in full_cycle)
                                first_ts = full_cycle[0][COL_TIMESTAMP].to_pydatetime()
                                last_ts = full_cycle[-1][COL_TIMESTAMP].to_pydatetime()

                                gt_laundering = any(tx.get(COL_IS_LAUNDERING, 0) == 1 for tx in full_cycle)
                                ring_ids = [tx.get(COL_RING_ID) for tx in full_cycle if tx.get(COL_RING_ID)]
                                gt_ring = ring_ids[0] if ring_ids else None

                                cand = CandidateCluster(
                                    candidate_id=cand_id,
                                    typology="cycle",
                                    entry_account=start_node,
                                    node_roles=node_roles,
                                    node_labels=node_labels,
                                    edge_records=edge_recs,
                                    total_amount=round(float(tot_amt), 2),
                                    first_ts=first_ts,
                                    last_ts=last_ts,
                                    n_accounts=len(node_roles),
                                    n_transactions=len(edge_recs),
                                    ground_truth_laundering=gt_laundering,
                                    ground_truth_ring_id=gt_ring,
                                )
                                candidates.append(cand)

                    # Otherwise, extend path if under max length
                    elif (
                        next_target not in visited_nodes
                        and (path_len + 1) < CYCLE_MAX_LENGTH
                    ):
                        stack.append(
                            (
                                next_target,
                                path + [next_e],
                                visited_nodes | {next_target},
                            )
                        )

    return candidates


# ──────────────────────────────────────────────
#  Master Detection Pipeline (All 5 typologies)
# ──────────────────────────────────────────────

def detect_all_motifs(df: pd.DataFrame, G: nx.MultiDiGraph | None = None) -> list[CandidateCluster]:
    """
    Run all motif detectors on the transaction dataset covering all 5 typologies:
      1. fan_out
      2. fan_in
      3. scatter_gather
      4. pass_through
      5. cycle
    Returns unified list of CandidateCluster objects.
    """
    results: list[CandidateCluster] = []

    fo = detect_fan_out(df)
    results.extend(fo)

    fi = detect_fan_in(df)
    results.extend(fi)

    sg = detect_scatter_gather(df)
    results.extend(sg)

    pt = detect_pass_through(df, G=G)
    results.extend(pt)

    cy = detect_cycles(df, G=G)
    results.extend(cy)

    return results
