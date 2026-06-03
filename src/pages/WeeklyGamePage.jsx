// src/pages/WeeklyGamePage.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useWeeklyGame } from '../hooks/useWeeklyGame';

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function WeeklyGamePage() {
  const navigate = useNavigate();
  const { user, profile }           = useAuth();
  const { game, result, loading, weekId } = useWeeklyGame();
  const [saving, setSaving]         = useState(false);
  const [done, setDone]             = useState(false);
  const [earnedPts, setEarnedPts]   = useState(0);

  if (loading) return <FullScreen><p style={txt.muted}>Loading…</p></FullScreen>;
  if (!game)   return <FullScreen><p style={txt.muted}>No game this week.</p></FullScreen>;

  const isLocked = profile?.plan === 'trial' || profile?.userType === 'recruiter';
  if (isLocked) return (
    <FullScreen>
      <div style={styles.doneBox}>
        <div style={styles.doneEmoji}>🔒</div>
        <h2 style={txt.h2}>Upgrade to Play</h2>
        <p style={txt.body}>Weekly Fun Drop is available for Thermite and Regular members.</p>
        <button style={styles.backBtn} onClick={() => navigate('/dashboard', { state: { tab: 'home' } })}>← Back to Feed</button>
      </div>
    </FullScreen>
  );

  const alreadyPlayed = !!result || done;

  async function saveResult(points) {
    if (!user?.uid || alreadyPlayed) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'weeklyGames', weekId, 'results', user.uid),
        { points, playedAt: serverTimestamp(), uid: user.uid, weekId }
      );
      // Add signal points to user profile
      if (points > 0) {
        await updateDoc(doc(db, 'users', user.uid), {
          weeklySignal:   increment(points),
          monthlySignal:  increment(points),
          allTimeSignal:  increment(points),
        });
      }
      setEarnedPts(points);
      setDone(true);
    } catch (e) {
      console.error('saveResult error:', e);
    } finally {
      setSaving(false);
    }
  }

  if (alreadyPlayed) {
    return (
      <FullScreen>
        <div style={styles.doneBox}>
          <div style={styles.doneEmoji}>🎉</div>
          <h2 style={txt.h2}>Nice work!</h2>
          <p style={txt.body}>You earned <strong style={{ color: '#0D9488' }}>{earnedPts || result?.points || 0} signal points</strong> this week.</p>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>← Back to Feed</button>
        </div>
      </FullScreen>
    );
  }

  return (
    <FullScreen>
      <div style={styles.header}>
        <button style={styles.closeBtn} onClick={() => navigate(-1)}>✕</button>
        <span style={styles.headerTitle}>Weekly Fun Drop</span>
        <div style={{ width: 32 }} />
      </div>

      {game.gameType === 'spin'    && <SpinGame    game={game} onDone={saveResult} saving={saving} />}
      {game.gameType === 'puzzle'  && <PuzzleGame  game={game} onDone={saveResult} saving={saving} />}
      {game.gameType === 'scramble'&& <ScrambleGame game={game} onDone={saveResult} saving={saving} />}
    </FullScreen>
  );
}

/* ─────────────────────────────────────────
   SPIN & WIN
───────────────────────────────────────── */
const WHEEL_SEGMENTS = [5, 10, 0, 15, 5, 20, 0, 10];
const SEG_COLORS     = ['#0D9488','#0A1628','#0D9488','#0A1628','#0D9488','#0A1628','#0D9488','#0A1628'];

function SpinGame({ game, onDone, saving }) {
  const [spinning, setSpinning]   = useState(false);
  const [rotation, setRotation]   = useState(0);
  const [landed, setLanded]       = useState(null);
  const spinRef                   = useRef(rotation);
  spinRef.current                 = rotation;

  function spin() {
    if (spinning || landed !== null) return;
    setSpinning(true);
    const extra    = 360 * (5 + Math.floor(Math.random() * 5));
    const segAngle = 360 / WHEEL_SEGMENTS.length;
    const segIdx   = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const target   = extra + segIdx * segAngle;
    setRotation(r => r + target);

    setTimeout(() => {
      setSpinning(false);
      setLanded(segIdx);
    }, 3200);
  }

  const pts = landed !== null ? WHEEL_SEGMENTS[landed] : null;

  return (
    <div style={styles.gameWrap}>
      <h2 style={txt.h2}>{game.title || 'Spin & Win'}</h2>
      <p style={{ ...txt.body, marginBottom: 24 }}>Spin the wheel — win signal points!</p>

      {/* Wheel */}
      <div style={styles.wheelWrap}>
        <div style={styles.pointer}>▼</div>
        <svg
          viewBox="0 0 200 200"
          width="240" height="240"
          style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 3.2s cubic-bezier(0.17,0.67,0.12,1)' : 'none' }}
        >
          {WHEEL_SEGMENTS.map((pts, i) => {
            const angle   = (360 / WHEEL_SEGMENTS.length);
            const start   = i * angle;
            const end     = start + angle;
            const r       = 100;
            const cx      = 100; const cy = 100;
            const toRad   = d => (d * Math.PI) / 180;
            const x1 = cx + r * Math.cos(toRad(start - 90));
            const y1 = cy + r * Math.sin(toRad(start - 90));
            const x2 = cx + r * Math.cos(toRad(end - 90));
            const y2 = cy + r * Math.sin(toRad(end - 90));
            const mid = start + angle / 2;
            const tx = cx + 65 * Math.cos(toRad(mid - 90));
            const ty = cy + 65 * Math.sin(toRad(mid - 90));
            return (
              <g key={i}>
                <path
                  d={`M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 0,1 ${x2},${y2} Z`}
                  fill={SEG_COLORS[i]}
                  stroke="#fff"
                  strokeWidth="1.5"
                />
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                  fontSize="13" fontWeight="700" fill="#fff"
                  transform={`rotate(${mid}, ${tx}, ${ty})`}
                >
                  {pts === 0 ? '💔' : `+${pts}`}
                </text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="14" fill="#fff" />
        </svg>
      </div>

      {pts !== null ? (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ ...txt.h2, color: pts > 0 ? '#0D9488' : '#EF4444' }}>
            {pts > 0 ? `🎉 +${pts} points!` : '😬 Better luck next time!'}
          </p>
          <button
            style={{ ...styles.playBtn, marginTop: 16 }}
            onClick={() => onDone(pts)}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Claim & Finish'}
          </button>
        </div>
      ) : (
        <button style={styles.playBtn} onClick={spin} disabled={spinning}>
          {spinning ? 'Spinning…' : '🎰 Spin!'}
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   CLAIM PUZZLE  (drag tiles to correct order)
───────────────────────────────────────── */
function PuzzleGame({ game, onDone, saving }) {
  const tiles   = game.puzzle?.tiles   || ['Submit', 'Claim', 'Prepare', 'Verify', 'Code', 'Adjudicate'];
  const answer  = game.puzzle?.answer  || [2, 4, 1, 3, 0, 5]; // indices into tiles
  const pts     = game.puzzle?.points  ?? 15;

  const [order, setOrder]   = useState(() => tiles.map((_, i) => i));
  const [checked, setCheck] = useState(false);
  const [correct, setCorr]  = useState(false);
  const [dragging, setDrag] = useState(null);

  function onDragStart(i) { setDrag(i); }
  function onDrop(target) {
    if (dragging === null || dragging === target) return;
    const next = [...order];
    [next[dragging], next[target]] = [next[target], next[dragging]];
    setOrder(next);
    setDrag(null);
  }

  function check() {
    const isCorrect = order.every((v, i) => v === answer[i]);
    setCorr(isCorrect);
    setCheck(true);
  }

  return (
    <div style={styles.gameWrap}>
      <h2 style={txt.h2}>{game.title || 'Claim Puzzle'}</h2>
      <p style={{ ...txt.body, marginBottom: 8 }}>
        {game.puzzle?.question || 'Arrange the RCM claim journey steps in the correct order.'}
      </p>
      <p style={{ ...txt.muted, marginBottom: 20, fontSize: 11 }}>Drag tiles to reorder</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320, margin: '0 auto' }}>
        {order.map((tileIdx, pos) => (
          <div
            key={tileIdx}
            draggable
            onDragStart={() => onDragStart(pos)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(pos)}
            style={{
              ...styles.tile,
              background: checked
                ? (order[pos] === answer[pos] ? '#D1FAE5' : '#FEE2E2')
                : '#F3F2EF',
              borderColor: checked
                ? (order[pos] === answer[pos] ? '#0D9488' : '#EF4444')
                : '#E4E2DC',
            }}
          >
            <span style={styles.tileNum}>{pos + 1}</span>
            <span style={styles.tileTxt}>{tiles[tileIdx]}</span>
            <span style={{ marginLeft: 'auto', cursor: 'grab', color: '#9CA3AF' }}>⠿</span>
          </div>
        ))}
      </div>

      {checked ? (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ ...txt.h2, color: correct ? '#0D9488' : '#EF4444' }}>
            {correct ? `✅ Correct! +${pts} pts` : '❌ Not quite — good try!'}
          </p>
          <button style={{ ...styles.playBtn, marginTop: 16 }} onClick={() => onDone(correct ? pts : 0)} disabled={saving}>
            {saving ? 'Saving…' : 'Finish'}
          </button>
        </div>
      ) : (
        <button style={{ ...styles.playBtn, marginTop: 24 }} onClick={check}>Check Answer</button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   WORD SCRAMBLE
───────────────────────────────────────── */
function ScrambleGame({ game, onDone, saving }) {
  const word      = (game.scramble?.word    || 'REMITTANCE').toUpperCase();
  const hint      = game.scramble?.hint     || 'A payment sent back to the provider';
  const pts       = game.scramble?.points   ?? 10;
  const scrambled = game.scramble?.scrambled || shuffleWord(word);

  const [input, setInput]   = useState('');
  const [checked, setCheck] = useState(false);
  const [correct, setCorr]  = useState(false);

  function check() {
    const ok = input.trim().toUpperCase() === word;
    setCorr(ok);
    setCheck(true);
  }

  return (
    <div style={styles.gameWrap}>
      <h2 style={txt.h2}>{game.title || 'Word Scramble'}</h2>
      <p style={{ ...txt.body, marginBottom: 20 }}>{hint}</p>

      <div style={styles.scrambleWord}>
        {scrambled.split('').map((ch, i) => (
          <span key={i} style={styles.scrambleLetter}>{ch}</span>
        ))}
      </div>

      <input
        style={styles.scrambleInput}
        placeholder="Type the word…"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !checked && check()}
        disabled={checked}
        autoFocus
        autoCapitalize="characters"
      />

      {checked ? (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ ...txt.h2, color: correct ? '#0D9488' : '#EF4444' }}>
            {correct ? `✅ Correct! +${pts} pts` : `❌ It was "${word}"`}
          </p>
          <button style={{ ...styles.playBtn, marginTop: 16 }} onClick={() => onDone(correct ? pts : 0)} disabled={saving}>
            {saving ? 'Saving…' : 'Finish'}
          </button>
        </div>
      ) : (
        <button style={{ ...styles.playBtn, marginTop: 16 }} onClick={check} disabled={!input.trim()}>
          Submit Answer
        </button>
      )}
    </div>
  );
}

function shuffleWord(word) {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

/* ─────────────────────────────────────────
   LAYOUT HELPERS
───────────────────────────────────────── */
function FullScreen({ children }) {
  return (
    <div style={{
      minHeight: '100dvh', background: '#F3F2EF',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif',
      padding: '0 16px',
    }}>
      {children}
    </div>
  );
}

const txt = {
  h2:   { margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#0A1628', textAlign: 'center' },
  body: { margin: 0, fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 1.5 },
  muted:{ margin: 0, fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
};

const styles = {
  header: {
    position: 'fixed', top: 0, left: 0, right: 0,
    height: 52, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '0 16px',
    background: '#fff', borderBottom: '1px solid #E4E2DC',
    zIndex: 10,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: '50%',
    border: 'none', background: '#F3F2EF',
    fontSize: 16, cursor: 'pointer', color: '#374151',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15, fontWeight: 700, color: '#0A1628',
  },
  gameWrap: {
    marginTop: 60, paddingBottom: 32,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', width: '100%', maxWidth: 400,
    padding: '72px 16px 32px',
  },
  doneBox: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 12, padding: 24,
    background: '#fff', borderRadius: 16,
    border: '1px solid #E4E2DC', maxWidth: 320, width: '100%',
    textAlign: 'center',
  },
  doneEmoji: { fontSize: 48, lineHeight: 1 },
  backBtn: {
    marginTop: 8, padding: '10px 24px', borderRadius: 24,
    background: '#0D9488', color: '#fff', border: 'none',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  wheelWrap: {
    position: 'relative', display: 'flex',
    flexDirection: 'column', alignItems: 'center',
  },
  pointer: {
    fontSize: 24, color: '#0A1628', marginBottom: -8, zIndex: 1,
  },
  playBtn: {
    padding: '12px 32px', borderRadius: 28,
    background: '#0D9488', color: '#fff', border: 'none',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    marginTop: 8, minWidth: 160, textAlign: 'center',
  },
  tile: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid', cursor: 'grab',
    fontSize: 14, fontWeight: 600, color: '#0A1628',
    userSelect: 'none', transition: 'background 0.2s',
  },
  tileNum: {
    width: 22, height: 22, borderRadius: '50%',
    background: '#0D9488', color: '#fff',
    fontSize: 11, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  tileTxt: { flex: 1 },
  scrambleWord: {
    display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center',
  },
  scrambleLetter: {
    width: 36, height: 44, borderRadius: 8,
    background: '#0A1628', color: '#fff',
    fontSize: 20, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    letterSpacing: 0,
  },
  scrambleInput: {
    width: '100%', maxWidth: 280,
    padding: '12px 16px', borderRadius: 12,
    border: '2px solid #0D9488', outline: 'none',
    fontSize: 18, fontWeight: 700, textAlign: 'center',
    color: '#0A1628', background: '#fff',
    letterSpacing: '0.1em',
  },
  card: {
    background: '#fff', border: '1px solid #E4E2DC',
    borderRadius: 12, overflow: 'hidden',
    marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  topBar: { height: 4, width: '100%' },
  body: {
    display: 'flex', alignItems: 'center',
    padding: '12px 14px', gap: 12,
  },
};
