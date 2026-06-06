// src/pages/InvitePage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

const T = {
  navy:   '#0A1628',
  teal:   '#0D9488',
  purple: '#534AB7',
  white:  '#FFFFFF',
  border: '#E4E2DC',
  text:   '#0A1628',
  muted:  '#444441',
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

function CompanyLogo({ company, size = 44 }) {
  const p = PALETTES[(company.name?.charCodeAt(0) || 65) % PALETTES.length];
  const initials = (company.name || 'C').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (company.logoURL) return (
    <img src={company.logoURL} alt={company.name}
      style={{ width: size, height: size, borderRadius: 10, objectFit: 'contain', flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: p.bg, color: p.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.3), fontWeight: 800, flexShrink: 0, fontFamily: T.font }}>
      {initials}
    </div>
  );
}

// ── Step 1 — Verifying ────────────────────────────────────────────────────────
function VerifyingStep() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#E1F5EE',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F6E56"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8, fontFamily: T.font }}>
        Verifying your invite
      </div>
      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, fontFamily: T.font }}>
        Please wait while we confirm your invite link…
      </div>
    </div>
  );
}

// ── Step 2 — Invalid token ────────────────────────────────────────────────────
function InvalidStep() {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#FEE2E2',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#991B1B"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8, fontFamily: T.font }}>
        Invalid invite link
      </div>
      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 24, fontFamily: T.font }}>
        This invite link is invalid or has already been used. Please contact your ConnektIn admin for a new link.
      </div>
      <button onClick={() => navigate('/')}
        style={{ padding: '12px 28px', background: T.navy, color: T.white, border: 'none',
          borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}>
        Back to home
      </button>
    </div>
  );
}

// ── Step 3 — Set password ─────────────────────────────────────────────────────
function SetPasswordStep({ company, onActivate, loading, error }) {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [localError, setLocalError] = useState('');

  function handleSubmit() {
    if (password.length < 8) { setLocalError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setLocalError('Passwords do not match.'); return; }
    setLocalError('');
    onActivate(password);
  }

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: `1.5px solid ${T.border}`, fontSize: 14, fontFamily: T.font,
    outline: 'none', background: T.white, color: '#000000',
    boxSizing: 'border-box', display: 'block', marginBottom: 12,
  };
  const lbl = { fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 5, fontFamily: T.font };

  return (
    <>
      {/* Company badge */}
      <div style={{ background: '#EEEDFE', borderRadius: 14, padding: '14px', display: 'flex',
        alignItems: 'center', gap: 12, marginBottom: 22, border: '1.5px solid #AFA9EC' }}>
        <CompanyLogo company={company} size={46} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#26215C', fontFamily: T.font }}>
            {company.name}
          </div>
          <div style={{ fontSize: 11, color: '#534AB7', display: 'flex', alignItems: 'center',
            gap: 4, marginTop: 3, fontFamily: T.font }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#534AB7"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 4.8 5.6.8-4 4 .9 5.4L12 14.5l-5 2.5.9-5.4-4-4 5.6-.8z"/>
            </svg>
            ConnektIn Verified
          </div>
        </div>
      </div>

      <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 6, fontFamily: T.font }}>
        Welcome aboard!
      </div>
      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 22, fontFamily: T.font }}>
        You've been invited to join ConnektIn. Set a password to activate your company account.
      </div>

      {(error || localError) && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 10, padding: '10px 14px',
          fontSize: 13, marginBottom: 14, fontFamily: T.font }}>
          {error || localError}
        </div>
      )}

      <label style={lbl}>Email</label>
      <div style={{ ...inp, background: '#F6F8FA', color: T.muted, cursor: 'default' }}>
        {company.email}
      </div>

      <label style={lbl}>Password</label>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input
          type={showPw ? 'text' : 'password'}
          placeholder="Min 8 characters"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ ...inp, marginBottom: 0, paddingRight: 44 }}
        />
        <button onClick={() => setShowPw(!showPw)}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: T.faint, fontSize: 14 }}>
          {showPw ? '🙈' : '👁'}
        </button>
      </div>

      <label style={lbl}>Confirm password</label>
      <input
        type="password"
        placeholder="Repeat password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        style={inp}
      />

      <button onClick={handleSubmit} disabled={loading}
        style={{ width: '100%', padding: 14, background: loading ? '#94A3B8' : T.purple,
          color: T.white, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: T.font, marginTop: 4 }}>
        {loading ? 'Activating…' : 'Activate account'}
      </button>
    </>
  );
}

// ── Step 4 — Success ──────────────────────────────────────────────────────────
function SuccessStep({ company, onContinue }) {
  const FEATURES = [
    { bg: '#EEEDFE', color: '#3C3489', icon: '💼', title: 'Post jobs & internships', sub: 'Reach thousands of seekers on ConnektIn' },
    { bg: '#E1F5EE', color: '#085041', icon: '👥', title: 'Review applicants',        sub: 'Shortlist and connect with talent' },
    { bg: '#FAEEDA', color: '#633806', icon: '🏢', title: 'Build your company profile', sub: 'Showcase your brand to seekers' },
  ];

  return (
    <>
      <div style={{ textAlign: 'center', padding: '8px 0 22px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E1F5EE',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0F6E56"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 8, fontFamily: T.font }}>
          Account activated!
        </div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, fontFamily: T.font }}>
          Welcome to ConnektIn, <strong style={{ color: T.text }}>{company.name}</strong>.
          Your company dashboard is ready.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
        {FEATURES.map(f => (
          <div key={f.title} style={{ background: '#F6F8FA', borderRadius: 12,
            border: `0.5px solid ${T.border}`, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: f.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 17 }}>
              {f.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>{f.title}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2, fontFamily: T.font }}>{f.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onContinue}
        style={{ width: '100%', padding: 14, background: T.teal, color: T.white, border: 'none',
          borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}>
        Go to my dashboard →
      </button>
    </>
  );
}

// ── Main InvitePage ───────────────────────────────────────────────────────────
export default function InvitePage() {
  const { token }                   = useParams();
  const navigate                    = useNavigate();
  const [step, setStep]             = useState('verifying'); // verifying | invalid | set-password | success
  const [company, setCompany]       = useState(null);
  const [companyDocId, setCompanyDocId] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  // Verify token on mount
  useEffect(() => {
    async function verify() {
      try {
        const q = query(collection(db, 'companies'), where('inviteToken', '==', token));
        const snap = await getDocs(q);
        if (snap.empty) { setStep('invalid'); return; }
        const docSnap = snap.docs[0];
        const data = { id: docSnap.id, ...docSnap.data() };
        // If already active — they already registered, send to login
        if (data.status === 'active' && data.authUid) {
          navigate('/login');
          return;
        }
        setCompany(data);
        setCompanyDocId(docSnap.id);
        setStep('set-password');
      } catch (err) {
        console.error('Token verify error:', err);
        setStep('invalid');
      }
    }
    if (token) verify();
    else setStep('invalid');
  }, [token, navigate]);

  async function handleActivate(password) {
    setLoading(true);
    setError('');
    try {
      // 1. Create Firebase Auth account
      const userCred = await createUserWithEmailAndPassword(auth, company.email, password);
      const uid = userCred.user.uid;

      // 2. Update display name
      await updateProfile(userCred.user, { displayName: company.name });

      // 3. Create user doc in Firestore
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', uid), {
        uid,
        displayName: company.name,
        email:       company.email,
        userType:    'company',
        companyId:   companyDocId,
        plan:        'company',
        createdAt:   serverTimestamp(),
      });

      // 4. Update company doc — set active, store authUid
      await updateDoc(doc(db, 'companies', companyDocId), {
        status:    'active',
        authUid:   uid,
        activatedAt: serverTimestamp(),
      });

      setStep('success');
    } catch (err) {
      console.error('Activate error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please contact your admin.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    navigate('/company/dashboard');
  }

  const wrap = {
    minHeight: '100vh', background: '#F3F2EF',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 16, fontFamily: T.font,
  };

  const card = {
    background: T.white, borderRadius: 20, padding: '28px 24px',
    maxWidth: 460, width: '100%',
    boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
    border: `0.5px solid ${T.border}`,
  };

  return (
    <div style={wrap}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.teal,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: T.white, fontFamily: T.font }}>C</div>
        <span style={{ fontSize: 17, fontWeight: 800, color: T.teal, fontFamily: T.font }}>ConnektIn</span>
      </div>

      <div style={card}>
        {step === 'verifying'    && <VerifyingStep />}
        {step === 'invalid'      && <InvalidStep />}
        {step === 'set-password' && company && (
          <SetPasswordStep
            company={company}
            onActivate={handleActivate}
            loading={loading}
            error={error}
          />
        )}
        {step === 'success' && company && (
          <SuccessStep company={company} onContinue={handleContinue} />
        )}
      </div>
    </div>
  );
}
