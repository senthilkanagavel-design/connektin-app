// src/components/games/NumberGuessGame.jsx
import { useState, useEffect, useRef } from "react";

export default function NumberGuessGame({ maxGuesses = 5, duration = 30, onResult, disabled = false }) {
  const [phase, setPhase]       = useState("idle");
  const [secret, setSecret]     = useState(null);
  const [guesses, setGuesses]   = useState([]);
  const [input, setInput]       = useState("");
  const [hint, setHint]         = useState("");
  const [timeLeft, setTimeLeft] = useState(duration);
  const timerRef = useRef(null);

  function startGame() {
    const num = Math.floor(Math.random() * 10) + 1;
    setSecret(num);
    setGuesses([]); setInput(""); setHint("");
    setTimeLeft(duration);
    setPhase("playing");

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setPhase("timeout"); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  useEffect(() => () => clearInterval(timerRef.current), []);

  function makeGuess() {
    const num = parseInt(input);
    if (!num || num < 1 || num > 10) return;
    const newGuesses = [...guesses, num];
    setGuesses(newGuesses);
    setInput("");

    if (num === secret) {
      clearInterval(timerRef.current);
      setPhase("won");
    } else {
      setHint(num < secret ? "Too low! Go higher" : "Too high! Go lower");
      if (newGuesses.length >= maxGuesses) {
        clearInterval(timerRef.current);
        setPhase("lost");
      }
    }
  }

  const pct = (timeLeft / duration) * 100;

  function calcPts() {
    if (phase === "won") return Math.max(50 - (guesses.length - 1) * 10, 10);
    return 5;
  }

  useEffect(() => {
    if ((phase === "won" || phase === "lost" || phase === "timeout") && onResult) {
      onResult(calcPts());
    }
  }, [phase]);

  return (
    <div style={S.wrap}>
      {phase === "idle" && (
        <div style={S.intro}>
          <div style={S.introIcon}>🔢</div>
          <div style={S.introTitle}>Number Guess</div>
          <div style={S.introDesc}>I'm thinking of a number between 1 and 10. Guess it — I'll tell you if you're too high or too low!</div>
          <div style={S.pointsBox}>
            <div style={S.pointsRow}><span style={S.pointsDot}>●</span><span>Guess in <strong>1 try = 50 pts</strong> · 2 tries = 40 pts · and so on</span></div>
            <div style={S.pointsRow}><span style={S.pointsDot}>●</span><span>Wrong all {maxGuesses} guesses = <strong>5 pts</strong> (consolation!)</span></div>
            <div style={S.pointsRow}><span style={S.pointsDot}>●</span><span>You have <strong>{maxGuesses} guesses</strong> and <strong>{duration} seconds</strong></span></div>
          </div>
          <button style={S.startBtn} onClick={startGame} disabled={disabled}>Start!</button>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div style={S.hud}>
            <div style={S.hudItem}><div style={S.hudVal}>{maxGuesses - guesses.length}</div><div style={S.hudLbl}>Left</div></div>
            <div style={S.timerWrap}>
              <div style={S.timerBg}>
                <div style={{ ...S.timerFill, width: `${pct}%`, background: pct > 50 ? "#0D9488" : pct > 25 ? "#F59E0B" : "#EF4444" }} />
              </div>
              <div style={S.timerNum}>{timeLeft}s</div>
            </div>
            <div style={S.hudItem}><div style={S.hudVal}>{guesses.length}</div><div style={S.hudLbl}>Tries</div></div>
          </div>

          <div style={S.gameArea}>
            <div style={S.question}>Pick a number between 1 and 10</div>
            {hint && <div style={S.hint}>{hint}</div>}
            <div style={S.numGrid}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
                const guessed = guesses.includes(n);
                return (
                  <button
                    key={n}
                    onClick={() => { setInput(String(n)); }}
                    style={{
                      ...S.numBtn,
                      background: input === String(n) ? "#0A1628" : guessed ? "#F3F2EF" : "#fff",
                      color: input === String(n) ? "#fff" : guessed ? "#9CA3AF" : "#0A1628",
                      border: input === String(n) ? "2px solid #0A1628" : "1.5px solid #E4E2DC",
                      cursor: guessed ? "not-allowed" : "pointer",
                      opacity: guessed ? 0.5 : 1,
                    }}
                    disabled={guessed}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <button
              style={{ ...S.guessBtn, opacity: input ? 1 : 0.4 }}
              onClick={makeGuess}
              disabled={!input}
            >
              Guess {input || "?"}
            </button>
          </div>
        </>
      )}

      {(phase === "won" || phase === "lost" || phase === "timeout") && (
        <div style={S.result}>
          <div style={S.resultIcon}>{phase === "won" ? "🎉" : "😅"}</div>
          <div style={S.resultTitle}>
            {phase === "won" ? `Correct! It was ${secret}` : `It was ${secret}!`}
          </div>
          {phase === "won" && <div style={S.guessCount}>Found in {guesses.length} guess{guesses.length !== 1 ? "es" : ""}</div>}
          {phase === "timeout" && <div style={S.guessCount}>Time ran out!</div>}
          <div style={S.resultPts}>{calcPts()} signal points earned</div>
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
  gameArea:      { width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 },
  question:      { fontSize: 15, fontWeight: 600, color: "#0A1628", textAlign: "center" },
  hint:          { fontSize: 13, fontWeight: 600, color: "#F59E0B", background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, padding: "6px 16px" },
  numGrid:       { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, width: "100%" },
  numBtn:        { aspectRatio: "1", borderRadius: 10, fontSize: 18, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  guessBtn:      { background: "#0D9488", color: "#fff", border: "none", borderRadius: 24, padding: "12px 40px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", fontFamily: "'DM Sans', sans-serif" },
  result:        { textAlign: "center", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  resultIcon:    { fontSize: 48 },
  resultTitle:   { fontSize: 18, fontWeight: 700, color: "#0A1628" },
  guessCount:    { fontSize: 13, color: "#6B7280" },
  resultPts:     { fontSize: 15, fontWeight: 700, color: "#0A1628", background: "#E6FAF8", border: "1px solid #0D9488", borderRadius: 20, padding: "6px 20px", marginTop: 8 },
};
