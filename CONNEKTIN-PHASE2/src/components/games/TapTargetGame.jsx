// src/components/games/TapTargetGame.jsx
import { useState, useEffect, useRef } from "react";

export default function TapTargetGame({ duration = 15, onResult, disabled = false }) {
  const [phase, setPhase]       = useState("idle");
  const [timeLeft, setTimeLeft] = useState(duration);
  const [score, setScore]       = useState(0);
  const [targets, setTargets]   = useState([]);
  const [misses, setMisses]     = useState(0);
  const timerRef  = useRef(null);
  const spawnRef  = useRef(null);
  const scoreRef  = useRef(0);
  const areaRef   = useRef(null);

  function spawnTarget() {
    const id = Date.now() + Math.random();
    const size = Math.random() * 24 + 36;
    const areaW = areaRef.current?.clientWidth  || 300;
    const areaH = areaRef.current?.clientHeight || 300;
    const x = Math.random() * (areaW - size);
    const y = Math.random() * (areaH - size);
    const lifetime = Math.random() * 800 + 900;

    setTargets(prev => [...prev, { id, x, y, size }]);
    setTimeout(() => {
      setTargets(prev => {
        const still = prev.find(t => t.id === id);
        if (still) setMisses(m => m + 1);
        return prev.filter(t => t.id !== id);
      });
    }, lifetime);
  }

  function startGame() {
    if (disabled) return;
    scoreRef.current = 0;
    setScore(0); setMisses(0); setTargets([]);
    setTimeLeft(duration);
    setPhase("playing");

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          clearInterval(spawnRef.current);
          setPhase("done");
          setTargets([]);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    spawnRef.current = setInterval(spawnTarget, 700);
  }

  useEffect(() => {
    if (phase === "done") {
      const pts = Math.min(scoreRef.current * 3, 50);
      onResult && onResult(pts, scoreRef.current);
    }
  }, [phase]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(spawnRef.current);
  }, []);

  function tapTarget(e, id) {
    e.stopPropagation();
    setTargets(prev => prev.filter(t => t.id !== id));
    scoreRef.current += 1;
    setScore(s => s + 1);
  }

  const pct = (timeLeft / duration) * 100;
  const pts = Math.min(scoreRef.current * 3, 50);

  return (
    <div style={S.wrap}>
      {phase === "idle" && (
        <div style={S.intro}>
          <div style={S.introIcon}>🎯</div>
          <div style={S.introTitle}>Tap the Target</div>
          <div style={S.introDesc}>Targets appear and disappear fast — tap as many as you can before the timer runs out!</div>
          <div style={S.pointsBox}>
            <div style={S.pointsRow}><span style={S.pointsDot}>●</span><span>Every tap = <strong>3 signal points</strong></span></div>
            <div style={S.pointsRow}><span style={S.pointsDot}>●</span><span>Maximum <strong>50 points</strong> per game</span></div>
            <div style={S.pointsRow}><span style={S.pointsDot}>●</span><span>You have <strong>{duration} seconds</strong> · Tap fast!</span></div>
          </div>
          <button style={S.startBtn} onClick={startGame} disabled={disabled}>Start!</button>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div style={S.hud}>
            <div style={S.hudItem}><div style={S.hudVal}>{score}</div><div style={S.hudLbl}>Taps</div></div>
            <div style={S.timerWrap}>
              <div style={S.timerBg}>
                <div style={{ ...S.timerFill, width: `${pct}%`, background: pct > 50 ? "#0D9488" : pct > 25 ? "#F59E0B" : "#EF4444" }} />
              </div>
              <div style={S.timerNum}>{timeLeft}s</div>
            </div>
            <div style={S.hudItem}><div style={S.hudVal}>{misses}</div><div style={S.hudLbl}>Missed</div></div>
          </div>
          <div ref={areaRef} style={S.area} onClick={() => setMisses(m => m + 1)}>
            {targets.map(t => (
              <button
                key={t.id}
                onClick={e => tapTarget(e, t.id)}
                style={{ ...S.target, left: t.x, top: t.y, width: t.size, height: t.size, borderRadius: "50%", fontSize: t.size * 0.45 }}
              >🎯</button>
            ))}
          </div>
        </>
      )}

      {phase === "done" && (
        <div style={S.result}>
          <div style={S.resultIcon}>🎉</div>
          <div style={S.resultTitle}>Time's up!</div>
          <div style={S.resultScore}>{score}</div>
          <div style={S.resultScoreLbl}>targets tapped</div>
          <div style={S.resultPts}>{pts} signal points earned</div>
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
  hud:           { display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "10px 16px", background: "#F3F2EF", borderRadius: 10, marginBottom: 10 },
  hudItem:       { textAlign: "center", minWidth: 40 },
  hudVal:        { fontSize: 20, fontWeight: 800, color: "#0A1628" },
  hudLbl:        { fontSize: 10, color: "#9CA3AF", marginTop: 1 },
  timerWrap:     { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  timerBg:       { width: "100%", height: 6, background: "#E4E2DC", borderRadius: 3, overflow: "hidden" },
  timerFill:     { height: "100%", borderRadius: 3, transition: "width 0.9s linear, background 0.3s" },
  timerNum:      { fontSize: 13, fontWeight: 700, color: "#0A1628" },
  area:          { width: "100%", height: 280, background: "#F9F9F7", border: "1.5px dashed #E4E2DC", borderRadius: 14, position: "relative", overflow: "hidden", cursor: "crosshair" },
  target:        { position: "absolute", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.1s", userSelect: "none" },
  result:        { textAlign: "center", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  resultIcon:    { fontSize: 48 },
  resultTitle:   { fontSize: 18, fontWeight: 700, color: "#0A1628" },
  resultScore:   { fontSize: 56, fontWeight: 900, color: "#0D9488", lineHeight: 1 },
  resultScoreLbl:{ fontSize: 13, color: "#6B7280" },
  resultPts:     { fontSize: 15, fontWeight: 700, color: "#0A1628", background: "#E6FAF8", border: "1px solid #0D9488", borderRadius: 20, padding: "6px 20px", marginTop: 8 },
};
