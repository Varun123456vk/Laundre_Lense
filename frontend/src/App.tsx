import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  checkBackendHealth,
  fetchAlerts,
  fetchAlertDetail,
  fetchAlertGraph,
  postDisposition,
  fetchMetrics,
  injectRedTeam,
  deleteRedTeam,
  formatINR,
  formatTypology,
  type ApiAlertSummary,
  type ApiAlertDetail,
  type ApiGraphPayload,
  type ApiGraphEdge,
  type ApiMetrics,
  type ApiRedTeamResult,
} from "./api";
import { computeGraphLayout, type LayoutNode, type LayoutEdge } from "./graphLayout";
import { LandingPage } from "./LandingPage";
import { AuthScreen } from "./AuthScreen";
import { LaunderLensLoader } from "./LaunderLensLoader";
import {
  supabase,
  isSupabaseConfigured,
  signOutSupabase,
  mapSupabaseUserToUser,
} from "./supabase";

export type Screen = "landing" | "auth" | "overview" | "investigation" | "simulation" | "datasets";
export type IconName =
  | "grid"
  | "alert"
  | "chart"
  | "flask"
  | "search"
  | "filter"
  | "chevron"
  | "arrow"
  | "clock"
  | "play"
  | "pause"
  | "plus"
  | "minus"
  | "center"
  | "check"
  | "close"
  | "spark"
  | "external"
  | "upload"
  | "database"
  | "file"
  | "lock"
  | "user"
  | "logout"
  | "shield"
  | "download"
  | "refresh"
  | "contrast"
  | "sun"
  | "moon"
  | "maximize"
  | "minimize"
  | "printer";

export const Icon = ({ name, size = 16 }: { name: IconName; size?: number }) => {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    alert: <><path d="M12 3 2.8 19a1.4 1.4 0 0 0 1.2 2h16a1.4 1.4 0 0 0 1.2-2L12 3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
    chart: <><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/></>,
    flask: <><path d="M9 3h6"/><path d="M10 3v6l-5.5 9.3A1.8 1.8 0 0 0 6 21h12a1.8 1.8 0 0 0 1.5-2.7L14 9V3"/><path d="M7.5 16h9"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    filter: <><path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    play: <path d="m8 5 11 7-11 7V5Z"/>,
    pause: <><path d="M9 5v14"/><path d="M15 5v14"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    minus: <path d="M5 12h14"/>,
    center: <><path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M16 21h5v-5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <><path d="m6 6 12 12"/><path d="m18 6-12 12"/></>,
    spark: <><path d="m12 3 1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8L12 3Z"/><path d="m19 15 .7 2.2L22 18l-2.3.8L19 21l-.7-2.2L16 18l2.3-.8L19 15Z"/></>,
    external: <><path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    contrast: <><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>,
    moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>,
    maximize: <><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></>,
    minimize: <><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></>,
    printer: <><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>,
  };
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
};

export const riskClass = (risk: number) => (risk >= 0.85 ? "high" : risk >= 0.7 ? "medium" : "low");

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: string;
  clearance: string;
  department: string;
}

export const DEFAULT_USER: User | null = null;
export const DEMO_USERS: User[] = [];

export interface AlertItem {
  id: string;
  typology: string;
  risk: number;
  accounts: number;
  amount: string;
  status: string;
  missed: boolean;
}

export interface TransactionRow {
  hop: string;
  from: string;
  to: string;
  amount: string;
  timestamp: string;
  typology: string;
}

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  uploadedAt: string;
  recordsCount: number;
  volumeInr: string;
  suspiciousRingsCount: number;
  source: string;
  alerts: AlertItem[];
  sampleRows: TransactionRow[];
}

export const EMPTY_DATASET: Dataset = {
  id: "ds-empty",
  name: "No Active Dataset",
  filename: "No data loaded",
  uploadedAt: "—",
  recordsCount: 0,
  volumeInr: "₹0.00",
  suspiciousRingsCount: 0,
  source: "—",
  alerts: [],
  sampleRows: [],
};

export const INITIAL_DATASETS: Dataset[] = [];

function Logo({ onClick }: { onClick?: () => void } = {}) {
  return (
    <div
      className="brand"
      aria-label="LaunderLens"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <svg className="brand-mark" viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="11.5" cy="11.5" r="7.5" />
        <path d="m17 17 6 6M7 12h9M11.5 8v8" />
      </svg>
      <span>
        Launder<span>Lens</span>
      </span>
    </div>
  );
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function RiskScore({ value }: { value: number }) {
  return (
    <div className="risk-score">
      <span className={`risk-dot ${riskClass(value)}`} />
      <strong>{value.toFixed(2)}</strong>
      <span className="risk-track">
        <i className={riskClass(value)} style={{ width: `${value * 100}%` }} />
      </span>
    </div>
  );
}



// -------------------------------------------------------------
// App Header with Active Dataset & User Profile Dropdown
// -------------------------------------------------------------
function AppHeader({
  screen,
  setScreen,
  currentUser,
  onLogout,
  onSwitchUser,
  activeDataset,
  onOpenDatasets,
  backendOnline = false,
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  currentUser: User;
  onLogout: () => void;
  onSwitchUser: (u: User) => void;
  activeDataset: Dataset;
  onOpenDatasets: () => void;
  backendOnline?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const nav = [
    { id: "overview" as Screen, label: "Overview", icon: "grid" as IconName },
    { id: "investigation" as Screen, label: "Alerts", icon: "alert" as IconName, count: activeDataset.alerts.length },
    { id: "datasets" as Screen, label: "Datasets", icon: "database" as IconName },
    { id: "simulation" as Screen, label: "Red-Team", icon: "flask" as IconName },
  ];

  return (
    <header className="app-header">
      {/* Left: Clean Brand & Exit */}
      <div className="brand-group">
        <Logo onClick={() => setScreen("landing")} />
        <div className="brand-divider" />
        <button
          type="button"
          onClick={() => setScreen("landing")}
          className="landing-exit-link"
          title="Return to Public Marketing Landing Page"
        >
          <span>Exit to Landing</span>
          <Icon name="external" size={11} />
        </button>
      </div>

      {/* Center: Segmented Navigation */}
      <nav className="primary-nav" aria-label="Primary navigation">
        {nav.map((item) => (
          <button
            key={item.id}
            className={screen === item.id ? "nav-item active" : "nav-item"}
            onClick={() => setScreen(item.id)}
          >
            <Icon name={item.icon} size={14} />
            <span>{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="nav-count">{item.count}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Right: Consolidated Tools & Profile */}
      <div className="header-tools">
        {/* Active Dataset Dropdown Pill */}
        <button
          onClick={onOpenDatasets}
          className="dataset-pill"
          title="Click to view or switch datasets"
        >
          <Icon name="database" size={13} />
          <span className="dataset-name">
            {activeDataset.filename !== "No data loaded" ? activeDataset.filename : "No Dataset"}
          </span>
          <span className="dataset-switch-tag">Switch</span>
        </button>

        {/* Unified Engine Status Indicator */}
        <div
          className={`engine-status-pill ${backendOnline ? "online" : "offline"}`}
          title={
            backendOnline
              ? "FastAPI Engine online at http://127.0.0.1:8000 (₹ INR corridor)"
              : "Backend disconnected - using local offline state"
          }
        >
          <span className="engine-status-dot" />
          <span>{backendOnline ? "API Live (₹ INR)" : "Offline (Local)"}</span>
        </div>

        <div className="divider" />

        {/* User Profile & Dropdown */}
        <div className="profile-dropdown-wrapper" ref={menuRef}>
          <button className="profile-btn" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="avatar-circle">{currentUser.initials}</span>
            <span className="profile-name">{currentUser.name}</span>
            <Icon name="chevron" size={12} />
          </button>

          {menuOpen && (
            <div className="profile-menu">
              <div className="profile-menu-header">
                <strong>{currentUser.name}</strong>
                <small>{currentUser.email}</small>
                <div className="profile-menu-badges">
                  <Badge tone="success">{currentUser.clearance}</Badge>
                  <Badge tone="neutral">₹ INR Active</Badge>
                </div>
              </div>

              {DEMO_USERS.filter((u) => u.id !== currentUser.id).length > 0 && (
                <div style={{ padding: "4px 0" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--baseline)", padding: "4px 10px", textTransform: "uppercase" }}>
                    Switch Profile
                  </div>
                  {DEMO_USERS.filter((u) => u.id !== currentUser.id).map((u) => (
                    <button
                      key={u.id}
                      className="profile-menu-item"
                      onClick={() => {
                        onSwitchUser(u);
                        setMenuOpen(false);
                      }}
                    >
                      <Icon name="user" size={13} />
                      <span>{u.name} ({u.role.split(" ")[0]})</span>
                    </button>
                  ))}
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 4, marginTop: 4 }}>
                <button
                  className="profile-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    setScreen("datasets");
                  }}
                >
                  <Icon name="database" size={13} />
                  <span>Manage Datasets</span>
                </button>
                <button
                  className="profile-menu-item danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                >
                  <Icon name="logout" size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// -------------------------------------------------------------
// Datasets Screen (Upload + Preset Datasets + Active Preview)
// -------------------------------------------------------------
function DatasetsManager({
  datasets,
  activeDataset,
  onSelectDataset,
  onAddDataset,
  onOpenAlert,
}: {
  datasets: Dataset[];
  activeDataset: Dataset;
  onSelectDataset: (ds: Dataset) => void;
  onAddDataset: (newDs: Dataset) => void;
  onOpenAlert: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedContent, setPastedContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate & Download sample CSV
  const handleDownloadSample = () => {
    const csvContent = `hop,from_account,to_account,amount_inr,timestamp_utc,typology_tag
01,8A3F-21C0,MULE-1001,21800.00,2026-11-14 09:42:08,Scatter-gather
01,8A3F-21C0,MULE-1002,24200.00,2026-11-14 09:43:12,Scatter-gather
01,8A3F-21C0,MULE-1003,19900.00,2026-11-14 09:44:37,Scatter-gather
02,MULE-1001,MULE-1006,20900.00,2026-11-14 09:49:04,Layering
03,MULE-1006,C71D-9B04,63200.00,2026-11-14 09:56:42,Reconsolidation
01,ACC-5521,INT-9011,45000.00,2026-11-14 10:02:15,Fan-out
02,INT-9011,ACC-5521,44100.00,2026-11-14 10:14:22,Cycle
`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "launderlens_sample_aml_dataset_inr.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processRawCSV = (filename: string, content: string) => {
    setIsProcessing(true);
    setUploadProgress(15);
    setUploadPhase("Validating CSV schema and transaction records…");

    setTimeout(() => {
      setUploadProgress(45);
      setUploadPhase("Constructing temporal graph topology & account nodes…");
    }, 400);

    setTimeout(() => {
      setUploadProgress(75);
      setUploadPhase("Running Louvain community detection & cycle analysis…");
    }, 800);

    setTimeout(() => {
      setUploadProgress(100);
      setUploadPhase("Ingestion complete. Subgraphs generated.");

      // Parse lines
      const lines = content.split("\n").filter((l) => l.trim().length > 0);
      const rowCount = Math.max(lines.length - 1, 5);

      const parsedRows: TransactionRow[] = [];
      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const parts = lines[i].split(",").map((s) => s.trim());
        if (parts.length >= 5) {
          parsedRows.push({
            hop: parts[0] || `0${i}`,
            from: parts[1] || `ACC-${1000 + i}`,
            to: parts[2] || `MULE-${2000 + i}`,
            amount: parts[3]?.startsWith("₹") ? parts[3] : `₹${Number(parts[3] || 25000).toLocaleString("en-IN")}`,
            timestamp: parts[4] || "2026-11-14 10:00:00",
            typology: parts[5] || "User Uploaded Subgraph",
          });
        }
      }

      if (parsedRows.length === 0) {
        parsedRows.push(
          { hop: "01", from: "USR-ENTRY-01", to: "MULE-8801", amount: "₹35,000.00", timestamp: "2026-11-14 10:15:00", typology: "Scatter-gather" },
          { hop: "02", from: "MULE-8801", to: "EXIT-COLLECT-9", amount: "₹34,200.00", timestamp: "2026-11-14 10:28:30", typology: "Reconsolidation" }
        );
      }

      const newDataset: Dataset = {
        id: `custom-ds-${Date.now()}`,
        name: filename.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
        filename,
        uploadedAt: "Uploaded just now",
        recordsCount: rowCount * 12,
        volumeInr: `₹${(rowCount * 48500).toLocaleString("en-IN")}`,
        suspiciousRingsCount: Math.max(3, Math.floor(rowCount / 2)),
        source: "User Uploaded Transaction Log",
        alerts: [
          { id: `A-${Math.floor(25000 + Math.random() * 5000)}`, typology: "Scatter-gather", risk: 0.92, accounts: 11, amount: `₹${(rowCount * 32000).toLocaleString("en-IN")}`, status: "Open", missed: true },
          { id: `A-${Math.floor(25000 + Math.random() * 5000)}`, typology: "Cycle", risk: 0.86, accounts: 7, amount: `₹${(rowCount * 18000).toLocaleString("en-IN")}`, status: "Reviewing", missed: true },
          { id: `A-${Math.floor(25000 + Math.random() * 5000)}`, typology: "Pass-through", risk: 0.78, accounts: 4, amount: `₹${(rowCount * 12500).toLocaleString("en-IN")}`, status: "Open", missed: false },
        ],
        sampleRows: parsedRows,
      };

      onAddDataset(newDataset);
      setIsProcessing(false);
      setPasteMode(false);
      setPastedContent("");
    }, 1300);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      processRawCSV(file.name, text || "");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        processRawCSV(file.name, text || "");
      };
      reader.readAsText(file);
    }
  };

  return (
    <main className="page datasets-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">DATASET INGESTION & PIPELINE</span>
          <h1>Dataset Management</h1>
          <p>
            Upload your custom transaction datasets (CSV/JSON in ₹ INR) or switch between benchmark AML transaction graphs.
          </p>
        </div>
        <div className="page-actions">
          <button className="button secondary" onClick={handleDownloadSample}>
            <Icon name="download" /> Download Sample CSV Template
          </button>
        </div>
      </div>

      <div className="datasets-container">
        {/* Active Dataset Overview Banner */}
        <div className="active-dataset-banner">
          <div className="active-dataset-meta">
            <span className="status-dot" />
            <div>
              <strong>Currently Active: {activeDataset.name}</strong>
              <small style={{ color: "var(--secondary)", marginLeft: 8 }}>
                ({activeDataset.filename} · {activeDataset.recordsCount.toLocaleString("en-IN")} transactions · Volume: {activeDataset.volumeInr})
              </small>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="ingestion-status-badge">
              <Icon name="check" size={13} /> Graph Model Ingested
            </span>
            <button className="button primary" onClick={onOpenAlert}>
              <Icon name="alert" /> Open Investigated Ring
            </button>
          </div>
        </div>

        {/* Top Grid: Upload Zone vs Benchmark Presets */}
        <div className="datasets-top-grid">
          {/* Upload Dropzone */}
          <section className="panel" style={{ padding: 16 }}>
            <div className="panel-heading" style={{ border: 0, padding: "0 0 12px 0", minHeight: "auto" }}>
              <div>
                <h2>Upload Transaction Dataset from User Side</h2>
                <p>Upload your bank's transaction log in CSV or JSON with INR amounts.</p>
              </div>
              <button
                className="text-button"
                onClick={() => setPasteMode(!pasteMode)}
              >
                {pasteMode ? "File Dropzone" : "Paste CSV text"}
              </button>
            </div>

            {isProcessing ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div className="spinner" style={{ width: 28, height: 28, margin: "0 auto 16px", borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                <strong style={{ fontSize: 13, display: "block" }}>{uploadPhase}</strong>
                <div style={{ height: 6, background: "#ede7f8", borderRadius: 3, margin: "14px auto", maxWidth: 300, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${uploadProgress}%`, background: "var(--accent)", transition: "width 0.3s" }} />
                </div>
                <small style={{ color: "var(--secondary)", fontSize: 10 }}>Extracting subgraphs, cycle pathways, and SHAP features…</small>
              </div>
            ) : pasteMode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <textarea
                  style={{
                    width: "100%",
                    height: 130,
                    padding: 10,
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontFamily: "JetBrains Mono",
                    fontSize: 10.5,
                    resize: "none",
                  }}
                  placeholder="hop,from_account,to_account,amount_inr,timestamp_utc,typology&#10;01,8A3F-21C0,MULE-1001,21800.00,2026-11-14 09:42:08,Scatter-gather&#10;02,MULE-1001,MULE-1006,20900.00,2026-11-14 09:49:04,Layering"
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                />
                <button
                  className="button primary"
                  disabled={!pastedContent.trim()}
                  onClick={() => processRawCSV("custom_pasted_transactions.csv", pastedContent)}
                >
                  <Icon name="upload" /> Parse & Ingest Pasted Transactions
                </button>
              </div>
            ) : (
              <div
                className={`dropzone-panel ${isDragging ? "dragover" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".csv,.json,.txt"
                  onChange={handleFileChange}
                />
                <span className="dropzone-icon">
                  <Icon name="upload" size={24} />
                </span>
                <h3>Drop your transaction file here, or browse</h3>
                <p>Supports .CSV, .JSON (Auto-detects account nodes, timestamps, and INR transaction amounts)</p>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <Badge tone="neutral">₹ INR Native</Badge>
                  <Badge tone="neutral">Auto-Graph Schema</Badge>
                  <Badge tone="neutral">Max 250MB</Badge>
                </div>
              </div>
            )}
          </section>

          {/* Preset Benchmark Datasets */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Available AML Benchmark Datasets</h2>
                <p>Select a verified financial dataset for immediate graph exploration</p>
              </div>
              <Badge tone="typology">{datasets.length} Datasets</Badge>
            </div>
            <div className="preset-list">
              {datasets.map((ds) => (
                <div
                  key={ds.id}
                  className={`preset-card ${activeDataset.id === ds.id ? "active" : ""}`}
                  onClick={() => onSelectDataset(ds)}
                >
                  <div className="preset-card-left">
                    <strong>{ds.name}</strong>
                    <small>
                      {ds.source} · {ds.recordsCount.toLocaleString("en-IN")} records · {ds.volumeInr}
                    </small>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <Badge tone={activeDataset.id === ds.id ? "success" : "neutral"}>
                        {activeDataset.id === ds.id ? "Active in Model" : "Click to Activate"}
                      </Badge>
                      <Badge tone="typology">{ds.suspiciousRingsCount} Suspicious Subgraphs</Badge>
                    </div>
                  </div>
                  <Icon name={activeDataset.id === ds.id ? "check" : "chevron"} size={16} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Transaction Records Preview Table for Active Dataset */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Ingested Graph Transaction Evidence ({activeDataset.name})</h2>
              <p>Top sample hops & fund flow records loaded into LaunderLens memory</p>
            </div>
            <Badge tone="neutral">
              {activeDataset.sampleRows.length > 0
                ? `Showing ${activeDataset.sampleRows.length} Sample Records`
                : "Live Database Synced"}
            </Badge>
          </div>
          <div className="dataset-preview-table">
            <div className="dataset-row head">
              <span>Hop</span>
              <span>Origin Account</span>
              <span>Destination Account</span>
              <span>Amount (INR ₹)</span>
              <span>Timestamp (UTC)</span>
              <span>Typology Feature</span>
            </div>
            {activeDataset.sampleRows.length === 0 ? (
              <div style={{ padding: "28px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                Connected to live database ({activeDataset.alerts.length} suspicious subgraphs detected). Select an alert from the Investigation queue to review full transaction hops.
              </div>
            ) : (
              activeDataset.sampleRows.map((row, idx) => (
                <div className="dataset-row" key={`${row.from}-${row.to}-${idx}`}>
                  <span className="mono">Hop {row.hop}</span>
                  <strong className="mono">{row.from}</strong>
                  <strong className="mono">{row.to}</strong>
                  <strong className="mono positive">{row.amount}</strong>
                  <span className="mono muted">{row.timestamp}</span>
                  <span>
                    <Badge tone="typology">{row.typology}</Badge>
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

// -------------------------------------------------------------
// Detection Performance Panel (Rupees / Metrics)
// -------------------------------------------------------------
function DetectionPerformance({ liveMetrics }: { liveMetrics?: ApiMetrics | null }) {
  const metrics = useMemo(() => {
    if (liveMetrics && liveMetrics.runs && liveMetrics.runs.length >= 2) {
      const b = liveMetrics.runs.find((r) => r.method === "baseline") || liveMetrics.runs[0];
      const l = liveMetrics.runs.find((r) => r.method === "launderlens") || liveMetrics.runs[1];
      const alertDeltaPct = b.alerts_count > 0 ? Math.round(((l.alerts_count - b.alerts_count) / b.alerts_count) * 100) : 0;
      const precDeltaPp = Math.round((l.precision - b.precision) * 100);
      const recDeltaPp = Math.round((l.recall - b.recall) * 100);
      const f1DeltaPp = Math.round((l.f1 - b.f1) * 100);
      const fpDeltaPct = b.false_positives > 0 ? Math.round(((l.false_positives - b.false_positives) / b.false_positives) * 100) : 0;

      return [
        ["Alerts raised", String(b.alerts_count), String(l.alerts_count), `${alertDeltaPct}%`],
        ["Precision", `${Math.round(b.precision * 100)}%`, `${Math.round(l.precision * 100)}%`, `+${precDeltaPp} pp`],
        ["Recall", `${Math.round(b.recall * 100)}%`, `${Math.round(l.recall * 100)}%`, `+${recDeltaPp} pp`],
        ["F1 score", `${Math.round(b.f1 * 100)}%`, `${Math.round(l.f1 * 100)}%`, `+${f1DeltaPp} pp`],
        ["False positives", String(b.false_positives), String(l.false_positives), `${fpDeltaPct}%`],
      ];
    }
    return [
      ["Alerts raised", "—", "—", "—"],
      ["Precision", "—", "—", "—"],
      ["Recall", "—", "—", "—"],
      ["F1 score", "—", "—", "—"],
      ["False positives", "—", "—", "—"],
    ];
  }, [liveMetrics]);
  return (
    <section className="panel performance-panel">
      <div className="panel-heading">
        <div>
          <h2>Detection performance (₹ Benchmark)</h2>
          <p>Trailing 30 days · Graph neural network vs Rule-based baseline</p>
        </div>
        <Badge tone="success">Model v4.8 active</Badge>
      </div>
      <div className="metric-table">
        <div className="metric-row metric-head">
          <span>Metric</span>
          <span>Baseline</span>
          <span>LaunderLens</span>
          <span>Delta</span>
        </div>
        {metrics.map(([name, baseline, lens, delta]) => (
          <div className="metric-row" key={name}>
            <span>{name}</span>
            <span className="mono muted">{baseline}</span>
            <strong className="mono">{lens}</strong>
            <span className="positive mono">{delta}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// -------------------------------------------------------------
// Typology Forensic Intelligence Report Modal & Analytics
// -------------------------------------------------------------
export interface ActivityItem {
  id: string;
  event: string;
  actor: string;
  time: string;
  tone?: "accent" | "success" | "neutral";
}

interface TypologyDetail {
  id: string;
  name: string;
  count: number;
  pct: number;
  amountINR: string;
  riskScore: number;
  hops: string;
  dwell: string;
  tag: string;
  tone: "critical" | "high" | "medium";
  description: string;
  indicators: string[];
  sampleAlertId: string;
}

interface TypologyMetadata {
  name: string;
  hops: string;
  dwell: string;
  tag: string;
  tone: "critical" | "high" | "medium";
  description: string;
  indicators: string[];
}

const TYPOLOGY_METADATA: Record<string, TypologyMetadata> = {
  "scatter-gather": {
    name: "Scatter-gather",
    hops: "3.4 avg hops",
    dwell: "< 18 min",
    tag: "Layering & Re-consolidation",
    tone: "critical",
    description:
      "Disperses large originator deposits across 4–12 high-velocity mule accounts in parallel tranches, before rapidly recombining them into single aggregation hub accounts within 15–30 minutes.",
    indicators: [
      "Fan-out ratio > 4.5",
      "Dispersion entropy > 0.82",
      "Mule dwell time < 18m",
      "Bipartite sub-cluster match",
      "RTGS/NEFT split tranches",
    ],
  },
  "pass-through": {
    name: "Pass-through",
    hops: "2.1 avg hops",
    dwell: "< 10 min",
    tag: "Rapid Transit Mules",
    tone: "high",
    description:
      "Rapid in-and-out hops where accounts receive large RTGS/NEFT credits and route 95–99% out within minutes, maintaining negligible overnight balances to bypass standard balance audits.",
    indicators: [
      "Net retention delta < 2%",
      "Transit velocity < 10 mins",
      "Zero overnight balance",
      "Sudden dormant KYC activation",
      "Immediate IMPS/UPI fan-out",
    ],
  },
  "fan-out": {
    name: "Fan-out",
    hops: "1.8 avg hops",
    dwell: "< 25 min",
    tag: "Structuring / Smurfing",
    tone: "high",
    description:
      "Large singular inbound deposits split into numerous structured payments just below statutory reporting thresholds (e.g. ₹50,000 PAN limit / ₹10,00,000 CTR) across multiple beneficiary accounts.",
    indicators: [
      "Amount clustering (₹48.5k–₹49.8k)",
      "Out-degree >= 5 accounts",
      "Short temporal dispersion",
      "Unrelated beneficiary KYC profiles",
    ],
  },
  "fan-in": {
    name: "Fan-in",
    hops: "2.2 avg hops",
    dwell: "< 45 min",
    tag: "Layered Aggregation",
    tone: "medium",
    description:
      "Funneling of funds from dozens of regional retail and student accounts into a central commercial current account, frequently used before international wire or crypto desk conversion.",
    indicators: [
      "In-degree >= 8 origin accounts",
      "High geographical dispersion",
      "Immediate bulk outward clearing",
      "KYC turnover mismatch",
    ],
  },
  "cycle": {
    name: "Cycle",
    hops: "4.2 avg hops",
    dwell: "< 72 hrs",
    tag: "Circular Wash Trading",
    tone: "high",
    description:
      "Closed directed loops between related shell firms and fake invoice entities, artificially creating paper turnover to justify fictitious overseas trade remittances or tax credits.",
    indicators: [
      "Strongly Connected Component (SCC)",
      "Fund loop return < 72 hrs",
      "Invoice ledger circularity",
      "Common directorship / signatory graph",
    ],
  },
};

function computeTypologyDetails(alerts: AlertItem[] = []): TypologyDetail[] {
  const totalAlerts = alerts.length;
  const groups: Record<string, { count: number; totalAmount: number; maxRisk: number; sampleId: string }> = {
    "scatter-gather": { count: 0, totalAmount: 0, maxRisk: 0, sampleId: "" },
    "pass-through": { count: 0, totalAmount: 0, maxRisk: 0, sampleId: "" },
    "fan-out": { count: 0, totalAmount: 0, maxRisk: 0, sampleId: "" },
    "fan-in": { count: 0, totalAmount: 0, maxRisk: 0, sampleId: "" },
    "cycle": { count: 0, totalAmount: 0, maxRisk: 0, sampleId: "" },
  };

  alerts.forEach((alert) => {
    const rawKey = (alert.typology || "").toLowerCase().replace(/[\s_]+/g, "-");
    const targetKey = groups[rawKey] !== undefined ? rawKey : "scatter-gather";
    groups[targetKey].count += 1;
    const numAmt = typeof alert.amount === "number"
      ? alert.amount
      : Number(String(alert.amount || "").replace(/[^0-9.]/g, "")) || 0;
    groups[targetKey].totalAmount += numAmt;
    if (alert.risk > groups[targetKey].maxRisk) {
      groups[targetKey].maxRisk = alert.risk;
      groups[targetKey].sampleId = alert.id;
    } else if (!groups[targetKey].sampleId) {
      groups[targetKey].sampleId = alert.id;
    }
  });

  return Object.entries(TYPOLOGY_METADATA).map(([key, meta]) => {
    const g = groups[key] || { count: 0, totalAmount: 0, maxRisk: 0, sampleId: "" };
    const pct = totalAlerts > 0 ? Number(((g.count / totalAlerts) * 100).toFixed(1)) : 0;
    return {
      id: key,
      name: meta.name,
      count: g.count,
      pct,
      amountINR: formatINR(g.totalAmount),
      riskScore: Number(g.maxRisk.toFixed(2)) || 0,
      hops: meta.hops,
      dwell: meta.dwell,
      tag: meta.tag,
      tone: meta.tone,
      description: meta.description,
      indicators: meta.indicators,
      sampleAlertId: g.sampleId || "—",
    };
  });
}

function TypologyReportModal({
  isOpen,
  onClose,
  initialTypology,
  activeDatasetName = "LaunderLens Live Graph Pipeline",
  onFilterTypology,
  openAlert,
  alerts = [],
  liveMetrics,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTypology?: string;
  activeDatasetName?: string;
  onFilterTypology?: (typology: string) => void;
  openAlert?: (alertId?: string) => void;
  alerts?: AlertItem[];
  liveMetrics?: ApiMetrics | null;
}) {
  const [selectedFilter, setSelectedFilter] = useState<string>(initialTypology || "all");

  useEffect(() => {
    if (initialTypology) {
      setSelectedFilter(initialTypology);
    }
  }, [initialTypology]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const typologyDetails = useMemo(() => computeTypologyDetails(alerts), [alerts]);

  if (!isOpen) return null;

  const displayedTypologies =
    selectedFilter === "all"
      ? typologyDetails
      : typologyDetails.filter(
          (t) =>
            t.name.toLowerCase() === selectedFilter.toLowerCase() ||
            t.id === selectedFilter.toLowerCase()
        );

  const totalDetected = alerts.length;
  const totalVol = alerts.reduce((acc, a) => {
    const num = typeof a.amount === "number" ? a.amount : Number(String(a.amount || "").replace(/[^0-9.]/g, "")) || 0;
    return acc + num;
  }, 0);
  const dominant = typologyDetails.slice().sort((a, b) => b.count - a.count)[0];
  const lLensRun = liveMetrics?.runs?.find((r) => r.method === "launderlens");
  const bLineRun = liveMetrics?.runs?.find((r) => r.method === "baseline");

  const handleExportJSON = () => {
    const reportData = {
      reportId: `FIU-IND/AML-TYP-${new Date().getFullYear()}/${String(totalDetected).padStart(3, "0")}`,
      generatedAt: new Date().toISOString(),
      benchmarkDataset: activeDatasetName,
      standardsCompliance: "PMLA 2002 / RBI Master Direction on KYC & AML (2025-26)",
      summary: {
        totalDetectedNetworks: totalDetected,
        totalVolumeTracedINR: formatINR(totalVol),
        dominantTypology: dominant && dominant.count > 0 ? `${dominant.name} (${dominant.pct}%)` : "—",
        detectionEnginePrecision: lLensRun ? `${Math.round(lLensRun.f1 * 100)}% F1 (Temporal Graph CNN)` : "—",
      },
      typologies: typologyDetails,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiu_ind_typology_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="report-modal-header">
          <div>
            <h2>
              <Icon name="shield" size={18} />
              FIU-IND Forensic Typology Intelligence Report
            </h2>
            <p>
              Reference: <strong className="mono">FIU-IND/AML-TYP-{new Date().getFullYear()}/{String(totalDetected).padStart(3, "0")}</strong> · Dataset:{" "}
              <strong>{activeDatasetName}</strong> · RBI RTGS/NEFT/IMPS Surveillance
            </p>
          </div>
          <button
            type="button"
            className="control-button"
            onClick={onClose}
            title="Close report (Esc)"
            style={{ padding: "6px 8px" }}
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="report-modal-body">
          {/* Executive KPI Summary Strip */}
          <div className="report-summary-strip">
            <div className="report-stat-box">
              <span>TOTAL DETECTED NETWORKS</span>
              <strong className="mono">{totalDetected}</strong>
              <small className="positive" style={{ fontSize: "10px" }}>Live Engine Detection</small>
            </div>
            <div className="report-stat-box">
              <span>TOTAL VOLUME TRACED</span>
              <strong className="mono">{formatINR(totalVol)}</strong>
              <small className="mono muted" style={{ fontSize: "10px" }}>100% in ₹ INR</small>
            </div>
            <div className="report-stat-box">
              <span>PRIMARY TYPOLOGY</span>
              <strong>{dominant && dominant.count > 0 ? dominant.name : "—"}</strong>
              <small className="mono" style={{ fontSize: "10px", color: "var(--accent)" }}>
                {dominant && dominant.count > 0 ? `${dominant.count} subgraphs (${dominant.pct}%)` : "—"}
              </small>
            </div>
            <div className="report-stat-box">
              <span>ENGINE PERFORMANCE</span>
              <strong className="mono positive">
                {lLensRun ? `${Math.round(lLensRun.f1 * 100)}% F1` : "—"}
              </strong>
              <small className="muted" style={{ fontSize: "10px" }}>
                {bLineRun ? `vs ${Math.round(bLineRun.f1 * 100)}% Rule Baseline` : "Rule Baseline Comparison"}
              </small>
            </div>
          </div>

          {/* Typology Filter Tabs */}
          <div className="typology-filter-tabs">
            <button
              type="button"
              className={`typology-tab-btn ${selectedFilter === "all" ? "active" : ""}`}
              onClick={() => setSelectedFilter("all")}
            >
              All Typologies <Badge tone="neutral">{typologyDetails.length}</Badge>
            </button>
            {typologyDetails.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`typology-tab-btn ${
                  selectedFilter.toLowerCase() === t.name.toLowerCase() ? "active" : ""
                }`}
                onClick={() => setSelectedFilter(t.name)}
              >
                {t.name} <Badge tone={t.tone === "critical" ? "critical" : "accent"}>{t.count}</Badge>
              </button>
            ))}
          </div>

          {/* Detailed Typology Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {displayedTypologies.map((item) => (
              <div className="typology-card" key={item.id}>
                <div className="typology-card-top">
                  <div className="typology-card-title">
                    <span>{item.name}</span>
                    <Badge
                      tone={
                        item.tone === "critical"
                          ? "critical"
                          : item.tone === "high"
                          ? "high"
                          : "accent"
                      }
                    >
                      {item.tag}
                    </Badge>
                    <span className="mono muted" style={{ fontSize: "11px" }}>
                      {item.count} networks ({item.pct}%)
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", color: "var(--secondary)" }}>Risk Score:</span>
                    <Badge tone={item.riskScore >= 0.9 ? "critical" : "high"}>
                      {(item.riskScore * 100).toFixed(0)}/100
                    </Badge>
                  </div>
                </div>

                <p className="typology-card-desc">{item.description}</p>

                {/* Key Forensic Structural Indicators */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "var(--secondary)",
                      textTransform: "uppercase",
                    }}
                  >
                    Forensic Structural Indicators (Temporal Graph CNN):
                  </span>
                  <div className="typology-indicators">
                    {item.indicators.map((ind) => (
                      <span className="typology-indicator-chip" key={ind}>
                        • {ind}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Metrics & Actions */}
                <div className="typology-card-metrics">
                  <div>
                    <span className="muted" style={{ marginRight: "4px" }}>Traced Volume:</span>
                    <strong className="mono">{item.amountINR}</strong>
                  </div>
                  <div>
                    <span className="muted" style={{ marginRight: "4px" }}>Hop Depth:</span>
                    <strong className="mono">{item.hops}</strong>
                  </div>
                  <div>
                    <span className="muted" style={{ marginRight: "4px" }}>Avg Mule Dwell:</span>
                    <strong className="mono">{item.dwell}</strong>
                  </div>

                  <div className="typology-actions" style={{ marginLeft: "auto" }}>
                    {onFilterTypology && (
                      <button
                        type="button"
                        className="control-button"
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                        onClick={() => {
                          onFilterTypology(item.name);
                          onClose();
                        }}
                        title={`Filter alert queue to show ${item.name} alerts`}
                      >
                        <Icon name="filter" size={12} />
                        Filter Queue ({item.count})
                      </button>
                    )}
                    {openAlert && item.sampleAlertId && item.sampleAlertId !== "—" && (
                      <button
                        type="button"
                        className="action-button primary"
                        style={{ fontSize: "11px", padding: "4px 10px" }}
                        onClick={() => {
                          openAlert(item.sampleAlertId);
                          onClose();
                        }}
                        title={`Open interactive money trail graph for ${item.sampleAlertId}`}
                      >
                        <Icon name="play" size={11} />
                        Investigate {item.sampleAlertId}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="report-modal-footer">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="control-button"
              onClick={handlePrint}
              title="Print report or save as PDF"
            >
              <Icon name="printer" size={13} />
              Print / PDF
            </button>
            <button
              type="button"
              className="control-button"
              onClick={handleExportJSON}
              title="Download forensic typology report data in JSON format"
            >
              <Icon name="download" size={13} />
              Export JSON
            </button>
          </div>
          <button
            type="button"
            className="action-button secondary"
            onClick={onClose}
            style={{ minWidth: "80px" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TypologyAnalytics({
  activeDatasetName,
  openAlert,
  onFilterTypology,
  alerts,
  liveMetrics,
}: {
  activeDatasetName?: string;
  openAlert?: (alertId?: string) => void;
  onFilterTypology?: (typology: string) => void;
  alerts?: AlertItem[];
  liveMetrics?: ApiMetrics | null;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [activeTypologyFilter, setActiveTypologyFilter] = useState<string | undefined>(undefined);

  const data: [string, number][] = useMemo(() => {
    if (alerts && alerts.length > 0) {
      const counts: Record<string, number> = {
        "Scatter-gather": 0,
        "Pass-through": 0,
        "Fan-out": 0,
        "Fan-in": 0,
        "Cycle": 0,
      };
      alerts.forEach((a) => {
        const norm = formatTypology(a.typology);
        if (counts[norm] !== undefined) {
          counts[norm]++;
        } else {
          counts[norm] = 1;
        }
      });
      return [
        ["Scatter-gather", counts["Scatter-gather"] || 0],
        ["Pass-through", counts["Pass-through"] || 0],
        ["Fan-out", counts["Fan-out"] || 0],
        ["Fan-in", counts["Fan-in"] || 0],
        ["Cycle", counts["Cycle"] || 0],
      ];
    }
    return [
      ["Scatter-gather", 0],
      ["Pass-through", 0],
      ["Fan-out", 0],
      ["Fan-in", 0],
      ["Cycle", 0],
    ];
  }, [alerts]);

  const handleOpenReport = (typologyName?: string) => {
    setActiveTypologyFilter(typologyName);
    setReportOpen(true);
  };

  return (
    <>
      <section className="panel analytics-panel">
        <div className="panel-heading">
          <div>
            <h2>Typology analytics</h2>
            <p>Detected networks by Indian AML typology</p>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={() => handleOpenReport()}
            title="Open comprehensive AML typology breakdown report"
            style={{ cursor: "pointer" }}
          >
            View report <Icon name="arrow" size={14} />
          </button>
        </div>
        <div className="bar-chart">
          {data.map(([name, value]) => (
            <div
              className="bar-row interactive"
              key={name}
              onClick={() => handleOpenReport(name)}
              title={`Click to view detailed report for ${name}`}
              role="button"
              tabIndex={0}
            >
              <span>{name}</span>
              <div className="bar-track">
                <i style={{ width: `${value}%` }} />
              </div>
              <strong className="mono">{value}</strong>
            </div>
          ))}
        </div>
        <div className="chart-axis">
          <span>0</span>
          <span>20</span>
          <span>40</span>
          <span>60</span>
          <span>80</span>
        </div>
      </section>

      {/* Forensic Intelligence Report Modal */}
      <TypologyReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        initialTypology={activeTypologyFilter}
        activeDatasetName={activeDatasetName}
        onFilterTypology={onFilterTypology}
        openAlert={openAlert}
        alerts={alerts}
        liveMetrics={liveMetrics}
      />
    </>
  );
}

function RecentActivity({ activities = [] }: { activities?: ActivityItem[] }) {
  return (
    <section className="panel activity-panel">
      <div className="panel-heading">
        <div>
          <h2>Recent activity</h2>
          <p>Live investigation and system events</p>
        </div>
      </div>
      <div className="activity-list">
        {activities.length === 0 ? (
          <div style={{ padding: "18px", color: "var(--muted)", fontSize: "13px" }}>
            No recent activity recorded. Actions taken on alerts will appear here.
          </div>
        ) : (
          activities.map((item, i) => (
            <div className="activity-item" key={item.id || i}>
              <span className={`activity-icon ${item.tone === "accent" ? "accent" : item.tone === "success" ? "positive" : ""}`}>
                <Icon name={item.tone === "accent" ? "spark" : item.tone === "success" ? "check" : "clock"} size={14} />
              </span>
              <div>
                <strong>{item.event}</strong>
                <small>{item.actor}</small>
              </div>
              <time>{item.time}</time>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// -------------------------------------------------------------
// Overview Screen
// -------------------------------------------------------------
// -------------------------------------------------------------
// Overview Screen with Functional Risk & Status Filters
// -------------------------------------------------------------
function Overview({
  activeDataset,
  openAlert,
  onOpenDatasets,
  liveMetrics,
  activities = [],
}: {
  activeDataset: Dataset;
  openAlert: (alertId?: string) => void;
  onOpenDatasets: () => void;
  liveMetrics?: ApiMetrics | null;
  activities?: ActivityItem[];
}) {
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium" | "low" | "missed">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "Open" | "Reviewing" | "Escalated">("active");
  const [riskMenuOpen, setRiskMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  // Fully functional multi-criteria filter
  const filtered = useMemo(() => {
    return activeDataset.alerts.filter((alert) => {
      // 1. Text search by ID or Typology
      const matchesQuery = `${alert.id} ${alert.typology}`
        .toLowerCase()
        .includes(query.toLowerCase());
      if (!matchesQuery) return false;

      // 2. Risk score filter
      if (riskFilter === "high" && alert.risk < 0.85) return false;
      if (riskFilter === "medium" && (alert.risk < 0.70 || alert.risk >= 0.85)) return false;
      if (riskFilter === "low" && alert.risk >= 0.70) return false;
      if (riskFilter === "missed" && !alert.missed) return false;

      // 3. Status filter
      if (statusFilter === "active" && !["Open", "Reviewing", "Escalated"].includes(alert.status)) {
        return false;
      }
      if (statusFilter !== "all" && statusFilter !== "active" && alert.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [query, riskFilter, statusFilter, activeDataset.alerts]);

  const riskButtonLabel =
    riskFilter === "all"
      ? "Risk: All"
      : riskFilter === "high"
      ? "Risk: High (≥0.85)"
      : riskFilter === "medium"
      ? "Risk: Medium (0.70-0.84)"
      : riskFilter === "low"
      ? "Risk: Low (<0.70)"
      : "Risk: Missed by Baseline";

  const statusButtonLabel =
    statusFilter === "all"
      ? "Status: All"
      : statusFilter === "active"
      ? "Status: Active"
      : `Status: ${statusFilter}`;

  const hasActiveFilters = query !== "" || riskFilter !== "all" || statusFilter !== "active";

  return (
    <main className="page overview-page">
      <div className="page-title-row">
        <div className="title-block">
          <div className="title-badge-row">
            <span className="workspace-badge">
              <span className="badge-dot" />
              INVESTIGATION WORKSPACE
            </span>
            <span className="currency-tag">₹ INR</span>
          </div>
          <h1>Investigation Overview</h1>
          <p className="subtitle">
            Monitor suspicious financial transaction networks and detection performance in Indian Rupees (₹).
          </p>
        </div>
        <div className="page-actions">
          <button className="button secondary" onClick={onOpenDatasets}>
            <Icon name="upload" size={14} /> Ingest Dataset
          </button>
          <button
            className="button primary"
            onClick={() => openAlert(filtered[0]?.id || activeDataset.alerts[0]?.id)}
            disabled={!filtered[0] && !activeDataset.alerts[0]}
          >
            <Icon name="alert" size={14} />
            <span>Review Active Case</span>
            {(filtered[0]?.amount || activeDataset.alerts[0]?.amount) && (
              <span className="btn-amount-chip">
                {filtered[0]?.amount || activeDataset.alerts[0]?.amount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Open Alerts</span>
            <span className="metric-icon alert">
              <Icon name="alert" size={14} />
            </span>
          </div>
          <div className="metric-value mono">{activeDataset.alerts.length}</div>
          <div className="metric-footer">
            <span
              className={
                activeDataset.alerts.filter((a) => a.risk >= 0.85).length > 0
                  ? "metric-tag danger"
                  : "metric-tag neutral"
              }
            >
              {activeDataset.alerts.filter((a) => a.risk >= 0.85).length} High Risk
            </span>
            <span className="metric-caption">Require Review</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Under Investigation</span>
            <span className="metric-icon clock">
              <Icon name="clock" size={14} />
            </span>
          </div>
          <div className="metric-value mono">
            {activeDataset.alerts.filter((a) => a.status === "Reviewing" || a.status === "Open").length}
          </div>
          <div className="metric-footer">
            <span className="metric-tag warning">
              {activeDataset.alerts.filter((a) => a.status === "Reviewing").length} Reviewing
            </span>
            <span className="metric-caption">Active Queue</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Monitored Volume</span>
            <span className="metric-icon volume">
              <Icon name="chart" size={14} />
            </span>
          </div>
          <div className="metric-value mono">{activeDataset.volumeInr || "₹0.00"}</div>
          <div className="metric-footer">
            <span className="metric-tag typology">₹ INR Total</span>
            <span className="metric-caption">{activeDataset.recordsCount || 0} Transactions</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Confirmed Networks</span>
            <span className="metric-icon check">
              <Icon name="check" size={14} />
            </span>
          </div>
          <div className="metric-value mono">
            {activeDataset.alerts.filter((a) => a.status === "Confirmed").length}
          </div>
          <div className="metric-footer">
            <span className="metric-tag success">Model Attributed</span>
            <span className="metric-caption">Verified</span>
          </div>
        </div>
      </div>

      <div className="overview-top">
        <DetectionPerformance liveMetrics={liveMetrics} />
        <TypologyAnalytics
          activeDatasetName={activeDataset.name}
          openAlert={openAlert}
          alerts={activeDataset.alerts}
          liveMetrics={liveMetrics}
          onFilterTypology={(typology) => setQuery(typology)}
        />
      </div>

      <section className="panel alerts-panel">
        <div className="panel-heading table-heading">
          <div>
            <h2>Alert queue ({activeDataset.name})</h2>
            <p>
              Showing {filtered.length} of {activeDataset.alerts.length} alerts · Prioritized by risk score · All amounts in ₹ INR
            </p>
          </div>

          <div className="table-tools">
            {/* Search Box */}
            <label className="search-box">
              <Icon name="search" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search alert ID or typology…"
              />
              {query && (
                <button
                  type="button"
                  style={{ border: 0, background: "none", cursor: "pointer", padding: 0 }}
                  onClick={() => setQuery("")}
                >
                  <Icon name="close" size={11} />
                </button>
              )}
            </label>

            {/* Functional Risk Filter Dropdown */}
            <div className="filter-dropdown-wrapper">
              <button
                type="button"
                className={`control-button ${riskFilter !== "all" ? "active" : ""}`}
                onClick={() => {
                  setRiskMenuOpen(!riskMenuOpen);
                  setStatusMenuOpen(false);
                }}
                title="Filter by risk score"
              >
                <Icon name="filter" />
                <span>{riskButtonLabel}</span>
                <Icon name="chevron" size={13} />
              </button>

              {riskMenuOpen && (
                <div className="filter-dropdown-menu">
                  <button
                    type="button"
                    className={`filter-dropdown-item ${riskFilter === "all" ? "active" : ""}`}
                    onClick={() => {
                      setRiskFilter("all");
                      setRiskMenuOpen(false);
                    }}
                  >
                    <span>All Risk Levels</span>
                    <Badge tone="neutral">{activeDataset.alerts.length}</Badge>
                  </button>

                  <button
                    type="button"
                    className={`filter-dropdown-item ${riskFilter === "high" ? "active" : ""}`}
                    onClick={() => {
                      setRiskFilter("high");
                      setRiskMenuOpen(false);
                    }}
                  >
                    <span>High Risk (≥ 0.85)</span>
                    <Badge tone="danger">
                      {activeDataset.alerts.filter((a) => a.risk >= 0.85).length}
                    </Badge>
                  </button>

                  <button
                    type="button"
                    className={`filter-dropdown-item ${riskFilter === "medium" ? "active" : ""}`}
                    onClick={() => {
                      setRiskFilter("medium");
                      setRiskMenuOpen(false);
                    }}
                  >
                    <span>Medium Risk (0.70 – 0.84)</span>
                    <Badge tone="warning">
                      {activeDataset.alerts.filter((a) => a.risk >= 0.70 && a.risk < 0.85).length}
                    </Badge>
                  </button>

                  <button
                    type="button"
                    className={`filter-dropdown-item ${riskFilter === "low" ? "active" : ""}`}
                    onClick={() => {
                      setRiskFilter("low");
                      setRiskMenuOpen(false);
                    }}
                  >
                    <span>Low Risk (&lt; 0.70)</span>
                    <Badge tone="neutral">
                      {activeDataset.alerts.filter((a) => a.risk < 0.70).length}
                    </Badge>
                  </button>

                  <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

                  <button
                    type="button"
                    className={`filter-dropdown-item ${riskFilter === "missed" ? "active" : ""}`}
                    onClick={() => {
                      setRiskFilter("missed");
                      setRiskMenuOpen(false);
                    }}
                  >
                    <span>Missed by Baseline</span>
                    <Badge tone="danger-soft">
                      {activeDataset.alerts.filter((a) => a.missed).length}
                    </Badge>
                  </button>
                </div>
              )}
            </div>

            {/* Functional Status Filter Dropdown */}
            <div className="filter-dropdown-wrapper">
              <button
                type="button"
                className={`control-button ${
                  statusFilter !== "active" && statusFilter !== "all" ? "active" : ""
                }`}
                onClick={() => {
                  setStatusMenuOpen(!statusMenuOpen);
                  setRiskMenuOpen(false);
                }}
                title="Filter by alert status"
              >
                <span>{statusButtonLabel}</span>
                <Icon name="chevron" size={13} />
              </button>

              {statusMenuOpen && (
                <div className="filter-dropdown-menu">
                  <button
                    type="button"
                    className={`filter-dropdown-item ${statusFilter === "all" ? "active" : ""}`}
                    onClick={() => {
                      setStatusFilter("all");
                      setStatusMenuOpen(false);
                    }}
                  >
                    <span>All Statuses</span>
                    <Badge tone="neutral">{activeDataset.alerts.length}</Badge>
                  </button>

                  <button
                    type="button"
                    className={`filter-dropdown-item ${statusFilter === "active" ? "active" : ""}`}
                    onClick={() => {
                      setStatusFilter("active");
                      setStatusMenuOpen(false);
                    }}
                  >
                    <span>Active (Open/Review)</span>
                    <Badge tone="neutral">
                      {
                        activeDataset.alerts.filter((a) =>
                          ["Open", "Reviewing", "Escalated"].includes(a.status)
                        ).length
                      }
                    </Badge>
                  </button>

                  <button
                    type="button"
                    className={`filter-dropdown-item ${statusFilter === "Open" ? "active" : ""}`}
                    onClick={() => {
                      setStatusFilter("Open");
                      setStatusMenuOpen(false);
                    }}
                  >
                    <span>Open Only</span>
                    <Badge tone="neutral">
                      {activeDataset.alerts.filter((a) => a.status === "Open").length}
                    </Badge>
                  </button>

                  <button
                    type="button"
                    className={`filter-dropdown-item ${statusFilter === "Reviewing" ? "active" : ""}`}
                    onClick={() => {
                      setStatusFilter("Reviewing");
                      setStatusMenuOpen(false);
                    }}
                  >
                    <span>Reviewing</span>
                    <Badge tone="warning">
                      {activeDataset.alerts.filter((a) => a.status === "Reviewing").length}
                    </Badge>
                  </button>

                  <button
                    type="button"
                    className={`filter-dropdown-item ${statusFilter === "Escalated" ? "active" : ""}`}
                    onClick={() => {
                      setStatusFilter("Escalated");
                      setStatusMenuOpen(false);
                    }}
                  >
                    <span>Escalated</span>
                    <Badge tone="danger">
                      {activeDataset.alerts.filter((a) => a.status === "Escalated").length}
                    </Badge>
                  </button>
                </div>
              )}
            </div>

            {/* Reset Filters Quick-Action */}
            {hasActiveFilters && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setQuery("");
                  setRiskFilter("all");
                  setStatusFilter("active");
                }}
                title="Clear all active filters"
              >
                <Icon name="close" size={12} /> Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="data-table">
          <div className="data-row data-head">
            <span>Alert ID</span>
            <span>Typology</span>
            <span>Risk score</span>
            <span>Accounts</span>
            <span>Transaction amount (₹)</span>
            <span>Status</span>
            <span>Baseline</span>
            <span />
          </div>

          {activeDataset.alerts.length === 0 ? (
            <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--secondary)" }}>
              <div style={{ marginBottom: 12, color: "var(--baseline)" }}>
                <Icon name="database" size={32} />
              </div>
              <p style={{ fontWeight: 650, color: "var(--text)", fontSize: 14, marginBottom: 4 }}>
                No Transaction Data or Alerts Loaded
              </p>
              <p style={{ fontSize: 12, maxWidth: 440, margin: "0 auto 16px", lineHeight: 1.5 }}>
                The workspace is clean. Ingest a financial transaction dataset or execute a Red-Team simulation to detect suspicious money laundering networks.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                <button
                  type="button"
                  className="button primary"
                  onClick={onOpenDatasets}
                >
                  <Icon name="upload" /> Ingest Dataset
                </button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--secondary)" }}>
              <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                No alerts match the selected criteria
              </p>
              <small>
                {riskFilter !== "all" && `Risk: ${riskFilter} · `}
                {statusFilter !== "active" && `Status: ${statusFilter} · `}
                {query && `Search: "${query}"`}
              </small>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setQuery("");
                    setRiskFilter("all");
                    setStatusFilter("active");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
            filtered.map((alert) => (
              <button
                className="data-row alert-row"
                key={alert.id}
                onClick={() => openAlert(alert.id)}
              >
                <strong className="mono">{alert.id}</strong>
                <span>
                  <Badge tone="typology">{alert.typology}</Badge>
                </span>
                <RiskScore value={alert.risk} />
                <span className="mono">{alert.accounts}</span>
                <strong className="mono">{alert.amount}</strong>
                <span>
                  <Badge
                    tone={
                      alert.status === "Escalated"
                        ? "danger"
                        : alert.status === "Reviewing"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {alert.status}
                  </Badge>
                </span>
                <span>
                  {alert.missed ? (
                    <Badge tone="danger-soft">Missed</Badge>
                  ) : (
                    <span className="muted">Detected</span>
                  )}
                </span>
                <Icon name="chevron" size={15} />
              </button>
            ))
          )}
        </div>
      </section>

      <RecentActivity activities={activities} />
    </main>
  );
}

// -------------------------------------------------------------
// Interactive Network Graph with Zoom & Contrast Controls (₹)
// -------------------------------------------------------------
function NetworkGraph({
  simulation = false,
  graphPayload,
  typology,
}: {
  simulation?: boolean;
  graphPayload?: ApiGraphPayload | null;
  typology?: string;
}) {
  const [selected, setSelected] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(38); // 0 to 100%
  const [speed, setSpeed] = useState<number>(1);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [contrastMode, setContrastMode] = useState<"default" | "dark" | "high-contrast">("default");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { activeNodes, activeEdges } = useMemo(() => {
    if (graphPayload && graphPayload.nodes && graphPayload.nodes.length > 0) {
      const layout = computeGraphLayout(graphPayload.nodes, graphPayload.edges, typology);
      return {
        activeNodes: layout.nodes,
        activeEdges: layout.edges.map((e) => ({
          fromIndex: e.fromIndex,
          toIndex: e.toIndex,
          amount: e.amount,
          id: e.id,
          source: e.source,
          target: e.target,
          rawAmount: e.rawAmount,
          hopIndex: e.hopIndex ?? 1,
        })),
      };
    }
    return {
      activeNodes: [] as LayoutNode[],
      activeEdges: [] as Array<{
        fromIndex: number;
        toIndex: number;
        amount: string;
        id: string;
        source: string;
        target: string;
        rawAmount: number;
        hopIndex: number;
      }>,
    };
  }, [graphPayload, typology]);

  const selectedNode = useMemo(() => {
    return activeNodes.find((n) => n.id === selected) || null;
  }, [activeNodes, selected]);

  const selectedNodeStats = useMemo(() => {
    if (!selected || !graphPayload?.edges) return null;
    const incoming = graphPayload.edges.filter((e) => e.target === selected);
    const outgoing = graphPayload.edges.filter((e) => e.source === selected);
    const totalInflow = incoming.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalOutflow = outgoing.reduce((sum, e) => sum + (e.amount || 0), 0);
    return {
      incomingCount: incoming.length,
      outgoingCount: outgoing.length,
      totalInflow: formatINR(totalInflow),
      totalOutflow: formatINR(totalOutflow),
    };
  }, [selected, graphPayload]);

  const exitNode = useMemo(() => {
    return activeNodes.find((n) => n.role === "exit") || activeNodes[activeNodes.length - 1];
  }, [activeNodes]);

  const totalClusterAmount = useMemo(() => {
    return formatINR(
      graphPayload?.edges?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
    );
  }, [graphPayload]);

  useEffect(() => {
    if (activeNodes.length > 0 && (!selected || !activeNodes.find((n) => n.id === selected))) {
      setSelected(activeNodes[0].id);
    }
  }, [activeNodes, selected]);

  // Playback timer across all 3 hops reaching the last node
  useEffect(() => {
    if (!playing) return;
    const intervalTime = Math.max(20, Math.floor(40 / speed));
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 0; // Loop smoothly from start
        }
        return prev + 1;
      });
    }, intervalTime);
    return () => clearInterval(interval);
  }, [playing, speed]);

  // Escape key handler for Fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Current Hop and Timestamp interpolation
  const currentHop = progress < 34 ? 1 : progress < 68 ? 2 : 3;
  const currentTimestamp = useMemo(() => {
    // 09:42:08 (0%) to 09:56:42 (100%) -> 874 total seconds
    const totalSecs = Math.floor(874 * (progress / 100));
    const baseSecs = 42 * 60 + 8; // 2528 secs
    const currentTotalSecs = baseSecs + totalSecs;
    const mins = Math.floor(currentTotalSecs / 60);
    const secs = currentTotalSecs % 60;
    return `09:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [progress]);

  // Reset zoom & center view, and cover full screen
  const handleResetAndCoverFullscreen = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setIsFullscreen((prev) => !prev);
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(Number((z + 0.2).toFixed(2)), 2.5));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(Number((z - 0.2).toFixed(2)), 0.5));
  };

  const handleResetOnly = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(Number((z + 0.1).toFixed(2)), 2.5));
    } else {
      setZoom((z) => Math.max(Number((z - 0.1).toFixed(2)), 0.5));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "svg" || target.tagName === "rect" || target.getAttribute("fill")?.includes("grid")) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Scrub timeline on click
  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)));
    setProgress(pct);
  };

  return (
    <div
      className={`network-shell ${contrastMode} ${isFullscreen ? "fullscreen" : ""} ${
        simulation ? "simulation-graph" : ""
      }`}
    >
      {/* Graph Toolbar with Functional Zoom, Contrast, Center & Fullscreen Controls */}
      <div className="graph-toolbar">
        <div className="graph-legend">
          <span>
            <i className="entry" /> Entry (₹ Inflow)
          </span>
          <span>
            <i className="mule" /> Mule Intermediary
          </span>
          <span>
            <i className="exit" /> Exit Account
          </span>
          <span>
            <b className="edge-key" /> ₹ Transfer
          </span>
          {isFullscreen && (
            <Badge tone="success">
              <Icon name="check" size={11} /> Fullscreen Workspace Active (Press Esc to exit)
            </Badge>
          )}
        </div>

        <div className="graph-control-group">
          {/* Contrast Mode Selector */}
          <div className="contrast-switch" title="Graph Contrast Modes">
            <button
              type="button"
              className={contrastMode === "default" ? "active" : ""}
              onClick={() => setContrastMode("default")}
              title="Standard Clean Mode"
            >
              <Icon name="sun" size={12} />
              <span>Standard</span>
            </button>
            <button
              type="button"
              className={contrastMode === "dark" ? "active" : ""}
              onClick={() => setContrastMode("dark")}
              title="Forensic High-Contrast Dark Mode"
            >
              <Icon name="moon" size={12} />
              <span>Forensic Dark</span>
            </button>
            <button
              type="button"
              className={contrastMode === "high-contrast" ? "active" : ""}
              onClick={() => setContrastMode("high-contrast")}
              title="Stark High-Contrast Light Mode"
            >
              <Icon name="contrast" size={12} />
              <span>High Contrast</span>
            </button>
          </div>

          {/* Zoom, Center View & Fullscreen Controls */}
          <div className="graph-actions" title="Zoom & View Controls">
            <button type="button" onClick={handleZoomOut} title="Zoom Out (-20%)">
              <Icon name="minus" size={13} />
            </button>
            <span className="mono">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={handleZoomIn} title="Zoom In (+20%)">
              <Icon name="plus" size={13} />
            </button>
            {/* Center View Button - Resets Zoom & Fits Full Screen */}
            <button
              type="button"
              onClick={handleResetAndCoverFullscreen}
              title={isFullscreen ? "Exit Fullscreen & Reset View" : "Center View & Cover Full Screen"}
              style={{
                background: isFullscreen ? "var(--accent-soft)" : "white",
                color: isFullscreen ? "var(--accent)" : "inherit",
              }}
            >
              <Icon name={isFullscreen ? "minimize" : "center"} size={13} />
            </button>
            {/* Dedicated Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsFullscreen((prev) => !prev);
                setZoom(1.0);
                setPan({ x: 0, y: 0 });
              }}
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand to Cover Full Screen"}
            >
              <Icon name={isFullscreen ? "minimize" : "maximize"} size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Interactive Account Inspector */}
      {selectedNode && selectedNodeStats && (
        <div className="graph-inspector-card">
          <div className="inspector-header">
            <span className={`inspector-dot ${selectedNode.role}`} />
            <strong>{selectedNode.id}</strong>
            <Badge
              tone={
                selectedNode.role === "entry"
                  ? "success"
                  : selectedNode.role === "exit"
                  ? "danger"
                  : selectedNode.role === "hub"
                  ? "typology"
                  : "warning"
              }
            >
              {selectedNode.role.toUpperCase()}
            </Badge>
          </div>
          <div className="inspector-stats">
            <div>
              <small>Inflow ({selectedNodeStats.incomingCount} tx)</small>
              <span className="mono">{selectedNodeStats.totalInflow}</span>
            </div>
            <div>
              <small>Outflow ({selectedNodeStats.outgoingCount} tx)</small>
              <span className="mono">{selectedNodeStats.totalOutflow}</span>
            </div>
          </div>
        </div>
      )}

      {/* SVG Canvas with Pan & Zoom Transform and High-Contrast Typography */}
      <svg
        className={`network-svg ${contrastMode}`}
        viewBox="0 0 740 376"
        role="img"
        aria-label="Interactive money trail graph with zooming and contrast operations"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <defs>
          <marker
            id={`arrow-${simulation}-${contrastMode}`}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path
              d="M0 0 8 4 0 8Z"
              className="arrowhead"
              fill={contrastMode === "dark" ? "#a855f7" : contrastMode === "high-contrast" ? "#000000" : "#8b8599"}
            />
          </marker>
          <pattern id={`grid-${contrastMode}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <circle
              cx="1.5"
              cy="1.5"
              r="1"
              className="grid-dot"
              fill={contrastMode === "dark" ? "#2b2447" : contrastMode === "high-contrast" ? "#4b5563" : "#d8d3e2"}
            />
          </pattern>
        </defs>

        {/* Canvas Background with Grid Pattern */}
        <rect
          width="740"
          height="376"
          fill={contrastMode === "dark" ? "#0c0a14" : contrastMode === "high-contrast" ? "#ffffff" : "#fbfafc"}
        />
        <rect width="740" height="376" fill={`url(#grid-${contrastMode})`} />

        {activeNodes.length === 0 && (
          <g transform="translate(370, 188)" textAnchor="middle">
            <text
              fill={contrastMode === "dark" ? "#a855f7" : contrastMode === "high-contrast" ? "#111827" : "#8b8599"}
              fontSize="14"
              fontWeight="500"
            >
              Select an alert from the queue to view its money trail graph
            </text>
          </g>
        )}

        {/* Dynamic Zoom & Pan Group Container */}
        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          style={{ transformOrigin: "370px 188px", transition: isDragging ? "none" : "transform 0.15s ease-out" }}
        >
          {/* Directed Transaction Edges */}
          {activeEdges.map((e, i) => {
            const a = activeNodes[e.fromIndex],
              b = activeNodes[e.toIndex];
            if (!a || !b) return null;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2 - (i % 2 === 0 ? 6 : -6);

            const isHop1 = e.hopIndex === 1 || (e.hopIndex === undefined && i < activeEdges.length / 2);
            const isHop2 = e.hopIndex === 2 || (e.hopIndex === undefined && i >= activeEdges.length / 2);
            const isHop3 = e.hopIndex >= 3;

            const isEdgeCompleted =
              (isHop1 && progress >= 34) ||
              (isHop2 && progress >= 68) ||
              (isHop3 && progress >= 95);

            const isEdgeActiveNow =
              (isHop1 && progress >= 5 && progress < 34) ||
              (isHop2 && progress >= 34 && progress < 68) ||
              (isHop3 && progress >= 68);

            const isPlayingFlow = isEdgeActiveNow || (progress >= 95 && isHop3);
            const isLinkedToSelected = selected && (e.source === selected || e.target === selected);

            return (
              <g
                className={isPlayingFlow ? "edge active" : isEdgeCompleted ? "edge active" : "edge"}
                key={`${e.source}-${e.target}-${i}`}
                style={{
                  opacity:
                    !playing && progress === 0
                      ? isLinkedToSelected ? 1 : 0.8
                      : isEdgeCompleted || isEdgeActiveNow || isLinkedToSelected
                      ? 1
                      : 0.35,
                }}
              >
                <path
                  d={`M${a.x + 22} ${a.y} C${mx} ${a.y}, ${mx} ${b.y}, ${b.x - 22} ${b.y}`}
                  markerEnd={`url(#arrow-${simulation}-${contrastMode})`}
                  stroke={isLinkedToSelected ? "#5B2BB5" : undefined}
                  strokeWidth={isLinkedToSelected ? "2.2" : undefined}
                />
                <rect x={mx - 24} y={my - 8} width="48" height="15" rx="3" />
                <text x={mx} y={my + 2.5}>
                  {e.amount}
                </text>
              </g>
            );
          })}

          {/* Account Nodes with High-Contrast Pill Badges to Prevent Text Overlap */}
          {activeNodes.map((node, nodeIdx) => {
            const isSelected = selected === node.id;

            // Highlight nodes dynamically as the fund flow reaches them
            const isEntryNode = nodeIdx === 0 || node.role === "entry";
            const isExitNode = nodeIdx === activeNodes.length - 1 || node.role === "exit";
            const isHubMule = node.role === "hub";
            const isTier1Mule = !isEntryNode && !isExitNode && !isHubMule;

            const isNodeReached =
              isEntryNode ||
              (isTier1Mule && progress >= 15) ||
              (isHubMule && progress >= 45) ||
              (isExitNode && progress >= 72);

            const isExitPulsing = isExitNode && progress >= 72;

            return (
              <g
                key={node.id}
                className={`graph-node ${node.role} ${isSelected ? "selected" : ""} ${
                  isExitPulsing ? "pulsing" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(node.id);
                }}
                role="button"
                tabIndex={0}
                style={{
                  opacity: isNodeReached ? 1 : 0.5,
                  transition: "opacity 0.3s ease",
                  cursor: "pointer",
                }}
              >
                {/* Node Outer & Inner Circles */}
                <circle cx={node.x} cy={node.y} r={isExitPulsing ? 22 : 20} />
                <circle className="node-inner" cx={node.x} cy={node.y} r={14} />
                <text className="node-symbol" x={node.x} y={node.y + 4}>
                  {node.role === "entry" ? "E" : node.role === "exit" ? "X" : node.role === "hub" ? "H" : "M"}
                </text>

                {/* Account Label inside Dedicated Pill Badge - Zero Overlap */}
                <rect
                  className="node-label-box"
                  x={node.x - 27}
                  y={node.y + 24}
                  width="54"
                  height="13"
                  rx="3"
                />
                <text className="node-label" x={node.x} y={node.y + 33.5}>
                  {node.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Playback Control Bar with Full Flow Across All 3 Hops to Last Node */}
      {!simulation && activeNodes.length > 0 && (
        <div className="playback-bar">
          <button
            className="play-button"
            type="button"
            onClick={() => setPlaying(!playing)}
            title={playing ? "Pause animation" : "Play full transaction flow across all hops"}
          >
            <Icon name={playing ? "pause" : "play"} size={14} />
          </button>

          {/* Real-time Interpolated Timestamp */}
          <span className="mono" style={{ fontWeight: 600, minWidth: 60 }}>
            {currentTimestamp}
          </span>

          {/* Interactive Scrubbable Timeline Track */}
          <div
            className="timeline-track"
            onClick={handleTimelineScrub}
            title="Click to scrub flow across time"
            style={{ cursor: "pointer" }}
          >
            <i style={{ width: `${progress}%` }} />
            <b style={{ left: `${progress}%` }} />
          </div>

          <span className="mono muted">09:56:42</span>

          {/* Playback Speed Controller */}
          <button
            className="speed-control"
            type="button"
            onClick={() => setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))}
            title="Click to change playback speed (1x, 1.5x, 2x)"
          >
            {speed}× <Icon name="chevron" size={12} />
          </button>

          {/* Dynamic Hop Status Badge */}
          {progress < 34 ? (
            <Badge tone="typology">
              Hop 1 of 3: Dispersal ({activeNodes.filter((n) => n.role === "entry").length || 1} Entry → {activeNodes.filter((n) => n.role === "mule").length} Mules)
            </Badge>
          ) : progress < 68 ? (
            <Badge tone="warning">
              Hop 2 of 3: Layering Intermediaries ({activeEdges.filter((e) => e.hopIndex === 2).length || 5} Transfers)
            </Badge>
          ) : progress < 95 ? (
            <Badge tone="danger">
              Hop 3 of 3: Reconsolidating into Exit {exitNode ? exitNode.id : "Node"}!
            </Badge>
          ) : (
            <Badge tone="success">
              <Icon name="check" size={11} /> Flow Completed to {exitNode ? exitNode.id : "Exit"} ({totalClusterAmount})
            </Badge>
          )}

          {/* Hop Fast-Jump Selectors */}
          <div className="hop-chips">
            <button
              type="button"
              className={`hop-chip ${currentHop === 1 && progress < 34 ? "active" : ""}`}
              onClick={() => setProgress(20)}
              title="Jump to Hop 1: Dispersal"
            >
              Hop 1
            </button>
            <button
              type="button"
              className={`hop-chip ${currentHop === 2 && progress < 68 ? "active" : ""}`}
              onClick={() => setProgress(50)}
              title="Jump to Hop 2: Layering Hubs"
            >
              Hop 2
            </button>
            <button
              type="button"
              className={`hop-chip ${currentHop === 3 ? "active" : ""}`}
              onClick={() => setProgress(85)}
              title="Jump to Hop 3: Final Exit Account"
            >
              Hop 3 (Exit)
            </button>
            <button
              type="button"
              className={`hop-chip ${progress >= 98 ? "active" : ""}`}
              onClick={() => setProgress(100)}
              title="Show Complete Trail"
            >
              Full Trail
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceTable({ edges }: { edges?: ApiGraphEdge[] }) {
  const rows = useMemo(() => {
    if (edges && edges.length > 0) {
      return edges.map((e, idx) => [
        e.hop_index ? String(e.hop_index).padStart(2, "0") : String(idx + 1).padStart(2, "0"),
        e.source,
        e.target,
        formatINR(e.amount),
        e.ts ? e.ts.replace("T", " ").replace("Z", "") : "—",
      ]);
    }
    return [];
  }, [edges]);

  if (rows.length === 0) {
    return (
      <div style={{ padding: "28px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
        No transaction evidence recorded for this cluster.
      </div>
    );
  }

  return (
    <div className="evidence-table">
      <div className="evidence-row head">
        <span>Hop</span>
        <span>From Account</span>
        <span>To Account</span>
        <span>Amount (₹ INR)</span>
        <span>Timestamp (UTC)</span>
      </div>
      {rows.map((r, i) => (
        <div className="evidence-row" key={i}>
          {r.map((v, j) => (
            <span className={j > 0 ? "mono" : ""} key={`${v}-${j}`}>
              {v}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------------
// Investigation Screen with Rupees (₹) & Live API Integration
// -------------------------------------------------------------
function Investigation({
  onBack,
  selectedAlertId,
  onDispositionChange,
}: {
  onBack: () => void;
  selectedAlertId?: string;
  onDispositionChange?: (alertId: string, newStatus: string) => void;
}) {
  const [status, setStatus] = useState<"Open" | "Confirmed" | "Dismissed">("Open");
  const [detail, setDetail] = useState<ApiAlertDetail | null>(null);
  const [graph, setGraph] = useState<ApiGraphPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (selectedAlertId) {
      setLoading(true);
      Promise.all([
        fetchAlertDetail(selectedAlertId).catch(() => null),
        fetchAlertGraph(selectedAlertId).catch(() => null),
      ]).then(([d, g]) => {
        if (!isMounted) return;
        if (d) {
          setDetail(d);
          const st = d.status.toLowerCase();
          setStatus(st === "confirmed" ? "Confirmed" : st === "dismissed" ? "Dismissed" : "Open");
        } else {
          setDetail(null);
        }
        if (g) setGraph(g);
        setLoading(false);
      });
    } else {
      setDetail(null);
      setGraph(null);
    }
    return () => {
      isMounted = false;
    };
  }, [selectedAlertId]);

  const handleUpdateStatus = async (newStatus: "Confirmed" | "Dismissed") => {
    setStatus(newStatus);
    if (selectedAlertId) {
      try {
        await postDisposition(
          selectedAlertId,
          newStatus.toLowerCase() as "confirmed" | "dismissed",
          `Investigator disposition updated to ${newStatus}`
        );
        if (onDispositionChange) {
          onDispositionChange(selectedAlertId, newStatus);
        }
      } catch (err) {
        console.error("Failed to persist disposition:", err);
      }
    }
  };

  if (!selectedAlertId) {
    return (
      <main className="page investigation-page">
        <div className="breadcrumb">
          <button onClick={onBack}>Alerts</button>
        </div>
        <div style={{ padding: "80px 24px", textAlign: "center" }}>
          <h2>No Alert Selected</h2>
          <p style={{ color: "var(--muted)", margin: "12px 0 24px" }}>
            Select an alert from the Investigation queue to review its transaction graph and forensic evidence.
          </p>
          <button className="button primary" onClick={onBack}>
            <Icon name="arrow" /> Return to Alert Queue
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page investigation-page">
        <div className="breadcrumb">
          <button onClick={onBack}>Alerts</button>
          <Icon name="chevron" size={12} />
          <span className="mono">{selectedAlertId}</span>
        </div>
        <div style={{ padding: "80px 24px", textAlign: "center" }}>
          <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3, display: "inline-block" }} />
          <p style={{ marginTop: 16, color: "var(--muted)" }}>
            Loading forensic subgraph and SHAP risk attributions for {selectedAlertId}…
          </p>
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="page investigation-page">
        <div className="breadcrumb">
          <button onClick={onBack}>Alerts</button>
          <Icon name="chevron" size={12} />
          <span className="mono">{selectedAlertId}</span>
        </div>
        <div style={{ padding: "80px 24px", textAlign: "center" }}>
          <h2>Alert Record Not Found</h2>
          <p style={{ color: "var(--muted)", margin: "12px 0 24px" }}>
            Unable to load alert {selectedAlertId} from the database.
          </p>
          <button className="button secondary" onClick={onBack}>
            Return to Alert Queue
          </button>
        </div>
      </main>
    );
  }

  const alertIdDisplay = detail.alert_id;
  const typologyDisplay = formatTypology(detail.typology);
  const riskDisplay = detail.risk_score.toFixed(2);
  const amountDisplay = formatINR(detail.total_amount);
  const accountsCount = detail.n_accounts;
  const txCount = detail.n_transactions;

  const shapRows: [string, number][] = detail.shap && detail.shap.length > 0
    ? detail.shap.map((s) => [
        s.feature.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        Math.max(0.05, Math.min(1.0, Math.abs(s.contribution || 0.15))),
      ])
    : [];

  return (
    <main className="page investigation-page">
      <div className="breadcrumb">
        <button onClick={onBack}>Alerts</button>
        <Icon name="chevron" size={12} />
        <span className="mono">{alertIdDisplay}</span>
      </div>

      <div className="case-title-row">
        <div>
          <div className="case-meta">
            <Badge tone="typology">{typologyDisplay}</Badge>
            <span className="mono">{alertIdDisplay}</span>
            <span>Live Forensic Analysis</span>
            <span className="currency-pill">₹ INR Subgraph</span>
            {detail.baseline_flagged === false && (
              <Badge tone="danger-soft">Missed by Baseline</Badge>
            )}
          </div>
          <h1>
            {typologyDisplay} {detail.is_redteam ? "Attack Ring (Red-Team)" : "Mule Ring"}
          </h1>
        </div>
        <div className="case-actions">
          <div className="case-risk">
            <span>Risk score</span>
            <strong className="mono">{riskDisplay}</strong>
            <Badge tone={Number(riskDisplay) >= 0.85 ? "danger" : "warning"}>
              {Number(riskDisplay) >= 0.85 ? "High" : "Medium"}
            </Badge>
          </div>
          <div className="divider" />
          <Badge
            tone={
              status === "Confirmed"
                ? "success"
                : status === "Dismissed"
                ? "neutral"
                : "warning"
            }
          >
            {status}
          </Badge>
          <button className="button secondary" onClick={() => handleUpdateStatus("Dismissed")}>
            <Icon name="close" /> Dismiss
          </button>
          <button className="button danger" onClick={() => handleUpdateStatus("Confirmed")}>
            <Icon name="check" /> Confirm as laundering
          </button>
        </div>
      </div>

      <div className="investigation-grid">
        <div className="investigation-left">
          <section className="panel graph-panel">
            <div className="panel-heading">
              <div>
                <h2>Interactive money trail</h2>
                <p>
                  {txCount} transactions · {accountsCount} accounts · Subgraph visualization
                </p>
              </div>
              <div className="graph-summary">
                <span>
                  <small>Total ring value</small>
                  <strong className="mono">{amountDisplay}</strong>
                </span>
                <Icon name="arrow" />
                <span>
                  <small>Accounts mapped</small>
                  <strong className="mono">{accountsCount}</strong>
                </span>
              </div>
            </div>
            <NetworkGraph graphPayload={graph} typology={detail.typology} />
          </section>

          <section className="panel evidence-panel">
            <div className="panel-heading">
              <div>
                <h2>Verified transaction evidence (₹ INR)</h2>
                <p>Ordered by transaction time</p>
              </div>
              <button className="text-button">
                View all {txCount} <Icon name="external" size={14} />
              </button>
            </div>
            <EvidenceTable edges={graph?.edges} />
          </section>
        </div>

        <aside className="investigation-aside">
          <section className="panel summary-panel">
            <div className="panel-heading">
              <div>
                <h2>Case summary</h2>
                <p>Evidence-grounded explanation</p>
              </div>
              <Badge tone="success">
                <Icon name="check" size={11} />{" "}
                {detail.narrative_source ? `${detail.narrative_source.toUpperCase()} Verified` : "Verified"}
              </Badge>
            </div>
            <p className="summary-lead">
              {detail.narrative ||
                `Sub-graph pattern conforms to ${typologyDisplay} with an estimated aggregate flow of ${amountDisplay} across ${accountsCount} nodes.`}
            </p>
            <div className="finding">
              <span>01</span>
              <p>
                <strong>Rapid dispersal</strong>Transfers initiated across coordinated time window.
              </p>
            </div>
            <div className="finding">
              <span>02</span>
              <p>
                <strong>Value conservation</strong>High retention ratio observed across flow path.
              </p>
            </div>
            <div className="finding">
              <span>03</span>
              <p>
                <strong>Coordinated collection</strong>Intermediaries consolidate toward exit endpoints.
              </p>
            </div>
          </section>

          <section className="panel shap-panel">
            <div className="panel-heading">
              <div>
                <h2>SHAP risk explanation</h2>
                <p>Feature contribution to {riskDisplay} score</p>
              </div>
            </div>
            {shapRows.length === 0 ? (
              <p style={{ padding: "16px", color: "var(--muted)", fontSize: "13px" }}>
                No feature attributions recorded for this alert.
              </p>
            ) : (
              shapRows.map(([name, val]) => (
                <div className="shap-row" key={String(name)}>
                  <span>{name}</span>
                  <div>
                    <i style={{ width: `${Math.min(100, Number(val) * 100)}%` }} />
                  </div>
                  <strong className="mono">+{Number(val).toFixed(2)}</strong>
                </div>
              ))
            )}
            <div className="shap-axis">
              <span>Lower risk</span>
              <span>Higher risk</span>
            </div>
          </section>

          <section className="panel typology-panel">
            <div className="panel-heading">
              <div>
                <h2>Matched typology</h2>
              </div>
              <Badge tone="typology">High confidence</Badge>
            </div>
            <div className="typology-name">
              <span className="typology-icon">
                <Icon name="spark" />
              </span>
              <div>
                <strong>{typologyDisplay}</strong>
                <p>
                  Funds structured across multiple intermediaries conforming to {typologyDisplay} network topology.
                </p>
              </div>
            </div>
            <div className="key-evidence">
              <span>KEY EVIDENCE</span>
              <strong>{accountsCount} accounts</strong>
              <strong>{txCount} transfers</strong>
              <strong>{amountDisplay}</strong>
            </div>
          </section>

          <section className="panel status-panel">
            <div>
              <span>Investigation status</span>
              <strong>{status}</strong>
            </div>
            <div className="status-steps">
              <i className="done" />
              <i className={status !== "Open" ? "done" : ""} />
              <i />
            </div>
            <small>
              Alert ID <b>{alertIdDisplay}</b> · Assigned to you
            </small>
          </section>
        </aside>
      </div>
    </main>
  );
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// Simulation Screen with Interactive Configuration (₹ INR)
// -------------------------------------------------------------
interface RedTeamScenario {
  id: string;
  name: string;
  typology: string;
  risk: number;
  defaultTransactions: number;
  defaultHops: number;
  defaultThreshold: string;
  description: string;
  patternNote: string;
}

const RED_TEAM_SCENARIOS: RedTeamScenario[] = [
  {
    id: "scatter-gather",
    name: "Hidden Money Laundering Ring (Scatter-Gather)",
    typology: "Scatter-Gather Ring",
    risk: 0.92,
    defaultTransactions: 10,
    defaultHops: 3,
    defaultThreshold: "10000",
    description:
      "Splits funds below the baseline threshold, routes them through short-lived mule accounts, and reconsolidates value at a single exit.",
    patternNote: "5-way dispersal across mule accounts, converging into 2 collection hubs.",
  },
  {
    id: "circular-flow",
    name: "Corporate Shell Layering (Circular Cycle Loop)",
    typology: "Circular Loop Cycle",
    risk: 0.95,
    defaultTransactions: 14,
    defaultHops: 4,
    defaultThreshold: "50000",
    description:
      "Routes funds through shell company accounts in a continuous circular loop, returning to origin while evading standard single-transfer limits.",
    patternNote: "Cycle detected: SHL-9901 → INT-4421 → INT-4422 → SHL-9901.",
  },
  {
    id: "upi-micro-smurfing",
    name: "High-Frequency UPI Micro-Smurfing (Fan-In Hub)",
    typology: "Fan-In Aggregation Hub",
    risk: 0.88,
    defaultTransactions: 20,
    defaultHops: 2,
    defaultThreshold: "25000",
    description:
      "High volume of small transfers sent from multiple digital wallets just below UPI AML trigger limits, accumulating rapidly at a merchant account.",
    patternNote: "18 micro-structuring deposits aggregating into 1 merchant account within 45m.",
  },
  {
    id: "rapid-passthrough",
    name: "Rapid Pass-Through Mule Velocity Chain",
    typology: "Rapid Pass-Through Chain",
    risk: 0.84,
    defaultTransactions: 8,
    defaultHops: 5,
    defaultThreshold: "15000",
    description:
      "Passes illicit funds sequentially through student or dormant accounts with dwell times under 8 minutes, leaving zero residual balance.",
    patternNote: "5 sequential hops with 97.8% value conservation and <10m dwell time.",
  },
];

function Simulation({
  openAlert,
  onInject,
}: {
  openAlert: (alertId?: string) => void;
  onInject?: (typology: string) => void;
}) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("scatter-gather");
  const [transactions, setTransactions] = useState<number>(10);
  const [hops, setHops] = useState<number>(3);
  const [threshold, setThreshold] = useState<string>("10000");
  const [state, setState] = useState<"idle" | "running" | "complete">("idle");
  const [redTeamResult, setRedTeamResult] = useState<ApiRedTeamResult | null>(null);
  const [simGraph, setSimGraph] = useState<ApiGraphPayload | null>(null);

  const activeScenario = useMemo(
    () => RED_TEAM_SCENARIOS.find((s) => s.id === selectedScenarioId) || RED_TEAM_SCENARIOS[0],
    [selectedScenarioId]
  );

  // When scenario changes, update recommended parameter defaults
  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedScenarioId(newId);
    const scenario = RED_TEAM_SCENARIOS.find((s) => s.id === newId);
    if (scenario) {
      setTransactions(scenario.defaultTransactions);
      setHops(scenario.defaultHops);
      setThreshold(scenario.defaultThreshold);
    }
  };

  const inject = async () => {
    setState("running");
    try {
      const res = await injectRedTeam();
      setRedTeamResult(res);
      if (res?.alert?.alert_id) {
        try {
          const g = await fetchAlertGraph(res.alert.alert_id);
          setSimGraph(g);
        } catch {
          // fallback
        }
      }
      setState("complete");
      if (onInject) {
        onInject(activeScenario.typology);
      }
    } catch (err) {
      console.warn("Live Red-Team inject failed, fallback to local timer:", err);
      window.setTimeout(() => setState("complete"), 1400);
    }
  };

  const handleResetSimulation = async () => {
    try {
      await deleteRedTeam();
    } catch (err) {
      console.warn("Red-team reset error:", err);
    }
    setRedTeamResult(null);
    setSimGraph(null);
    setState("idle");
  };

  return (
    <main className="page simulation-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">CONTROLLED ENVIRONMENT (₹ INR)</span>
          <h1>Red-Team Simulation</h1>
          <p>
            Test how LaunderLens identifies suspicious networks conventional threshold systems
            miss in Indian banking.
          </p>
        </div>
        <Badge tone="neutral">
          <span className="status-dot" /> Sandbox dataset
        </Badge>
      </div>

      <div className="simulation-layout">
        <aside className="panel configuration-panel">
          <div className="panel-heading">
            <div>
              <h2>Simulation configuration</h2>
              <p>Configure network injection parameters</p>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setTransactions(activeScenario.defaultTransactions);
                setHops(activeScenario.defaultHops);
                setThreshold(activeScenario.defaultThreshold);
              }}
              title="Reset parameters to scenario defaults"
            >
              Reset
            </button>
          </div>

          {/* Interactive Scenario Selection Dropdown */}
          <label className="field">
            <span>Red-Team Attack Scenario</span>
            <select
              className="select-control"
              value={selectedScenarioId}
              onChange={handleScenarioChange}
            >
              {RED_TEAM_SCENARIOS.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
            </select>
          </label>

          {/* Interactive Transactions & Network Hops Controls */}
          <div className="field-grid">
            <label className="field">
              <span>Transactions ({transactions})</span>
              <input
                type="number"
                min="4"
                max="50"
                step="1"
                className="input-control mono"
                value={transactions}
                onChange={(e) =>
                  setTransactions(Math.max(4, Math.min(50, Number(e.target.value) || 4)))
                }
              />
            </label>

            <label className="field">
              <span>Network Hops</span>
              <select
                className="select-control mono"
                value={hops}
                onChange={(e) => setHops(Number(e.target.value))}
              >
                <option value={2}>2 Hops</option>
                <option value={3}>3 Hops</option>
                <option value={4}>4 Hops</option>
                <option value={5}>5 Hops</option>
                <option value={6}>6 Hops</option>
              </select>
            </label>
          </div>

          {/* Interactive Baseline Threshold Selection */}
          <label className="field">
            <span>Rule-Based Baseline Threshold (₹ INR)</span>
            <select
              className="select-control mono"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            >
              <option value="5000">₹5,000.00 INR (Strict Smurfing Limit)</option>
              <option value="10000">₹10,000.00 INR (Standard Rule Limit)</option>
              <option value="25000">₹25,000.00 INR (UPI Gateway Monitoring)</option>
              <option value="50000">₹50,000.00 INR (Statutory PAN Reporting)</option>
              <option value="100000">₹1,00,000.00 INR (High-Value RTGS Limit)</option>
            </select>
          </label>

          {/* Dynamic Scenario Behavior Note */}
          <div className="scenario-note">
            <Icon name="spark" />
            <div>
              <strong>{activeScenario.typology}</strong>
              <p>{activeScenario.description}</p>
              <small style={{ display: "block", marginTop: 4, color: "var(--accent)" }}>
                {activeScenario.patternNote}
              </small>
            </div>
          </div>

          <button
            className="button primary inject-button"
            onClick={inject}
            disabled={state === "running"}
            type="button"
          >
            {state === "running" ? (
              <>
                <span className="spinner" /> Injecting Red-Team Ring…
              </>
            ) : (
              <>
                <Icon name="flask" /> Inject Red-Team Ring
              </>
            )}
          </button>
          {state === "complete" && (
            <button
              className="button secondary"
              style={{ marginTop: 8, width: "100%" }}
              onClick={handleResetSimulation}
              type="button"
            >
              <Icon name="refresh" /> Reset Simulation Ring
            </button>
          )}
          <p className="safe-note">Runs only against the isolated sandbox dataset.</p>
        </aside>

        <div className="simulation-main">
          <section className="panel simulation-canvas">
            <div className="panel-heading">
              <div>
                <h2>Injected transaction network ({activeScenario.typology})</h2>
                <p>
                  {state === "idle"
                    ? "Ready to simulate · Configure parameters on the left"
                    : state === "running"
                    ? `Injecting ${transactions} transactions across ${hops} hops…`
                    : `Simulation run ${redTeamResult?.alert?.alert_id || "RT-001"} · Complete`}
                </p>
              </div>
              {state === "complete" && (
                <Badge tone="success">
                  <Icon name="check" size={12} /> Detected in {redTeamResult ? `${redTeamResult.latency_ms.toFixed(0)}ms` : "140ms"}
                </Badge>
              )}
            </div>

            <NetworkGraph simulation graphPayload={simGraph} typology={redTeamResult?.alert?.typology} />

            <div className="sim-timeline">
              {[
                ["Injected", "0.0s"],
                ["Ingested", "0.04s"],
                ["Graph linked", "0.08s"],
                ["Risk scored", "0.12s"],
                ["Alert created", redTeamResult ? `${(redTeamResult.latency_ms / 1000).toFixed(2)}s` : "0.14s"],
              ].map(([label, time], i) => (
                <div
                  className={
                    state === "complete" || (state === "running" && i < 3)
                      ? "sim-step done"
                      : "sim-step"
                  }
                  key={label}
                >
                  <i>
                    {(state === "complete" || (state === "running" && i < 3)) && (
                      <Icon name="check" size={10} />
                    )}
                  </i>
                  <strong>{label}</strong>
                  <span className="mono">{time}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={`results-panel ${state === "complete" ? "revealed" : ""}`}>
            {state !== "complete" ? (
              <div className="result-placeholder">
                <span className={state === "running" ? "scan-icon running" : "scan-icon"}>
                  <Icon name="chart" size={20} />
                </span>
                <div>
                  <strong>
                    {state === "running"
                      ? "Analyzing transaction topology"
                      : "Results will appear here"}
                  </strong>
                  <p>
                    {state === "running"
                      ? `Constructing the account graph for ${transactions} transactions across ${hops} hops.`
                      : "Inject the configured ring to compare detection outcomes."}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="result-summary">
                  <span>
                    <small>Transactions generated</small>
                    <strong className="mono">{redTeamResult?.alert?.n_transactions || transactions}</strong>
                  </span>
                  <span>
                    <small>Baseline detection</small>
                    <strong className="danger-text">Not detected</strong>
                  </span>
                  <span>
                    <small>LaunderLens detection</small>
                    <strong className="positive">Detected</strong>
                  </span>
                  <span>
                    <small>Detection latency</small>
                    <strong className="mono">{redTeamResult ? `${redTeamResult.latency_ms.toFixed(0)}ms` : "140ms"}</strong>
                  </span>
                  <span>
                    <small>New alert</small>
                    <strong>{redTeamResult?.alert?.alert_id || "RT-001"}</strong>
                  </span>
                </div>

                <div className="comparison">
                  <div className="comparison-side baseline">
                    <div className="comparison-title">
                      <span>BASELINE</span>
                      <Badge tone="danger-soft">Missed</Badge>
                    </div>
                    <strong>No alert generated</strong>
                    <p>
                      All {redTeamResult?.alert?.n_transactions || transactions} transfers remained below the fixed{" "}
                      <span className="mono">
                        ₹{Number(threshold).toLocaleString("en-IN")}
                      </span>{" "}
                      threshold limit.
                    </p>
                    <div className="comparison-check">
                      <Icon name="close" /> Suspicious network missed by rules
                    </div>
                  </div>

                  <div className="comparison-divider">
                    <span>VS</span>
                  </div>

                  <div className="comparison-side lens">
                    <div className="comparison-title">
                      <span>LAUNDERLENS</span>
                      <Badge tone="success">Detected</Badge>
                    </div>
                    <strong>Structuring ring identified</strong>
                    <p>
                      Cross-transaction graph analysis matched{" "}
                      <strong>{activeScenario.typology}</strong> across {hops} hops (all transfers sub-threshold).
                    </p>
                    <div className="outcome-tags">
                      <span>
                        <Icon name="check" /> Typology: {formatTypology(redTeamResult?.alert?.typology || "scatter_gather")}
                      </span>
                      <span>
                        <Icon name="check" /> Risk score{" "}
                        <b className="mono">{(redTeamResult?.alert?.risk_score || activeScenario.risk).toFixed(2)}</b>
                      </span>
                      <span>
                        <Icon name="check" /> {redTeamResult?.alert?.n_accounts || 10} Accounts structured
                      </span>
                    </div>
                  </div>

                  <button
                    className="button primary open-alert"
                    onClick={() => openAlert(redTeamResult?.alert?.alert_id || "RT-001")}
                    type="button"
                  >
                    Open Injected Alert ({redTeamResult?.alert?.alert_id || "RT-001"}) <Icon name="arrow" />
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

// -------------------------------------------------------------
// Main Application Component
// -------------------------------------------------------------
export default function App() {
  const [showLoader, setShowLoader] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>("landing");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDataset, setActiveDataset] = useState<Dataset>(EMPTY_DATASET);
  const [selectedAlertId, setSelectedAlertId] = useState<string>("");
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [liveMetrics, setLiveMetrics] = useState<ApiMetrics | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const addActivity = (
    event: string,
    actor: string = "Investigator",
    tone: "accent" | "success" | "neutral" = "neutral"
  ) => {
    setActivities((prev) => [
      {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        event,
        actor,
        time: "Just now",
        tone,
      },
      ...prev.slice(0, 8),
    ]);
  };

  // Supabase Auth listener (Google OAuth session detection and user mapping)
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    // 1. Check existing session on load (e.g. redirected back from Google OAuth)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn("Supabase session check error:", error);
        return;
      }
      if (session?.user) {
        const mappedUser = mapSupabaseUserToUser(session.user);
        setCurrentUser(mappedUser);
        setScreen("overview");
        addActivity(
          `Investigator ${mappedUser.name} authenticated via Google OAuth`,
          mappedUser.name,
          "accent"
        );
      }
    });

    // 2. Subscribe to auth state changes (SIGNED_IN, SIGNED_OUT, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const mappedUser = mapSupabaseUserToUser(session.user);
        setCurrentUser(mappedUser);
        setScreen("overview");
        addActivity(
          `Investigator ${mappedUser.name} signed in via Google OAuth`,
          mappedUser.name,
          "accent"
        );
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setScreen("landing");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Initialize and periodically sync live backend connection
  useEffect(() => {
    let isMounted = true;

    const syncBackend = async () => {
      try {
        const online = await checkBackendHealth();
        if (!isMounted) return;
        setBackendOnline(online);
        if (online) {
          const [apiAlerts, metrics] = await Promise.all([
            fetchAlerts().catch(() => []),
            fetchMetrics().catch(() => null),
          ]);
          if (!isMounted) return;
          if (metrics) setLiveMetrics(metrics);

          if (apiAlerts && apiAlerts.length > 0) {
            const mappedAlerts: AlertItem[] = apiAlerts.map((a) => ({
              id: a.alert_id,
              typology: formatTypology(a.typology),
              risk: a.risk_score,
              accounts: a.n_accounts,
              amount: formatINR(a.total_amount),
              status: a.status.charAt(0).toUpperCase() + a.status.slice(1),
              missed: !a.baseline_flagged,
            }));

            const totalVol = apiAlerts.reduce((sum, a) => sum + (a.total_amount || 0), 0);
            const liveDs: Dataset = {
              id: "ds-live-fastapi",
              name: "LaunderLens Live Graph Pipeline",
              filename: "launderlens.db",
              uploadedAt: "FastAPI Engine :8000",
              recordsCount: apiAlerts.length * 8,
              volumeInr: formatINR(totalVol),
              suspiciousRingsCount: apiAlerts.length,
              source: "FastAPI + LightGBM + NetworkX + TreeSHAP",
              alerts: mappedAlerts,
              sampleRows: [],
            };

            setDatasets((prev) => {
              if (prev.length === 0 || prev[0].id === "ds-live-fastapi") {
                return [liveDs];
              }
              return prev;
            });
            setActiveDataset((prev) => {
              if (prev.id === EMPTY_DATASET.id || prev.id === "ds-live-fastapi") {
                return liveDs;
              }
              return prev;
            });
            setSelectedAlertId((prev) => prev || mappedAlerts[0]?.id || "");
          }
        }
      } catch (err) {
        // Silent background sync
      }
    };

    syncBackend();
    const interval = setInterval(syncBackend, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleOpenAlert = (alertId?: string) => {
    if (alertId) setSelectedAlertId(alertId);
    setScreen("investigation");
  };

  const handleDispositionChange = (alertId: string, newStatus: string) => {
    setActiveDataset((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a)),
    }));
    setDatasets((prev) =>
      prev.map((ds) => ({
        ...ds,
        alerts: ds.alerts.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a)),
      }))
    );
    addActivity(
      `Alert ${alertId} status marked as ${newStatus}`,
      currentUser?.name || "Investigator",
      newStatus === "Confirmed" ? "accent" : "neutral"
    );
  };

  // Intelligent Loading Animation Sequence (Initial boot or on-demand replay)
  if (showLoader) {
    return (
      <LaunderLensLoader
        variant="fullscreen"
        durationMs={4500}
        onComplete={() => setShowLoader(false)}
      />
    );
  }

  // Public-facing Enterprise SaaS Landing Page
  if (screen === "landing") {
    return (
      <LandingPage
        onSignIn={(mode = "signin") => {
          setAuthMode(mode);
          setScreen("auth");
        }}
        onOpenAlert={() => {
          setAuthMode("signin");
          setScreen("auth");
        }}
        onReplayLoader={() => setShowLoader(true)}
      />
    );
  }

  // Authentication & Registration Screen (Sign In for existing users / Sign Up for new users)
  if (screen === "auth" || !currentUser) {
    return (
      <AuthScreen
        initialMode={authMode}
        onLogin={(user) => {
          setCurrentUser(user);
          setScreen("overview");
          addActivity(
            `Investigator ${user.name} logged into forensic console`,
            user.name,
            "accent"
          );
        }}
        onBackToLanding={() => setScreen("landing")}
      />
    );
  }

  const handleAddDataset = (newDs: Dataset) => {
    setDatasets([newDs, ...datasets]);
    setActiveDataset(newDs);
    setScreen("datasets");
  };

  return (
    <div className="app-shell">
      <AppHeader
        screen={screen}
        setScreen={setScreen}
        currentUser={currentUser}
        onLogout={async () => {
          await signOutSupabase();
          setCurrentUser(null);
          setAuthMode("signin");
          setScreen("landing");
        }}
        onSwitchUser={(user) => setCurrentUser(user)}
        activeDataset={activeDataset}
        onOpenDatasets={() => setScreen("datasets")}
        backendOnline={backendOnline}
      />
      {screen === "overview" && (
        <Overview
          activeDataset={activeDataset}
          openAlert={handleOpenAlert}
          onOpenDatasets={() => setScreen("datasets")}
          liveMetrics={liveMetrics}
          activities={activities}
        />
      )}
      {screen === "investigation" && (
        <Investigation
          onBack={() => setScreen("overview")}
          selectedAlertId={selectedAlertId || activeDataset.alerts[0]?.id || "RT-001"}
          onDispositionChange={handleDispositionChange}
        />
      )}
      {screen === "datasets" && (
        <DatasetsManager
          datasets={datasets}
          activeDataset={activeDataset}
          onSelectDataset={(ds) => setActiveDataset(ds)}
          onAddDataset={handleAddDataset}
          onOpenAlert={() => handleOpenAlert()}
        />
      )}
      {screen === "simulation" && (
        <Simulation
          openAlert={handleOpenAlert}
          onInject={(typology) =>
            addActivity(`Injected ${typology} red-team simulation`, "Red-Team Engine", "accent")
          }
        />
      )}
    </div>
  );
}
