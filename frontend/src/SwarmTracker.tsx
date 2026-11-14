import React from "react";
import { Icon, type IconName } from "./App";
import { type ApiPipelineSummary, type ApiAgentLogEntry } from "./api";

interface SwarmTrackerProps {
  isProcessing: boolean;
  activeStep: number;
  summary: ApiPipelineSummary | null;
  onSelectAgent?: (agentId: string) => void;
}

interface AgentMeta {
  id: string;
  name: string;
  role: string;
  icon: IconName;
  description: string;
}

const AGENTS: AgentMeta[] = [
  {
    id: "agent-1-ingest",
    name: "Data Ingestion & Schema Synthesizer",
    role: "CSV / Excel (.xlsx) Normalization",
    icon: "database",
    description: "Validates transaction schemas, cleans INR currency symbols, and aligns timestamps.",
  },
  {
    id: "agent-2-graph",
    name: "Graph Reconstruction & Money Trail Tracer",
    role: "Directed NetworkX Topology",
    icon: "chart",
    description: "Constructs multi-hop financial graph, assigns account roles, and traces BFS paths.",
  },
  {
    id: "agent-3-typology",
    name: "Typology & Anomaly Pattern Scout",
    role: "Syndicate & Subgraph Mining",
    icon: "search",
    description: "Detects circular cycles, smurfing dispersal, scatter-gather layering, and mule transit chains.",
  },
  {
    id: "agent-4-scorer",
    name: "Explainable ML Risk Scorer",
    role: "TreeSHAP Probability Attribution",
    icon: "flask",
    description: "Evaluates transit velocities, PMLA evasion thresholds, and computes mathematical SHAP weights.",
  },
  {
    id: "agent-5-explainer",
    name: "Forensic LLM Explainer",
    role: "Regulatory Intelligence (Gemini AI)",
    icon: "spark",
    description: "Synthesizes human-readable forensic narratives, fund mechanics, and legal compliance triggers.",
  },
  {
    id: "agent-6-dossier",
    name: "Regulatory Dossier & SAR Generator",
    role: "FIU-IND Case Audit Report",
    icon: "shield",
    description: "Packages case evidence, chronological ledgers, and recommended actions into formal SAR reports.",
  },
];

export const SwarmTracker: React.FC<SwarmTrackerProps> = ({
  isProcessing,
  activeStep,
  summary,
  onSelectAgent,
}) => {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E3E0EA",
        borderRadius: 10,
        padding: 20,
        boxShadow: "0 2px 8px rgba(29, 21, 48, 0.04)",
      }}
    >
      {/* Tracker Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: "1px solid #F0EEF4",
        }}
      >
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#5B2BB5",
                background: "#F0EEF8",
                padding: "2px 8px",
                borderRadius: 4,
                letterSpacing: "0.06em",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              MULTI-AGENT SWARM PIPELINE
            </span>
            {isProcessing && (
              <span
                style={{
                  fontSize: 11,
                  color: "#C9811A",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#C9811A",
                    display: "inline-block",
                  }}
                />
                Agents Collaborating in Real-Time
              </span>
            )}
            {summary && !isProcessing && (
              <span
                style={{
                  fontSize: 11,
                  color: "#2B825B",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icon name="check" size={12} /> Swarm Complete in {summary.elapsed_seconds}s
              </span>
            )}
          </div>
          <h3 style={{ margin: "4px 0 0 0", fontSize: 15, fontWeight: 700, color: "#1D1530" }}>
            Autonomous Multi-Agent Investigation Pipeline
          </h3>
        </div>

        {summary && (
          <div
            style={{
              display: "flex",
              gap: 16,
              background: "#F7F6F9",
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid #E3E0EA",
              fontSize: 11.5,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            <div>
              <span style={{ color: "#6A6180" }}>Records: </span>
              <strong>{summary.stats.valid_rows}</strong>
            </div>
            <div>
              <span style={{ color: "#6A6180" }}>Accounts: </span>
              <strong>{summary.stats.unique_accounts}</strong>
            </div>
            <div>
              <span style={{ color: "#6A6180" }}>Rings: </span>
              <strong style={{ color: "#C23B3B" }}>{summary.alerts_generated.length}</strong>
            </div>
            <div>
              <span style={{ color: "#6A6180" }}>Volume: </span>
              <strong style={{ color: "#1D1530" }}>
                ₹{summary.total_suspicious_volume_inr.toLocaleString("en-IN")}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Agents Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {AGENTS.map((agent, idx) => {
          const isDone = summary ? true : idx < activeStep;
          const isCurrent = isProcessing && idx === activeStep;
          const logEntry = summary?.agent_logs.find((l) => l.agent_id.includes(agent.id.replace("agent-", "")));

          return (
            <div
              key={agent.id}
              onClick={() => onSelectAgent?.(agent.id)}
              style={{
                background: isCurrent ? "#F9F8FC" : "#FFFFFF",
                border: `1px solid ${
                  isCurrent ? "#5B2BB5" : isDone ? "#D4CDE6" : "#E3E0EA"
                }`,
                borderRadius: 8,
                padding: 12,
                transition: "all 0.2s ease",
                boxShadow: isCurrent ? "0 0 0 1px #5B2BB5" : "none",
                cursor: "pointer",
              }}
              title={`Click to open Agent ${idx + 1} (${agent.name})`}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: isDone ? "#EFEBF8" : isCurrent ? "#5B2BB5" : "#F7F6F9",
                      color: isCurrent ? "#FFFFFF" : isDone ? "#5B2BB5" : "#6A6180",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={agent.icon} size={14} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1D1530" }}>
                      {agent.name}
                    </h4>
                    <span style={{ fontSize: 10, color: "#6A6180", display: "block" }}>
                      {agent.role}
                    </span>
                  </div>
                </div>

                {isDone ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#2B825B",
                      background: "#E8F5E9",
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {logEntry?.duration_ms ? `${logEntry.duration_ms}ms` : "DONE"}
                  </span>
                ) : isCurrent ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#5B2BB5",
                      background: "#F0EEF8",
                      padding: "2px 6px",
                      borderRadius: 4,
                      animation: "pulse 1.5s infinite",
                    }}
                  >
                    WORKING
                  </span>
                ) : (
                  <span style={{ fontSize: 10, color: "#A5A0B4" }}>PENDING</span>
                )}
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: isDone ? "#4A4358" : "#8A819C",
                  lineHeight: 1.4,
                }}
              >
                {logEntry ? logEntry.details : agent.description}
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: "1px dashed #EDEBF2",
                }}
              >
                <span style={{ fontSize: 10, color: "#6A6180", fontFamily: "JetBrains Mono" }}>
                  Inspect Agent Output
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    color: "#5B2BB5",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  Open ➔
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

