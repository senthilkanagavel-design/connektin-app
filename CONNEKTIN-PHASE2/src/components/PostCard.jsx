// src/components/PostCard.jsx
import { useState, useRef, useEffect } from "react";
import {
  doc, updateDoc, arrayUnion, arrayRemove, increment,
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import MiniProfileCard from "./MiniProfileCard";
import AvatarFullView from "./AvatarFullView";
import PostImageFullView from "./PostImageFullView";
import ReportModal from "./ReportModal";
import { addSignal, SIGNAL_POINTS } from "../utils/signal";

function timeAgo(ts) {
  if (!ts) return "";
  const seconds = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return ts.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const PLAN_BADGE = {
  thermite: { label: "TherMite", bg: "#E6FAF8", color: "#0F6E56", border: "#99F6E4" },
  regular:  { label: "Regular",  bg: "#E8EAF0", color: "#0A1628", border: "#C8CAD4" },
  recruiter:{ label: "Recruiter",bg: "#F5F3FF", color: "#7C3AED", border: "#C4B5FD" },
};

export default function PostCard({ post, currentUser, profile, circling = [] }) {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments]         = useState([]);
  const [commentText, setCommentText]   = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [liking, setLiking]             = useState(false);
  const [expanded, setExpanded]         = useState(false);
  const [miniProfileUid, setMiniProfileUid] = useState(null);
  // ── NEW: full-view states ─────────────────────────────────────────────────
  const [fullViewPhoto, setFullViewPhoto] = useState(null); // { src, name }
  const [showImageView, setShowImageView] = useState(false);
  // ─────────────────────────────────────────────────────────────────────────
  const [menuOpen, setMenuOpen]         = useState(false);
  const [showReport, setShowReport]     = useState(false);
  const inputRef = useRef(null);

  const uid         = currentUser?.uid;
  const isLiked     = Array.isArray(post.likedBy) && post.likedBy.includes(uid);
  const likeCount   = post.likedBy?.length || 0;
  const isTrialUser = profile?.plan === "trial";
  const isOwner     = post.uid === uid;
  const isInCircle  = !isOwner && Array.isArray(circling) && circling.includes(post.uid);
  const planBadge   = isOwner ? PLAN_BADGE[profile?.plan] : PLAN_BADGE[post.plan];

  // Resolve the photo URL for the post author's avatar
  const authorPhotoURL = isOwner ? profile?.photoURL : post.photo;
  const authorName     = isOwner ? profile?.displayName : post.name;

  useEffect(() => {
    if (!showComments) return;
    const q = query(collection(db, "posts", post.id, "comments"), orderBy("ts", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [showComments, post.id]);

  const handleLike = async () => {
    if (isTrialUser || liking) return;
    setLiking(true);
    try {
      const ref = doc(db, "posts", post.id);
      if (isLiked) {
        await updateDoc(ref, { likedBy: arrayRemove(uid) });
      } else {
        await updateDoc(ref, { likedBy: arrayUnion(uid) });
        if (post.uid && post.uid !== uid) {
          await addSignal(post.uid, SIGNAL_POINTS.POST_LIKED_BY_OTHERS);
        }
      }
    } catch (e) { console.error("Like error:", e); }
    setLiking(false);
  };

  const handleComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "posts", post.id, "comments"), {
        uid, name: profile?.displayName || "User",
        text: commentText.trim(), ts: serverTimestamp(),
      });
      await updateDoc(doc(db, "posts", post.id), { commentCount: increment(1) });
      await addSignal(uid, SIGNAL_POINTS.COMMENT_GIVEN);
      if (post.uid && post.uid !== uid) {
        await addSignal(post.uid, SIGNAL_POINTS.POST_COMMENT_RECEIVED);
      }
      setCommentText("");
    } catch (e) { console.error("Comment error:", e); }
    setSubmitting(false);
  };

  const handleShare = async () => {
    const text = `${post.name} on ConnektIn:\n\n${post.text}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      alert("Post text copied to clipboard.");
    }
  };

  const toggleComments = () => {
    setShowComments((v) => !v);
    if (!showComments) setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleAuthorTap = () => {
    if (isOwner) return;
    if (post.uid) setMiniProfileUid(post.uid);
  };

  // ── NEW: tap avatar image specifically to open full view ─────────────────
  const handleAvatarImageTap = (e) => {
    e.stopPropagation(); // don't also fire handleAuthorTap → MiniProfileCard
    if (authorPhotoURL) {
      setFullViewPhoto({ src: authorPhotoURL, name: authorName });
    }
    // If no real photo (using avatar/initials), fall through to MiniProfileCard
    else if (!isOwner && post.uid) {
      setMiniProfileUid(post.uid);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleCommentAuthorTap = (c) => {
    if (c.uid && c.uid !== uid) setMiniProfileUid(c.uid);
  };

  const shouldTruncate = post.text?.length > 220;
  const displayText = shouldTruncate && !expanded ? post.text.slice(0, 220) + "…" : post.text;

  return (
    <>
      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          {/* Avatar — tapping the image opens full view; tapping name opens MiniProfile */}
          <div
            style={{ ...s.avatarWrap, cursor: authorPhotoURL ? "zoom-in" : (isOwner ? "default" : "pointer") }}
            onClick={handleAvatarImageTap}
          >
            <Avatar
              uid={post.uid}
              photoURL={isOwner ? profile?.photoURL : post.photo}
              avatarId={isOwner ? (profile?.avatarId || profile?.avatar) : (post.avatarId || post.avatar)}
              displayName={isOwner ? profile?.displayName : post.name}
              plan={isOwner ? (profile?.plan || "trial") : (post.plan || "trial")}
              role={isOwner ? (profile?.role || "participant") : (post.role || "participant")}
              size={44}
              inCircle={isInCircle}
            />
          </div>
          <div style={s.meta}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <div style={{ ...s.name, cursor: isOwner ? "default" : "pointer" }} onClick={handleAuthorTap}>
                {post.name || "User"}
              </div>
              {isOwner && <div style={s.ownerBadge}>You</div>}
              {planBadge && (
                <div style={{ ...s.planBadge, background: planBadge.bg, color: planBadge.color, border: `1px solid ${planBadge.border}` }}>
                  {planBadge.label}
                </div>
              )}
            </div>
            {isInCircle && <div style={s.circlePill}>∞ In your Circle</div>}
            <div style={s.time}>{timeAgo(post.ts)} · {post.industry?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div>
          </div>
          {!isOwner && (
            <div style={{ position: "relative", flexShrink: 0, alignSelf: "flex-start" }}>
              <button style={s.menuBtn} onClick={() => setMenuOpen((v) => !v)} aria-label="Post options">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="5" r="0.8" /><circle cx="12" cy="12" r="0.8" /><circle cx="12" cy="19" r="0.8" />
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div style={s.menuOverlay} onClick={() => setMenuOpen(false)} />
                  <div style={s.menuDropdown}>
                    <button
                      style={s.menuItem}
                      onClick={() => { setMenuOpen(false); setShowReport(true); }}
                    >
                      🚩 Report post
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={s.body}>
          <p style={s.text}>{displayText}</p>
          {shouldTruncate && (
            <button style={s.seeMore} onClick={() => setExpanded((v) => !v)}>
              {expanded ? "See less" : "See more"}
            </button>
          )}
          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div style={s.tagsRow}>
              {post.tags.map((tag) => <span key={tag} style={s.tag}>#{tag}</span>)}
            </div>
          )}
        </div>

        {post.image && (
          <img
            src={post.image}
            alt="post"
            style={{ ...s.postImage, cursor: "zoom-in" }}
            onClick={() => setShowImageView(true)}
          />
        )}

        {(likeCount > 0 || post.commentCount > 0) && (
          <div style={s.statsBar}>
            {likeCount > 0 && <span style={s.statItem}>👍 {likeCount}</span>}
            {post.commentCount > 0 && (
              <span style={{ ...s.statItem, marginLeft: "auto", cursor: "pointer" }} onClick={!isTrialUser ? toggleComments : undefined}>
                {post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        <div style={s.hr} />

        {/* Actions */}
        {isTrialUser ? (
          <div style={s.trialLock}>
            <span>🔒</span>
            <span style={s.trialLockText}>Upgrade to like, comment & engage</span>
            <button style={s.trialLockBtn} onClick={() => navigate("/subscribe?ref=posts")}>Upgrade</button>
          </div>
        ) : (
          <div style={s.actions}>
            <button
              style={{ ...s.actionBtn, color: isLiked ? "#0D9488" : "#666", fontWeight: isLiked ? 700 : 500 }}
              onClick={handleLike}
              disabled={liking}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill={isLiked ? "#0D9488" : "none"} stroke={isLiked ? "#0D9488" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
              Like
            </button>
            <button style={{ ...s.actionBtn, color: showComments ? "#0D9488" : "#666" }} onClick={toggleComments}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={showComments ? "#0D9488" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {post.commentCount ? `Comment (${post.commentCount})` : "Comment"}
            </button>
            <button style={{ ...s.actionBtn, color: "#666" }} onClick={handleShare}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Share
            </button>
          </div>
        )}

        {/* Comments */}
        {!isTrialUser && showComments && (
          <div style={s.commentsSection}>
            <div style={s.commentInputRow}>
              <Avatar
                uid={currentUser?.uid}
                photoURL={profile?.photoURL}
                avatarId={profile?.avatarId || profile?.avatar}
                displayName={profile?.displayName}
                plan={profile?.plan || "trial"}
                role={profile?.role || "participant"}
                size={32}
              />
              <div style={s.commentInputWrap}>
                <input
                  ref={inputRef}
                  style={s.commentInput}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                />
                {commentText.trim() && (
                  <button style={{ ...s.commentSendBtn, opacity: submitting ? 0.5 : 1 }} onClick={handleComment} disabled={submitting}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                )}
              </div>
            </div>
            {comments.length === 0 ? (
              <div style={s.noComments}>No comments yet. Be the first!</div>
            ) : (
              <div style={s.commentsList}>
                {comments.map((c) => (
                  <div key={c.id} style={s.commentItem}>
                    <div style={{ cursor: c.uid && c.uid !== uid ? "pointer" : "default" }} onClick={() => handleCommentAuthorTap(c)}>
                      <Avatar uid={c.uid} photoURL={c.photo} displayName={c.name} plan={c.plan || "trial"} role={c.role || "participant"} size={28} />
                    </div>
                    <div style={s.commentBubble}>
                      <div style={{ ...s.commentName, cursor: c.uid && c.uid !== uid ? "pointer" : "default" }} onClick={() => handleCommentAuthorTap(c)}>
                        {c.name}
                      </div>
                      <div style={s.commentText}>{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {miniProfileUid && (
        <MiniProfileCard uid={miniProfileUid} onClose={() => setMiniProfileUid(null)} />
      )}

      {/* ── NEW: Full-view photo modal ─────────────────────────────────────── */}
      {fullViewPhoto && (
        <AvatarFullView
          src={fullViewPhoto.src}
          name={fullViewPhoto.name}
          onClose={() => setFullViewPhoto(null)}
        />
      )}

      {/* ── NEW: Full-view post image modal ───────────────────────────────── */}
      {showImageView && post.image && (
        <PostImageFullView
          src={post.image}
          onClose={() => setShowImageView(false)}
        />
      )}
      {/* ──────────────────────────────────────────────────────────────────── */}

      {showReport && (
        <ReportModal
          targetType="post"
          targetId={post.id}
          targetName={post.name}
          targetOwnerUid={post.uid}
          currentUser={currentUser}
          profile={profile}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}

const s = {
  card:          { background: "#fff", marginBottom: 8, fontFamily: "'DM Sans', sans-serif", borderRadius: 12, overflow: "hidden", border: "1px solid #E4E2DC", borderLeft: "3px solid #0D9488" },
  header:        { display: "flex", alignItems: "center", gap: 10, padding: "14px 14px 0" },
  avatarWrap:    { flexShrink: 0 },
  meta:          { flex: 1, textAlign: "left" },
  name:          { fontSize: 14, fontWeight: 700, color: "#1A1A1A" },
  planBadge:     { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 },
  ownerBadge:    { fontSize: 10, color: "#0D9488", fontWeight: 700, border: "1px solid #0D9488", borderRadius: 10, padding: "2px 7px" },
  circlePill:    { display: "inline-flex", alignItems: "center", fontSize: 11, color: "#0D9488", fontWeight: 600, background: "#E6F7F5", borderRadius: 10, padding: "2px 8px", marginTop: 2 },
  time:          { fontSize: 11, color: "#9CA3AF", marginTop: 3 },
  menuBtn:       { background: "none", border: "none", cursor: "pointer", padding: "4px 2px", display: "flex", alignItems: "center", justifyContent: "center" },
  menuOverlay:   { position: "fixed", inset: 0, zIndex: 90 },
  menuDropdown:  { position: "absolute", top: 26, right: 0, zIndex: 91, background: "#fff", border: "1px solid #E4E2DC", borderRadius: 10, boxShadow: "0 4px 14px rgba(0,0,0,0.10)", overflow: "hidden", minWidth: 150 },
  menuItem:      { display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "11px 14px", fontSize: 13.5, fontWeight: 600, color: "#1A1A1A", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  body:          { padding: "10px 14px 4px" },
  text:          { fontSize: 14, color: "#1A1A1A", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", textAlign: "left" },
  seeMore:       { background: "none", border: "none", color: "#0D9488", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "4px 0 0", fontFamily: "'DM Sans', sans-serif" },
  tagsRow:       { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag:           { fontSize: 12, color: "#0D9488", fontWeight: 500 },
  postImage:     { width: "100%", maxHeight: 320, objectFit: "cover", display: "block" },
  statsBar:      { display: "flex", alignItems: "center", padding: "6px 14px 2px" },
  statItem:      { fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 4 },
  hr:            { height: 1, background: "#F3F2EF", margin: "4px 0 0" },
  trialLock:     { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#F9F8FF" },
  trialLockText: { flex: 1, fontSize: 12, color: "#9CA3AF" },
  trialLockBtn:  { background: "#0D9488", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
  actions:       { display: "flex", justifyContent: "space-around" },
  actionBtn:     { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "none", border: "none", fontSize: 13, padding: "9px 4px", fontFamily: "'DM Sans', sans-serif", borderRadius: 4, cursor: "pointer" },
  commentsSection:  { borderTop: "1px solid #E4E2DC", padding: "12px 14px", background: "#FAFAF8" },
  commentInputRow:  { display: "flex", gap: 8, alignItems: "center", marginBottom: 12 },
  commentInputWrap: { flex: 1, position: "relative", display: "flex", alignItems: "center" },
  commentInput:     { flex: 1, background: "#fff", border: "1.5px solid #E4E2DC", borderRadius: 20, padding: "8px 40px 8px 14px", fontSize: 13, color: "#1A1A1A", outline: "none", fontFamily: "'DM Sans', sans-serif", width: "100%", boxSizing: "border-box" },
  commentSendBtn:   { position: "absolute", right: 6, background: "#0D9488", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 },
  noComments:       { fontSize: 13, color: "#999", textAlign: "center", padding: "8px 0" },
  commentsList:     { display: "flex", flexDirection: "column", gap: 10 },
  commentItem:      { display: "flex", gap: 8, alignItems: "flex-start" },
  commentBubble:    { background: "#fff", border: "1px solid #E4E2DC", borderRadius: "0 14px 14px 14px", padding: "6px 12px", maxWidth: "calc(100% - 38px)" },
  commentName:      { fontSize: 12, fontWeight: 700, color: "#1A1A1A" },
  commentText:      { fontSize: 13, color: "#333", lineHeight: 1.5, marginTop: 2 },
};
