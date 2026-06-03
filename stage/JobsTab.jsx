// src/pages/tabs/JobsTab.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../../components/Avatar";
import CompaniesTab from "./CompaniesTab";

function InfinityIcon({ size = 11, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12c-2-2.5-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.5 6-4z"/>
      <path d="M12 12c2 2.5 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.5-6 4z"/>
    </svg>
  );
}

function FeedAvatar({ name, photo, plan, role, size = 42 }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const ringColor = role === "admin" ? "#7C3AED" : plan === "thermite" ? "#0D9488" : plan === "regular" ? "#B45309" : "#9CA3AF";
  const outlineStyle = { outline: `3px solid ${ringColor}`, outlineOffset: "2px" };
  if (photo && (photo.startsWith("http") || photo.startsWith("data:"))) {
    return <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, ...outlineStyle }} />;
  }
  if (photo && photo.startsWith("<svg")) {
    return <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, ...outlineStyle }} dangerouslySetInnerHTML={{ __html: photo }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#0A1628", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.38, fontFamily: "DM Sans, sans-serif", flexShrink: 0, ...outlineStyle }}>
      {initial}
    </div>
  );
}

const TYPE_CONFIG = {
  full_time:  { bg: "#E6FAF8", color: "#0D9488", border: "#0D9488", label: "Full-time" },
  part_time:  { bg: "#FEF3C7", color: "#B45309", border: "#B45309", label: "Part-time" },
  contract:   { bg: "#F5F3FF", color: "#7C3AED", border: "#7C3AED", label: "Contract" },
  remote:     { bg: "#E8F5EE", color: "#057642", border: "#057642", label: "Remote" },
  internship: { bg: "#F0FDFA", color: "#0D9488", border: "#0DA88A", label: "Internship" },
};

function typeCfg(type) {
  return TYPE_CONFIG[type] || { bg: "#F1F5F9", color: "#64748B", border: "#CBD5E1", label: "Job" };
}

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

function RecruiterAvatar({ photoURL, name, size = 36 }) {
  const colors = [
    { bg: "#E1F5EE", color: "#0F6E56" },
    { bg: "#E6F1FB", color: "#185FA5" },
    { bg: "#EEEDFE", color: "#3C3489" },
    { bg: "#FAEEDA", color: "#854F0B" },
    { bg: "#FAECE7", color: "#993C1D" },
  ];
  const c = colors[(name?.charCodeAt(0) || 65) % colors.length];
  const initial = (name || "?").charAt(0).toUpperCase();
  if (photoURL) return <img src={photoURL} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: c.bg, color: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * 0.38), fontWeight: 600, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
      {initial}
    </div>
  );
}

function JobsTabInner({ userData, isTrial, onUpgrade }) {
  const navigate    = useNavigate();
  const { profile } = useAuth();
  const userType    = userData?.userType    || "seeker";
  const industry    = userData?.industry    || "";
  const postCount   = userData?.jobPostCount || 0;
  const industryLabel = industry.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "your industry";

  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved]     = useState({});
  const circling = profile?.circling || [];

  useEffect(() => { if (userData?.uid) fetchJobs(); }, [userData?.uid, userData?.industry, userType]);

  async function fetchJobs() {
    setLoading(true);
    try {
      let q;
      if (userType === "recruiter") {
        q = query(collection(db, "jobs"), where("hrUid", "==", userData.uid));
      } else {
        if (!industry) { setJobs([]); setLoading(false); return; }
        q = query(collection(db, "jobs"), where("industry", "==", industry), where("status", "==", "active"));
      }
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
      setJobs(list);
    } catch (err) { console.error("JobsTab fetch error:", err); }
    setLoading(false);
  }

  async function handleCloseJob(jobId, e) {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "jobs", jobId), { status: "closed" });
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "closed" } : j));
    } catch (err) { console.error(err); }
  }

  function toggleSave(jobId, e) {
    e.stopPropagation();
    setSaved(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  }

  function handlePostJob() {
    if (isTrial) { onUpgrade(); return; }
    navigate("/post-job");
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
        <style>{`@keyframes cSpin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "3px solid #E4E2DC", borderTopColor: "#0D9488", animation: "cSpin 0.7s linear infinite" }} />
      </div>
    );
  }

  /* ── RECRUITER VIEW ── */
  if (userType === "recruiter") {
    const freeLeft   = Math.max(0, 3 - postCount);
    const isPaid     = postCount >= 3;
    const activeJobs = jobs.filter(j => j.status === "active").length;
    const closedJobs = jobs.filter(j => j.status === "closed").length;

    return (
      <div style={s.container}>

        {/* Header */}
        <div style={s.recHeader}>
          <div>
            <h2 style={s.recTitle}>My Jobs</h2>
            <p style={s.recSubtitle}>
              {isTrial ? "Upgrade to post jobs" : isPaid ? "₹9 per additional post" : `${freeLeft} free post${freeLeft !== 1 ? "s" : ""} remaining`}
            </p>
          </div>
          <button style={s.postBtn} onClick={handlePostJob}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {isPaid ? "Post a Job · ₹9" : "Post a Job"}
          </button>
        </div>

        {/* Trial banner */}
        {isTrial && (
          <div style={s.trialBanner}>
            <div>
              <p style={s.trialBannerTitle}>Trial Plan</p>
              <p style={s.trialBannerSub}>Upgrade to start posting jobs and reach candidates.</p>
            </div>
            <button onClick={onUpgrade} style={s.trialBannerBtn}>Upgrade</button>
          </div>
        )}

        {/* Stats cards */}
        {!isTrial && (
          <div style={s.statsRow}>
            <div style={s.statCard}>
              <p style={s.statLabel}>Free posts used</p>
              <p style={s.statValue}>{Math.min(postCount, 3)} <span style={s.statOf}>of 3</span></p>
              <div style={s.progressBg}>
                <div style={{ ...s.progressFill, width: `${Math.min((postCount / 3) * 100, 100)}%`, background: isPaid ? "#EF4444" : "#0D9488" }} />
              </div>
            </div>
            <div style={s.statCard}>
              <p style={s.statLabel}>Active listings</p>
              <p style={s.statValue}>{activeJobs}</p>
              <p style={s.statSub}>{closedJobs} closed</p>
            </div>
          </div>
        )}

        {/* Paid warning banner */}
        {!isTrial && isPaid && (
          <div style={s.paidBanner}>
            <span style={{ fontSize: 14 }}>💳</span>
            <span style={s.paidBannerText}>3 free posts used — each new post costs <strong>₹9</strong> via UPI</span>
          </div>
        )}

        {/* Jobs list */}
        {jobs.length === 0 ? (
          <div style={s.emptyState}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            <p style={s.emptyTitle}>No jobs posted yet</p>
            <p style={s.emptyText}>Your first 3 posts are free. Start hiring today.</p>
            <button style={s.emptyBtn} onClick={handlePostJob}>Post your first job</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Active jobs first */}
            {jobs.filter(j => j.status === "active").length > 0 && (
              <div style={s.sectionLabel}>
                <span style={s.sectionDot} />ACTIVE
              </div>
            )}
            {jobs.filter(j => j.status === "active").map(job => (
              <RecruiterJobCard key={job.id} job={job} onEdit={() => navigate(`/jobs/${job.id}`)} onClose={handleCloseJob} />
            ))}

            {/* Closed jobs */}
            {jobs.filter(j => j.status === "closed").length > 0 && (
              <div style={{ ...s.sectionLabel, marginTop: 4 }}>
                <span style={{ ...s.sectionDot, background: "#9CA3AF" }} />CLOSED
              </div>
            )}
            {jobs.filter(j => j.status === "closed").map(job => (
              <RecruiterJobCard key={job.id} job={job} onEdit={() => navigate(`/jobs/${job.id}`)} onClose={handleCloseJob} closed />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── SEEKER VIEW ── */
  return (
    <div style={s.container}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", padding: "10px 16px", borderBottom: "1px solid #E4E2DC", marginBottom: 0, marginLeft: -16, marginRight: -16, marginTop: -16, paddingLeft: 16, paddingRight: 16 }}>
        <Avatar
          uid={profile?.uid}
          photoURL={profile?.photoURL}
          avatarId={profile?.avatarId || profile?.avatar}
          displayName={profile?.displayName}
          plan={profile?.plan || "trial"}
          role={profile?.role || "participant"}
          size={38}
        />
        <span style={{ fontSize: 15, fontWeight: 600, color: "#0A1628", fontFamily: "DM Sans, sans-serif" }}>Jobs</span>
      </div>

      <div style={s.header}>
        <div>
          <h2 style={s.title}>Jobs</h2>
          <p style={s.subtitle}>Opportunities in <strong>{industryLabel}</strong></p>
        </div>
        {isTrial && <span style={s.trialBadge}>Trial</span>}
      </div>

      {jobs.length === 0 ? (
        <div style={s.emptyState}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          <p style={s.emptyTitle}>No jobs yet in {industryLabel}</p>
          <p style={s.emptyText}>Recruiters are being onboarded. Check back soon.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {jobs.map(job => {
            const cfg     = typeCfg(job.type);
            const locked  = isTrial;
            const isSaved = saved[job.id];
            return (
              <div key={job.id} style={{ ...s.seekerCard, borderLeftColor: cfg.border }} onClick={() => navigate(`/jobs/${job.id}`)}>
                <div style={s.recruiterRow}>
                  <div style={{ position: "relative", flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); if (job.hrUid) navigate(`/profile/${job.hrUid}`, { state: { from: 'jobs', tab: 'jobs' } }); }}>
                    <RecruiterAvatar photoURL={job.hrPhotoURL} name={job.hrName} size={36} />
                    {circling.includes(job.hrUid) && (
                      <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: "#0D9488", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <InfinityIcon size={8} color="#fff" />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); if (job.hrUid) navigate(`/profile/${job.hrUid}`, { state: { from: 'jobs', tab: 'jobs' } }); }}>
                    <div style={{ ...s.hrName, display: "flex", alignItems: "center", gap: 5 }}>
                      {job.hrName}
                      {circling.includes(job.hrUid) && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "#E6FAF8", color: "#0F6E56", borderRadius: 20, padding: "1px 6px", fontSize: 10, fontWeight: 600, fontFamily: "DM Sans, sans-serif" }}>
                          <InfinityIcon size={8} color="#0D9488" /> In your Circle
                        </span>
                      )}
                    </div>
                    <div style={s.companyStr}>{[job.company, job.location].filter(Boolean).join(" · ")}</div>
                  </div>
                  <span style={s.timeStr}>{timeAgo(job.createdAt)}</span>
                </div>
                <div style={s.seekerJobTitle}>{job.title}</div>
                <div style={s.chipRow}>
                  <span style={{ ...s.chip, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  {job.industry && <span style={{ ...s.chip, background: "#F1F5F9", color: "#64748B" }}>{job.industry.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>}
                </div>
                {job.salaryRange && <div style={s.salary}>{job.salaryRange}</div>}
                <div style={s.seekerFooter}>
                  <div style={s.locRow}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>{job.location || "Location not specified"}</span>
                  </div>
                  {locked ? (
                    <button style={s.applyBtn} onClick={e => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}>View Job</button>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ ...s.saveBtn, background: isSaved ? "#E6FAF8" : "#fff", borderColor: isSaved ? "#99F6E4" : "#E4E2DC" }} onClick={e => toggleSave(job.id, e)} title={isSaved ? "Saved" : "Save job"}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill={isSaved ? "#0D9488" : "none"} stroke={isSaved ? "#0D9488" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                      </button>
                      <button style={s.applyBtn} onClick={e => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}>View &amp; Apply</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecruiterJobCard({ job, onEdit, onClose, closed = false }) {
  const cfg = typeCfg(job.type);
  return (
    <div style={{ ...s.recCard, opacity: closed ? 0.65 : 1 }}>
      <div style={{ padding: "12px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.recJobTitle}>{job.title}</div>
            <div style={s.recMeta}>
              {job.company && <span>{job.company}</span>}
              {job.company && job.location && <span style={{ color: "#D1CFC8" }}>·</span>}
              {job.location && <span>{job.location}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <span style={{ ...s.chip, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
              <span style={{ fontSize: 11, color: "#999" }}>{timeAgo(job.createdAt)}</span>
            </div>
          </div>
          <span style={{ ...s.statusBadge, background: closed ? "#F1F5F9" : "#E6FAF8", color: closed ? "#64748B" : "#0D9488", flexShrink: 0 }}>
            {closed ? "Closed" : "Active"}
          </span>
        </div>
      </div>
      {!closed && (
        <div style={s.recFooter}>
          <button style={s.recAction} onClick={e => { e.stopPropagation(); onEdit(); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <div style={{ width: 1, background: "#E4E2DC", alignSelf: "stretch" }} />
          <button style={{ ...s.recAction, color: "#B91C1C" }} onClick={e => onClose(job.id, e)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            Close
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  container:      { padding: "16px", display: "flex", flexDirection: "column", gap: 12, fontFamily: "'DM Sans', sans-serif" },
  // Recruiter
  recHeader:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  recTitle:       { margin: "0 0 2px", fontSize: 20, fontWeight: 700, color: "#0F172A" },
  recSubtitle:    { margin: 0, fontSize: 13, color: "#64748B" },
  postBtn:        { display: "flex", alignItems: "center", padding: "8px 16px", background: "#0D9488", color: "#fff", border: "none", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, fontFamily: "'DM Sans', sans-serif" },
  trialBanner:    { background: "#FEF3C7", border: "1px solid #FCD38A", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  trialBannerTitle: { margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#B45309" },
  trialBannerSub: { margin: 0, fontSize: 12, color: "#92400E" },
  trialBannerBtn: { flexShrink: 0, padding: "7px 14px", background: "#B45309", color: "#fff", border: "none", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  statsRow:       { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },
  statCard:       { background: "#fff", border: "1px solid #E4E2DC", borderRadius: 12, padding: "12px 14px" },
  statLabel:      { margin: "0 0 4px", fontSize: 11, color: "#9CA3AF" },
  statValue:      { margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#0A1628" },
  statOf:         { fontSize: 13, color: "#9CA3AF", fontWeight: 400 },
  statSub:        { margin: 0, fontSize: 11, color: "#0D9488" },
  progressBg:     { height: 4, background: "#E4E2DC", borderRadius: 2, overflow: "hidden" },
  progressFill:   { height: "100%", borderRadius: 2, transition: "width 0.4s ease" },
  paidBanner:     { background: "#FEF3C7", border: "1px solid #FCD38A", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 },
  paidBannerText: { fontSize: 12, color: "#B45309" },
  sectionLabel:   { display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em" },
  sectionDot:     { width: 6, height: 6, borderRadius: "50%", background: "#0D9488", flexShrink: 0 },
  recCard:        { background: "#fff", border: "1px solid #E4E2DC", borderRadius: 12, overflow: "hidden" },
  recJobTitle:    { fontSize: 14, fontWeight: 700, color: "#1A1A1A", marginBottom: 3 },
  recMeta:        { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12, color: "#888" },
  statusBadge:    { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 },
  recFooter:      { display: "flex", alignItems: "center", padding: "9px 14px", borderTop: "1px solid #F3F2EF", background: "#FAFAF9", gap: 16 },
  recAction:      { display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", fontSize: 12, fontWeight: 600, color: "#0D9488", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0 },
  // Seeker
  header:         { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 4 },
  title:          { margin: "0 0 2px", fontSize: 20, fontWeight: 700, color: "#0F172A" },
  subtitle:       { margin: 0, fontSize: 13, color: "#64748B" },
  trialBadge:     { fontSize: 11, background: "#FEF3C7", color: "#B45309", padding: "3px 10px", borderRadius: 20, fontWeight: 600, flexShrink: 0 },
  chip:           { fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20 },
  emptyState:     { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 8, background: "#fff", borderRadius: 14, border: "1.5px dashed #E4E2DC", padding: "32px 24px", textAlign: "center" },
  emptyTitle:     { margin: "4px 0 0", fontSize: 15, fontWeight: 600, color: "#555" },
  emptyText:      { margin: 0, fontSize: 13, color: "#999", lineHeight: 1.5, maxWidth: 240 },
  emptyBtn:       { marginTop: 8, padding: "9px 20px", background: "#0D9488", color: "#fff", border: "none", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  seekerCard:     { background: "#fff", border: "1px solid #E4E2DC", borderLeft: "3px solid #0D9488", borderRadius: 12, padding: "14px 14px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 },
  recruiterRow:   { display: "flex", alignItems: "center", gap: 10 },
  hrName:         { fontSize: 12, fontWeight: 600, color: "#1A1A1A", lineHeight: 1.3 },
  companyStr:     { fontSize: 11, color: "#888", lineHeight: 1.3 },
  timeStr:        { fontSize: 11, color: "#999", flexShrink: 0 },
  seekerJobTitle: { fontSize: 15, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.3 },
  chipRow:        { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  salary:         { fontSize: 13, fontWeight: 600, color: "#057642" },
  seekerFooter:   { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F3F2EF", paddingTop: 10, marginTop: 2 },
  locRow:         { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#888" },
  saveBtn:        { border: "1px solid #E4E2DC", borderRadius: 16, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", background: "#fff", fontFamily: "'DM Sans', sans-serif" },
  applyBtn:       { background: "#0D9488", color: "#fff", border: "none", borderRadius: 16, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
};


export default function JobsTab({ userData, isTrial, onUpgrade }) {
  const [subTab, setSubTab] = useState("jobs");

  return (
    <div>
      {/* Sub-tab header */}
      <div style={{ background: "#0A1628", padding: "0 16px", display: "flex", gap: 0, position: "sticky", top: 0, zIndex: 10 }}>
        <button
          onClick={() => setSubTab("jobs")}
          style={{ padding: "12px 20px", fontSize: 13, fontWeight: 600, color: subTab === "jobs" ? "#0D9488" : "rgba(255,255,255,0.5)", borderBottom: subTab === "jobs" ? "2px solid #0D9488" : "2px solid transparent", background: "none", border: "none", borderBottom: subTab === "jobs" ? "2px solid #0D9488" : "2px solid transparent", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
        >
          Jobs
        </button>
        <button
          onClick={() => setSubTab("companies")}
          style={{ padding: "12px 20px", fontSize: 13, fontWeight: 600, color: subTab === "companies" ? "#0D9488" : "rgba(255,255,255,0.5)", borderBottom: subTab === "companies" ? "2px solid #0D9488" : "2px solid transparent", background: "none", border: "none", borderBottom: subTab === "companies" ? "2px solid #0D9488" : "2px solid transparent", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
        >
          Companies
        </button>
      </div>

      {/* Content */}
      {subTab === "jobs" ? (
        <JobsTabInner userData={userData} isTrial={isTrial} onUpgrade={onUpgrade} />
      ) : (
        <CompaniesTab />
      )}
    </div>
  );
}
