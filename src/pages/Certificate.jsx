// src/pages/Certificate.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const INDUSTRY_TITLES = {
  healthcare_rcm: "Healthcare Revenue Cycle Professional",
  medical_billing: "Medical Billing Professional",
  software_engineering: "Software Engineering Professional",
  data_science: "Data Science Professional",
  finance: "Finance Professional",
  marketing: "Marketing Professional",
  human_resources: "Human Resources Professional",
  sales: "Sales Professional",
  operations: "Operations Professional",
  education: "Education Professional",
  default: "Community Professional",
};

function getTitle(industry) {
  if (!industry) return INDUSTRY_TITLES.default;
  const key = industry.toLowerCase().replace(/\s+/g, "_");
  return INDUSTRY_TITLES[key] || INDUSTRY_TITLES.default;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  }).format(date);
}

function getCertNumber(uid) {
  const hash = uid ? uid.slice(-6).toUpperCase() : "000001";
  return `CI-2026-${hash}`;
}

function getDaysActive(createdAt) {
  if (!createdAt) return 0;
  const start = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  return Math.floor((new Date() - start) / (1000 * 60 * 60 * 24));
}

export default function Certificate() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!profile) return null;

  const name = profile.displayName || user?.displayName || "Your Name";
  const industry = profile.industry || "";
  const title = getTitle(industry);
  const certNum = getCertNumber(user?.uid);
  const createdAt = profile.createdAt;
  const issuedDate = createdAt
    ? (createdAt.toDate ? createdAt.toDate() : new Date(createdAt))
    : new Date();
  const validTill = new Date(issuedDate);
  validTill.setDate(validTill.getDate() + 90);

  const daysActive = getDaysActive(createdAt);
  const progress = Math.min(100, Math.round((daysActive / 90) * 100));
  const daysLeft = Math.max(0, 90 - daysActive);
  const isEarned = daysActive >= 90;

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate("/dashboard")}>← Back</button>
        <div style={s.headerTitle}>My Certificate</div>
        <div style={{ width: 60 }} />
      </div>

      {/* Progress bar */}
      <div style={s.progressWrap}>
        <div style={s.progressTop}>
          <span style={s.progressLabel}>
            {isEarned ? "Certificate earned! 🎉" : `${daysLeft} days until your certificate is officially issued`}
          </span>
          <span style={s.progressPct}>{progress}%</span>
        </div>
        <div style={s.progressTrack}>
          <div style={{ ...s.progressFill, width: `${progress}%` }} />
        </div>
      </div>

      {/* Sample banner for non-earned */}
      {!isEarned && (
        <div style={s.sampleBanner}>
          ✨ This is a preview of your certificate — keep engaging and it's yours in {daysLeft} days
        </div>
      )}

      {/* Certificate */}
      <div
        style={{
          ...s.certOuter,
          opacity: animIn ? 1 : 0,
          transform: animIn ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        <div style={s.borderOuter} />
        <div style={s.borderInner} />

        <CornerOrnament pos={{ top: 10, left: 10 }} rotate={0} />
        <CornerOrnament pos={{ top: 10, right: 10 }} rotate={90} />
        <CornerOrnament pos={{ bottom: 10, left: 10 }} rotate={270} />
        <CornerOrnament pos={{ bottom: 10, right: 10 }} rotate={180} />

        <div style={s.watermark}>ConnektIn</div>
        {!isEarned && (
          <div style={s.sampleWatermark}>SAMPLE</div>
        )}

        {/* Logo */}
        <div style={s.logoRow}>
          <img src="/icon-512.png" alt="ConnektIn" style={s.logo} />
        </div>

        <div style={s.tagline}>Professional Community Platform · India</div>

        <GoldDivider />

        <div style={s.presents}>proudly presents this</div>
        <div style={s.certTitle}>Certificate of Achievement</div>

        <div style={s.name}>{name}</div>
        <div style={s.nameUnderline} />

        <div style={s.forText}>in recognition of outstanding commitment to</div>
        <div style={s.achievement}>{title}</div>

        <div style={s.desc}>
          This certificate acknowledges 90 days of consistent learning, active community
          participation, knowledge sharing, and professional growth within the ConnektIn platform.
        </div>

        <GoldDivider />

        <div style={s.bottomRow}>
          <div style={s.metaCol}>
            <div style={s.metaItem}>
              <div style={s.metaLabel}>Issued On</div>
              <div style={s.metaVal}>{formatDate(issuedDate)}</div>
            </div>
          </div>

          <div style={s.sealOuter}>
            <div style={s.sealInner}>
              <div style={s.sealStar}>★</div>
              <div style={s.sealText}>{"VERIFIED\nMEMBER"}</div>
            </div>
          </div>

          <div style={s.sigBlock}>
            <div style={s.sig}>TherMite</div>
            <div style={s.sigLine} />
            <div style={s.sigName}>TherMite Educare</div>
            <div style={s.sigTitle}>Training Partner, ConnektIn</div>
          </div>
        </div>

        <div style={s.certId}>CERT · {certNum} · connektin.in · Issued with pride</div>
      </div>
    </div>
  );
}

function CornerOrnament({ pos, rotate }) {
  return (
    <svg
      width="48" height="48" viewBox="0 0 48 48" fill="none"
      style={{ position: "absolute", ...pos, transform: `rotate(${rotate}deg)` }}
    >
      <path d="M4 48 L4 4 L48 4" stroke="#B8860B" strokeWidth="2" fill="none" />
      <path d="M10 48 L10 10 L48 10" stroke="#d4b896" strokeWidth="0.5" fill="none" />
      <circle cx="4" cy="4" r="3" fill="#B8860B" />
      <path d="M4 22 Q10 16 16 22 Q22 28 28 22" stroke="#B8860B" strokeWidth="1" fill="none" />
      <circle cx="4" cy="22" r="1.5" fill="#d4b896" />
      <circle cx="28" cy="22" r="1.5" fill="#d4b896" />
    </svg>
  );
}

function GoldDivider() {
  return (
    <div style={{
      height: 1,
      margin: "16px 32px",
      background: "linear-gradient(90deg, transparent, #B8860B, #ffd700, #B8860B, transparent)",
    }} />
  );
}

const s = {
  page: {
    minHeight: "100dvh",
    background: "#F6F3EE",
    fontFamily: "'DM Sans', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingBottom: 40,
  },
  header: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 16px 12px",
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
  },
  backBtn: {
    background: "none", border: "none", color: "#0D9488",
    fontSize: 14, fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif", cursor: "pointer", padding: 0,
  },
  headerTitle: {
    fontSize: 16, fontWeight: 700, color: "#0A1628",
    fontFamily: "'DM Sans', sans-serif",
  },
  progressWrap: {
    width: "100%", maxWidth: 640, padding: "16px 20px 8px",
  },
  progressTop: {
    display: "flex", justifyContent: "space-between", marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12, color: "#64748b", fontFamily: "'DM Sans', sans-serif",
  },
  progressPct: {
    fontSize: 12, fontWeight: 700, color: "#0D9488",
    fontFamily: "'DM Sans', sans-serif",
  },
  progressTrack: {
    height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden",
  },
  progressFill: {
    height: "100%", borderRadius: 99,
    background: "linear-gradient(90deg, #0D9488, #14b8a6)",
    transition: "width 1s ease",
  },
  sampleBanner: {
    width: "calc(100% - 32px)",
    maxWidth: 600,
    background: "rgba(13,148,136,0.08)",
    border: "1px solid rgba(13,148,136,0.25)",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 12,
    color: "#0D9488",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    textAlign: "center",
    marginBottom: 4,
  },
  certOuter: {
    position: "relative",
    background: "#fefcf7",
    border: "1px solid #d4b896",
    borderRadius: 8,
    padding: "44px 40px 32px",
    margin: "16px 16px 0",
    maxWidth: 600,
    width: "calc(100% - 32px)",
    overflow: "hidden",
    boxShadow: "0 8px 40px rgba(184,134,11,0.12), 0 2px 8px rgba(0,0,0,0.06)",
  },
  borderOuter: {
    position: "absolute", inset: 10,
    border: "2px solid #B8860B", borderRadius: 4, pointerEvents: "none",
  },
  borderInner: {
    position: "absolute", inset: 16,
    border: "0.5px solid #d4b896", borderRadius: 2, pointerEvents: "none",
  },
  watermark: {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: 80, fontWeight: 800, color: "#0D9488", opacity: 0.04,
    whiteSpace: "nowrap", pointerEvents: "none",
    fontFamily: "'DM Sans', sans-serif", letterSpacing: -2,
  },
  sampleWatermark: {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%, -50%) rotate(-30deg)",
    fontSize: 64, fontWeight: 800, color: "#B8860B", opacity: 0.12,
    whiteSpace: "nowrap", pointerEvents: "none",
    fontFamily: "'DM Sans', sans-serif", letterSpacing: 8,
    textTransform: "uppercase", border: "6px solid #B8860B",
    padding: "8px 24px", borderRadius: 4,
  },
  logoRow: { display: "flex", justifyContent: "center", marginBottom: 8 },
  logo: { width: 56, height: 56, borderRadius: 14, objectFit: "cover" },
  tagline: {
    textAlign: "center", fontSize: 9, letterSpacing: "0.2em",
    textTransform: "uppercase", color: "#B8860B",
    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: 12,
  },
  presents: {
    textAlign: "center", fontFamily: "'Playfair Display', serif",
    fontSize: 13, fontStyle: "italic", color: "#8a7560", marginBottom: 4,
  },
  certTitle: {
    textAlign: "center", fontFamily: "'DM Sans', sans-serif",
    fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
    color: "#0A1628", fontWeight: 600, marginBottom: 16,
  },
  name: {
    textAlign: "center", fontFamily: "'Playfair Display', serif",
    fontSize: 38, fontWeight: 700, color: "#0A1628", lineHeight: 1.1,
  },
  nameUnderline: {
    width: 80, height: 2,
    background: "linear-gradient(90deg, #B8860B, #ffd700, #B8860B)",
    margin: "10px auto 14px", borderRadius: 1,
  },
  forText: {
    textAlign: "center", fontFamily: "'Playfair Display', serif",
    fontSize: 12, fontStyle: "italic", color: "#8a7560", marginBottom: 6,
  },
  achievement: {
    textAlign: "center", fontFamily: "'Playfair Display', serif",
    fontSize: 18, fontWeight: 700, color: "#0D9488",
    marginBottom: 12, lineHeight: 1.3,
  },
  desc: {
    textAlign: "center", fontFamily: "'DM Sans', sans-serif",
    fontSize: 12, color: "#8a7560", lineHeight: 1.7,
    maxWidth: 420, margin: "0 auto 8px",
  },
  bottomRow: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-end", marginTop: 12, flexWrap: "wrap", gap: 12,
  },
  metaCol: { display: "flex", gap: 20, flexWrap: "wrap" },
  metaItem: { display: "flex", flexDirection: "column", gap: 3 },
  metaLabel: {
    fontFamily: "'DM Sans', sans-serif", fontSize: 8,
    textTransform: "uppercase", letterSpacing: "0.12em",
    color: "#B8860B", fontWeight: 700,
  },
  metaVal: {
    fontFamily: "'DM Sans', sans-serif", fontSize: 12,
    color: "#0A1628", fontWeight: 600,
  },
  sealOuter: {
    width: 72, height: 72, borderRadius: "50%",
    border: "2px solid #B8860B", background: "#fefcf7",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  sealInner: {
    width: 58, height: 58, borderRadius: "50%",
    border: "1px solid #d4b896",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 1,
  },
  sealStar: { fontSize: 20, color: "#B8860B", lineHeight: 1 },
  sealText: {
    fontFamily: "'DM Sans', sans-serif", fontSize: 7,
    fontWeight: 700, color: "#B8860B",
    letterSpacing: "0.08em", textAlign: "center", whiteSpace: "pre",
  },
  sigBlock: {
    display: "flex", flexDirection: "column",
    alignItems: "center", minWidth: 130,
  },
  sig: {
    fontFamily: "'Playfair Display', serif", fontSize: 26,
    fontStyle: "italic", color: "#0A1628", lineHeight: 1, paddingBottom: 4,
  },
  sigLine: { width: "100%", height: 1, background: "#0A1628", marginBottom: 4 },
  sigName: {
    fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
    color: "#0A1628", letterSpacing: "0.06em",
    textTransform: "uppercase", textAlign: "center",
  },
  sigTitle: {
    fontFamily: "'DM Sans', sans-serif", fontSize: 9,
    color: "#8a7560", textAlign: "center",
  },
  certId: {
    textAlign: "center", marginTop: 16,
    fontFamily: "'DM Sans', sans-serif", fontSize: 9,
    color: "#c4b49a", letterSpacing: "0.1em",
  },
};
