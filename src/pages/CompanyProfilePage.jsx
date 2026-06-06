// src/pages/CompanyProfilePage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

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

const PALETTES = [
  { bg: '#E6FAF8', color: '#0F6E56' },
  { bg: '#E6F1FB', color: '#185FA5' },
  { bg: '#F5F3FF', color: '#534AB7' },
  { bg: '#FEF3C7', color: '#854F0B' },
  { bg: '#FAECE7', color: '#993C1D' },
];

function CompanyLogo({ company, size = 60 }) {
  const p = PALETTES[(company.name?.charCodeAt(0) || 65) % PALETTES.length];
  const initials = (company.name || 'C').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (company.logoURL) return (
    <img src={company.logoURL} alt={company.name}
      style={{ width: size, height: size, borderRadius: 14, objectFit: 'contain', background: '#F3F2EF' }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: 14, background: p.bg, color: p.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.3), fontWeight: 800, fontFamily: T.font }}>
      {initials}
    </div>
  );
}

export default function CompanyProfilePage() {
  const { companyId }             = useParams();
  const navigate                  = useNavigate();
  const [company, setCompany]     = useState(null);
  const [jobs, setJobs]           = useState([]);
  const [internships, setInternships] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'companies', companyId), snap => {
      if (snap.exists()) setCompany({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return unsub;
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    async function fetchListings() {
      const [jobsSnap, internsSnap] = await Promise.all([
        getDocs(query(collection(db, 'jobs'),         where('companyId', '==', companyId))),
        getDocs(query(collection(db, 'internships'),  where('companyId', '==', companyId))),
      ]);
      setJobs(jobsSnap.docs.map(d => ({ id: d.id, type: 'job', ...d.data() })));
      setInternships(internsSnap.docs.map(d => ({ id: d.id, type: 'internship', ...d.data() })));
    }
    fetchListings();
  }, [companyId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div style={{ width: 28, height: 28, border: `3px solid ${T.border}`, borderTopColor: T.teal,
          borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: T.font }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🏢</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Company not found</div>
        <button onClick={() => navigate(-1)} style={{ marginTop: 16, padding: '10px 24px',
          background: T.teal, color: T.white, border: 'none', borderRadius: 10, fontSize: 14,
          fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}>Go back</button>
      </div>
    );
  }

  const allListings = [...jobs, ...internships];
  const openRoles   = company.openRoles  ?? allListings.length;
  const totalHires  = company.totalHires ?? 0;
  const rating      = company.rating     ?? null;

  return (
    <div style={{ background: T.bg, minHeight: '100vh', paddingBottom: 80, fontFamily: T.font }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── HERO BAND ── */}
      <div style={{ background: T.navy }}>

        {/* Topbar */}
        <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', border: 'none', color: T.white, fontSize: 18,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>‹</button>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.white, flex: 1, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</div>
          <button style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>

        {/* Cover area */}
        <div style={{ height: 80, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%',
            background: T.teal, opacity: 0.1, top: -80, right: -40 }} />
          <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%',
            background: '#534AB7', opacity: 0.12, bottom: -60, left: -20 }} />
          <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%',
            background: T.teal, opacity: 0.08, top: 10, left: 100 }} />
        </div>

        {/* Logo + name + verified */}
        <div style={{ padding: '0 16px', marginTop: -28, display: 'flex', alignItems: 'flex-end',
          gap: 12, marginBottom: 16 }}>
          <div style={{ border: `3px solid ${T.navy}`, borderRadius: 17, overflow: 'hidden', flexShrink: 0 }}>
            <CompanyLogo company={company} size={60} />
          </div>
          <div style={{ paddingBottom: 4, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.white, lineHeight: 1.2 }}>{company.name}</div>
              <div style={{ background: 'rgba(13,148,136,0.2)', border: '1px solid rgba(13,148,136,0.4)',
                borderRadius: 20, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#5EEAD4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 4.8 5.6.8-4 4 .9 5.4L12 14.5l-5 2.5.9-5.4-4-4 5.6-.8z"/>
                </svg>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#5EEAD4', fontFamily: T.font }}>Verified</span>
              </div>
            </div>
            {company.tagline && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{company.tagline}</div>
            )}
          </div>
        </div>

        {/* Glass stats */}
        <div style={{ display: 'flex', margin: '0 14px 16px', background: 'rgba(255,255,255,0.07)',
          border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden' }}>
          {[
            { num: openRoles, label: 'OPEN ROLES' },
            { num: totalHires, label: 'PLACED' },
            { num: rating ?? '—', label: 'RATING' },
            { num: company.founded ?? '—', label: 'FOUNDED' },
          ].map((s, i) => (
            <div key={s.label} style={{ flex: 1, padding: '12px 0', textAlign: 'center',
              borderRight: i < 3 ? '0.5px solid rgba(255,255,255,0.08)' : 'none' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#5EEAD4' }}>{s.num}</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 3,
                letterSpacing: '0.06em', fontFamily: T.font }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Meta pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 14px 18px' }}>
          {[
            company.industry?.replace(/_/g, ' '),
            company.location,
            company.size ? `${company.size} people` : null,
            company.website,
          ].filter(Boolean).map(pill => (
            <span key={pill} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
              fontSize: 10, padding: '4px 10px', borderRadius: 20, fontWeight: 500, fontFamily: T.font }}>
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* ── ABOUT ── */}
      {company.about && (
        <div style={{ background: T.white, padding: 14, borderBottom: `0.5px solid ${T.border}`, marginTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 8 }}>About</div>
          <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.7 }}>{company.about}</div>
        </div>
      )}

      {/* ── WHY JOIN US ── */}
      {company.whyJoinUs?.length > 0 && (
        <div style={{ background: T.white, padding: 14, borderBottom: `0.5px solid ${T.border}`, marginTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 12 }}>Why join us</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {company.whyJoinUs.map((item, i) => {
              const icons = ['🚀', '👥', '🏆'];
              const colors = [{ bg: '#E6FAF8', color: T.teal }, { bg: '#EEEDFE', color: '#534AB7' }, { bg: '#FEF3C7', color: '#854F0B' }];
              const c = colors[i % colors.length];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: c.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                    {icons[i % icons.length]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{item.title}</div>
                    {item.desc && <div style={{ fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.5 }}>{item.desc}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SOCIAL PROOF ── */}
      <div style={{ background: T.white, padding: '11px 14px', borderBottom: `0.5px solid ${T.border}`,
        marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex' }}>
          {['A', 'R', 'S'].map((l, i) => {
            const bgs = [T.teal, '#534AB7', '#854F0B'];
            return (
              <div key={l} style={{ width: 24, height: 24, borderRadius: '50%', background: bgs[i],
                border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: T.white, fontWeight: 700, marginRight: i < 2 ? -7 : 0, zIndex: 3 - i }}>
                {l}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: T.muted, flex: 1 }}>
          <span style={{ color: T.text, fontWeight: 700 }}>{Math.floor(Math.random() * 50) + 20} people</span> applied this week
        </div>
        <span style={{ background: '#E6FAF8', color: '#0F6E56', fontSize: 10, fontWeight: 700,
          padding: '3px 9px', borderRadius: 20 }}>Trending</span>
      </div>

      {/* ── OPEN ROLES ── */}
      <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase',
        letterSpacing: '0.08em', padding: '14px 14px 8px' }}>
        Open roles ({allListings.length})
      </div>

      {allListings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: T.faint, fontFamily: T.font }}>
          <div style={{ fontSize: 13 }}>No open roles at the moment</div>
        </div>
      ) : (
        <div style={{ padding: '0 12px' }}>
          {allListings.map(listing => (
            <ListingCard key={listing.id} listing={listing} companyName={company.name} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing, companyName }) {
  const navigate = useNavigate();
  const isInternship = listing.type === 'internship';
  const badgeCfg = isInternship
    ? { bg: '#FEF3C7', color: '#633806', label: 'Internship' }
    : { bg: '#E6F1FB', color: '#0C447C', label: 'Full time' };

  const tags = [
    listing.workMode || listing.mode,
    listing.skills?.[0],
    isInternship && listing.ppo ? 'PPO' : null,
    listing.fresher ? 'Fresher OK' : null,
  ].filter(Boolean).slice(0, 3);

  const tagColors = [
    { bg: '#E6FAF8', color: '#085041' },
    { bg: '#F5F3FF', color: '#3C3489' },
    { bg: '#FEF3C7', color: '#633806' },
  ];

  return (
    <div style={{ background: T.white, borderRadius: 14, border: `0.5px solid ${T.border}`,
      marginBottom: 8, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.navy }}>{listing.title}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
            {[listing.location || listing.workMode, isInternship ? listing.duration : null,
              isInternship ? (listing.stipend ? `₹${listing.stipend}/mo` : 'Unpaid') : (listing.salaryRange || null)
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
        <span style={{ background: badgeCfg.bg, color: badgeCfg.color, fontSize: 10, fontWeight: 700,
          padding: '3px 9px', borderRadius: 20, flexShrink: 0 }}>{badgeCfg.label}</span>
      </div>

      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {tags.map((tag, i) => {
            const tc = tagColors[i % tagColors.length];
            return (
              <span key={tag} style={{ background: tc.bg, color: tc.color, fontSize: 10,
                fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>{tag}</span>
            );
          })}
        </div>
      )}

      <button
        onClick={() => navigate(`/opportunities/${listing.type}/${listing.id}`)}
        style={{ width: '100%', padding: '10px 0', background: T.navy, color: T.white,
          border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          fontFamily: T.font, letterSpacing: '0.02em' }}>
        Apply now →
      </button>
    </div>
  );
}
