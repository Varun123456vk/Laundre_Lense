import React, { useState } from "react";
import type { User } from "./App";
import { LaunderLensLoader } from "./LaunderLensLoader";

interface AuthScreenProps {
  initialMode?: "signin" | "signup";
  onLogin: (user: User) => void;
  onBackToLanding: () => void;
}

export function AuthScreen({
  initialMode = "signin",
  onLogin,
  onBackToLanding,
}: AuthScreenProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  // Sign In state - starts completely blank
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  // Sign Up state
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpOrganization, setSignUpOrganization] = useState("");
  const [signUpRole, setSignUpRole] = useState("Lead Forensic Investigator");
  const [signUpClearance, setSignUpClearance] = useState("Tier-3 Authorized");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Common UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Switch tabs
  const handleTabSwitch = (newMode: "signin" | "signup") => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Sign In submit handler
  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signInEmail || !signInPassword) {
      setErrorMessage("Please enter both official email and security password.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      // Construct user profile from entered credentials
      const localPart = signInEmail.split("@")[0] || "Investigator";
      const cleanName = localPart
        .replace(/[._-]/g, " ")
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const initials = cleanName
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0].toUpperCase())
        .slice(0, 2)
        .join("") || "AI";

      onLogin({
        id: `user-${Date.now()}`,
        name: cleanName,
        email: signInEmail.trim(),
        initials,
        role: "Forensic AML Investigator",
        clearance: "Tier-3 Authorized",
        department: "Financial Crime & Intelligence Unit",
      });
      setIsSubmitting(false);
    }, 2200);
  };

  // Sign Up submit handler
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signUpName.trim()) {
      setErrorMessage("Full name is required.");
      return;
    }
    if (!signUpEmail.trim() || !signUpEmail.includes("@")) {
      setErrorMessage("Please provide a valid institutional email address.");
      return;
    }
    if (!signUpOrganization.trim()) {
      setErrorMessage("Please specify your institution or bank name.");
      return;
    }
    if (signUpPassword.length < 6) {
      setErrorMessage("Security key / password must be at least 6 characters.");
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMessage("Passwords do not match. Please verify both fields.");
      return;
    }
    if (!agreeTerms) {
      setErrorMessage("You must accept the PMLA / regulatory compliance terms.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const initials = signUpName
        .trim()
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0].toUpperCase())
        .slice(0, 2)
        .join("") || "NI";

      const newUser: User = {
        id: `user-${Date.now()}`,
        name: signUpName.trim(),
        email: signUpEmail.trim(),
        initials,
        role: signUpRole,
        clearance: signUpClearance,
        department: signUpOrganization.trim(),
      };

      setSuccessMessage(`Account registered successfully for ${newUser.name}! Redirecting...`);
      onLogin(newUser);
      setIsSubmitting(false);
    }, 2200);
  };

  return (
    <div className="auth-wrapper">
      {isSubmitting && (
        <LaunderLensLoader
          variant="fullscreen"
          durationMs={2200}
          message={
            mode === "signin"
              ? "Authenticating credentials and verifying institutional clearance..."
              : "Registering investigator profile and generating secure workspace..."
          }
          onComplete={() => {}}
        />
      )}
      {/* Top utility row with back button */}
      <div className="auth-top-bar">
        <button
          type="button"
          className="auth-back-nav"
          onClick={onBackToLanding}
          title="Return to LaunderLens Landing Page"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back to Landing Page</span>
        </button>

        <div className="auth-compliance-tag">
          <span className="auth-dot" />
          <span>PMLA 2002 / RBI Master Directions Compliant</span>
        </div>
      </div>

      <div className="login-card auth-card">
        {/* Brand header */}
        <div className="login-header-section">
          <div className="auth-brand-row">
            <svg
              className="landing-brand-logo"
              viewBox="0 0 32 32"
              fill="none"
              stroke="#5B2BB5"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="26"
              height="26"
            >
              <circle cx="11.5" cy="11.5" r="7.5" fill="#F0EBFA" />
              <path d="m17 17 6 6M7 12h9M11.5 8v8" />
            </svg>
            <span className="landing-brand-name">
              Launder<span style={{ color: "#5B2BB5" }}>Lens</span>
            </span>
          </div>

          <p className="auth-subtitle">
            Financial Crime & AML Subgraph Forensic Platform
          </p>

          {/* Segmented Mode Selector: Sign In vs Sign Up */}
          <div className="auth-mode-segmented">
            <button
              type="button"
              className={`auth-mode-tab ${mode === "signin" ? "active" : ""}`}
              onClick={() => handleTabSwitch("signin")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
              </svg>
              <span>Sign In (Existing Users)</span>
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => handleTabSwitch("signup")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              <span>Sign Up (New Users)</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="login-body-section">
          {/* Security Banner */}
          <div className="security-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B2BB5" strokeWidth="2.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              {mode === "signin"
                ? "Restricted Access: Authorized FIU compliance, bank risk desks, and certified AML investigators."
                : "New Organization Registration: Institutional credentials will be validated against regulatory registries."}
            </span>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="auth-alert error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="auth-alert success">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* -------------------- TAB 1: SIGN IN -------------------- */}
          {mode === "signin" && (
            <form onSubmit={handleSignInSubmit} className="auth-form">
              <div className="form-field">
                <label>Official Institutional Email</label>
                <div className="input-with-icon">
                  <span className="input-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    className="text-input"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="investigator@aml-fiu.gov.in"
                  />
                </div>
              </div>

              <div className="form-field">
                <label>
                  <span>Security Key / Password</span>
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => {
                      setForgotEmail(signInEmail);
                      setShowForgotModal(true);
                      setForgotSubmitted(false);
                    }}
                  >
                    Forgot Password?
                  </button>
                </label>
                <div className="input-with-icon">
                  <span className="input-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showSignInPassword ? "text" : "password"}
                    className="text-input"
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    title={showSignInPassword ? "Hide password" : "Show password"}
                  >
                    {showSignInPassword ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="auth-options-row">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Maintain active encrypted session (8 hours)</span>
                </label>
              </div>

              <button type="submit" className="login-btn auth-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="spinner" />
                    <span>Verifying Credentials…</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Sign In to Investigation Workspace</span>
                  </>
                )}
              </button>

              {/* Bottom switcher to Sign Up */}
              <div className="auth-switch-text">
                <span>New to LaunderLens?</span>{" "}
                <button
                  type="button"
                  className="auth-link-bold"
                  onClick={() => handleTabSwitch("signup")}
                >
                  Create an investigator account (Sign Up) →
                </button>
              </div>
            </form>
          )}

          {/* -------------------- TAB 2: SIGN UP -------------------- */}
          {mode === "signup" && (
            <form onSubmit={handleSignUpSubmit} className="auth-form">
              <div className="form-field">
                <label>Full Name</label>
                <div className="input-with-icon">
                  <span className="input-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="text-input"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="e.g. Vikramaditya Sen"
                  />
                </div>
              </div>

              <div className="auth-two-col">
                <div className="form-field">
                  <label>Official Work Email</label>
                  <div className="input-with-icon">
                    <span className="input-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      className="text-input"
                      required
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      placeholder="v.sen@axisbank.com"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Institution / Bank Name</label>
                  <div className="input-with-icon">
                    <span className="input-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      className="text-input"
                      required
                      value={signUpOrganization}
                      onChange={(e) => setSignUpOrganization(e.target.value)}
                      placeholder="e.g. Axis Bank AML Risk Desk"
                    />
                  </div>
                </div>
              </div>

              <div className="auth-two-col">
                <div className="form-field">
                  <label>Primary Forensic Role</label>
                  <select
                    className="select-input"
                    value={signUpRole}
                    onChange={(e) => setSignUpRole(e.target.value)}
                  >
                    <option value="Lead Forensic Investigator">Lead Forensic Investigator</option>
                    <option value="FIU Compliance Officer">FIU Compliance Officer (STR/SAR)</option>
                    <option value="Financial Crime Analyst">Financial Crime Analyst</option>
                    <option value="Graph ML Engineer">Graph ML Engineer</option>
                    <option value="Red-Team Security Auditor">Red-Team Security Auditor</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Clearance Level</label>
                  <select
                    className="select-input"
                    value={signUpClearance}
                    onChange={(e) => setSignUpClearance(e.target.value)}
                  >
                    <option value="Tier-3 Authorized">Tier-3 Full Forensics & Red-Team</option>
                    <option value="Tier-2 Elevated">Tier-2 Case Investigation</option>
                    <option value="Tier-1 Standard">Tier-1 Alert Reviewer</option>
                  </select>
                </div>
              </div>

              <div className="auth-two-col">
                <div className="form-field">
                  <label>Master Password</label>
                  <div className="input-with-icon">
                    <span className="input-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showSignUpPassword ? "text" : "password"}
                      className="text-input"
                      required
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Confirm Password</label>
                  <div className="input-with-icon">
                    <span className="input-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <input
                      type={showSignUpPassword ? "text" : "password"}
                      className="text-input"
                      required
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                    />
                  </div>
                </div>
              </div>

              <div className="auth-password-toggle-row">
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                >
                  {showSignUpPassword ? "Hide passwords" : "Show passwords"}
                </button>
                {signUpPassword && signUpConfirmPassword && (
                  <span
                    style={{
                      fontSize: 11,
                      color: signUpPassword === signUpConfirmPassword ? "#2E9E6B" : "#C23B3B",
                      fontWeight: 600,
                    }}
                  >
                    {signUpPassword === signUpConfirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </span>
                )}
              </div>

              <div className="auth-options-row">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    required
                  />
                  <span>
                    I certify authorization under the Prevention of Money Laundering Act (PMLA 2002) & RBI
                    Master Directions to access financial intelligence and agree to the Institutional Terms.
                  </span>
                </label>
              </div>

              <button type="submit" className="login-btn auth-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="spinner" />
                    <span>Creating Investigator Profile…</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                    <span>Create Investigator Account</span>
                  </>
                )}
              </button>

              {/* Bottom switcher to Sign In */}
              <div className="auth-switch-text">
                <span>Already registered with an institution?</span>{" "}
                <button
                  type="button"
                  className="auth-link-bold"
                  onClick={() => handleTabSwitch("signin")}
                >
                  Sign In to existing account →
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div className="auth-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div className="auth-modal-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B2BB5" strokeWidth="2.2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Password Recovery Protocol</span>
              </div>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setShowForgotModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="auth-modal-body">
              {forgotSubmitted ? (
                <div className="auth-alert success" style={{ marginBottom: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <div>
                    <strong>Recovery Dispatch Sent</strong>
                    <p style={{ margin: "4px 0 0 0", fontSize: 11 }}>
                      If <code>{forgotEmail}</code> is registered in the institutional registry, an
                      encrypted recovery token has been dispatched.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: "var(--secondary)", margin: "0 0 14px 0", lineHeight: 1.5 }}>
                    Enter your registered institutional email. A secure, cryptographic one-time reset token
                    will be routed to your department administrator.
                  </p>

                  <div className="form-field">
                    <label>Official Email</label>
                    <input
                      type="email"
                      className="text-input"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="investigator@bank.com"
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setShowForgotModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="button primary"
                      onClick={() => setForgotSubmitted(true)}
                    >
                      Dispatch Recovery Link
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

