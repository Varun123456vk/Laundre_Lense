import React, { useState } from "react";
import { Icon, type IconName } from "./App";
import { type ApiPipelineSummary, formatINR } from "./api";

interface AgentInspectorModalProps {
  agentId: string | null;
  summary: ApiPipelineSummary | null;
  onClose: () => void;
  onOpenGraph?: () => void;
  onOpenCopilot?: () => void;
  onOpenDossier?: () => void;
}

interface AgentDetailDef {
  id: string;
  number: number;
  name: string;
  role: string;
  engine: string;
  icon: IconName;
  badgeTone: string;
  summaryText: string;
  capabilities: string[];
}

const AGENT_DEFS: AgentDetailDef[] = [
  {
    id: "agent-1-ingest",
    number: 1,
    name: "Data Ingestion & Schema Synthesizer",
    role: "Tabular Ingestion & Normalization",
    engine: "Python pandas + openpyxl + regex sanitizer",
    icon: "database",
    badgeTone: "success",
    summaryText:
      "Ingests raw transaction files in CSV, Excel (.xlsx, .xls), or JSON. Normalizes heterogeneous column headers, strips currency symbols (₹, $, commas), and validates timestamps into ISO 8601 UTC standard.",
    capabilities: [
      "Dynamic column synonym matching (source, sender, from, origin)",
      "Zero-dependency Excel (.xlsx) parsing via openpyxl",
      "Automatic INR currency sanitization and negative amount filtering",
      "Synthesizes canonical dataframes for downstream graph agents",
    ],
  },
  {
    id: "agent-2-graph",
    number: 2,
    name: "Graph Reconstruction & Money Trail Tracer",
    role: "Directed NetworkX Topology",
    engine: "NetworkX DiGraph + BFS Hop Depth Traversal",
    icon: "chart",
    badgeTone: "typology",
    summaryText:
      "Transforms tabular transaction records into a directed financial graph. Evaluates in-degree, out-degree, and pass-through ratios to classify nodes as Entry sources, Layering Mules, Network Hubs, or Exit collectors.",
    capabilities: [
      "Directed graph reconstruction with chronological edge attributes",
      "BFS distance calculation to assign hop indices from entry accounts",
      "Automated account role classification (Entry, Mule, Hub, Exit)",
      "Interactive node inspection for inflow, outflow, and net balance",
    ],
  },
  {
    id: "agent-3-typology",
    number: 3,
    name: "Typology & Anomaly Pattern Scout",
    role: "Syndicate & Subgraph Mining",
    engine: "nx.simple_cycles + Louvain Modularity + Smurfing Heuristics",
    icon: "search",
    badgeTone: "warning",
    summaryText:
      "Scans the connected components of the transaction graph to isolate high-risk money laundering structures including circular recycling loops, smurfing dispersal, scatter-gather layering, and pass-through chains.",
    capabilities: [
      "Circular cycle detection (nx.simple_cycles) for artificial volume loops",
      "Scatter-gather detection: 1 source -> multiple mules -> 1 exit collector",
      "Fan-out smurfing detection under PMLA regulatory reporting thresholds",
      "Sub-graph extraction for individual syndicate ring visualization",
    ],
  },
  {
    id: "agent-4-scorer",
    number: 4,
    name: "Explainable ML Risk Scorer (TreeSHAP)",
    role: "Multi-Factor Probability Attribution",
    engine: "LightGBM + TreeSHAP Local CPU Inference",
    icon: "flask",
    badgeTone: "danger",
    summaryText:
      "Computes calibrated risk probability scores (0.00 to 1.00) based on graph transit velocities, dwell times, and threshold evasion indices. Extracts the Top 5 contributing factors with mathematical SHAP weights.",
    capabilities: [
      "Composite risk probability calculation bounded between 0% and 100%",
      "Calculates Top 5 SHAP feature contributions for explainable AI",
      "Evaluates mule pass-through velocity and dwell times (< 30 mins)",
      "Flags whether traditional rule-based baselines would miss the ring",
    ],
  },
  {
    id: "agent-5-explainer",
    number: 5,
    name: "Forensic LLM Explainer (Gemini AI)",
    role: "Regulatory Intelligence & Narrative Synthesis",
    engine: "Google Gemini 1.5 Flash (with Statutory Rule Fallback)",
    icon: "spark",
    badgeTone: "accent",
    summaryText:
      "Synthesizes natural language forensic findings grounded in the live graph topology. Breaks down the money trail hop-by-hop and identifies statutory violations under the Prevention of Money Laundering Act (PMLA), 2002.",
    capabilities: [
      "Authoritative executive summary generation of detected laundering rings",
      "Hop-by-hop fund movement narrative citing specific accounts & INR sums",
      "Statutory compliance grounding (PMLA Section 12 & RBI KYC Directions)",
      "Zero-API-key statutory fallback if offline or no Gemini key is provided",
    ],
  },
  {
    id: "agent-6-dossier",
    number: 6,
    name: "Regulatory Dossier & SAR Generator",
    role: "FIU-IND Case Audit & Filing Compiler",
    engine: "Pydantic + Markdown / JSON Statutory Report Generator",
    icon: "shield",
    badgeTone: "neutral",
    summaryText:
      "Assembles complete, audit-ready Suspicious Activity Report (SAR / STR) dossiers compliant with FIU-IND (Financial Intelligence Unit - India) and FATF Recommendation 20. Includes participant directories and freeze plans.",
    capabilities: [
      "Generates unique case references (e.g. LL-SAR-2026-USR-001)",
      "Tabulates full participant ledger with inflow, outflow, and net balance",
      "Chronological hop-by-hop audit trail with exact UTC timestamps",
      "One-click exportable Markdown report ready for compliance submission",
    ],
  },
];

export const AgentInspectorModal: React.FC<AgentInspectorModalProps> = ({
  agentId,
  summary,
  onClose,
  onOpenGraph,
  onOpenCopilot,
  onOpenDossier,
}) => {
  const [activeTab, setActiveTab] = useState<string>(agentId || "agent-1-ingest");

  if (!agentId) return null;

  const currentAgent = AGENT_DEFS.find((a) => a.id === (activeTab || agentId)) || AGENT_DEFS[0];
  const logEntry = summary?.agent_logs.find((l) => l.agent_id.includes(currentAgent.id.replace("agent-", "")));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(18, 14, 28, 0.78)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          width: "100%",
          maxWidth: 920,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 28px 56px -12px rgba(29, 21, 48, 0.32)",
          border: "1px solid #E3E0EA",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #E3E0EA",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#1D1530",
            color: "#FFFFFF",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#5B2BB5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
              }}
            >
              <Icon name="spark" size={18} />
            </div>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    background: "#5B2BB5",
                    color: "#FFFFFF",
                    padding: "2px 7px",
                    borderRadius: 4,
                    fontFamily: "JetBrains Mono",
                  }}
                >
                  AUTONOMOUS MULTI-AGENT SWARM
                </span>
                <span style={{ fontSize: 11, color: "#A5A0B4", fontFamily: "JetBrains Mono" }}>
                  6 SPECIALIZED ROLES
                </span>
              </div>
              <h2 style={{ margin: "2px 0 0 0", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                AI Agent Inspector & Architectural Deep-Dive
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: 0,
              color: "#FFFFFF",
              borderRadius: "50%",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Agent Selector Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            background: "#F7F6F9",
            borderBottom: "1px solid #E3E0EA",
            padding: "6px 12px 0 12px",
            gap: 6,
          }}
        >
          {AGENT_DEFS.map((agent) => {
            const isSelected = agent.id === currentAgent.id;
            return (
              <button
                key={agent.id}
                onClick={() => setActiveTab(agent.id)}
                style={{
                  background: isSelected ? "#FFFFFF" : "transparent",
                  border: isSelected ? "1px solid #E3E0EA" : "1px solid transparent",
                  borderBottom: isSelected ? "2px solid #5B2BB5" : "none",
                  borderRadius: "8px 8px 0 0",
                  padding: "8px 6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name={agent.icon} size={13} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "#1D1530" : "#6A6180",
                    }}
                  >
                    Agent {agent.number}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 9.5,
                    color: isSelected ? "#5B2BB5" : "#8A819C",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                >
                  {agent.role.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Agent Deep-Dive Body */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Main Agent Title Strip */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              paddingBottom: 14,
              borderBottom: "1px solid #F0EEF4",
            }}
          >
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#5B2BB5",
                    background: "#F0EEF8",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontFamily: "JetBrains Mono",
                  }}
                >
                  AGENT #{currentAgent.number}
                </span>
                <span style={{ fontSize: 11, color: "#6A6180", fontFamily: "JetBrains Mono" }}>
                  ENGINE: {currentAgent.engine}
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1D1530" }}>
                {currentAgent.name}
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: 12.5, color: "#4A4358", lineHeight: 1.5 }}>
                {currentAgent.summaryText}
              </p>
            </div>

            {/* Quick action button for this agent */}
            <div style={{ flexShrink: 0, marginLeft: 16 }}>
              {currentAgent.number === 2 && onOpenGraph && (
                <button
                  className="button primary"
                  onClick={() => {
                    onClose();
                    onOpenGraph();
                  }}
                  style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Icon name="chart" size={14} /> View Interactive Graph ➔
                </button>
              )}
              {currentAgent.number === 5 && onOpenCopilot && (
                <button
                  className="button primary"
                  onClick={() => {
                    onClose();
                    onOpenCopilot();
                  }}
                  style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Icon name="spark" size={14} /> Open AI Copilot ➔
                </button>
              )}
              {currentAgent.number === 6 && onOpenDossier && (
                <button
                  className="button primary"
                  onClick={() => {
                    onClose();
                    onOpenDossier();
                  }}
                  style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Icon name="shield" size={14} /> View Full SAR Dossier ➔
                </button>
              )}
            </div>
          </div>

          {/* Capabilities Grid */}
          <div>
            <h4 style={{ margin: "0 0 10px 0", fontSize: 13, fontWeight: 700, color: "#1D1530" }}>
              Key Architectural Capabilities:
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {currentAgent.capabilities.map((cap, i) => (
                <div
                  key={i}
                  style={{
                    background: "#F7F6F9",
                    border: "1px solid #E3E0EA",
                    borderRadius: 8,
                    padding: "10px 12px",
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ color: "#2B825B", fontSize: 13, fontWeight: 700, marginTop: -1 }}>✓</span>
                  <span style={{ fontSize: 11.5, color: "#2C253B", lineHeight: 1.45 }}>{cap}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Run Activity & Metrics */}
          <div
            style={{
              background: "#FCFBFD",
              border: "1px solid #E3E0EA",
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: logEntry ? "#2B825B" : "#C9811A",
                    display: "inline-block",
                  }}
                />
                <strong style={{ fontSize: 13, color: "#1D1530" }}>
                  Live Execution Output & Performance
                </strong>
              </div>
              {logEntry && (
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "JetBrains Mono",
                    color: "#5B2BB5",
                    background: "#F0EEF8",
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  Execution: {logEntry.duration_ms} ms
                </span>
              )}
            </div>

            {logEntry ? (
              <div style={{ fontSize: 12, color: "#3B334B", lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>
                <p style={{ margin: "0 0 6px 0" }}>
                  <strong>Action Executed:</strong> {logEntry.action}
                </p>
                <p style={{ margin: 0, background: "#FFFFFF", padding: 10, borderRadius: 6, border: "1px solid #E3E0EA", fontFamily: "JetBrains Mono", fontSize: 11 }}>
                  {logEntry.details}
                </p>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: "#6A6180", lineHeight: 1.5 }}>
                No custom dataset uploaded yet. Ingest a dataset on the <strong>Datasets</strong> screen to observe this agent synthesize records, compute topology, and mine rings in real-time.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #E3E0EA",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#F7F6F9",
          }}
        >
          <span style={{ fontSize: 11.5, color: "#6A6180" }}>
            Click any agent tab above to inspect its engine, inputs, and outputs.
          </span>
          <button className="button secondary" onClick={onClose} style={{ fontSize: 12, padding: "6px 14px" }}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

