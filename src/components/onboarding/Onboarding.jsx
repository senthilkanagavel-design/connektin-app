import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { avatars } from "../profile/avatars";

const SLIDES = [
  {
    id: "welcome",
    isLogo: true,
    title: "Welcome to ConnektIn",
    subtitle: "Your professional network to learn, grow, and connect with people in your industry.",
  },
  {
    id: "features",
    isFeatures: true,
    title: "Everything you need to grow",
    subtitle: "Three powerful tools in one platform.",
  },
  {
    id: "trial",
    isTrial: true,
    title: "You're on a free trial",
    subtitle: "7 days free. Here's what you get — and what unlocks when you subscribe.",
  },
  {
    id: "profile",
    isProfile: true,
    title: "Make it yours",
    subtitle: "Pick an avatar and introduce yourself. You can always change this later.",
  },
];

const FEATURES = [
  { icon: "📚", color: "#0D9488", bg: "#F0FDFB", border: "#99F6E4", title: "Articles", desc: "Learn from expert-written content across Beginner, Intermediate, and Advanced levels." },
  { icon: "💼", color: "#0A4FA8", bg: "#EEF4FB", border: "#A8C4E0", title: "Jobs",     desc: "Find roles posted by real recruiters, filtered to your industry." },
  { icon: "🤝", color: "#7C3AED", bg: "#F5F3FF", border: "#C4B5FD", title: "Community", desc: "Share posts, read stories, and connect with professionals who speak your language." },
];

const TRIAL_FREE   = ["Community feed & posts", "Stories", "2 Beginner articles"];
const TRIAL_LOCKED = ["All Intermediate & Advanced articles", "Apply to jobs", "Like, comment & engage", "Post a job (recruiter)"];

const AVATAR_IDS = ["av1", "av2", "av3", "av4", "av5", "av6", "av7", "av8"];

export default function Onboarding() {
  const { patchProfile } = useAuth();
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState("av1");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  const isLast = slide === SLIDES.length - 1;

  const finish = async () => {
    setSaving(true);
    try {
      await patchProfile({ avatarId: selectedAvatar, bio: bio.trim(), onboardingDone: true });
      navigate("/dashboard");
    } catch (e) {
      navigate("/dashboard");
    }
  };

  const current = SLIDES[slide];

  return (
    <div style={st.root}>
      <button style={st.skip} onClick={finish}>Skip</button>

      <div style={st.card}>

        {current.isLogo && (
          <div style={st.logoWrap}>
            <img src="/icon-512.png" alt="ConnektIn" style={st.logo} />
          </div>
        )}

        {current.isFeatures && (
          <div style={st.featuresWrap}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ ...st.featureCard, background: f.bg, borderColor: f.border }}>
                <span style={st.featureIcon}>{f.icon}</span>
                <div>
                  <div style={{ ...st.featureTitle, color: f.color }}>{f.title}</div>
                  <div style={st.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {current.isTrial && (
          <div style={st.trialWrap}>
            {/* Free */}
            <div style={st.trialSectionLabel}>✓ Included in your free trial</div>
            {TRIAL_FREE.map(label => (
              <div key={label} style={st.trialRow}>
                <span style={st.trialIconFree}>✓</span>
                <span style={{ ...st.trialLabel, color: "#1A1A1A" }}>{label}</span>
              </div>
            ))}
            {/* Locked */}
            <div style={{ ...st.trialSectionLabel, color: "#9CA3AF", marginTop: 8, paddingTop: 8, borderTop: "1px solid #F3F2EF" }}>🔒 Unlocks with subscription</div>
            {TRIAL_LOCKED.map(label => (
              <div key={label} style={st.trialRow}>
                <span style={st.trialIconLocked}>🔒</span>
                <span style={{ ...st.trialLabel, color: "#9CA3AF" }}>{label}</span>
              </div>
            ))}
            <div style={st.trialNudge}>Subscribe after your trial — starting at ₹39/month.</div>
          </div>
        )}

        {current.isProfile && (
          <div style={st.profileWrap}>
            <div style={st.avatarGrid}>
              {AVATAR_IDS.map(id => {
                const AvatarSVG = avatars[id];
                const isSelected = selectedAvatar === id;
                return (
                  <button key={id} onClick={() => setSelectedAvatar(id)} style={{ ...st.avatarBtn, outline: isSelected ? "3px solid #0D9488" : "2px solid transparent", outlineOffset: "2px", background: isSelected ? "#F0FDFB" : "#F3F2EF" }}>
                    {AvatarSVG ? <AvatarSVG style={{ width: 36, height: 36 }} /> : <span style={{ fontSize: 24 }}>👤</span>}
                  </button>
                );
              })}
            </div>
            <textarea
              placeholder="Add a short bio (optional)... e.g. Product Manager with 6 years in SaaS"
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, 150))}
              style={st.bioInput}
              rows={3}
            />
            <div style={st.bioCount}>{bio.length} / 150</div>
          </div>
        )}

        <div style={st.textBlock}>
          <div style={st.title}>{current.title}</div>
          <div style={st.subtitle}>{current.subtitle}</div>
        </div>

        <div style={st.dots}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{ ...st.dot, background: i === slide ? "#0D9488" : "#E4E2DC", width: i === slide ? 20 : 8 }} />
          ))}
        </div>

        {isLast
          ? <button style={st.ctaPrimary} onClick={finish} disabled={saving}>{saving ? "Setting up..." : "Let's Go 🚀"}</button>
          : <button style={st.ctaPrimary} onClick={() => setSlide(slide + 1)}>Next</button>
        }

      </div>
    </div>
  );
}

const st = {
  root:        { minHeight: "100vh", background: "#F3F2EF", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", position: "relative" },
  skip:        { position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 13, color: "#9CA3AF", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 },
  card:        { background: "#fff", borderRadius: 20, border: "1px solid #E4E2DC", padding: "20px 20px 18px", width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" },
  logoWrap:    { display: "flex", justifyContent: "center", paddingTop: 4 },
  logo:        { width: 80, height: 80, borderRadius: 20 },
  featuresWrap:{ display: "flex", flexDirection: "column", gap: 8 },
  featureCard: { display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid" },
  featureIcon: { fontSize: 18, flexShrink: 0, marginTop: 1 },
  featureTitle:{ fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", marginBottom: 2 },
  featureDesc: { fontSize: 11, color: "#6B7280", lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" },
  // Trial — compact, no scroll
  trialWrap:         { borderRadius: 10, border: "1px solid #E4E2DC", padding: "10px 12px" },
  trialSectionLabel: { fontSize: 11, fontWeight: 700, color: "#0D9488", marginBottom: 6, letterSpacing: "0.03em", fontFamily: "'DM Sans', sans-serif" },
  trialRow:          { display: "flex", alignItems: "center", gap: 8, paddingBottom: 5 },
  trialIconFree:     { fontSize: 11, color: "#0D9488", fontWeight: 700, width: 14, textAlign: "center", flexShrink: 0 },
  trialIconLocked:   { fontSize: 11, width: 14, textAlign: "center", flexShrink: 0 },
  trialLabel:        { flex: 1, fontSize: 12, fontFamily: "'DM Sans', sans-serif" },
  trialNudge:        { marginTop: 8, fontSize: 10, color: "#9CA3AF", textAlign: "center", lineHeight: 1.4, borderTop: "1px solid #F3F2EF", paddingTop: 8, fontFamily: "'DM Sans', sans-serif" },
  profileWrap: { display: "flex", flexDirection: "column", gap: 10 },
  avatarGrid:  { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  avatarBtn:   { border: "none", borderRadius: 12, padding: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" },
  bioInput:    { width: "100%", border: "1px solid #E4E2DC", borderRadius: 10, padding: "8px 10px", fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: "#1A1A1A", resize: "none", background: "#FAFAF9", outline: "none", lineHeight: 1.5, boxSizing: "border-box" },
  bioCount:    { fontSize: 10, color: "#9CA3AF", textAlign: "right", marginTop: -6 },
  textBlock:   { textAlign: "center" },
  title:       { fontSize: 18, fontWeight: 700, color: "#0A1628", fontFamily: "'DM Sans', sans-serif", marginBottom: 4, lineHeight: 1.3 },
  subtitle:    { fontSize: 12, color: "#6B7280", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 },
  dots:        { display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  dot:         { height: 7, borderRadius: 4, transition: "all 0.25s" },
  ctaPrimary:  { width: "100%", background: "#0D9488", color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
};
