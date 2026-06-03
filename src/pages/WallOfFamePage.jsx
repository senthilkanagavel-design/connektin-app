// src/pages/WallOfFamePage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchLeaderboard } from '../hooks/useSignalRank';
import { getSignalBar } from '../utils/signal';
import Avatar from '../components/Avatar';

const TABS = [
  { key: 'weeklySignal',  label: 'This Week' },
  { key: 'monthlySignal', label: 'This Month' },
  { key: 'allTimeSignal', label: 'All Time' },
];

const INDUSTRY_LABELS = {
  medical_billing:        'Medical Billing',
  medical_coding:         'Medical Coding',
  medical_coding_billing: 'Medical Coding & Billing',
  healthcare:             'Healthcare',
  information_technology: 'Information Technology',
  banking_finance:        'Banking & Finance',
  education:              'Education',
  manufacturing:          'Manufacturing',
  real_estate:            'Real Estate',
  media_entertainment:    'Media & Entertainment',
  hospitality_travel:     'Hospitality & Travel',
};

const MEDAL = {
  1: { color: '#F59E0B', bg: '#FEF3C7', podiumH: 72, avatarSize: 58, border: '#F59E0B' },
  2: { color: '#94A3B8', bg: '#F1F5F9', podiumH: 52, avatarSize: 48, border: '#94A3B8' },
  3: { color: '#CD7F32', bg: '#FEF0E6', podiumH: 40, avatarSize: 44, border: '#CD7F32' },
};

export default function WallOfFamePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('weeklySignal');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const industry = profile?.industry || '';
  const industryLabel = INDUSTRY_LABELS[industry] || industry;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchLeaderboard(industry, activeTab);
      setLeaderboard(data);
      setLoading(false);
    };
    if (industry) load();
  }, [industry, activeTab]);

  const myRank   = leaderboard.findIndex(u => u.uid === user?.uid) + 1;
  const myEntry  = leaderboard.find(u => u.uid === user?.uid);
  const top3     = leaderboard.slice(0, 3);
  const rest     = leaderboard.slice(3);
  const tabLabel = activeTab === 'weeklySignal' ? 'week' : activeTab === 'monthlySignal' ? 'month' : 'all time';

  // Podium order: #2 left, #1 centre, #3 right
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumRanks = [2, 1, 3];

  const progressPct = myRank > 1
    ? Math.max(4, Math.round(((leaderboard.length - myRank + 1) / leaderboard.length) * 100))
    : 100;

  return (
    <div style={s.page}>

      {/* ── Header ── */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/dashboard', { state: { tab: 'profile' } })}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>Wall of Fame</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>Resets every Monday</div>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* ── Industry + tabs ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E2DC' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px', borderBottom: '1px solid #F3F2EF' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{industryLabel}</span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Rankings within your industry</span>
        </div>
        <div style={{ display: 'flex', padding: '0 16px' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: 1, padding: '10px 0', background: 'none', border: 'none',
                borderBottom: activeTab === t.key ? '2px solid #0D9488' : '2px solid transparent',
                fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500,
                color: activeTab === t.key ? '#0D9488' : '#9CA3AF',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.15s',
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* ── Your rank card (navy) ── */}
      {myRank > 0 && myEntry && (
        <div style={{
          margin: '12px 12px 0',
          background: '#0A1628',
          borderRadius: 16,
          padding: '16px 18px',
          border: '1px solid rgba(13,148,136,0.35)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
            Your rank this {tabLabel}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#0D9488', lineHeight: 1, letterSpacing: '-2px' }}>
                #{myRank}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                {myRank === 1
                  ? <span style={{ color: '#F59E0B', fontWeight: 700 }}>🔥 You're at the top!</span>
                  : myRank <= 3
                  ? <span>{myRank - 1} spot{myRank - 1 !== 1 ? 's' : ''} from <span style={{ color: '#F59E0B', fontWeight: 700 }}>#1</span></span>
                  : <span>{myRank - 1} spots to reach <span style={{ color: '#F59E0B', fontWeight: 700 }}>#1</span></span>
                }
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <SignalBars score={myEntry[activeTab] || 0} size="md" />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                {getSignalBar(myEntry[activeTab] || 0).label}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Progress to #1</span>
              <span style={{ fontSize: 11, color: '#0D9488', fontWeight: 600 }}>{progressPct}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: '#0D9488', borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Podium (top 3) ── */}
      {!loading && top3.length > 0 && (
        <div style={{ margin: '14px 12px 0', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          {podiumOrder.map((entry, i) => {
            if (!entry) return <div key={i} style={{ flex: 1 }} />;
            const rank  = podiumOrder === top3[1] ? 2 : i === 1 ? 1 : 3;
            const rk    = podiumRanks[i];
            const medal = MEDAL[rk];
            const isMe  = entry.uid === user?.uid;
            const circling = profile?.circling || [];
            const isInCircle = circling.includes(entry.uid) && !isMe;

            return (
              <div
                key={entry.uid}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: !isMe ? 'pointer' : 'default' }}
                onClick={() => !isMe && navigate(`/profile/${entry.uid}`, { state: { from: 'wall-of-fame' } })}
              >
                <div style={{ fontSize: rk === 1 ? 22 : 18 }}>
                  {rk === 1 ? '🏆' : rk === 2 ? '🥈' : '🥉'}
                </div>
                <Avatar
                  uid={entry.uid}
                  photoURL={entry.photoURL}
                  avatarId={entry.avatarId || entry.avatar}
                  displayName={entry.displayName}
                  plan={entry.plan || 'trial'}
                  role={entry.role || 'participant'}
                  size={medal.avatarSize}
                  inCircle={isInCircle}
                />
                <div style={{ fontSize: rk === 1 ? 13 : 12, fontWeight: 800, color: isMe ? '#0D9488' : '#1A1A1A', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.displayName || 'User'}{isMe ? ' 👈' : ''}
                </div>
                <div style={{
                  background: medal.color,
                  borderRadius: '10px 10px 0 0',
                  height: medal.podiumH,
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: rk === 1 ? 22 : 18, fontWeight: 900, color: '#fff' }}>#{rk}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Rest of leaderboard (#4+) ── */}
      <div style={{ margin: '10px 12px 0', background: '#fff', borderRadius: 14, border: '1px solid #E4E2DC', overflow: 'hidden' }}>
        {loading ? (
          [1,2,3,4,5].map(i => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 14px', borderBottom: '1px solid #F3F2EF', alignItems: 'center' }}>
              <div style={{ width: 28, height: 16, borderRadius: 4, background: '#E4E2DC', flexShrink: 0 }} />
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E4E2DC', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, borderRadius: 6, background: '#E4E2DC', width: '50%' }} />
                <div style={{ height: 10, borderRadius: 6, background: '#E4E2DC', width: '35%', marginTop: 6 }} />
              </div>
            </div>
          ))
        ) : rest.length === 0 && top3.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 32px', gap: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 4 }}>🏆</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0A1628' }}>No activity yet</div>
            <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, maxWidth: 280 }}>Be the first to earn Signal in {industryLabel}!</div>
            <button
              style={{ marginTop: 8, padding: '10px 24px', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 24, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              onClick={() => navigate('/dashboard')}
            >Start Engaging</button>
          </div>
        ) : (
          rest.map((entry, idx) => {
            const rank     = idx + 4;
            const isMe     = entry.uid === user?.uid;
            const bar      = getSignalBar(entry[activeTab] || 0);
            const circling = profile?.circling || [];
            const isInCircle = circling.includes(entry.uid) && !isMe;

            return (
              <div
                key={entry.uid}
                onClick={() => !isMe && navigate(`/profile/${entry.uid}`, { state: { from: 'wall-of-fame' } })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  borderBottom: '1px solid #F3F2EF',
                  borderLeft: isMe ? '3px solid #0D9488' : '3px solid transparent',
                  background: isMe ? '#F0FDFA' : '#fff',
                  cursor: !isMe ? 'pointer' : 'default',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: isMe ? 800 : 700, color: isMe ? '#0D9488' : '#9CA3AF', minWidth: 28 }}>
                  #{rank}
                </span>
                <Avatar
                  uid={entry.uid}
                  photoURL={entry.photoURL}
                  avatarId={entry.avatarId || entry.avatar}
                  displayName={entry.displayName}
                  plan={entry.plan || 'trial'}
                  role={entry.role || 'participant'}
                  size={38}
                  inCircle={isInCircle}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isMe ? '#0D9488' : '#0A1628' }}>
                      {entry.displayName || 'User'}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: '#0D9488', borderRadius: 8, padding: '2px 7px' }}>YOU</span>
                    )}
                    {isInCircle && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#0D9488', background: '#E6F7F5', borderRadius: 8, padding: '2px 6px' }}>∞ Circle</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: isMe ? '#5DCAA5' : '#9CA3AF', marginTop: 2 }}>
                    {(entry.industry || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                  <SignalBars score={entry[activeTab] || 0} size="sm" />
                  <div style={{ fontSize: 10, color: isMe ? '#0D9488' : '#9CA3AF', fontWeight: isMe ? 600 : 400 }}>{bar.label}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!loading && leaderboard.length > 0 && (
        <div style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', padding: '16px', fontFamily: "'DM Sans', sans-serif" }}>
          Resets every Monday · {industryLabel} only
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}

function SignalBars({ score, size = 'md' }) {
  const bar     = getSignalBar(score);
  const heights = size === 'sm' ? [5, 8, 11, 14, 16] : [8, 14, 20, 26, 32];
  const width   = size === 'sm' ? 3 : 6;
  const gap     = size === 'sm' ? 2 : 4;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width, height: h, borderRadius: 2,
          background: (i + 1) <= bar.bars ? '#0D9488' : '#E4E2DC',
        }} />
      ))}
    </div>
  );
}

const s = {
  page:    { minHeight: '100vh', background: '#F3F2EF', fontFamily: "'DM Sans', sans-serif", paddingBottom: 40 },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0A1628', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10 },
  backBtn: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
