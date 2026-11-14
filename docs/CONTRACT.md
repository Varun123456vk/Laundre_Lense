# LaunderLens API Contract

**Base URL:** `http://localhost:8000`
**Content-Type:** `application/json`
**All timestamps:** ISO 8601 UTC with trailing `Z` (e.g. `"2024-03-01T08:12:00Z"`)

---

## GET /health

Health check.

**Response 200:**
```json
{ "status": "ok" }
```

---

## GET /alerts

List alerts sorted by `risk_score` descending.

**Query Parameters (all optional):**
| Param      | Type    | Description                             |
|------------|---------|-----------------------------------------|
| `typology` | string  | Filter: `fan_out`, `fan_in`, `scatter_gather`, `cycle`, `pass_through` |
| `min_risk` | float   | Filter: minimum risk score (0.0 – 1.0)  |

**Response 200:** `AlertSummary[]`
```json
[
  {
    "alert_id": "FO-001",
    "typology": "fan_out",
    "risk_score": 0.92,
    "first_ts": "2024-03-01T08:12:00Z",
    "last_ts": "2024-03-01T09:45:00Z",
    "n_accounts": 8,
    "n_transactions": 14,
    "total_amount": 245000.0,
    "baseline_flagged": true,
    "status": "open",
    "is_redteam": false
  }
]
```

---

## GET /alerts/{id}

Get full detail for a single alert.

**Response 200:** `AlertDetail`
```json
{
  "alert_id": "FO-001",
  "typology": "fan_out",
  "risk_score": 0.92,
  "first_ts": "2024-03-01T08:12:00Z",
  "last_ts": "2024-03-01T09:45:00Z",
  "n_accounts": 8,
  "n_transactions": 14,
  "total_amount": 245000.0,
  "baseline_flagged": true,
  "status": "open",
  "is_redteam": false,
  "narrative": "Account A-1001 initiated 14 outbound transfers totalling $245,000 to 7 distinct payees within a 93-minute window on 2024-03-01. The fan-out pattern is consistent with rapid fund dispersal commonly seen in layering stages of money laundering.",
  "narrative_source": "template",
  "shap": [
    { "feature": "out_degree", "value": 7.0, "contribution": 0.28 },
    { "feature": "total_amount", "value": 245000.0, "contribution": 0.22 },
    { "feature": "time_window_minutes", "value": 93.0, "contribution": 0.18 },
    { "feature": "avg_tx_amount", "value": 17500.0, "contribution": 0.14 },
    { "feature": "unique_counterparties", "value": 7.0, "contribution": 0.10 }
  ],
  "evidence": {
    "entry_account": "A-1001",
    "dispersal_targets": ["A-2001", "A-2002", "A-2003", "A-2004", "A-2005", "A-2006", "A-2007"],
    "largest_single_tx": 42000.0
  }
}
```

**Response 404:**
```json
{ "detail": "Alert FO-999 not found" }
```

---

## GET /alerts/{id}/graph

Get the transaction graph for an alert.

- `hop_index` = BFS distance from the entry account
- Timestamps increase along hops

**Response 200:** `GraphPayload`
```json
{
  "nodes": [
    { "id": "A-1001", "role": "entry", "label": "Entry Account" },
    { "id": "A-2001", "role": "mule", "label": "Payee 1" },
    { "id": "A-2005", "role": "exit", "label": "Payee 5 (exit)" }
  ],
  "edges": [
    {
      "id": "e-fo-01",
      "source": "A-1001",
      "target": "A-2001",
      "amount": 42000.0,
      "ts": "2024-03-01T08:12:00Z",
      "hop_index": 1
    },
    {
      "id": "e-fo-08",
      "source": "A-2001",
      "target": "A-2005",
      "amount": 18000.0,
      "ts": "2024-03-01T09:45:00Z",
      "hop_index": 2
    }
  ]
}
```

**Response 404:**
```json
{ "detail": "Alert FO-999 not found" }
```

---

## POST /alerts/{id}/disposition

Update the investigation status of an alert.

**Request Body:** `DispositionRequest`
```json
{ "status": "confirmed" }
```

**Allowed values for `status`:** `"open"`, `"confirmed"`, `"dismissed"`

**Response 200:** `AlertSummary` (updated)
```json
{
  "alert_id": "FO-001",
  "typology": "fan_out",
  "risk_score": 0.92,
  "first_ts": "2024-03-01T08:12:00Z",
  "last_ts": "2024-03-01T09:45:00Z",
  "n_accounts": 8,
  "n_transactions": 14,
  "total_amount": 245000.0,
  "baseline_flagged": true,
  "status": "confirmed",
  "is_redteam": false
}
```

**Response 404:**
```json
{ "detail": "Alert FO-001 not found" }
```

---

## GET /metrics

Get benchmark comparison metrics (baseline vs LaunderLens).

**Response 200:** `Metrics`
```json
{
  "runs": [
    {
      "method": "baseline",
      "alerts_count": 15,
      "true_positives": 11,
      "false_positives": 4,
      "precision": 0.733,
      "recall": 0.647,
      "f1": 0.688,
      "fpr": 0.052
    },
    {
      "method": "launderlens",
      "alerts_count": 18,
      "true_positives": 15,
      "false_positives": 3,
      "precision": 0.833,
      "recall": 0.882,
      "f1": 0.857,
      "fpr": 0.039
    }
  ],
  "per_typology": [
    { "typology": "fan_out", "recall_baseline": 0.75, "recall_ours": 0.92 },
    { "typology": "fan_in", "recall_baseline": 0.70, "recall_ours": 0.85 },
    { "typology": "scatter_gather", "recall_baseline": 0.55, "recall_ours": 0.80 },
    { "typology": "cycle", "recall_baseline": 0.60, "recall_ours": 0.78 },
    { "typology": "pass_through", "recall_baseline": 0.65, "recall_ours": 0.82 }
  ]
}
```

---

## POST /redteam/inject

Inject a synthetic structuring ring that the baseline misses.

**Request Body (optional):**
```json
{ "seed": 42 }
```

**Response 200:** `RedTeamResult`
```json
{
  "alert": {
    "alert_id": "RT-001",
    "typology": "scatter_gather",
    "risk_score": 0.87,
    "first_ts": "2024-03-10T02:00:00Z",
    "last_ts": "2024-03-10T04:30:00Z",
    "n_accounts": 10,
    "n_transactions": 18,
    "total_amount": 89500.0,
    "baseline_flagged": false,
    "status": "open",
    "is_redteam": true,
    "narrative": "Red-team injection: A synthetic structuring ring was detected ...",
    "narrative_source": "template",
    "shap": [
      { "feature": "sub_threshold_ratio", "value": 1.0, "contribution": 0.35 },
      { "feature": "total_amount", "value": 89500.0, "contribution": 0.22 },
      { "feature": "time_window_minutes", "value": 150.0, "contribution": 0.16 },
      { "feature": "n_intermediaries", "value": 9.0, "contribution": 0.13 },
      { "feature": "avg_tx_amount", "value": 4972.2, "contribution": 0.09 }
    ],
    "evidence": {
      "pattern": "structuring_ring",
      "entry": "A-RT-001",
      "exit": "A-RT-010",
      "avg_tx_amount": 4972.22,
      "threshold": 10000.0,
      "all_under_threshold": true
    }
  },
  "baseline_flagged": false,
  "latency_ms": 42
}
```

---

## DELETE /redteam

Remove all injected red-team alerts.

**Response 200:**
```json
{ "removed": true }
```

---

## Enums

| Field              | Allowed Values                                              |
|--------------------|-------------------------------------------------------------|
| `typology`         | `fan_out`, `fan_in`, `scatter_gather`, `cycle`, `pass_through` |
| `role`             | `entry`, `hub`, `mule`, `exit`, `other`                     |
| `status`           | `open`, `confirmed`, `dismissed`                            |
| `narrative_source` | `llm`, `template`                                           |
| `method`           | `baseline`, `launderlens`                                   |

---

## CORS

Origins are configured via the `ALLOWED_ORIGINS` environment variable (comma-separated).
Default: `http://localhost:3000`

