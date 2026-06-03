// src/pages/MyCirclePage.jsx
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";

export default function MyCirclePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      const uids = profile?.circleMembers || [];
      if (uids.length === 0) { setLoading(false); return; }
      try {
        const promises = uids.map((uid) => getDoc(doc(db, "users", uid)));
        const snaps = await Promise.all(promises);
        const data = snaps
          .filter((s) => s.exists())
          .map((s) => ({ uid: s.id, ...s.data() }));
        setMembers(data);
      } catch (e) {
        console.error("MyCircle fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    if (profile) fetchMembers();
  }, [profile]);

  const planConfig = (plan) => ({
    trial:     { label: 'Free Trial',    color: '#92400E', bg: '#FEF3C7', border: '#FCD34D' },
    thermite:  { label: 'TherMite Plan', color: '#0F766E', bg: '#CCFBF1', border: '#5EEAD4' },
    regular:   { label: 'Regular Plan',  color: '#374151', bg: '#F1F5F9', border: '#CBD5E1' },
    recruiter: { label: 'Recruiter',     color: '#92400E', bg: '#FEF3C7', border: '#FCD34D' },
  }[plan] || { label: plan, color: '#374151', bg: '#F1F5F9', border: '#CBD5E1' });

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/dashboard', { state: { tab: 'profile' } })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div style={s.headerCenter}>
          <span style={s.infinityIcon}>∞</span>
          <span style={s.headerTitle}>My Circle</span>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Count hero strip */}
      {!loading && (
        <div style={s.countHero}>
          <div style={s.countLeft}>
            <div style={s.countNum}>{members.length}</div>
            <div style={s.countLabel}>{members.length === 1 ? "person" : "people"} in your Circle</div>
          </div>
          <div style={s.countIcon}>∞</div>
        </div>
      )}

      {/* List */}
      <div style={s.list}>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} style={s.skeleton}>
              <div style={s.skeletonAvatar} />
              <div style={s.skeletonLines}>
                <div style={{ ...s.skeletonLine, width: "55%" }} />
                <div style={{ ...s.skeletonLine, width: "38%", marginTop: 8 }} />
                <div style={{ ...s.skeletonLine, width: "25%", marginTop: 8, height: 10 }} />
              </div>
            </div>
          ))
        ) : members.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>∞</div>
            <div style={s.emptyTitle}>Your Circle is empty</div>
            <div style={s.emptySub}>Visit someone's profile and send a Circle request to get started.</div>
            <button style={s.emptyBtn} onClick={() => navigate('/dashboard', { state: { tab: 'profile' } })}>Go Back</button>
          </div>
        ) : (
          members.map((member, idx) => {
            const pc = planConfig(member.plan || 'trial');
            const industry = (member.industry || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return (
              <div
                key={member.uid}
                style={{ ...s.memberCard, borderBottom: idx === members.length - 1 ? 'none' : '1px solid #F3F2EF' }}
                onClick={() => navigate(`/profile/${member.uid}`, { state: { from: 'my-circle', tab: 'me' } })}
              >
                {/* Avatar */}
                <div style={s.avatarWrap}>
                  <Avatar
                    uid={member.uid}
                    photoURL={member.photoURL}
                    avatarId={member.avatarId || member.avatar}
                    displayName={member.displayName}
                    plan={member.plan || "trial"}
                    role={member.role || "participant"}
                    size={52}
                    inCircle={true}
                  />
                </div>

                {/* Info */}
                <div style={s.memberInfo}>
                  <div style={s.memberName}>{member.displayName || "User"}</div>
                  {industry ? <div style={s.memberIndustry}>{industry}</div> : null}
                  <span style={{
                    ...s.planBadge,
                    color: pc.color,
                    background: pc.bg,
                    border: `1px solid ${pc.border}`,
                  }}>
                    {pc.label}
                  </span>
                </div>

                {/* Right */}
                <div style={s.cardRight}>
                  <div style={s.circleTag}>∞ Circle</div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#F3F2EF",
    fontFamily: "'DM Sans', sans-serif",
    paddingBottom: 40,
  },

  // Header
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#0A1628", padding: "14px 16px",
    position: "sticky", top: 0, zIndex: 10,
  },
  backBtn: {
    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
    color: "#fff", cursor: "pointer", padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 36, height: 36, borderRadius: "50%",
  },
  headerCenter: { display: "flex", alignItems: "center", gap: 8 },
  infinityIcon: {
    fontSize: 22, color: "#0D9488", fontWeight: 700,
    lineHeight: 1, fontFamily: "'DM Sans', sans-serif",
  },
  headerTitle: {
    fontSize: 17, fontWeight: 700, color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
  },

  // Count hero
  countHero: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#0D9488", padding: "16px 20px",
  },
  countLeft: {},
  countNum: {
    fontSize: 28, fontWeight: 700, color: "#fff",
    lineHeight: 1, fontFamily: "'DM Sans', sans-serif",
  },
  countLabel: {
    fontSize: 13, color: "rgba(255,255,255,0.75)",
    fontFamily: "'DM Sans', sans-serif", marginTop: 3,
  },
  countIcon: {
    fontSize: 40, color: "rgba(255,255,255,0.2)", fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif", lineHeight: 1,
  },

  // List
  list: {
    background: "#fff",
    margin: "12px 0",
    borderTop: "1px solid #E4E2DC",
    borderBottom: "1px solid #E4E2DC",
  },

  // Member card
  memberCard: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "14px 16px", cursor: "pointer",
    transition: "background 0.15s",
  },
  avatarWrap: { flexShrink: 0 },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: {
    fontSize: 15, fontWeight: 600, color: "#0A1628",
    fontFamily: "'DM Sans', sans-serif", marginBottom: 2,
  },
  memberIndustry: {
    fontSize: 12, color: "#64748B",
    fontFamily: "'DM Sans', sans-serif", marginBottom: 5,
  },
  planBadge: {
    display: "inline-block", fontSize: 10, fontWeight: 600,
    borderRadius: 10, padding: "3px 9px",
    fontFamily: "'DM Sans', sans-serif",
  },
  cardRight: {
    display: "flex", flexDirection: "column",
    alignItems: "flex-end", gap: 6, flexShrink: 0,
  },
  circleTag: {
    fontSize: 11, fontWeight: 700, color: "#0D9488",
    background: "#E6F7F5", borderRadius: 10,
    padding: "4px 9px", fontFamily: "'DM Sans', sans-serif",
    border: "1px solid #A7F3D0",
  },

  // Empty state
  empty: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "64px 32px", gap: 10, textAlign: "center",
    background: "#fff",
  },
  emptyIcon: {
    fontSize: 52, color: "#0D9488", fontWeight: 700,
    lineHeight: 1, fontFamily: "'DM Sans', sans-serif", marginBottom: 6,
    opacity: 0.4,
  },
  emptyTitle: {
    fontSize: 17, fontWeight: 700, color: "#0A1628",
    fontFamily: "'DM Sans', sans-serif",
  },
  emptySub: {
    fontSize: 14, color: "#6B7280", lineHeight: 1.6,
    maxWidth: 280, fontFamily: "'DM Sans', sans-serif",
  },
  emptyBtn: {
    marginTop: 8, padding: "10px 28px", background: "#0D9488",
    color: "#fff", border: "none", borderRadius: 24,
    fontSize: 14, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
  },

  // Skeleton
  skeleton: {
    display: "flex", gap: 14, background: "#fff",
    padding: "14px 16px", borderBottom: "1px solid #F3F2EF",
  },
  skeletonAvatar: {
    width: 52, height: 52, borderRadius: "50%",
    background: "#E4E2DC", flexShrink: 0,
  },
  skeletonLines: { flex: 1, paddingTop: 4 },
  skeletonLine: { height: 12, borderRadius: 6, background: "#E4E2DC" },
};
