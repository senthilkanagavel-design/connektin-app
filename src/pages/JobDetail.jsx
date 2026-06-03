// src/pages/JobDetail.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export default function JobDetail() {
  const { jobId }  = useParams();
  const navigate   = useNavigate();
  const { user, profile } = useAuth();

  const [job,     setJob]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [closing, setClosing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [toast,   setToast]   = useState(null);

  const isTrialUser = profile?.plan === "trial";
  const isOwner     = job?.hrUid === user?.uid;

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const snap = await getDoc(doc(db, "jobs", jobId));
        if (snap.exists()) setJob({ id: snap.id, ...snap.data() });
        else { showToast("Job not found.", "error"); setTimeout(() => navigate('/dashboard', { state: { tab: 'jobs' } }), 1500); }
      } catch (err) { showToast("Failed to load job.", "error"); }
      finally { setLoading(false); }
    };
    fetchJob();
  }, [jobId]);

  useEffect(() => {
    if (profile?.savedJobs) setIsSaved(profile.savedJobs.includes(jobId));
  }, [profile, jobId]);

  const handleSave = async () => {
    if (isTrialUser) { showToast("Upgrade to save jobs.", "upgrade"); return; }
    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      if (isSaved) { await updateDoc(userRef, { savedJobs: arrayRemove(jobId) }); setIsSaved(false); showToast("Removed from saved jobs."); }
      else { await updateDoc(userRef, { savedJobs: arrayUnion(jobId) }); setIsSaved(true); showToast("Job saved!"); }
    } catch (err) { showToast("Something went wrong.", "error"); }
    finally { setSaving(false); }
  };

  const handleCloseJob = async () => {
    if (!window.confirm("Close this job posting?")) return;
    setClosing(true);
    try {
      await updateDoc(doc(db, "jobs", jobId), { status: "closed" });
      setJob((prev) => ({ ...prev, status: "closed" }));
      showToast("Job closed.");
    } catch (err) { showToast("Failed to close job.", "error"); }
    finally { setClosing(false); }
  };

  const handleApply = () => {
    if (isTrialUser) { showToast("Upgrade to apply for jobs.", "upgrade"); return; }
    if (job.applyLink) window.open(job.applyLink, "_blank", "noopener noreferrer");
    else showToast("Contact the recruiter directly.");
  };

  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const timeAgo = (ts) => {
    if (!ts) return "";
    const seconds = Math.floor((Date.now() - ts.toMillis()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const typeLabel = { full_time: "Full-time", part_time: "Part-time", contract: "Contract", remote: "Remote", internship: "Internship" };
  const typeColor = { full_time: "#0D9488", part_time: "#7C3AED", contract: "#D97706", remote: "#059669", internship: "#DB2777" };

  if (loading) return (
    <div style={s.loadingWrap}>
      <div style={s.spinner} />
      <p style={s.loadingText}>Loading job…</p>
    </div>
  );

  if (!job) return null;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button onClick={() => navigate('/dashboard', { state: { tab: 'jobs' } })} style={s.backBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span style={s.headerTitle}>Job Details</span>
        <div style={{ width: 36 }} />
      </div>

      {job.status === "closed" && (
        <div style={s.closedBanner}>This job has been closed and is no longer accepting applications.</div>
      )}

      <div style={s.card}>
        <h1 style={s.jobTitle}>{job.title}</h1>
        <p style={s.company}>{job.company}</p>

        <div style={s.metaRow}>
          <div style={s.metaItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <span>{job.location}</span>
          </div>
          <span style={{ ...s.typeBadge, background: (typeColor[job.type] || "#0D9488") + "18", color: typeColor[job.type] || "#0D9488", borderColor: (typeColor[job.type] || "#0D9488") + "40" }}>
            {typeLabel[job.type] || job.type}
          </span>
        </div>

        <div style={s.secondaryMeta}>
          <span style={s.industryTag}>{job.industry?.replace(/_/g, " ")}</span>
          <span style={s.dot}>·</span>
          <span>Posted by {job.hrName}</span>
          <span style={s.dot}>·</span>
          <span>{timeAgo(job.createdAt)}</span>
        </div>

        {job.salaryRange && (
          <div style={s.salaryRow}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            <span style={s.salaryText}>{job.salaryRange}</span>
          </div>
        )}

        <div style={s.divider} />

        <div style={s.section}>
          <h2 style={s.sectionTitle}>About the role</h2>
          <p style={s.bodyText}>{job.description}</p>
        </div>
        {job.requirements && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Requirements</h2>
            <p style={s.bodyText}>{job.requirements}</p>
          </div>
        )}
      </div>

      {!isOwner ? (
        <div style={s.actionRow}>
          <button onClick={handleSave} disabled={saving} style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}>
            {saving ? "…" : isSaved ? (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="#0D9488" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>Saved</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>Save</>
            )}
          </button>
          <button onClick={handleApply} disabled={job.status === "closed"} style={{ ...s.applyBtn, opacity: job.status === "closed" ? 0.5 : 1, cursor: job.status === "closed" ? "not-allowed" : "pointer" }}>
            {isTrialUser ? (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>Upgrade to Apply</>)
              : job.status === "closed" ? "Position Closed" : "Apply Now →"}
          </button>
        </div>
      ) : (
        <div style={s.actionRow}>
          <button onClick={() => navigate(`/post-job?edit=${jobId}`)} style={s.saveBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Edit
          </button>
          <button onClick={handleCloseJob} disabled={closing || job.status === "closed"} style={{ ...s.closeJobBtn, opacity: closing || job.status === "closed" ? 0.5 : 1, cursor: closing || job.status === "closed" ? "not-allowed" : "pointer" }}>
            {closing ? "Closing…" : job.status === "closed" ? "Closed" : "Close Job"}
          </button>
        </div>
      )}

      {toast && (
        <div style={{ ...s.toast, background: toast.type === "error" ? "#B91C1C" : toast.type === "upgrade" ? "#7C3AED" : "#1A1A1A" }}>
          {toast.msg}
          {toast.type === "upgrade" && <button onClick={() => navigate("/subscribe")} style={s.toastUpgradeBtn}>Upgrade</button>}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#F3F2EF", fontFamily: "'DM Sans', sans-serif", paddingBottom: "80px" },
  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "12px", background: "#F3F2EF" },
  spinner: { width: 28, height: 28, border: "3px solid #E4E2DC", borderTop: "3px solid #0D9488", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingText: { fontSize: "14px", color: "#666", fontFamily: "'DM Sans', sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#fff", borderBottom: "1px solid #E4E2DC", position: "sticky", top: 0, zIndex: 10 },
  backBtn: { background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", width: 36, height: 36 },
  headerTitle: { fontSize: "16px", fontWeight: "700", color: "#1A1A1A" },
  closedBanner: { background: "#FEF3C7", borderBottom: "1px solid #FCD34D", padding: "10px 16px", fontSize: "13px", color: "#92400E", textAlign: "center", fontFamily: "'DM Sans', sans-serif" },
  card: { background: "#fff", margin: "12px", borderRadius: "14px", padding: "20px 16px", border: "1px solid #E4E2DC" },
  jobTitle: { fontSize: "20px", fontWeight: "700", color: "#1A1A1A", margin: "0 0 4px 0", lineHeight: "1.3" },
  company: { fontSize: "15px", color: "#444", margin: "0 0 12px 0", fontWeight: "500" },
  metaRow: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "8px" },
  metaItem: { display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "#555" },
  typeBadge: { fontSize: "12px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px", border: "1px solid", letterSpacing: "0.2px" },
  secondaryMeta: { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "12px", color: "#888", marginBottom: "12px" },
  industryTag: { textTransform: "capitalize", color: "#0D9488", fontWeight: "600" },
  dot: { color: "#ccc" },
  salaryRow: { display: "flex", alignItems: "center", gap: "6px", background: "#F0FDF4", borderRadius: "8px", padding: "8px 12px", marginBottom: "4px" },
  salaryText: { fontSize: "14px", fontWeight: "600", color: "#059669" },
  divider: { height: "1px", background: "#E4E2DC", margin: "16px 0" },
  section: { marginBottom: "16px" },
  sectionTitle: { fontSize: "14px", fontWeight: "700", color: "#1A1A1A", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.5px" },
  bodyText: { fontSize: "14px", color: "#333", lineHeight: "1.7", margin: 0, whiteSpace: "pre-wrap" },
  actionRow: { display: "flex", gap: "10px", padding: "0 12px", marginTop: "4px" },
  saveBtn: { flex: "0 0 auto", display: "flex", alignItems: "center", gap: "6px", padding: "13px 18px", background: "#fff", border: "1.5px solid #0D9488", borderRadius: "24px", color: "#0D9488", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  applyBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "13px 18px", background: "#0D9488", color: "#fff", border: "none", borderRadius: "24px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  closeJobBtn: { flex: 1, padding: "13px 18px", background: "#B91C1C", color: "#fff", border: "none", borderRadius: "24px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  toast: { position: "fixed", bottom: "90px", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "4px", padding: "10px 18px", borderRadius: "24px", color: "#fff", fontSize: "13px", fontWeight: "500", zIndex: 100, whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", fontFamily: "'DM Sans', sans-serif" },
  toastUpgradeBtn: { marginLeft: "10px", background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.5)", color: "#fff", fontSize: "12px", fontWeight: "600", padding: "3px 10px", borderRadius: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
};
