import React, { useEffect } from "react";
import { Icon, type IconName } from "./App";
import { type ApiRegulatoryDossier } from "./api";

interface DossierModalProps {
  isOpen: boolean;
  dossier: ApiRegulatoryDossier | null;
  loading: boolean;
  onClose: () => void;
}

export const RegulatoryDossierModal: React.FC<DossierModalProps> = ({
  isOpen,
  dossier,
  loading,
  onClose,
}) => {
  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!dossier) return;
    const blob = new Blob([dossier.raw_markdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dossier.case_ref}_investigation_dossier.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(18, 14, 28, 0.75)",
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
          borderRadius: 12,
          width: "100%",
          maxWidth: 960,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 48px -12px rgba(29, 21, 48, 0.28)",
          border: "1px solid var(--border, #E3E0EA)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #E3E0EA",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#F7F6F9",
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#C23B3B",
                  textTransform: "uppercase",
                  background: "#FDE8E8",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                STRICTLY CONFIDENTIAL · FIU-IND REPORT
              </span>
              <span style={{ fontSize: 11, color: "#6A6180", fontFamily: "JetBrains Mono, monospace" }}>
                REF: {dossier?.case_ref || "LOADING..."}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 17, color: "#1D1530", fontWeight: 700 }}>
              Official Regulatory Case Dossier & SAR
            </h2>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {dossier && (
              <button
                className="button primary"
                onClick={handleDownload}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  padding: "6px 14px",
                }}
              >
                <Icon name="download" size={14} /> Download SAR Report (.md)
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid #E3E0EA",
                borderRadius: 6,
                padding: "6px 10px",
                cursor: "pointer",
                color: "#6A6180",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {loading || !dossier ? (
            <div style={{ padding: 60, textAlign: "center", color: "#6A6180" }}>
              <div
                className="spinner"
                style={{ width: 32, height: 32, margin: "0 auto 16px", borderColor: "#5B2BB5", borderTopColor: "transparent" }}
              />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>
                Synthesizing multi-agent regulatory dossier & statutory filings...
              </p>
            </div>
          ) : (
            <>
              {/* Executive KPI Strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                  background: "#F7F6F9",
                  padding: 14,
                  borderRadius: 8,
                  border: "1px solid #E3E0EA",
                }}
              >
                <div>
                  <small style={{ color: "#6A6180", fontSize: 11, display: "block" }}>Assessed Risk</small>
                  <strong style={{ color: "#C23B3B", fontSize: 15, fontFamily: "JetBrains Mono, monospace" }}>
                    {dossier.risk_level}
                  </strong>
                </div>
                <div>
                  <small style={{ color: "#6A6180", fontSize: 11, display: "block" }}>Monitored Exposure</small>
                  <strong style={{ color: "#1D1530", fontSize: 15, fontFamily: "JetBrains Mono, monospace" }}>
                    {dossier.total_amount_formatted}
                  </strong>
                </div>
                <div>
                  <small style={{ color: "#6A6180", fontSize: 11, display: "block" }}>Typology Pattern</small>
                  <strong style={{ color: "#5B2BB5", fontSize: 14, textTransform: "capitalize" }}>
                    {dossier.typology.replace(/_/g, " ")}
                  </strong>
                </div>
                <div>
                  <small style={{ color: "#6A6180", fontSize: 11, display: "block" }}>Network Scope</small>
                  <strong style={{ color: "#1D1530", fontSize: 14, fontFamily: "JetBrains Mono, monospace" }}>
                    {dossier.participants_count} Accounts · {dossier.transactions_count} Hops
                  </strong>
                </div>
              </div>

              {/* Forensic AI Findings */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E3E0EA",
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Icon name="spark" size={16} />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1D1530" }}>
                    Forensic AI Narrative & Fund Flow Mechanics
                  </h3>
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.65,
                    color: "#2C253B",
                    whiteSpace: "pre-wrap",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {dossier.executive_summary}
                </div>
              </div>

              {/* Participant Directory */}
              <div>
                <h3 style={{ margin: "0 0 10px 0", fontSize: 13, fontWeight: 700, color: "#1D1530" }}>
                  Suspicious Participant Directory & Flow Ledger
                </h3>
                <div style={{ border: "1px solid #E3E0EA", borderRadius: 8, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#F7F6F9", borderBottom: "1px solid #E3E0EA", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px", color: "#6A6180" }}>Account ID</th>
                        <th style={{ padding: "8px 12px", color: "#6A6180" }}>Role</th>
                        <th style={{ padding: "8px 12px", color: "#6A6180", textAlign: "right" }}>Total Inflow (₹)</th>
                        <th style={{ padding: "8px 12px", color: "#6A6180", textAlign: "right" }}>Total Outflow (₹)</th>
                        <th style={{ padding: "8px 12px", color: "#6A6180", textAlign: "right" }}>Net Position (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossier.participant_breakdown.map((p, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #F0EEF4" }}>
                          <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                            {p.account_id}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background:
                                  p.role === "ENTRY" ? "#E8F0FE" : p.role === "MULE" ? "#FFF0E0" : "#F0EEF8",
                                color:
                                  p.role === "ENTRY" ? "#1967D2" : p.role === "MULE" ? "#C9811A" : "#5B2BB5",
                              }}
                            >
                              {p.role}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "JetBrains Mono" }}>
                            {p.inflow_formatted}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "JetBrains Mono" }}>
                            {p.outflow_formatted}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              textAlign: "right",
                              fontFamily: "JetBrains Mono",
                              fontWeight: 600,
                              color: p.net_balance_inr > 0 ? "#2B825B" : "#C23B3B",
                            }}
                          >
                            ₹{p.net_balance_inr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hop-by-Hop Money Trail */}
              <div>
                <h3 style={{ margin: "0 0 10px 0", fontSize: 13, fontWeight: 700, color: "#1D1530" }}>
                  Hop-by-Hop Chronological Movement
                </h3>
                <div style={{ border: "1px solid #E3E0EA", borderRadius: 8, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#F7F6F9", borderBottom: "1px solid #E3E0EA", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px", color: "#6A6180" }}>Hop</th>
                        <th style={{ padding: "8px 12px", color: "#6A6180" }}>Source</th>
                        <th style={{ padding: "8px 12px", color: "#6A6180" }}>Target</th>
                        <th style={{ padding: "8px 12px", color: "#6A6180", textAlign: "right" }}>Amount (₹ INR)</th>
                        <th style={{ padding: "8px 12px", color: "#6A6180" }}>Timestamp (UTC)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossier.chronological_trail.slice(0, 10).map((t, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #F0EEF4" }}>
                          <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono", color: "#6A6180" }}>
                            {t.hop}
                          </td>
                          <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono", fontWeight: 600 }}>
                            {t.source}
                          </td>
                          <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono", fontWeight: 600 }}>
                            {t.target}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "JetBrains Mono", fontWeight: 600 }}>
                            {t.amount_formatted}
                          </td>
                          <td style={{ padding: "8px 12px", color: "#6A6180", fontSize: 11 }}>
                            {t.timestamp}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Regulatory Triggers & Recommended Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ border: "1px solid #E3E0EA", borderRadius: 8, padding: 14, background: "#FCFBFD" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 12, color: "#1D1530", fontWeight: 700 }}>
                    Statutory & Compliance Triggers
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: "#4A4358", lineHeight: 1.5 }}>
                    {dossier.statutory_triggers.map((trig, idx) => (
                      <li key={idx} style={{ marginBottom: 6 }}>{trig}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ border: "1px solid #E3E0EA", borderRadius: 8, padding: 14, background: "#FCFBFD" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 12, color: "#1D1530", fontWeight: 700 }}>
                    Recommended Action Plan
                  </h4>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: "#4A4358", lineHeight: 1.5 }}>
                    {dossier.recommended_actions.map((act, idx) => (
                      <li key={idx} style={{ marginBottom: 6 }}>{act}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid #E3E0EA",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#F7F6F9",
          }}
        >
          <span style={{ fontSize: 11, color: "#6A6180", fontFamily: "JetBrains Mono" }}>
            Press Esc or click Close to return to investigation
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            {dossier && (
              <button
                type="button"
                className="button primary"
                onClick={handleDownload}
                style={{ fontSize: 12, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="download" size={13} /> Download SAR Report (.md)
              </button>
            )}
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
              style={{ fontSize: 12, padding: "6px 16px" }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

