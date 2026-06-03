// src/pages/RoleSelect.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { doc, updateDoc } from "firebase/firestore";

export default function RoleSelect() {
  const navigate = useNavigate();
  const { user, patchProfile } = useAuth();
  const [selected, setSelected] = useState(null);
  const [step, setStep]         = useState(1);
  const [loading, setLoading]   = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    if (selected === "recruiter" && step === 1) { setStep(2); return; }
    setLoading(true);
    try {
      if (user?.uid) {
        const isRecruiter = selected === "recruiter";
        const updateData = isRecruiter
          ? { userType: "recruiter", plan: "recruiter", jobPostCount: 0, subscriptionStatus: "active" }
          : { userType: "seeker" };
        await updateDoc(doc(db, "users", user.uid), updateData);
        patchProfile(updateData);
      }
      navigate(selected === "seeker" ? "/plan-select" : "/dashboard");
    } catch (err) {
      console.error("RoleSelect error:", err);
      setLoading(false);
    }
  };

  const wrap = {
    minHeight: "100vh", background: "#F3F2EF",
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "16px",
    fontFamily: "'DM Sans', sans-serif",
  };

  const card = {
    background: "#fff", borderRadius: 16, padding: "24px 20px",
    maxWidth: 480, width: "100%",
    boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
    border: "0.5px solid #E4E2DC",
  };

  // Step 2 — recruiter pricing info
  if (step === 2) {
    return (
      <div style={wrap}>
        <div style={card}>
          <button onClick={() => { setStep(1); setSelected(null); }} style={{ background: "none", border: "none", color: "#0D9488", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 20, padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>

          <div style={{ width: 40, height: 40, background: "#F5F3FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>Here's how recruiting works</div>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 18 }}>Simple and transparent. No subscription needed.</div>

          <div style={{ background: "#F5F3FF", border: "1.5px solid #C4B5FD", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7C3AED", marginBottom: 12 }}>Recruiter plan</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #E9E7F5" }}>
              <span style={{ fontSize: 13, color: "#555" }}>First 3 job posts</span>
              <span style={{ background: "#E8F5EE", color: "#057642", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>FREE</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
              <span style={{ fontSize: 13, color: "#555" }}>Each post after that</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>₹9 / post</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
            {["Post jobs directly to candidates in your industry","Manage active and closed listings from the Jobs tab","Reach learners actively building their skills","Close or reactivate your postings anytime"].map(b => (
              <div key={b} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "#444" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                {b}
              </div>
            ))}
          </div>

          <button onClick={handleContinue} disabled={loading} style={{ width: "100%", padding: "13px", background: loading ? "#94A3B8" : "#0D9488", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            {loading ? "Setting up your account…" : "Got it — take me in"}
          </button>
        </div>
      </div>
    );
  }

  // Step 1 — role choice, compact no-scroll
  return (
    <div style={wrap}>
      <div style={card}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <img src="/icon-512.png" alt="ConnektIn" style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#0D9488" }}>ConnektIn</span>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>What brings you here?</div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 18 }}>We'll personalise your experience based on your goal.</div>

        {/* Role cards — compact */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {[
            {
              id: "seeker",
              title: "I'm here to learn & find jobs",
              desc: "Access industry articles, grow your skills, and discover job opportunities.",
              bullets: ["Read beginner to advanced articles", "Browse jobs in your industry", "Build your professional profile"],
            },
            {
              id: "recruiter",
              title: "I'm here to hire talent",
              desc: "Post job openings and connect with motivated candidates.",
              bullets: ["3 free job posts to get started", "Reach candidates in your industry", "₹9/post simple pricing after that"],
            },
          ].map(role => (
            <div
              key={role.id}
              onClick={() => setSelected(role.id)}
              style={{
                border: selected === role.id ? "2px solid #0D9488" : "1.5px solid #E4E2DC",
                borderRadius: 12, padding: "14px 14px",
                cursor: "pointer",
                background: selected === role.id ? "#F0FDFB" : "#fff",
                transition: "all 0.15s",
                display: "flex", gap: 12, alignItems: "flex-start",
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 9, background: selected === role.id ? "#CCFBF1" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {role.id === "seeker"
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={selected === role.id ? "#0D9488" : "#64748B"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={selected === role.id ? "#0D9488" : "#64748B"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", marginBottom: 3 }}>{role.title}</div>
                <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5, marginBottom: 8 }}>{role.desc}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {role.bullets.map(b => (
                    <div key={b} style={{ fontSize: 11, color: "#666", display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ color: "#0D9488", fontSize: 13, lineHeight: 1 }}>·</span> {b}
                    </div>
                  ))}
                </div>
              </div>
              {selected === role.id && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selected || loading}
          style={{ width: "100%", padding: "13px", background: selected && !loading ? "#0D9488" : "#CBD5E1", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: selected && !loading ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif" }}
        >
          {loading ? "Saving…" : "Continue"}
        </button>

        {/* Step indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
          {[1,2,3].map(n => (
            <div key={n} style={{ width: n === 2 ? 20 : 6, height: 6, borderRadius: 3, background: n === 2 ? "#0D9488" : "#E4E2DC", transition: "all 0.2s" }}/>
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: "#999", marginTop: 6 }}>Step 2 of 3</div>
      </div>
    </div>
  );
}
