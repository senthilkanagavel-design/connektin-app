// src/components/games/SpinGame.jsx
import { useState, useRef, useEffect } from "react";

const SEGMENTS = [10, 25, 5, 50, 15, 30, 20, 40];
const COLORS = ["#0D9488","#F59E0B","#8B5CF6","#EF4444","#0EA5E9","#10B981","#F97316","#6366F1"];

export default function SpinGame({ onResult, disabled = false }) {
  const canvasRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | playing | done
  const angleRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (phase === "playing") drawWheel(angleRef.current);
  }, [phase]);

  function drawWheel(angle) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 8;
    const arc = (2 * Math.PI) / SEGMENTS.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    SEGMENTS.forEach((seg, i) => {
      const start = angle + i * arc;
      const end = start + arc;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i];
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px DM Sans, sans-serif";
      ctx.fillText(`${seg}`, r - 12, 5);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.fillStyle = "#0A1628";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + r + 4, cy);
    ctx.lineTo(cx + r + 20, cy - 8);
    ctx.lineTo(cx + r + 20, cy + 8);
    ctx.closePath();
    ctx.fillStyle = "#0A1628";
    ctx.fill();
  }

  function startGame() {
    setPhase("playing");
    setTimeout(() => drawWheel(angleRef.current), 50);
  }

  function spin() {
    if (spinning || disabled || result) return;
    setSpinning(true);

    const totalRotation = (Math.random() * 4 + 6) * 2 * Math.PI;
    const duration = 3500;
    const start = performance.now();
    const startAngle = angleRef.current;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function animate(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const currentAngle = startAngle + totalRotation * easeOut(progress);
      angleRef.current = currentAngle;
      drawWheel(currentAngle);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        const arc = (2 * Math.PI) / SEGMENTS.length;
        const normalised = ((currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const pointerAngle = (2 * Math.PI - normalised) % (2 * Math.PI);
        const idx = Math.floor(pointerAngle / arc) % SEGMENTS.length;
        const pts = SEGMENTS[idx];
        setResult(pts);
        setSpinning(false);
        onResult && onResult(pts);
      }
    }
    rafRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => () => rafRef.current && cancelAnimationFrame(rafRef.current), []);

  return (
    <div style={S.wrap}>
      {phase === "idle" && (
        <div style={S.intro}>
          <div style={S.introIcon}>🎰</div>
          <div style={S.introTitle}>Spin & Win</div>
          <div style={S.introDesc}>Give the wheel a spin and land on a signal points value. Pure luck — could be 5, could be 50!</div>
          <div style={S.pointsBox}>
            <div style={S.pointsRow}><span style={S.pointsDot}>●</span><span>Possible points: <strong>5 · 10 · 15 · 20 · 25 · 30 · 40 · 50</strong></span></div>
            <div style={S.pointsRow}><span style={S.pointsDot}>●</span><span>One spin per week · Points awarded instantly</span></div>
          </div>
          <button style={S.startBtn} onClick={startGame} disabled={disabled}>Let's Spin!</button>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div style={S.canvasWrap}>
            <canvas ref={canvasRef} width={240} height={240} style={S.canvas} />
          </div>
          {result ? (
            <div style={S.result}>
              <div style={S.resultPts}>{result}</div>
              <div style={S.resultLabel}>signal points earned!</div>
            </div>
          ) : (
            <button
              onClick={spin}
              disabled={spinning || disabled}
              style={{ ...S.spinBtn, opacity: spinning ? 0.7 : 1 }}
            >
              {spinning ? "Spinning…" : "Spin!"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

const S = {
  wrap:        { display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "20px 0", fontFamily: "'DM Sans', sans-serif" },
  intro:       { textAlign: "center", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  introIcon:   { fontSize: 48 },
  introTitle:  { fontSize: 20, fontWeight: 700, color: "#0A1628" },
  introDesc:   { fontSize: 13, color: "#6B7280", lineHeight: 1.6, maxWidth: 280 },
  pointsBox:   { background: "#F3F2EF", borderRadius: 10, padding: "10px 14px", width: "100%", maxWidth: 280, display: "flex", flexDirection: "column", gap: 6, textAlign: "left" },
  pointsRow:   { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#4B5563", lineHeight: 1.5 },
  pointsDot:   { color: "#0D9488", fontSize: 8, marginTop: 4, flexShrink: 0 },
  startBtn:    { background: "#0D9488", color: "#fff", border: "none", borderRadius: 24, padding: "12px 40px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8, fontFamily: "'DM Sans', sans-serif" },
  canvasWrap:  { position: "relative" },
  canvas:      { display: "block", cursor: "pointer" },
  spinBtn:     { background: "#0D9488", color: "#fff", border: "none", borderRadius: 24, padding: "12px 40px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  result:      { textAlign: "center" },
  resultPts:   { fontSize: 52, fontWeight: 900, color: "#0D9488", lineHeight: 1, fontFamily: "'DM Sans', sans-serif" },
  resultLabel: { fontSize: 14, color: "#6B7280", marginTop: 4, fontFamily: "'DM Sans', sans-serif" },
};
