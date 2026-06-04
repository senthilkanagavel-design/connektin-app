// src/pages/tabs/OpportunitiesTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';

// ─── helpers ────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate?.() || new Date(ts);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const DOMAIN_OPTIONS = [
  { value: 'all',          label: 'All domains' },
  { value: 'tech',         label: 'Tech' },
  { value: 'finance',      label: 'Finance' },
  { value: 'healthcare',   label: 'Healthcare' },
  { value: 'marketing',    label: 'Marketing' },
  { value: 'design',       label: 'Design' },
  { value: 'education',    label: 'Education' },
  { value: 'operations',   label: 'Operations' },
  { value: 'sales',        label: 'Sales' },
  { value: 'hr',           label: 'HR' },
];

const DURATION_OPTIONS = [
  { value: '4_weeks',  label: '4 weeks' },
  { value: '6_weeks',  label: '6 weeks' },
  { value: '1_year',   label: '1 year' },
];

const WORK_TYPE_OPTIONS = [
  { value: 'full_time',  label: 'Full time' },
  { value: 'part_time',  label: 'Part time' },
];

const TYPE_CONFIG = {
  full_time:   { bg: '#E6FAF8', color: '#0F6E56', label: 'Full time' },
  part_time:   { bg: '#FEF3C7', color: '#854F0B', label: 'Part time' },
  contract:    { bg: '#F5F3FF', color: '#534AB7', label: 'Contract' },
  remote:      { bg: '#E8F5EE', color: '#3B6D11', label: 'Remote' },
  internship:  { bg: '#E6FAF8', color: '#0D9488', label: 'Internship' },
};

function typeCfg(type) {
  return TYPE_CONFIG[type] || { bg: '#F1F5F9', color: '#64748B', label: 'Job' };
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
      <style>{`@keyframes cSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E4E2DC', borderTopColor: '#0D9488', animation: 'cSpin 0.7s linear infinite' }} />
    </div>
  );
}

// ─── Filter pill ─────────────────────────────────────────────────────────────

const Pill = React.forwardRef(function Pill({ label, active, hasDropdown = false, onClick, style = {} }, ref) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '6px 12px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        border: active ? 'none' : '1px solid #E4E2DC',
        background: active ? '#0D9488' : '#F6F8FA',
        color: active ? '#fff' : '#4B5563',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: "'DM Sans', sans-serif",
        whiteSpace: 'nowrap',
        ...style,
      }}
      ref={ref}
    >
      {label}
      {hasDropdown && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </button>
  );
});

// ─── Dropdown menu ────────────────────────────────────────────────────────────

function DropdownMenu({ options, selected, onSelect, onClose, anchorRef }) {
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 160 });

  useEffect(() => {
    // Calculate position from anchor
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top:   rect.bottom + 4,
        left:  rect.left,
        width: Math.max(rect.width, 160),
      });
    }
    // Close on outside tap — delayed so the open-click doesn't immediately close it
    const timer = setTimeout(() => {
      function handleOutside(e) {
        if (anchorRef?.current && !anchorRef.current.contains(e.target)) onClose();
      }
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
      return () => {
        document.removeEventListener('mousedown', handleOutside);
        document.removeEventListener('touchstart', handleOutside);
      };
    }, 50);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Portal renders directly into document.body — escapes ALL overflow/zIndex stacking
  return React.createPortal(
    <div
      style={{
        position:     'fixed',
        top:          pos.top,
        left:         pos.left,
        minWidth:     pos.width,
        background:   '#fff',
        border:       '1px solid #E4E2DC',
        borderRadius: 12,
        zIndex:       999999,
        boxShadow:    '0 8px 28px rgba(0,0,0,0.18)',
        overflow:     'hidden',
        fontFamily:   "'DM Sans', sans-serif",
      }}
    >
      {options.map((opt, i) => {
        const isSelected = selected === opt.value;
        return (
          <div
            key={opt.value}
            onMouseDown={e => { e.preventDefault(); onSelect(opt.value); onClose(); }}
            onTouchEnd={e =>  { e.preventDefault(); onSelect(opt.value); onClose(); }}
            style={{
              padding:      '13px 16px',
              fontSize:     13,
              fontWeight:   isSelected ? 700 : 500,
              color:        isSelected ? '#0D9488' : '#374151',
              background:   isSelected ? '#F0FDFB' : '#fff',
              borderBottom: i < options.length - 1 ? '1px solid #F3F2EF' : 'none',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'space-between',
              cursor:       'pointer',
            }}
          >
            {opt.label}
            {isSelected && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        );
      })}
    </div>,
    document.body
  );
}

// ─── Recruiter Avatar ─────────────────────────────────────────────────────────

function RecruiterAvatar({ photoURL, name, size = 36 }) {
  const colors = [
    { bg: '#E1F5EE', color: '#0F6E56' },
    { bg: '#E6F1FB', color: '#185FA5' },
    { bg: '#EEEDFE', color: '#3C3489' },
    { bg: '#FAEEDA', color: '#854F0B' },
    { bg: '#FAECE7', color: '#993C1D' },
  ];
  const c = colors[(name?.charCodeAt(0) || 65) % colors.length];
  const initial = (name || '?').charAt(0).toUpperCase();
  if (photoURL) return <img src={photoURL} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.38), fontWeight: 600, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
      {initial}
    </div>
  );
}

// ─── Company Logo ─────────────────────────────────────────────────────────────

function CompanyLogo({ name, logoURL, size = 42 }) {
  const colors = [
    { bg: '#E6FAF8', color: '#0F6E56' },
    { bg: '#E6F1FB', color: '#185FA5' },
    { bg: '#F5F3FF', color: '#534AB7' },
    { bg: '#FEF3C7', color: '#854F0B' },
    { bg: '#FAECE7', color: '#993C1D' },
  ];
  const c = colors[(name?.charCodeAt(0) || 65) % colors.length];
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (logoURL) return <img src={logoURL} alt={name} style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
      {initials}
    </div>
  );
}

// ─── Internship Card ─────────────────────────────────────────────────────────

function InternshipCard({ item, onPress }) {
  return (
    <div onClick={onPress} style={cs.card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <CompanyLogo name={item.company} logoURL={item.companyLogo} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={cs.cardRole}>{item.title}</div>
          <div style={cs.cardCompany}>{[item.company, item.location].filter(Boolean).join(' · ')}</div>
        </div>
        <span style={cs.timeAgo}>{timeAgo(item.createdAt)}</span>
      </div>

      <div style={cs.tagRow}>
        {item.isRemote    && <span style={{ ...cs.tag, background: '#E6FAF8', color: '#0F6E56' }}>Remote</span>}
        {item.hasStipend  && <span style={{ ...cs.tag, background: '#FEF3C7', color: '#854F0B' }}>Stipend</span>}
        {item.hasPPO      && <span style={{ ...cs.tag, background: '#F5F3FF', color: '#534AB7' }}>PPO</span>}
        {item.duration    && <span style={{ ...cs.tag, background: '#E6F1FB', color: '#185FA5' }}>{DURATION_OPTIONS.find(d => d.value === item.duration)?.label || item.duration}</span>}
        {item.domain      && <span style={{ ...cs.tag, background: '#F1F5F9', color: '#64748B' }}>{DOMAIN_OPTIONS.find(d => d.value === item.domain)?.label || item.domain}</span>}
      </div>

      <div style={cs.cardFoot}>
        <div>
          <div style={cs.cardPay}>{item.stipendAmount ? `₹${item.stipendAmount}/mo` : 'Unpaid'}</div>
          <div style={cs.cardPaySub}>+ ConnektIn Certificate</div>
        </div>
        <button style={cs.applyBtn} onClick={e => { e.stopPropagation(); onPress(); }}>Apply →</button>
      </div>
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, onPress, isTrial, navigate }) {
  const [saved, setSaved] = useState(false);
  const cfg = typeCfg(job.type);

  return (
    <div onClick={onPress} style={{ ...cs.card, borderLeft: `3px solid ${cfg.color}`, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <RecruiterAvatar photoURL={job.hrPhotoURL} name={job.hrName} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>{job.hrName}</div>
          <div style={{ fontSize: 11, color: '#888' }}>{[job.company, job.location].filter(Boolean).join(' · ')}</div>
        </div>
        <span style={cs.timeAgo}>{timeAgo(job.createdAt)}</span>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1628', marginBottom: 8, lineHeight: 1.3 }}>{job.title}</div>

      <div style={cs.tagRow}>
        <span style={{ ...cs.tag, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
        {job.isRemote   && <span style={{ ...cs.tag, background: '#E6FAF8', color: '#0F6E56' }}>Remote</span>}
        {job.isFresher  && <span style={{ ...cs.tag, background: '#FEF3C7', color: '#854F0B' }}>Fresher OK</span>}
        {job.domain     && <span style={{ ...cs.tag, background: '#F1F5F9', color: '#64748B' }}>{DOMAIN_OPTIONS.find(d => d.value === job.domain)?.label || job.domain}</span>}
      </div>

      {job.salaryRange && <div style={{ fontSize: 13, fontWeight: 600, color: '#057642', marginTop: 6 }}>{job.salaryRange}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F2EF', paddingTop: 10, marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#888' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {job.location || 'Location not specified'}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            style={{ border: `1px solid ${saved ? '#99F6E4' : '#E4E2DC'}`, borderRadius: 16, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', background: saved ? '#E6FAF8' : '#fff' }}
            onClick={e => { e.stopPropagation(); setSaved(p => !p); }}
            title={saved ? 'Saved' : 'Save job'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={saved ? '#0D9488' : 'none'} stroke={saved ? '#0D9488' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button style={cs.applyBtn} onClick={e => { e.stopPropagation(); onPress(); }}>
            {isTrial ? 'View' : 'View & Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 8, background: '#fff', borderRadius: 14, border: '1.5px dashed #E4E2DC', padding: '32px 24px', textAlign: 'center', margin: '0 16px' }}>
      {icon}
      <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 600, color: '#555' }}>{title}</p>
      <p style={{ margin: 0, fontSize: 13, color: '#999', lineHeight: 1.5, maxWidth: 240 }}>{sub}</p>
    </div>
  );
}

// ─── Internships Tab ──────────────────────────────────────────────────────────

function InternshipsPanel({ userData, isTrial, onUpgrade }) {
  const navigate = useNavigate();

  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Filters
  const [filterAll,    setFilterAll]    = useState(true);
  const [filterRemote, setFilterRemote] = useState(false);
  const [filterStipend,setFilterStipend]= useState(false);
  const [filterPPO,    setFilterPPO]    = useState(false);
  const [domain,       setDomain]       = useState('all');
  const [duration,     setDuration]     = useState(null);
  const [durationOpen, setDurationOpen] = useState(false);
  const durationRef = useRef(null);

  useEffect(() => { fetchInternships(); }, []);

  async function fetchInternships() {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'internships'),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
      setItems(list);
    } catch (err) {
      console.error('Internships fetch error:', err);
    }
    setLoading(false);
  }

  function handleFilterToggle(name) {
    if (name === 'all') {
      setFilterAll(true); setFilterRemote(false); setFilterStipend(false); setFilterPPO(false);
      setDuration(null);
      return;
    }
    setFilterAll(false);
    if (name === 'remote')  setFilterRemote(p => !p);
    if (name === 'stipend') setFilterStipend(p => !p);
    if (name === 'ppo')     setFilterPPO(p => !p);
  }

  const filtered = items.filter(item => {
    if (!filterAll) {
      if (filterRemote  && !item.isRemote)   return false;
      if (filterStipend && !item.hasStipend) return false;
      if (filterPPO     && !item.hasPPO)     return false;
    }
    if (duration && item.duration !== duration) return false;
    if (domain !== 'all' && item.domain !== domain) return false;
    return true;
  });

  const anyFilterActive = !filterAll || filterRemote || filterStipend || filterPPO || duration || domain !== 'all';

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Filter bar */}
      <div style={cs.filterBar}>
        <Pill label="All"     active={filterAll && !duration}     onClick={() => handleFilterToggle('all')} />
        <Pill label="Remote"  active={filterRemote}               onClick={() => handleFilterToggle('remote')} />
        <Pill label="Stipend" active={filterStipend}              onClick={() => handleFilterToggle('stipend')} />
        <Pill label="PPO"     active={filterPPO}                  onClick={() => handleFilterToggle('ppo')} />
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Pill
            label={duration ? (DURATION_OPTIONS.find(d => d.value === duration)?.label || 'Duration') : 'Duration'}
            active={!!duration}
            hasDropdown
            onClick={() => setDurationOpen(p => !p)}
            ref={durationRef}
          />
          {durationOpen && (
            <DropdownMenu
              options={DURATION_OPTIONS}
              selected={duration}
              onSelect={val => { setDuration(val); setFilterAll(false); }}
              onClose={() => setDurationOpen(false)}
              anchorRef={durationRef}
            />
          )}
        </div>
      </div>

      {/* Domain bar */}
      <div style={cs.domainBar}>
        {DOMAIN_OPTIONS.map(opt => (
          <Pill
            key={opt.value}
            label={opt.label}
            active={domain === opt.value}
            onClick={() => setDomain(opt.value)}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '10px 0 80px' }}>
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
            title={anyFilterActive ? 'No internships match your filters' : 'No internships yet'}
            sub={anyFilterActive ? 'Try adjusting your filters.' : 'Companies are being onboarded. Check back soon.'}
          />
        ) : (
          filtered.map(item => (
            <InternshipCard
              key={item.id}
              item={item}
              onPress={() => navigate(`/opportunities/internship/${item.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Jobs Panel ───────────────────────────────────────────────────────────────

function JobsPanel({ userData, isTrial, onUpgrade }) {
  const navigate = useNavigate();

  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterAll,     setFilterAll]     = useState(true);
  const [filterRemote,  setFilterRemote]  = useState(false);
  const [filterFresher, setFilterFresher] = useState(false);
  const [domain,        setDomain]        = useState('all');
  const [workType,      setWorkType]      = useState(null);
  const [workTypeOpen,  setWorkTypeOpen]  = useState(false);
  const workTypeRef = useRef(null);

  useEffect(() => { fetchJobs(); }, [userData?.uid]);

  async function fetchJobs() {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'jobs'),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
      setJobs(list);
    } catch (err) {
      console.error('Jobs fetch error:', err);
    }
    setLoading(false);
  }

  function handleFilterToggle(name) {
    if (name === 'all') {
      setFilterAll(true); setFilterRemote(false); setFilterFresher(false);
      setWorkType(null);
      return;
    }
    setFilterAll(false);
    if (name === 'remote')  setFilterRemote(p => !p);
    if (name === 'fresher') setFilterFresher(p => !p);
  }

  const filtered = jobs.filter(job => {
    if (!filterAll) {
      if (filterRemote  && !job.isRemote)   return false;
      if (filterFresher && !job.isFresher)  return false;
    }
    if (workType && job.type !== workType) return false;
    if (domain !== 'all' && job.domain !== domain) return false;
    return true;
  });

  const anyFilterActive = !filterAll || filterRemote || filterFresher || workType || domain !== 'all';

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Filter bar */}
      <div style={cs.filterBar}>
        <Pill label="All"     active={filterAll && !workType}   onClick={() => handleFilterToggle('all')} />
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Pill
            label={workType ? (WORK_TYPE_OPTIONS.find(w => w.value === workType)?.label || 'Work type') : 'Work type'}
            active={!!workType}
            hasDropdown
            onClick={() => setWorkTypeOpen(p => !p)}
            ref={workTypeRef}
          />
          {workTypeOpen && (
            <DropdownMenu
              options={WORK_TYPE_OPTIONS}
              selected={workType}
              onSelect={val => { setWorkType(val); setFilterAll(false); }}
              onClose={() => setWorkTypeOpen(false)}
              anchorRef={workTypeRef}
            />
          )}
        </div>
        <Pill label="Remote"  active={filterRemote}  onClick={() => handleFilterToggle('remote')} />
        <Pill label="Fresher" active={filterFresher} onClick={() => handleFilterToggle('fresher')} />
      </div>

      {/* Domain bar */}
      <div style={cs.domainBar}>
        {DOMAIN_OPTIONS.map(opt => (
          <Pill
            key={opt.value}
            label={opt.label}
            active={domain === opt.value}
            onClick={() => setDomain(opt.value)}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '10px 0 80px' }}>
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
            title={anyFilterActive ? 'No jobs match your filters' : 'No jobs yet'}
            sub={anyFilterActive ? 'Try adjusting your filters.' : 'Recruiters are being onboarded. Check back soon.'}
          />
        ) : (
          filtered.map(job => (
            <JobCard
              key={job.id}
              job={job}
              isTrial={isTrial}
              navigate={navigate}
              onPress={() => navigate(`/opportunities/job/${job.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main OpportunitiesTab ────────────────────────────────────────────────────

export default function OpportunitiesTab({ userData, isTrial, onUpgrade }) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('internships');

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#F6F8FA' }}>

      {/* Sticky header */}
      <div style={cs.stickyHeader}>
        <div style={cs.pageTitle}>Opportunities</div>
        <div style={cs.tabRow}>
          <button
            style={{ ...cs.tabBtn, ...(activeTab === 'internships' ? cs.tabBtnActive : {}) }}
            onClick={() => setActiveTab('internships')}
          >
            Internships
          </button>
          <button
            style={{ ...cs.tabBtn, ...(activeTab === 'jobs' ? cs.tabBtnActive : {}) }}
            onClick={() => setActiveTab('jobs')}
          >
            Jobs
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'internships' ? (
        <InternshipsPanel userData={userData} isTrial={isTrial} onUpgrade={onUpgrade} />
      ) : (
        <JobsPanel userData={userData} isTrial={isTrial} onUpgrade={onUpgrade} />
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cs = {
  stickyHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    background: '#fff',
    borderBottom: '1px solid #E4E2DC',
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: '#0A1628',
    padding: '14px 16px 8px',
    fontFamily: "'DM Sans', sans-serif",
  },
  tabRow: {
    display: 'flex',
    padding: '0 16px',
    borderBottom: '2px solid #F0F2F5',
  },
  tabBtn: {
    flex: 1,
    padding: '11px 0',
    fontSize: 13,
    fontWeight: 700,
    border: 'none',
    borderBottom: '3px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    color: '#9CA3AF',
    marginBottom: '-2px',
    transition: 'color 0.15s, border-color 0.15s',
    letterSpacing: '0.01em',
  },
  tabBtnActive: {
    color: '#0D9488',
    borderBottomColor: '#0D9488',
    fontWeight: 800,
  },
  filterBar: {
    display: 'flex',
    gap: 7,
    padding: '10px 16px 8px',
    overflowX: 'auto',
    background: '#fff',
    borderBottom: '1px solid #F3F2EF',
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
  },
  domainBar: {
    display: 'flex',
    gap: 7,
    padding: '8px 16px 10px',
    overflowX: 'auto',
    background: '#fff',
    borderBottom: '1px solid #E4E2DC',
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #E8EAF0',
    margin: '0 14px 10px',
    padding: 14,
    cursor: 'pointer',
  },
  cardRole: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0A1628',
    lineHeight: 1.2,
  },
  cardCompany: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  tagRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
  },
  cardFoot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid #F3F2EF',
  },
  cardPay: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0A1628',
  },
  cardPaySub: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  applyBtn: {
    background: '#0D9488',
    color: '#fff',
    border: 'none',
    borderRadius: 20,
    padding: '7px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  timeAgo: {
    fontSize: 11,
    color: '#9CA3AF',
    flexShrink: 0,
  },
};
