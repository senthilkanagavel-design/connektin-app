// src/components/WeeklyGameCard.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { addSignal } from "../utils/signal";
import SpinGame from "./games/SpinGame";
import TapTargetGame from "./games/TapTargetGame";
import MemoryMatchGame from "./games/MemoryMatchGame";
import NumberGuessGame from "./games/NumberGuessGame";

function getWeekId() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const jan1Day = jan1.getDay();
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + (jan1Day === 0 ? 1 : jan1Day === 1 ? 0 : 8 - jan1Day));
  firstMonday.setHours(0, 0, 0, 0);
  const weekNum = Math.floor((d - firstMonday) / (7 * 86400000)) + 1;
  return d.getFullYear() + "-W" + String(weekNum).padStart(2, "0");
}

const GAME_META = {
  spin:         { label: "Spin & Win",    emoji: "🎯", color: "#0D9488" },
  tap_target:   { label: "Tap the Target", emoji: "🎯", color: "#F59E0B" },
  memory_match: { label: "Memory Match",  emoji: "🃏", color: "#8B5CF6" },
  number_guess: { label: "Number Guess",  emoji: "🔢", color: "#0EA5E9" },
};

export default function WeeklyGameCard({ profile }) {
  const { user } = useAuth();
  const [games, setGames]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeGame, setActiveGame]   = useState(null);
  const [playedGames, setPlayedGames] = useState({});
  const weekId = getWeekId();

  // Games access: thermite, regular, recruiter, isTherMite flag. Admin excluded (manages via admin panel).
  const isPaid = profile?.plan === "thermite"  ||
                 profile?.plan === "regular"   ||
                 profile?.plan === "recruiter" ||
                 profile?.isTherMite === true  ||
                 profile?.role === "admin";

  useEffect(() => {
    if (!user || !isPaid) { setLoading(false); return; }
    loadGames();
  }, [user]);

  async function loadGames() {
    try {
      const q = query(
        collection(db, "weeklyGames"),
        where("weekId", "==", weekId),
        where("published", "==", true)
      );
      const snap = await getDocs(q);
      const gameList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGames(gameList);

      // FIX 2: resultId is just uid (matches Firestore rules: results/{uid})
      const played = {};
      for (const g of gameList) {
        const resultRef = doc(db, "weeklyGames", g.id, "results", user.uid);
        const resultSnap = await getDoc(resultRef);
        if (resultSnap.exists()) {
          played[g.id] = resultSnap.data().signalEarned || 0;
        }
      }
      setPlayedGames(played);
    } catch (e) {
      console.error("loadGames:", e);
    }
    setLoading(false);
  }

  async function handleResult(game, pts) {
    if (!user) return;
    try {
      // FIX 2: resultId is just uid (matches Firestore rules: results/{uid})
      const resultId = user.uid;
      await setDoc(doc(db, "weeklyGames", game.id, "results", resultId), {
        uid: user.uid,
        gameType: game.gameType,
        signalEarned: pts,
        playedAt: serverTimestamp(),
      });
      await addSignal(user.uid, pts);
      setPlayedGames(prev => ({ ...prev, [game.id]: pts }));
      // Auto-close after 3 seconds so user sees result, then returns to feed
      setTimeout(() => closeGame(), 3000);
    } catch (e) {
      console.error("handleResult:", e);
    }
  }

  function closeGame() {
    setActiveGame(null);
    loadGames();
  }

  if (!isPaid) {
    return (
      <div style={S.lockedCard}>
        <div style={S.lockedRow}>
          <span style={S.lockedIcon}>🔒</span>
          <div>
            <div style={S.lockedTitle}>Weekly Fun Drop</div>
            <div style={S.lockedSub}>Upgrade to play weekly games and earn signal points</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return null;
  if (games.length === 0) return null;

  // Full screen game viewer
  if (activeGame) {
    const { game } = activeGame;
    const alreadyPlayed = !!playedGames[game.id];
    const meta = GAME_META[game.gameType] || GAME_META.spin;

    return (
      <div style={S.gameScreen}>
        <div style={S.gameHeader}>
          <button style={S.closeBtn} onClick={closeGame}>✕</button>
          <span style={S.gameTitle}>{meta.label}</span>
          <div style={{ width: 32 }} />
        </div>
        <div style={S.gameBody}>
          {alreadyPlayed ? (
            <div style={S.alreadyPlayed}>
              <div style={{ fontSize: 40 }}>✅</div>
              <div style={S.apTitle}>Already played!</div>
              <div style={S.apSub}>You earned {playedGames[game.id]} signal points this week for this game.</div>
              <button style={S.closeFullBtn} onClick={closeGame}>Back to feed</button>
            </div>
          ) : (
            <>
              {game.gameType === "spin" && (
                <SpinGame
                  onResult={pts => handleResult(game, pts)}
                />
              )}
              {game.gameType === "tap_target" && (
                <TapTargetGame
                  duration={game.duration || 15}
                  onResult={(pts) => handleResult(game, pts)}
                />
              )}
              {game.gameType === "memory_match" && (
                <MemoryMatchGame
                  duration={game.duration || 60}
                  onResult={(pts) => handleResult(game, pts)}
                />
              )}
              {game.gameType === "number_guess" && (
                <NumberGuessGame
                  maxGuesses={game.maxGuesses || 5}
                  duration={game.duration || 30}
                  onResult={pts => handleResult(game, pts)}
                />
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  const now = new Date();
  const weekNum = weekId.split("-W")[1];

  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div style={S.headerLeft}>
          <div style={S.dot} />
          <span style={S.headerTitle}>Weekly Fun Drop</span>
        </div>
        <span style={S.weekLabel}>Week {weekNum} · {now.getFullYear()}</span>
      </div>

      <div style={S.gamesList}>
        {games.map(game => {
          const meta = GAME_META[game.gameType] || GAME_META.spin;
          const played = playedGames[game.id];
          return (
            <div key={game.id} style={S.gameRow}>
              <div style={{ ...S.gameIcon, background: meta.color + "22" }}>
                <span style={{ fontSize: 20 }}>{meta.emoji}</span>
              </div>
              <div style={S.gameInfo}>
                <div style={S.gameName}>{meta.label}</div>
                {played !== undefined ? (
                  <div style={S.playedBadge}>✅ Played this week · +{played} pts earned</div>
                ) : (
                  <div style={S.gameDesc}>Tap to play · Earn signal points</div>
                )}
              </div>
              <button
                style={{ ...S.playBtn, background: played !== undefined ? "#F3F2EF" : meta.color, color: played !== undefined ? "#9CA3AF" : "#fff" }}
                onClick={() => setActiveGame({ game })}
              >
                {played !== undefined ? `+${played} pts` : "Play →"}
              </button>
            </div>
          );
        })}
      </div>

      {Object.keys(playedGames).length > 0 && (
        <div style={S.footer}>
          <span style={S.footerIcon}>⏱</span>
          <span style={S.footerText}>Next drop resets Monday at 12:01 AM</span>
        </div>
      )}
    </div>
  );
}

const S = {
  card:         { background: "#fff", border: "1px solid #E4E2DC", borderRadius: 14, overflow: "hidden", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" },
  cardHeader:   { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 8px" },
  headerLeft:   { display: "flex", alignItems: "center", gap: 5 },
  dot:          { width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" },
  headerTitle:  { fontSize: 11, fontWeight: 700, color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.08em" },
  weekLabel:    { fontSize: 11, color: "#9CA3AF" },
  gamesList:    { display: "flex", flexDirection: "column", gap: 0 },
  gameRow:      { display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: "1px solid #F3F2EF" },
  gameIcon:     { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  gameInfo:     { flex: 1 },
  gameName:     { fontSize: 13, fontWeight: 600, color: "#0A1628" },
  gameDesc:     { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  playedBadge:  { fontSize: 11, color: "#0D9488", fontWeight: 600, marginTop: 2 },
  playBtn:      { padding: "6px 14px", borderRadius: 20, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "'DM Sans', sans-serif" },
  footer:       { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderTop: "1px solid #F3F2EF", background: "#FAFAF8" },
  footerIcon:   { fontSize: 12 },
  footerText:   { fontSize: 11, color: "#9CA3AF" },
  lockedCard:   { background: "#fff", border: "1px solid #E4E2DC", borderRadius: 14, padding: "12px 16px", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" },
  lockedRow:    { display: "flex", alignItems: "center", gap: 12 },
  lockedIcon:   { fontSize: 18 },
  lockedTitle:  { fontSize: 13, fontWeight: 600, color: "#0A1628" },
  lockedSub:    { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  gameScreen:   { position: "fixed", inset: 0, background: "#F3F2EF", zIndex: 500, display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif" },
  gameHeader:   { background: "#0A1628", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  closeBtn:     { background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" },
  gameTitle:    { fontSize: 15, fontWeight: 700, color: "#fff" },
  gameBody:     { flex: 1, overflowY: "auto", padding: "20px 16px" },
  alreadyPlayed:{ textAlign: "center", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  apTitle:      { fontSize: 18, fontWeight: 700, color: "#0A1628" },
  apSub:        { fontSize: 13, color: "#6B7280", lineHeight: 1.6, maxWidth: 280 },
  closeFullBtn: { background: "#0D9488", color: "#fff", border: "none", borderRadius: 24, padding: "12px 32px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8, fontFamily: "'DM Sans', sans-serif" },
};
