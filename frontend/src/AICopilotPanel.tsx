import React, { useState, useRef, useEffect } from "react";
import { Icon, type IconName } from "./App";
import { postCopilotChat, type ApiCopilotMessage, type ApiCopilotResponse } from "./api";

interface AICopilotPanelProps {
  alertId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenDossier?: () => void;
}

const QUICK_PROMPTS = [
  { label: "Trace Hops", prompt: "Trace the fund movement trail hop-by-hop with amounts and timestamps." },
  { label: "Identify Mules", prompt: "Who are the intermediate mule accounts and who is the ringleader?" },
  { label: "PMLA Triggers", prompt: "What statutory compliance provisions were breached under PMLA 2002?" },
  { label: "Draft Freeze Memo", prompt: "Draft an urgent debit freeze order for the compliance team under PMLA Section 54." },
];

export const AICopilotPanel: React.FC<AICopilotPanelProps> = ({
  alertId,
  isOpen,
  onClose,
  onOpenDossier,
}) => {
  const [messages, setMessages] = useState<ApiCopilotMessage[]>([
    {
      role: "assistant",
      content: `Hello Investigator! I am your **AI Forensic Copilot**.\nI am grounded in the live NetworkX topology and TreeSHAP risk attributions for alert \`${alertId}\`.\n\nHow can I assist your investigation?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([
    "Trace Fund Movement",
    "Identify Mules",
    "PMLA Legal Triggers",
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Reset or initialize when alertId changes
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `I am now analyzing alert \`${alertId}\`.\nAll graph nodes, hop transactions, and regulatory factors are loaded into my context. Ask me anything or select a prompt below.`,
      },
    ]);
  }, [alertId]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ApiCopilotMessage = { role: "user", content: query };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const resp = await postCopilotChat(alertId, query, messages);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: resp.reply },
      ]);
      if (resp.suggested_actions && resp.suggested_actions.length > 0) {
        setSuggestedActions(resp.suggested_actions);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error contacting Forensic Agent: ${err.message || "Failed to fetch response."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        width: 420,
        height: 600,
        maxHeight: "85vh",
        background: "#FFFFFF",
        borderRadius: 14,
        boxShadow: "0 20px 40px rgba(29, 21, 48, 0.22), 0 0 0 1px rgba(29, 21, 48, 0.08)",
        display: "flex",
        flexDirection: "column",
        zIndex: 9000,
        overflow: "hidden",
        border: "1px solid #E3E0EA",
        animation: "slideInUp 0.25s ease-out",
      }}
    >
      {/* Copilot Header */}
      <div
        style={{
          background: "#1D1530",
          color: "#FFFFFF",
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "#5B2BB5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
            }}
          >
            <Icon name="spark" size={16} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <strong style={{ fontSize: 13, letterSpacing: "-0.01em" }}>AI Forensic Copilot</strong>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  background: "#2B825B",
                  color: "#FFFFFF",
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontFamily: "JetBrains Mono",
                }}
              >
                LIVE
              </span>
            </div>
            <small style={{ color: "#A5A0B4", fontSize: 10, fontFamily: "JetBrains Mono" }}>
              Investigating {alertId} · Gemini AI
            </small>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={() => setMessages([messages[0]])}
            title="Clear Chat"
            style={{
              background: "transparent",
              border: 0,
              color: "#A5A0B4",
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: 4,
            }}
          >
            <Icon name="refresh" size={13} />
          </button>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: 0,
              color: "#FFFFFF",
              cursor: "pointer",
              width: 24,
              height: 24,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Quick Prompt Pills Strip */}
      <div
        style={{
          background: "#F7F6F9",
          padding: "8px 12px",
          borderBottom: "1px solid #E3E0EA",
          display: "flex",
          gap: 6,
          overflowX: "auto",
        }}
      >
        {QUICK_PROMPTS.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSend(qp.prompt)}
            disabled={loading}
            style={{
              background: "#FFFFFF",
              border: "1px solid #D4CDE6",
              borderRadius: 12,
              padding: "3px 9px",
              fontSize: 10.5,
              fontWeight: 600,
              color: "#5B2BB5",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div
        style={{
          flex: 1,
          padding: "14px 14px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "#FAF9FB",
        }}
      >
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={index}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "88%",
                background: isUser ? "#5B2BB5" : "#FFFFFF",
                color: isUser ? "#FFFFFF" : "#1D1530",
                padding: "10px 14px",
                borderRadius: isUser ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                fontSize: 12,
                lineHeight: 1.55,
                border: isUser ? "none" : "1px solid #E3E0EA",
                boxShadow: isUser ? "0 2px 6px rgba(91, 43, 181, 0.25)" : "0 1px 3px rgba(0,0,0,0.04)",
                wordBreak: "break-word",
              }}
            >
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: isUser ? "Inter, sans-serif" : "Inter, sans-serif",
                }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div
            style={{
              alignSelf: "flex-start",
              background: "#FFFFFF",
              border: "1px solid #E3E0EA",
              borderRadius: "14px 14px 14px 2px",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11.5,
              color: "#6A6180",
            }}
          >
            <div
              className="spinner"
              style={{ width: 14, height: 14, borderColor: "#5B2BB5", borderTopColor: "transparent" }}
            />
            <span>Forensic Copilot interrogating graph topology…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Follow-ups */}
      {suggestedActions.length > 0 && !loading && (
        <div
          style={{
            padding: "6px 12px",
            background: "#FFFFFF",
            borderTop: "1px solid #F0EEF4",
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {suggestedActions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                if (action.includes("SAR Dossier") && onOpenDossier) {
                  onOpenDossier();
                } else {
                  handleSend(`Please provide details regarding: ${action}`);
                }
              }}
              style={{
                fontSize: 10,
                color: "#4A4358",
                background: "#F7F6F9",
                border: "1px solid #E3E0EA",
                borderRadius: 4,
                padding: "2px 7px",
                cursor: "pointer",
              }}
            >
              ➔ {action}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <div
        style={{
          padding: 12,
          background: "#FFFFFF",
          borderTop: "1px solid #E3E0EA",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Copilot (e.g. Trace hops, Identify mules, Draft freeze order)…"
          style={{
            flex: 1,
            border: "1px solid #D4CDE6",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
            resize: "none",
            outline: "none",
            maxHeight: 70,
            lineHeight: 1.4,
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          style={{
            background: input.trim() && !loading ? "#5B2BB5" : "#E3E0EA",
            color: "#FFFFFF",
            border: 0,
            borderRadius: 8,
            width: 34,
            height: 34,
            cursor: input.trim() && !loading ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s ease",
          }}
        >
          <Icon name="arrow" size={14} />
        </button>
      </div>
    </div>
  );
};

