// src/pages/tabs/CompaniesTab.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

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

const INDUSTRIES = [
  { value: 'all',                    label: 'All' },
  { value: 'information_technology', label: 'Technology' },
  { value: 'banking_finance',        label: 'Finance' },
  { value: 'healthcare',             label: 'Healthcare' },
  { value: 'education',              label: 'Education' },
  { value: 'media_entertainment',    label: 'Media' },
  { value: 'manufacturing',          label: 'Manufacturing' },
  { value: 'other',                  label: 'Other' },
];

const PALETTES = [
  { bg: '#E6FAF8', color: '#0F6E56' },
  { bg: '#E6F1FB', color: '#185FA5' },
  { bg: '#F5F3FF', color: '#534AB7' },
  { bg: '#FEF3C7', color: '#854F0B' },
  { bg: '#FAECE7', color: '#993C1D' },
];

function CompanyLogo({ company, size = 48 }) {
  const p = PALETTES[(company.name?.charCodeAt(0) || 65) % PALETTES.length];
  const initials = (company.name || 'C').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (company.logoURL) return (
    <img src={company.logoURL} alt={company.name}
      style={{ width: size, height: size, borderRadius: 12, objectFit: 'contain', background: '#F3F2EF', flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: p.bg, color: p.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.3), fontWeight: 800, flexShrink: 0, fontFamily: T.font }}>
      {initials}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#E6FAF8',
      border: '1px solid #9FE1CB', borderRadius: 20, padding: '2px 8px', marginTop: 4 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 4.8 5.6.8-4 4 .9 5.4L12 14.5l-5 2.5.9-5.4-4-4 5.6-.8z"/>
      </svg>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#0F6E56', fontFamily: T.font }}>ConnektIn Verified</span>
    </div>
  );
}

export default function CompaniesTab() {
  const navigate                    = useNavigate();
  const [companies, setCompanies]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [industry, setIndustry]     = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'companies'), where('status', '==', 'active'));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setCompanies(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = companies.filter(c => {
    const matchIndustry = industry === 'all' || c.industry === industry;
    const matchSearch   = !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
                          c.industry?.toLowerCase().includes(search.toLowerCase()) ||
                          c.location?.toLowerCase().includes(search.toLowerCase());
    return matchIndustry && matchSearch;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <div style={{ width: 28, height: 28, border: `3px solid ${T.border}`, borderTopColor: T.teal,
          borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: T.bg, minHeight: '100vh', paddingBottom: 80, fontFamily: T.font }}>

      {/* Header */}
      <div style={{ background: T.white, padding: '14px 16px 0', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.navy, marginBottom: 12 }}>Companies</div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F6F8FA',
          border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 12px', marginBottom: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search companies, industries…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 13, color: T.text,
              background: 'none', flex: 1, fontFamily: T.font }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.faint, fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Industry filters */}
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
          {INDUSTRIES.map(ind => (
            <button key={ind.value} onClick={() => setIndustry(ind.value)}
              style={{ flexShrink: 0, padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: T.font, border: 'none', transition: 'all 0.15s',
                background: industry === ind.value ? T.navy : '#F6F8FA',
                color:      industry === ind.value ? T.white : T.muted }}>
              {ind.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 700, color: T.faint,
        textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {filtered.length} {filtered.length === 1 ? 'company' : 'companies'} hiring now
      </div>

      {/* Company cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: T.faint }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏢</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No companies found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try a different search or filter</div>
        </div>
      ) : (
        <div style={{ padding: '6px 12px' }}>
          {filtered.map(company => (
            <CompanyCard key={company.id} company={company} onTap={() => navigate(`/company/${company.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyCard({ company, onTap }) {
  const coverColors = ['#0A1628', '#1A0A28', '#0A2810', '#0A1A28', '#1A1028'];
  const coverBg = coverColors[(company.name?.charCodeAt(0) || 65) % coverColors.length];

  return (
    <div onClick={onTap} style={{ borderRadius: 18, overflow: 'hidden', border: `0.5px solid ${T.border}`,
      background: T.white, marginBottom: 10, cursor: 'pointer' }}>

      {/* Cover band */}
      <div style={{ background: coverBg, height: 60, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%',
          background: '#0D9488', opacity: 0.1, top: -60, right: -20 }} />
        <div style={{ position: 'absolute', width: 90, height: 90, borderRadius: '50%',
          background: '#534AB7', opacity: 0.1, bottom: -40, left: 10 }} />
        {/* Verified badge */}
        <div style={{ position: 'absolute', top: 8, right: 10, background: 'rgba(13,148,136,0.2)',
          border: '1px solid rgba(13,148,136,0.35)', borderRadius: 20, padding: '3px 9px',
          display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#5EEAD4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.4 4.8 5.6.8-4 4 .9 5.4L12 14.5l-5 2.5.9-5.4-4-4 5.6-.8z"/>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#5EEAD4', fontFamily: T.font }}>Verified</span>
        </div>
        {/* Logo overlapping cover */}
        <div style={{ position: 'absolute', bottom: -20, left: 14 }}>
          <div style={{ border: '3px solid #fff', borderRadius: 13, overflow: 'hidden' }}>
            <CompanyLogo company={company} size={44} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '28px 14px 14px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.navy }}>{company.name}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
          {[company.industry?.replace(/_/g, ' '), company.location, company.founded ? `Est. ${company.founded}` : null]
            .filter(Boolean).join(' · ')}
        </div>
        {company.about && (
          <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.55, margin: '8px 0 12px',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {company.about}
          </div>
        )}

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', border: `0.5px solid ${T.border}`,
          borderRadius: 10, overflow: 'hidden' }}>
          {[
            { num: company.openRoles   ?? 0, label: 'Open roles' },
            { num: company.totalHires  ?? 0, label: 'Placed' },
            { num: company.rating      ?? '—', label: 'Rating' },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: '8px 0', textAlign: 'center',
              borderRight: i < 2 ? `0.5px solid ${T.border}` : 'none' }}>
              <div style={{ fontSize: 17, fontWeight: 800,
                color: i === 0 ? T.teal : i === 2 ? '#534AB7' : T.navy }}>{s.num}</div>
              <div style={{ fontSize: 9, color: T.faint, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
