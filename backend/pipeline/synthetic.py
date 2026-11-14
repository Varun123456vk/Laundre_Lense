"""
LaunderLens – Synthetic Transaction & Laundering Ring Generator.
Generates realistic background transaction networks and labelled rings across all 5 typologies:
  1. fan_out
  2. fan_in
  3. scatter_gather
  4. cycle
  5. pass_through
Plus a dedicated structuring ring generator for the red-team endpoint.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from pipeline.config import (
    COL_AMOUNT,
    COL_FROM,
    COL_IS_LAUNDERING,
    COL_RING_ID,
    COL_TIMESTAMP,
    COL_TO,
    COL_TX_ID,
    COL_TYPOLOGY,
    REDTEAM_SUB_THRESHOLD_MAX,
    REDTEAM_SUB_THRESHOLD_MIN,
    REDTEAM_THRESHOLD,
    SYNTHETIC_PARQUET,
)
from pipeline.load import normalize_transactions, save_transactions


def generate_structuring_ring(
    ring_id: str = "ring_redteam_01",
    entry_account: str = "A-RT-001",
    exit_account: str = "A-RT-010",
    n_transfers: int = 18,
    base_time: datetime | None = None,
    seed: int = 42,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    Generate a synthetic structuring ring where all transfers are strictly below
    the $10,000 threshold (e.g. $7,500 - $9,800), evading traditional threshold rules.
    """
    rng = np.random.default_rng(seed)
    start_ts = base_time or datetime(2024, 3, 10, 2, 0, 0, tzinfo=timezone.utc)

    # 8 intermediate mule accounts
    mules = [f"A-RT-{i:03d}" for i in range(2, 10)]
    half_tx = n_transfers // 2

    records: list[dict[str, Any]] = []
    current_time = start_ts

    # Phase 1: Dispersal from entry to mules (all amounts < $10,000)
    for i in range(half_tx):
        target = mules[i % len(mules)]
        amt = float(rng.uniform(REDTEAM_SUB_THRESHOLD_MIN + 3000, REDTEAM_SUB_THRESHOLD_MAX))
        amt = round(amt, 2)
        current_time += timedelta(minutes=int(rng.integers(3, 8)))
        records.append({
            COL_TX_ID: f"rt_tx_{len(records)+1:04d}",
            COL_FROM: entry_account,
            COL_TO: target,
            COL_TIMESTAMP: current_time,
            COL_AMOUNT: amt,
            COL_IS_LAUNDERING: 1,
            COL_RING_ID: ring_id,
            COL_TYPOLOGY: "scatter_gather",
        })

    # Short delay between scatter and gather
    current_time += timedelta(minutes=int(rng.integers(15, 30)))

    # Phase 2: Consolidation from mules to exit account
    for i in range(n_transfers - half_tx):
        source = mules[i % len(mules)]
        amt = float(rng.uniform(REDTEAM_SUB_THRESHOLD_MIN + 3000, REDTEAM_SUB_THRESHOLD_MAX))
        amt = round(amt, 2)
        current_time += timedelta(minutes=int(rng.integers(5, 12)))
        records.append({
            COL_TX_ID: f"rt_tx_{len(records)+1:04d}",
            COL_FROM: source,
            COL_TO: exit_account,
            COL_TIMESTAMP: current_time,
            COL_AMOUNT: amt,
            COL_IS_LAUNDERING: 1,
            COL_RING_ID: ring_id,
            COL_TYPOLOGY: "scatter_gather",
        })

    df = pd.DataFrame(records)
    total_amount = float(df[COL_AMOUNT].sum())
    meta = {
        "ring_id": ring_id,
        "entry": entry_account,
        "exit": exit_account,
        "mules": mules,
        "n_transactions": len(records),
        "total_amount": total_amount,
        "max_tx_amount": float(df[COL_AMOUNT].max()),
        "threshold": REDTEAM_THRESHOLD,
        "evades_threshold": bool(df[COL_AMOUNT].max() < REDTEAM_THRESHOLD),
    }
    return df, meta


def generate_synthetic_dataset(
    n_accounts: int = 500,
    n_background_tx: int = 5000,
    n_rings_per_typology: int = 3,
    start_date: datetime | None = None,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Generate a full synthetic dataset with legitimate background transactions
    and ground-truth money laundering networks across all five typologies.
    """
    rng = np.random.default_rng(seed)
    base_time = start_date or datetime(2024, 3, 1, 0, 0, 0, tzinfo=timezone.utc)

    # 1. Background Accounts & Probabilities (power-law / Pareto degree)
    accounts = [f"ACC_{i:05d}" for i in range(1, n_accounts + 1)]
    # Use Zipfian / power-law activity distribution for realistic network topology
    weights = 1.0 / (np.arange(1, n_accounts + 1) ** 0.8)
    weights /= weights.sum()

    records: list[dict[str, Any]] = []

    # 2. Generate Background Legitimate Transactions
    for i in range(n_background_tx):
        # Pick sender and receiver ensuring sender != receiver
        src, dst = rng.choice(accounts, size=2, replace=False, p=weights)
        # Random time over 14 days
        offset_seconds = rng.integers(0, 14 * 86400)
        ts = base_time + timedelta(seconds=int(offset_seconds))
        # Log-normal transaction amounts: median ~$250, occasional large payments
        amt = float(np.exp(rng.normal(loc=5.5, scale=1.3)))
        amt = round(min(max(amt, 5.0), 50_000.0), 2)

        records.append({
            COL_TX_ID: f"bg_tx_{i+1:08d}",
            COL_FROM: src,
            COL_TO: dst,
            COL_TIMESTAMP: ts,
            COL_AMOUNT: amt,
            COL_IS_LAUNDERING: 0,
            COL_RING_ID: None,
            COL_TYPOLOGY: None,
        })

    # 3. Injected Laundering Rings
    ring_account_counter = 1000

    for typology in ["fan_out", "fan_in", "scatter_gather", "cycle", "pass_through"]:
        for r_idx in range(1, n_rings_per_typology + 1):
            ring_id = f"ring_{typology}_{r_idx:02d}"
            # Random starting timestamp within day 1 to day 10
            ring_start = base_time + timedelta(
                days=int(rng.integers(1, 10)),
                hours=int(rng.integers(0, 24)),
                minutes=int(rng.integers(0, 60)),
            )

            if typology == "fan_out":
                # Entry sends to k payees in rapid succession
                k = int(rng.integers(4, 8))
                entry = f"AML_FO_ENTRY_{ring_account_counter}"
                payees = [f"AML_FO_MULE_{ring_account_counter}_{j}" for j in range(k)]
                ring_account_counter += 1

                total_launder = float(rng.uniform(60_000, 250_000))
                slice_amt = round(total_launder / k, 2)
                t = ring_start
                for p in payees:
                    t += timedelta(minutes=int(rng.integers(5, 20)))
                    records.append({
                        COL_TX_ID: f"aml_tx_{len(records)+1:08d}",
                        COL_FROM: entry,
                        COL_TO: p,
                        COL_TIMESTAMP: t,
                        COL_AMOUNT: slice_amt,
                        COL_IS_LAUNDERING: 1,
                        COL_RING_ID: ring_id,
                        COL_TYPOLOGY: "fan_out",
                    })

            elif typology == "fan_in":
                # k senders send to 1 collector
                k = int(rng.integers(4, 8))
                hub = f"AML_FI_HUB_{ring_account_counter}"
                senders = [f"AML_FI_SRC_{ring_account_counter}_{j}" for j in range(k)]
                ring_account_counter += 1

                total_launder = float(rng.uniform(70_000, 300_000))
                slice_amt = round(total_launder / k, 2)
                t = ring_start
                for s in senders:
                    t += timedelta(minutes=int(rng.integers(8, 25)))
                    records.append({
                        COL_TX_ID: f"aml_tx_{len(records)+1:08d}",
                        COL_FROM: s,
                        COL_TO: hub,
                        COL_TIMESTAMP: t,
                        COL_AMOUNT: slice_amt,
                        COL_IS_LAUNDERING: 1,
                        COL_RING_ID: ring_id,
                        COL_TYPOLOGY: "fan_in",
                    })

            elif typology == "scatter_gather":
                # Source -> intermediaries -> Destination
                k = int(rng.integers(3, 6))
                src = f"AML_SG_SRC_{ring_account_counter}"
                dst = f"AML_SG_DST_{ring_account_counter}"
                inter = [f"AML_SG_MID_{ring_account_counter}_{j}" for j in range(k)]
                ring_account_counter += 1

                total_amt = float(rng.uniform(80_000, 350_000))
                chunk = round(total_amt / k, 2)

                # Scatter phase
                t = ring_start
                for mid in inter:
                    t += timedelta(minutes=int(rng.integers(5, 15)))
                    records.append({
                        COL_TX_ID: f"aml_tx_{len(records)+1:08d}",
                        COL_FROM: src,
                        COL_TO: mid,
                        COL_TIMESTAMP: t,
                        COL_AMOUNT: chunk,
                        COL_IS_LAUNDERING: 1,
                        COL_RING_ID: ring_id,
                        COL_TYPOLOGY: "scatter_gather",
                    })

                # Gather phase
                t += timedelta(minutes=int(rng.integers(30, 90)))
                for mid in inter:
                    t += timedelta(minutes=int(rng.integers(10, 25)))
                    # Small fee retention
                    records.append({
                        COL_TX_ID: f"aml_tx_{len(records)+1:08d}",
                        COL_FROM: mid,
                        COL_TO: dst,
                        COL_TIMESTAMP: t,
                        COL_AMOUNT: round(chunk * float(rng.uniform(0.96, 0.99)), 2),
                        COL_IS_LAUNDERING: 1,
                        COL_RING_ID: ring_id,
                        COL_TYPOLOGY: "scatter_gather",
                    })

            elif typology == "cycle":
                # Directed cycle: A -> B -> C -> D -> A
                cycle_len = int(rng.integers(3, 6))
                cycle_nodes = [f"AML_CY_{ring_account_counter}_{j}" for j in range(cycle_len)]
                ring_account_counter += 1

                amount = float(rng.uniform(50_000, 200_000))
                t = ring_start
                for hop in range(cycle_len):
                    u = cycle_nodes[hop]
                    v = cycle_nodes[(hop + 1) % cycle_len]
                    t += timedelta(minutes=int(rng.integers(20, 60)))
                    records.append({
                        COL_TX_ID: f"aml_tx_{len(records)+1:08d}",
                        COL_FROM: u,
                        COL_TO: v,
                        COL_TIMESTAMP: t,
                        COL_AMOUNT: round(amount, 2),
                        COL_IS_LAUNDERING: 1,
                        COL_RING_ID: ring_id,
                        COL_TYPOLOGY: "cycle",
                    })
                    amount *= float(rng.uniform(0.97, 0.99))  # small amount decay

            elif typology == "pass_through":
                # Linear chain: N1 -> N2 -> N3 -> N4 -> N5
                chain_len = int(rng.integers(4, 7))
                nodes = [f"AML_PT_{ring_account_counter}_{j}" for j in range(chain_len)]
                ring_account_counter += 1

                amount = float(rng.uniform(80_000, 300_000))
                t = ring_start
                for hop in range(chain_len - 1):
                    u = nodes[hop]
                    v = nodes[hop + 1]
                    t += timedelta(minutes=int(rng.integers(10, 35)))
                    records.append({
                        COL_TX_ID: f"aml_tx_{len(records)+1:08d}",
                        COL_FROM: u,
                        COL_TO: v,
                        COL_TIMESTAMP: t,
                        COL_AMOUNT: round(amount, 2),
                        COL_IS_LAUNDERING: 1,
                        COL_RING_ID: ring_id,
                        COL_TYPOLOGY: "pass_through",
                    })
                    amount *= float(rng.uniform(0.97, 0.995))

    df = pd.DataFrame(records)
    return normalize_transactions(df)


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic transactions Parquet dataset")
    parser.add_argument("--accounts", type=int, default=300, help="Number of background accounts")
    parser.add_argument("--tx", type=int, default=3000, help="Number of background transactions")
    parser.add_argument("--rings", type=int, default=4, help="Number of rings per typology")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--out", type=str, default=str(SYNTHETIC_PARQUET), help="Output Parquet path")
    args = parser.parse_args()

    print(f"Generating synthetic transactions (seed={args.seed})...")
    df = generate_synthetic_dataset(
        n_accounts=args.accounts,
        n_background_tx=args.tx,
        n_rings_per_typology=args.rings,
        seed=args.seed,
    )
    out_file = save_transactions(df, args.out)
    print(f"Saved {len(df)} transactions to {out_file}")
    laundering_tx = df[COL_IS_LAUNDERING].sum()
    print(f"Summary: {len(df)} total, {laundering_tx} laundering ({laundering_tx/len(df)*100:.1f}%)")


if __name__ == "__main__":
    main()

