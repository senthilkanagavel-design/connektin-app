// src/pages/RoleSelect.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db, storage } from "../firebase/config";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const T = {
  navy:   "#0A1628",
  teal:   "#0D9488",
  blue:   "#185FA5",
  purple: "#534AB7",
  bg:     "#F3F2EF",
  white:  "#FFFFFF",
  border: "#E4E2DC",
  text:   "#1A1A1A",
  muted:  "#6B7280",
  faint:  "#9CA3AF",
  font:   "'DM Sans', sans-serif",
};

const INDUSTRIES = [
  { value: "information_technology", label: "Information Technology" },
  { value: "banking_finance",        label: "Banking & Finance" },
  { value: "healthcare",             label: "Healthcare" },
  { value: "education",              label: "Education" },
  { value: "manufacturing",          label: "Manufacturing" },
  { value: "media_entertainment",    label: "Media & Entertainment" },
  { value: "real_estate",            label: "Real Estate" },
  { value: "hospitality_travel",     label: "Hospitality & Travel" },
  { value: "medical_billing",        label: "Medical Billing" },
  { value: "medical_coding",         label: "Medical Coding" },
  { value: "other",                  label: "Other" },
];

const SIZES = ["1–10", "10–50", "50–200", "200–500", "500+"];

function CheckIcon({ color = T.teal }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", color: T.teal, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 20, padding: 0, fontFamily: T.font }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Back
    </button>
  );
}

// ── Recruiter pricing step (existing) ────────────────────────────────────────
function RecruiterStep({ onBack, onConfirm, loading }) {
  return (
    <>
      <BackBtn onClick={onBack} />
      <div style={{ width: 40, height: 40, background: "#F5F3FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4, fontFamily: T.font }}>Here's how recruiting works</div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 18, fontFamily: T.font }}>Simple and transparent. No subscription needed.</div>

      <div style={{ background: "#F5F3FF", border: "1.5px solid #C4B5FD", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7C3AED", marginBottom: 12, fontFamily: T.font }}>Recruiter plan</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #E9E7F5" }}>
          <span style={{ fontSize: 13, color: "#555", fontFamily: T.font }}>First 3 job posts</span>
          <span style={{ background: "#E8F5EE", color: "#057642", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, fontFamily: T.font }}>FREE</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
          <span style={{ fontSize: 13, color: "#555", fontFamily: T.font }}>Each post after that</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.font }}>₹9 / post</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
        {["Post jobs directly to candidates in your industry", "Manage active and closed listings from the Jobs tab", "Reach learners actively building their skills", "Close or reactivate your postings anytime"].map(b => (
          <div key={b} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "#444", fontFamily: T.font }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
            {b}
          </div>
        ))}
      </div>

      <button onClick={onConfirm} disabled={loading} style={{ width: "100%", padding: 13, background: loading ? "#94A3B8" : T.teal, color: T.white, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: T.font }}>
        {loading ? "Setting up your account…" : "Got it — take me in"}
      </button>
    </>
  );
}

// ── Company details step ──────────────────────────────────────────────────────
function CompanyStep({ onBack, onSubmit, loading }) {
  const [form, setForm]         = useState({ name: "", tagline: "", industry: "", location: "", size: "10–50", founded: "", website: "", about: "" });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [error, setError]       = useState("");

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Logo must be under 2MB."); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleSubmit() {
    if (!form.name.trim())     { setError("Company name is required."); return; }
    if (!form.industry)        { setError("Please select an industry."); return; }
    if (!form.location.trim()) { setError("Location is required."); return; }
    setError("");
    onSubmit(form, logoFile);
  }

  const inp = { width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: "none", background: T.white, color: T.text, boxSizing: "border-box" };
  const lbl = { fontSize: 11, fontWeight: 700, color: T.text, display: "block", marginBottom: 4, marginTop: 12, fontFamily: T.font };

  return (
    <>
      <BackBtn onClick={onBack} />
      <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4, fontFamily: T.font }}>Tell us about your company</div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 16, fontFamily: T.font }}>This will appear on your public company profile.</div>

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 12, fontFamily: T.font }}>
          {error}
        </div>
      )}

      {/* Logo upload */}
      <div onClick={() => document.getElementById("co-logo-upload").click()} style={{ border: `1.5px dashed ${T.teal}`, borderRadius: 10, padding: 14, textAlign: "center", background: "#F0FDFB", cursor: "pointer", marginBottom: 4, display: "flex", alignItems: "center", gap: 12 }}>
        {logoPreview
          ? <img src={logoPreview} alt="logo" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "contain", flexShrink: 0 }} />
          : <div style={{ width: 48, height: 48, borderRadius: 8, background: T.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>🏢</div>
        }
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.teal, fontFamily: T.font }}>{logoPreview ? "Logo selected ✓" : "Upload company logo"}</div>
          <div style={{ fontSize: 11, color: T.faint, fontFamily: T.font }}>PNG, JPG · Max 2MB · optional</div>
        </div>
        <input id="co-logo-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogo} />
      </div>

      <label style={lbl}>Company name *</label>
      <input style={inp} placeholder="e.g. YellowBot" value={form.name} onChange={e => set("name", e.target.value)} />

      <label style={lbl}>Tagline</label>
      <input style={inp} placeholder="e.g. Create the Unimagine" value={form.tagline} onChange={e => set("tagline", e.target.value)} />

      <label style={lbl}>Industry *</label>
      <select style={{ ...inp, appearance: "none" }} value={form.industry} onChange={e => set("industry", e.target.value)}>
        <option value="">Select industry</option>
        {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
      </select>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <div>
          <label style={{ ...lbl, marginTop: 0 }}>Location *</label>
          <input style={inp} placeholder="City" value={form.location} onChange={e => set("location", e.target.value)} />
        </div>
        <div>
          <label style={{ ...lbl, marginTop: 0 }}>Team size</label>
          <select style={{ ...inp, appearance: "none" }} value={form.size} onChange={e => set("size", e.target.value)}>
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <div>
          <label style={{ ...lbl, marginTop: 0 }}>Founded year</label>
          <input style={inp} placeholder="e.g. 2020" value={form.founded} onChange={e => set("founded", e.target.value)} />
        </div>
        <div>
          <label style={{ ...lbl, marginTop: 0 }}>Website</label>
          <input style={inp} placeholder="https://..." value={form.website} onChange={e => set("website", e.target.value)} />
        </div>
      </div>

      <label style={lbl}>About the company</label>
      <textarea
        style={{ ...inp, minHeight: 72, resize: "vertical" }}
        placeholder="What does your company do?"
        value={form.about}
        onChange={e => set("about", e.target.value)}
      />

      <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: 13, background: loading ? "#94A3B8" : T.purple, color: T.white, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: T.font, marginTop: 16 }}>
        {loading ? "Submitting…" : "Submit for approval"}
      </button>
    </>
  );
}

// ── Pending approval screen ───────────────────────────────────────────────────
function PendingStep({ companyName }) {
  const navigate = useNavigate();
  return (
    <>
      <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#E6FAF8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 6, fontFamily: T.font }}>Application submitted!</div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 20, fontFamily: T.font }}>
          <strong>{companyName}</strong> is under review. We'll notify you once approved — usually within 24 hours.
        </div>
      </div>

      {[
        { bg: "#E6FAF8", color: T.teal, icon: "✉", title: "Check your email", sub: "We'll send an approval confirmation when ready" },
        { bg: "#EEEDFE", color: T.purple, icon: "💼", title: "Once approved you can", sub: "Post jobs, internships and review applicants" },
        { bg: "#FEF3C7", color: "#854F0B", icon: "⏱", title: "Review time", sub: "Usually within 24 hours on working days" },
      ].map(item => (
        <div key={item.title} style={{ background: T.white, borderRadius: 10, border: `1px solid ${T.border}`, padding: 12, marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{item.icon}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>{item.title}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 1, fontFamily: T.font }}>{item.sub}</div>
          </div>
        </div>
      ))}

      <button onClick={() => navigate("/dashboard")} style={{ width: "100%", padding: 13, background: T.navy, color: T.white, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: T.font, marginTop: 6 }}>
        Back to home
      </button>
    </>
  );
}

// ── Main RoleSelect ───────────────────────────────────────────────────────────
export default function RoleSelect() {
  const navigate    = useNavigate();
  const { user, patchProfile } = useAuth();

  const [selected, setSelected] = useState(null);  // "seeker" | "recruiter" | "company"
  const [step, setStep]         = useState(1);       // 1=choose, 2=recruiter info / company form, 3=pending
  const [loading, setLoading]   = useState(false);
  const [companyName, setCompanyName] = useState("");

  const ROLES = [
    {
      id: "seeker",
      title: "I'm here to learn, find jobs & internships",
      desc: "Access articles, grow your skills and discover opportunities.",
      bullets: ["Browse jobs and internships across all industries", "Read beginner to advanced articles", "Earn ConnektIn certificates · Free trial"],
      accent: T.teal,
      iconBg: "#E6FAF8",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
      ),
    },
    {
      id: "recruiter",
      title: "I'm here to hire talent",
      desc: "Post job openings and connect with motivated candidates.",
      bullets: ["Post jobs across all industries", "3 free job posts to start · ₹9/post after", "Review applicants and shortlist"],
      accent: T.blue,
      iconBg: "#E6F1FB",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      id: "company",
      title: "I represent a company",
      desc: "Build a company profile, post opportunities and manage applicants.",
      bullets: ["Dedicated company profile page", "Post jobs and internships", "Review applicants with skill match score"],
      accent: T.purple,
      iconBg: "#EEEDFE",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 22V9l9-7 9 7v13"/>
          <path d="M9 22V12h6v10"/>
        </svg>
      ),
    },
  ];

  // ── Handlers ──
  async function handleContinue() {
    if (!selected) return;
    if (selected === "recruiter" && step === 1) { setStep(2); return; }
    if (selected === "company"   && step === 1) { setStep(2); return; }

    if (selected === "seeker") {
      setLoading(true);
      try {
        const data = { userType: "seeker" };
        await updateDoc(doc(db, "users", user.uid), data);
        patchProfile(data);
        navigate("/plan-select");
      } catch (err) { console.error(err); setLoading(false); }
    }

    if (selected === "recruiter") {
      setLoading(true);
      try {
        const data = { userType: "recruiter", plan: "recruiter", jobPostCount: 0, subscriptionStatus: "active" };
        await updateDoc(doc(db, "users", user.uid), data);
        patchProfile(data);
        navigate("/dashboard");
      } catch (err) { console.error(err); setLoading(false); }
    }
  }

  async function handleCompanySubmit(form, logoFile) {
    setLoading(true);
    try {
      let logoURL = "";
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const storageRef = ref(storage, `companies/${user.uid}_${Date.now()}.${ext}`);
        await uploadBytes(storageRef, logoFile);
        logoURL = await getDownloadURL(storageRef);
      }
      const companyRef = await addDoc(collection(db, "companies"), {
        name:      form.name.trim(),
        tagline:   form.tagline.trim(),
        industry:  form.industry,
        location:  form.location.trim(),
        size:      form.size,
        founded:   form.founded.trim(),
        website:   form.website.trim(),
        about:     form.about.trim(),
        logoURL,
        status:    "pending",
        createdBy: user.uid,
        followers: [],
        createdAt: serverTimestamp(),
      });
      const data = { userType: "company", companyId: companyRef.id, plan: "company", subscriptionStatus: "pending" };
      await updateDoc(doc(db, "users", user.uid), data);
      patchProfile(data);
      setCompanyName(form.name.trim());
      setStep(3);
    } catch (err) {
      console.error("Company submit error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Styles ──
  const wrap = {
    minHeight: "100vh", background: T.bg,
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: 16,
    fontFamily: T.font,
  };
  const card = {
    background: T.white, borderRadius: 16, padding: "24px 20px",
    maxWidth: 480, width: "100%",
    boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
    border: `0.5px solid ${T.border}`,
  };

  // ── Step 3 — pending ──
  if (step === 3) {
    return <div style={wrap}><div style={card}><PendingStep companyName={companyName} /></div></div>;
  }

  // ── Step 2 — recruiter pricing ──
  if (step === 2 && selected === "recruiter") {
    return (
      <div style={wrap}>
        <div style={card}>
          <RecruiterStep
            onBack={() => { setStep(1); }}
            onConfirm={handleContinue}
            loading={loading}
          />
        </div>
      </div>
    );
  }

  // ── Step 2 — company form ──
  if (step === 2 && selected === "company") {
    return (
      <div style={wrap}>
        <div style={{ ...card, maxHeight: "90vh", overflowY: "auto" }}>
          <CompanyStep
            onBack={() => setStep(1)}
            onSubmit={handleCompanySubmit}
            loading={loading}
          />
        </div>
      </div>
    );
  }

  // ── Step 1 — role choice ──
  return (
    <div style={wrap}>
      <div style={card}>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <img src="/icon-512.png" alt="ConnektIn" style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: T.teal, fontFamily: T.font }}>ConnektIn</span>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 4, fontFamily: T.font }}>What brings you here?</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 18, fontFamily: T.font }}>We'll personalise your experience based on your goal.</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {ROLES.map(role => {
            const isSelected = selected === role.id;
            return (
              <div
                key={role.id}
                onClick={() => setSelected(role.id)}
                style={{
                  border: isSelected ? `2px solid ${role.accent}` : `1.5px solid ${T.border}`,
                  borderRadius: 12, padding: "13px 14px",
                  cursor: "pointer",
                  background: isSelected ? role.iconBg : T.white,
                  transition: "all 0.15s",
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 9, background: isSelected ? role.iconBg : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: isSelected ? role.accent : "#64748B" }}>
                  {role.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 3, fontFamily: T.font }}>{role.title}</div>
                  <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: isSelected ? 8 : 0, fontFamily: T.font }}>{role.desc}</div>
                  {isSelected && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {role.bullets.map(b => (
                        <div key={b} style={{ fontSize: 11, color: T.muted, display: "flex", gap: 6, alignItems: "flex-start", fontFamily: T.font }}>
                          <span style={{ color: role.accent, fontSize: 13, lineHeight: 1, flexShrink: 0 }}>·</span> {b}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isSelected && <CheckIcon color={role.accent} />}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selected || loading}
          style={{
            width: "100%", padding: 13,
            background: !selected ? "#CBD5E1" : selected === "seeker" ? T.teal : selected === "recruiter" ? T.blue : T.purple,
            color: T.white, border: "none", borderRadius: 12,
            fontSize: 14, fontWeight: 700,
            cursor: !selected ? "not-allowed" : "pointer",
            fontFamily: T.font,
            transition: "background 0.2s",
          }}
        >
          {loading ? "Saving…" : !selected ? "Continue" : selected === "seeker" ? "Continue" : selected === "recruiter" ? "Continue" : "Set up company profile"}
        </button>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ width: n === 2 ? 20 : 6, height: 6, borderRadius: 3, background: n === 2 ? T.teal : T.border, transition: "all 0.2s" }} />
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: T.faint, marginTop: 6, fontFamily: T.font }}>Step 2 of 3</div>
      </div>
    </div>
  );
}
