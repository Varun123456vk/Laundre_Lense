import React, { useState, useEffect, useRef } from "react";
import "./loader.css";

export interface LaunderLensLoaderProps {
  isLoading?: boolean;
  progress?: number;
  message?: string;
  onComplete?: () => void;
  variant?: "fullscreen" | "compact";
  durationMs?: number;
}

export function LaunderLensLoader({
  isLoading = true,
  progress: externalProgress,
  message: externalMessage,
  onComplete,
  variant = "fullscreen",
  durationMs = 4500,
}: LaunderLensLoaderProps) {
  const [internalProgress, setInternalProgress] = useState(0);
  const [scene, setScene] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Effective progress: either externally provided or driven by the 4.5s internal clock
  const progress = typeof externalProgress === "number" ? externalProgress : internalProgress;

  useEffect(() => {
    if (!isLoading) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        onComplete?.();
      }, 500);
      return () => clearTimeout(timer);
    }

    // If external progress is supplied, derive scene directly from external progress
    if (typeof externalProgress === "number") {
      if (externalProgress < 20) setScene(1);
      else if (externalProgress < 45) setScene(2);
      else if (externalProgress < 70) setScene(3);
      else if (externalProgress < 92) setScene(4);
      else setScene(5);

      if (externalProgress >= 100) {
        setIsFadingOut(true);
        const timer = setTimeout(() => {
          onComplete?.();
        }, 500);
        return () => clearTimeout(timer);
      }
      return;
    }

    // Self-driven realistic 5-scene timeline
    let isCancelled = false;

    const step = (timestamp: number) => {
      if (isCancelled) return;
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const pct = Math.min(100, Math.floor((elapsed / durationMs) * 100));

      setInternalProgress(pct);

      if (elapsed < 900) {
        setScene(1);
      } else if (elapsed < 1900) {
        setScene(2);
      } else if (elapsed < 2900) {
        setScene(3);
      } else if (elapsed < 3900) {
        setScene(4);
      } else {
        setScene(5);
      }

      if (elapsed < durationMs) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        setInternalProgress(100);
        setScene(5);
        // Scene 5 hold and smooth transition
        setTimeout(() => {
          if (!isCancelled) {
            setIsFadingOut(true);
            setTimeout(() => {
              if (!isCancelled) onComplete?.();
            }, 500);
          }
        }, 400);
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      isCancelled = true;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isLoading, externalProgress, durationMs, onComplete]);

  // Dynamic Scene Content based on the 5-scene sequence
  const getSceneDetails = () => {
    if (externalMessage) {
      return {
        title: "INITIALIZING INVESTIGATION",
        message: externalMessage,
        tag: `STAGE ${scene}/5 · ${progress}%`,
        isError: false,
      };
    }

    switch (scene) {
      case 1:
        return {
          title: "BRAND & ENGINE INITIALIZATION",
          message: "Initializing LaunderLens graph neural analytics kernel...",
          tag: "GRAPH KERNEL: ONLINE",
          isError: false,
        };
      case 2:
        return {
          title: "TEMPORAL NETWORK CONSTRUCTION",
          message: "Constructing multi-tier account relationship pathways...",
          tag: "TOPOLOGY PROBES: DISPATCHED",
          isError: false,
        };
      case 3:
        return {
          title: "SUSPICIOUS PATTERN DETECTION",
          message: "Scanning multi-hop fund dispersion and layering velocity...",
          tag: "ANOMALY: STRUCTURING MOTIF MATCHED",
          isError: true, // red highlight
        };
      case 4:
        return {
          title: "INVESTIGATION INTELLIGENCE (SHAP)",
          message: "Tracing suspicious transaction networks and attribution weights...",
          tag: "MONEY TRAIL IDENTIFIED: 4 MULES (₹1,94,400)",
          isError: true,
        };
      case 5:
      default:
        return {
          title: "FORENSIC WORKBENCH READY",
          message: "Investigation environment ready. Launching forensic console...",
          tag: "SYSTEM INTEGRITY: 100% VERIFIED",
          isError: false,
        };
    }
  };

  const sceneInfo = getSceneDetails();

  const isFullscreen = variant === "fullscreen";

  return (
    <div
      className={
        isFullscreen
          ? `ll-loader-overlay ${isFadingOut ? "fade-out" : ""}`
          : `ll-loader-compact ${isFadingOut ? "fade-out" : ""}`
      }
      role="status"
      aria-live="polite"
      aria-label="LaunderLens Loading Animation"
    >
      <div className="ll-loader-card">
        {/* Top Institutional Header Badge */}
        <div className="ll-loader-header-badge">
          <span className="ll-loader-beacon-dot" />
          <span>LaunderLens Intelligence Engine · v2.4</span>
        </div>

        {/* Dynamic Vector Animation Canvas */}
        <div className="ll-loader-canvas-container">
          <svg
            className="ll-loader-svg"
            viewBox="0 0 500 260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Radial Glow Filters */}
              <filter id="glow-violet" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Radar Sweep Gradient */}
              <linearGradient id="radar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5B2BB5" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#5B2BB5" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* --- SCENE 3 & 4: Radar Scanning Sweep Beam --- */}
            {(scene === 3 || scene === 4) && (
              <g className="ll-radar-sweep">
                <circle cx="250" cy="130" r="110" stroke="#5B2BB5" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                <circle cx="250" cy="130" r="70" stroke="#5B2BB5" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                <path
                  d="M250 130 L360 130 A110 110 0 0 1 327 207 Z"
                  fill="url(#radar-gradient)"
                />
              </g>
            )}

            {/* --- EDGES / PATHWAYS --- */}
            {scene >= 2 && scene <= 4 && (
              <g id="network-edges">
                {/* Entry (80, 130) -> Mule 1 (170, 70) */}
                <line
                  x1="80"
                  y1="130"
                  x2="170"
                  y2="70"
                  className={scene >= 3 ? "ll-edge-suspicious" : "ll-edge-normal"}
                />
                {/* Entry (80, 130) -> Mule 2 (170, 190) */}
                <line
                  x1="80"
                  y1="130"
                  x2="170"
                  y2="190"
                  className={scene >= 3 ? "ll-edge-suspicious" : "ll-edge-normal"}
                />

                {/* Mule 1 (170, 70) -> Hub (250, 130) */}
                <line
                  x1="170"
                  y1="70"
                  x2="250"
                  y2="130"
                  className={scene >= 3 ? "ll-edge-suspicious" : "ll-edge-active"}
                />
                {/* Mule 2 (170, 190) -> Hub (250, 130) */}
                <line
                  x1="170"
                  y1="190"
                  x2="250"
                  y2="130"
                  className={scene >= 3 ? "ll-edge-suspicious" : "ll-edge-active"}
                />

                {/* Mule 1 (170, 70) -> Mule 3 (330, 70) */}
                <line
                  x1="170"
                  y1="70"
                  x2="330"
                  y2="70"
                  className={scene >= 3 ? "ll-edge-mule-transit" : "ll-edge-normal"}
                />
                {/* Mule 2 (170, 190) -> Mule 4 (330, 190) */}
                <line
                  x1="170"
                  y1="190"
                  x2="330"
                  y2="190"
                  className={scene >= 3 ? "ll-edge-mule-transit" : "ll-edge-normal"}
                />

                {/* Hub (250, 130) -> Exit (420, 130) */}
                <line
                  x1="250"
                  y1="130"
                  x2="420"
                  y2="130"
                  className={scene >= 3 ? "ll-edge-suspicious" : "ll-edge-active"}
                />

                {/* Mule 3 (330, 70) -> Exit (420, 130) */}
                <line
                  x1="330"
                  y1="70"
                  x2="420"
                  y2="130"
                  className={scene >= 3 ? "ll-edge-suspicious" : "ll-edge-normal"}
                />
                {/* Mule 4 (330, 190) -> Exit (420, 130) */}
                <line
                  x1="330"
                  y1="190"
                  x2="420"
                  y2="130"
                  className={scene >= 3 ? "ll-edge-suspicious" : "ll-edge-normal"}
                />

                {/* Moving Transaction Particles along connections */}
                <circle cx="125" cy="100" r="3.5" className={scene >= 3 ? "ll-particle-suspicious" : "ll-particle"}>
                  <animate
                    attributeName="cx"
                    values="80;170"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="cy"
                    values="130;70"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </circle>

                <circle cx="210" cy="100" r="3.5" className={scene >= 3 ? "ll-particle-suspicious" : "ll-particle"}>
                  <animate
                    attributeName="cx"
                    values="170;250"
                    dur="1.1s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="cy"
                    values="70;130"
                    dur="1.1s"
                    repeatCount="indefinite"
                  />
                </circle>

                <circle cx="335" cy="130" r="3.5" className={scene >= 3 ? "ll-particle-suspicious" : "ll-particle"}>
                  <animate
                    attributeName="cx"
                    values="250;420"
                    dur="1.3s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="cy"
                    values="130;130"
                    dur="1.3s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            )}

            {/* --- SCENE 1 & SCENE 5: Brand 3-Node Central Symbol --- */}
            {(scene === 1 || scene === 5) && (
              <g id="brand-core-symbol" className="ll-node-pulse">
                {/* Connecting Brand Lines */}
                <line x1="235" y1="118" x2="265" y2="118" stroke="#5B2BB5" strokeWidth="2.5" />
                <line x1="235" y1="118" x2="250" y2="148" stroke="#5B2BB5" strokeWidth="2.5" />
                <line x1="265" y1="118" x2="250" y2="148" stroke="#5B2BB5" strokeWidth="2.5" />

                {/* Brand Nodes */}
                <circle cx="235" cy="118" r="8" fill="#5B2BB5" className="ll-glow-hub" />
                <circle cx="265" cy="118" r="8" fill="#5B2BB5" className="ll-glow-hub" />
                <circle cx="250" cy="148" r="9" fill="#1D1530" />

                {/* Center Pulse Echo */}
                <circle cx="250" cy="130" r="38" stroke="#5B2BB5" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.5" />
              </g>
            )}

            {/* --- SCENE 2, 3, 4: Extended Graph Network Nodes --- */}
            {scene >= 2 && scene <= 4 && (
              <g id="network-nodes">
                {/* 1. Entry Account (Green) */}
                <g className={scene >= 4 ? "ll-glow-entry" : ""}>
                  <circle cx="80" cy="130" r="14" fill="#2E9E6B" />
                  <circle cx="80" cy="130" r="6" fill="#FFFFFF" />
                  <text x="80" y="158" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" fill="#2E9E6B">
                    ACC-8419
                  </text>
                  <text x="80" y="169" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7.5" fill="#6A6180">
                    [ENTRY]
                  </text>
                </g>

                {/* 2. Mule Account 1 (Amber / Orange) */}
                <g className={scene >= 3 ? "ll-glow-mule" : ""}>
                  <circle cx="170" cy="70" r="12" fill={scene >= 3 ? "#E08A2E" : "#DED3F2"} />
                  <circle cx="170" cy="70" r="5" fill="#FFFFFF" />
                  <text x="170" y="52" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8.5" fontWeight="600" fill={scene >= 3 ? "#C9811A" : "#6A6180"}>
                    MULE-104
                  </text>
                  {scene >= 4 && (
                    <text x="170" y="42" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill="#C9811A" fontWeight="700">
                      ₹48,500
                    </text>
                  )}
                </g>

                {/* 3. Mule Account 2 (Amber / Orange) */}
                <g className={scene >= 3 ? "ll-glow-mule" : ""}>
                  <circle cx="170" cy="190" r="12" fill={scene >= 3 ? "#E08A2E" : "#DED3F2"} />
                  <circle cx="170" cy="190" r="5" fill="#FFFFFF" />
                  <text x="170" y="214" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8.5" fontWeight="600" fill={scene >= 3 ? "#C9811A" : "#6A6180"}>
                    MULE-208
                  </text>
                  {scene >= 4 && (
                    <text x="170" y="225" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill="#C9811A" fontWeight="700">
                      ₹49,100
                    </text>
                  )}
                </g>

                {/* 4. Central Aggregator / Hub (Violet) */}
                <g className="ll-glow-hub">
                  <circle cx="250" cy="130" r="15" fill="#5B2BB5" />
                  <circle cx="250" cy="130" r="6" fill="#FFFFFF" />
                  <text x="250" y="110" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" fill="#5B2BB5">
                    HUB-700
                  </text>
                  <text x="250" y="156" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7.5" fill="#6A6180">
                    [CONSOLIDATOR]
                  </text>
                </g>

                {/* 5. Mule Account 3 (Amber / Orange) */}
                <g className={scene >= 3 ? "ll-glow-mule" : ""}>
                  <circle cx="330" cy="70" r="11" fill={scene >= 3 ? "#E08A2E" : "#DED3F2"} />
                  <circle cx="330" cy="70" r="4.5" fill="#FFFFFF" />
                  <text x="330" y="52" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8.5" fontWeight="600" fill={scene >= 3 ? "#C9811A" : "#6A6180"}>
                    MULE-312
                  </text>
                </g>

                {/* 6. Mule Account 4 (Amber / Orange) */}
                <g className={scene >= 3 ? "ll-glow-mule" : ""}>
                  <circle cx="330" cy="190" r="11" fill={scene >= 3 ? "#E08A2E" : "#DED3F2"} />
                  <circle cx="330" cy="190" r="4.5" fill="#FFFFFF" />
                  <text x="330" y="214" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8.5" fontWeight="600" fill={scene >= 3 ? "#C9811A" : "#6A6180"}>
                    MULE-416
                  </text>
                </g>

                {/* 7. Final Collector / Exit Account (Red) */}
                <g className={scene >= 3 ? "ll-glow-exit" : ""}>
                  <circle cx="420" cy="130" r="15" fill="#C23B3B" />
                  <circle cx="420" cy="130" r="6.5" fill="#FFFFFF" />
                  <text x="420" y="158" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" fill="#C23B3B">
                    EXIT-901
                  </text>
                  <text x="420" y="169" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7.5" fill="#C23B3B" fontWeight="600">
                    [RISK 0.94]
                  </text>
                </g>

                {/* Scene 3 & 4 Suspicious Alert Stamp */}
                {scene >= 3 && (
                  <g>
                    <rect x="180" y="235" width="140" height="18" rx="4" fill="#FDF2F2" stroke="#F8B4B4" />
                    <text x="250" y="247.5" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8.5" fontWeight="700" fill="#9B1C1C">
                      STRUCTURING RING DETECTED
                    </text>
                  </g>
                )}
              </g>
            )}
          </svg>
        </div>

        {/* Dynamic Status Narrative Area */}
        <div className="ll-loader-info">
          <div className="ll-loader-phase-title">
            <span>{sceneInfo.title}</span>
          </div>

          <p className="ll-loader-message">{sceneInfo.message}</p>
        </div>

        {/* Progress Bar & Telemetry Section */}
        <div className="ll-loader-progress-section">
          <div className="ll-loader-progress-track">
            <div
              className="ll-loader-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="ll-loader-telemetry-row">
            <div className="ll-loader-telemetry-status">
              <span>STAGE:</span>
              <strong>{sceneInfo.tag}</strong>
            </div>
            <div className="ll-loader-telemetry-pct">
              <span>{progress}%</span>
            </div>
          </div>
        </div>

        {/* Live Forensic Telemetry Chip */}
        <div className={`ll-loader-live-tag ${sceneInfo.isError ? "danger" : "success"}`}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>
            {scene === 1 && "CORE SUBSYSTEMS: INITIALIZING"}
            {scene === 2 && "DIRECTED SUBGRAPH: COMPUTING"}
            {scene === 3 && "ANOMALY CONFIDENCE: 94.2%"}
            {scene === 4 && "TREESHAP ATTRIBUTION: VERIFIED"}
            {scene === 5 && "SECURITY HANDSHAKE: COMPLETE"}
          </span>
        </div>
      </div>
    </div>
  );
}

