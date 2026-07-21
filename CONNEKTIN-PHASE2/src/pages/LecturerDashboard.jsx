// src/pages/LecturerDashboard.jsx
//
// Real dashboard for college Lecturer accounts, replacing the interim
// CollegeComingSoon placeholder. Narrower than PrincipalDashboard.jsx — a
// Lecturer can see their college's student roster but has no lecturer-roster
// or college-management view. Follows the same shell pattern (no shared UI
// kit in this codebase — see PrincipalDashboard.jsx / CompanyDashboard.jsx).
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase/config';
import { doc, onSnapshot, collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { GrowthChart, fetchWeeklyGrowth } from '../components/college/CollegeCharts';

const T = {
  navy:   '#0A1628',
  teal:   '#0D9488',
  bg:     '#F0F4F8',
  white:  '#FFFFFF',
  border: '#E4E2DC',
  text:   '#0A1628',
  muted:  '#6B7280',
  faint:  '#9CA3AF',
  font:   "'DM Sans', sans-serif",
};

const PAGE_SIZE = 20;

function CollegeLogo({ name, logoURL, size = 36 }) {
  const initials = (name || 'C').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (logoURL) return <img src={logoURL} alt={name} style={{ width: size, height: size, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: '#F5F3FF', color: '#534AB7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.3), fontWeight: 800, flexShrink: 0, fontFamily: T.font }}>
      {initials}
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${T.border}`, borderTopColor: T.teal, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function RosterRow({ person }) {
  return (
    <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E6FAF8', color: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0, fontFamily: T.font }}>
        {(person.displayName || person.email || '?').charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>{person.displayName || 'Unnamed'}</div>
        <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>{person.email}</div>
      </div>
      <div style={{ fontSize: 11, color: T.faint, fontFamily: T.font, flexShrink: 0 }}>
        {person.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || '—'}
      </div>
    </div>
  );
}

function LoadMoreBtn({ onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '11px 0',
        background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 13, fontWeight: 600,
        color: T.teal, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: T.font, opacity: loading ? 0.6 : 1 }}>
      {loading ? 'Loading…' : 'Load more'}
    </button>
  );
}

function Empty({ message, icon = '📭' }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 13, color: T.muted, fontFamily: T.font }}>{message}</div>
    </div>
  );
}

// ── NAV ───────────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview', label: 'Overview', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { id: 'students', label: 'Students', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id: 'profile',  label: 'Profile',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V9l9-7 9 7v13"/><path d="M9 22V12h6v10"/></svg> },
];

// ── OVERVIEW ─────────────────────────────────────────────────────────────────
function OverviewTab({ college }) {
  const [growth, setGrowth] = useState(null);

  useEffect(() => {
    if (!college?.id) return;
    fetchWeeklyGrowth(college.id, 'student').then(setGrowth).catch(() => setGrowth(null));
  }, [college?.id]);

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 16, fontFamily: T.font }}>Overview</div>

      <div style={{ background: T.navy, borderRadius: 14, overflow: 'hidden', marginBottom: 16, position: 'relative' }}>
        <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: T.teal, opacity: 0.12, top: -70, right: -30 }} />
        <div style={{ padding: 16, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ border: '2px solid rgba(255,255,255,0.15)', borderRadius: 10, overflow: 'hidden' }}>
              <CollegeLogo name={college?.name} logoURL={college?.logoURL} size={36} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.white, fontFamily: T.font, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{college?.name}</div>
              <div style={{ fontSize: 9, color: '#5EEAD4', fontFamily: T.font, marginTop: 2 }}>Your college</div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#5EEAD4', fontFamily: T.font }}>{college?.studentCount || 0}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3, fontFamily: T.font }}>Students</div>
          </div>
        </div>
      </div>

      {growth && <GrowthChart points={growth} seriesLabel="Student" />}
    </div>
  );
}

// ── STUDENTS (read-only roster, paginated — colleges expect 2000+ students) ──
function StudentsTab({ collegeId }) {
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [lastDoc, setLastDoc]       = useState(null);
  const [hasMore, setHasMore]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    async function fetch() {
      const q = query(collection(db, 'users'), where('collegeId', '==', collegeId), where('collegeRole', '==', 'student'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    }
    if (collegeId) fetch();
  }, [collegeId]);

  async function loadMore() {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    const q = query(collection(db, 'users'), where('collegeId', '==', collegeId), where('collegeRole', '==', 'student'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
    const snap = await getDocs(q);
    setStudents(prev => [...prev, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))]);
    setLastDoc(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.docs.length === PAGE_SIZE);
    setLoadingMore(false);
  }

  if (loading) return <Loader />;
  if (students.length === 0) return <Empty message="No students have joined yet." icon="🧑‍🎓" />;

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 16, fontFamily: T.font }}>Students ({students.length}{hasMore ? '+' : ''})</div>
      {students.map(s => <RosterRow key={s.id} person={s} />)}
      {hasMore && <LoadMoreBtn onClick={loadMore} loading={loadingMore} />}
    </div>
  );
}

// ── PROFILE (read-only, own account) ──────────────────────────────────────────
function ProfileTab({ profile }) {
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 16, fontFamily: T.font }}>My profile</div>
      <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, fontFamily: T.font }}>{profile?.displayName || 'Lecturer'}</div>
        <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font, marginTop: 2 }}>{profile?.email}</div>
      </div>
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function LecturerDashboard() {
  const { profile }         = useAuth();
  const navigate            = useNavigate();
  const [active, setActive] = useState('overview');
  const [college, setCollege] = useState(null);
  const [loading, setLoading] = useState(true);

  const collegeId = profile?.collegeId;

  useEffect(() => {
    if (profile && !profile.collegeId) navigate('/dashboard', { replace: true });
  }, [profile, navigate]);

  useEffect(() => {
    if (!collegeId) return;
    const unsub = onSnapshot(doc(db, 'colleges', collegeId), snap => {
      if (snap.exists()) setCollege({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return unsub;
  }, [collegeId]);

  async function handleLogout() {
    await signOut(auth);
    navigate('/login');
  }

  const CONTENT = {
    overview: <OverviewTab college={college} />,
    students: <StudentsTab collegeId={collegeId} />,
    profile:  <ProfileTab profile={profile} />,
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
      <Loader />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', fontFamily: T.font }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Sidebar */}
      <div style={{ width: 220, background: '#1A0A28', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 50 }}>
        <div style={{ padding: '16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CollegeLogo name={college?.name} logoURL={college?.logoURL} size={32} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.white, fontFamily: T.font, lineHeight: 1.2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {college?.name || 'College'}
            </div>
            <div style={{ fontSize: 9, color: '#5EEAD4', fontFamily: T.font, marginTop: 1 }}>LECTURER DASHBOARD</div>
          </div>
        </div>

        <nav style={{ padding: '10px 0', flex: 1 }}>
          {NAV.map(n => {
            const isActive = active === n.id;
            return (
              <button key={n.id} onClick={() => setActive(n.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                  background: isActive ? 'rgba(94,234,212,0.1)' : 'none', border: 'none',
                  borderLeft: `2px solid ${isActive ? '#5EEAD4' : 'transparent'}`,
                  color: isActive ? '#5EEAD4' : 'rgba(255,255,255,0.6)',
                  fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: 'pointer', fontFamily: T.font,
                  textAlign: 'left', transition: 'all 0.15s' }}>
                <span style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }}>{n.icon}</span>
                {n.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10,
              color: 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer', fontFamily: T.font }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: 220, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: T.white, borderBottom: `1px solid ${T.border}`, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: T.font }}>
            {NAV.find(n => n.id === active)?.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.muted, fontFamily: T.font }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.teal }} />
            {college?.name}
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px 24px 40px', maxWidth: 760 }}>
          {CONTENT[active]}
        </div>
      </div>
    </div>
  );
}
