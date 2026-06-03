// src/components/StoriesRow.jsx
import { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase/config";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import {
  collection, query, orderBy, getDocs,
  addDoc, serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { addSignal, SIGNAL_POINTS } from "../utils/signal";
import StoryViewer from "./StoryViewer";
import CommunityGuidelinesBar from "./CommunityGuidelinesBar";

// ── Segmented SVG ring — unique gradId per instance ───────────────
function StoryRing({ count = 1, seen = false, size = 56, gradId = "sg0", children }) {
  const r      = (size / 2) - 4;
  const cx     = size / 2;
  const cy     = size / 2;
  const circum = 2 * Math.PI * r;
  const gap    = count > 1 ? 5 : 0;
  const segLen = (circum - gap * count) / count;
  const strokeW = seen ? 3 : 3.5;

  const segments = [];
  for (let i = 0; i < count; i++) {
    const offset = -(i * (segLen + gap)) - circum / 4;
    segments.push(
      <circle
        key={i}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={seen ? "#D1D5DB" : `url(#${gradId})`}
        strokeWidth={strokeW}
        strokeDasharray={`${segLen} ${circum - segLen}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    );
  }

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#0D9488" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        {segments}
      </svg>
      <div style={{
        position: "absolute",
        top: 5, left: 5,
        width: size - 10, height: size - 10,
        borderRadius: "50%",
        overflow: "hidden",
        border: "2px solid #fff",
        background: "#F3F2EF",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Permanent + Add button ────────────────────────────────────────
function AddButton({ size = 56 }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: "50%",
      background: "#0A1628",
      border: "2px dashed #0D9488",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      boxSizing: "border-box",
    }}>
      <div style={{
        width: 22, height: 22,
        borderRadius: "50%",
        background: "#0D9488",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <line x1="5" y1="1.5" x2="5" y2="8.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="1.5" y1="5" x2="8.5" y2="5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

export default function StoriesRow() {
  const { user, profile } = useAuth();
  const fileRef = useRef();

  const isTrial = profile?.plan === "trial" && profile?.userType !== "recruiter";

  const [myStories,    setMyStories]    = useState([]);
  const [grouped,      setGrouped]      = useState([]);
  const [viewingStories, setViewingStories] = useState([]);
  const [viewingStartId, setViewingStartId] = useState(null);
  const [showCompose,  setShowCompose]  = useState(false);
  const [showUpgrade,  setShowUpgrade]  = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [caption,      setCaption]      = useState("");
  const [tags,         setTags]         = useState("");
  const [submitting,   setSubmitting]   = useState(false);

  useEffect(() => { if (user?.uid) loadStories(); }, [user?.uid]);

  async function loadStories() {
    try {
      const snap = await getDocs(
        query(collection(db, "stories"), orderBy("ts", "desc"))
      );
      const now   = new Date();
      const mine  = [];
      const byUid = {};

      snap.docs.forEach(d => {
        const data = d.data();
        if (!data.photo) return;
        const exp = data.expiresAt?.toDate?.() || null;
        if (!exp || exp < now) return;

        if (data.uid === user.uid) {
          mine.push({ id: d.id, ...data });
        } else {
          if (!byUid[data.uid]) byUid[data.uid] = [];
          byUid[data.uid].push({ id: d.id, ...data });
        }
      });

      setMyStories(mine);

      const groups = Object.values(byUid).map(arr => ({
        uid:      arr[0].uid,
        name:     arr[0].name,
        initials: arr[0].initials,
        photo:    arr[0].photo,
        stories:  arr,
        latestId: arr[0].id,
        count:    arr.length,
      }));
      setGrouped(groups);
    } catch (err) {
      console.error("loadStories:", err);
    }
  }

  function handleAddClick() {
    if (isTrial) { setShowUpgrade(true); return; }
    fileRef.current?.click();
  }

  function handleMyStoryClick() {
    if (myStories.length > 0) {
      // sort oldest first so unseen logic works correctly
      const sorted = [...myStories].sort((a, b) => (a.ts?.toMillis?.() || 0) - (b.ts?.toMillis?.() || 0));
      setViewingStories(sorted);
      setViewingStartId(null);
    }
  }

  function handleFileChange(e) {
    if (isTrial) { setShowUpgrade(true); e.target.value = ""; return; }
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert("Photo too large. Max 3MB."); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setPendingPhoto(ev.target.result);
      setCaption(""); setTags("");
      setShowCompose(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function submitStory() {
    if (!pendingPhoto || !user) return;
    setSubmitting(true);
    const name     = profile?.displayName || user.email;
    const initials = name.trim().split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase();
    const tagList  = tags.trim()
      ? tags.split(/[\s,]+/).filter(t => t.startsWith("#") && t.length > 1)
      : [];
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    try {
      // Upload photo to Storage, save URL (not base64) to Firestore
      const storageRef = ref(storage, `stories/${user.uid}_${Date.now()}.jpg`);
      await uploadString(storageRef, pendingPhoto, "data_url");
      const photoURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, "stories"), {
        uid: user.uid, name, initials,
        photo: photoURL,
        caption: caption.trim(),
        tags: tagList,
        expiresAt,
        ts: serverTimestamp(),
        likes: 0, commentCount: 0, shares: 0,
      });
      await addSignal(user.uid, SIGNAL_POINTS.STORY_CREATED);
      setShowCompose(false);
      setPendingPhoto(null);
      loadStories();
    } catch (err) {
      console.error(err);
      alert("Could not post story. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function isViewed(id) {
    try {
      return !!JSON.parse(localStorage.getItem("ck_viewed_stories") || "{}")[id];
    } catch { return false; }
  }

  function groupAllSeen(group) {
    return group.stories.every(st => isViewed(st.id));
  }

  return (
    <>
      <div style={s.wrap}>
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.dot} />
            <span style={s.headerTitle}>Stories</span>
          </div>
          {grouped.length > 0 && (
            <span style={s.headerCount}>
              {grouped.reduce((a, g) => a + g.count, 0)} active
            </span>
          )}
        </div>

        <div style={s.row}>

          {/* 1. Permanent + Add */}
          <div style={s.item} onClick={handleAddClick}>
            <AddButton size={56} />
            <span style={{ ...s.name, color: "#0D9488", fontWeight: 600 }}>Add</span>
          </div>

          {/* 2. My Story — only when stories exist, unique gradId */}
          {myStories.length > 0 && (
            <div style={s.item} onClick={handleMyStoryClick}>
              <StoryRing
                count={myStories.length}
                seen={myStories.every(st => isViewed(st.id))}
                size={56}
                gradId="sg_mine"
              >
                {profile?.photoURL
                  ? <img src={profile.photoURL} style={s.avatar} alt="" />
                  : <span style={s.initials}>
                      {(profile?.displayName || "?").trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                }
              </StoryRing>
              <span style={{ ...s.name, fontWeight: 700, color: "#0A1628" }}>My Story</span>
            </div>
          )}

          {/* 3. Others — each gets unique gradId */}
          {grouped.map((group, idx) => (
            <div key={group.uid} style={s.item} onClick={() => { const sorted = [...group.stories].sort((a,b)=>(a.ts?.toMillis?.()||0)-(b.ts?.toMillis?.()||0)); setViewingStories(sorted); setViewingStartId(null); }}>
              <StoryRing
                count={group.count}
                seen={groupAllSeen(group)}
                size={56}
                gradId={`sg_${idx}`}
              >
                {group.photo
                  ? <img src={group.photo} style={s.avatar} alt="" />
                  : <span style={s.initials}>{group.initials}</span>
                }
              </StoryRing>
              <span style={s.name}>{group.name?.split(" ")[0] || "User"}</span>
            </div>
          ))}

        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {showCompose && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowCompose(false); }}>
          <div style={s.sheet}>
            <div style={s.handle} />
            <h3 style={s.sheetTitle}>📸 Add Story</h3>
            {pendingPhoto && <img src={pendingPhoto} style={s.preview} alt="preview" />}
            <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="What's on your mind?" rows={3} style={s.input} />
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="#Career #Learning #Community" style={{ ...s.input, marginTop: "8px" }} />
            <CommunityGuidelinesBar compact />
            <button onClick={submitStory} disabled={submitting} style={{ ...s.postBtn, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Posting…" : "🚀 Post Story"}
            </button>
            <button style={s.cancelBtn} onClick={() => setShowCompose(false)}>Cancel</button>
          </div>
        </div>
      )}

      {viewingStories.length > 0 && (
        <StoryViewer
          stories={viewingStories}
          startId={viewingStartId}
          isTrial={isTrial}
          onClose={() => { setViewingStories([]); setViewingStartId(null); loadStories(); }}
        />
      )}

      {showUpgrade && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowUpgrade(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "28px 24px", maxWidth: 320, width: "100%", textAlign: "center", fontFamily: "'DM Sans', sans-serif" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A", marginBottom: 8 }}>Upgrade to Post Stories</div>
            <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 20 }}>Share your professional moments with the community. Available on paid plans.</div>
            <button style={{ width: "100%", background: "#0D9488", color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }} onClick={() => { setShowUpgrade(false); window.location.href = "/subscribe"; }}>Upgrade Now</button>
            <button style={{ background: "none", border: "none", color: "#9CA3AF", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }} onClick={() => setShowUpgrade(false)}>Maybe Later</button>
          </div>
        </div>
      )}
    </>
  );
}

const s = {
  wrap: { background: "#fff", borderBottom: "1px solid #E4E2DC" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 0" },
  headerLeft: { display: "flex", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "#0D9488" },
  headerTitle: { fontSize: 11, fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "DM Sans, sans-serif" },
  headerCount: { fontSize: 11, color: "#9CA3AF", fontWeight: 500, fontFamily: "DM Sans, sans-serif" },
  row: { display: "flex", gap: "14px", padding: "12px 16px 14px", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" },
  item: { display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", flexShrink: 0, cursor: "pointer" },
  avatar: { width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" },
  initials: { fontSize: 13, fontWeight: 700, color: "#0A1628", fontFamily: "DM Sans, sans-serif" },
  name: { fontSize: "10px", color: "#6B7280", maxWidth: "56px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center", fontFamily: "'DM Sans', sans-serif" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 500, display: "flex", alignItems: "flex-end", backdropFilter: "blur(4px)" },
  sheet: { background: "#fff", borderRadius: "22px 22px 0 0", padding: "18px 18px 36px", width: "100%", maxHeight: "85vh", overflowY: "auto", fontFamily: "'DM Sans', sans-serif" },
  handle: { width: "36px", height: "3px", background: "#E4E2DC", borderRadius: "2px", margin: "0 auto 18px" },
  sheetTitle: { fontSize: "17px", fontWeight: "700", color: "#1A1A1A", marginBottom: "14px" },
  preview: { width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "14px", marginBottom: "12px" },
  input: { width: "100%", background: "#F8F8F8", border: "1.5px solid #E4E2DC", borderRadius: "12px", padding: "10px 14px", fontSize: "14px", color: "#1A1A1A", outline: "none", fontFamily: "'DM Sans', sans-serif", resize: "none", display: "block", boxSizing: "border-box" },
  postBtn: { width: "100%", padding: "14px", background: "#0D9488", color: "#fff", border: "none", borderRadius: "24px", fontSize: "15px", fontWeight: "700", cursor: "pointer", marginTop: "14px", fontFamily: "'DM Sans', sans-serif" },
  cancelBtn: { width: "100%", padding: "12px", background: "transparent", border: "none", color: "#888", fontSize: "14px", cursor: "pointer", marginTop: "6px", fontFamily: "'DM Sans', sans-serif" },
};
