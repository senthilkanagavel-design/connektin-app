// src/pages/tabs/PostsTab.jsx
import { useState, useEffect, useRef } from "react";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import PostCard from "../../components/PostCard";
import Avatar from "../../components/Avatar";

const INDUSTRY_LABELS = {
  medical_billing:        "Medical Billing",
  medical_coding:         "Medical Coding",
  medical_coding_billing: "Medical Coding & Billing",
  healthcare:             "Healthcare",
  information_technology: "Information Technology",
  banking_finance:        "Banking & Finance",
  education:              "Education",
  manufacturing:          "Manufacturing",
  real_estate:            "Real Estate",
  media_entertainment:    "Media & Entertainment",
  hospitality_travel:     "Hospitality & Travel",
};

export default function PostsTab() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const feedRef = useRef(null);

  const industry    = profile?.industry || "medical_billing";
  const isTrialUser = profile?.plan === "trial" && profile?.userType !== "recruiter";
  const circling    = profile?.circling || [];

  useEffect(() => {
    if (!profile?.industry) return;
    const q = query(collection(db, "posts"), where("industry", "==", profile.industry), limit(40));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.ts?.toMillis?.() || 0) - (a.ts?.toMillis?.() || 0));
      setPosts(data);
      setLoading(false);
    });
    return () => unsub();
  }, [profile?.industry]);

  const handleComposeClick = () => {
    if (isTrialUser) navigate("/subscribe?ref=posts");
    else navigate("/create-post");
  };

  return (
    <div style={s.page}>
      <div style={s.composeBar} onClick={handleComposeClick}>
        <Avatar uid={profile?.uid} photoURL={profile?.photoURL} avatarId={profile?.avatarId || profile?.avatar} displayName={profile?.displayName} plan={profile?.plan || "trial"} role={profile?.role || "participant"} readCount={Object.values(profile?.readCounts || {}).reduce((a, b) => a + b, 0)} size={40} />
        <div style={s.composePlaceholder}>
          {isTrialUser ? "Upgrade to start a post…" : `Share something with ${INDUSTRY_LABELS[industry] || "your network"}…`}
        </div>
        {!isTrialUser && <div style={s.postBtn}>Post</div>}
      </div>

      <div style={s.divider} />

      {loading ? (
        <div style={s.loadingWrap}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={s.skeleton}>
              <div style={s.skeletonAvatar} />
              <div style={s.skeletonLines}>
                <div style={{ ...s.skeletonLine, width: "60%" }} />
                <div style={{ ...s.skeletonLine, width: "40%", marginTop: 6 }} />
                <div style={{ ...s.skeletonLine, width: "90%", marginTop: 14 }} />
                <div style={{ ...s.skeletonLine, width: "75%", marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>✍️</div>
          <div style={s.emptyTitle}>No posts yet</div>
          <div style={s.emptySubtitle}>Be the first to share something with the {INDUSTRY_LABELS[industry]} community.</div>
          {!isTrialUser && <button style={s.emptyBtn} onClick={() => navigate("/create-post")}>Start a Post</button>}
        </div>
      ) : (
        <div ref={feedRef} style={s.feed}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={user}
              profile={profile}
              circling={circling}
            />
          ))}
          <div style={s.feedEnd}>You're all caught up ✓</div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: "calc(100vh - 112px)", background: "#F3F2EF", fontFamily: "'DM Sans', sans-serif", paddingBottom: "24px" },
  composeBar: { display: "flex", alignItems: "center", gap: 10, background: "#fff", padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #E4E2DC" },
  composePlaceholder: { flex: 1, fontSize: 14, color: "#666", border: "1.5px solid #E4E2DC", borderRadius: 24, padding: "8px 14px", background: "#F3F2EF" },
  postBtn: { fontSize: 13, fontWeight: 600, color: "#0D9488", padding: "6px 12px", border: "1.5px solid #0D9488", borderRadius: 16, flexShrink: 0 },
  divider: { height: 8, background: "#F3F2EF" },
  loadingWrap: { padding: "0 0 8px" },
  skeleton: { display: "flex", gap: 12, background: "#fff", padding: "16px", marginBottom: 8 },
  skeletonAvatar: { width: 44, height: 44, borderRadius: "50%", background: "#E4E2DC", flexShrink: 0 },
  skeletonLines: { flex: 1 },
  skeletonLine: { height: 12, borderRadius: 6, background: "#E4E2DC" },
  feed: {},
  feedEnd: { textAlign: "center", fontSize: 12, color: "#999", padding: "24px 16px 8px" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 32px", gap: 8 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: 700, color: "#1A1A1A" },
  emptySubtitle: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 1.5, maxWidth: 280 },
  emptyBtn: { marginTop: 16, padding: "10px 24px", background: "#0D9488", color: "#fff", border: "none", borderRadius: 24, fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
};
