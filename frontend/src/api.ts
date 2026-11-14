/**
 * LaunderLens Frontend API Client
 * Connects the React workbench to the FastAPI backend at http://127.0.0.1:8000
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface ApiAlertSummary {
  alert_id: string;
  typology: "fan_out" | "fan_in" | "scatter_gather" | "cycle" | "pass_through" | string;
  risk_score: number;
  first_ts: string;
  last_ts: string;
  n_accounts: number;
  n_transactions: number;
  total_amount: number;
  baseline_flagged: boolean;
  status: "open" | "confirmed" | "dismissed" | string;
  is_redteam: boolean;
}

export interface ApiShapEntry {
  feature: string;
  value: number;
  contribution: number;
}

export interface ApiAlertDetail extends ApiAlertSummary {
  narrative: string;
  narrative_source: "llm" | "template" | string;
  shap: ApiShapEntry[];
  evidence: Record<string, any>;
}

export interface ApiGraphNode {
  id: string;
  role: "entry" | "hub" | "mule" | "exit" | "other" | string;
  label?: string;
  risk_score?: number;
  inflow?: number;
  outflow?: number;
  flagged?: boolean;
}

export interface ApiGraphEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  ts: string;
  hop_index?: number;
}

export interface ApiGraphPayload {
  nodes: ApiGraphNode[];
  edges: ApiGraphEdge[];
}

export interface ApiMetricRun {
  method: "baseline" | "launderlens" | string;
  alerts_count: number;
  true_positives: number;
  false_positives: number;
  precision: number;
  recall: number;
  f1: number;
  fpr: number;
}

export interface ApiTypologyMetric {
  typology: string;
  recall_baseline: number;
  recall_ours: number;
}

export interface ApiMetrics {
  runs: ApiMetricRun[];
  per_typology: ApiTypologyMetric[];
}

export interface ApiRedTeamResult {
  alert: ApiAlertDetail;
  baseline_flagged: boolean;
  latency_ms: number;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

export async function fetchAlerts(minRisk?: number, typology?: string): Promise<ApiAlertSummary[]> {
  const params = new URLSearchParams();
  if (minRisk !== undefined) params.append("min_risk", String(minRisk));
  if (typology) params.append("typology", typology);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/alerts${qs}`);
  if (!res.ok) throw new Error(`Failed to fetch alerts: ${res.statusText}`);
  return res.json();
}

export async function fetchAlertDetail(alertId: string): Promise<ApiAlertDetail> {
  const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}`);
  if (!res.ok) throw new Error(`Failed to fetch alert ${alertId}: ${res.statusText}`);
  return res.json();
}

export async function fetchAlertGraph(alertId: string): Promise<ApiGraphPayload> {
  const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/graph`);
  if (!res.ok) throw new Error(`Failed to fetch graph for ${alertId}: ${res.statusText}`);
  return res.json();
}

export async function postDisposition(
  alertId: string,
  status: "open" | "confirmed" | "dismissed",
  rationale: string = "Updated via LaunderLens workbench"
): Promise<ApiAlertDetail> {
  const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/disposition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, rationale }),
  });
  if (!res.ok) throw new Error(`Failed to update disposition for ${alertId}: ${res.statusText}`);
  return res.json();
}

export async function fetchMetrics(): Promise<ApiMetrics> {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.statusText}`);
  return res.json();
}

export async function injectRedTeam(seed?: number): Promise<ApiRedTeamResult> {
  const qs = seed !== undefined ? `?seed=${seed}` : "";
  const res = await fetch(`${API_BASE}/redteam/inject${qs}`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to inject red-team attack: ${res.statusText}`);
  return res.json();
}

export async function deleteRedTeam(): Promise<{ removed: boolean }> {
  const res = await fetch(`${API_BASE}/redteam`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete red-team injection: ${res.statusText}`);
  return res.json();
}

// ---------- Multi-Agent Pipeline Schemas & API ----------

export interface ApiAgentLogEntry {
  agent_id: string;
  agent_name: string;
  status: "idle" | "working" | "complete" | "warning" | "error";
  action: string;
  details: string;
  duration_ms: number;
  timestamp: string;
}

export interface ApiIngestionStats {
  filename: string;
  file_type: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  unique_accounts: number;
  total_volume_inr: number;
  earliest_ts: string;
  latest_ts: string;
  columns_mapped: Record<string, string>;
}

export interface ApiPipelineSummary {
  dataset_name: string;
  stats: ApiIngestionStats;
  agent_logs: ApiAgentLogEntry[];
  alerts_generated: ApiAlertSummary[];
  high_risk_count: number;
  total_suspicious_volume_inr: number;
  elapsed_seconds: number;
}

export interface ApiRegulatoryDossier {
  alert_id: string;
  case_ref: string;
  generated_at: string;
  risk_level: string;
  typology: string;
  total_amount_inr: number;
  total_amount_formatted: string;
  participants_count: number;
  transactions_count: number;
  executive_summary: string;
  participant_breakdown: Array<{
    account_id: string;
    role: string;
    inflow_inr: number;
    inflow_formatted: string;
    outflow_inr: number;
    outflow_formatted: string;
    net_balance_inr: number;
  }>;
  chronological_trail: Array<{
    hop: string;
    source: string;
    target: string;
    amount_inr: number;
    amount_formatted: string;
    timestamp: string;
    hop_index: number;
  }>;
  shap_factors: Array<{
    feature: string;
    value: number;
    contribution: number;
  }>;
  statutory_triggers: string[];
  recommended_actions: string[];
  raw_markdown: string;
}

export async function runPipelineAnalysis(
  fileOrContent: File | string,
  filename: string = "dataset.csv"
): Promise<ApiPipelineSummary> {
  if (fileOrContent instanceof File) {
    const formData = new FormData();
    formData.append("file", fileOrContent);
    formData.append("filename", fileOrContent.name);
    const res = await fetch(`${API_BASE}/pipeline/analyze`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`Analysis failed: ${res.statusText}`);
    return res.json();
  } else {
    const res = await fetch(`${API_BASE}/pipeline/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: fileOrContent, filename }),
    });
    if (!res.ok) throw new Error(`Analysis failed: ${res.statusText}`);
    return res.json();
  }
}

export async function fetchRegulatoryDossier(alertId: string): Promise<ApiRegulatoryDossier> {
  const res = await fetch(`${API_BASE}/pipeline/dossier/${encodeURIComponent(alertId)}`);
  if (!res.ok) throw new Error(`Failed to fetch regulatory dossier: ${res.statusText}`);
  return res.json();
}

export async function fetchSampleDataset(): Promise<{ filename: string; csv: string }> {
  const res = await fetch(`${API_BASE}/pipeline/sample-dataset`);
  if (!res.ok) throw new Error(`Failed to fetch sample dataset: ${res.statusText}`);
  return res.json();
}

// ---------- AI Forensic Copilot API ----------

export interface ApiCopilotMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ApiCopilotResponse {
  reply: string;
  suggested_actions: string[];
  tools_used: string[][];
  source: string;
}

export async function postCopilotChat(
  alertId: string,
  message: string,
  history: ApiCopilotMessage[] = []
): Promise<ApiCopilotResponse> {
  const res = await fetch(`${API_BASE}/agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      alert_id: alertId,
      message,
      history,
    }),
  });
  if (!res.ok) throw new Error(`Copilot chat failed: ${res.statusText}`);
  return res.json();
}

/**
 * Format an amount in Indian Rupees (₹)
 */
export function formatINR(val: number): string {
  if (isNaN(val)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Format a typology identifier to display title
 */
export function formatTypology(typology: string): string {
  switch (typology?.toLowerCase()) {
    case "scatter_gather":
    case "scatter-gather":
      return "Scatter-gather";
    case "fan_out":
    case "fan-out":
      return "Fan-out";
    case "fan_in":
    case "fan-in":
      return "Fan-in";
    case "pass_through":
    case "pass-through":
      return "Pass-through";
    case "cycle":
      return "Cycle";
    default:
      return typology || "Unknown";
  }
}

