import React, { useState } from "react";
import "./landing.css";

interface LandingPageProps {
  onSignIn: (initialMode?: "signin" | "signup") => void;
  onOpenAlert?: (alertId?: string) => void;
  onReplayLoader?: () => void;
}

export function LandingPage({ onSignIn, onOpenAlert, onReplayLoader }: LandingPageProps) {
  const [activeTypologyTab, setActiveTypologyTab] = useState<
    "scatter-gather" | "fan-out" | "fan-in" | "cycle" | "pass-through"
  >("scatter-gather");

  return (
    <div className="landing-wrapper">
      {/* ====================================================================
          1. NAVIGATION BAR (Sticky)
          ==================================================================== */}
      <nav className="landing-nav" role="navigation" aria-label="Main Navigation">
        <div className="landing-container landing-nav-inner">
          {/* Brand Logo & Name */}
          <a
            href="#"
            className="landing-brand"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <svg
              className="brand-mark"
              viewBox="0 0 28 28"
              width="28"
              height="28"
              fill="none"
              stroke="#5B2BB5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11.5" cy="11.5" r="7.5" fill="#F0EBFA" />
              <path d="m17 17 6 6M7 12h9M11.5 8v8" />
            </svg>
            <span className="landing-brand-name">
              Launder<span>Lens</span>
            </span>
          </a>

          {/* Central Navigation Links */}
          <ul className="landing-nav-links">
            <li>
              <a href="#product">Product</a>
            </li>
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#how-it-works">How It Works</a>
            </li>
            <li>
              <a href="#technology">Technology</a>
            </li>
            <li>
              <a href="#about">About</a>
            </li>
          </ul>

          {/* Actions */}
          <div className="landing-nav-actions">
            {onReplayLoader && (
              <button
                type="button"
                className="landing-btn-ghost"
                onClick={onReplayLoader}
                title="Play the 5-Scene Intelligent Loader Animation"
                style={{
                  fontSize: "11px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 12px",
                  color: "#5B2BB5",
                  fontWeight: 650,
                  background: "#F4EFFC",
                  border: "1px solid #E5DAF7",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#5B2BB5" stroke="#5B2BB5" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Preview Loader</span>
              </button>
            )}
            <button
              type="button"
              className="landing-btn-secondary"
              onClick={() => onSignIn("signin")}
              title="Sign in with existing credentials"
            >
              Sign In
            </button>
            <button
              type="button"
              className="landing-btn-primary"
              onClick={() => onSignIn("signup")}
              title="Register a new investigator account"
            >
              Sign Up
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ====================================================================
          2. HERO SECTION
          ==================================================================== */}
      <section className="landing-hero" id="hero">
        <div className="landing-container">
          <div className="landing-hero-grid">
            {/* Left Content */}
            <div className="landing-hero-content">
              <div className="landing-hero-eyebrow">
                <span className="landing-hero-eyebrow-dot" />
                INTELLIGENT FINANCIAL CRIME DETECTION
              </div>

              <h1 className="landing-hero-title">
                See the Money Trail.
                <br />
                Expose the <span className="highlight">Hidden Network</span>.
              </h1>

              <p className="landing-hero-desc">
                LaunderLens transforms complex financial transactions into intelligent investigation
                networks. Detect suspicious patterns, uncover hidden relationships and understand
                exactly why an account is flagged.
              </p>

              <div className="landing-hero-actions">
                <button
                  type="button"
                  className="landing-btn-primary landing-btn-lg"
                  onClick={() => onSignIn("signup")}
                  title="Create an investigator account"
                >
                  Get Started / Sign Up
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="landing-btn-secondary landing-btn-lg"
                  onClick={() => onSignIn("signin")}
                >
                  Sign In
                </button>
              </div>

              {/* Compact Trust Statements */}
              <div className="landing-hero-trust">
                <div className="landing-trust-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="6" cy="6" r="3" />
                    <circle cx="18" cy="18" r="3" />
                    <path d="M8.5 8.5l7 7" />
                  </svg>
                  <span>Graph-Based Detection</span>
                </div>
                <div className="landing-trust-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <span>Explainable AI</span>
                </div>
                <div className="landing-trust-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Investigator-Ready Evidence</span>
                </div>
              </div>
            </div>

            {/* Right Side – Sophisticated Financial Transaction Network Visualization */}
            <div className="hero-viz-frame">
              <div className="hero-viz-header">
                <div className="hero-viz-dots">
                  <span className="hero-viz-dot" />
                  <span className="hero-viz-dot" />
                  <span className="hero-viz-dot" />
                </div>
                <div className="hero-viz-telemetry">
                  <span>LIVE SURVEILLANCE</span>
                  <span style={{ color: "#2E9E6B" }}>● CONNECTED</span>
                  <span>₹ INR CORRIDOR</span>
                </div>
              </div>

              {/* Directed Interactive SVG Graph */}
              <svg
                className="hero-viz-canvas"
                viewBox="0 0 540 380"
                aria-label="LaunderLens Hero Transaction Network Graph"
              >
                <defs>
                  {/* Subtle Grid Background */}
                  <pattern id="hero-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" fill="#E3E0EA" />
                  </pattern>

                  {/* Marker Arrowheads */}
                  <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0 0 L6 3 L0 6 Z" fill="#2E9E6B" />
                  </marker>
                  <marker id="arrow-orange" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0 0 L6 3 L0 6 Z" fill="#E08A2E" />
                  </marker>
                  <marker id="arrow-violet" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0 0 L6 3 L0 6 Z" fill="#6B4FC8" />
                  </marker>
                  <marker id="arrow-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0 0 L6 3 L0 6 Z" fill="#D04545" />
                  </marker>
                </defs>

                <rect width="540" height="380" fill="#FCFBFE" />
                <rect width="540" height="380" fill="url(#hero-grid)" />

                {/* Layer 1: Entry Account (Green) */}
                {/* Node: ACC-8419 (Entry) at (60, 190) */}

                {/* Directed Edges from Entry to Mules with Rupee labels */}
                <path d="M78 190 C120 190, 140 80, 182 80" stroke="#2E9E6B" strokeWidth="1.8" fill="none" markerEnd="url(#arrow-green)" />
                <path d="M78 190 C120 190, 140 150, 182 150" stroke="#2E9E6B" strokeWidth="1.8" fill="none" markerEnd="url(#arrow-green)" />
                <path d="M78 190 C120 190, 140 230, 182 230" stroke="#2E9E6B" strokeWidth="1.8" fill="none" markerEnd="url(#arrow-green)" />
                <path d="M78 190 C120 190, 140 300, 182 300" stroke="#2E9E6B" strokeWidth="1.8" fill="none" markerEnd="url(#arrow-green)" />

                {/* Amount Labels on Hop 1 */}
                <g fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" fill="#2E9E6B">
                  <rect x="110" y="112" width="46" height="14" rx="3" fill="#FFFFFF" stroke="#D9EAD9" />
                  <text x="133" y="122.5" textAnchor="middle">₹48,800</text>

                  <rect x="115" y="158" width="46" height="14" rx="3" fill="#FFFFFF" stroke="#D9EAD9" />
                  <text x="138" y="168.5" textAnchor="middle">₹49,200</text>

                  <rect x="115" y="210" width="46" height="14" rx="3" fill="#FFFFFF" stroke="#D9EAD9" />
                  <text x="138" y="220.5" textAnchor="middle">₹48,500</text>

                  <rect x="110" y="258" width="46" height="14" rx="3" fill="#FFFFFF" stroke="#D9EAD9" />
                  <text x="133" y="268.5" textAnchor="middle">₹48,900</text>
                </g>

                {/* Layer 2: Intermediate Mules to Hub Accounts */}
                <path d="M218 80 C260 80, 280 130, 322 130" stroke="#E08A2E" strokeWidth="1.8" fill="none" markerEnd="url(#arrow-orange)" />
                <path d="M218 150 C260 150, 280 130, 322 130" stroke="#E08A2E" strokeWidth="1.8" fill="none" markerEnd="url(#arrow-orange)" />
                <path d="M218 230 C260 230, 280 250, 322 250" stroke="#E08A2E" strokeWidth="1.8" fill="none" markerEnd="url(#arrow-orange)" />
                <path d="M218 300 C260 300, 280 250, 322 250" stroke="#E08A2E" strokeWidth="1.8" fill="none" markerEnd="url(#arrow-orange)" />

                {/* Amount Labels on Hop 2 */}
                <g fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" fill="#E08A2E">
                  <rect x="250" y="93" width="46" height="14" rx="3" fill="#FFFFFF" stroke="#F1DFBD" />
                  <text x="273" y="103.5" textAnchor="middle">₹97,500</text>

                  <rect x="250" y="267" width="46" height="14" rx="3" fill="#FFFFFF" stroke="#F1DFBD" />
                  <text x="273" y="277.5" textAnchor="middle">₹96,900</text>
                </g>

                {/* Layer 3: Hub Accounts to Final Exit Account */}
                <path d="M358 130 C410 130, 420 190, 462 190" stroke="#6B4FC8" strokeWidth="2.2" fill="none" markerEnd="url(#arrow-violet)" />
                <path d="M358 250 C410 250, 420 190, 462 190" stroke="#6B4FC8" strokeWidth="2.2" fill="none" markerEnd="url(#arrow-violet)" />

                {/* Final Exit Consolidation Amount */}
                <g fontFamily="JetBrains Mono" fontSize="9.5" fontWeight="700" fill="#D04545">
                  <rect x="390" y="145" width="56" height="16" rx="3" fill="#FFFFFF" stroke="#F0D3D3" />
                  <text x="418" y="156.5" textAnchor="middle">₹1,94,400</text>
                </g>

                {/* NODES WITH ROLES */}

                {/* 1. ENTRY NODE (Green) */}
                <g transform="translate(60, 190)">
                  <circle r="18" fill="#EEF6EE" stroke="#2E9E6B" strokeWidth="2" />
                  <circle r="11" fill="#2E9E6B" />
                  <text x="0" y="3.5" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">E</text>
                  <rect x="-30" y="23" width="60" height="13" rx="3" fill="#FFFFFF" stroke="#E3E0EA" />
                  <text x="0" y="32.5" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill="#1D1530" fontWeight="600">ACC-8419</text>
                </g>

                {/* 2. MULE TIER-1 NODES (Orange) */}
                {[
                  { id: "MULE-101", y: 80 },
                  { id: "MULE-102", y: 150 },
                  { id: "MULE-103", y: 230 },
                  { id: "MULE-104", y: 300 },
                ].map((m) => (
                  <g key={m.id} transform={`translate(200, ${m.y})`}>
                    <circle r="16" fill="#FFF7E9" stroke="#E08A2E" strokeWidth="1.8" />
                    <circle r="9" fill="#E08A2E" />
                    <text x="0" y="3" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700">M</text>
                    <rect x="-28" y="20" width="56" height="12" rx="3" fill="#FFFFFF" stroke="#E3E0EA" />
                    <text x="0" y="28.5" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7.5" fill="#1D1530" fontWeight="600">{m.id}</text>
                  </g>
                ))}

                {/* 3. AGGREGATION HUBS (Violet) */}
                {[
                  { id: "HUB-301", y: 130 },
                  { id: "HUB-302", y: 250 },
                ].map((h) => (
                  <g key={h.id} transform={`translate(340, ${h.y})`}>
                    <circle r="17" fill="#F0EBFA" stroke="#6B4FC8" strokeWidth="2" />
                    <circle r="10" fill="#6B4FC8" />
                    <text x="0" y="3" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700">H</text>
                    <rect x="-26" y="21" width="52" height="12" rx="3" fill="#FFFFFF" stroke="#E3E0EA" />
                    <text x="0" y="29.5" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7.5" fill="#1D1530" fontWeight="600">{h.id}</text>
                  </g>
                ))}

                {/* 4. EXIT CONSOLIDATION NODE (Red) */}
                <g transform="translate(480, 190)">
                  <circle r="20" fill="#FBEFEF" stroke="#D04545" strokeWidth="2.2" />
                  <circle r="12" fill="#D04545" />
                  <text x="0" y="4" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="700">X</text>
                  <rect x="-30" y="25" width="60" height="13" rx="3" fill="#FFFFFF" stroke="#E3E0EA" />
                  <text x="0" y="34.5" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill="#1D1530" fontWeight="600">EXIT-901</text>
                </g>
              </svg>

              {/* Live HUD Banner Overlay */}
              <div className="hero-viz-hud">
                <div className="hero-viz-hud-left">
                  <span style={{ color: "#C23B3B", fontWeight: 700 }}>● HIGH RISK 0.94</span>
                  <span style={{ color: "#6A6180" }}>·</span>
                  <span style={{ fontWeight: 600 }}>Scatter-Gather Ring</span>
                </div>
                <div style={{ fontFamily: "JetBrains Mono", color: "#5B2BB5", fontWeight: 600 }}>
                  ₹1,94,400 Consolidating in 18 min
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. TRUST / VALUE STRIP
          ==================================================================== */}
      <section className="landing-value-strip" aria-label="Core Value Propositions">
        <div className="landing-container">
          <div className="landing-value-grid">
            <div className="landing-value-card">
              <div className="landing-value-num">01</div>
              <div className="landing-value-title">Detect Hidden Networks</div>
              <p className="landing-value-desc">
                Identify suspicious multi-hop relationships between apparently disconnected banking accounts.
              </p>
            </div>
            <div className="landing-value-card">
              <div className="landing-value-num">02</div>
              <div className="landing-value-title">Understand Transaction Patterns</div>
              <p className="landing-value-desc">
                Recognize fan-out, fan-in, scatter-gather, circular loops, and rapid pass-through chains.
              </p>
            </div>
            <div className="landing-value-card">
              <div className="landing-value-num">03</div>
              <div className="landing-value-title">Explain Every Alert</div>
              <p className="landing-value-desc">
                Show transparent mathematical evidence and TreeSHAP feature contributions behind every risk score.
              </p>
            </div>
            <div className="landing-value-card">
              <div className="landing-value-num">04</div>
              <div className="landing-value-title">Reduce Investigation Complexity</div>
              <p className="landing-value-desc">
                Present complex forensic money trails and verified evidence in a unified investigator workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. PROBLEM SECTION: Criminal Networks vs Graph Intelligence
          ==================================================================== */}
      <section className="landing-section" id="product">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">The Investigation Gap</span>
            <h2 className="landing-section-title">
              Criminal Networks Are Designed to Hide in Plain Sight.
            </h2>
            <p className="landing-section-desc">
              Traditional monitoring systems often evaluate transactions individually. Laundering networks
              exploit this limitation by distributing funds across interconnected accounts just below
              statutory reporting thresholds.
            </p>
          </div>

          <div className="comparison-grid">
            {/* Left: Traditional Rule-Based Detection */}
            <div className="comparison-box problem">
              <div className="comparison-box-header">
                <h3 className="comparison-box-title">Traditional Rule-Based Systems</h3>
                <span className="badge danger-soft">High False Negatives</span>
              </div>
              <p style={{ fontSize: "13.5px", color: "#6A6180", margin: "0 0 16px 0" }}>
                Legacy systems evaluate isolated transactions against static threshold rules (e.g. ₹50,000 PAN limits).
              </p>

              <ul className="comparison-list">
                <li>
                  <svg className="comparison-icon-fail" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span><strong>Individual Transaction Isolation:</strong> Transfers evaluated independently without cross-hop link analysis.</span>
                </li>
                <li>
                  <svg className="comparison-icon-fail" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span><strong>Fixed Threshold Blindspots:</strong> Structuring 5 transfers of ₹49,200 bypasses the ₹50,000 threshold check completely.</span>
                </li>
                <li>
                  <svg className="comparison-icon-fail" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span><strong>Missed Interconnected Patterns:</strong> Cannot correlate multi-tier student mules or circular shell corporation wash trades.</span>
                </li>
              </ul>

              {/* Visual Mini Diagram: Isolated transactions */}
              <div className="comparison-diagram-box">
                <svg width="340" height="90" viewBox="0 0 340 90">
                  <rect x="15" y="25" width="80" height="40" rx="4" fill="#FFFFFF" stroke="#E3E0EA" />
                  <text x="55" y="44" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="#1D1530">Tx 1: ₹48.5k</text>
                  <text x="55" y="56" textAnchor="middle" fontSize="8" fill="#5C8A5C" fontWeight="700">✓ PASS (Below ₹50k)</text>

                  <rect x="130" y="25" width="80" height="40" rx="4" fill="#FFFFFF" stroke="#E3E0EA" />
                  <text x="170" y="44" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="#1D1530">Tx 2: ₹49.1k</text>
                  <text x="170" y="56" textAnchor="middle" fontSize="8" fill="#5C8A5C" fontWeight="700">✓ PASS (Below ₹50k)</text>

                  <rect x="245" y="25" width="80" height="40" rx="4" fill="#FFFFFF" stroke="#E3E0EA" />
                  <text x="285" y="44" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="#1D1530">Tx 3: ₹49.5k</text>
                  <text x="285" y="56" textAnchor="middle" fontSize="8" fill="#5C8A5C" fontWeight="700">✓ PASS (Below ₹50k)</text>
                </svg>
              </div>
            </div>

            {/* Right: LaunderLens Graph Intelligence */}
            <div className="comparison-box solution">
              <div className="comparison-box-header">
                <h3 className="comparison-box-title">LaunderLens Graph Intelligence</h3>
                <span className="badge success">92.4% F1 Detection</span>
              </div>
              <p style={{ fontSize: "13.5px", color: "#6A6180", margin: "0 0 16px 0" }}>
                Transforms disconnected transactions into multi-hop subgraphs and models temporal velocity across accounts.
              </p>

              <ul className="comparison-list">
                <li>
                  <svg className="comparison-icon-pass" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span><strong>Connected Account Networks:</strong> Traces fund flows across 2 to 6 hops to map originators, mules, and exit hubs.</span>
                </li>
                <li>
                  <svg className="comparison-icon-pass" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span><strong>Temporal Velocity Analysis:</strong> Flags rapid in-and-out hops with dwell times under 15 minutes and &gt;95% value conservation.</span>
                </li>
                <li>
                  <svg className="comparison-icon-pass" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span><strong>Explainable Investigation Evidence:</strong> Identifies the exact laundering typology and justifies scores via SHAP attributions.</span>
                </li>
              </ul>

              {/* Visual Mini Diagram: Interconnected graph ring */}
              <div className="comparison-diagram-box">
                <svg width="340" height="90" viewBox="0 0 340 90">
                  <path d="M45 45 L130 25 M45 45 L130 65 M130 25 L215 45 M130 65 L215 45 M215 45 L295 45" stroke="#5B2BB5" strokeWidth="1.8" fill="none" />
                  <circle cx="45" cy="45" r="12" fill="#2E9E6B" />
                  <circle cx="130" cy="25" r="10" fill="#E08A2E" />
                  <circle cx="130" cy="65" r="10" fill="#E08A2E" />
                  <circle cx="215" cy="45" r="11" fill="#6B4FC8" />
                  <circle cx="295" cy="45" r="13" fill="#D04545" />
                  <rect x="180" y="70" width="140" height="16" rx="3" fill="#F0EBFA" stroke="#DED3F2" />
                  <text x="250" y="81.5" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8.5" fill="#5B2BB5" fontWeight="700">RING DETECTED (₹1,47,100)</text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. FEATURES SECTION: Five Core Capabilities
          ==================================================================== */}
      <section className="landing-section alt-bg" id="features">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">Enterprise Capabilities</span>
            <h2 className="landing-section-title">
              Everything Investigators Need to Follow the Money.
            </h2>
            <p className="landing-section-desc">
              Engineered specifically for financial intelligence units, forensic compliance officers,
              and banking surveillance teams.
            </p>
          </div>

          {/* FEATURE 01: Temporal Graph Intelligence */}
          <div className="feature-row">
            <div className="feature-content">
              <span className="feature-badge">FEATURE 01</span>
              <h3 className="feature-title">Temporal Graph Intelligence</h3>
              <p className="feature-desc">
                Visualize account relationships and transaction flows across time. LaunderLens models financial
                data as directed multi-graphs, tracking velocity, dwell times, and volume dispersion to uncover
                rings conventional systems miss.
              </p>
              <ul className="feature-bullets">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7"/></svg>
                  Multi-hop directed graph traversal (2 to 6 hops)
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7"/></svg>
                  Temporal windowing & transit velocity metrics
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7"/></svg>
                  Node degree, fan-out ratios & conservation tracking
                </li>
              </ul>
            </div>
            <div className="feature-graphic-card">
              <svg width="100%" height="240" viewBox="0 0 460 240">
                <rect width="460" height="240" rx="8" fill="#F7F6F9" />
                {/* Visual timeline graph */}
                <line x1="50" y1="120" x2="410" y2="120" stroke="#E3E0EA" strokeDasharray="3 3" />
                <path d="M60 120 C120 40, 160 40, 200 120" stroke="#5B2BB5" strokeWidth="2" fill="none" />
                <path d="M200 120 C240 200, 300 200, 360 120" stroke="#5B2BB5" strokeWidth="2" fill="none" />
                <circle cx="60" cy="120" r="14" fill="#2E9E6B" />
                <circle cx="200" cy="120" r="14" fill="#E08A2E" />
                <circle cx="360" cy="120" r="14" fill="#D04545" />
                <text x="60" y="150" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="#1D1530" fontWeight="600">09:42 UTC</text>
                <text x="200" y="150" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="#1D1530" fontWeight="600">09:49 UTC (+7m)</text>
                <text x="360" y="150" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="#1D1530" fontWeight="600">09:56 UTC (+7m)</text>
                <rect x="175" y="55" width="110" height="20" rx="4" fill="#FFFFFF" stroke="#5B2BB5" />
                <text x="230" y="68" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="#5B2BB5" fontWeight="700">Dwell: &lt; 8 mins</text>
              </svg>
            </div>
          </div>

          {/* FEATURE 02: Five Laundering Typologies */}
          <div className="feature-row reverse">
            <div className="feature-content">
              <span className="feature-badge">FEATURE 02</span>
              <h3 className="feature-title">Five Laundering Typologies</h3>
              <p className="feature-desc">
                Pre-trained topological classifiers dedicated to the 5 primary money laundering structures
                recognized by the Financial Intelligence Unit (FIU-IND) and FATF.
              </p>

              {/* Interactive Tabs for Typologies */}
              <div className="typology-pills-bar">
                {[
                  { id: "scatter-gather", label: "Scatter-Gather" },
                  { id: "fan-out", label: "Fan-Out" },
                  { id: "fan-in", label: "Fan-In" },
                  { id: "cycle", label: "Cycle" },
                  { id: "pass-through", label: "Pass-Through" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`typology-pill ${activeTypologyTab === t.id ? "active" : ""}`}
                    onClick={() => setActiveTypologyTab(t.id as any)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: "13px", color: "#6A6180", lineHeight: 1.5 }}>
                {activeTypologyTab === "scatter-gather" && (
                  <span>
                    <strong>Scatter-Gather:</strong> Disperses a large lump sum across parallel mule accounts,
                    then recombines them into a single collection exit account within a tight temporal window.
                  </span>
                )}
                {activeTypologyTab === "fan-out" && (
                  <span>
                    <strong>Fan-Out (Structuring):</strong> High-value inbound funds split into numerous small
                    transfers just below PAN/CTR thresholds to evade statutory limits.
                  </span>
                )}
                {activeTypologyTab === "fan-in" && (
                  <span>
                    <strong>Fan-In (Aggregation):</strong> Funneling dozens of micro-deposits from retail or
                    dormant student accounts into a central commercial hub account.
                  </span>
                )}
                {activeTypologyTab === "cycle" && (
                  <span>
                    <strong>Circular Flow (Wash Trading):</strong> Closed directed loop between shell company
                    accounts artificially generating turnover with zero net economic activity.
                  </span>
                )}
                {activeTypologyTab === "pass-through" && (
                  <span>
                    <strong>Pass-Through Chain:</strong> Sequential transit mules receiving credits and
                    clearing 98% out within minutes, keeping zero overnight balances.
                  </span>
                )}
              </div>
            </div>

            {/* Mini Network Diagram for Active Typology */}
            <div className="feature-graphic-card">
              <div className="typology-mini-diagram">
                {activeTypologyTab === "scatter-gather" && (
                  <svg width="340" height="180" viewBox="0 0 340 180">
                    <path d="M40 90 L120 40 M40 90 L120 90 M40 90 L120 140" stroke="#5B2BB5" strokeWidth="1.8" />
                    <path d="M120 40 L220 60 M120 90 L220 60 M120 140 L220 120" stroke="#5B2BB5" strokeWidth="1.8" />
                    <path d="M220 60 L300 90 M220 120 L300 90" stroke="#5B2BB5" strokeWidth="2.2" />
                    <circle cx="40" cy="90" r="12" fill="#2E9E6B" />
                    <circle cx="120" cy="40" r="9" fill="#E08A2E" />
                    <circle cx="120" cy="90" r="9" fill="#E08A2E" />
                    <circle cx="120" cy="140" r="9" fill="#E08A2E" />
                    <circle cx="220" cy="60" r="10" fill="#6B4FC8" />
                    <circle cx="220" cy="120" r="10" fill="#6B4FC8" />
                    <circle cx="300" cy="90" r="13" fill="#D04545" />
                  </svg>
                )}
                {activeTypologyTab === "fan-out" && (
                  <svg width="340" height="180" viewBox="0 0 340 180">
                    <path d="M60 90 L260 30 M60 90 L260 60 M60 90 L260 90 M60 90 L260 120 M60 90 L260 150" stroke="#5B2BB5" strokeWidth="1.8" />
                    <circle cx="60" cy="90" r="14" fill="#2E9E6B" />
                    <circle cx="260" cy="30" r="8" fill="#E08A2E" />
                    <circle cx="260" cy="60" r="8" fill="#E08A2E" />
                    <circle cx="260" cy="90" r="8" fill="#E08A2E" />
                    <circle cx="260" cy="120" r="8" fill="#E08A2E" />
                    <circle cx="260" cy="150" r="8" fill="#E08A2E" />
                  </svg>
                )}
                {activeTypologyTab === "fan-in" && (
                  <svg width="340" height="180" viewBox="0 0 340 180">
                    <path d="M80 30 L280 90 M80 60 L280 90 M80 90 L280 90 M80 120 L280 90 M80 150 L280 90" stroke="#5B2BB5" strokeWidth="1.8" />
                    <circle cx="80" cy="30" r="8" fill="#E08A2E" />
                    <circle cx="80" cy="60" r="8" fill="#E08A2E" />
                    <circle cx="80" cy="90" r="8" fill="#E08A2E" />
                    <circle cx="80" cy="120" r="8" fill="#E08A2E" />
                    <circle cx="80" cy="150" r="8" fill="#E08A2E" />
                    <circle cx="280" cy="90" r="14" fill="#6B4FC8" />
                  </svg>
                )}
                {activeTypologyTab === "cycle" && (
                  <svg width="340" height="180" viewBox="0 0 340 180">
                    <circle cx="170" cy="90" r="50" fill="none" stroke="#5B2BB5" strokeWidth="2" strokeDasharray="4 3" />
                    <circle cx="170" cy="40" r="10" fill="#6B4FC8" />
                    <circle cx="220" cy="90" r="10" fill="#E08A2E" />
                    <circle cx="170" cy="140" r="10" fill="#E08A2E" />
                    <circle cx="120" cy="90" r="10" fill="#6B4FC8" />
                    <text x="170" y="93" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="#5B2BB5" fontWeight="700">LOOP (SCC)</text>
                  </svg>
                )}
                {activeTypologyTab === "pass-through" && (
                  <svg width="340" height="180" viewBox="0 0 340 180">
                    <path d="M40 90 L105 90 L170 90 L235 90 L300 90" stroke="#5B2BB5" strokeWidth="2.2" />
                    <circle cx="40" cy="90" r="11" fill="#2E9E6B" />
                    <circle cx="105" cy="90" r="10" fill="#E08A2E" />
                    <circle cx="170" cy="90" r="10" fill="#E08A2E" />
                    <circle cx="235" cy="90" r="10" fill="#E08A2E" />
                    <circle cx="300" cy="90" r="11" fill="#D04545" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* FEATURE 03: Explainable Risk Scoring */}
          <div className="feature-row">
            <div className="feature-content">
              <span className="feature-badge">FEATURE 03</span>
              <h3 className="feature-title">Explainable Risk Scoring with SHAP</h3>
              <p className="feature-desc">
                Black-box AI is unacceptable in financial compliance. LaunderLens leverages LightGBM
                decision trees paired with exact TreeSHAP values, explaining the precise mathematical
                contribution of each feature toward the suspiciousness score.
              </p>
              <ul className="feature-bullets">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7"/></svg>
                  Quantified Shapley feature attributions per alert
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7"/></svg>
                  Clear contribution meters (Dwell time, Conservation, Fan-out)
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7"/></svg>
                  Zero black-box ambiguity during regulatory audits
                </li>
              </ul>
            </div>
            <div className="feature-graphic-card">
              <div style={{ padding: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#1D1530" }}>TreeSHAP Feature Contributions</span>
                  <span className="badge danger">Risk: 0.94 High</span>
                </div>
                {[
                  { name: "Median dwell time < 18m", val: 0.38, pct: 85 },
                  { name: "High fan-out ratio (> 4.5)", val: 0.26, pct: 65 },
                  { name: "Flow conservation ratio (> 95%)", val: 0.18, pct: 45 },
                  { name: "New KYC dormant activation", val: 0.12, pct: 30 },
                ].map((item) => (
                  <div key={item.name} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: 4 }}>
                      <span style={{ color: "#6A6180" }}>{item.name}</span>
                      <strong className="mono" style={{ color: "#5B2BB5" }}>+{item.val.toFixed(2)}</strong>
                    </div>
                    <div style={{ height: 6, background: "#EFEDF3", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${item.pct}%`, height: "100%", background: "#5B2BB5", borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FEATURE 04: Automated Case Summaries */}
          <div className="feature-row reverse">
            <div className="feature-content">
              <span className="feature-badge">FEATURE 04</span>
              <h3 className="feature-title">Automated Case Summaries</h3>
              <p className="feature-desc">
                Generate evidence-grounded investigation narratives with verified transaction values.
                Our narrative synthesis engine is strictly constrained to the actual sub-graph edge data,
                eliminating AI hallucinations while producing regulatory-compliant case files in seconds.
              </p>
              <ul className="feature-bullets">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7"/></svg>
                  100% evidence-grounded narratives (Zero hallucination)
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7"/></svg>
                  Formatted for PMLA 2002 & FIU-IND STR submission
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7"/></svg>
                  One-click export to JSON and PDF dossiers
                </li>
              </ul>
            </div>
            <div className="feature-graphic-card">
              <div style={{ padding: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span className="badge success">Verified Narrative</span>
                  <span className="mono muted" style={{ fontSize: "11px" }}>FIU-IND/AML-TYP-2026/084</span>
                </div>
                <p style={{ fontSize: "13px", lineHeight: 1.55, color: "#1D1530", margin: "0 0 14px 0", background: "#FBF9FC", padding: "12px", borderRadius: 6, border: "1px solid #E3E0EA" }}>
                  "A coordinated network initiated transfers splitting <strong className="mono">₹1,94,400</strong> from origin account <span className="mono">ACC-8419</span> across four newly opened intermediary accounts within 18 minutes, reconsolidating 97.4% of total funds into <span className="mono">EXIT-901</span>."
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <span className="badge typology">Scatter-Gather Ring</span>
                  <span className="badge success">4 Mules Verified</span>
                  <span className="badge warning">Sub-Threshold Structure</span>
                </div>
              </div>
            </div>
          </div>

          {/* FEATURE 05: Red-Team Simulation */}
          <div className="feature-row">
            <div className="feature-content">
              <span className="feature-badge">FEATURE 05</span>
              <h3 className="feature-title">Red-Team Simulation Engine</h3>
              <p className="feature-desc">
                Continuously stress-test your surveillance readiness. Inject synthetic laundering patterns
                in an isolated sandbox to benchmark how LaunderLens identifies sub-threshold networks that
                slip right through legacy rule engines.
              </p>
              <ul className="feature-bullets">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7"/></svg>
                  Simulate attack rings across 2 to 6 hops
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7"/></svg>
                  Real-time side-by-side detection comparison
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7"/></svg>
                  Safe isolated sandbox testing environment
                </li>
              </ul>
            </div>
            <div className="feature-graphic-card">
              <div style={{ padding: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>Simulation Outcome</span>
                  <span className="badge success">Detected in 140ms</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "#FDFCFD", padding: "12px", borderRadius: 6, border: "1px solid #E3E0EA", borderTop: "2px solid #C23B3B" }}>
                    <small style={{ fontSize: "10px", fontWeight: 700, color: "#C23B3B", textTransform: "uppercase" }}>Rule Baseline</small>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#C23B3B", margin: "4px 0" }}>Missed</div>
                    <p style={{ fontSize: "11px", color: "#6A6180", margin: 0 }}>All transfers remained sub-threshold (&lt; ₹50,000).</p>
                  </div>
                  <div style={{ background: "#FFFFFF", padding: "12px", borderRadius: 6, border: "1px solid #E3E0EA", borderTop: "2px solid #5B2BB5" }}>
                    <small style={{ fontSize: "10px", fontWeight: 700, color: "#5B2BB5", textTransform: "uppercase" }}>LaunderLens</small>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#2E9E6B", margin: "4px 0" }}>Detected</div>
                    <p style={{ fontSize: "11px", color: "#6A6180", margin: 0 }}>Graph topology matched Scatter-gather ring at 0.94 risk.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          6. HOW IT WORKS (5-Step Horizontal Flow)
          ==================================================================== */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">Investigation Pipeline</span>
            <h2 className="landing-section-title">
              From Raw Transactions to Actionable Intelligence.
            </h2>
            <p className="landing-section-desc">
              A five-stage forensic pipeline that transforms noisy raw banking feeds into court-ready
              evidence and explainable intelligence.
            </p>
          </div>

          <div className="how-it-works-grid">
            {/* Step 1 */}
            <div className="how-step-card">
              <div className="how-step-badge">STEP 01</div>
              <div className="how-step-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
              </div>
              <h3 className="how-step-title">Transaction Data</h3>
              <p className="how-step-desc">
                Import and normalize financial records across RTGS, NEFT, IMPS, UPI, and Swift channels into a clean schema.
              </p>
            </div>

            {/* Step 2 */}
            <div className="how-step-card">
              <div className="how-step-badge">STEP 02</div>
              <div className="how-step-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <path d="M8.5 8.5l7 7" />
                </svg>
              </div>
              <h3 className="how-step-title">Temporal Graph</h3>
              <p className="how-step-desc">
                Connect sender and receiver accounts through directed, timestamped transaction relationships with retention deltas.
              </p>
            </div>

            {/* Step 3 */}
            <div className="how-step-card">
              <div className="how-step-badge">STEP 03</div>
              <div className="how-step-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h3 className="how-step-title">Pattern Detection</h3>
              <p className="how-step-desc">
                Extract suspicious topological sub-graph structures using five specialized graph motif algorithms.
              </p>
            </div>

            {/* Step 4 */}
            <div className="how-step-card">
              <div className="how-step-badge">STEP 04</div>
              <div className="how-step-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <h3 className="how-step-title">Risk Scoring & SHAP</h3>
              <p className="how-step-desc">
                Score clusters via LightGBM and extract exact TreeSHAP feature contributions justifying the priority.
              </p>
            </div>

            {/* Step 5 */}
            <div className="how-step-card">
              <div className="how-step-badge">STEP 05</div>
              <div className="how-step-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3 className="how-step-title">Investigator Workbench</h3>
              <p className="how-step-desc">
                Present the money trail, evidence table, and regulatory summary in an interactive, single-pane workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          7. PRODUCT PREVIEW SECTION: Interactive Workbench Mockup
          ==================================================================== */}
      <section className="landing-section alt-bg" id="about">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">Investigator Experience</span>
            <h2 className="landing-section-title">
              Meet Your Financial Investigation Workbench.
            </h2>
            <p className="landing-section-desc">
              Engineered for forensic analysts to review, triage, and confirm suspicious money laundering
              networks with speed, explainability, and forensic rigor.
            </p>
          </div>

          {/* Browser Window Mockup Frame */}
          <div className="browser-mockup">
            <div className="browser-mockup-bar">
              <div className="browser-controls">
                <span className="browser-dot red" />
                <span className="browser-dot yellow" />
                <span className="browser-dot green" />
              </div>
              <div className="browser-address">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>https://app.launderlens.ai/investigation/FO-027</span>
              </div>
              <span className="badge success" style={{ fontSize: "10px" }}>Live FastAPI :8000</span>
            </div>

            {/* Inner Dashboard Miniature Preview */}
            <div className="mockup-inner-app">
              {/* Mini Header Strip */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <span className="eyebrow">INVESTIGATION WORKSPACE (₹ INR)</span>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Alert Queue & Graph Subgraph</h3>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span className="badge typology">Scatter-Gather Ring</span>
                  <span className="badge danger">Risk: 0.94 High</span>
                </div>
              </div>

              {/* Grid with Alert queue snippet and mini graph */}
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
                {/* Graph preview */}
                <div style={{ background: "#FFFFFF", border: "1px solid #E3E0EA", borderRadius: 8, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "11px", fontWeight: 600 }}>
                    <span>Interactive Money Trail (FO-027)</span>
                    <span className="mono muted">₹21,468.30 Traced</span>
                  </div>
                  <svg width="100%" height="220" viewBox="0 0 400 220">
                    <rect width="400" height="220" fill="#FCFBFE" rx="6" />
                    <line x1="60" y1="110" x2="160" y2="50" stroke="#5B2BB5" strokeWidth="1.8" />
                    <line x1="60" y1="110" x2="160" y2="110" stroke="#5B2BB5" strokeWidth="1.8" />
                    <line x1="60" y1="110" x2="160" y2="170" stroke="#5B2BB5" strokeWidth="1.8" />
                    <line x1="160" y1="50" x2="280" y2="110" stroke="#5B2BB5" strokeWidth="1.8" />
                    <line x1="160" y1="110" x2="280" y2="110" stroke="#5B2BB5" strokeWidth="1.8" />
                    <line x1="160" y1="170" x2="280" y2="110" stroke="#5B2BB5" strokeWidth="1.8" />

                    <circle cx="60" cy="110" r="14" fill="#2E9E6B" />
                    <text x="60" y="113.5" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700">E</text>

                    <circle cx="160" cy="50" r="11" fill="#E08A2E" />
                    <circle cx="160" cy="110" r="11" fill="#E08A2E" />
                    <circle cx="160" cy="170" r="11" fill="#E08A2E" />

                    <circle cx="280" cy="110" r="15" fill="#D04545" />
                    <text x="280" y="114" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">X</text>
                  </svg>
                </div>

                {/* Evidence and SHAP */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "#FFFFFF", border: "1px solid #E3E0EA", borderRadius: 8, padding: 14 }}>
                    <span style={{ fontSize: "11px", fontWeight: 700 }}>Case Attribution</span>
                    <p style={{ fontSize: "12px", color: "#6A6180", margin: "6px 0 0 0" }}>
                      Grounded explanation verified across 4 accounts with &lt; 15m dwell time.
                    </p>
                  </div>

                  <div style={{ background: "#FFFFFF", border: "1px solid #E3E0EA", borderRadius: 8, padding: 14 }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, marginBottom: 8, display: "block" }}>
                      Model Attributions (TreeSHAP)
                    </span>
                    <div style={{ fontSize: "11px", color: "#6A6180", display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>Dwell Velocity</span>
                      <strong className="mono" style={{ color: "#5B2BB5" }}>+0.34</strong>
                    </div>
                    <div style={{ fontSize: "11px", color: "#6A6180", display: "flex", justifyContent: "space-between" }}>
                      <span>Amount Clustering</span>
                      <strong className="mono" style={{ color: "#5B2BB5" }}>+0.28</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 36 }}>
            <button
              type="button"
              className="landing-btn-primary landing-btn-lg"
              onClick={() => onSignIn("signin")}
              title="Sign in to access investigator workbench"
            >
              Sign In to Access Workbench
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================
          8. TECHNOLOGY SECTION: Clean Text-Based Architecture Grid
          ==================================================================== */}
      <section className="landing-section" id="technology">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">Enterprise Architecture</span>
            <h2 className="landing-section-title">
              Built on Graph Intelligence. Powered by Explainable AI.
            </h2>
            <p className="landing-section-desc">
              Engineered with proven, high-performance technology stacks designed for real-time
              financial intelligence, scalability, and audit reproducibility.
            </p>
          </div>

          <div className="tech-grid">
            <div className="tech-card">
              <div className="tech-card-category">Frontend Experience</div>
              <h3 className="tech-card-title">Next.js & React 19</h3>
              <p className="tech-card-desc">
                High-contrast investigation workspace built with React 19, TypeScript, Vite, and Tailwind CSS v4 for sub-second UI interactions.
              </p>
            </div>

            <div className="tech-card">
              <div className="tech-card-category">Forensic Backend</div>
              <h3 className="tech-card-title">Python & FastAPI</h3>
              <p className="tech-card-desc">
                Asynchronous ASGI API delivering high-throughput graph ingestion, RESTful endpoints, and transaction validation.
              </p>
            </div>

            <div className="tech-card">
              <div className="tech-card-category">Graph Analytics</div>
              <h3 className="tech-card-title">NetworkX & Pandas</h3>
              <p className="tech-card-desc">
                Directed multi-graph engine extracting strongly connected components (SCC), transit degree distributions, and flow conservation.
              </p>
            </div>

            <div className="tech-card">
              <div className="tech-card-category">Machine Learning</div>
              <h3 className="tech-card-title">LightGBM & TreeSHAP</h3>
              <p className="tech-card-desc">
                Gradient-boosted decision trees delivering 92.4% F1 precision alongside exact Shapley values explaining every flagged network.
              </p>
            </div>

            <div className="tech-card">
              <div className="tech-card-category">Transactional Ledger</div>
              <h3 className="tech-card-title">SQLite & PostgreSQL</h3>
              <p className="tech-card-desc">
                ACID-compliant relational ledger persisting verified transaction hops, account KYC tags, and investigator disposition audit logs.
              </p>
            </div>

            <div className="tech-card">
              <div className="tech-card-category">Visualization & AI</div>
              <h3 className="tech-card-title">Cytoscape & Gemini API</h3>
              <p className="tech-card-desc">
                Interactive SVG graph visualization with dynamic DAG/cycle layouts and evidence-grounded generative AI case dossiers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          9. FINAL CALL TO ACTION (CTA) SECTION
          ==================================================================== */}
      <section className="landing-final-cta">
        <svg className="cta-lattice-bg" viewBox="0 0 1440 400" preserveAspectRatio="none">
          <circle cx="200" cy="100" r="120" stroke="#FFFFFF" strokeWidth="1" fill="none" />
          <circle cx="800" cy="200" r="180" stroke="#FFFFFF" strokeWidth="1" fill="none" />
          <circle cx="1200" cy="80" r="100" stroke="#FFFFFF" strokeWidth="1" fill="none" />
          <line x1="200" y1="100" x2="800" y2="200" stroke="#FFFFFF" strokeWidth="1" />
          <line x1="800" y1="200" x2="1200" y2="80" stroke="#FFFFFF" strokeWidth="1" />
        </svg>

        <div className="landing-container landing-final-inner">
          <h2 className="landing-final-title">
            Don't Just Detect Transactions.
            <br />
            Understand the Network.
          </h2>

          <p className="landing-final-desc">
            Turn disconnected financial activity into explainable investigation intelligence with LaunderLens.
            Ready to explore our live forensic workbench?
          </p>

          <div className="landing-final-actions">
            <button
              type="button"
              className="landing-btn-primary landing-btn-lg"
              onClick={() => onSignIn("signup")}
              title="Create an investigator account"
            >
              Sign Up for Access
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              className="landing-btn-secondary landing-btn-lg"
              onClick={() => onSignIn("signin")}
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================
          10. FOOTER
          ==================================================================== */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-top">
            <div className="footer-brand-col">
              <div className="landing-brand">
                <svg
                  className="brand-mark"
                  viewBox="0 0 28 28"
                  width="24"
                  height="24"
                  fill="none"
                  stroke="#5B2BB5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11.5" cy="11.5" r="7.5" fill="#F0EBFA" />
                  <path d="m17 17 6 6M7 12h9M11.5 8v8" />
                </svg>
                <span className="landing-brand-name">
                  Launder<span>Lens</span>
                </span>
              </div>
              <p className="footer-tagline">
                Find the Pattern. Trace the Money. Stop Financial Crime.
              </p>
              <div style={{ marginTop: 16 }}>
                <span className="badge typology">Enterprise Surveillance (₹ INR)</span>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Product</div>
              <ul className="footer-links">
                <li><a href="#hero">Overview</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#features">Typology Catalog</a></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Platform</div>
              <ul className="footer-links">
                <li><a onClick={() => onSignIn("signin")}>Sign In (Existing Users)</a></li>
                <li><a onClick={() => onSignIn("signup")}>Sign Up (New Investigators)</a></li>
                <li><a onClick={() => onSignIn("signin")}>Investigator Dashboard</a></li>
                <li><a onClick={() => onSignIn("signin")}>Alert Investigation</a></li>
                <li><a onClick={() => onSignIn("signin")}>Red-Team Simulation</a></li>
                <li><a onClick={() => onSignIn("signin")}>Dataset Manager</a></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Technology</div>
              <ul className="footer-links">
                <li><a href="#technology">Graph Analytics (NetworkX)</a></li>
                <li><a href="#technology">Explainable AI (TreeSHAP)</a></li>
                <li><a href="#technology">LightGBM Classifiers</a></li>
                <li><a href="#technology">FastAPI Engine</a></li>
                {onReplayLoader && (
                  <li>
                    <a
                      onClick={onReplayLoader}
                      style={{ cursor: "pointer", color: "#5B2BB5", fontWeight: 600 }}
                    >
                      Replay Loader Animation ⚡
                    </a>
                  </li>
                )}
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Compliance</div>
              <ul className="footer-links">
                <li><a href="#about">PMLA 2002 Framework</a></li>
                <li><a href="#about">RBI Master Directions</a></li>
                <li><a href="#about">FATF Typologies</a></li>
                <li><a href="#about">FIU-IND Reporting</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <div>
              © 2026 LaunderLens. Financial Intelligence & Investigation Platform. All rights reserved.
            </div>
            <div>
              Standards: PMLA 2002 · RBI Master Direction on KYC & AML · FATF 40 Recommendations
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default LandingPage;
