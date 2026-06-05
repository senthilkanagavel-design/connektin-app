// src/pages/Admin.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, query, where, orderBy, limit, startAfter,
  onSnapshot, getDocs, writeBatch, updateDoc, deleteDoc, doc, addDoc, setDoc, getDoc,
  serverTimestamp, getCountFromServer, increment,
} from "firebase/firestore";
import { db, storage } from "../firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import ReferralCodesAdmin from "../components/admin/ReferralCodesAdmin";

const T = {
  navy:"#0A1628",navyLight:"#0F2040",teal:"#0D9488",tealLight:"#CCFBF1",
  tealDim:"rgba(13,148,136,0.12)",bg:"#F0F4F8",white:"#FFFFFF",border:"#E4E2DC",
  text:"#1A1A1A",muted:"#6B7280",faint:"#9CA3AF",danger:"#DC2626",
  dangerBg:"#FEE2E2",warn:"#F59E0B",warnBg:"#FFFBEB",success:"#10B981",
  successBg:"#D1FAE5",font:"'DM Sans', sans-serif",
};

const PAGE_SIZE = 20;

function timeAgo(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const Icon = {
  overview: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  users:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  article:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  jobs:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  posts:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  stories:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>,
  trash:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  check:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>,
  x:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  close:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  back:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  menu:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  game:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="11" r="1"/><circle cx="17" cy="13" r="1"/><path d="M20.83 14.83a4 4 0 0 1-5.66 0l-7-7a4 4 0 1 1 5.66-5.66l7 7a4 4 0 0 1 0 5.66z"/></svg>,
  referral: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
};

const PLAN_META = {
  admin:    { bg: "#EDE9FE", text: "#5B21B6", label: "Admin" },
  trial:    { bg: "#FEF3C7", text: "#92400E", label: "Trial" },
  thermite: { bg: "#DBEAFE", text: "#1E40AF", label: "Thermite" },
  regular:  { bg: "#D1FAE5", text: "#065F46", label: "Regular" },
};

const LEVEL_META = {
  beginner:     { bg: "#D1FAE5", text: "#065F46" },
  intermediate: { bg: "#DBEAFE", text: "#1E40AF" },
  advanced:     { bg: "#FCE7F3", text: "#9D174D" },
};

const INDUSTRIES = [
  { value: "medical_coding_billing", label: "Medical Coding & Billing" },
  { value: "medical_billing",        label: "Medical Billing" },
  { value: "medical_coding",         label: "Medical Coding" },
  { value: "healthcare",             label: "Healthcare" },
  { value: "information_technology", label: "Information Technology" },
  { value: "banking_finance",        label: "Banking & Finance" },
  { value: "education",              label: "Education" },
  { value: "manufacturing",          label: "Manufacturing" },
];

function Badge({ label, bg, text }) {
  return <span style={{ background: bg, color: text, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, letterSpacing: 0.2, whiteSpace: "nowrap", fontFamily: T.font }}>{label}</span>;
}

function Loader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "56px 0" }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTopColor: T.teal, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}

function Empty({ message, icon = "📭" }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px", color: T.faint, fontSize: 14, fontFamily: T.font }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      {message}
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: T.white, borderRadius: 16, padding: "28px 24px", maxWidth: 380, width: "100%", fontFamily: T.font, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 28, textAlign: "center", marginBottom: 12 }}>⚠️</div>
        <p style={{ fontSize: 15, color: T.text, marginBottom: 24, lineHeight: 1.6, textAlign: "center" }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1.5px solid " + T.border, background: T.white, color: T.muted, fontFamily: T.font, fontSize: 14, cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: T.danger, color: T.white, fontFamily: T.font, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.font }}>{title}</h2>
      {action}
    </div>
  );
}

function FilterPills({ options, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{ padding: "7px 18px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font, transition: "all 0.15s", background: active === o.value ? T.teal : "#EEF2F7", color: active === o.value ? T.white : "#4B5563", border: "none", boxShadow: active === o.value ? "0 2px 8px rgba(13,148,136,0.3)" : "none" }}>{o.label}</button>
      ))}
    </div>
  );
}

function LoadMoreBtn({ onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px 0", background: T.white, border: "1.5px solid " + T.border, borderRadius: 12, fontSize: 14, fontWeight: 600, color: T.teal, cursor: loading ? "not-allowed" : "pointer", fontFamily: T.font, marginTop: 12, opacity: loading ? 0.6 : 1 }}>
      {loading ? "Loading…" : "Load More"}
    </button>
  );
}

// ── OVERVIEW TAB ───────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats]         = useState({ total:0, thermite:0, regular:0, trial:0, recruiters:0, admins:0, pendingArticles:0, activeJobs:0, posts:0, stories:0 });
  const [allUsers, setAllUsers]   = useState([]);
  const [industries, setIndustries] = useState({});
  const [loading, setLoading]     = useState(true);
  const [popup, setPopup]         = useState(null); // { title, users, message }

  useEffect(() => {
    async function load() {
      try {
        const [usersSnap, pending, jobs, posts, stories] = await Promise.all([
          getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"))),
          getCountFromServer(query(collection(db, "articles"), where("status", "==", "pending"))),
          getCountFromServer(query(collection(db, "jobs"), where("status", "==", "active"))),
          getCountFromServer(collection(db, "posts")),
          getCountFromServer(collection(db, "stories")),
        ]);
        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllUsers(users);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const indMap = {};
        users.forEach(u => {
          const ind = u.industry || "unknown";
          indMap[ind] = (indMap[ind] || 0) + 1;
        });
        setIndustries(indMap);
        setStats({
          total:           users.length,
          thermite:        users.filter(u => u.plan === "thermite").length,
          regular:         users.filter(u => u.plan === "regular").length,
          trial:           users.filter(u => u.plan === "trial").length,
          recruiters:      users.filter(u => u.userType === "recruiter").length,
          admins:          users.filter(u => u.role === "admin").length,
          active7d:        users.filter(u => u.lastLoginAt?.toDate?.() > sevenDaysAgo).length,
          inactive7d:      users.filter(u => !u.lastLoginAt || u.lastLoginAt?.toDate?.() <= sevenDaysAgo).length,
          pendingArticles: pending.data().count,
          activeJobs:      jobs.data().count,
          posts:           posts.data().count,
          stories:         stories.data().count,
        });
      } catch(e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <Loader />;

  const paidCount  = stats.thermite + stats.regular;
  const convRate   = stats.total > 0 ? Math.round((paidCount / stats.total) * 100) : 0;
  const estRevenue = (stats.thermite * 49).toLocaleString("en-IN");

  function openPopup(title, filterFn, message) {
    const users = filterFn ? allUsers.filter(filterFn) : [];
    setPopup({ title, users, message });
  }

  const Card = ({ label, value, sub, color, onClick, alert }) => (
    <div onClick={onClick} style={{ background: T.white, borderRadius: 12, padding: "14px 16px", border: alert ? `1.5px solid #FCD34D` : `1px solid ${T.border}`, cursor: onClick ? "pointer" : "default", transition: "border-color 0.15s" }}>
      <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || T.text, fontFamily: T.font, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.faint, fontFamily: T.font, marginTop: 4 }}>{sub}</div>}
      {alert && <div style={{ fontSize: 11, color: "#92400E", fontWeight: 600, background: T.warnBg, padding: "3px 8px", borderRadius: 6, fontFamily: T.font, marginTop: 6, display: "inline-block" }}>Needs review</div>}
    </div>
  );

  const topIndustries = Object.entries(industries).sort((a,b) => b[1]-a[1]).slice(0, 5);

  return (
    <div>
      {/* Popup */}
      {popup && (
        <div onClick={() => setPopup(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.white, borderRadius: 16, padding: "22px 20px", width: "100%", maxWidth: 480, maxHeight: "75vh", overflowY: "auto", fontFamily: T.font }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{popup.title}</span>
              <button onClick={() => setPopup(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.faint }}>✕</button>
            </div>
            {popup.message && <div style={{ background: T.warnBg, border: `1px solid #FCD34D`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400E", marginBottom: 14, fontFamily: T.font }}>{popup.message}</div>}
            {popup.users.length === 0 && <div style={{ textAlign: "center", color: T.faint, padding: "24px 0", fontSize: 13 }}>No users in this group</div>}
            {popup.users.slice(0, 50).map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `0.5px solid ${T.border}` }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#0A1628", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0, fontFamily: T.font }}>{(u.displayName||u.email||"?")[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font }}>{u.displayName || "—"}</div>
                  <div style={{ fontSize: 11, color: T.faint, fontFamily: T.font }}>{u.email} · {u.plan || "trial"}</div>
                </div>
              </div>
            ))}
            {popup.users.length > 50 && <div style={{ textAlign: "center", fontSize: 12, color: T.faint, padding: "12px 0" }}>Showing 50 of {popup.users.length}</div>}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: T.muted, fontFamily: T.font }}>Launch Day Overview</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, background: "#D1FAE5", color: "#065F46", padding: "4px 12px", borderRadius: 20, fontFamily: T.font }}>● Live</span>
      </div>

      {/* Row 1 — Key metrics */}
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10, fontFamily: T.font }}>Key metrics</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
        <Card label="Total users" value={stats.total} sub={`${paidCount} paid · ${convRate}% conversion`} onClick={() => openPopup(`All users (${stats.total})`, null, null)} />
        <Card label="Est. revenue" value={`₹${estRevenue}`} sub="Thermite × ₹49/month" color={T.teal} onClick={() => openPopup("Revenue breakdown", u => u.plan === "thermite", "Payment gateway not yet live. Revenue is estimated based on Thermite users.")} />
        <Card label="Today's signups" value={allUsers.filter(u => { const d = u.createdAt?.toDate?.(); return d && d > new Date(new Date().setHours(0,0,0,0)); }).length} sub="Since midnight" onClick={() => openPopup("Today's signups", u => { const d = u.createdAt?.toDate?.(); return d && d > new Date(new Date().setHours(0,0,0,0)); }, null)} />
        <Card label="Conversion" value={`${convRate}%`} sub="Trial → Paid" color={convRate > 50 ? T.teal : "#F59E0B"} onClick={() => openPopup("Paid users", u => u.plan === "thermite" || u.plan === "regular", null)} />
      </div>

      {/* Row 2 — Segments */}
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10, fontFamily: T.font }}>User segments</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
        <Card label="Thermite" value={stats.thermite} sub={`${stats.total > 0 ? Math.round(stats.thermite/stats.total*100) : 0}% · click to view`} color={T.teal} onClick={() => openPopup(`Thermite users (${stats.thermite})`, u => u.plan === "thermite", null)} />
        <Card label="Trial" value={stats.trial} sub={`${stats.total > 0 ? Math.round(stats.trial/stats.total*100) : 0}% · click to view`} color="#F59E0B" onClick={() => openPopup(`Trial users (${stats.trial})`, u => u.plan === "trial", "Consider sending a broadcast to nudge trial users to upgrade.")} />
        <Card label="Admins" value={stats.admins} sub="Click to view" color="#7C3AED" onClick={() => openPopup(`Admin users (${stats.admins})`, u => u.role === "admin", null)} />
        <Card label="Recruiters" value={stats.recruiters} sub="Click to view" color="#0A4FA8" onClick={() => openPopup(`Recruiters (${stats.recruiters})`, u => u.userType === "recruiter", null)} />
      </div>

      {/* Row 3 — Engagement */}
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10, fontFamily: T.font }}>Engagement</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
        <Card label="Active (7 days)" value={stats.active7d || "—"} sub="Logged in last 7d" color={T.teal} onClick={() => openPopup("Active users (last 7 days)", u => u.lastLoginAt?.toDate?.() > new Date(Date.now() - 7*24*60*60*1000), null)} />
        <Card label="Inactive (7d+)" value={stats.inactive7d || "—"} sub="Re-engage · click" color="#F59E0B" onClick={() => openPopup("Inactive 7+ days", u => !u.lastLoginAt || u.lastLoginAt?.toDate?.() <= new Date(Date.now() - 7*24*60*60*1000), "Consider sending a re-engagement broadcast to these users.")} />
        <Card label="Total posts" value={stats.posts} sub="Community posts" />
        <Card label="Total stories" value={stats.stories} sub="Active stories" />
      </div>

      {/* Row 4 — Content */}
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10, fontFamily: T.font }}>Content</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
        <Card label="Pending articles" value={stats.pendingArticles} sub="Click to review" alert={stats.pendingArticles > 0} onClick={() => openPopup(`Pending articles (${stats.pendingArticles})`, null, "Go to Articles tab to approve or reject.")} />
        <Card label="Active jobs" value={stats.activeJobs} sub="Live listings" />
      </div>

      {/* Row 5 — Industry */}
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10, fontFamily: T.font }}>Industry breakdown</div>
      <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        {topIndustries.map(([ind, count], i) => {
          const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
          const label = ind.replace(/_/g, " ").replace(/\w/g, c => c.toUpperCase());
          return (
            <div key={ind} onClick={() => openPopup(`${label} (${count})`, u => (u.industry || "unknown") === ind, null)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < topIndustries.length - 1 ? `0.5px solid ${T.border}` : "none", cursor: "pointer" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font }}>{label}</div>
                <div style={{ marginTop: 4, height: 4, borderRadius: 4, background: T.border, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: T.teal, borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: T.font }}>{count}</span>
                <span style={{ fontSize: 11, background: "#E6FAF8", color: "#085041", padding: "2px 7px", borderRadius: 20, fontFamily: T.font }}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ── CREATE ARTICLE FORM ────────────────────────────────────────────────────────
function CreateArticleForm({ onClose, onSuccess }) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({ title: "", summary: "", content: "", level: "beginner", industry: "medical_coding_billing", readTime: "5" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  function handleCoverChange(e) { const file = e.target.files[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5MB."); return; } setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }
  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }
  async function handleSave() {
    if (!form.title.trim() || !form.summary.trim() || !form.content.trim()) { setError("Title, summary and content are required."); return; }
    setSaving(true); setError("");
    try {
      let coverImageUrl = null;
      if (coverFile) { const ext = coverFile.name.split(".").pop(); const storageRef = ref(storage, `articles/covers/${Date.now()}_${user.uid}.${ext}`); await uploadBytes(storageRef, coverFile); coverImageUrl = await getDownloadURL(storageRef); }
      await addDoc(collection(db, "articles"), { title: form.title.trim(), summary: form.summary.trim(), content: form.content.trim(), level: form.level, industry: form.industry, readTime: form.readTime + " min", status: "published", authorName: profile?.displayName || "Admin", authorUid: user.uid, authorPhoto: profile?.photoURL || null, coverImage: coverImageUrl, createdAt: serverTimestamp(), publishedAt: serverTimestamp(), readCount: 0, likeCount: 0 });
      onSuccess();
    } catch (e) { console.error(e); setError("Failed to save. Try again."); } finally { setSaving(false); }
  }
  const inp = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid " + T.border, borderRadius: 8, fontSize: 14, fontFamily: T.font, outline: "none", background: T.white, color: T.text, marginBottom: 12 };
  const lbl = { fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: T.font };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: T.white, borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", fontFamily: T.font }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><span style={{ fontSize: 17, fontWeight: 700, color: T.text }}>✍️ Create Article</span><button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.faint }}>✕</button></div>
        {error && <div style={{ background: T.dangerBg, color: "#991B1B", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <label style={lbl}>Title *</label><input style={inp} placeholder="Article title…" value={form.title} onChange={e => set("title", e.target.value)} />
        <label style={lbl}>Summary *</label><textarea style={{ ...inp, minHeight: 72, resize: "vertical" }} placeholder="2–3 sentence overview…" value={form.summary} onChange={e => set("summary", e.target.value)} />
        <label style={lbl}>Content *</label><textarea style={{ ...inp, minHeight: 160, resize: "vertical" }} placeholder="Full article content…" value={form.content} onChange={e => set("content", e.target.value)} />
        <label style={lbl}>Cover Image (optional)</label>
        <div onClick={() => document.getElementById("cover-upload").click()} style={{ border: `2px dashed ${T.border}`, borderRadius: 10, padding: 14, marginBottom: 12, cursor: "pointer", textAlign: "center", background: "#FAFAFA" }}>
          {coverPreview ? <img src={coverPreview} alt="cover" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8 }} /> : <div style={{ color: T.faint, fontSize: 13, padding: "8px 0" }}><div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div><div style={{ fontWeight: 600 }}>Tap to upload cover image</div><div style={{ fontSize: 11, marginTop: 4 }}>JPG, PNG · Max 5MB</div></div>}
          <input id="cover-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={handleCoverChange} />
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}><label style={lbl}>Level</label><select style={{ ...inp, marginBottom: 0 }} value={form.level} onChange={e => set("level", e.target.value)}>{["beginner","intermediate","advanced"].map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>)}</select></div>
          <div style={{ flex: 1 }}><label style={lbl}>Read Time (min)</label><input style={{ ...inp, marginBottom: 0 }} type="number" min="1" max="60" value={form.readTime} onChange={e => set("readTime", e.target.value)} /></div>
        </div>
        <label style={lbl}>Industry</label>
        <select style={inp} value={form.industry} onChange={e => set("industry", e.target.value)}>{INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}</select>
        <button onClick={handleSave} disabled={saving} style={{ width: "100%", background: T.teal, color: T.white, border: "none", borderRadius: 10, padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: T.font, opacity: saving ? 0.6 : 1 }}>{saving ? "Publishing…" : "✅ Publish Article"}</button>
      </div>
    </div>
  );
}

// ── ARTICLES TAB ───────────────────────────────────────────────────────────────
function ArticlesTab() {
  const [articles, setArticles] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [acting, setActing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [readingArticle, setReadingArticle] = useState(null);
  useEffect(() => {
    setLoading(true);
    const q = filter === "all" ? query(collection(db, "articles"), orderBy("createdAt", "desc")) : query(collection(db, "articles"), where("status", "==", filter), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => { setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    return unsub;
  }, [filter]);
  async function approve(id) {
    setActing(id + "_approve");
    try {
      const articleRef = doc(db, "articles", id);
      const articleSnap = await getDoc(articleRef);
      const article = articleSnap.data();
      const authorUid = article?.authorUid; const authorName = article?.authorName || "Someone"; const authorPhoto = article?.authorPhoto || null; const title = article?.title || "New article";
      await updateDoc(articleRef, { status: "published", publishedAt: serverTimestamp() });
      if (authorUid) {
        await updateDoc(doc(db, "users", authorUid), { weeklySignal: increment(15), monthlySignal: increment(15), allTimeSignal: increment(15) });
        const authorSnap = await getDoc(doc(db, "users", authorUid));
        const circleMembers = authorSnap.data()?.circleMembers || [];
        if (circleMembers.length > 0) {
          const batch = writeBatch(db);
          circleMembers.forEach(memberUid => { const notifRef = doc(collection(db, "notifications")); batch.set(notifRef, { uid: memberUid, type: "new_article", group: "content", fromUid: authorUid, fromName: authorName, fromPhoto: authorPhoto, articleId: id, message: `published a new article: "${title}"`, read: false, createdAt: serverTimestamp() }); });
          await batch.commit();
        }
      }
    } catch (e) { console.error("Approve error:", e); }
    setActing(null);
  }
  async function reject(id) { setActing(id + "_reject"); await updateDoc(doc(db, "articles", id), { status: "rejected" }); setActing(null); setConfirm(null); }
  return (
    <div>
      {confirm && <ConfirmDialog message={`Reject "${confirm.title}"? This will hide it from all users.`} onConfirm={() => reject(confirm.id)} onCancel={() => setConfirm(null)} />}
      {readingArticle && (
        <div onClick={() => setReadingArticle(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.white, borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", fontFamily: T.font }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>📖 Preview Article</span>
              <button onClick={() => setReadingArticle(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.faint }}>✕</button>
            </div>
            {readingArticle.coverImage && <img src={readingArticle.coverImage} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 12, marginBottom: 16 }} />}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <Badge label={readingArticle.level} bg={(LEVEL_META[readingArticle.level]||LEVEL_META.beginner).bg} text={(LEVEL_META[readingArticle.level]||LEVEL_META.beginner).text} />
              <Badge label={readingArticle.industry?.replace(/_/g," ")} bg="#F3F2EF" text="#6B7280" />
              <Badge label={readingArticle.readTime || "5 min"} bg="#F3F2EF" text="#6B7280" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 10, lineHeight: 1.3, fontFamily: T.font }}>{readingArticle.title}</div>
            <div style={{ fontSize: 14, color: T.teal, fontStyle: "italic", lineHeight: 1.6, marginBottom: 16, padding: "10px 14px", borderLeft: `3px solid ${T.teal}`, background: "#F0FDFB", borderRadius: "0 8px 8px 0", fontFamily: T.font }}>{readingArticle.summary}</div>
            <div style={{ fontSize: 14, color: T.text, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: T.font }}>{readingArticle.content}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.navy, color: T.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{(readingArticle.authorName||"A")[0].toUpperCase()}</div>
              <span style={{ fontSize: 12, color: T.faint, fontFamily: T.font }}>By {readingArticle.authorName || "Unknown"}</span>
            </div>
            {readingArticle.status === "pending" && (
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={() => { approve(readingArticle.id); setReadingArticle(null); }} style={{ flex: 1, padding: "12px 0", background: T.success, color: T.white, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>✓ Approve</button>
                <button onClick={() => { setConfirm({ id: readingArticle.id, title: readingArticle.title }); setReadingArticle(null); }} style={{ flex: 1, padding: "12px 0", background: T.white, color: T.danger, border: `1.5px solid #FCA5A5`, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>✕ Reject</button>
              </div>
            )}
          </div>
        </div>
      )}
      <SectionHeader title="Articles" action={<button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: T.teal, color: T.white, border: "none", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>✍️ Create Article</button>} />
      {showCreate && <CreateArticleForm onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); setFilter("published"); }} />}
      <FilterPills options={[{value:"pending",label:"Pending"},{value:"published",label:"Published"},{value:"rejected",label:"Rejected"},{value:"all",label:"All"}]} active={filter} onChange={setFilter} />
      {loading ? <Loader /> : articles.length === 0 ? <Empty message={`No ${filter} articles`} icon="📄" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {articles.map(a => {
            const lvl = LEVEL_META[a.level] || LEVEL_META.beginner; const isPending = a.status === "pending";
            return (
              <div key={a.id} style={{ background: T.white, borderRadius: 14, padding: "18px 20px", border: isPending ? `1.5px solid #FCD34D` : `1px solid ${T.border}`, boxShadow: isPending ? "0 2px 12px rgba(245,158,11,0.1)" : "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 12 }}>
                  <button onClick={() => setReadingArticle(a)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.white, color: T.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>👁 Read</button>
                  {isPending && <><button onClick={() => approve(a.id)} disabled={acting === a.id + "_approve"} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "none", background: T.success, color: T.white, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font, opacity: acting === a.id + "_approve" ? 0.6 : 1 }}>{Icon.check} Approve</button><button onClick={() => setConfirm({ id: a.id, title: a.title })} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: `1.5px solid #FCA5A5`, background: T.white, color: T.danger, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>{Icon.x} Reject</button></>}
                </div>
                {a.coverImage && <img src={a.coverImage} alt="" style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 10, display: "block", marginBottom: 12 }} />}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}><Badge label={a.level} bg={lvl.bg} text={lvl.text} /><Badge label={a.status} bg={a.status==="published"?T.successBg:a.status==="rejected"?T.dangerBg:T.warnBg} text={a.status==="published"?"#065F46":a.status==="rejected"?"#991B1B":"#92400E"} /><span style={{ fontSize: 12, color: T.faint, fontFamily: T.font }}>{timeAgo(a.createdAt)}</span></div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4, fontFamily: T.font }}>{a.title}</div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, fontFamily: T.font }}>{a.summary}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}><div style={{ width: 22, height: 22, borderRadius: "50%", background: T.navy, color: T.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{(a.authorName||"A")[0].toUpperCase()}</div><span style={{ fontSize: 12, color: T.faint, fontFamily: T.font }}>{a.authorName || "Unknown"} · {a.industry?.replace(/_/g," ")} · {a.readTime || "—"} read</span></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── USERS TAB ──────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("trial");
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    const unsub = onSnapshot(q, snap => { setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLastDoc(snap.docs[snap.docs.length - 1] || null); setHasMore(snap.docs.length === PAGE_SIZE); setLoading(false); });
    getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"))).then(snap => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);
  async function loadMore() {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));
    const snap = await getDocs(q);
    setUsers(prev => [...prev, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))]);
    setLastDoc(snap.docs[snap.docs.length - 1] || null); setHasMore(snap.docs.length === PAGE_SIZE); setLoadingMore(false);
  }
  async function changePlan(uid, plan) {
    setUpdating(uid);
    try {
      const userType = plan === "recruiter" ? "recruiter" : "seeker";
      await updateDoc(doc(db, "users", uid), {
        plan,
        isTherMite: plan === "thermite",
        userType,
      });
      if (plan === "thermite") {
        await addDoc(collection(db, "notifications"), {
          uid,
          type: "plan_upgrade",
          group: "system",
          fromUid: "system",
          fromName: "ConnektIn",
          fromPhoto: null,
          title: "🎉 Welcome to Thermite!",
          message: "Your account has been upgraded to the Thermite plan. You now have full access to all articles, jobs, community features, and live webinars. Welcome aboard!",
          read: false,
          createdAt: serverTimestamp(),
        });
      }
      // Refresh both lists in state immediately
      const update = u => u.id === uid ? { ...u, plan, isTherMite: plan === "thermite", userType } : u;
      setUsers(prev => prev.map(update));
      setAllUsers(prev => prev.map(update));
    } catch (err) {
      console.error("changePlan error:", err);
    } finally {
      setUpdating(null);
    }
  }
  async function toggleAdmin(uid, currentRole) {
    setUpdating(uid);
    try {
      const newRole = currentRole === "admin" ? "participant" : "admin";
      await updateDoc(doc(db, "users", uid), { role: newRole });
      const update = u => u.id === uid ? { ...u, role: newRole } : u;
      setUsers(prev => prev.map(update));
      setAllUsers(prev => prev.map(update));
    } catch (err) {
      console.error("toggleAdmin error:", err);
    } finally {
      setUpdating(null);
    }
  }

  const planFilters = [{ value: "trial", label: "Trial" }, { value: "thermite", label: "Thermite" }, { value: "regular", label: "Regular" }, { value: "recruiter", label: "Recruiters" }, { value: "all", label: "All" }];
  const sourceList = allUsers.length > 0 ? allUsers : users;
  const filtered = sourceList.filter(u => {
    const matchSearch = !search || u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === "all" ? true : planFilter === "recruiter" ? u.userType === "recruiter" : u.plan === planFilter;
    return matchSearch && matchPlan;
  });
  return (
    <div>
      <SectionHeader title={`Users (${allUsers.length > 0 ? allUsers.length : users.length + (hasMore ? "+" : "")})`} />
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: "9px 14px", borderRadius: 10, border: "1.5px solid " + T.border, fontSize: 14, fontFamily: T.font, outline: "none", background: T.white }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {planFilters.map(f => <button key={f.value} onClick={() => setPlanFilter(f.value)} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap", background: planFilter === f.value ? T.teal : T.white, color: planFilter === f.value ? T.white : T.muted, border: planFilter === f.value ? `1.5px solid ${T.teal}` : `1.5px solid ${T.border}` }}>{f.label}</button>)}
        </div>
      </div>
      {loading ? <Loader /> : filtered.length === 0 ? <Empty message="No users found" icon="👥" /> : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(u => {
              const pm = PLAN_META[u.plan] || PLAN_META.trial;
              const isTrial = u.plan === "trial" && u.userType !== "recruiter";
              return (
                <div key={u.id} style={{ background: T.white, borderRadius: 12, padding: "14px 18px", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${T.teal}, #0ea5e9)`, color: T.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, fontFamily: T.font }}>{(u.displayName || u.email || "?")[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: T.font }}>{u.displayName || "—"}</div>
                    <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font }}>{u.email}</div>
                    <div style={{ fontSize: 11, color: T.faint, marginTop: 2, fontFamily: T.font }}>{u.industry?.replace(/_/g," ")} · {u.userType} · joined {timeAgo(u.createdAt)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Badge label={pm.label} bg={pm.bg} text={pm.text} />
                    {u.role === "admin" && <Badge label="Admin" bg="#EDE9FE" text="#5B21B6" />}
                    {isTrial && <button onClick={() => changePlan(u.id, "thermite")} disabled={updating === u.id} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: T.teal, color: T.white, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: T.font, opacity: updating === u.id ? 0.5 : 1 }}>{updating === u.id ? "…" : "↑ Thermite"}</button>}
                    <button onClick={() => toggleAdmin(u.id, u.role)} disabled={updating === u.id} style={{ padding: "5px 12px", borderRadius: 8, border: "1.5px solid " + (u.role === "admin" ? "#FCA5A5" : "#C4B5FD"), background: u.role === "admin" ? "#FEF2F2" : "#EDE9FE", color: u.role === "admin" ? "#DC2626" : "#5B21B6", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: T.font, opacity: updating === u.id ? 0.5 : 1 }}>{updating === u.id ? "…" : u.role === "admin" ? "− Admin" : "+ Admin"}</button>
                    <select value={u.plan || "trial"} onChange={e => changePlan(u.id, e.target.value)} disabled={updating === u.id} style={{ padding: "5px 10px", borderRadius: 8, border: "1.5px solid " + T.border, fontSize: 12, fontFamily: T.font, cursor: "pointer", background: T.white, color: T.text, outline: "none", opacity: updating === u.id ? 0.5 : 1 }}>
                      {["trial","thermite","regular"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
          {hasMore && !search && <LoadMoreBtn onClick={loadMore} loading={loadingMore} />}
        </>
      )}
    </div>
  );
}

// ── JOBS TAB ───────────────────────────────────────────────────────────────────
function JobsTab() {
  const [jobs, setJobs] = useState([]); const [loading, setLoading] = useState(true); const [filter, setFilter] = useState("active"); const [confirm, setConfirm] = useState(null); const [acting, setActing] = useState(null);
  useEffect(() => {
    setLoading(true);
    async function fetch() {
      try { const snap = await getDocs(collection(db, "jobs")); const all = snap.docs.map(d => ({ id: d.id, ...d.data() })); const filtered = filter === "all" ? all : all.filter(j => j.status === filter); setJobs(filtered.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))); }
      catch (e) { console.error(e); setJobs([]); } finally { setLoading(false); }
    }
    fetch();
  }, [filter]);
  async function closeJob(id) { setActing(id); await updateDoc(doc(db, "jobs", id), { status: "closed" }); setActing(null); setConfirm(null); }
  return (
    <div>
      {confirm && <ConfirmDialog message={`Close "${confirm.title}"? It will no longer appear in job listings.`} onConfirm={() => closeJob(confirm.id)} onCancel={() => setConfirm(null)} />}
      <SectionHeader title="Jobs" />
      <FilterPills options={[{value:"active",label:"Active"},{value:"closed",label:"Closed"},{value:"all",label:"All"}]} active={filter} onChange={setFilter} />
      {loading ? <Loader /> : jobs.length === 0 ? <Empty message={`No ${filter} jobs`} icon="💼" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {jobs.map(j => (
            <div key={j.id} style={{ background: T.white, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: T.font }}>{j.title}</div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 2, fontFamily: T.font }}>{j.company} · {j.location} · {j.type?.replace("_"," ")}</div>
                <div style={{ fontSize: 12, color: T.faint, marginTop: 4, fontFamily: T.font }}>Posted by {j.hrName || "—"} · {timeAgo(j.createdAt)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Badge label={j.status} bg={j.status==="active"?T.successBg:"#F3F4F6"} text={j.status==="active"?"#065F46":T.muted} />
                {j.status === "active" && <button onClick={() => setConfirm({ id: j.id, title: j.title })} disabled={acting === j.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: `1.5px solid #FCA5A5`, background: T.white, color: T.danger, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>{Icon.close} Close</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── POSTS TAB ──────────────────────────────────────────────────────────────────
function PostsTab() {
  const [posts, setPosts] = useState([]); const [loading, setLoading] = useState(true); const [lastDoc, setLastDoc] = useState(null); const [hasMore, setHasMore] = useState(false); const [loadingMore, setLoadingMore] = useState(false); const [confirm, setConfirm] = useState(null); const [acting, setActing] = useState(null); const [dateFilter, setDateFilter] = useState("today");
  useEffect(() => {
    setLoading(true); setPosts([]); setLastDoc(null);
    const q = query(collection(db, "posts"), orderBy("ts", "desc"), limit(PAGE_SIZE));
    const unsub = onSnapshot(q, snap => { const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })); setPosts(docs); setLastDoc(snap.docs[snap.docs.length - 1] || null); setHasMore(snap.docs.length === PAGE_SIZE); setLoading(false); });
    return unsub;
  }, []);
  async function loadMore() {
    if (!lastDoc || loadingMore) return; setLoadingMore(true);
    const q = query(collection(db, "posts"), orderBy("ts", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));
    const snap = await getDocs(q);
    setPosts(prev => [...prev, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))]); setLastDoc(snap.docs[snap.docs.length - 1] || null); setHasMore(snap.docs.length === PAGE_SIZE); setLoadingMore(false);
  }
  async function deletePost(id) { setActing(id); await deleteDoc(doc(db, "posts", id)); setActing(null); setConfirm(null); }
  const now = new Date();
  const filtered = posts.filter(p => { if (dateFilter === "all") return true; const d = p.ts?.toDate?.() || new Date(0); if (dateFilter === "today") return d.toDateString() === now.toDateString(); if (dateFilter === "week") return (now - d) < 7 * 86400000; if (dateFilter === "month") return (now - d) < 30 * 86400000; return true; });
  return (
    <div>
      {confirm && <ConfirmDialog message="Permanently delete this post? This cannot be undone." onConfirm={() => deletePost(confirm.id)} onCancel={() => setConfirm(null)} />}
      <SectionHeader title={`Posts ${posts.length > 0 ? `(${posts.length}${hasMore ? "+" : ""} loaded)` : ""}`} />
      <FilterPills options={[{value:"today",label:"Today"},{value:"week",label:"This Week"},{value:"month",label:"This Month"},{value:"all",label:"All"}]} active={dateFilter} onChange={setDateFilter} />
      {loading ? <Loader /> : filtered.length === 0 ? <Empty message="No posts yet" icon="💬" /> : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(p => (
              <div key={p.id} style={{ background: T.white, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div><span style={{ fontSize: 14, fontWeight: 600, color: T.teal, fontFamily: T.font }}>{p.name || "Unknown"}</span><span style={{ fontSize: 12, color: T.faint, marginLeft: 8, fontFamily: T.font }}>{timeAgo(p.ts)}</span></div>
                  <button onClick={() => setConfirm({ id: p.id })} disabled={acting === p.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1.5px solid #FCA5A5`, background: T.white, color: T.danger, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font, opacity: acting === p.id ? 0.5 : 1 }}>{Icon.trash} Delete</button>
                </div>
                <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6, fontFamily: T.font }}>{p.text?.length > 200 ? p.text.slice(0, 200) + "…" : p.text}</div>
                {p.image && <img src={p.image} alt="" style={{ marginTop: 8, maxHeight: 120, borderRadius: 8, objectFit: "cover", display: "block" }} />}
                <div style={{ display: "flex", gap: 16, marginTop: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: T.muted, fontFamily: T.font }}>❤️ {p.likedBy?.length || 0}</span>
                  <span style={{ fontSize: 12, color: T.muted, fontFamily: T.font }}>💬 {p.commentCount || 0}</span>
                  {p.industry && <Badge label={p.industry.replace(/_/g," ")} bg="#F0F4F8" text={T.muted} />}
                </div>
              </div>
            ))}
          </div>
          {hasMore && <LoadMoreBtn onClick={loadMore} loading={loadingMore} />}
        </>
      )}
    </div>
  );
}

// ── STORIES TAB ────────────────────────────────────────────────────────────────
function StoriesTab() {
  const [stories, setStories] = useState([]); const [loading, setLoading] = useState(true); const [confirm, setConfirm] = useState(null); const [acting, setActing] = useState(null); const [dateFilter, setDateFilter] = useState("today");
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "stories"), orderBy("ts", "desc")), snap => { setStories(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }, err => { console.error("StoriesTab:", err); setLoading(false); });
    return unsub;
  }, []);
  async function deleteStory(id) { setActing(id); await deleteDoc(doc(db, "stories", id)); setActing(null); setConfirm(null); }
  const now = new Date();
  const filtered = stories.filter(s => { if (dateFilter === "all") return true; const d = s.ts?.toDate?.() || new Date(0); if (dateFilter === "today") return d.toDateString() === now.toDateString(); if (dateFilter === "week") return (now - d) < 7 * 86400000; if (dateFilter === "month") return (now - d) < 30 * 86400000; return true; });
  return (
    <div>
      {confirm && <ConfirmDialog message="Delete this story? It will be removed for all users immediately." onConfirm={() => deleteStory(confirm.id)} onCancel={() => setConfirm(null)} />}
      <SectionHeader title={`Stories (${filtered.length})`} />
      <FilterPills options={[{value:"today",label:"Today"},{value:"week",label:"This Week"},{value:"month",label:"This Month"},{value:"all",label:"All"}]} active={dateFilter} onChange={setDateFilter} />
      {loading ? <Loader /> : filtered.length === 0 ? <Empty message="No stories in this period" icon="📸" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {filtered.map(s => (
            <div key={s.id} style={{ background: T.white, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {s.photo ? <img src={s.photo} alt="" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} /> : <div style={{ height: 130, background: `linear-gradient(135deg, ${T.teal}, #0ea5e9)`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 36 }}>📸</span></div>}
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2, fontFamily: T.font }}>{s.name || "Unknown"}</div>
                <div style={{ fontSize: 12, color: T.faint, fontFamily: T.font }}>{timeAgo(s.ts)}</div>
                {s.caption && <div style={{ fontSize: 12, color: T.muted, marginTop: 4, lineHeight: 1.4, fontFamily: T.font }}>{s.caption.slice(0, 60)}{s.caption.length > 60 ? "…" : ""}</div>}
                <button onClick={() => setConfirm({ id: s.id })} disabled={acting === s.id} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, padding: "5px 10px", borderRadius: 7, border: `1.5px solid #FCA5A5`, background: T.white, color: T.danger, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>{Icon.trash} Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CHALLENGES TAB — 4 fun games + day scheduling ──────────────────────────────
function getWeekId(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff); d.setHours(0, 0, 0, 0);
  const jan1 = new Date(d.getFullYear(), 0, 1); const jan1Day = jan1.getDay();
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + (jan1Day === 0 ? 1 : jan1Day === 1 ? 0 : 8 - jan1Day));
  firstMonday.setHours(0, 0, 0, 0);
  const weekNum = Math.floor((d - firstMonday) / (7 * 86400000)) + 1;
  return d.getFullYear() + "-W" + String(weekNum).padStart(2, "0");
}

function ChallengesTab() {
  const [games, setGames]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [confirm, setConfirm] = useState(null);

  const GAME_TYPES = [
    { value: "spin",         label: "Spin & Win",     emoji: "🎯", desc: "One spin — random signal points" },
    { value: "tap_target",   label: "Tap the Target", emoji: "🎯", desc: "Tap targets before time runs out" },
    { value: "memory_match", label: "Memory Match",   emoji: "🃏", desc: "Flip and match card pairs" },
    { value: "number_guess", label: "Number Guess",   emoji: "🔢", desc: "Guess the number 1–10" },
  ];
  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const defaultWeekId = getWeekId();

  const [form, setForm] = useState({
    gameType: "spin", duration: 15, maxGuesses: 5,
    signalMin: 10, signalMax: 50,
    publishMode: "now", scheduleDay: "Mon",
  });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, "weeklyGames"), orderBy("createdAt", "desc")),
      snap => { setGames(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
    );
    return unsub;
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const gameId = `${defaultWeekId}_${form.gameType}_${Date.now()}`;
      const published = form.publishMode === "now";
      let scheduledFor = null;
      if (!published) {
        const dayIdx = DAYS.indexOf(form.scheduleDay);
        const now = new Date(); const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
        let daysAhead = dayIdx - currentDay; if (daysAhead <= 0) daysAhead += 7;
        const target = new Date(now); target.setDate(target.getDate() + daysAhead); target.setHours(0, 1, 0, 0);
        scheduledFor = target;
      }
      await setDoc(doc(db, "weeklyGames", gameId), {
        weekId: defaultWeekId, gameType: form.gameType,
        duration: Number(form.duration), maxGuesses: Number(form.maxGuesses),
        signalMin: Number(form.signalMin), signalMax: Number(form.signalMax),
        published, scheduledFor: scheduledFor || null,
        scheduleDay: form.publishMode === "day" ? form.scheduleDay : null,
        createdAt: serverTimestamp(),
      });
      setShowForm(false); setForm(f => ({ ...f, gameType: "spin", publishMode: "now" }));
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id) => { await deleteDoc(doc(db, "weeklyGames", id)); setConfirm(null); };
  const togglePublish = async (game) => { await updateDoc(doc(db, "weeklyGames", game.id), { published: !game.published }); };

  const GAME_META = {
    spin:         { label: "Spin & Win",     emoji: "🎯", color: T.teal },
    tap_target:   { label: "Tap the Target", emoji: "🎯", color: "#F59E0B" },
    memory_match: { label: "Memory Match",   emoji: "🃏", color: "#8B5CF6" },
    number_guess: { label: "Number Guess",   emoji: "🔢", color: "#0EA5E9" },
  };

  const inp = { width: "100%", padding: "9px 12px", background: "#F9FAFB", border: "1.5px solid #E4E2DC", borderRadius: 8, fontSize: 13, color: T.text, outline: "none", fontFamily: T.font, boxSizing: "border-box", marginBottom: 10 };
  const lbl = { fontSize: 12, fontWeight: 600, color: T.muted, display: "block", marginBottom: 4, fontFamily: T.font };

  const byWeek = {};
  games.forEach(g => { if (!byWeek[g.weekId]) byWeek[g.weekId] = []; byWeek[g.weekId].push(g); });

  return (
    <div>
      {confirm && <ConfirmDialog message="Delete this game? Players will lose access immediately." onConfirm={() => handleDelete(confirm.id)} onCancel={() => setConfirm(null)} />}

      <SectionHeader
        title="Weekly Challenges"
        action={
          <button onClick={() => setShowForm(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: T.warn, color: T.white, border: "none", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>
            🎮 Add Game
          </button>
        }
      />

      {showForm && (
        <div style={{ background: T.white, border: "1.5px solid " + T.warn, borderRadius: 14, padding: "20px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.font }}>🎮 Add Game — {defaultWeekId}</div>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.faint, fontSize: 18 }}>✕</button>
          </div>

          <label style={lbl}>Game type</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {GAME_TYPES.map(g => (
              <button key={g.value} onClick={() => setF("gameType", g.value)} style={{ padding: "12px 10px", borderRadius: 10, border: form.gameType === g.value ? "1.5px solid " + T.teal : "1.5px solid " + T.border, background: form.gameType === g.value ? "#E6FAF8" : T.white, cursor: "pointer", fontFamily: T.font, textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{g.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: form.gameType === g.value ? T.teal : T.text }}>{g.label}</div>
                  <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>{g.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {form.gameType === "spin" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
              <div><label style={lbl}>Min points</label><input style={{ ...inp, marginBottom: 0 }} type="number" value={form.signalMin} onChange={e => setF("signalMin", e.target.value)} /></div>
              <div><label style={lbl}>Max points</label><input style={{ ...inp, marginBottom: 0 }} type="number" value={form.signalMax} onChange={e => setF("signalMax", e.target.value)} /></div>
            </div>
          )}
          {form.gameType === "tap_target" && (
            <div><label style={lbl}>Duration (seconds)</label><input style={inp} type="number" min="5" max="60" value={form.duration} onChange={e => setF("duration", e.target.value)} /></div>
          )}
          {form.gameType === "memory_match" && (
            <div><label style={lbl}>Time limit (seconds)</label><input style={inp} type="number" min="20" max="120" value={form.duration} onChange={e => setF("duration", e.target.value)} /></div>
          )}
          {form.gameType === "number_guess" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
              <div><label style={lbl}>Max guesses</label><input style={{ ...inp, marginBottom: 0 }} type="number" min="1" max="10" value={form.maxGuesses} onChange={e => setF("maxGuesses", e.target.value)} /></div>
              <div><label style={lbl}>Time limit (seconds)</label><input style={{ ...inp, marginBottom: 0 }} type="number" min="10" max="60" value={form.duration} onChange={e => setF("duration", e.target.value)} /></div>
            </div>
          )}

          <label style={{ ...lbl, marginTop: 10 }}>When to publish</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <button onClick={() => setF("publishMode", "now")} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 20, border: "none", background: form.publishMode === "now" ? T.teal : "#F3F2EF", color: form.publishMode === "now" ? "#fff" : T.muted, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>
              Publish now
            </button>
            {DAYS.map(day => (
              <button key={day} onClick={() => { setF("publishMode", "day"); setF("scheduleDay", day); }} style={{ fontSize: 12, padding: "7px 12px", borderRadius: 20, border: "none", background: form.publishMode === "day" && form.scheduleDay === day ? T.teal : "#F3F2EF", color: form.publishMode === "day" && form.scheduleDay === day ? "#fff" : T.muted, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>
                {day}
              </button>
            ))}
          </div>
          {form.publishMode === "day" && (
            <div style={{ fontSize: 12, color: T.muted, background: "#F3F2EF", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontFamily: T.font }}>
              ⏰ Will go live {form.scheduleDay} at 12:01 AM
            </div>
          )}

          <button onClick={handleSave} disabled={saving} style={{ width: "100%", background: T.teal, color: T.white, border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: T.font, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "✅ Save Game"}
          </button>
        </div>
      )}

      {loading ? <Loader /> : games.length === 0 ? <Empty message="No games yet. Add your first game above!" icon="🎮" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Object.entries(byWeek).sort((a, b) => b[0].localeCompare(a[0])).map(([wid, wGames]) => (
            <div key={wid}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 1, marginBottom: 10, fontFamily: T.font, textTransform: "uppercase" }}>
                {wid}{wid === defaultWeekId ? " · Current Week" : ""}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {wGames.map(g => {
                  const meta = GAME_META[g.gameType] || GAME_META.spin;
                  return (
                    <div key={g.id} style={{ background: T.white, borderRadius: 12, padding: "14px 18px", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{meta.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: T.font }}>{meta.label}</div>
                        <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontFamily: T.font }}>
                          {g.gameType === "spin" && `Points: ${g.signalMin}–${g.signalMax}`}
                          {g.gameType !== "spin" && `Duration: ${g.duration}s`}
                          {g.scheduleDay && ` · Scheduled ${g.scheduleDay} 12:01 AM`}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: g.published ? T.successBg : T.warnBg, color: g.published ? "#065F46" : "#92400E", fontFamily: T.font }}>{g.published ? "Live" : "Draft"}</span>
                        <button onClick={() => togglePublish(g)} style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: g.published ? T.warnBg : T.successBg, color: g.published ? "#92400E" : "#065F46", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>{g.published ? "Unpublish" : "Publish"}</button>
                        <button onClick={() => setConfirm({ id: g.id })} style={{ padding: "5px 8px", borderRadius: 8, border: `1px solid #FCA5A5`, background: T.white, color: T.danger, fontSize: 11, cursor: "pointer", fontFamily: T.font }}>{Icon.trash}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BroadcastTab() {
  const { user, profile } = useAuth();
  const [title, setTitle]     = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [logs, setLogs]       = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "broadcastLogs"), orderBy("sentAt", "desc")),
      snap => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, []);

  async function sendBroadcast() {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const batch = writeBatch(db);
      let recipientCount = 0;
      usersSnap.docs.forEach(userDoc => {
        if (userDoc.id === user.uid) return;
        recipientCount++;
        const notifRef = doc(collection(db, "notifications"));
        batch.set(notifRef, {
          uid: userDoc.id,
          type: "broadcast",
          group: "system",
          fromUid: user.uid,
          fromName: profile?.displayName || "Admin",
          fromPhoto: profile?.photoURL || null,
          title: title.trim(),
          message: message.trim(),
          read: false,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
      // Save log
      await addDoc(collection(db, "broadcastLogs"), {
        title: title.trim(),
        message: message.trim(),
        sentBy: profile?.displayName || "Admin",
        sentAt: serverTimestamp(),
        recipientCount,
      });
      setSent(true);
      setTitle(""); setMessage("");
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error("Broadcast error:", err);
      alert("Failed to send. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <SectionHeader title="Broadcast Message" />
      <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: "20px 18px", maxWidth: 500, marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: T.font, marginBottom: 16, lineHeight: 1.6 }}>
          Send a notification to all users instantly. Use this for welcome messages, announcements, or platform updates.
        </p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.font, display: "block", marginBottom: 6 }}>Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Welcome to ConnektIn! 🎉"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.font, display: "block", marginBottom: 6 }}>Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message here..."
            rows={5}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: "none", resize: "none", boxSizing: "border-box" }}
          />
        </div>
        {sent && (
          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#166534", fontFamily: T.font, marginBottom: 12 }}>
            ✅ Message sent to all users!
          </div>
        )}
        <button
          onClick={sendBroadcast}
          disabled={sending || !title.trim() || !message.trim()}
          style={{ width: "100%", padding: "12px 0", background: T.teal, color: T.white, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: T.font, opacity: (sending || !title.trim() || !message.trim()) ? 0.6 : 1 }}
        >
          {sending ? "Sending…" : "📣 Send to All Users"}
        </button>
      </div>

      {/* Broadcast Log */}
      <div style={{ maxWidth: 500 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, fontFamily: T.font }}>Broadcast history</div>
        {logs.length === 0 ? (
          <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, padding: "20px", textAlign: "center", color: T.faint, fontSize: 13, fontFamily: T.font }}>No broadcasts sent yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {logs.map(log => (
              <div key={log.id} style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>{log.title}</span>
                  <span style={{ fontSize: 11, background: "#E6FAF8", color: "#085041", padding: "2px 8px", borderRadius: 20, fontFamily: T.font, flexShrink: 0 }}>{log.recipientCount} sent</span>
                </div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, fontFamily: T.font, marginBottom: 8 }}>{log.message}</div>
                <div style={{ fontSize: 11, color: T.faint, fontFamily: T.font }}>
                  {log.sentBy} · {log.sentAt?.toDate?.()?.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) || "Just now"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function CoLogo({ c, size = 48 }) {
  const initials = (c.name || "C").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const palettes = [
    { bg: "#E6FAF8", color: "#0F6E56" },
    { bg: "#E6F1FB", color: "#185FA5" },
    { bg: "#F5F3FF", color: "#534AB7" },
    { bg: "#FEF3C7", color: "#854F0B" },
    { bg: "#FAECE7", color: "#993C1D" },
  ];
  const p = palettes[(c.name?.charCodeAt(0) || 65) % palettes.length];
  if (c.logoURL) return (
    <img src={c.logoURL} alt={c.name} style={{ width: size, height: size, borderRadius: 10, objectFit: "contain", background: "#F3F2EF", flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: p.bg, color: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * 0.32), fontWeight: 800, flexShrink: 0, fontFamily: T.font }}>
      {initials}
    </div>
  );
}

function CorporateTab() {
  const [companies, setCompanies]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "companies")), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setCompanies(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Show all when < 3 chars, filter on 3+
  const filtered = companies.filter(c => {
    if (!search || search.length < 3) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.industry?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q)
    );
  });

  // Profile view
  if (selected) {
    const c = selected;
    const palettes = [
      { bg: "#E6FAF8", color: "#0F6E56" },
      { bg: "#E6F1FB", color: "#185FA5" },
      { bg: "#F5F3FF", color: "#534AB7" },
      { bg: "#FEF3C7", color: "#854F0B" },
      { bg: "#FAECE7", color: "#993C1D" },
    ];
    const p = palettes[(c.name?.charCodeAt(0) || 65) % palettes.length];
    const initials = (c.name || "C").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, background: "none", border: "none", color: T.teal, fontFamily: T.font, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
          {Icon.back} Back to directory
        </button>
        <div style={{ background: T.white, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden", maxWidth: 560 }}>
          <div style={{ background: "#0A1628", padding: "20px 20px 0", display: "flex", alignItems: "flex-end", gap: 16 }}>
            <div style={{ marginBottom: -16, flexShrink: 0 }}>
              <div style={{ border: "3px solid #fff", borderRadius: 12, overflow: "hidden" }}>
                {c.logoURL
                  ? <img src={c.logoURL} alt={c.name} style={{ width: 64, height: 64, objectFit: "contain" }} />
                  : <div style={{ width: 64, height: 64, background: p.bg, color: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, fontFamily: T.font }}>{initials}</div>
                }
              </div>
            </div>
            <div style={{ paddingBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: T.font, lineHeight: 1.2 }}>{c.name}</div>
              {c.tagline && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontFamily: T.font, marginTop: 3 }}>{c.tagline}</div>}
            </div>
          </div>
          <div style={{ padding: "28px 20px 20px" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {c.industry && <span style={{ background: "#E6FAF8", color: "#0F6E56", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, fontFamily: T.font }}>{c.industry.replace(/_/g, " ")}</span>}
              {c.location && <span style={{ background: "#F1F5F9", color: "#475569", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, fontFamily: T.font }}>📍 {c.location}</span>}
              {c.size     && <span style={{ background: "#F1F5F9", color: "#475569", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, fontFamily: T.font }}>👥 {c.size}</span>}
              {c.founded  && <span style={{ background: "#F1F5F9", color: "#475569", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, fontFamily: T.font }}>📅 Est. {c.founded}</span>}
            </div>
            {c.about && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontFamily: T.font }}>About</div>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7, fontFamily: T.font }}>{c.about}</div>
              </div>
            )}
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, fontFamily: T.font }}>Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Website",    value: c.website },
                  { label: "Location",   value: c.location },
                  { label: "Team size",  value: c.size },
                  { label: "Founded",    value: c.founded },
                  { label: "Industry",   value: c.industry?.replace(/_/g, " ") },
                  { label: "Followers",  value: c.followers?.length ?? 0 },
                  { label: "Registered", value: c.createdAt?.toDate?.()?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) || "—" },
                ].filter(d => d.value !== undefined && d.value !== null && d.value !== "").map(d => (
                  <div key={d.label} style={{ background: "#F6F8FA", borderRadius: 8, padding: "9px 12px" }}>
                    <div style={{ fontSize: 10, color: T.faint, fontFamily: T.font, marginBottom: 2 }}>{d.label}</div>
                    {d.label === "Website"
                      ? <a href={d.value} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600, color: T.teal, fontFamily: T.font, wordBreak: "break-all" }}>{d.value}</a>
                      : <div style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.font }}>{String(d.value)}</div>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Directory view
  return (
    <div>
      <SectionHeader title={`Corporate directory (${companies.length})`} />

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by name, industry or location (3+ chars)…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="corp-search"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: "none", background: "#FFFFFF", color: "#000000", caretColor: "#0D9488", boxSizing: "border-box" }}
        />
        {search.length > 0 && search.length < 3 && (
          <div style={{ fontSize: 11, color: T.faint, marginTop: 4, fontFamily: T.font, paddingLeft: 4 }}>
            Type {3 - search.length} more character{3 - search.length > 1 ? "s" : ""} to search…
          </div>
        )}
        {search.length >= 3 && (
          <div style={{ fontSize: 11, color: T.teal, fontWeight: 600, marginTop: 4, fontFamily: T.font, paddingLeft: 4 }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} found
          </div>
        )}
      </div>

      {loading ? <Loader /> : filtered.length === 0 ? <Empty message="No companies match your search" icon="🏢" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {filtered.map(c => {
            const pal = [
              { bg: "#E6FAF8", color: "#0F6E56" },
              { bg: "#E6F1FB", color: "#185FA5" },
              { bg: "#F5F3FF", color: "#534AB7" },
              { bg: "#FEF3C7", color: "#854F0B" },
              { bg: "#FAECE7", color: "#993C1D" },
            ];
            const pp = pal[(c.name?.charCodeAt(0) || 65) % pal.length];
            const ini = (c.name || "C").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={c.id} onClick={() => setSelected(c)} style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: "16px", cursor: "pointer", transition: "border-color 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  {c.logoURL
                    ? <img src={c.logoURL} alt={c.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "contain", background: "#F3F2EF", flexShrink: 0 }} />
                    : <div style={{ width: 44, height: 44, borderRadius: 10, background: pp.bg, color: pp.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0, fontFamily: T.font }}>{ini}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                    {c.tagline && <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{c.tagline}</div>}
                  </div>
                </div>
                {c.about && (
                  <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, fontFamily: T.font, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {c.about}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {c.industry && <span style={{ background: "#E6FAF8", color: "#0F6E56", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, fontFamily: T.font }}>{c.industry.replace(/_/g, " ")}</span>}
                  {c.location && <span style={{ background: "#F1F5F9", color: "#475569", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, fontFamily: T.font }}>{c.location}</span>}
                  {c.size     && <span style={{ background: "#F1F5F9", color: "#475569", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, fontFamily: T.font }}>{c.size}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: `0.5px solid ${T.border}` }}>
                  <span style={{ fontSize: 11, color: T.faint, fontFamily: T.font }}>
                    {c.createdAt?.toDate?.()?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) || "—"}
                  </span>
                  <span style={{ fontSize: 11, color: T.teal, fontWeight: 600, fontFamily: T.font }}>View profile →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function CompaniesAdminTab() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [name, setName]           = useState("");
  const [website, setWebsite]     = useState("");
  const [tagline, setTagline]     = useState("");
  const [about, setAbout]         = useState("");
  const [location, setLocation]   = useState("");
  const [size, setSize]           = useState("");
  const [founded, setFounded]     = useState("");
  const [logoFile, setLogoFile]   = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "companies")), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setCompanies(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function addCompany() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let logoURL = "";
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const storageRef = ref(storage, `companies/${Date.now()}.${ext}`);
        await uploadBytes(storageRef, logoFile);
        logoURL = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, "companies"), {
        name: name.trim(),
        website: website.trim(),
        tagline: tagline.trim(),
        about: about.trim(),
        location: location.trim(),
        size: size.trim(),
        founded: founded.trim(),
        logoURL,
        followers: [],
        createdAt: serverTimestamp(),
      });
      setName(""); setWebsite(""); setTagline(""); setAbout(""); setLocation(""); setSize(""); setFounded(""); setLogoFile(null); setLogoPreview(null);
      setShowAdd(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function deleteCompany(id) {
    setDeleting(id);
    try { await deleteDoc(doc(db, "companies", id)); }
    catch (err) { console.error(err); }
    finally { setDeleting(null); }
  }

  return (
    <div>
      <SectionHeader title={`Companies (${companies.length})`} action={
        <button onClick={() => setShowAdd(!showAdd)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: T.teal, color: T.white, border: "none", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>
          + Add Company
        </button>
      } />

      {showAdd && (
        <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: "18px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Company name *" style={{ padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: "none" }} />
            <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Tagline (optional)" style={{ padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: "none" }} />
            <textarea value={about} onChange={e => setAbout(e.target.value)} placeholder="About the company (optional)" rows={3} style={{ padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: "none", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (e.g. Bengaluru)" style={{ padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: "none", flex: 1 }} />
              <input value={founded} onChange={e => setFounded(e.target.value)} placeholder="Founded year" style={{ padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: "none", width: 110 }} />
            </div>
            <input value={size} onChange={e => setSize(e.target.value)} placeholder="Team size (e.g. 50–200)" style={{ padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: "none" }} />
            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="Website URL (https://...)" style={{ padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: "none" }} />
            <div onClick={() => document.getElementById("company-logo-upload").click()} style={{ border: `2px dashed ${T.border}`, borderRadius: 9, padding: "12px", cursor: "pointer", textAlign: "center", background: "#FAFAFA", display: "flex", alignItems: "center", gap: 12 }}>
              {logoPreview ? (
                <img src={logoPreview} alt="logo" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8 }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 8, background: T.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🏢</div>
              )}
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font }}>{logoPreview ? "Logo selected ✓" : "Upload logo"}</div>
                <div style={{ fontSize: 11, color: T.faint, fontFamily: T.font }}>PNG, JPG · Max 2MB · optional</div>
              </div>
              <input id="company-logo-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (!f) return; setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addCompany} disabled={saving || !name.trim()} style={{ flex: 1, padding: "10px 0", background: T.teal, color: T.white, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.font, opacity: (saving || !name.trim()) ? 0.6 : 1 }}>{saving ? "Saving…" : "Save Company"}</button>
              <button onClick={() => setShowAdd(false)} style={{ padding: "10px 16px", background: T.white, color: T.muted, border: `1.5px solid ${T.border}`, borderRadius: 9, fontSize: 13, cursor: "pointer", fontFamily: T.font }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Loader /> : companies.length === 0 ? <Empty message="No companies yet" icon="🏢" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {companies.map(c => (
            <div key={c.id} style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#F3F2EF", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {c.logoURL ? <img src={c.logoURL} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 20, fontWeight: 700, color: "#0A1628" }}>{(c.name||"C")[0]}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: T.font }}>{c.name}</div>
                {c.tagline && <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font }}>{c.tagline}</div>}
                {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: T.teal, fontFamily: T.font }}>{c.website}</a>}
              </div>
              <button onClick={() => deleteCompany(c.id)} disabled={deleting === c.id} style={{ padding: "6px 10px", borderRadius: 8, border: `1.5px solid #FCA5A5`, background: T.white, color: T.danger, fontSize: 12, cursor: "pointer", fontFamily: T.font, opacity: deleting === c.id ? 0.5 : 1 }}>{Icon.trash} Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SIDEBAR NAV ────────────────────────────────────────────────────────────────
const NAV = [
  { id: "overview",   label: "Overview",      icon: Icon.overview  },
  { id: "users",      label: "Users",          icon: Icon.users     },
  { id: "articles",   label: "Articles",       icon: Icon.article   },
  { id: "jobs",       label: "Jobs",           icon: Icon.jobs      },
  { id: "posts",      label: "Posts",          icon: Icon.posts     },
  { id: "stories",    label: "Stories",        icon: Icon.stories   },
  { id: "challenges", label: "Challenges",     icon: Icon.game      },
  { id: "broadcast",  label: "Broadcast",      icon: "📣"           },
  { id: "companies",  label: "Companies",      icon: "🏢"           },
  { id: "corporate",  label: "Corporate",      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><path d="M3 22V9l9-7 9 7v13"/><path d="M9 22V12h6v10"/></svg> },
  { id: "referrals",  label: "Referral Codes", icon: Icon.referral  },
];

// ── MAIN ───────────────────────────────────────────────────────────────────────
export default function Admin() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || profile?.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: T.font }}>
        <div style={{ textAlign: "center", color: T.muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Admin access only</div>
          <button onClick={() => navigate("/dashboard")} style={{ marginTop: 16, padding: "8px 20px", borderRadius: 8, background: T.teal, color: T.white, border: "none", fontFamily: T.font, fontSize: 14, cursor: "pointer" }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const CONTENT = {
    overview:   <OverviewTab />,
    users:      <UsersTab />,
    articles:   <ArticlesTab />,
    jobs:       <JobsTab />,
    posts:      <PostsTab />,
    stories:    <StoriesTab />,
    challenges: <ChallengesTab />,
    referrals:  <ReferralCodesAdmin />,
    broadcast:  <BroadcastTab />,
    companies:  <CompaniesAdminTab />,
    corporate:  <CorporateTab />,
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, display: "flex" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .corp-search { color: #000000 !important; background: #ffffff !important; caret-color: #0D9488 !important; cursor: text !important; }
        .corp-search::placeholder { color: #9CA3AF !important; }
        @media (max-width: 768px) {
          .admin-sidebar { transform: translateX(-100%); transition: transform 0.25s ease; }
          .admin-sidebar.open { transform: translateX(0) !important; }
        }
      `}</style>

      <div className={`admin-sidebar${sidebarOpen ? " open" : ""}`} style={{ width: 220, background: "#1A2E4A", minHeight: "100vh", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 200, boxShadow: "2px 0 20px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/icon-512.png" alt="ConnektIn" style={{ width: 32, height: 32, borderRadius: 8, background: "#fff", padding: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.white, fontFamily: T.font }}>ConnektIn</div>
              <div style={{ fontSize: 10, color: T.teal, fontWeight: 600, fontFamily: T.font, letterSpacing: 0.5 }}>ADMIN PANEL</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)", padding: "0 10px", marginBottom: 8, letterSpacing: 1, fontFamily: T.font }}>MANAGE</div>
          {NAV.map(n => {
            const isActive = active === n.id;
            return (
              <button key={n.id} onClick={() => { setActive(n.id); setSidebarOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", background: isActive ? T.tealDim : "transparent", color: isActive ? T.teal : "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: "pointer", fontFamily: T.font, marginBottom: 2, transition: "all 0.15s", textAlign: "left", borderLeft: isActive ? `3px solid ${T.teal}` : "3px solid transparent" }}>
                {n.icon} {n.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "14px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={() => navigate("/dashboard")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: 13, cursor: "pointer", fontFamily: T.font }}>
            {Icon.back} Back to App
          </button>
        </div>
      </div>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 199 }} />}

      <div className="admin-main" style={{ flex: 1, marginLeft: 220, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: T.white, borderBottom: `1px solid ${T.border}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", height: 56, gap: 14 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, display: "none", padding: 4 }} className="mobile-menu-btn">{Icon.menu}</button>
          <div style={{ flex: 1 }}><span style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: T.font }}>{NAV.find(n => n.id === active)?.label}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.teal }} />
            <span style={{ fontSize: 13, color: T.muted, fontFamily: T.font }}>{profile?.displayName || "Admin"}</span>
          </div>
        </div>
        <div style={{ flex: 1, padding: "24px 24px 40px" }}>{CONTENT[active]}</div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .admin-main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
