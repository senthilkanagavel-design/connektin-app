// src/pages/CompanyDetailPage.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts.toDate?.() || new Date(ts);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const TYPE_CONFIG = {
  full_time:  { bg: "#E6FAF8", color: "#0D9488", label: "Full-time" },
  part_time:  { bg: "#FEF3C7", color: "#B45309", label: "Part-time" },
  contract:   { bg: "#F5F3FF", color: "#7C3AED", label: "Contract" },
  remote:     { bg: "#E8F5EE", color: "#057642", label: "Remote" },
  internship: { bg: "#F0FDFA", color: "#0D9488", label: "Internship" },
};

export default function CompanyDetailPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "companies", companyId), snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setCompany(data);
        setFollowing((data.followers || []).includes(user?.uid));
      } else {
        setCompany(null);
      }
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [companyId, user?.uid]);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const q = query(collection(db, "jobs"), where("companyId", "==", companyId), where("status", "==", "active"));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setJobs(list);
      } catch { }
      setJobsLoading(false);
    }
    fetchJobs();
  }, [companyId]);

  async function handleFollow() {
    if (!user) return;
    setFollowLoading(true);
    try {
      const ref = doc(db, "companies", companyId);
      if (following) {
        await updateDoc(ref, { followers: arrayRemove(user.uid) });
        setFollowing(false);
      } else {
        await updateDoc(ref, { followers: arrayUnion(user.uid) });
        setFollowing(true);
      }
    } catch (e) { console.error(e); }
    setFollowLoading(false);
  }

  if (loading) {
    return (
      <div style={s.center}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={s.spinner} />
      </div>
    );
  }

  if (!company) {
    return (
      <div style={s.center}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0A1628", fontFamily: "DM Sans, sans-serif" }}>Company not found</div>
          <button onClick={() => navigate(-1)} style={s.backBtn}>Go back</button>
        </div>
      </div>
    );
  }

  const followerCount = (company.followers || []).length;
  const typeCfg = (type) => TYPE_CONFIG[type] || { bg: "#F1F5F9", color: "#64748B", label: "Job" };

  return (
    <div style={s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Cover + Hero */}
      <div style={s.coverBg}>
        {/* Back */}
        <button onClick={() => navigate(-1)} style={s.backIconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>

        {/* Partner badge */}
        <div style={s.partnerBadge}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Partner</span>
        </div>
      </div>

      {/* Logo + Info */}
      <div style={s.heroSection}>
        <div style={s.logoWrap}>
          {company.logoURL ? (
            <img src={company.logoURL} alt={company.name} style={s.logoImg} />
          ) : (
            <div style={s.logoFallback}>{(company.name || "C")[0].toUpperCase()}</div>
          )}
        </div>

        <div style={s.companyName}>{company.name}</div>
        {company.tagline && <div style={s.tagline}>{company.tagline}</div>}

        {/* Pills */}
        <div style={s.pillRow}>
          {company.location && <span style={s.pill}>📍 {company.location}</span>}
          {company.size && <span style={s.pill}>👥 {company.size}</span>}
          {company.founded && <span style={s.pill}>📅 Est. {company.founded}</span>}
        </div>

        {/* Action buttons */}
        <div style={s.btnRow}>
          <button
            onClick={handleFollow}
            disabled={followLoading}
            style={{ ...s.followBtn, background: following ? "#E6FAF8" : "#0D9488", color: following ? "#0D9488" : "#fff", border: following ? "1px solid #0D9488" : "none" }}
          >
            {following ? "✓ Following" : "🔔 Follow"}
          </button>
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer" style={s.websiteBtn}>
              🌐 Website
            </a>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={s.statsRow}>
        <div style={s.statItem}>
          <div style={s.statNum}>{followerCount > 999 ? `${(followerCount/1000).toFixed(1)}k` : followerCount}</div>
          <div style={s.statLabel}>Followers</div>
        </div>
        <div style={s.statDivider} />
        <div style={s.statItem}>
          <div style={s.statNum}>{jobs.length}</div>
          <div style={s.statLabel}>Open roles</div>
        </div>
        <div style={s.statDivider} />
        <div style={s.statItem}>
          <div style={s.statNum}>{company.responseRate || "—"}</div>
          <div style={s.statLabel}>Response rate</div>
        </div>
      </div>

      {/* About */}
      {company.about && (
        <div style={s.section}>
          <div style={s.sectionTitle}>About</div>
          <div style={s.aboutText}>{company.about}</div>
        </div>
      )}

      {/* Jobs */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.sectionTitle}>Open positions</div>
          {!jobsLoading && <span style={s.jobCountBadge}>{jobs.length} {jobs.length === 1 ? "role" : "roles"}</span>}
        </div>

        {jobsLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <div style={s.spinner} />
          </div>
        ) : jobs.length === 0 ? (
          <div style={s.emptyJobs}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💼</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#555", fontFamily: "DM Sans, sans-serif" }}>No open positions right now</div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 4, fontFamily: "DM Sans, sans-serif" }}>Follow to get notified when they hire</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {jobs.map(job => {
              const cfg = typeCfg(job.type);
              return (
                <div key={job.id} style={s.jobCard} onClick={() => navigate(`/jobs/${job.id}`)}>
                  <div style={s.jobTop}>
                    <div style={{ flex: 1 }}>
                      <div style={s.jobTitle}>{job.title}</div>
                      <div style={s.jobMeta}>{[job.location, job.salaryRange].filter(Boolean).join(" · ")}</div>
                    </div>
                    <span style={{ ...s.typeBadge, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <div style={s.jobFooter}>
                    <span style={s.jobTime}>{timeAgo(job.createdAt)}</span>
                    <span style={s.applyBtn}>View Job →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verified partner footer */}
      <div style={s.verifiedSection}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
        <div style={s.verifiedTitle}>ConnektIn Verified Partner</div>
        <div style={s.verifiedSub}>This company is actively hiring from the ConnektIn community</div>
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}

const s = {
  page:          { minHeight: "100dvh", background: "#F3F2EF", fontFamily: "DM Sans, sans-serif" },
  center:        { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" },
  spinner:       { width: 24, height: 24, border: "3px solid #E4E2DC", borderTop: "3px solid #0D9488", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  coverBg:       { height: 90, background: "linear-gradient(135deg, #0D9488 0%, #0A1628 60%)", position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "14px 14px" },
  backIconBtn:   { background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  partnerBadge:  { display: "flex", alignItems: "center", gap: 4, background: "rgba(13,148,136,0.25)", border: "1px solid rgba(13,148,136,0.4)", borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 600, color: "#0D9488" },
  heroSection:   { background: "#0A1628", padding: "0 16px 22px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" },
  logoWrap:      { width: 68, height: 68, borderRadius: 18, overflow: "hidden", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginTop: -34, marginBottom: 10, border: "3px solid #0A1628", flexShrink: 0 },
  logoImg:       { width: "100%", height: "100%", objectFit: "contain" },
  logoFallback:  { width: 68, height: 68, borderRadius: 18, background: "#0D9488", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 26, fontWeight: 700 },
  companyName:   { fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 },
  tagline:       { fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10, lineHeight: 1.4 },
  pillRow:       { display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", marginBottom: 14 },
  pill:          { fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "3px 9px" },
  btnRow:        { display: "flex", gap: 8, width: "100%" },
  followBtn:     { flex: 1, background: "#0D9488", border: "none", borderRadius: 20, padding: "9px 0", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "DM Sans, sans-serif", transition: "all 0.2s" },
  websiteBtn:    { flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "9px 0", fontSize: 13, fontWeight: 600, color: "#fff", textDecoration: "none", textAlign: "center" },
  statsRow:      { background: "#fff", display: "flex", alignItems: "center", borderBottom: "0.5px solid #E4E2DC" },
  statItem:      { flex: 1, padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center" },
  statNum:       { fontSize: 18, fontWeight: 700, color: "#0D9488" },
  statLabel:     { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
  statDivider:   { width: 1, height: 30, background: "#E4E2DC" },
  section:       { background: "#fff", margin: "8px 0 0", padding: "14px 16px" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle:  { fontSize: 13, fontWeight: 700, color: "#0A1628" },
  jobCountBadge: { fontSize: 11, fontWeight: 600, background: "#E6FAF8", color: "#0D9488", borderRadius: 20, padding: "2px 8px" },
  aboutText:     { fontSize: 13, color: "#444", lineHeight: 1.65 },
  emptyJobs:     { textAlign: "center", padding: "20px 0" },
  jobCard:       { background: "#F9F9F8", border: "1px solid #E4E2DC", borderRadius: 12, padding: "12px 14px", cursor: "pointer" },
  jobTop:        { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  jobTitle:      { fontSize: 14, fontWeight: 700, color: "#0A1628", marginBottom: 3 },
  jobMeta:       { fontSize: 12, color: "#888" },
  typeBadge:     { fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, flexShrink: 0 },
  jobFooter:     { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #EDEDE9", paddingTop: 8 },
  jobTime:       { fontSize: 11, color: "#aaa" },
  applyBtn:      { fontSize: 12, fontWeight: 600, color: "#0D9488" },
  verifiedSection: { background: "rgba(13,148,136,0.05)", border: "0.5px solid rgba(13,148,136,0.2)", margin: "8px 0 0", padding: "16px", textAlign: "center" },
  verifiedTitle: { fontSize: 13, fontWeight: 700, color: "#0A1628", marginBottom: 3 },
  verifiedSub:   { fontSize: 12, color: "#6B7280", lineHeight: 1.5 },
  backBtn:       { marginTop: 16, padding: "8px 20px", background: "#0D9488", color: "#fff", border: "none", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif" },
};
