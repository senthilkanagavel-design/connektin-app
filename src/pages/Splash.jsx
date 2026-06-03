import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePWAInstall } from "../hooks/usePWAInstall";

const backgrounds = ["/bg1.jpg", "/bg2.jpg", "/bg3.jpg", "/bg4.jpg", "/bg5.jpg", "/bg6.jpg"];

backgrounds.forEach((src) => {
  const img = new Image();
  img.src = src;
});

const features = [
  {
    color: "#60A5FA",
    label: "Articles",
    svg: (c) => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    color: "#FBBF24",
    label: "Jobs",
    svg: (c) => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
    ),
  },
  {
    color: "#F472B6",
    label: "Community",
    svg: (c) => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    color: "#A78BFA",
    label: "Fun",
    svg: (c) => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="10 8 16 12 10 16 10 8"/>
      </svg>
    ),
  },
];

export default function Splash() {
  const navigate = useNavigate();
  const { triggerInstall, isIOS, canInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setBgIndex((prev) => (prev + 1) % backgrounds.length);
        setFadeIn(true);
      }, 400);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const handleGetStarted = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else if (canInstall) {
      await triggerInstall();
      navigate("/onboarding");
    } else {
      navigate("/onboarding");
    }
  };

  return (
    <div style={{
      height: "100dvh",
      maxHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px 24px 20px",
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'DM Sans', sans-serif",
      boxSizing: "border-box",
    }}>

      {/* Background image */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `url('${backgrounds[bgIndex]}')`,
        backgroundSize: "cover", backgroundPosition: "center",
        opacity: fadeIn ? 0.55 : 0,
        transition: "opacity 0.4s ease",
        backgroundColor: "#0A1628",
      }} />

      {/* Dark overlay */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "linear-gradient(180deg, rgba(10,22,40,0.3) 0%, rgba(10,22,40,0.5) 50%, rgba(10,22,40,0.92) 100%)",
      }} />

      {/* TOP — Logo */}
      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        flexShrink: 0,
      }}>
        <img src="/icon-512.png" alt="ConnektIn" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 13 }} />
        <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
          Connekt<span style={{ color: "#0D9488" }}>In</span>
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Your Professional Community
        </div>
      </div>

      {/* MIDDLE — Headline + pills — flex-grow so it fills available space and centres content */}
      <div style={{
        position: "relative", zIndex: 2,
        flex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 10,
        minHeight: 0, // critical: allows shrink below content size
      }}>
        <h1 style={{
          fontSize: 28, fontWeight: 800, color: "#fff",
          lineHeight: 1.2, letterSpacing: "-0.5px",
          margin: 0, maxWidth: 300,
          textShadow: "0 2px 16px rgba(0,0,0,0.6)",
        }}>
          Your Next Big Break<br />
          <span style={{ color: "#0D9488" }}>Starts Here</span>
        </h1>
        <p style={{
          fontSize: 13, color: "rgba(255,255,255,0.58)",
          lineHeight: 1.5, margin: 0, maxWidth: 270,
          textShadow: "0 1px 6px rgba(0,0,0,0.5)",
        }}>
          Learn, grow and connect with professionals in your industry.
        </p>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", justifyContent: "center" }}>
          {features.map(f => (
            <div key={f.label} style={{
              background: "rgba(13,148,136,0.18)",
              border: "1px solid rgba(13,148,136,0.35)",
              borderRadius: 20, padding: "5px 9px",
              fontSize: 11, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 5,
              whiteSpace: "nowrap",
            }}>
              {f.svg(f.color)}
              <span style={{ color: "#5DCAA5" }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM — Dots + CTA */}
      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 10,
        width: "100%",
        flexShrink: 0,
      }}>

        {/* Slide dots */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {backgrounds.map((_, i) => (
            <div key={i} style={{
              width: i === bgIndex ? 20 : 6, height: 4, borderRadius: 2,
              background: i === bgIndex ? "#0D9488" : "rgba(255,255,255,0.2)",
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>

        <button
          onClick={handleGetStarted}
          style={{
            width: "100%", maxWidth: 340,
            background: "#0D9488", color: "#fff",
            border: "none", borderRadius: 14,
            padding: "14px 0", fontSize: 16,
            fontWeight: 700, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.01em",
            boxShadow: "0 6px 28px rgba(13,148,136,0.4)",
          }}
        >
          Get Started — It's Free
        </button>

        <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 13, margin: 0, cursor: "pointer" }}
          onClick={() => navigate("/login")}>
          Already have an account?{" "}
          <span style={{ color: "#0D9488", fontWeight: 600 }}>Sign in</span>
        </p>
      </div>

      {/* iOS Install Guide */}
      {showIOSGuide && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          zIndex: 999,
        }}>
          <div style={{
            background: "#0d1f38", borderRadius: "20px 20px 0 0",
            padding: "32px 24px 40px", width: "100%", maxWidth: 480,
            color: "#fff", border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#fff" }}>Add to Home Screen</h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
              Follow these steps to install ConnektIn on your iPhone or iPad.
            </p>
            <ol style={{ textAlign: "left", lineHeight: 2.2, color: "rgba(255,255,255,0.7)", paddingLeft: 20, marginBottom: 28, fontSize: 15 }}>
              <li>Tap the <strong style={{ color: "#fff" }}>Share</strong> button at the bottom of Safari</li>
              <li>Scroll down and tap <strong style={{ color: "#fff" }}>Add to Home Screen</strong></li>
              <li>Tap <strong style={{ color: "#fff" }}>Add</strong> — you're all set</li>
            </ol>
            <button
              style={{ width: "100%", background: "#0D9488", color: "#fff", border: "none", borderRadius: 13, padding: 15, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
              onClick={() => { setShowIOSGuide(false); navigate("/onboarding"); }}
            >
              Got it, Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
