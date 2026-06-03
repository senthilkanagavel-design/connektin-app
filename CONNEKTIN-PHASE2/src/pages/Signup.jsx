import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isTherMite, setIsTherMite] = useState(false);
  const [googleError, setGoogleError] = useState("");

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref === "thermite") { sessionStorage.setItem("ref", "thermite"); setIsTherMite(true); }
  }, [searchParams]);

  async function handleGoogle() {
    try {
      setGoogleError("");
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (err) {
      setGoogleError("Google sign-in failed. Please try again.");
      console.error(err);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.header}>
          <div style={S.logoWrap}>
            <img src="/icon-512.png" alt="ConnektIn" style={S.logoImg} />
            <span style={S.logoText}>Connekt<span style={S.logoIn}>In</span></span>
          </div>
          <h1 style={S.heading}>Create your account</h1>
          <p style={S.sub}>Join your career community</p>
        </div>
        <div style={S.cardWrap}>
          <div style={S.card}>
            {/* Thermite badge — only for Thermite referral users */}
            {isTherMite && (
              <div style={{ ...S.trialBadge, background: "#F0FDF4", borderColor: "#86EFAC" }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>🎓</span>
                <p style={S.trialText}>
                  <strong style={{ color: "#16A34A" }}>TherMite student</strong> — full access at <strong style={{ color: "#16A34A" }}>₹49/month</strong> after your free trial.
                </p>
              </div>
            )}
            {googleError && <div style={S.errorBox}>⚠️ {googleError}</div>}
            <button style={S.methodBtn} onClick={handleGoogle}>
              <div style={S.methodIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div style={S.methodText}>
                <span style={S.methodTitle}>Continue with Google</span>
                <span style={S.methodSub}>Use your existing Google account</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>

            <button style={S.methodBtn} onClick={() => navigate("/signup/email")}>
              <div style={{ ...S.methodIcon, background: "#F3F2EF" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <div style={S.methodText}>
                <span style={S.methodTitle}>Continue with Email</span>
                <span style={S.methodSub}>Create account with email and password</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <p style={S.footer}>Already have an account? <Link to="/login" style={S.link}>Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page:        { minHeight: "100vh", background: "#F3F2EF", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'DM Sans', sans-serif" },
  inner:       { width: "100%", maxWidth: 480, display: "flex", flexDirection: "column" },
  header:      { background: "#0A1628", padding: "36px 24px 40px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", boxSizing: "border-box" },
  logoWrap:    { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 },
  logoImg:     { width: 44, height: 44, objectFit: "contain", borderRadius: 10 },
  logoText:    { fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" },
  logoIn:      { color: "#0D9488" },
  heading:     { fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 6px", textAlign: "center" },
  sub:         { fontSize: 13, color: "#0D9488", fontWeight: 600, margin: 0, textAlign: "center", whiteSpace: "nowrap" },
  cardWrap:    { padding: "0 16px 32px", marginTop: -20, width: "100%", boxSizing: "border-box" },
  card:        { background: "#fff", borderRadius: 14, padding: "24px 18px", border: "0.5px solid #E4E2DC", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" },
  trialBadge:  { display: "flex", alignItems: "flex-start", gap: 10, borderRadius: 10, padding: "11px 13px", marginBottom: 18, border: "1px solid" },
  trialText:   { fontSize: 13, color: "#374151", lineHeight: 1.5, margin: 0 },
  errorBox:    { background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#DC2626", marginBottom: 14, lineHeight: 1.5 },
  methodBtn:   { width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#fff", border: "1.5px solid #E4E2DC", borderRadius: 12, cursor: "pointer", marginBottom: 10, fontFamily: "'DM Sans', sans-serif", textAlign: "left" },
  methodIcon:  { width: 40, height: 40, borderRadius: 10, background: "#F0F7FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  methodText:  { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  methodTitle: { fontSize: 14, fontWeight: 700, color: "#0A1628" },
  methodSub:   { fontSize: 11, color: "#9CA3AF" },
  footer:      { textAlign: "center", fontSize: 13, color: "#6B7280", margin: "16px 0 0" },
  link:        { color: "#0D9488", fontWeight: 600, textDecoration: "none", marginLeft: 4 },
};
