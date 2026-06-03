// src/components/games/MemoryMatchGame.jsx
import { useState, useEffect, useRef } from "react";

const EMOJIS = ["🏥","💊","📋","🩺","💉","🔬","🏨","🩻"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MemoryMatchGame({ duration = 60, onResult, disabled = false }) {
  const [phase, setPhase]       = useState("idle");
  const [cards, setCards]       = useState([]);
  const [flipped, setFlipped]   = useState([]);
  const [matched, setMatched]   = useState([]);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [moves, setMoves]       = useState(0);
  const timerRef = useRef(null);
  const lockRef  = useRef(false);

  function startGame() {
    const deck = shuffle([...EMOJIS, ...EMOJIS]).map((emoji, i) => ({ id: i, emoji, matched: false }));
    setCards(deck);
    setFlipped([]); setMatched([]); setMoves(0);
    setTimeLeft(duration);
    setPhase("playing");
    lockRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setPhase("done"); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  useEffect(() => () => clearInterval(timerRef.current), []);

  useEffect(() => {
    if (phase === "playing" && matched.length === EMOJIS.length * 2) {
      clearInterval(timerRef.current);
      setPhase("done");
    }
  }, [matched, phase]);

  function flipCard(id) {
    if (lockRef.current || phase !== "playing") return;
    if (flipped.includes(id) || matched.includes(id)) return;
    if (flipped.length === 2) return;

    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      lockRef.current = true;
      const [a, b] = newFlipped;
      const cardA = cards.find(c => c.id === a);
      const cardB = cards.find(c => c.id === b);

      if (cardA.emoji === cardB.emoji) {
        setMatched(prev => [...prev, a, b]);
        setFlipped([]);
        lockRef.current = false;
      } else {
        setTimeout(() => { setFlipped([]); lockRef.current = false; }, 900);
      }
    }
  }

  const pairCount = matched.length / 2;
  const totalPairs = EMOJIS.length;
  const pts = phase === "done"
    ? pairCount === totalPairs
      ? 50
      : Math.round((pairCount / totalPairs) * 40)
    : 0;

  const pct = (timeLeft / duration) * 100;

  return (
    <div style={S.wrap}>
      {phase === "idle" && (
        <div style={S.intro}>
          <div style={S.introIcon}>🃏</div>
          <div style={S.introTitle}>Memory Match</div>
          <div style={S.introDesc}>Flip two cards at a time and find all matching pairs. Remember where you saw them!</div>
          <div style={S.pointsBox}>
            <div style={S.pointsRow}><span style={S.pointsDot}>●</span><span>Match all 8 pairs = <strong>50 signal points</strong></span></div>
            <div style={S.pointsRow}><span style={S.pointsDot}>●</span><span>Partial matches earn proportional points</span></div>
            <div style={S.pointsRow}><span style={S.pointsDot}>●</span><span>You have <strong>{duration} seconds</strong> · Use them wisely!</span></div>
          </div>
          <button style={S.startBtn} onClick={startGame} disabled={disabled}>Start!</button>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div style={S.hud}>
            <div style={S.hudItem}><div style={S.hudVal}>{pairCount}/{totalPairs}</div><div style={S.hudLbl}>Pairs</div></div>
            <div style={S.timerWrap}>
              <div style={S.timerBg}>
                <div style={{ ...S.timerFill, width: `${pct}%`, background: pct > 50 ? "#0D9488" : pct > 25 ? "#F59E0B" : "#EF4444" }} />
              </div>
              <div style={S.timerNum}>{timeLeft}s</div>
            </div>
            <div style={S.hudItem}><div style={S.hudVal}>{moves}</div><div style={S.hudLbl}>Moves</div></div>
          </div>

          <div style={S.grid}>
            {cards.map(card => {
              const isFlipped  = flipped.includes(card.id);
              const isMatched  = matched.includes(card.id);
              const showFace   = isFlipped || isMatched;
              return (
                <button
                  key={card.id}
                  onClick={() => flipCard(card.id)}
                  style={{
                    ...S.card,
                    background: isMatched ? "#E6FAF8" : isFlipped ? "#fff" : "#0A1628",
                    border: isMatched ? "1.5px solid #0D9488" : isFlipped ? "1.5px solid #E4E2DC" : "1.5px solid #0A1628",
                    cursor: isMatched ? "default" : "pointer",
                    transform: showFace ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  <span style={{ fontSize: 36, opacity: showFace ? 1 : 0, lineHeight: 1 }}>{card.emoji}</span>
                  {!showFace && <span style={{ fontSize: 28, color: "#0D9488", fontWeight: 700 }}>?</span>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {phase === "done" && (
        <div style={S.result}>
          <div style={S.resultIcon}>{pairCount === totalPairs ? "🎉" : "⏰"}</div>
          <div style={S.resultTitle}>{pairCount === totalPairs ? "Perfect!" : "Time's up!"}</div>
          <div style={S.resultScore}>{pairCount}/{totalPairs}</div>
          <div style={S.resultScoreLbl}>pairs matched</div>
          <div style={S.resultPts}>{pts} signal points earned</div>
          {onResult && onResult(pts, pairCount)}
        </div>
      )}
    </div>
  );
}

const S = {
  wrap:          { fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center" },
  intro:         { textAlign: "center", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  introIcon:     { fontSize: 48 },
  introTitle:    { fontSize: 20, fontWeight: 700, color: "#0A1628" },
  introDesc:     { fontSize: 13, color: "#6B7280", lineHeight: 1.6, maxWidth: 280 },
  pointsBox:     { background: "#F3F2EF", borderRadius: 10, padding: "10px 14px", width: "100%", maxWidth: 280, display: "flex", flexDirection: "column", gap: 6, textAlign: "left" },
  pointsRow:     { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#4B5563", lineHeight: 1.5 },
  pointsDot:     { color: "#0D9488", fontSize: 8, marginTop: 4, flexShrink: 0 },
  startBtn:      { background: "#0D9488", color: "#fff", border: "none", borderRadius: 24, padding: "12px 40px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8, fontFamily: "'DM Sans', sans-serif" },
  hud:           { display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "10px 16px", background: "#F3F2EF", borderRadius: 10, marginBottom: 12 },
  hudItem:       { textAlign: "center", minWidth: 40 },
  hudVal:        { fontSize: 18, fontWeight: 800, color: "#0A1628" },
  hudLbl:        { fontSize: 10, color: "#9CA3AF", marginTop: 1 },
  timerWrap:     { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  timerBg:       { width: "100%", height: 6, background: "#E4E2DC", borderRadius: 3, overflow: "hidden" },
  timerFill:     { height: "100%", borderRadius: 3, transition: "width 0.9s linear, background 0.3s" },
  timerNum:      { fontSize: 13, fontWeight: 700, color: "#0A1628" },
  grid:          { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, width: "100%" },
  card:          { aspectRatio: "1", minHeight: 64, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s", fontFamily: "'DM Sans', sans-serif" },
  result:        { textAlign: "center", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  resultIcon:    { fontSize: 48 },
  resultTitle:   { fontSize: 18, fontWeight: 700, color: "#0A1628" },
  resultScore:   { fontSize: 52, fontWeight: 900, color: "#0D9488", lineHeight: 1 },
  resultScoreLbl:{ fontSize: 13, color: "#6B7280" },
  resultPts:     { fontSize: 15, fontWeight: 700, color: "#0A1628", background: "#E6FAF8", border: "1px solid #0D9488", borderRadius: 20, padding: "6px 20px", marginTop: 8 },
};
