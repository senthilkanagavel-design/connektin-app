import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [googleError, setGoogleError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    try {
      setGoogleError("");
      setLoading(true);
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      await loginWithGoogle();
      if (!isMobile) navigate("/dashboard");
    } catch (err) {
      setLoading(false);
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return;
      setGoogleError("Google sign-in failed. Please try again.");
    }
  }

  return (
    <div style={S.page}>

      {/* TOP — Logo + heading */}
      <div style={S.top}>
        <div style={S.logoWrap}>
          <img src="/icon-512.png" alt="ConnektIn" style={S.logoImg} />
          <span style={S.logoText}>Connekt<span style={S.logoIn}>In</span></span>
        </div>
        <h1 style={S.heading}>Welcome back 👋</h1>
        <p style={S.sub}>Sign in to continue to your community</p>
      </div>

      {/* CARD */}
      <div style={S.card}>
        {googleError && (
          <div style={S.errorBox}>⚠️ {googleError}</div>
        )}

        {/* Google */}
        <button
          style={{ ...S.methodBtn, opacity: loading ? 0.7 : 1 }}
          onClick={handleGoogle}
          disabled={loading}
        >
          <div style={S.googleIconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div style={S.methodText}>
            <span style={S.methodTitle}>{loading ? "Signing in…" : "Continue with Google"}</span>
            <span style={S.methodSub}>Use your existing Google account</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Divider */}
        <div style={S.divider}>
          <div style={S.dividerLine} />
          <span style={S.dividerText}>or</span>
          <div style={S.dividerLine} />
        </div>

        {/* Email */}
        <button style={S.methodBtn} onClick={() => navigate("/login/email")}>
          <div style={S.emailIconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div style={S.methodText}>
            <span style={S.methodTitle}>Continue with Email</span>
            <span style={S.methodSub}>Sign in with email and password</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <p style={S.footer}>
          Don't have an account?{" "}
          <Link to="/signup" style={S.link}>Create one</Link>
        </p>
      </div>

      {/* BOTTOM — back to splash */}
      <p style={S.backLink} onClick={() => navigate("/")}>
        ← Back to home
      </p>

    </div>
  );
}

const S = {
  page:          { minHeight: "100dvh", background: "#0A1628", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", fontFamily: "'DM Sans', sans-serif", gap: 24 },
  top:           { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%", maxWidth: 400 },
  logoWrap:      { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
  logoImgWrap:   { width: 44, height: 44, objectFit: "contain",borderRadius: 16, overflow: "hidden", boxShadow: "0 0 0 3px rgba(13,148,136,0.25)" },
  logoImg:       { width: 44, height: 44, objectFit: "contain", borderRadius: 16 },
  logoText:      { fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" },
  logoIn:        { color: "#0D9488" },
  heading:       { fontSize: 24, fontWeight: 800, color: "#fff", margin: 0, textAlign: "center", letterSpacing: "-0.3px" },
  sub:           { fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0, textAlign: "center" },
  card:          { width: "100%", maxWidth: 400, background: "#0F1E33", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "24px 20px" },
  errorBox:      { background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#F87171", marginBottom: 14, lineHeight: 1.5 },
  methodBtn:     { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, cursor: "pointer", marginBottom: 10, fontFamily: "'DM Sans', sans-serif", textAlign: "left", transition: "background 0.15s" },
  googleIconWrap:{ width: 40, height: 40, borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  emailIconWrap: { width: 40, height: 40, borderRadius: 10, background: "rgba(13,148,136,0.15)", border: "1px solid rgba(13,148,136,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  methodText:    { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  methodTitle:   { fontSize: 14, fontWeight: 700, color: "#fff" },
  methodSub:     { fontSize: 11, color: "rgba(255,255,255,0.35)" },
  divider:       { display: "flex", alignItems: "center", gap: 10, margin: "4px 0 14px" },
  dividerLine:   { flex: 1, height: 1, background: "rgba(255,255,255,0.08)" },
  dividerText:   { fontSize: 12, color: "rgba(255,255,255,0.25)", fontWeight: 500 },
  footer:        { textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.35)", margin: "16px 0 0" },
  link:          { color: "#0D9488", fontWeight: 600, textDecoration: "none", marginLeft: 4 },
  backLink:      { fontSize: 13, color: "rgba(255,255,255,0.25)", cursor: "pointer", marginTop: 8 },
};
