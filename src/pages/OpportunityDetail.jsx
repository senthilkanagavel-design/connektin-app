// src/pages/OpportunityDetail.jsx
// Handles both internship and job detail pages.
// Route: /opportunities/:type/:id  (type = "internship" | "job")

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

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

function CompanyLogo({ name, logoURL, size = 48 }) {
  const palettes = [
    { bg: '#E6FAF8', color: '#0F6E56' },
    { bg: '#E6F1FB', color: '#185FA5' },
    { bg: '#F5F3FF', color: '#534AB7' },
    { bg: '#FEF3C7', color: '#854F0B' },
    { bg: '#FAECE7', color: '#993C1D' },
  ];
  const p = palettes[(name?.charCodeAt(0) || 65) % palettes.length];
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (logoURL) {
    return (
      <img
        src={logoURL}
        alt={name}
        style={{ width: size, height: size, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 12,
      background: p.bg, color: p.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.3), fontWeight: 800, flexShrink: 0,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {initials}
    </div>
  );
}

function Spinner({ size = 28 }) {
  return (
    <>
      <style>{`@keyframes oSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: `3px solid #E4E2DC`, borderTopColor: '#0D9488',
        animation: 'oSpin 0.7s linear infinite', flexShrink: 0,
      }} />
    </>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
    error:   { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
    info:    { bg: '#E6FAF8', color: '#0D9488', border: '#99F6E4' },
  };
  const c = colors[type] || colors.info;

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: '10px 18px', fontSize: 13, fontWeight: 600,
      fontFamily: "'DM Sans', sans-serif", zIndex: 999, whiteSpace: 'nowrap',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      {message}
    </div>
  );
}

// ─── Skill Qualifier ─────────────────────────────────────────────────────────

function SkillQualifier({ skills = [], skillStates, setSkillStates }) {
  const [activeSkill, setActiveSkill] = useState(null);

  const yesCount = skills.filter(s => skillStates[s] === 'yes').length;
  const answered = skills.filter(s => skillStates[s]).length;
  const pct = skills.length > 0 ? Math.round((yesCount / skills.length) * 100) : 0;

  function handleAnswer(val) {
    setSkillStates(prev => ({ ...prev, [activeSkill]: val }));
    setActiveSkill(null);
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {skills.map(skill => {
          const st = skillStates[skill];
          return (
            <button
              key={skill}
              onClick={() => setActiveSkill(skill)}
              style={{
                padding: '6px 12px',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.15s',
                border: st === 'yes'
                  ? '1.5px solid #6EE7B7'
                  : st === 'no'
                  ? '1.5px solid #CBD5E1'
                  : '1.5px solid #E2E8F0',
                background: st === 'yes' ? '#D1FAE5' : '#F1F5F9',
                color: st === 'yes' ? '#065F46' : st === 'no' ? '#94A3B8' : '#334155',
              }}
            >
              {st === 'yes' && '✓ '}
              {st === 'no'  && '✕ '}
              {skill}
            </button>
          );
        })}
      </div>

      {answered === 0 && (
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: '8px 0 0', fontStyle: 'italic' }}>
          Tap any skill to mark if you have it
        </p>
      )}

      {answered > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 10, padding: '8px 10px',
          background: '#F6F8FA', borderRadius: 8, border: '1px solid #E8EAF0',
        }}>
          <span style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>Skills matched</span>
          <div style={{ flex: 1, height: 5, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#0D9488', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0D9488', minWidth: 30, textAlign: 'right' }}>
            {yesCount}/{skills.length}
          </span>
        </div>
      )}

      {/* Bottom sheet overlay */}
      {activeSkill && (
        <div
          onClick={() => setActiveSkill(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(10,22,40,0.55)',
            zIndex: 50,
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '18px 18px 0 0',
              padding: '16px 20px 36px',
              width: '100%',
              maxWidth: 480,
              margin: '0 auto',
            }}
          >
            <div style={{ width: 32, height: 3, background: '#CBD5E1', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1628', marginBottom: 4 }}>
              {activeSkill}
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>
              Do you have experience with this skill?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleAnswer('yes')}
                style={{
                  flex: 1, padding: '13px 0',
                  background: '#0A1628', color: '#ffffff',
                  border: 'none', borderRadius: 12,
                  fontSize: 14, fontWeight: 800,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                ✓ &nbsp;Yes, I do
              </button>
              <button
                onClick={() => handleAnswer('no')}
                style={{
                  flex: 1, padding: '13px 0',
                  background: '#F1F5F9', color: '#334155',
                  border: '1.5px solid #CBD5E1', borderRadius: 12,
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                ✕ &nbsp;Not yet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Resume Upload ────────────────────────────────────────────────────────────

function ResumeUpload({ resumeFile, setResumeFile, uploadProgress }) {
  const inputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5MB.');
      return;
    }
    setResumeFile(file);
  }

  if (resumeFile) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#D1FAE5', border: '1.5px solid #6EE7B7',
        borderRadius: 10, padding: '10px 12px', marginBottom: 10,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {resumeFile.name}
          </div>
          <div style={{ fontSize: 10, color: '#0F6E56', marginTop: 1 }}>
            {uploadProgress > 0 && uploadProgress < 100
              ? `Uploading... ${uploadProgress}%`
              : `${(resumeFile.size / 1024).toFixed(0)} KB`}
          </div>
        </div>
        {uploadProgress === 0 && (
          <button
            onClick={() => setResumeFile(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#065F46' }}
            aria-label="Remove file"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: '1.5px dashed #0D9488',
          borderRadius: 10, padding: 16,
          textAlign: 'center', background: '#F0FDFB',
          cursor: 'pointer', marginBottom: 10,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 4px', display: 'block' }}>
          <polyline points="16 16 12 12 8 16"/>
          <line x1="12" y1="12" x2="12" y2="21"/>
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
        </svg>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#0D9488' }}>Upload your resume</div>
        <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>PDF only · Max 5MB</div>
      </div>
    </>
  );
}

// ─── Meta Item ────────────────────────────────────────────────────────────────

function MetaItem({ icon, label }) {
  if (!label) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: '#F6F8FA', borderRadius: 7, padding: '6px 9px',
    }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function CompRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: '1px solid #F3F2EF',
    }}>
      <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#0A1628' }}>{value}</span>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function OpportunityDetail() {
  const { type, id } = useParams(); // type = "internship" | "job"
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [item,           setItem]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [applying,       setApplying]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resumeFile,     setResumeFile]     = useState(null);
  const [coverNote,      setCoverNote]      = useState('');
  const [skillStates,    setSkillStates]    = useState({});
  const [saved,          setSaved]          = useState(false);
  const [toast,          setToast]          = useState(null);

  const isInternship = type === 'internship';
  const collection_name = isInternship ? 'internships' : 'jobs';

  function showToast(message, toastType = 'info') {
    setToast({ message, type: toastType });
  }

  // ── Fetch item ──
  useEffect(() => {
    async function fetchItem() {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, collection_name, id));
        if (snap.exists()) {
          setItem({ id: snap.id, ...snap.data() });
        } else {
          showToast('Not found.', 'error');
          setTimeout(() => navigate('/dashboard', { state: { tab: 'opportunities' } }), 1500);
        }
      } catch (err) {
        console.error('OpportunityDetail fetch error:', err);
        showToast('Failed to load.', 'error');
      }
      setLoading(false);
    }
    fetchItem();
  }, [id, collection_name]);

  // ── Check already applied ──
  useEffect(() => {
    async function checkApplied() {
      if (!user?.uid || !id) return;
      try {
        const q = query(
          collection(db, 'applications'),
          where('applicantUid', '==', user.uid),
          where('itemId', '==', id)
        );
        const snap = await getDocs(q);
        if (!snap.empty) setAlreadyApplied(true);
      } catch (err) {
        console.error('Check applied error:', err);
      }
    }
    checkApplied();
  }, [user?.uid, id]);

  // ── Upload resume to Firebase Storage ──
  async function uploadResume() {
    if (!resumeFile) return null;
    const path = `resumes/${user.uid}/${id}_${Date.now()}.pdf`;
    const storageRef = ref(storage, path);
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, resumeFile);
      task.on(
        'state_changed',
        snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        err => reject(err),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        }
      );
    });
  }

  // ── Apply ──
  async function handleApply() {
    if (!resumeFile) {
      showToast('Please upload your resume first.', 'error');
      return;
    }
    setApplying(true);
    try {
      const resumeURL = await uploadResume();
      await addDoc(collection(db, 'applications'), {
        itemId:        id,
        itemType:      type,
        itemTitle:     item?.title || '',
        company:       item?.company || '',
        applicantUid:  user.uid,
        applicantName: profile?.displayName || '',
        applicantEmail:user.email || '',
        resumeURL,
        coverNote:     coverNote.trim(),
        skillStates,
        status:        'pending',
        appliedAt:     serverTimestamp(),
      });
      setAlreadyApplied(true);
      showToast('Application submitted!', 'success');
    } catch (err) {
      console.error('Apply error:', err);
      showToast('Something went wrong. Please try again.', 'error');
    }
    setApplying(false);
  }

  // ─── Loading ──
  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F8FA' }}>
        <Spinner size={36} />
      </div>
    );
  }

  if (!item) return null;

  const skills = item.skills || [];

  return (
    <div style={{ minHeight: '100dvh', background: '#F6F8FA', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#0A1628', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, color: '#fff', fontSize: 18,
          }}
          aria-label="Go back"
        >
          ‹
        </button>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#fff' }}>
          {isInternship ? 'Internship detail' : 'Job detail'}
        </span>
        <button
          onClick={() => setSaved(p => !p)}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: saved ? 'rgba(13,148,136,0.25)' : 'rgba(255,255,255,0.08)',
            border: 'none', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? '#5EEAD4' : 'none'} stroke={saved ? '#5EEAD4' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>

      <div style={{ paddingBottom: 24 }}>

        {/* Hero */}
        <div style={{ background: '#fff', padding: '16px 16px 14px', borderBottom: '1px solid #E8EAF0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <CompanyLogo name={item.company} logoURL={item.companyLogo} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0A1628', lineHeight: 1.2, marginBottom: 3 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                {[item.company, item.location].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            {item.location   && <MetaItem icon="📍" label={item.location} />}
            {isInternship
              ? item.duration && <MetaItem icon="🕐" label={item.duration.replace(/_/g, ' ')} />
              : item.type     && <MetaItem icon="💼" label={item.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
            }
            {isInternship
              ? item.stipendAmount
                  ? <MetaItem icon="💰" label={`₹${item.stipendAmount}/mo`} />
                  : <MetaItem icon="💰" label="Unpaid" />
              : item.salaryRange && <MetaItem icon="💰" label={item.salaryRange} />
            }
            {isInternship
              ? <MetaItem icon="🎓" label={item.educationReq || 'Any degree'} />
              : <MetaItem icon="📈" label={item.experience  || 'Fresher / 0–1 yr'} />
            }
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {item.isRemote   && <span style={cs.badge('#E6FAF8', '#0F6E56')}>Remote</span>}
            {isInternship && item.hasPPO && <span style={cs.badge('#F5F3FF', '#534AB7')}>PPO available</span>}
            {isInternship && item.hasStipend && <span style={cs.badge('#FEF3C7', '#854F0B')}>Stipend</span>}
            {!isInternship && item.isFresher && <span style={cs.badge('#FEF3C7', '#854F0B')}>Fresher OK</span>}
            {item.startDate && <span style={cs.badge('#E6F1FB', '#185FA5')}>Starts {item.startDate}</span>}
            {item.deadline  && <span style={cs.badge('#FEE2E2', '#991B1B')}>Apply by {item.deadline}</span>}
          </div>

          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
            Posted {timeAgo(item.createdAt)}
          </div>
        </div>

        {/* About */}
        {item.description && (
          <div style={cs.section}>
            <div style={cs.sectionTitle}>About the role</div>
            <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.7, margin: 0 }}>
              {item.description}
            </p>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div style={cs.section}>
            <div style={cs.sectionTitle}>Skills required</div>
            <SkillQualifier
              skills={skills}
              skillStates={skillStates}
              setSkillStates={setSkillStates}
            />
          </div>
        )}

        {/* Compensation & details */}
        <div style={cs.section}>
          <div style={cs.sectionTitle}>Compensation & details</div>
          <div>
            {isInternship ? (
              <>
                <CompRow label="Stipend"    value={item.stipendAmount ? `₹${item.stipendAmount} / month` : 'Unpaid'} />
                <CompRow label="Duration"   value={item.duration?.replace(/_/g, ' ')} />
                <CompRow label="Start date" value={item.startDate} />
                <CompRow label="Work mode"  value={item.workMode || (item.isRemote ? 'Remote' : 'On-site')} />
                <CompRow label="PPO"        value={item.hasPPO ? 'Available' : 'Not offered'} />
              </>
            ) : (
              <>
                <CompRow label="Salary"         value={item.salaryRange} />
                <CompRow label="Employment"     value={item.type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
                <CompRow label="Experience"     value={item.experience} />
                <CompRow label="Work mode"      value={item.workMode || (item.isRemote ? 'Remote' : 'On-site')} />
                <CompRow label="Notice period"  value={item.noticePeriod} />
              </>
            )}
          </div>

          {/* Certificate badge — internship only */}
          {isInternship && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#F0FDFB', border: '1px solid rgba(13,148,136,0.25)',
              borderRadius: 9, padding: '9px 11px', marginTop: 10,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>
                ConnektIn certificate issued on successful completion
              </span>
            </div>
          )}
        </div>

        {/* Apply section */}
        <div style={cs.section}>
          <div style={cs.sectionTitle}>Apply now</div>

          {alreadyApplied ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#D1FAE5', border: '1px solid #6EE7B7',
              borderRadius: 12, padding: 14,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>
                Application submitted
              </span>
            </div>
          ) : (
            <>
              <ResumeUpload
                resumeFile={resumeFile}
                setResumeFile={setResumeFile}
                uploadProgress={uploadProgress}
              />
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0A1628', marginBottom: 5 }}>
                Cover note{' '}
                <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span>
              </div>
              <textarea
                value={coverNote}
                onChange={e => setCoverNote(e.target.value)}
                placeholder="Tell them why you're a great fit..."
                rows={3}
                style={{
                  width: '100%', border: '1px solid #E4E2DC', borderRadius: 8,
                  padding: '8px 10px', fontSize: 12, color: '#4B5563',
                  fontFamily: "'DM Sans', sans-serif", resize: 'none',
                  background: '#fff', outline: 'none',
                }}
              />
              <button
                onClick={handleApply}
                disabled={applying}
                style={{
                  width: '100%', padding: 13,
                  background: applying ? '#6B7280' : '#0D9488',
                  color: '#fff', border: 'none', borderRadius: 12,
                  fontSize: 14, fontWeight: 800, cursor: applying ? 'not-allowed' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif", marginTop: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {applying ? <><Spinner size={16} /> Submitting...</> : 'Apply now'}
              </button>
            </>
          )}
        </div>

      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

// ─── Styles helpers ────────────────────────────────────────────────────────────

const cs = {
  section: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #E8EAF0',
    margin: '10px 14px 0',
    padding: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0A1628',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 10,
  },
  badge: (bg, color) => ({
    padding: '3px 9px',
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    background: bg,
    color,
  }),
};
