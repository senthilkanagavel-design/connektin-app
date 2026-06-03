// src/pages/tabs/HomeTab.jsx
import { useState, useEffect } from "react";
import { collection, query, where, limit, onSnapshot, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import MiniProfileCard from "../../components/MiniProfileCard";
import StoriesRow from "../../components/StoriesRow";
import Avatar from "../../components/Avatar";
import WeeklyGameCard from "../../components/WeeklyGameCard";
import PostImageFullView from "../../components/PostImageFullView";

function InfinityIcon({ size = 11, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12c-2-2.5-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.5 6-4z"/>
      <path d="M12 12c2 2.5 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.5-6 4z"/>
    </svg>
  );
}

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

const PLAN_BADGE = {
  thermite: { label: "TherMite", bg: "#E6FAF8", color: "#0F6E56", border: "#99F6E4" },
  regular:  { label: "Regular",  bg: "#E8EAF0", color: "#0A1628", border: "#C8CAD4" },
  recruiter:{ label: "Recruiter",bg: "#F5F3FF", color: "#7C3AED", border: "#C4B5FD" },
};

const timeAgo = (ts) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

function SkeletonCard() {
  return (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#E4E2DC", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 12, background: "#E4E2DC", borderRadius: 6, width: "40%", marginBottom: 7 }} />
          <div style={{ height: 10, background: "#F0EFEA", borderRadius: 6, width: "60%" }} />
        </div>
      </div>
      <div style={{ height: 12, background: "#E4E2DC", borderRadius: 6, marginBottom: 8, width: "90%" }} />
      <div style={{ height: 12, background: "#F0EFEA", borderRadius: 6, width: "70%" }} />
    </div>
  );
}

// ── Likes Sheet ───────────────────────────────────────────────────────────────
function LikesSheet({ likedBy = [], onClose, onUserTap }) {
  const [likers, setLikers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!likedBy.length) { setLoading(false); return; }
    Promise.all(likedBy.map(uid => getDoc(doc(db, "users", uid)))).then(snaps => {
      setLikers(snaps.filter(s => s.exists()).map(s => ({ uid: s.id, ...s.data() })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 800 }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderRadius: "20px 20px 0 0", zIndex: 801, maxHeight: "60vh", display: "flex", flexDirection: "column", fontFamily: "DM Sans, sans-serif" }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: "#E4E2DC" }} />
        </div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 12px", borderBottom: "1px solid #F0EFEA" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0A1628" }}>👍 {likedBy.length} {likedBy.length === 1 ? "Like" : "Likes"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9CA3AF", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0 24px" }}>
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Loading...</div>
          ) : likers.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>No data found.</div>
          ) : likers.map(u => {
            const badge = PLAN_BADGE[u.plan];
            const industry = u.industry ? u.industry.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";
            return (
              <div
                key={u.uid}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer" }}
                onClick={() => { onClose(); onUserTap(u.uid); }}
              >
                <Avatar uid={u.uid} photoURL={u.photoURL} avatarId={u.avatarId || u.avatar} displayName={u.displayName} plan={u.plan || "trial"} role={u.role || "participant"} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0A1628" }}>{u.displayName || "ConnektIn User"}</div>
                  {industry && <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>{industry}</div>}
                </div>
                {badge && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, flexShrink: 0 }}>
                    {badge.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function PostCard({ item, currentUser, profile }) {
  const isOwn      = item.uid === currentUser?.uid;
  const liked      = item.likedBy?.includes(currentUser?.uid);
  const isInCircle = !isOwn && (profile?.circling || []).includes(item.uid);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments]         = useState([]);
  const [commentText, setCommentText]   = useState("");
  const [posting, setPosting]           = useState(false);
  const [liking, setLiking]             = useState(false);
  const [miniCardUid, setMiniCardUid]   = useState(null);
  const [showImageView, setShowImageView] = useState(false);
  // ── NEW ──────────────────────────────────────────────────────
  const [showLikes, setShowLikes] = useState(false);
  // ─────────────────────────────────────────────────────────────
  const navigate = useNavigate();

  useEffect(() => {
    if (!showComments) return;
    const q = query(collection(db, "posts", item.id, "comments"), limit(20));
    const unsub = onSnapshot(q, snap => {
      const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.ts?.toMillis?.() || 0) - (b.ts?.toMillis?.() || 0));
      setComments(sorted);
    });
    return () => unsub();
  }, [showComments, item.id]);

  const handleLike = async () => {
    if (!currentUser || liking) return;
    setLiking(true);
    const ref = doc(db, "posts", item.id);
    if (liked) await updateDoc(ref, { likedBy: arrayRemove(currentUser.uid), likeCount: increment(-1) });
    else       await updateDoc(ref, { likedBy: arrayUnion(currentUser.uid),  likeCount: increment(1) });
    setLiking(false);
  };

  const handleComment = async () => {
    if (!commentText.trim() || posting) return;
    setPosting(true);
    await addDoc(collection(db, "posts", item.id, "comments"), {
      uid: currentUser.uid, name: profile?.displayName || "User",
      photo: profile?.photoURL || null, plan: profile?.plan || "trial",
      role: profile?.role || "participant", text: commentText.trim(), ts: serverTimestamp(),
    });
    await updateDoc(doc(db, "posts", item.id), { commentCount: increment(1) });
    setCommentText(""); setPosting(false);
  };

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: item.text?.slice(0, 60) || "ConnektIn Post", text: item.text || "", url: window.location.origin });
    else { await navigator.clipboard.writeText(window.location.origin); alert("Link copied!"); }
  };

  const likeCount    = item.likedBy?.length || 0;
  const commentCount = item.commentCount || 0;
  const isTrialUser  = profile?.plan === "trial" && profile?.userType !== "recruiter";

  const goToProfile = (e) => {
    e.stopPropagation();
    const targetUid = item.uid || item.authorUid;
    if (!targetUid || targetUid === currentUser?.uid) return;
    setMiniCardUid(targetUid);
  };

  return (
    <>
      <div style={S.card}>
        {/* Card header */}
        <div style={S.cardHeader}>
          <div style={{ cursor: isOwn ? "default" : "pointer", position: "relative", flexShrink: 0 }} onClick={goToProfile}>
            <div style={isInCircle ? { borderRadius: "50%", outline: "2.5px solid #0D9488", outlineOffset: "2px", display: "inline-block" } : {}}>
              <Avatar
                uid={item.uid}
                photoURL={isOwn ? profile?.photoURL : item.photo}
                avatarId={isOwn ? (profile?.avatarId || profile?.avatar) : (item.avatarId || item.avatar)}
                displayName={isOwn ? profile?.displayName : item.name}
                plan={isOwn ? (profile?.plan || "trial") : (item.plan || "trial")}
                role={isOwn ? (profile?.role || "participant") : (item.role || "participant")}
                size={44}
              />
            </div>
            {isInCircle && (
              <div style={S.bondBadge}><InfinityIcon size={9} color="#fff" /></div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ ...S.name, cursor: isOwn ? "default" : "pointer" }} onClick={goToProfile}>{item.name}</span>
              {isOwn && <span style={S.youBadge}>You</span>}
              {isInCircle && (
                <span style={S.circlePill}>
                  <InfinityIcon size={10} color="#0D9488" /><span>Circle</span>
                </span>
              )}
            </div>
            <div style={S.meta}>{timeAgo(item.ts)} · {INDUSTRY_LABELS[item.industry] || item.industry}</div>
          </div>
        </div>

        {/* Body */}
        {item.text && <div style={S.bodyText}>{item.text}</div>}
        {item.tags?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {item.tags.map(t => <span key={t} style={S.tag}>#{t}</span>)}
          </div>
        )}

        {item.image && (
          <img
            src={item.image}
            alt="post"
            style={{ ...S.postImg, cursor: "zoom-in" }}
            onClick={() => setShowImageView(true)}
          />
        )}

        {/* Like / comment counts */}
        {(likeCount > 0 || commentCount > 0) && (
          <div style={S.countsRow}>
            {/* ── NEW: tap like count to see who liked ── */}
            {likeCount > 0 && (
              <span
                style={{ ...S.countText, cursor: "pointer" }}
                onClick={() => setShowLikes(true)}
              >
                👍 {likeCount}
              </span>
            )}
            {/* ─────────────────────────────────────────── */}
            {commentCount > 0 && (
              <span style={{ ...S.countText, marginLeft: "auto", cursor: "pointer" }} onClick={() => setShowComments(v => !v)}>
                {commentCount} comment{commentCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        {isTrialUser ? (
          <div style={S.trialActionsLock}>
            <span style={{ fontSize: 13 }}>🔒</span>
            <span style={S.trialLockText}>Upgrade to like, comment &amp; engage</span>
            <button style={S.trialLockBtn} onClick={() => navigate("/subscribe?ref=home")}>Upgrade</button>
          </div>
        ) : (
          <div style={S.actionsRow}>
            <button style={{ ...S.actionBtn, color: liked ? "#0D9488" : "#666", fontWeight: liked ? 700 : 500 }} onClick={handleLike} disabled={liking}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill={liked ? "#0D9488" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
              Like
            </button>
            <button style={{ ...S.actionBtn, color: showComments ? "#0D9488" : "#666" }} onClick={() => setShowComments(v => !v)}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Comment
            </button>
            <button style={S.actionBtn} onClick={handleShare}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Share
            </button>
          </div>
        )}

        {/* Comments */}
        {!isTrialUser && showComments && (
          <div style={S.commentSection}>
            <div style={S.commentInputRow}>
              <Avatar
                uid={currentUser?.uid}
                photoURL={profile?.photoURL}
                avatarId={profile?.avatarId || profile?.avatar}
                displayName={profile?.displayName}
                plan={profile?.plan || "trial"}
                role={profile?.role || "participant"}
                size={32}
              />
              <div style={S.commentInputPill}>
                <input
                  style={S.commentBox}
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleComment()}
                />
                <button
                  style={{ ...S.sendBtn, background: commentText.trim() ? "#0D9488" : "#E4E2DC" }}
                  onClick={handleComment}
                  disabled={!commentText.trim() || posting}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={commentText.trim() ? "#fff" : "#aaa"} strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
            {comments.map(c => (
              <div key={c.id} style={S.commentItem}>
                <div style={{ cursor: c.uid !== currentUser?.uid ? "pointer" : "default" }}
                  onClick={() => { if (c.uid && c.uid !== currentUser?.uid) setMiniCardUid(c.uid); }}>
                  <Avatar uid={c.uid} photoURL={c.photo} displayName={c.name} plan={c.plan || "trial"} role={c.role || "participant"} size={30} />
                </div>
                <div style={S.commentBubble}>
                  <div style={{ ...S.commentName, cursor: c.uid !== currentUser?.uid ? "pointer" : "default" }}
                    onClick={() => { if (c.uid && c.uid !== currentUser?.uid) setMiniCardUid(c.uid); }}>
                    {c.name}
                  </div>
                  <div style={S.commentText}>{c.text}</div>
                  <div style={S.commentTime}>{timeAgo(c.ts)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {miniCardUid && <MiniProfileCard uid={miniCardUid} onClose={() => setMiniCardUid(null)} />}

      {showImageView && item.image && (
        <PostImageFullView src={item.image} onClose={() => setShowImageView(false)} />
      )}

      {/* ── NEW: Likes sheet ── */}
      {showLikes && (
        <LikesSheet
          likedBy={item.likedBy || []}
          onClose={() => setShowLikes(false)}
          onUserTap={(uid) => setMiniCardUid(uid)}
        />
      )}
      {/* ───────────────────── */}
    </>
  );
}

function ArticleCard({ item, navigate, onAuthorTap }) {
  const levelColor = { beginner: "#16a34a", intermediate: "#d97706", advanced: "#dc2626" };
  const lc = levelColor[item.level] || "#555";
  return (
    <div style={{ ...S.card, padding: 0, cursor: "pointer" }}
      onClick={() => navigate(`/article/${item.id}`, { state: { from: "home" } })}>
      {item.coverImage ? (
        <div style={{ position: "relative" }}>
          <img src={item.coverImage} alt="cover" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", bottom: 10, left: 12 }}>
            <span style={{ background: lc, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.level}</span>
          </div>
          {item.readTime && (
            <div style={{ position: "absolute", bottom: 10, right: 12, background: "rgba(0,0,0,0.5)", borderRadius: 10, padding: "3px 8px" }}>
              <span style={{ color: "#fff", fontSize: 10, fontWeight: 500 }}>{item.readTime}</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ height: 6, background: "#0D9488" }} />
      )}
      <div style={{ padding: "12px 14px" }}>
        <div style={S.typeLabel}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Article
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); if (item.authorUid) onAuthorTap(item.authorUid); }}>
            <Avatar uid={item.authorUid} photoURL={item.authorPhoto} displayName={item.authorName} plan={item.authorPlan || "trial"} role={item.authorRole || "participant"} size={36} />
          </div>
          <div>
            <div style={{ ...S.name, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); if (item.authorUid) onAuthorTap(item.authorUid); }}>{item.authorName}</div>
            <div style={S.meta}>{timeAgo(item.createdAt)} · {item.readTime}</div>
          </div>
        </div>
        <div style={S.articleTitle}>{item.title}</div>
        {item.summary && (
          <div style={{ borderLeft: "3px solid #0D9488", background: "#F0FDFA", borderRadius: "0 8px 8px 0", padding: "8px 10px", margin: "8px 0" }}>
            <p style={{ fontSize: 12, color: "#0F766E", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>{item.summary}</p>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
          {!item.coverImage && (
            <span style={{ fontSize: 11, fontWeight: 700, color: lc, background: lc + "18", borderRadius: 10, padding: "2px 10px", textTransform: "capitalize" }}>{item.level}</span>
          )}
          <span style={{ marginLeft: "auto", color: "#0D9488", fontSize: 13, fontWeight: 700 }}>Read →</span>
        </div>
      </div>
    </div>
  );
}

function JobCard({ item, navigate }) {
  const initial   = (item.company || "?").charAt(0).toUpperCase();
  const typeLabel = item.type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Job";
  return (
    <div style={{ ...S.card, padding: 0, cursor: "pointer", borderLeft: "3px solid #0EA5E9", borderTop: "1px solid #E4E2DC", borderBottom: "1px solid #E4E2DC" }}
      onClick={() => navigate(`/jobs/${item.id}`)}>
      <div style={{ padding: "5px 14px", background: "#F0F9FF", borderBottom: "1px solid #E0F2FE", display: "flex", alignItems: "center", gap: 5 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#0EA5E9", textTransform: "uppercase", letterSpacing: "0.08em" }}>Job Opening</span>
      </div>
      <div style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "#0A1628", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0A1628", marginBottom: 2 }}>{item.title}</div>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>{item.company}{item.location ? ` · ${item.location}` : ""}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ background: "#E6FAF8", color: "#0D9488", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10 }}>{typeLabel}</span>
            {item.salaryRange && <span style={{ background: "#F0FDF4", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{item.salaryRange}</span>}
          </div>
        </div>
      </div>
      <div style={{ padding: "0 14px 12px", display: "flex", justifyContent: "flex-end" }}>
        <span style={{ background: "#0D9488", color: "#fff", fontSize: 12, fontWeight: 700, padding: "6px 16px", borderRadius: 20 }}>View Job →</span>
      </div>
    </div>
  );
}

export default function HomeTab() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [miniProfileUid, setMiniProfileUid] = useState(null);

  const industry      = profile?.industry || "medical_billing";
  const industryLabel = INDUSTRY_LABELS[industry] || industry;
  const isAdmin       = profile?.role === "admin";

  useEffect(() => {
    if (!profile) return;
    const postsQ = isAdmin
      ? query(collection(db, "posts"), limit(30))
      : query(collection(db, "posts"), where("industry", "==", industry), limit(30));

    const unsub = onSnapshot(postsQ, async (postsSnap) => {
      const posts = postsSnap.docs.map(d => ({ ...d.data(), id: d.id, _type: "post", _sortKey: d.data().ts?.toMillis?.() || 0 }));
      const [articlesSnap, jobsSnap] = await Promise.all([
        isAdmin
          ? getDocs(query(collection(db, "articles"), where("status", "==", "published"), limit(15)))
          : getDocs(query(collection(db, "articles"), where("status", "==", "published"), where("industry", "==", industry), limit(15))),
        isAdmin
          ? getDocs(query(collection(db, "jobs"), where("status", "==", "active"), limit(10)))
          : getDocs(query(collection(db, "jobs"), where("status", "==", "active"), where("industry", "==", industry), limit(10))),
      ]);
      const articles = articlesSnap.docs.map(d => ({ ...d.data(), id: d.id, _type: "article", _sortKey: d.data().createdAt?.toMillis?.() || 0 }));
      const jobs     = jobsSnap.docs.map(d => ({ ...d.data(), id: d.id, _type: "job", _sortKey: d.data().createdAt?.toMillis?.() || 0 }));
      setFeed([...posts, ...articles, ...jobs].sort((a, b) => b._sortKey - a._sortKey));
      setLoading(false);
    });
    return () => unsub();
  }, [profile, industry, isAdmin]);

  const filtered = searchQuery.trim()
    ? feed.filter(item => {
        const q = searchQuery.toLowerCase();
        return item.text?.toLowerCase().includes(q) || item.title?.toLowerCase().includes(q)
          || item.name?.toLowerCase().includes(q) || item.authorName?.toLowerCase().includes(q)
          || item.company?.toLowerCase().includes(q) || item.tags?.some(t => t.toLowerCase().includes(q));
      })
    : feed;

  return (
    <div style={S.page}>
      {/* Search bar */}
      <div style={S.searchWrap}>
        <div style={{ ...S.searchBox, borderColor: searchFocused ? "#0D9488" : "#E4E2DC" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            style={S.searchInput}
            placeholder={`Search in ${industryLabel}…`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery && <button onClick={() => setSearchQuery("")} style={S.clearBtn}>✕</button>}
        </div>
      </div>

      {/* Compose bar */}
      <div style={S.composeBar}>
        <Avatar
          uid={profile?.uid}
          photoURL={profile?.photoURL}
          avatarId={profile?.avatarId || profile?.avatar}
          displayName={profile?.displayName}
          plan={profile?.plan || "trial"}
          role={profile?.role || "participant"}
          size={40}
        />
        <button style={S.composeBtn} onClick={() => navigate("/create-post")}>
          <span style={{ color: "#999", fontSize: 14 }}>Share something with {industryLabel}…</span>
          <div style={S.composePlus}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        </button>
      </div>

      {/* Stories */}
      <StoriesRow />

      {/* Weekly Fun Drop */}
      <div style={{ padding: "8px 14px 0" }}>
        <WeeklyGameCard profile={profile} />
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div style={S.empty}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <div style={{ color: "#9CA3AF", fontSize: 14, marginTop: 14, textAlign: "center" }}>
            {searchQuery ? "No results found." : "Your feed is loading. Check back soon."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {filtered.map(item => {
            if (item._type === "post")    return <PostCard    key={`p-${item.id}`} item={item} currentUser={user} profile={profile} />;
            if (item._type === "article") return <ArticleCard key={`a-${item.id}`} item={item} navigate={navigate} onAuthorTap={(uid) => setMiniProfileUid(uid)} />;
            if (item._type === "job")     return <JobCard     key={`j-${item.id}`} item={item} navigate={navigate} />;
            return null;
          })}
          <div style={S.caughtUp}>You're all caught up ✓</div>
        </div>
      )}

      {miniProfileUid && <MiniProfileCard uid={miniProfileUid} onClose={() => setMiniProfileUid(null)} />}
    </div>
  );
}

const S = {
  page:       { background: "#F3F2EF", minHeight: "100vh", paddingBottom: 90 },
  searchWrap: { background: "#fff", padding: "10px 12px", borderBottom: "1px solid #E4E2DC", position: "sticky", top: 0, zIndex: 10 },
  searchBox:  { display: "flex", alignItems: "center", gap: 8, background: "#F3F2EF", border: "1.5px solid", borderRadius: 24, padding: "8px 14px", transition: "border-color 0.2s" },
  searchInput:{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: "#1A1A1A", fontFamily: "DM Sans, sans-serif" },
  clearBtn:   { background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 13, padding: 0 },
  composeBar: { display: "flex", alignItems: "center", gap: 10, background: "#fff", padding: "10px 12px", borderBottom: "1px solid #E4E2DC" },
  composeBtn: { flex: 1, background: "#F3F2EF", border: "1.5px solid #E4E2DC", borderRadius: 24, padding: "9px 12px 9px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "DM Sans, sans-serif" },
  composePlus:{ width: 28, height: 28, borderRadius: "50%", background: "#0D9488", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  card:       { background: "#fff", borderTop: "1px solid #E4E2DC", borderBottom: "1px solid #E4E2DC", padding: "14px", textAlign: "left" },
  cardHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  name:       { fontSize: 14, fontWeight: 700, color: "#1A1A1A", fontFamily: "DM Sans, sans-serif", lineHeight: 1.3 },
  meta:       { fontSize: 12, color: "#888", marginTop: 2 },
  youBadge:   { fontSize: 10, border: "1px solid #0D9488", color: "#0D9488", borderRadius: 12, padding: "2px 7px", fontWeight: 600, flexShrink: 0 },
  bodyText:   { fontSize: 14, color: "#1A1A1A", lineHeight: 1.7, marginBottom: 8, whiteSpace: "pre-wrap" },
  tag:        { fontSize: 12, color: "#0D9488", fontWeight: 500 },
  postImg:    { width: "100%", borderRadius: 10, objectFit: "cover", maxHeight: 260, display: "block", marginBottom: 8 },
  countsRow:  { display: "flex", alignItems: "center", padding: "6px 0", borderTop: "1px solid #F0EFEA", marginTop: 4 },
  countText:  { fontSize: 12, color: "#888" },
  actionsRow: { display: "flex", borderTop: "1px solid #F0EFEA", paddingTop: 4 },
  actionBtn:  { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "none", border: "none", color: "#666", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "7px 0", fontFamily: "DM Sans, sans-serif", borderRadius: 6 },
  commentSection:  { borderTop: "1px solid #F0EFEA", marginTop: 8, paddingTop: 10 },
  commentInputRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  commentInputPill:{ flex: 1, display: "flex", alignItems: "center", background: "#F3F2EF", borderRadius: 24, padding: "6px 8px 6px 12px", gap: 6 },
  commentBox:      { flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#1A1A1A", fontFamily: "DM Sans, sans-serif" },
  sendBtn:         { width: 28, height: 28, borderRadius: "50%", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" },
  commentItem:     { display: "flex", gap: 8, marginBottom: 10 },
  commentBubble:   { background: "#F3F2EF", borderRadius: "0 12px 12px 12px", padding: "8px 12px", flex: 1 },
  commentName:     { fontSize: 12, fontWeight: 700, color: "#1A1A1A", marginBottom: 2 },
  commentText:     { fontSize: 13, color: "#333", lineHeight: 1.5 },
  commentTime:     { fontSize: 11, color: "#bbb", marginTop: 3 },
  typeLabel:      { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "#0D9488", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  articleTitle:   { fontSize: 16, fontWeight: 800, color: "#1A1A1A", marginBottom: 4, lineHeight: 1.35, fontFamily: "DM Sans, sans-serif" },
  empty:           { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "70px 24px" },
  caughtUp:        { textAlign: "center", color: "#BBB", fontSize: 13, padding: "20px 0 8px", fontStyle: "italic" },
  circlePill:      { display: "inline-flex", alignItems: "center", gap: 3, background: "#E6FAF8", color: "#0F6E56", borderRadius: 20, padding: "1px 7px", fontSize: 11, fontWeight: 600 },
  bondBadge:       { position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#0D9488", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" },
  trialActionsLock:{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #F0EFEA", padding: "8px 0 0", marginTop: 4 },
  trialLockText:   { flex: 1, fontSize: 12, color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" },
  trialLockBtn:    { background: "#0D9488", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 600, fontFamily: "DM Sans, sans-serif", cursor: "pointer", flexShrink: 0 },
};
