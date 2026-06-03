import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const LEVELS = ["beginner", "intermediate", "advanced"];
const LEVEL_LABELS = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
const LEVEL_COLORS = {
  beginner: { color: "#0D9488", bg: "#F0FDFB", border: "#99F6E4" },
  intermediate: { color: "#0A4FA8", bg: "#EEF4FB", border: "#A8C4E0" },
  advanced: { color: "#7C3AED", bg: "#F5F3FF", border: "#C4B5FD" },
};

// Trial: 2 free beginner articles, all else locked
function isArticleLocked(article, index, level, plan) {
  if (plan !== "trial") return false;
  if (level === "beginner" && index < 2) return false;
  return true;
}

function LockOverlay({ onUpgrade }) {
  return (
    <div style={lockStyles.overlay}>
      <div style={lockStyles.iconWrap}>🔒</div>
      <div style={lockStyles.lockTitle}>Upgrade to read</div>
      <div style={lockStyles.lockDesc}>This content is available on paid plans</div>
      <button style={lockStyles.upgradeBtn} onClick={onUpgrade}>
        Upgrade — ₹39/month
      </button>
    </div>
  );
}

function ArticleCard({ article, index, level, plan, onUpgrade, onRead }) {
  const locked = isArticleLocked(article, index, level, plan);
  const levelStyle = LEVEL_COLORS[level];

  return (
    <div
      style={{
        ...cardStyles.card,
        cursor: locked ? "default" : "pointer",
        opacity: locked ? 1 : 1,
        position: "relative",
        overflow: "hidden",
      }}
      onClick={() => !locked && onRead(article)}
    >
      {locked && (
        <div style={cardStyles.lockedBanner}>
          <span style={{ fontSize: 11 }}>🔒</span>
          <span>Upgrade to unlock</span>
        </div>
      )}
      <div style={cardStyles.top}>
        <span style={{ ...cardStyles.levelBadge, color: levelStyle.color, background: levelStyle.bg, borderColor: levelStyle.border }}>
          {LEVEL_LABELS[level]}
        </span>
        <span style={cardStyles.readTime}>{article.readTime || "5"} min read</span>
      </div>
      <div style={{ ...cardStyles.title, color: locked ? "#9CA3AF" : "#0A1628" }}>
        {article.title}
      </div>
      <div style={{ ...cardStyles.summary, color: locked ? "#C0BDB8" : "#6B7280" }}>
        {article.summary}
      </div>
      {locked ? (
        <button
          style={cardStyles.upgradeBtn}
          onClick={(e) => { e.stopPropagation(); onUpgrade(); }}
        >
          Upgrade to read →
        </button>
      ) : (
        <div style={cardStyles.readRow}>
          <span style={cardStyles.authorName}>{article.authorName}</span>
          {article.readCount > 0 && (
            <span style={cardStyles.readCount}>{article.readCount} reads</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function ArticlesTab() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState("beginner");

  const plan = profile?.plan || "trial";
  const isTrial = plan === "trial";

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "articles"),
          where("status", "==", "published"),
          where("industry", "==", profile?.industry || ""),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setArticles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (profile) fetchArticles();
  }, [profile]);

  const filtered = articles.filter((a) => a.level === activeLevel);
  const freeCount = isTrial && activeLevel === "beginner" ? 2 : 0;
  const lockedCount = isTrial
    ? activeLevel === "beginner"
      ? Math.max(0, filtered.length - 2)
      : filtered.length
    : 0;

  return (
    <div style={styles.root}>
      {/* Trial banner */}
      {isTrial && (
        <div style={styles.trialBanner}>
          <div style={styles.trialBannerLeft}>
            <span style={styles.trialBannerIcon}>📚</span>
            <div>
              <div style={styles.trialBannerTitle}>Free trial — 2 Beginner articles unlocked</div>
              <div style={styles.trialBannerSub}>Upgrade to access all levels and unlimited reading</div>
            </div>
          </div>
          <button style={styles.trialBannerBtn} onClick={() => navigate("/subscribe")}>
            Upgrade
          </button>
        </div>
      )}

      {/* Level tabs */}
      <div style={styles.levelTabs}>
        {LEVELS.map((lvl) => {
          const isActive = activeLevel === lvl;
          const isFullyLocked = isTrial && lvl !== "beginner";
          const lc = LEVEL_COLORS[lvl];
          return (
            <button
              key={lvl}
              style={{
                ...styles.levelTab,
                background: isActive ? lc.bg : "transparent",
                border: isActive ? `1.5px solid ${lc.border}` : "1.5px solid #E4E2DC",
                color: isActive ? lc.color : "#9CA3AF",
              }}
              onClick={() => setActiveLevel(lvl)}
            >
              {isFullyLocked && <span style={{ fontSize: 11, marginRight: 4 }}>🔒</span>}
              {LEVEL_LABELS[lvl]}
            </button>
          );
        })}
      </div>

      {/* Lock gate for fully locked levels */}
      {isTrial && activeLevel !== "beginner" ? (
        <div style={styles.fullLockWrap}>
          <div style={styles.fullLockCard}>
            <div style={{ fontSize: 40 }}>🔒</div>
            <div style={styles.fullLockTitle}>
              {LEVEL_LABELS[activeLevel]} articles are locked
            </div>
            <div style={styles.fullLockDesc}>
              Upgrade to ₹39/month to unlock all {LEVEL_LABELS[activeLevel].toLowerCase()} and Advanced articles — plus job applications and more.
            </div>
            <button style={styles.fullLockBtn} onClick={() => navigate("/subscribe")}>
              Upgrade now — ₹39/month
            </button>
            <button style={styles.fullLockSecondary} onClick={() => setActiveLevel("beginner")}>
              Back to Beginner articles
            </button>
          </div>
        </div>
      ) : (
        <>
          {loading ? (
            <div style={styles.loading}>Loading articles...</div>
          ) : filtered.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: 32 }}>📝</div>
              <div style={styles.emptyTitle}>No articles yet</div>
              <div style={styles.emptySub}>Check back soon — content is being added for your industry.</div>
            </div>
          ) : (
            <div style={styles.list}>
              {filtered.map((article, i) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  index={i}
                  level={activeLevel}
                  plan={plan}
                  onUpgrade={() => navigate("/subscribe")}
                  onRead={(a) => navigate(`/articles/${a.id}`)}
                />
              ))}
              {/* Locked teaser count */}
              {isTrial && activeLevel === "beginner" && lockedCount > 0 && (
                <div style={styles.lockedTeaser}>
                  <span style={styles.lockedTeaserIcon}>🔒</span>
                  <span style={styles.lockedTeaserText}>
                    {lockedCount} more article{lockedCount > 1 ? "s" : ""} locked
                  </span>
                  <button style={styles.lockedTeaserBtn} onClick={() => navigate("/subscribe")}>
                    Upgrade to read
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  root: { padding: "16px 16px 100px", background: "#F3F2EF", minHeight: "100vh" },
  trialBanner: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#F0FDFB", border: "1px solid #99F6E4", borderRadius: 12,
    padding: "12px 14px", marginBottom: 16, gap: 10,
  },
  trialBannerLeft: { display: "flex", alignItems: "center", gap: 10 },
  trialBannerIcon: { fontSize: 20, flexShrink: 0 },
  trialBannerTitle: { fontSize: 13, fontWeight: 600, color: "#0D9488", fontFamily: "'DM Sans', sans-serif" },
  trialBannerSub: { fontSize: 11, color: "#6B7280", fontFamily: "'DM Sans', sans-serif", marginTop: 2 },
  trialBannerBtn: {
    background: "#0D9488", color: "#fff", border: "none", borderRadius: 8,
    padding: "7px 14px", fontSize: 12, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif", cursor: "pointer", flexShrink: 0,
  },
  levelTabs: { display: "flex", gap: 8, marginBottom: 16 },
  levelTab: {
    flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif", cursor: "pointer", transition: "all 0.15s",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  loading: { textAlign: "center", color: "#9CA3AF", padding: 40, fontFamily: "'DM Sans', sans-serif" },
  empty: { textAlign: "center", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: "#0A1628", fontFamily: "'DM Sans', sans-serif" },
  emptySub: { fontSize: 13, color: "#9CA3AF", fontFamily: "'DM Sans', sans-serif" },
  fullLockWrap: { display: "flex", justifyContent: "center", padding: "24px 0" },
  fullLockCard: {
    background: "#fff", border: "1px solid #E4E2DC", borderRadius: 16,
    padding: "32px 24px", textAlign: "center", maxWidth: 340,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
  },
  fullLockTitle: { fontSize: 17, fontWeight: 700, color: "#0A1628", fontFamily: "'DM Sans', sans-serif" },
  fullLockDesc: { fontSize: 13, color: "#6B7280", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" },
  fullLockBtn: {
    width: "100%", background: "#0D9488", color: "#fff", border: "none",
    borderRadius: 10, padding: "13px 0", fontSize: 14, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
  },
  fullLockSecondary: {
    background: "none", border: "none", color: "#9CA3AF", fontSize: 13,
    fontFamily: "'DM Sans', sans-serif", cursor: "pointer", textDecoration: "underline",
  },
  lockedTeaser: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#fff", border: "1px dashed #E4E2DC", borderRadius: 12,
    padding: "12px 14px",
  },
  lockedTeaserIcon: { fontSize: 16 },
  lockedTeaserText: { flex: 1, fontSize: 13, color: "#9CA3AF", fontFamily: "'DM Sans', sans-serif" },
  lockedTeaserBtn: {
    background: "none", border: "1px solid #0D9488", color: "#0D9488",
    borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
  },
};

const cardStyles = {
  card: {
    background: "#fff", border: "1px solid #E4E2DC", borderRadius: 14,
    padding: "16px 16px 14px", display: "flex", flexDirection: "column", gap: 8,
  },
  lockedBanner: {
    display: "flex", alignItems: "center", gap: 5,
    background: "#FEF9EC", border: "1px solid #FDE68A", borderRadius: 6,
    padding: "4px 10px", fontSize: 11, fontWeight: 600, color: "#B45309",
    fontFamily: "'DM Sans', sans-serif", width: "fit-content",
  },
  top: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  levelBadge: {
    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
    border: "1px solid", fontFamily: "'DM Sans', sans-serif",
  },
  readTime: { fontSize: 11, color: "#9CA3AF", fontFamily: "'DM Sans', sans-serif" },
  title: { fontSize: 15, fontWeight: 700, lineHeight: 1.35, fontFamily: "'DM Sans', sans-serif" },
  summary: { fontSize: 13, lineHeight: 1.55, fontFamily: "'DM Sans', sans-serif" },
  upgradeBtn: {
    alignSelf: "flex-start", background: "none", border: "1px solid #0D9488",
    color: "#0D9488", borderRadius: 8, padding: "6px 14px", fontSize: 12,
    fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
  },
  readRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  authorName: { fontSize: 11, color: "#9CA3AF", fontFamily: "'DM Sans', sans-serif" },
  readCount: { fontSize: 11, color: "#9CA3AF", fontFamily: "'DM Sans', sans-serif" },
};

const lockStyles = {
  overlay: {
    position: "absolute", inset: 0, background: "rgba(255,255,255,0.92)",
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 8, borderRadius: 14, padding: 16,
  },
  iconWrap: { fontSize: 28 },
  lockTitle: { fontSize: 15, fontWeight: 700, color: "#0A1628", fontFamily: "'DM Sans', sans-serif" },
  lockDesc: { fontSize: 12, color: "#6B7280", textAlign: "center", fontFamily: "'DM Sans', sans-serif" },
  upgradeBtn: {
    background: "#0D9488", color: "#fff", border: "none", borderRadius: 10,
    padding: "10px 20px", fontSize: 13, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
  },
};
