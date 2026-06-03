// src/pages/PostJob.jsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../firebase/config";
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import CommunityGuidelinesBar from "../components/CommunityGuidelinesBar";

const JOB_TYPES = [
  { value: "full_time",  label: "Full-time" },
  { value: "part_time",  label: "Part-time" },
  { value: "contract",   label: "Contract" },
  { value: "remote",     label: "Remote" },
  { value: "internship", label: "Internship" },
];

export default function PostJob() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();

  const isTrialUser  = profile?.plan === "trial" && profile?.userType !== "recruiter";
  const postCount    = profile?.jobPostCount || 0;
  // FIX: recruiter needs payment after 3 free posts
  const needsPayment = profile?.userType === "recruiter" && postCount >= 3 && searchParams.get("paid") !== "true";

  const industry = profile?.industry || "";
  const industryLabel = industry.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Your Industry";

  const [form, setForm] = useState({ title: "", company: "", location: "", type: "full_time", description: "", requirements: "", salaryRange: "", applyLink: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) { setForm(prev => ({ ...prev, [e.target.name]: e.target.value })); }

  async function handleSubmit() {
    setError("");
    if (!form.title.trim())       return setError("Job title is required.");
    if (!form.company.trim())     return setError("Company name is required.");
    if (!form.location.trim())    return setError("Location is required.");
    if (!form.description.trim()) return setError("Job description is required.");
    setSubmitting(true);
    try {
      await addDoc(collection(db, "jobs"), {
        title: form.title.trim(), company: form.company.trim(),
        location: form.location.trim(), type: form.type, industry,
        description: form.description.trim(), requirements: form.requirements.trim(),
        salaryRange: form.salaryRange.trim(), applyLink: form.applyLink.trim(),
        hrUid: user.uid, hrName: profile?.displayName || user.email,
        hrPhotoURL: profile?.photoURL || "", hrAvatarId: profile?.avatarId || "",
        status: "active", createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", user.uid), { jobPostCount: increment(1) });
      navigate('/dashboard', { state: { tab: 'jobs' } });
    } catch (err) { setError("Failed to post job. Please try again."); }
    setSubmitting(false);
  }

  /* ── TRIAL GATE ── */
  if (isTrialUser) {
    return (
      <div style={s.page}>
        <Header onBack={() => navigate('/dashboard', { state: { tab: 'jobs' } })} />
        <div style={s.gateWrap}>
          <div style={s.gateCard}>
            <div style={s.gateIconWrap}>
              <span style={{ fontSize: 32 }}>🔒</span>
            </div>
            <h2 style={s.gateTitle}>Upgrade to post jobs</h2>
            <p style={s.gateText}>Job posting is available on paid plans. Upgrade to start hiring from the ConnektIn community.</p>
            <button style={s.primaryBtn} onClick={() => navigate("/subscribe")}>View Plans →</button>
            <button style={s.ghostBtn} onClick={() => navigate('/dashboard', { state: { tab: 'jobs' } })}>Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── UPI PAYMENT GATE ── */
  if (needsPayment) {
    return (
      <div style={s.page}>
        <Header onBack={() => navigate('/dashboard', { state: { tab: 'jobs' } })} />
        <div style={s.gateWrap}>
          <div style={s.gateCard}>
            <div style={s.gateIconWrap}>
              <span style={{ fontSize: 32 }}>💼</span>
            </div>
            <h2 style={s.gateTitle}>You've used your 3 free posts</h2>
            <p style={s.gateText}>Each additional job posting costs <strong style={{ color: "#0D9488" }}>₹9</strong>. Pay via UPI and continue.</p>

            <div style={s.upiCard}>
              <p style={s.upiLabel}>Pay ₹9 to</p>
              <p style={s.upiId}>bharath@upi</p>
              <div style={s.upiDivider} />
              <p style={s.upiNote}>Add your registered email in UPI remarks so we can verify.</p>
            </div>

            <div style={s.stepRow}>
              <div style={s.step}><div style={s.stepNum}>1</div><div style={s.stepText}>Open any UPI app</div></div>
              <div style={s.stepArrow}>→</div>
              <div style={s.step}><div style={s.stepNum}>2</div><div style={s.stepText}>Pay ₹9 to bharath@upi</div></div>
              <div style={s.stepArrow}>→</div>
              <div style={s.step}><div style={s.stepNum}>3</div><div style={s.stepText}>Tap continue below</div></div>
            </div>

            <button style={s.primaryBtn} onClick={() => navigate("/post-job?paid=true")}>I've paid — Continue →</button>
            <CommunityGuidelinesBar compact />
          <button style={s.ghostBtn} onClick={() => navigate('/dashboard', { state: { tab: 'jobs' } })}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── POST JOB FORM ── */
  const freePostsLeft = Math.max(0, 3 - postCount);
  const isPaidPost = postCount >= 3;

  return (
    <div style={s.page}>
      <Header onBack={() => navigate('/dashboard', { state: { tab: 'jobs' } })} />
      <div style={s.formWrap}>

        {/* Status banner */}
        {isPaidPost ? (
          <div style={s.paidBanner}>
            <span style={{ fontSize: 16 }}>✅</span>
            <div>
              <div style={s.paidBannerTitle}>Payment confirmed</div>
              <div style={s.paidBannerSub}>₹9 paid · posting your job now</div>
            </div>
          </div>
        ) : (
          <div style={s.freeBanner}>
            <span style={{ fontSize: 16 }}>🎉</span>
            <div>
              <div style={s.freeBannerTitle}>Free post {postCount + 1} of 3</div>
              <div style={s.freeBannerSub}>{freePostsLeft - 1 > 0 ? `${freePostsLeft - 1} free posts remaining after this` : "Last free post"}</div>
            </div>
          </div>
        )}

        <div style={s.card}>
          {/* Industry pill */}
          <div style={s.industryPill}>
            <span style={s.industryDot} />
            {industryLabel}
          </div>

          <Field label="Job Title *">
            <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Medical Billing Specialist" style={s.input} />
          </Field>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Field label="Company *">
                <input name="company" value={form.company} onChange={handleChange} placeholder="Company name" style={s.input} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Location *">
                <input name="location" value={form.location} onChange={handleChange} placeholder="City / Remote" style={s.input} />
              </Field>
            </div>
          </div>

          <Field label="Job Type *">
            <div style={s.typeRow}>
              {JOB_TYPES.map(t => (
                <button key={t.value} onClick={() => setForm(p => ({ ...p, type: t.value }))}
                  style={{ ...s.typeBtn, background: form.type === t.value ? "#0D9488" : "#fff", color: form.type === t.value ? "#fff" : "#555", borderColor: form.type === t.value ? "#0D9488" : "#E4E2DC" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Job Description *">
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe the role and responsibilities..." rows={5} style={s.textarea} />
          </Field>

          <Field label="Requirements" optional>
            <textarea name="requirements" value={form.requirements} onChange={handleChange} placeholder="e.g. 2+ years in RCM, knowledge of ICD-10..." rows={3} style={s.textarea} />
          </Field>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Field label="Salary Range" optional>
                <input name="salaryRange" value={form.salaryRange} onChange={handleChange} placeholder="e.g. ₹4L–₹6L p.a." style={s.input} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Apply Link" optional>
                <input name="applyLink" value={form.applyLink} onChange={handleChange} placeholder="https://..." style={s.input} />
              </Field>
            </div>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <CommunityGuidelinesBar compact />

          <button onClick={handleSubmit} disabled={submitting} style={{ ...s.primaryBtn, marginTop: 8, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Posting…" : "Post Job →"}
          </button>
          <CommunityGuidelinesBar compact />
          <button style={s.ghostBtn} onClick={() => navigate('/dashboard', { state: { tab: 'jobs' } })}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Header({ onBack }) {
  return (
    <div style={s.header}>
      <button onClick={onBack} style={s.backBtn}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <span style={s.headerTitle}>Post a Job</span>
      <div style={{ width: 36 }} />
    </div>
  );
}

function Field({ label, optional, children }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label} {optional && <span style={s.optional}>(optional)</span>}</label>
      {children}
    </div>
  );
}

const s = {
  page:         { minHeight: "100vh", background: "#F3F2EF", fontFamily: "'DM Sans', sans-serif", paddingBottom: 40 },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#fff", borderBottom: "1px solid #E4E2DC", position: "sticky", top: 0, zIndex: 10 },
  backBtn:      { background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", width: 36, height: 36 },
  headerTitle:  { fontSize: 16, fontWeight: 700, color: "#1A1A1A" },
  gateWrap:     { padding: 16, display: "flex", justifyContent: "center" },
  gateCard:     { background: "#fff", border: "1px solid #E4E2DC", borderRadius: 16, padding: "28px 20px", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12, alignItems: "center", textAlign: "center" },
  gateIconWrap: { width: 64, height: 64, background: "#F3F2EF", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  gateTitle:    { fontSize: 18, fontWeight: 700, color: "#1A1A1A", margin: 0 },
  gateText:     { fontSize: 14, color: "#555", lineHeight: 1.6, margin: 0, maxWidth: 320 },
  upiCard:      { background: "#F0FDFB", border: "1px solid #99F6E4", borderRadius: 12, padding: "16px 20px", width: "100%", textAlign: "center" },
  upiLabel:     { fontSize: 12, color: "#666", margin: "0 0 4px" },
  upiId:        { fontSize: 22, fontWeight: 700, color: "#0D9488", margin: "0 0 12px" },
  upiDivider:   { height: 1, background: "#99F6E4", margin: "0 0 10px" },
  upiNote:      { fontSize: 12, color: "#888", margin: 0, lineHeight: 1.5 },
  stepRow:      { display: "flex", alignItems: "center", gap: 6, width: "100%" },
  step:         { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 },
  stepNum:      { width: 24, height: 24, borderRadius: "50%", background: "#0D9488", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
  stepText:     { fontSize: 11, color: "#555", textAlign: "center", lineHeight: 1.4 },
  stepArrow:    { color: "#9CA3AF", fontSize: 14, flexShrink: 0 },
  primaryBtn:   { width: "100%", padding: 14, background: "#0D9488", color: "#fff", border: "none", borderRadius: 24, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  ghostBtn:     { width: "100%", padding: 12, background: "transparent", color: "#888", border: "none", borderRadius: 24, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  formWrap:     { padding: 16, display: "flex", flexDirection: "column", gap: 12 },
  freeBanner:   { background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 },
  freeBannerTitle: { fontSize: 13, fontWeight: 600, color: "#166534" },
  freeBannerSub:   { fontSize: 11, color: "#16a34a", marginTop: 1 },
  paidBanner:   { background: "#F0FDFB", border: "1px solid #99F6E4", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 },
  paidBannerTitle: { fontSize: 13, fontWeight: 600, color: "#0F6E56" },
  paidBannerSub:   { fontSize: 11, color: "#0D9488", marginTop: 1 },
  card:         { background: "#fff", border: "1px solid #E4E2DC", borderRadius: 14, padding: "16px", display: "flex", flexDirection: "column", gap: 4 },
  industryPill: { display: "inline-flex", alignItems: "center", gap: 5, background: "#F0FDFB", border: "1px solid #99F6E4", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "#0F6E56", alignSelf: "flex-start", marginBottom: 8 },
  industryDot:  { width: 6, height: 6, borderRadius: "50%", background: "#0D9488", flexShrink: 0 },
  field:        { display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 },
  label:        { fontSize: 13, fontWeight: 600, color: "#1A1A1A" },
  optional:     { fontWeight: 400, color: "#999" },
  input:        { padding: "11px 14px", border: "1.5px solid #E4E2DC", borderRadius: 10, fontSize: 14, color: "#1A1A1A", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "#fff" },
  textarea:     { padding: "11px 14px", border: "1.5px solid #E4E2DC", borderRadius: 10, fontSize: 14, color: "#1A1A1A", fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", lineHeight: 1.6 },
  typeRow:      { display: "flex", flexWrap: "wrap", gap: 8 },
  typeBtn:      { padding: "7px 14px", border: "1.5px solid", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  error:        { fontSize: 13, color: "#B91C1C", background: "#FEF2F2", borderRadius: 8, padding: "10px 14px" },
};
