import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function validateEmail(email) {
  if (!email.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
  const domain = email.split("@")[1];
  if (!domain || !domain.includes(".")) return "Please enter a valid email address.";
  const tld = domain.split(".").pop();
  if (tld.length < 2) return "Please enter a valid email address.";
  return null; // valid
}

export default function EmailLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [emailError, setEmailError]     = useState("");
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleEmailBlur() {
    const err = validateEmail(email);
    setEmailError(err || "");
  }

  async function handleSubmit() {
    // Validate email first
    const emailErr = validateEmail(email);
    if (emailErr) { setEmailError(emailErr); return; }
    if (!password) { setError("Please enter your password."); return; }

    setError(""); setEmailError(""); setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate("/dashboard");
    } catch (err) {
      const code = err?.code || "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Incorrect email or password. Please try again.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (code === "auth/invalid-email") {
        setEmailError("Please enter a valid email address.");
      } else if (code === "auth/user-disabled") {
        setError("This account has been disabled. Please contact support.");
      } else {
        setError("Login failed. Please check your connection and try again.");
      }
    } finally { setLoading(false); }
  }

  const emailBorderColor = emailError ? "#FCA5A5" : email && !emailError ? "#0D9488" : "#E4E2DC";

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.header}>
          <button style={S.backBtn} onClick={() => navigate("/login")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div style={S.logoWrap}>
            <img src="/icon-512.png" alt="ConnektIn" style={S.logoImg} />
            <span style={S.logoText}>Connekt<span style={S.logoIn}>In</span></span>
          </div>
          <h1 style={S.heading}>Sign in with Email</h1>
          <p style={S.sub}>Enter your email and password</p>
        </div>

        <div style={S.cardWrap}>
          <div style={S.card}>

            {/* Email field */}
            <label style={S.label}>Email</label>
            <div style={S.inputWrap}>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(""); setError(""); }}
                onBlur={handleEmailBlur}
                style={{ ...S.input, borderColor: emailBorderColor }}
                autoComplete="email"
                autoCapitalize="none"
              />
              {/* Tick when valid */}
              {email && !emailError && (
                <span style={S.validTick}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
              )}
            </div>
            {emailError && (
              <p style={S.fieldError}>⚠ {emailError}</p>
            )}

            {/* Password field */}
            <label style={{ ...S.label, marginTop: emailError ? 10 : 0 }}>Password</label>
            <div style={S.passWrap}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                style={{ ...S.input, marginBottom: 0, paddingRight: 40, borderColor: error ? "#FCA5A5" : "#E4E2DC" }}
                autoComplete="current-password"
              />
              <button type="button" style={S.eyeBtn} onClick={() => setShowPassword(v => !v)}>
                {showPassword
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>

            <Link to="/forgot-password" style={S.forgot}>Forgot password?</Link>

            {error && <div style={S.errorBox}>⚠️ {error}</div>}

            <div style={S.btnRow}>
              <button
                type="button"
                style={S.clearBtn}
                onClick={() => { setEmail(""); setPassword(""); setError(""); setEmailError(""); }}
              >
                Clear
              </button>
              <button
                type="button"
                style={{ ...S.signinBtn, opacity: loading ? 0.7 : 1 }}
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </div>

            <p style={S.footer}>
              Don't have an account?{" "}
              <Link to="/signup" style={S.link}>Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page:       { minHeight: "100vh", background: "#F3F2EF", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'DM Sans', sans-serif" },
  inner:      { width: "100%", maxWidth: 480, display: "flex", flexDirection: "column" },
  header:     { background: "#0A1628", padding: "36px 24px 40px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", boxSizing: "border-box", position: "relative" },
  backBtn:    { position: "absolute", left: 16, top: 20, background: "none", border: "none", cursor: "pointer", padding: 6 },
  logoWrap:   { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 },
  logoImg:    { width: 44, height: 44, objectFit: "contain", borderRadius: 10 },
  logoText:   { fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" },
  logoIn:     { color: "#0D9488" },
  heading:    { fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 6px", textAlign: "center" },
  sub:        { fontSize: 13, color: "#0D9488", fontWeight: 600, margin: 0, textAlign: "center", whiteSpace: "nowrap" },
  cardWrap:   { padding: "0 16px 32px", marginTop: -20, width: "100%", boxSizing: "border-box" },
  card:       { background: "#fff", borderRadius: 14, padding: "24px 18px", border: "0.5px solid #E4E2DC", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" },
  label:      { display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 },
  inputWrap:  { position: "relative", marginBottom: 6 },
  input:      { width: "100%", padding: "11px 36px 11px 14px", border: "1.5px solid #E4E2DC", borderRadius: 10, fontSize: 14, color: "#0A1628", background: "#F9FAFB", outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif", marginBottom: 0, transition: "border-color 0.2s" },
  validTick:  { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" },
  fieldError: { fontSize: 12, color: "#DC2626", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 4 },
  passWrap:   { position: "relative", marginBottom: 6 },
  eyeBtn:     { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 4 },
  forgot:     { display: "block", textAlign: "right", fontSize: 12, color: "#0D9488", textDecoration: "none", marginBottom: 14, marginTop: 6 },
  errorBox:   { background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#DC2626", marginBottom: 12, lineHeight: 1.5 },
  btnRow:     { display: "flex", gap: 8, marginBottom: 16 },
  clearBtn:   { flex: 1, padding: "11px 0", background: "#F3F2EF", border: "1.5px solid #E4E2DC", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#6B7280", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  signinBtn:  { flex: 2, padding: "11px 0", background: "#0A1628", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  footer:     { textAlign: "center", fontSize: 13, color: "#6B7280", margin: 0 },
  link:       { color: "#0D9488", fontWeight: 600, textDecoration: "none", marginLeft: 4 },
};
