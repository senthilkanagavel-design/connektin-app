import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { avatars } from "../components/avatars";

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
    title: "Your career just got an upgrade ✨",
    subtitle: "Here's everything waiting for you inside.",
  },
  {
    id: "profile",
    isProfile: true,
    title: "Make it yours",
    subtitle: "Pick an avatar and introduce yourself. You can always change this later.",
  },
];

const FEATURES = [
  {
    icon: "📚", color: "#0D9488", bg: "#F0FDFB", border: "#99F6E4",
    title: "Articles",
    desc: "Learn from expert-written content across Beginner, Intermediate, and Advanced levels.",
  },
  {
    icon: "💼", color: "#0A4FA8", bg: "#EEF4FB", border: "#A8C4E0",
    title: "Jobs",
    desc: "Find roles posted by real recruiters, filtered to your industry.",
  },
  {
    icon: "🤝", color: "#7C3AED", bg: "#F5F3FF", border: "#C4B5FD",
    title: "Community",
    desc: "Share posts, read stories, and connect with professionals who speak your language.",
  },
];

const WOW_FEATURES = [
  { icon: "📰", label: "Community feed, posts & stories" },
  { icon: "📚", label: "Articles — Beginner to Advanced" },
  { icon: "💼", label: "Browse & apply to real job listings" },
  { icon: "❤️", label: "Like, comment & follow professionals" },
  { icon: "🎓", label: "E-Certificate every 90 days" },
  { icon: "🎙️", label: "Live webinars every 15 days" },
];

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
      navigate("/industry-select");
    } catch (e) {
      navigate("/industry-select");
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
            {FEATURES.map((f) => (
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
          <div style={st.wowWrap}>
            <div style={st.wowGrid}>
              {WOW_FEATURES.map((f) => (
                <div key={f.label} style={st.wowItem}>
                  <div style={st.wowIconWrap}>
                    <span style={st.wowIcon}>{f.icon}</span>
                  </div>
                  <span style={st.wowLabel}>{f.label}</span>
                  <span style={st.wowCheck}>✓</span>
                </div>
              ))}
            </div>
            <div style={st.wowNudge}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🚀</span>
              <span>Everything you need to <strong style={{ color: "#0D9488" }}>learn, connect, and grow</strong> — all in one place.</span>
            </div>
          </div>
        )}

        {current.isProfile && (
          <div style={st.profileWrap}>
            <div style={st.avatarGrid}>
              {AVATAR_IDS.map((id) => {
                const AvatarSVG = avatars[id];
                const isSelected = selectedAvatar === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedAvatar(id)}
                    style={{
                      ...st.avatarBtn,
                      outline: isSelected ? "3px solid #0D9488" : "2px solid transparent",
                      outlineOffset: "2px",
                      background: isSelected ? "#F0FDFB" : "#F3F2EF",
                    }}
                  >
                    {AvatarSVG
                      ? <AvatarSVG style={{ width: 36, height: 36 }} />
                      : <span style={{ fontSize: 24 }}>👤</span>
                    }
                  </button>
                );
              })}
            </div>
            <textarea
              placeholder="Add a short bio (optional)... e.g. Product Manager with 6 years in SaaS"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 150))}
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

        {isLast ? (
          <button style={st.ctaPrimary} onClick={finish} disabled={saving}>
            {saving ? "Setting up..." : "Let's Go 🚀"}
          </button>
        ) : (
          <button style={st.ctaPrimary} onClick={() => setSlide(slide + 1)}>
            Next
          </button>
        )}

      </div>
    </div>
  );
}

const st = {
  root: { minHeight: "100vh", background: "#F3F2EF", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", position: "relative" },
  skip: { position: "absolute", top: 20, right: 20, background: "none", border: "none", fontSize: 14, color: "#9CA3AF", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 },
  card: { background: "#fff", borderRadius: 20, border: "1px solid #E4E2DC", padding: "28px 20px 24px", width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" },
  logoWrap: { display: "flex", justifyContent: "center", paddingTop: 8 },
  logo: { width: 96, height: 96, borderRadius: 24 },
  featuresWrap: { display: "flex", flexDirection: "column", gap: 10 },
  featureCard: { display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid" },
  featureIcon: { fontSize: 22, flexShrink: 0, marginTop: 1 },
  featureTitle: { fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", marginBottom: 2 },
  featureDesc: { fontSize: 12, color: "#6B7280", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" },

  // WOW trial slide
  wowWrap: { display: "flex", flexDirection: "column", gap: 10 },
  wowGrid: { display: "flex", flexDirection: "column", gap: 8, background: "linear-gradient(135deg, #F0FDFB 0%, #EEF4FB 100%)", borderRadius: 14, padding: "14px 16px", border: "1px solid #99F6E4" },
  wowItem: { display: "flex", alignItems: "center", gap: 12, padding: "6px 0", borderBottom: "1px solid rgba(13,148,136,0.08)" },
  wowIconWrap: { width: 32, height: 32, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  wowIcon: { fontSize: 16 },
  wowLabel: { flex: 1, fontSize: 13, fontWeight: 500, color: "#0A1628", fontFamily: "'DM Sans', sans-serif" },
  wowCheck: { fontSize: 13, fontWeight: 700, color: "#0D9488", flexShrink: 0 },
  wowNudge: { display: "flex", alignItems: "center", gap: 8, background: "#0A1628", borderRadius: 12, padding: "12px 16px" },
  wowNudgeEmoji: { fontSize: 18, flexShrink: 0 },
  wowNudge: { display: "flex", alignItems: "center", gap: 8, background: "#0A1628", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, marginTop: 2 },

  profileWrap: { display: "flex", flexDirection: "column", gap: 14 },
  avatarGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  avatarBtn: { border: "none", borderRadius: 14, padding: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" },
  bioInput: { width: "100%", border: "1px solid #E4E2DC", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: "#1A1A1A", resize: "none", background: "#FAFAF9", outline: "none", lineHeight: 1.5, boxSizing: "border-box" },
  bioCount: { fontSize: 11, color: "#9CA3AF", textAlign: "right", marginTop: -8 },
  textBlock: { textAlign: "center" },
  title: { fontSize: 20, fontWeight: 700, color: "#0A1628", fontFamily: "'DM Sans', sans-serif", marginBottom: 6, lineHeight: 1.3 },
  subtitle: { fontSize: 13, color: "#6B7280", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 },
  dots: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  dot: { height: 8, borderRadius: 4, transition: "all 0.25s" },
  ctaPrimary: { width: "100%", background: "#0D9488", color: "#fff", border: "none", borderRadius: 12, padding: "14px 0", fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
};
