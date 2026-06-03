// src/pages/CreatePost.jsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { addSignal, SIGNAL_POINTS } from "../utils/signal";
import CommunityGuidelinesBar from "../components/CommunityGuidelinesBar";

const MAX_CHARS = 1200;
const MAX_IMAGE_SIZE_MB = 1.5;

const SUGGESTED_TAGS = {
  medical_billing          : ["billing", "rcm", "denialmanagement", "eligibility", "revenue", "claims"],
  medical_coding           : ["coding", "icd10", "cpt", "hcpcs", "auditready", "compliance"],
  medical_coding_billing   : ["rcm", "coding", "billing", "denials", "eligibility", "revenue"],
  healthcare               : ["healthcare", "clinical", "patient", "hospital", "nursing", "health"],
  information_technology   : ["technology", "software", "cloud", "cybersecurity", "devops", "ai"],
  banking_finance          : ["finance", "banking", "investment", "fintech", "insurance", "wealth"],
  education                : ["education", "learning", "teaching", "edtech", "training", "skills"],
  manufacturing            : ["manufacturing", "production", "quality", "supplychain", "lean", "ops"],
  real_estate              : ["realestate", "property", "construction", "facilities", "investment"],
  media_entertainment      : ["media", "content", "digital", "creative", "entertainment", "social"],
  hospitality_travel       : ["hospitality", "travel", "tourism", "hotel", "restaurant", "service"],
};

export default function CreatePost() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [text, setText]                 = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag]       = useState("");
  const [imageBase64, setImageBase64]   = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState("");
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const isTrial = profile?.plan === "trial";

  // Detect TherMite from profile (reliable) — fallback to sessionStorage
  const isTherMite = profile?.userType === "thermite" || sessionStorage.getItem("ref") === "thermite";
  const upgradePrice = isTherMite ? "₹39/month" : "₹69/month";
  const upgradePriceSub = isTherMite ? "exclusive TherMite rate" : "billed monthly";

  const industry      = profile?.industry || "medical_billing";
  const suggestedTags = SUGGESTED_TAGS[industry] || [];
  const charsLeft     = MAX_CHARS - text.length;

  const handleImagePick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) { setError(`Image too large. Max ${MAX_IMAGE_SIZE_MB}MB.`); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setImageBase64(ev.target.result); setImagePreview(ev.target.result); setError(""); };
    reader.readAsDataURL(file);
  };

  const removeImage = () => { setImageBase64(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const toggleTag = (tag) => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  const addCustomTag = () => {
    const clean = customTag.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (!clean || selectedTags.includes(clean) || selectedTags.length >= 5) return;
    setSelectedTags((prev) => [...prev, clean]);
    setCustomTag("");
  };

  const handleSubmit = async () => {
    if (!text.trim() && !imageBase64) { setError("Write something or add an image before posting."); return; }
    if (text.length > MAX_CHARS) { setError(`Post exceeds ${MAX_CHARS} characters.`); return; }

    // Catch trial users — show upgrade prompt instead of Firestore rejection
    if (isTrial) { setShowUpgradePrompt(true); return; }

    setSubmitting(true); setError("");
    try {
      await addDoc(collection(db, "posts"), {
        uid: user.uid,
        name: profile?.displayName || "User",
        photo: profile?.photoURL || null,
        text: text.trim(),
        image: imageBase64 || null,
        tags: selectedTags,
        industry,
        likedBy: [],
        commentCount: 0,
        ts: serverTimestamp(),
      });
      // Signal: post creator earns for creating a post
      await addSignal(user.uid, SIGNAL_POINTS.POST_CREATED);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      if (e?.code === "permission-denied") {
        setShowUpgradePrompt(true);
      } else {
        setError("Failed to post. Please try again.");
      }
    }
    setSubmitting(false);
  };

  return (
    <div style={s.page}>

      {/* Upgrade overlay */}
      {showUpgradePrompt && (
        <div style={s.overlay}>
          <div style={s.upgradeCard}>
            <div style={s.upgradeEmoji}>🔒</div>
            <h3 style={s.upgradeTitle}>Upgrade to Post</h3>
            <p style={s.upgradeBody}>
              Posting is available for paid members. Share insights and engage with the community by upgrading your plan.
            </p>
            <div style={s.upgradePriceBox}>
              <span style={s.upgradePriceMain}>{upgradePrice}</span>
              <span style={s.upgradePriceSub}>{upgradePriceSub}</span>
            </div>
            <button style={s.upgradeBtn} onClick={() => navigate("/subscribe")}>
              Upgrade Now
            </button>
            <button style={s.cancelOverlayBtn} onClick={() => setShowUpgradePrompt(false)}>
              Maybe Later
            </button>
          </div>
        </div>
      )}

      <div style={s.header}>
        <button style={s.cancelBtn} onClick={() => navigate('/dashboard', { state: { tab: 'posts' } })}>Cancel</button>
        <span style={s.headerTitle}>Create Post</span>
        <button
          style={{ ...s.postBtn, opacity: (!text.trim() && !imageBase64) || submitting ? 0.4 : 1, cursor: (!text.trim() && !imageBase64) || submitting ? "not-allowed" : "pointer" }}
          onClick={handleSubmit}
          disabled={(!text.trim() && !imageBase64) || submitting}
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>

      <div style={s.body}>
        <div style={s.authorRow}>
          {profile?.photoURL && (profile.photoURL.startsWith("http") || profile.photoURL.startsWith("data:")) ? (
            <img src={profile.photoURL} alt={profile.displayName} style={{ ...s.avatar, objectFit: "cover" }} />
          ) : profile?.photoURL && profile.photoURL.startsWith("<svg") ? (
            <div style={s.avatar} dangerouslySetInnerHTML={{ __html: profile.photoURL }} />
          ) : (
            <div style={s.avatar}>{profile?.displayName?.[0]?.toUpperCase() || "U"}</div>
          )}
          <div>
            <div style={s.authorName}>{profile?.displayName || "You"}</div>
            <div style={s.audienceBadge}>🏥 {industry.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} community</div>
          </div>
        </div>

        {/* Inline trial notice */}
        {isTrial && (
          <div style={s.trialNotice}>
            <span style={s.trialNoticeText}>🔒 Posting is for paid members.</span>
            <button style={s.trialNoticeLink} onClick={() => navigate("/subscribe")}>
              Upgrade {isTherMite ? "@ ₹39/mo →" : "@ ₹69/mo →"}
            </button>
          </div>
        )}

        <textarea
          style={s.textarea}
          placeholder="Share an insight, ask a question, or start a discussion…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          maxLength={MAX_CHARS + 50}
        />

        <div style={s.toolbar}>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={handleImagePick} />
          <button style={s.toolbarBtn} onClick={() => fileInputRef.current?.click()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            <span style={s.toolbarBtnLabel}>Photo</span>
          </button>
          <div style={s.toolbarDivider} />
          <span style={s.toolbarHint}>{imageBase64 ? "✅ Image attached" : "Max 1.5MB · JPG, PNG, WEBP"}</span>
          {imageBase64 && <button style={s.removeImageBtnInline} onClick={removeImage}>Remove</button>}
        </div>

        <div style={{ ...s.charCount, color: charsLeft < 80 ? (charsLeft < 20 ? "#B91C1C" : "#D97706") : "#999" }}>
          {charsLeft < 200 ? `${charsLeft} characters left` : ""}
        </div>

        {error && <div style={s.error}>{error}</div>}

        {imagePreview && (
          <div style={s.imagePreviewWrap}>
            <img src={imagePreview} alt="preview" style={s.imagePreview} />
            <button style={s.removeImageBtn} onClick={removeImage}>✕</button>
          </div>
        )}

        <div style={s.section}>
          <div style={s.sectionLabel}>Add tags (optional, up to 5)</div>
          <div style={s.tagsGrid}>
            {suggestedTags.map((tag) => (
              <button key={tag} style={{ ...s.tagChip, background: selectedTags.includes(tag) ? "#0D9488" : "#F3F2EF", color: selectedTags.includes(tag) ? "#fff" : "#444", border: `1.5px solid ${selectedTags.includes(tag) ? "#0D9488" : "#E4E2DC"}` }} onClick={() => toggleTag(tag)}>
                #{tag}
              </button>
            ))}
          </div>
          {selectedTags.length < 5 && (
            <div style={s.customTagRow}>
              <input style={s.customTagInput} placeholder="Add custom tag…" value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomTag()} maxLength={24} />
              <button style={s.addTagBtn} onClick={addCustomTag}>Add</button>
            </div>
          )}
          {selectedTags.length > 0 && (
            <div style={s.selectedTags}>
              {selectedTags.map((tag) => (
                <span key={tag} style={s.selectedTag}>#{tag}<button style={s.removeTag} onClick={() => toggleTag(tag)}>×</button></span>
              ))}
            </div>
          )}
        </div>

        <CommunityGuidelinesBar compact />

        <div style={s.tipsBox}>
          <div style={s.tipsTitle}>💡 Tips for a great post</div>
          <ul style={s.tipsList}>
            <li>Share a real experience or lesson from your work</li>
            <li>Ask a question your peers face too</li>
            <li>Keep it concise — key insight up front</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:       { minHeight: "100dvh", background: "#F3F2EF", fontFamily: "'DM Sans', sans-serif" },
  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" },
  upgradeCard:{ background: "#fff", borderRadius: 16, padding: "32px 24px", maxWidth: 340, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  upgradeEmoji:    { fontSize: 40, marginBottom: 12 },
  upgradeTitle:    { fontSize: 18, fontWeight: 700, color: "#1A1A1A", margin: "0 0 10px", fontFamily: "'DM Sans', sans-serif" },
  upgradeBody:     { fontSize: 14, color: "#555", lineHeight: 1.6, margin: "0 0 16px", fontFamily: "'DM Sans', sans-serif" },
  upgradePriceBox: { background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 2 },
  upgradePriceMain:{ fontSize: 24, fontWeight: 800, color: "#16A34A", fontFamily: "'DM Sans', sans-serif" },
  upgradePriceSub: { fontSize: 12, color: "#555", fontFamily: "'DM Sans', sans-serif" },
  upgradeBtn:      { display: "block", width: "100%", background: "#0D9488", color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", marginBottom: 10 },
  cancelOverlayBtn:{ display: "block", width: "100%", background: "none", color: "#999", border: "none", fontSize: 14, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", padding: "8px 0" },
  trialNotice: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "9px 12px", marginBottom: 12 },
  trialNoticeText: { fontSize: 13, color: "#92400E", fontWeight: 500 },
  trialNoticeLink: { fontSize: 13, color: "#0D9488", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  header:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#fff", borderBottom: "1px solid #E4E2DC", position: "sticky", top: 0, zIndex: 10 },
  cancelBtn:  { background: "none", border: "none", color: "#666", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: "4px 0", width: 60 },
  headerTitle:{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" },
  postBtn:    { background: "#0D9488", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, borderRadius: 20, padding: "7px 18px", fontFamily: "'DM Sans', sans-serif", width: 72, textAlign: "center" },
  body:       { padding: "16px", maxWidth: 600, margin: "0 auto" },
  authorRow:  { display: "flex", gap: 10, alignItems: "center", marginBottom: 14 },
  avatar:     { width: 44, height: 44, borderRadius: "50%", background: "#0A1628", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, flexShrink: 0 },
  authorName: { fontSize: 14, fontWeight: 700, color: "#1A1A1A" },
  audienceBadge: { fontSize: 12, color: "#555", marginTop: 2 },
  textarea:   { width: "100%", minHeight: 160, background: "#fff", border: "1.5px solid #E4E2DC", borderBottom: "none", borderRadius: "12px 12px 0 0", padding: "14px", fontSize: 15, color: "#1A1A1A", lineHeight: 1.6, resize: "none", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" },
  toolbar:    { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1.5px solid #E4E2DC", borderRadius: "0 0 12px 12px", padding: "10px 14px", marginBottom: 8 },
  toolbarBtn: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8 },
  toolbarBtnLabel: { fontSize: 13, fontWeight: 600, color: "#0D9488" },
  toolbarDivider:  { width: 1, height: 20, background: "#E4E2DC" },
  toolbarHint:     { fontSize: 11, color: "#999", flex: 1 },
  removeImageBtnInline: { background: "none", border: "none", color: "#B91C1C", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  charCount:  { fontSize: 12, textAlign: "right", minHeight: 18, marginBottom: 4, paddingRight: 2 },
  error:      { fontSize: 13, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px", marginBottom: 12 },
  imagePreviewWrap: { position: "relative", marginBottom: 14, borderRadius: 10, overflow: "hidden", background: "#000" },
  imagePreview:     { width: "100%", maxHeight: 280, objectFit: "cover", display: "block", opacity: 0.92 },
  removeImageBtn:   { position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", borderRadius: "50%", width: 28, height: 28, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  section:    { marginBottom: 16, background: "#fff", border: "1px solid #E4E2DC", borderRadius: 12, padding: "14px" },
  sectionLabel: { fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 10 },
  tagsGrid:   { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  tagChip:    { fontSize: 13, borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, transition: "all 0.15s" },
  customTagRow: { display: "flex", gap: 8, marginTop: 4 },
  customTagInput: { flex: 1, background: "#F3F2EF", border: "1.5px solid #E4E2DC", borderRadius: 8, padding: "7px 12px", fontSize: 13, color: "#1A1A1A", outline: "none", fontFamily: "'DM Sans', sans-serif" },
  addTagBtn:  { background: "#0D9488", border: "none", color: "#fff", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  selectedTags: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 },
  selectedTag:  { display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#0D9488", background: "#E6FAF8", border: "1px solid #99F6E4", borderRadius: 14, padding: "3px 10px", fontWeight: 500 },
  removeTag:    { background: "none", border: "none", color: "#0D9488", fontSize: 15, cursor: "pointer", padding: 0, lineHeight: 1 },
  tipsBox:    { background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "12px 14px", textAlign: "left" },
  tipsTitle:  { fontSize: 13, fontWeight: 600, color: "#92400E", marginBottom: 6, textAlign: "left" },
  tipsList:   { margin: 0, padding: "0 0 0 18px", fontSize: 12, color: "#78350F", lineHeight: 1.8, textAlign: "left" },
};
