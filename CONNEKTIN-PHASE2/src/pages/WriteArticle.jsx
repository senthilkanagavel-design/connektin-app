// src/pages/WriteArticle.jsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import { getSignalBar } from "../utils/signal";
import CommunityGuidelinesBar from "../components/CommunityGuidelinesBar";

const LEVELS = [
  { value: "beginner",     label: "Beginner",     color: "#0D9488", bg: "#F0FDFB", border: "#99F6E4", desc: "Foundational — no prior experience needed" },
  { value: "intermediate", label: "Intermediate", color: "#0A4FA8", bg: "#EEF4FB", border: "#A8C4E0", desc: "Assumes basic knowledge of the field" },
  { value: "advanced",     label: "Advanced",     color: "#7C3AED", bg: "#F5F3FF", border: "#C4B5FD", desc: "Deep dives, edge cases, expert territory" },
];

const READ_TIMES = ["2 min", "3 min", "5 min", "7 min", "10 min", "15 min"];

const PLAN_BADGE = {
  thermite: { label: "TherMite", bg: "#DBEAFE", color: "#1E40AF" },
  regular:  { label: "Regular",  bg: "#D1FAE5", color: "#065F46" },
  admin:    { label: "Admin",    bg: "#EDE9FE", color: "#5B21B6" },
};

const INDUSTRY_LABELS = {
  medical_billing:        "Medical Billing",
  medical_coding:         "Medical Coding",
  medical_coding_billing: "Medical Coding & Billing",
  healthcare:             "Healthcare",
  information_technology: "Information Technology",
  banking_finance:        "Banking & Finance",
  education:              "Education",
  manufacturing:          "Manufacturing",
  real_estate:            "Real Estate",
  media_entertainment:    "Media & Entertainment",
  hospitality_travel:     "Hospitality & Travel",
};

function SignalBars({ score = 0 }) {
  const bar = getSignalBar(score);
  const heights = [6, 9, 12, 15, 18];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3 }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width: 4, height: h, borderRadius: 2,
          background: (i + 1) <= bar.bars ? "#0D9488" : "#E4E2DC",
        }} />
      ))}
    </div>
  );
}

export default function WriteArticle() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const imageInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "", summary: "", content: "", level: "", readTime: "",
  });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const industry = profile?.industry || "medical_billing";
  const industryLabel = INDUSTRY_LABELS[industry] || industry;
  const authorName = profile?.displayName || user?.email?.split("@")[0] || "Anonymous";
  const plan = profile?.plan || "trial";
  const planBadge = PLAN_BADGE[plan];
  const weeklySignal = profile?.weeklySignal || 0;

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5MB."); return; }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setError("");
  };

  const removeImage = () => {
    setCoverFile(null);
    setCoverPreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const validate = () => {
    if (!form.title.trim())            return "Title is required.";
    if (form.title.trim().length < 10) return "Title must be at least 10 characters.";
    if (!form.summary.trim())          return "Summary is required.";
    if (form.summary.trim().length < 30) return "Summary must be at least 30 characters.";
    if (!form.content.trim())          return "Article content is required.";
    if (form.content.trim().length < 100) return "Content must be at least 100 characters.";
    if (!form.level)                   return "Please select a level.";
    if (!form.readTime)                return "Please select estimated read time.";
    return null;
  };

  const handleSubmit = async () => {
    setError("");
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      let coverImageUrl = null;

      // Upload cover image to Firebase Storage (same as admin)
      if (coverFile) {
        setUploading(true);
        const ext = coverFile.name.split(".").pop();
        const storageRef = ref(storage, `articles/covers/${Date.now()}_${user.uid}.${ext}`);
        await uploadBytes(storageRef, coverFile);
        coverImageUrl = await getDownloadURL(storageRef);
        setUploading(false);
      }

      await addDoc(collection(db, "articles"), {
        title:       form.title.trim(),
        summary:     form.summary.trim(),
        content:     form.content.trim(),
        level:       form.level,
        readTime:    form.readTime,
        coverImage:  coverImageUrl,
        industry,
        authorUid:   user.uid,
        authorName,
        authorPhoto: profile?.photoURL || null,
        status:      "pending",
        readCount:   0,
        likeCount:   0,
        likedBy:     [],
        commentCount: 0,
        createdAt:   serverTimestamp(),
      });
      setSubmitted(true);
    } catch (e) {
      setError("Something went wrong. Please try again.");
      console.error(e);
    }
    setLoading(false);
    setUploading(false);
  };

  // ── Success screen ────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={s.page}>
        <div style={s.successOuter}>
          <div style={s.successCard}>
            <div style={s.successEmoji}>✍️</div>
            <div style={s.successTitle}>Article Submitted!</div>
            <div style={s.successMsg}>
              Your article is under review. Once our admin approves it, it will go live in the Articles feed — usually within 24 hours.
            </div>
            <button style={s.doneBtn} onClick={() => navigate("/dashboard", { state: { tab: "articles" } })}>
              Back to Articles
            </button>
            <button style={s.writeAnotherBtn} onClick={() => {
              setForm({ title: "", summary: "", content: "", level: "", readTime: "" });
              setCoverFile(null);
              setCoverPreview(null);
              setSubmitted(false);
            }}>
              Write Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* Top bar */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate("/dashboard", { state: { tab: "articles" } })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span style={s.topBarTitle}>Write an Article</span>
        <button
          style={{ ...s.publishBtn, opacity: loading ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {uploading ? "Uploading…" : loading ? "Submitting…" : "Submit"}
        </button>
      </div>

      <div style={s.body}>

        {/* Author strip */}
        <div style={s.authorCard}>
          <Avatar
            uid={user?.uid}
            photoURL={profile?.photoURL}
            avatarId={profile?.avatarId || profile?.avatar}
            displayName={authorName}
            plan={plan}
            role={profile?.role || "participant"}
            size={44}
          />
          <div style={s.authorInfo}>
            <div style={s.authorName}>{authorName}</div>
            <div style={s.authorMeta}>{industryLabel}</div>
          </div>
          <div style={s.authorRight}>
            {planBadge && (
              <span style={{ ...s.planBadge, background: planBadge.bg, color: planBadge.color }}>
                {planBadge.label}
              </span>
            )}
            <div style={s.signalRow}>
              <SignalBars score={weeklySignal} />
            </div>
          </div>
        </div>

        {/* Cover image upload */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <div style={s.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <span style={s.sectionTitle}>Cover Image <span style={s.optTag}>(optional)</span></span>
          </div>

          {!coverPreview ? (
            <button style={s.coverZone} onClick={() => imageInputRef.current?.click()}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              <span style={s.coverHint}>Tap to upload cover image</span>
              <span style={s.coverSub}>JPG, PNG · Max 5MB</span>
            </button>
          ) : (
            <div style={s.coverPreviewWrap}>
              <img src={coverPreview} alt="Cover" style={s.coverPreviewImg} />
              <button style={s.removeCoverBtn} onClick={removeImage}>✕ Remove</button>
            </div>
          )}
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }} onChange={handleImageChange} />
        </div>

        {/* Article details section */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <div style={s.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <span style={s.sectionTitle}>Article Details</span>
          </div>

          {/* Title */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Title <span style={s.req}>*</span></label>
            <input
              style={s.input}
              placeholder="e.g. How to Handle Claim Denials Efficiently"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              maxLength={120}
            />
            <div style={s.charCount}>{form.title.length}/120</div>
          </div>

          {/* Summary */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Summary <span style={s.req}>*</span></label>
            <textarea
              style={{ ...s.input, ...s.textarea, minHeight: 72 }}
              placeholder="A 1–2 sentence overview of what this article covers."
              value={form.summary}
              onChange={e => set("summary", e.target.value)}
              maxLength={300}
            />
            <div style={s.charCount}>{form.summary.length}/300</div>
          </div>

          {/* Level */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Level <span style={s.req}>*</span></label>
            <div style={s.levelGrid}>
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  style={{
                    ...s.levelCard,
                    background: form.level === l.value ? l.bg : "#fff",
                    borderColor: form.level === l.value ? l.border : "#E4E2DC",
                  }}
                  onClick={() => set("level", l.value)}
                >
                  <span style={{ ...s.levelLabel, color: form.level === l.value ? l.color : "#1A1A1A" }}>
                    {l.label}
                  </span>
                  <span style={s.levelDesc}>{l.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Read time */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Read Time <span style={s.req}>*</span></label>
            <div style={s.chipRow}>
              {READ_TIMES.map(t => (
                <button
                  key={t}
                  style={{
                    ...s.chip,
                    background: form.readTime === t ? "#0D9488" : "#fff",
                    borderColor: form.readTime === t ? "#0D9488" : "#E4E2DC",
                    color: form.readTime === t ? "#fff" : "#1A1A1A",
                  }}
                  onClick={() => set("readTime", t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content section */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <div style={s.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
              </svg>
            </div>
            <span style={s.sectionTitle}>Article Content</span>
          </div>

          <div style={s.fieldGroup}>
            <textarea
              style={{ ...s.input, ...s.textarea, minHeight: 280 }}
              placeholder={`Write your full article here.\n\nTips:\n• Use short paragraphs\n• Add examples from real RCM scenarios\n• Keep sentences clear and direct`}
              value={form.content}
              onChange={e => set("content", e.target.value)}
            />
            <div style={s.charCount}>{form.content.length} characters</div>
          </div>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {/* Submit button */}
        <button
          style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {uploading ? "Uploading image…" : loading ? "Submitting…" : "Submit for Review →"}
        </button>
        <CommunityGuidelinesBar compact />
        <div style={s.reviewNote}>
          Articles are reviewed by our admin before going live. Usually within 24 hours.
        </div>

      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100dvh",
    background: "#F3F2EF",
    fontFamily: "'DM Sans', sans-serif",
    paddingBottom: 48,
  },
  topBar: {
    background: "#0A1628",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    position: "sticky",
    top: 0,
    zIndex: 99,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.8)",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: "50%",
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
  },
  publishBtn: {
    background: "#0D9488",
    border: "none",
    borderRadius: 20,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    padding: "7px 18px",
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
  },
  body: {
    padding: "16px 16px 0",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    maxWidth: 560,
    margin: "0 auto",
  },
  authorCard: {
    background: "#fff",
    border: "1px solid #E4E2DC",
    borderRadius: 14,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  authorInfo: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0A1628",
    fontFamily: "'DM Sans', sans-serif",
    lineHeight: 1.3,
  },
  authorMeta: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "'DM Sans', sans-serif",
    marginTop: 2,
  },
  authorRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  planBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 20,
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: 0.2,
  },
  signalRow: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  section: {
    background: "#fff",
    border: "1px solid #E4E2DC",
    borderRadius: 14,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  sectionHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    background: "#0A1628",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0A1628",
    fontFamily: "'DM Sans', sans-serif",
  },
  optTag: {
    fontSize: 11,
    fontWeight: 400,
    color: "#9CA3AF",
  },
  coverZone: {
    width: "100%",
    border: "1.5px dashed #D1D5DB",
    borderRadius: 12,
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    background: "#F9FAFB",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box",
  },
  coverHint: {
    fontSize: 13,
    fontWeight: 600,
    color: "#6B7280",
    fontFamily: "'DM Sans', sans-serif",
  },
  coverSub: {
    fontSize: 11,
    color: "#9CA3AF",
    fontFamily: "'DM Sans', sans-serif",
  },
  coverPreviewWrap: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
  },
  coverPreviewImg: {
    width: "100%",
    maxHeight: 180,
    objectFit: "cover",
    display: "block",
    borderRadius: 10,
  },
  removeCoverBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    border: "none",
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: 2,
  },
  req: { color: "#B91C1C" },
  input: {
    width: "100%",
    padding: "11px 14px",
    background: "#F9FAFB",
    border: "1.5px solid #E4E2DC",
    borderRadius: 10,
    fontSize: 14,
    color: "#1A1A1A",
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box",
    display: "block",
  },
  textarea: {
    resize: "vertical",
    lineHeight: 1.6,
  },
  charCount: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 2,
  },
  levelGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  levelCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "10px 14px",
    border: "1.5px solid #E4E2DC",
    borderRadius: 10,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.15s ease",
    gap: 2,
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
  },
  levelDesc: {
    fontSize: 11,
    color: "#9CA3AF",
    fontFamily: "'DM Sans', sans-serif",
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    padding: "7px 14px",
    border: "1.5px solid #E4E2DC",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.15s ease",
  },
  errorBox: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#B91C1C",
    fontFamily: "'DM Sans', sans-serif",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    background: "#0D9488",
    color: "#fff",
    border: "none",
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    marginTop: 4,
  },
  reviewNote: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
    lineHeight: 1.5,
    fontFamily: "'DM Sans', sans-serif",
    paddingBottom: 16,
  },
  successOuter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100dvh",
    padding: "24px 20px",
  },
  successCard: {
    background: "#fff",
    border: "1px solid #E4E2DC",
    borderRadius: 20,
    padding: "36px 24px",
    textAlign: "center",
    maxWidth: 360,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  successEmoji: { fontSize: 48 },
  successTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0A1628",
    fontFamily: "'DM Sans', sans-serif",
  },
  successMsg: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 1.6,
    fontFamily: "'DM Sans', sans-serif",
  },
  doneBtn: {
    width: "100%",
    padding: "13px",
    background: "#0D9488",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    marginTop: 8,
  },
  writeAnotherBtn: {
    width: "100%",
    padding: "13px",
    background: "transparent",
    color: "#0D9488",
    border: "1.5px solid #0D9488",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
  },
};
