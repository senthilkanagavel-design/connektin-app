// src/pages/ArticleDetail.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment,
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";

const timeAgo = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const levelConfig = {
  beginner:     { color: "#16a34a", bg: "#dcfce7", label: "Beginner" },
  intermediate: { color: "#d97706", bg: "#fef3c7", label: "Intermediate" },
  advanced:     { color: "#dc2626", bg: "#fee2e2", label: "Advanced" },
};

export default function ArticleDetail() {
  const { articleId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef(null);

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [readPct, setReadPct] = useState(0);
  const readTracked = useRef(false);

  const handleBack = () => {
    const from = location.state?.from;
    if (from === "articles") navigate("/dashboard", { state: { tab: "articles" } });
    else navigate("/dashboard", { state: { tab: "home" } });
  };

  // Scroll progress
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const total = scrollHeight - clientHeight;
      setReadPct(total > 0 ? Math.min(100, Math.round((scrollTop / total) * 100)) : 0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loading]);

  useEffect(() => {
    if (!articleId || !user) return;
    const unsub = onSnapshot(doc(db, "articles", articleId), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setArticle({ id: snap.id, ...data });
        setLiked(data.likedBy?.includes(user.uid) || false);
        setLikeCount(data.likeCount || 0);
        if ((data.commentCount || 0) > 0) setShowComments(true);
        if (!readTracked.current) {
          readTracked.current = true;
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.data();
          const alreadyRead = userData?.readArticles?.includes(articleId);
          if (!alreadyRead) {
            const level = data.level || "beginner";
            await updateDoc(userRef, {
              readArticles: arrayUnion(articleId),
              [`readCounts.${level}`]: increment(1),
              weeklySignal: increment(5),
              monthlySignal: increment(5),
              allTimeSignal: increment(5),
            });
            await updateDoc(doc(db, "articles", articleId), {
              readCount: increment(1),
            });
          }
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [articleId, user]);

  useEffect(() => {
    if (!articleId || !showComments) return;
    const q = query(
      collection(db, "articles", articleId, "comments"),
      orderBy("ts", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [articleId, showComments]);

  const handleLike = async () => {
    if (!user) return;
    const ref = doc(db, "articles", articleId);
    if (liked) {
      setLiked(false);
      await updateDoc(ref, { likedBy: arrayRemove(user.uid), likeCount: increment(-1) });
    } else {
      setLiked(true);
      await updateDoc(ref, { likedBy: arrayUnion(user.uid), likeCount: increment(1) });
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = article?.title || "Check out this article on ConnektIn";
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch (e) { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url); alert("Link copied!"); }
      catch (e) { alert("Copy this link: " + url); }
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || posting) return;
    setPosting(true);
    await addDoc(collection(db, "articles", articleId, "comments"), {
      uid: user.uid,
      name: profile?.displayName || "User",
      photo: profile?.photoURL || null,
      text: commentText.trim(),
      ts: serverTimestamp(),
    });
    await updateDoc(doc(db, "articles", articleId), { commentCount: increment(1) });
    setCommentText("");
    setPosting(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#F3F2EF" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #E4E2DC", borderTopColor: "#0D9488", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!article) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#F3F2EF" }}>
        <p style={{ color: "#888", fontFamily: "DM Sans, sans-serif" }}>Article not found.</p>
      </div>
    );
  }

  const lvl = levelConfig[article.level] || levelConfig.beginner;

  return (
    <div style={{
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "#F3F2EF",
      fontFamily: "'DM Sans', sans-serif",
      overflow: "hidden",
    }}>

      {/* ── Sticky header ── */}
      <div style={{
        flexShrink: 0,
        background: "rgba(255,255,255,0.96)",
        borderBottom: "1px solid #E4E2DC",
        position: "relative",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px" }}>
          <button onClick={handleBack} style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "#F3F2EF", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>Article</span>

          <button onClick={handleShare} style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "#F3F2EF", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>

        {/* Reading progress bar */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#E4E2DC" }}>
          <div style={{
            height: "100%",
            width: `${readPct}%`,
            background: "#0D9488",
            borderRadius: "0 2px 2px 0",
            transition: "width 0.1s linear",
          }} />
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

        {/* Cover image */}
        <div style={{ position: "relative" }}>
          {article.coverImage ? (
            <img src={article.coverImage} alt="cover" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{
              height: 180,
              background: "linear-gradient(135deg, #0A1628 0%, #0D9488 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 72, fontWeight: 900, letterSpacing: -2 }}>RCM</span>
            </div>
          )}
          {/* Level badge overlay */}
          <div style={{ position: "absolute", bottom: 12, left: 14 }}>
            <span style={{
              background: lvl.color, color: "#fff",
              fontSize: 11, fontWeight: 700,
              padding: "4px 10px", borderRadius: 20,
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>{lvl.label}</span>
          </div>
          {/* Read time overlay */}
          {article.readTime && (
            <div style={{ position: "absolute", bottom: 12, right: 14, background: "rgba(0,0,0,0.5)", borderRadius: 12, padding: "4px 10px" }}>
              <span style={{ color: "#fff", fontSize: 11, fontWeight: 500 }}>{article.readTime}</span>
            </div>
          )}
        </div>

        {/* ── Main content card ── */}
        <div style={{ margin: "12px 12px 0", background: "#fff", borderRadius: 16, border: "1px solid #E4E2DC", padding: "18px 16px" }}>

          {/* Title */}
          <h1 style={{
            fontSize: 20, fontWeight: 800, color: "#0A1628",
            lineHeight: 1.3, margin: "0 0 14px",
          }}>{article.title}</h1>

          {/* Author row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            paddingBottom: 14, borderBottom: "1px solid #F3F2EF",
          }}>
            <Avatar
              uid={article.authorUid}
              photoURL={article.authorPhoto}
              plan={article.authorPlan || "trial"}
              role="participant"
              size={38}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{article.authorName}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                {timeAgo(article.publishedAt || article.createdAt)} · {article.readCount || 0} reads
              </div>
            </div>
            {article.authorPlan && article.authorPlan !== "trial" && (
              <div style={{
                background: article.authorPlan === "thermite" ? "#0D9488" :
                            article.authorPlan === "admin" ? "#7C3AED" : "#D97706",
                color: "#fff", fontSize: 10, fontWeight: 700,
                padding: "3px 8px", borderRadius: 10, textTransform: "capitalize",
              }}>{article.authorPlan}</div>
            )}
          </div>

          {/* Summary blockquote */}
          {article.summary && (
            <div style={{
              borderLeft: "3px solid #0D9488",
              background: "#F0FDFA",
              borderRadius: "0 10px 10px 0",
              padding: "10px 14px",
              margin: "14px 0",
            }}>
              <p style={{ fontSize: 13, color: "#0F766E", lineHeight: 1.65, fontStyle: "italic", margin: 0 }}>
                {article.summary}
              </p>
            </div>
          )}

          {/* Body */}
          <div
            style={{
              fontSize: 15, color: "#1A1A1A", lineHeight: 1.85,
              marginTop: article.summary ? 0 : 14,
            }}
            dangerouslySetInnerHTML={{ __html: article.content?.replace(/\n/g, "<br/>") }}
          />
        </div>

        {/* ── Action bar ── */}
        <div style={{
          margin: "10px 12px",
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #E4E2DC",
          display: "flex",
          alignItems: "center",
        }}>
          {/* Like */}
          <button
            onClick={handleLike}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              padding: "12px 0",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill={liked ? "#0D9488" : "none"}
              stroke={liked ? "#0D9488" : "#555"}
              strokeWidth="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: liked ? 700 : 500, color: liked ? "#0D9488" : "#888" }}>
              {likeCount > 0 ? likeCount : "Like"}
            </span>
          </button>

          <div style={{ width: 1, height: 30, background: "#E4E2DC" }} />

          {/* Comment */}
          <button
            onClick={() => setShowComments((v) => !v)}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              padding: "12px 0",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke={showComments ? "#0D9488" : "#555"} strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 500, color: showComments ? "#0D9488" : "#888" }}>
              {article.commentCount > 0 ? article.commentCount : "Comment"}
            </span>
          </button>

          <div style={{ width: 1, height: 30, background: "#E4E2DC" }} />

          {/* Share */}
          <button
            onClick={handleShare}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              padding: "12px 0",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 500, color: "#888" }}>Share</span>
          </button>
        </div>

        {/* ── Comments ── */}
        {showComments && (
          <div style={{
            margin: "0 12px 20px",
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #E4E2DC",
            padding: "14px 14px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", marginBottom: 12 }}>
              Comments{article.commentCount > 0 ? ` · ${article.commentCount}` : ""}
            </div>

            {/* Comment input */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#F3F2EF", borderRadius: 24, padding: "6px 8px 6px 10px",
              marginBottom: 14,
            }}>
              <Avatar
                uid={user?.uid}
                photoURL={profile?.photoURL}
                avatarId={profile?.avatarId || profile?.avatar}
                displayName={profile?.displayName}
                plan={profile?.plan || "trial"}
                role={profile?.role || "participant"}
                size={28}
              />
              <input
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  fontSize: 13, color: "#1A1A1A", fontFamily: "'DM Sans', sans-serif",
                }}
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim() || posting}
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: commentText.trim() ? "#0D9488" : "#E4E2DC",
                  border: "none", cursor: commentText.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "background 0.2s",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke={commentText.trim() ? "#fff" : "#aaa"} strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>

            {/* Comment list */}
            {comments.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <Avatar uid={c.uid} photoURL={c.photo} size={30} />
                <div style={{
                  background: "#F3F2EF",
                  borderRadius: "0 12px 12px 12px",
                  padding: "8px 12px", flex: 1,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1A1A", marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>{c.text}</div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>{timeAgo(c.ts)}</div>
                </div>
              </div>
            ))}

            {comments.length === 0 && (
              <p style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "8px 0 4px" }}>
                No comments yet. Be the first!
              </p>
            )}
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
