// src/pages/CompanyDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

const T = {
  navy:   '#0A1628',
  teal:   '#0D9488',
  purple: '#534AB7',
  bg:     '#F0F4F8',
  white:  '#FFFFFF',
  border: '#E4E2DC',
  text:   '#0A1628',
  muted:  '#6B7280',
  faint:  '#9CA3AF',
  font:   "'DM Sans', sans-serif",
};

const PALETTES = [
  { bg: '#E6FAF8', color: '#0F6E56' },
  { bg: '#E6F1FB', color: '#185FA5' },
  { bg: '#F5F3FF', color: '#534AB7' },
  { bg: '#FEF3C7', color: '#854F0B' },
  { bg: '#FAECE7', color: '#993C1D' },
];

function CoLogo({ name, logoURL, size = 36 }) {
  const p = PALETTES[(name?.charCodeAt(0) || 65) % PALETTES.length];
  const initials = (name || 'C').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (logoURL) return <img src={logoURL} alt={name} style={{ width: size, height: size, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: p.bg, color: p.color,
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

// ── NAV ───────────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview',   label: 'Overview',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { id: 'post',       label: 'Post',       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
  { id: 'posts',      label: 'My posts',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  { id: 'applicants', label: 'Applicants', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id: 'profile',    label: 'Profile',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V9l9-7 9 7v13"/><path d="M9 22V12h6v10"/></svg> },
];

// ── OVERVIEW ─────────────────────────────────────────────────────────────────
function OverviewTab({ company, companyId, onNav }) {
  const [stats, setStats] = useState({ posts: 0, applicants: 0, hires: 0 });

  useEffect(() => {
    async function fetchStats() {
      const [jobsSnap, internsSnap] = await Promise.all([
        getDocs(query(collection(db, 'jobs'),        where('companyId', '==', companyId))),
        getDocs(query(collection(db, 'internships'), where('companyId', '==', companyId))),
      ]);
      const allListings = [...jobsSnap.docs, ...internsSnap.docs];
      const listingIds  = allListings.map(d => d.id);
      let applicants = 0;
      if (listingIds.length > 0) {
        const appSnap = await getDocs(query(collection(db, 'applications'), where('itemId', 'in', listingIds.slice(0, 10))));
        applicants = appSnap.size;
      }
      setStats({ posts: allListings.length, applicants, hires: company.totalHires ?? 0 });
    }
    if (companyId) fetchStats();
  }, [companyId, company]);

  const STATS = [
    { num: stats.posts,      label: 'Active posts',  color: '#5EEAD4' },
    { num: stats.applicants, label: 'Applicants',    color: '#5EEAD4' },
    { num: stats.hires,      label: 'Hires made',    color: '#5EEAD4' },
  ];

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 16, fontFamily: T.font }}>Overview</div>

      {/* Stats */}
      <div style={{ background: T.navy, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: T.font }}>Quick stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: T.font }}>{s.num}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3, fontFamily: T.font }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Get started */}
      {stats.posts === 0 && (
        <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6, fontFamily: T.font }}>Get started</div>
          <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14, fontFamily: T.font }}>Post your first job or internship to start receiving applications from seekers.</div>
          <button onClick={() => onNav('post')}
            style={{ padding: '10px 20px', background: T.teal, color: T.white, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}>
            Post now →
          </button>
        </div>
      )}

      {/* Company card */}
      <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{ background: T.navy, height: 52, position: 'relative' }}>
          <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: T.teal, opacity: 0.08, top: -50, right: -20 }} />
        </div>
        <div style={{ padding: '0 16px 16px', marginTop: -18 }}>
          <div style={{ border: `3px solid ${T.white}`, borderRadius: 12, overflow: 'hidden', display: 'inline-block', marginBottom: 10 }}>
            <CoLogo name={company?.name} logoURL={company?.logoURL} size={44} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.font }}>{company?.name}</div>
          {company?.tagline && <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font, marginTop: 2 }}>{company.tagline}</div>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {company?.industry && <span style={{ background: '#E6FAF8', color: '#0F6E56', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, fontFamily: T.font }}>{company.industry.replace(/_/g, ' ')}</span>}
            {company?.location  && <span style={{ background: '#F1F5F9', color: '#475569', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontFamily: T.font }}>{company.location}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── POST ─────────────────────────────────────────────────────────────────────
function PostTab({ companyId, companyName }) {
  const [type, setType]       = useState('internship');
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState({
    title: '', description: '', location: '', workMode: 'remote',
    skills: '', stipend: '', salaryRange: '', duration: '',
    employmentType: 'full_time', experience: '', deadline: '',
    openings: '1', ppo: false, fresher: true,
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handlePost() {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      const col    = type === 'internship' ? 'internships' : 'jobs';
      const skills = form.skills.split(',').map(s => s.trim()).filter(Boolean);
      await addDoc(collection(db, col), {
        title:          form.title.trim(),
        description:    form.description.trim(),
        location:       form.location.trim(),
        workMode:       form.workMode,
        skills,
        companyId,
        companyName,
        type,
        openings:       parseInt(form.openings) || 1,
        deadline:       form.deadline,
        ...(type === 'internship' ? {
          stipend:  form.stipend,
          duration: form.duration,
          ppo:      form.ppo,
          certificate: true,
        } : {
          salaryRange:    form.salaryRange,
          employmentType: form.employmentType,
          experience:     form.experience,
          fresher:        form.fresher,
        }),
        status:    'active',
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setForm({ title: '', description: '', location: '', workMode: 'remote', skills: '', stipend: '', salaryRange: '', duration: '', employmentType: 'full_time', experience: '', deadline: '', openings: '1', ppo: false, fresher: true });
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (success) return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 6, fontFamily: T.font }}>Posted successfully!</div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 24, fontFamily: T.font }}>Your {type} is now live on ConnektIn.</div>
      <button onClick={() => setSuccess(false)} style={{ padding: '11px 24px', background: T.teal, color: T.white, border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}>Post another</button>
    </div>
  );

  const inp = { width: '100%', padding: '10px 13px', borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: 'none', background: T.white, color: '#000', boxSizing: 'border-box', marginBottom: 12, display: 'block' };
  const lbl = { fontSize: 11, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 4, fontFamily: T.font };

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 16, fontFamily: T.font }}>Post an opportunity</div>

      {/* Type toggle */}
      <div style={{ display: 'flex', background: '#F0F4F8', borderRadius: 24, padding: 3, marginBottom: 18 }}>
        {['internship', 'job'].map(t => (
          <button key={t} onClick={() => setType(t)}
            style={{ flex: 1, padding: '9px 0', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.font, transition: 'all 0.15s',
              background: type === t ? T.white : 'none', color: type === t ? T.teal : T.muted,
              boxShadow: type === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {t === 'internship' ? 'Internship' : 'Job'}
          </button>
        ))}
      </div>

      {error && <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 9, padding: '9px 13px', fontSize: 13, marginBottom: 14, fontFamily: T.font }}>{error}</div>}

      <label style={lbl}>Title *</label>
      <input style={inp} placeholder={type === 'internship' ? 'e.g. Product Design Intern' : 'e.g. Frontend Developer'} value={form.title} onChange={e => set('title', e.target.value)} />

      <label style={lbl}>Description</label>
      <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} placeholder="What will they be doing?" value={form.description} onChange={e => set('description', e.target.value)} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={lbl}>Work mode</label>
          <select style={{ ...inp, appearance: 'none', marginBottom: 0 }} value={form.workMode} onChange={e => set('workMode', e.target.value)}>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </div>
        <div>
          <label style={lbl}>Location</label>
          <input style={{ ...inp, marginBottom: 0 }} placeholder="City" value={form.location} onChange={e => set('location', e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={lbl}>Skills required</label>
        <input style={inp} placeholder="React, Figma, SQL (comma separated)" value={form.skills} onChange={e => set('skills', e.target.value)} />
      </div>

      {type === 'internship' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Stipend (₹/month)</label>
            <input style={{ ...inp, marginBottom: 0 }} placeholder="e.g. 5000" value={form.stipend} onChange={e => set('stipend', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Duration</label>
            <select style={{ ...inp, appearance: 'none', marginBottom: 0 }} value={form.duration} onChange={e => set('duration', e.target.value)}>
              <option value="">Select</option>
              <option value="4 weeks">4 weeks</option>
              <option value="6 weeks">6 weeks</option>
              <option value="2 months">2 months</option>
              <option value="3 months">3 months</option>
              <option value="6 months">6 months</option>
            </select>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Salary range</label>
            <input style={{ ...inp, marginBottom: 0 }} placeholder="e.g. 6-8 LPA" value={form.salaryRange} onChange={e => set('salaryRange', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Employment type</label>
            <select style={{ ...inp, appearance: 'none', marginBottom: 0 }} value={form.employmentType} onChange={e => set('employmentType', e.target.value)}>
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contract">Contract</option>
            </select>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <div>
          <label style={lbl}>Openings</label>
          <input style={{ ...inp, marginBottom: 0 }} type="number" min="1" value={form.openings} onChange={e => set('openings', e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Application deadline</label>
          <input style={{ ...inp, marginBottom: 0 }} type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
        </div>
      </div>

      <button onClick={handlePost} disabled={saving}
        style={{ width: '100%', padding: 13, background: saving ? '#94A3B8' : T.teal, color: T.white, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: T.font, marginTop: 18 }}>
        {saving ? 'Posting…' : `Post ${type === 'internship' ? 'internship' : 'job'} →`}
      </button>
    </div>
  );
}

// ── MY POSTS ──────────────────────────────────────────────────────────────────
function MyPostsTab({ companyId }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function fetch() {
      const [jobsSnap, internsSnap] = await Promise.all([
        getDocs(query(collection(db, 'jobs'),        where('companyId', '==', companyId))),
        getDocs(query(collection(db, 'internships'), where('companyId', '==', companyId))),
      ]);
      const all = [
        ...jobsSnap.docs.map(d => ({ id: d.id, type: 'job', ...d.data() })),
        ...internsSnap.docs.map(d => ({ id: d.id, type: 'internship', ...d.data() })),
      ];
      all.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setListings(all);
      setLoading(false);
    }
    if (companyId) fetch();
  }, [companyId]);

  if (loading) return <Loader />;

  if (listings.length === 0) return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.font }}>No posts yet</div>
      <div style={{ fontSize: 13, color: T.muted, marginTop: 4, fontFamily: T.font }}>Your posted jobs and internships will appear here.</div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 16, fontFamily: T.font }}>My posts ({listings.length})</div>
      {listings.map(l => (
        <div key={l.id} style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.font }}>{l.title}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2, fontFamily: T.font }}>
                {[l.workMode, l.type === 'internship' ? l.duration : l.employmentType?.replace('_', ' ')].filter(Boolean).join(' · ')}
              </div>
            </div>
            <span style={{ background: l.type === 'internship' ? '#FEF3C7' : '#E6F1FB', color: l.type === 'internship' ? '#633806' : '#0C447C', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, flexShrink: 0, fontFamily: T.font }}>
              {l.type === 'internship' ? 'Internship' : 'Job'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {l.skills?.slice(0, 3).map(s => (
              <span key={s} style={{ background: '#F1F5F9', color: '#475569', fontSize: 10, padding: '2px 7px', borderRadius: 6, fontFamily: T.font }}>{s}</span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: `0.5px solid ${T.border}` }}>
            <span style={{ fontSize: 11, color: T.faint, fontFamily: T.font }}>
              {l.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || '—'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: l.status === 'active' ? '#0F6E56' : T.faint, background: l.status === 'active' ? '#E1F5EE' : '#F1F5F9', padding: '2px 9px', borderRadius: 20, fontFamily: T.font }}>
              {l.status === 'active' ? 'Active' : 'Closed'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── APPLICANTS ────────────────────────────────────────────────────────────────
function ApplicantsTab({ companyId }) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function fetch() {
      const [jobsSnap, internsSnap] = await Promise.all([
        getDocs(query(collection(db, 'jobs'),        where('companyId', '==', companyId))),
        getDocs(query(collection(db, 'internships'), where('companyId', '==', companyId))),
      ]);
      const listingIds = [...jobsSnap.docs, ...internsSnap.docs].map(d => d.id);
      if (!listingIds.length) { setLoading(false); return; }

      const appSnap = await getDocs(query(collection(db, 'applications'), where('itemId', 'in', listingIds.slice(0, 10))));
      const apps = appSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setApplicants(apps);
      setLoading(false);
    }
    if (companyId) fetch();
  }, [companyId]);

  async function updateStatus(appId, status) {
    await updateDoc(doc(db, 'applications', appId), { status });
    setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
  }

  if (loading) return <Loader />;

  if (applicants.length === 0) return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.font }}>No applicants yet</div>
      <div style={{ fontSize: 13, color: T.muted, marginTop: 4, fontFamily: T.font }}>Applications will appear here once seekers apply to your listings.</div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 16, fontFamily: T.font }}>Applicants ({applicants.length})</div>
      {applicants.map(app => (
        <div key={app.id} style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E6FAF8', color: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0, fontFamily: T.font }}>
              {(app.applicantName || 'A').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>{app.applicantName || 'Applicant'}</div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>{app.appliedAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) || '—'}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, fontFamily: T.font,
              background: app.status === 'shortlisted' ? '#E1F5EE' : app.status === 'rejected' ? '#FEE2E2' : '#F1F5F9',
              color:      app.status === 'shortlisted' ? '#0F6E56'  : app.status === 'rejected' ? '#991B1B'  : '#475569' }}>
              {app.status === 'shortlisted' ? 'Shortlisted' : app.status === 'rejected' ? 'Rejected' : 'Pending'}
            </span>
          </div>
          {app.coverNote && (
            <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 10, fontFamily: T.font, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {app.coverNote}
            </div>
          )}
          {app.resumeURL && (
            <a href={app.resumeURL} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: T.teal, fontWeight: 600, display: 'block', marginBottom: 10, fontFamily: T.font }}>
              View resume →
            </a>
          )}
          {app.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => updateStatus(app.id, 'shortlisted')}
                style={{ flex: 1, padding: '8px 0', background: '#E1F5EE', color: '#0F6E56', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}>
                Shortlist
              </button>
              <button onClick={() => updateStatus(app.id, 'rejected')}
                style={{ flex: 1, padding: '8px 0', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}>
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
function ProfileTab({ company, companyId }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ tagline: company?.tagline || '', about: company?.about || '', website: company?.website || '' });
  const [saving, setSaving]   = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        tagline: form.tagline.trim(),
        about:   form.about.trim(),
        website: form.website.trim(),
      });
      setEditing(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  const inp = { width: '100%', padding: '10px 13px', borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: 'none', background: T.white, color: '#000', boxSizing: 'border-box', marginBottom: 12, display: 'block' };
  const lbl = { fontSize: 11, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 4, fontFamily: T.font };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.text, fontFamily: T.font }}>Company profile</div>
        {!editing && (
          <button onClick={() => setEditing(true)}
            style={{ padding: '7px 14px', background: T.white, color: T.teal, border: `1.5px solid ${T.teal}`, borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}>
            Edit
          </button>
        )}
      </div>

      <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ background: T.navy, height: 60, position: 'relative' }}>
          <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: T.teal, opacity: 0.08, top: -60, right: -20 }} />
          <div style={{ position: 'absolute', bottom: -20, left: 16 }}>
            <div style={{ border: `3px solid ${T.white}`, borderRadius: 13, overflow: 'hidden' }}>
              <CoLogo name={company?.name} logoURL={company?.logoURL} size={48} />
            </div>
          </div>
        </div>
        <div style={{ padding: '28px 16px 16px' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, fontFamily: T.font }}>{company?.name}</div>
          <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font, marginTop: 2 }}>{company?.tagline || 'No tagline set'}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {company?.industry && <span style={{ background: '#E6FAF8', color: '#0F6E56', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, fontFamily: T.font }}>{company.industry.replace(/_/g, ' ')}</span>}
            {company?.location  && <span style={{ background: '#F1F5F9', color: '#475569', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontFamily: T.font }}>{company.location}</span>}
            {company?.size      && <span style={{ background: '#F1F5F9', color: '#475569', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontFamily: T.font }}>{company.size}</span>}
          </div>
        </div>
      </div>

      {editing ? (
        <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: 16 }}>
          <label style={lbl}>Tagline</label>
          <input style={inp} placeholder="e.g. Create the Unimagine" value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} />
          <label style={lbl}>About</label>
          <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} placeholder="What does your company do?" value={form.about} onChange={e => setForm(f => ({ ...f, about: e.target.value }))} />
          <label style={lbl}>Website</label>
          <input style={inp} placeholder="https://..." value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(false)} style={{ padding: '10px 16px', background: T.white, color: T.muted, border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 13, cursor: 'pointer', fontFamily: T.font }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px 0', background: saving ? '#94A3B8' : T.teal, color: T.white, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: T.font }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: T.font }}>About</div>
          <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, fontFamily: T.font }}>{company?.about || 'No description set.'}</div>
          {company?.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', marginTop: 12, fontSize: 13, color: T.teal, fontWeight: 600, fontFamily: T.font }}>
              {company.website}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function CompanyDashboard() {
  const { user, profile }         = useAuth();
  const navigate                  = useNavigate();
  const [active, setActive]       = useState('overview');
  const [company, setCompany]     = useState(null);
  const [loading, setLoading]     = useState(true);

  const companyId = profile?.companyId;

  // Redirect if not a company user
  useEffect(() => {
    if (profile && profile.userType !== 'company') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, navigate]);

  // Load company data
  useEffect(() => {
    if (!companyId) return;
    const unsub = onSnapshot(doc(db, 'companies', companyId), snap => {
      if (snap.exists()) setCompany({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return unsub;
  }, [companyId]);

  async function handleLogout() {
    await signOut(auth);
    navigate('/login');
  }

  const CONTENT = {
    overview:   <OverviewTab   company={company} companyId={companyId} onNav={setActive} />,
    post:       <PostTab       companyId={companyId} companyName={company?.name} />,
    posts:      <MyPostsTab    companyId={companyId} />,
    applicants: <ApplicantsTab companyId={companyId} />,
    profile:    <ProfileTab    company={company} companyId={companyId} />,
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
        {/* Logo */}
        <div style={{ padding: '16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CoLogo name={company?.name} logoURL={company?.logoURL} size={32} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.white, fontFamily: T.font, lineHeight: 1.2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {company?.name || 'Company'}
            </div>
            <div style={{ fontSize: 9, color: '#5EEAD4', fontFamily: T.font, marginTop: 1 }}>COMPANY DASHBOARD</div>
          </div>
        </div>

        {/* Nav items */}
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

        {/* Logout */}
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
        {/* Topbar */}
        <div style={{ background: T.white, borderBottom: `1px solid ${T.border}`, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: T.font }}>
            {NAV.find(n => n.id === active)?.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.muted, fontFamily: T.font }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.teal }} />
            {company?.name}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px 24px 40px', maxWidth: 760 }}>
          {CONTENT[active]}
        </div>
      </div>
    </div>
  );
}
