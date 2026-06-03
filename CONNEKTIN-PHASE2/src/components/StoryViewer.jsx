// src/components/StoryViewer.jsx
import { useState, useEffect, useRef } from "react";
import { db } from "../firebase/config";
import {
  doc, getDoc, updateDoc, increment,
  collection, getDocs, addDoc,
  serverTimestamp, orderBy, query,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

// stories = [{id, photo, name, caption, tags, ts, likes, commentCount, shares, uid}, ...]
// startId = which story to start from (first unseen)
export default function StoryViewer({ stories = [], startId = null, onClose, isTrial = false }) {
  const { user, profile } = useAuth();
  const timerRef = useRef(null);
  const fillRef  = useRef(null);

  // Find start index — first unseen, or 0
  const getStartIndex = () => {
    if (startId) {
      const idx = stories.findIndex(s => s.id === startId);
      if (idx !== -1) return idx;
    }
    // Find first unseen
    try {
      const viewed = JSON.parse(localStorage.getItem("ck_viewed_stories") || "{}");
      const firstUnseen = stories.findIndex(s => !viewed[s.id]);
      return firstUnseen !== -1 ? firstUnseen : 0;
    } catch {
      return 0;
    }
  };

  const [currentIndex, setCurrentIndex] = useState(() => getStartIndex());
  const [liked, setLiked]               = useState(false);
  const [likeCount, setLikeCount]       = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments]         = useState([]);
  const [commentText, setCommentText]   = useState("");
  const [posting, setPosting]           = useState(false);
  const [toast, setToast]               = useState("");

  const story = stories[currentIndex] || null;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  // ── When story changes ────────────────────────────────────────
  useEffect(() => {
    if (!story) return;
    markViewed(story.id);
    setLikeCount(story.likes || 0);
    setShowComments(false);
    setCommentText("");
    // Check liked
    try {
      const m = JSON.parse(localStorage.getItem(`ck_story_likes_${user?.uid}`) || "{}");
      setLiked(!!m[story.id]);
    } catch { setLiked(false); }
    startProgress();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentIndex]);

  function markViewed(id) {
    try {
      const v = JSON.parse(localStorage.getItem("ck_viewed_stories") || "{}");
      v[id] = true;
      localStorage.setItem("ck_viewed_stories", JSON.stringify(v));
    } catch {}
  }

  // ── Progress bar ──────────────────────────────────────────────
  function startProgress() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!fillRef.current) return;
    fillRef.current.style.transition = "none";
    fillRef.current.style.width = "0%";
    setTimeout(() => {
      if (fillRef.current) {
        fillRef.current.style.transition = "width 5000ms linear";
        fillRef.current.style.width = "100%";
      }
    }, 50);
    timerRef.current = setTimeout(goNext, 5200);
  }

  function pauseProgress() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (fillRef.current) {
      const w  = fillRef.current.getBoundingClientRect().width;
      const pw = fillRef.current.parentElement?.getBoundingClientRect().width || 1;
      fillRef.current.style.transition = "none";
      fillRef.current.style.width = `${(w / pw) * 100}%`;
    }
  }

  function goNext() {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      onClose();
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  }

  // ── Tap left/right to navigate ────────────────────────────────
  function handleTap(e) {
    if (showComments) return;
    const x = e.clientX;
    const w = window.innerWidth;
    if (x < w * 0.33) goPrev();
    else if (x > w * 0.66) goNext();
  }

  // ── Like ──────────────────────────────────────────────────────
  async function handleLike(e) {
    e.stopPropagation();
    if (!user) return;
    if (isTrial) { showToast("🔒 Upgrade to like & comment on stories"); return; }
    const newLiked = !liked;
    const newCount = Math.max(0, likeCount + (newLiked ? 1 : -1));
    setLiked(newLiked);
    setLikeCount(newCount);
    try {
      const m = JSON.parse(localStorage.getItem(`ck_story_likes_${user.uid}`) || "{}");
      if (newLiked) { m[story.id] = true; } else { delete m[story.id]; }
      localStorage.setItem(`ck_story_likes_${user.uid}`, JSON.stringify(m));
    } catch {}
    try {
      await updateDoc(doc(db, "stories", story.id), { likes: increment(newLiked ? 1 : -1) });
    } catch (err) { console.error(err); }
  }

  // ── Comments ──────────────────────────────────────────────────
  async function loadComments() {
    try {
      const snap = await getDocs(
        query(collection(db, "stories", story.id, "comments"), orderBy("ts", "asc"))
      );
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  }

  function openComments(e) {
    e.stopPropagation();
    pauseProgress();
    setShowComments(true);
    loadComments();
  }

  function closeComments() {
    setShowComments(false);
    startProgress();
  }

  async function submitComment() {
    if (!commentText.trim() || !user || posting) return;
    if (isTrial) { showToast("🔒 Upgrade to like & comment on stories"); return; }
    setPosting(true);
    try {
      await addDoc(collection(db, "stories", story.id, "comments"), {
        uid: user.uid,
        name: profile?.displayName || user.email,
        photo: profile?.photoURL || null,
        text: commentText.trim(),
        ts: serverTimestamp(),
      });
      await updateDoc(doc(db, "stories", story.id), { commentCount: increment(1) });
      setCommentText("");
      loadComments();
    } catch (err) { console.error(err); }
    finally { setPosting(false); }
  }

  // ── Share ─────────────────────────────────────────────────────
  async function handleShare(e) {
    e.stopPropagation();
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${story?.name}'s Story on ConnektIn`,
          text:  story?.caption || "Check out this story on ConnektIn!",
          url:   window.location.origin,
        });
      } else {
        await navigator.clipboard.writeText(window.location.origin);
      }
      await updateDoc(doc(db, "stories", story.id), { shares: increment(1) });
    } catch {}
  }

  function timeAgo(ts) {
    if (!ts) return "";
    const d    = ts.toDate?.() || new Date(ts);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1)  return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  if (!story) return null;

  return (
    <div style={sv.wrap} onClick={handleTap}>

      <div style={{ ...sv.bgBlur, backgroundImage: `url(${story.photo})` }} />
      <img src={story.photo} style={sv.img} alt="" onClick={e => e.stopPropagation()} />

      {/* Progress bars — one per story */}
      <div style={sv.progressWrap} onClick={e => e.stopPropagation()}>
        <div style={sv.progressBars}>
          {stories.map((s, idx) => (
            <div key={s.id} style={sv.progressBg}>
              <div
                ref={idx === currentIndex ? fillRef : null}
                style={{
                  ...sv.progressFill,
                  width: idx < currentIndex ? "100%" : idx === currentIndex ? "0%" : "0%",
                  transition: idx < currentIndex ? "none" : undefined,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Author info top-left */}
      <div style={sv.authorRow} onClick={e => e.stopPropagation()}>
        <div style={sv.authorAvatar}>
          {story.photo
            ? <img src={story.photo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} alt="" />
            : <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{(story.name || "?")[0].toUpperCase()}</span>
          }
        </div>
        <div>
          <div style={sv.authorName}>{story.name}</div>
          <div style={sv.timeAgo}>{timeAgo(story.ts)} · {currentIndex + 1}/{stories.length}</div>
        </div>
      </div>

      {/* Close */}
      <button style={sv.closeBtn} onClick={e => { e.stopPropagation(); onClose(); }}>✕</button>

      {/* Bottom */}
      <div style={sv.bottom} onClick={e => e.stopPropagation()}>
        <div style={sv.meta}>
          {story.caption && <div style={sv.caption}>{story.caption}</div>}
          {story.tags?.length > 0 && (
            <div style={sv.tagsRow}>
              {story.tags.map((t, i) => <span key={i} style={sv.tag}>{t}</span>)}
            </div>
          )}
        </div>
        <div style={sv.actions}>
          <button style={sv.actionBtn} onClick={handleLike}>
            <svg width="18" height="18" viewBox="0 0 24 24"
              fill={liked ? "#E53E3E" : "none"}
              stroke={liked ? "#E53E3E" : "rgba(255,255,255,0.9)"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {likeCount > 0 && <span style={sv.actionLabel}>{likeCount}</span>}
          </button>
          <button style={sv.actionBtn} onClick={openComments}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {(story.commentCount > 0) && <span style={sv.actionLabel}>{story.commentCount}</span>}
          </button>
          <button style={sv.actionBtn} onClick={handleShare}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            {(story.shares > 0) && <span style={sv.actionLabel}>{story.shares}</span>}
          </button>
        </div>
      </div>

      {toast && (
        <div style={{ position: "absolute", bottom: 110, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.82)", color: "#fff", borderRadius: 20, padding: "10px 20px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", zIndex: 20, whiteSpace: "nowrap", backdropFilter: "blur(8px)" }}>
          {toast}
        </div>
      )}

      {showComments && (
        <div style={sv.commentsDrawer} onClick={e => e.stopPropagation()}>
          <div style={sv.drawerHandle} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "15px", fontWeight: "700", color: "#1A1A1A", fontFamily: "'DM Sans', sans-serif" }}>Comments</span>
            <button style={sv.drawerClose} onClick={closeComments}>✕</button>
          </div>
          <div style={sv.commentList}>
            {comments.length === 0 ? (
              <p style={{ textAlign: "center", color: "#aaa", fontSize: "13px", padding: "20px 0", fontFamily: "'DM Sans', sans-serif" }}>No comments yet. Be first! 👇</p>
            ) : comments.map(c => (
              <div key={c.id} style={sv.commentItem}>
                {c.photo && (c.photo.startsWith("http") || c.photo.startsWith("data:"))
                  ? <img src={c.photo} alt={c.name} style={{ ...sv.commentAvatar, objectFit: "cover" }} />
                  : <div style={sv.commentAvatar}>{(c.name || "U")[0].toUpperCase()}</div>
                }
                <div style={{ flex: 1 }}>
                  <div style={sv.commentName}>{c.name}</div>
                  <div style={sv.commentText}>{c.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={sv.commentInputRow}>
            <input
              value={commentText}
              onChange={e => !isTrial && setCommentText(e.target.value)}
              placeholder={isTrial ? "Upgrade to comment…" : "Add a comment…"}
              style={{ ...sv.commentInput, opacity: isTrial ? 0.6 : 1, cursor: isTrial ? "not-allowed" : "text" }}
              onKeyDown={e => e.key === "Enter" && submitComment()}
              readOnly={isTrial}
            />
            <button onClick={submitComment} disabled={posting || !commentText.trim()} style={{ ...sv.sendBtn, opacity: posting || !commentText.trim() ? 0.5 : 1 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const sv = {
  wrap: { position: "fixed", inset: 0, background: "#000", zIndex: 9000, display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif" },
  bgBlur: { position: "absolute", inset: 0, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(20px) brightness(0.4)", transform: "scale(1.1)", zIndex: 0 },
  img: { width: "100%", height: "100%", objectFit: "contain", position: "absolute", inset: 0, zIndex: 1 },
  progressWrap: { position: "absolute", top: "max(12px, env(safe-area-inset-top, 12px))", left: "12px", right: "12px", zIndex: 3 },
  progressBars: { display: "flex", gap: 4 },
  progressBg: { flex: 1, height: "3px", background: "rgba(255,255,255,0.3)", borderRadius: "2px", overflow: "hidden" },
  progressFill: { height: "100%", background: "#fff", borderRadius: "2px", width: "0%" },
  authorRow: { position: "absolute", top: "max(26px, calc(env(safe-area-inset-top, 0px) + 26px))", left: "14px", zIndex: 3, display: "flex", alignItems: "center", gap: 10 },
  authorAvatar: { width: 36, height: 36, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(255,255,255,0.6)", background: "#0A1628", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  authorName: { fontSize: "14px", fontWeight: "700", color: "#fff" },
  timeAgo: { fontSize: "11px", color: "rgba(255,255,255,0.6)" },
  closeBtn: { position: "absolute", top: "max(22px, calc(env(safe-area-inset-top, 0px) + 22px))", right: "14px", width: "34px", height: "34px", borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 3 },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 18px max(28px, calc(env(safe-area-inset-bottom, 0px) + 20px))", background: "linear-gradient(transparent, rgba(0,0,0,0.8))", zIndex: 2 },
  meta: { marginBottom: "14px" },
  caption: { fontSize: "13px", color: "rgba(255,255,255,0.9)", lineHeight: "1.5", marginBottom: "8px" },
  tagsRow: { display: "flex", flexWrap: "wrap", gap: "6px" },
  tag: { fontSize: "11px", color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.15)", borderRadius: "20px", padding: "3px 10px", fontWeight: "600" },
  actions: { display: "flex", gap: "10px", alignItems: "center" },
  actionBtn: { display: "flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "20px", padding: "8px 14px", cursor: "pointer", backdropFilter: "blur(8px)" },
  actionLabel: { fontSize: "13px", color: "#fff", fontWeight: "600" },
  commentsDrawer: { position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderRadius: "22px 22px 0 0", padding: "14px 18px 32px", maxHeight: "62vh", display: "flex", flexDirection: "column", zIndex: 10 },
  drawerHandle: { width: "36px", height: "3px", background: "#E4E2DC", borderRadius: "2px", margin: "0 auto 14px" },
  drawerClose: { background: "none", border: "none", color: "#888", fontSize: "16px", cursor: "pointer", padding: "4px" },
  commentList: { flex: 1, overflowY: "auto", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "12px" },
  commentItem: { display: "flex", gap: "10px", alignItems: "flex-start" },
  commentAvatar: { width: "32px", height: "32px", borderRadius: "50%", background: "#EEF3FA", color: "#0A66C2", fontWeight: "700", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commentName: { fontSize: "12px", fontWeight: "700", color: "#1A1A1A", marginBottom: "2px" },
  commentText: { fontSize: "13px", color: "#333", lineHeight: "1.4" },
  commentInputRow: { display: "flex", gap: "8px", alignItems: "center" },
  commentInput: { flex: 1, padding: "10px 14px", border: "1.5px solid #E4E2DC", borderRadius: "20px", fontSize: "14px", color: "#1A1A1A", outline: "none", fontFamily: "'DM Sans', sans-serif", background: "#F8F8F8" },
  sendBtn: { width: "40px", height: "40px", borderRadius: "50%", background: "#0A66C2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
};
