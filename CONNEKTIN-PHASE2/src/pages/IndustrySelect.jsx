// src/pages/IndustrySelect.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { INDUSTRIES as industries } from "../constants/industries";

export default function IndustrySelect() {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const toggle = (id) => {
    setError("");
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  async function handleContinue() {
    if (selected.length === 0) { setError("Please select at least one industry to continue."); return; }
    setSaving(true); setError("");
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        industry: selected[0],        // primary — backward compat
        industries: selected,          // new multi array
        onboardingComplete: true,
        createdAt: serverTimestamp(),
      }, { merge: true });
      await fetchProfile(user.uid);
      navigate("/role-select");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.inner}>

        {/* Navy header */}
        <div style={S.header}>
          <img src="/icon-512.png" alt="ConnektIn" style={S.logoImg} />
          <span style={S.step}>STEP 1 OF 3</span>
          <h1 style={S.title}>Your industries</h1>
          <p style={S.subtitle}>Pick one or more — personalises your feed, articles and jobs</p>
          <div style={S.progressWrap}>
            <div style={S.progressFill} />
          </div>
        </div>

        {/* White card */}
        <div style={S.cardWrap}>
          <div style={S.card}>

            {/* Selected count */}
            {selected.length > 0 && (
              <div style={S.selectedBar}>
                <span style={S.selectedCount}>{selected.length} selected</span>
                <button style={S.clearBtn} onClick={() => setSelected([])}>Clear all</button>
              </div>
            )}

            {/* 3-col grid */}
            <div style={S.grid}>
              {industries.map(ind => {
                const isSel = selected.includes(ind.id);
                return (
                  <button
                    key={ind.id}
                    onClick={() => toggle(ind.id)}
                    style={{
                      ...S.chip,
                      background:  isSel ? "#E6FAF8" : "#F9FAFB",
                      borderColor: isSel ? "#0D9488" : "#E4E2DC",
                    }}
                  >
                    <span style={S.chipEmoji}>{ind.emoji}</span>
                    <span style={{ ...S.chipLabel, color: isSel ? "#0F6E56" : "#0A1628" }}>
                      {ind.label}
                    </span>
                    {isSel && <span style={S.chipTick}>✓</span>}
                  </button>
                );
              })}
            </div>

            {error && <p style={S.error}>⚠ {error}</p>}

            <button
              onClick={handleContinue}
              disabled={saving || selected.length === 0}
              style={{
                ...S.cta,
                background: selected.length > 0 ? "#0A1628" : "#E4E2DC",
                color:      selected.length > 0 ? "#fff"    : "#9CA3AF",
                cursor:     selected.length > 0 ? "pointer" : "not-allowed",
              }}
            >
              {saving ? "Saving..." : `Continue → ${selected.length > 0 ? `(${selected.length} selected)` : ""}`}
            </button>

            <p style={S.hint}>You can update your industries anytime from Settings</p>
          </div>
        </div>

      </div>
    </div>
  );
}

const S = {
  page:         { minHeight: "100vh", background: "#F3F2EF", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'DM Sans', sans-serif" },
  inner:        { width: "100%", maxWidth: 480, display: "flex", flexDirection: "column" },
  header:       { background: "#0A1628", padding: "20px 24px 32px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", boxSizing: "border-box" },
  logoImg:      { width: 36, height: 36, objectFit: "contain", borderRadius: 8, marginBottom: 8 },
  step:         { fontSize: 10, fontWeight: 700, color: "#0D9488", letterSpacing: "0.1em", marginBottom: 6 },
  title:        { fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 4px", textAlign: "center" },
  subtitle:     { fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0, textAlign: "center", lineHeight: 1.4 },
  progressWrap: { width: "100%", height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginTop: 14 },
  progressFill: { width: "33%", height: "100%", background: "#0D9488", borderRadius: 2 },
  cardWrap:     { padding: "0 14px 24px", marginTop: -16, width: "100%", boxSizing: "border-box" },
  card:         { background: "#fff", borderRadius: 14, padding: "16px 12px", border: "0.5px solid #E4E2DC", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" },
  selectedBar:  { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "6px 4px" },
  selectedCount:{ fontSize: 12, fontWeight: 700, color: "#0D9488" },
  clearBtn:     { background: "none", border: "none", fontSize: 12, color: "#9CA3AF", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  grid:         { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 7, marginBottom: 14 },
  chip:         { display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 6px", borderRadius: 10, border: "1.5px solid", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", position: "relative", gap: 3 },
  chipEmoji:    { fontSize: 18, lineHeight: 1 },
  chipLabel:    { fontSize: 10, fontWeight: 600, textAlign: "center", lineHeight: 1.3 },
  chipTick:     { position: "absolute", top: 4, right: 6, fontSize: 9, color: "#0D9488", fontWeight: 700 },
  error:        { fontSize: 12, color: "#DC2626", textAlign: "center", marginBottom: 10 },
  cta:          { width: "100%", padding: "12px", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", marginBottom: 8, transition: "all 0.2s" },
  hint:         { fontSize: 11, color: "#9CA3AF", textAlign: "center", margin: 0, lineHeight: 1.5 },
};
