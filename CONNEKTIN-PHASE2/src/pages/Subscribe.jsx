// src/pages/Subscribe.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const QFIX_URL = 'https://form.qfixonline.com/thereduform';

async function validateReferralCode(code) {
  try {
    const snap = await getDoc(doc(db, 'referralCodes', code.toUpperCase()));
    if (!snap.exists()) return { valid: false, error: 'Code not found.' };
    const data = snap.data();
    if (!data.active) return { valid: false, error: 'This code is no longer active.' };
    if (data.expiresAt && data.expiresAt.toDate() < new Date())
      return { valid: false, error: 'This code has expired.' };
    return { valid: true, price: data.price, label: data.label || 'Thermite' };
  } catch {
    return { valid: false, error: 'Could not validate code. Try again.' };
  }
}

export default function Subscribe() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // step: 'plans' | 'enter' | 'valid' | 'pending'
  const [step, setStep] = useState('plans');
  const [billing, setBilling] = useState('monthly');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [validating, setValidating] = useState(false);
  const [referral, setReferral] = useState(null);

  async function handleValidateCode() {
    if (!codeInput.trim()) { setCodeError('Please enter your referral code.'); return; }
    setValidating(true); setCodeError('');
    const result = await validateReferralCode(codeInput.trim());
    setValidating(false);
    if (!result.valid) { setCodeError(result.error); return; }
    setReferral({ price: result.price, label: result.label });
    setStep('valid');
  }

  function handleSubscribeNow() {
    const firebaseUser = auth.currentUser || user;
    if (!firebaseUser) { navigate('/login'); return; }
    updateDoc(doc(db, 'users', firebaseUser.uid), {
      subscriptionPending: true,
      subscriptionPendingAt: serverTimestamp(),
      pendingPlan: 'thermite',
      referralCodeUsed: codeInput.toUpperCase(),
    }).catch(() => {});
    window.open(QFIX_URL, '_blank');
    setStep('pending');
  }

  // ── Step: Plans overview ──────────────────────────────────────────────────
  if (step === 'plans') {
    return (
      <div style={s.container}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={() => navigate('/dashboard', { state: { tab: 'home' } })}>← Back</button>
          <h1 style={s.title}>Upgrade Your Plan</h1>
          <p style={s.subtitle}>Unlock full access to articles, jobs & community</p>
        </div>

        <div style={s.billingToggleWrap}>
          <div style={s.billingToggle}>
            <button style={{ ...s.toggleBtn, ...(billing === 'monthly' ? s.toggleBtnActive : {}) }} onClick={() => setBilling('monthly')}>Monthly</button>
            <button style={{ ...s.toggleBtn, ...(billing === 'quarterly' ? s.toggleBtnActive : {}) }} onClick={() => setBilling('quarterly')}>
              Quarterly <span style={s.saveBadge}>Save 10%</span>
            </button>
          </div>
        </div>

        <div style={s.cardsContainer}>
          {/* Regular Plan */}
          <div style={s.card}>
            <div style={s.recommendedBadge}>Most Popular</div>
            <div style={s.cardTop}>
              <div style={{ ...s.radio, borderColor: '#0EA5E9', backgroundColor: '#0EA5E9' }}>
                <div style={s.radioDot} />
              </div>
              <div style={s.cardInfo}>
                <span style={{ ...s.planBadge, backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>Open to All</span>
                <h2 style={{ ...s.planName, color: '#0EA5E9' }}>Regular Plan</h2>
                <div style={s.priceRow}>
                  <span style={{ ...s.priceSymbol, color: '#0EA5E9' }}>₹</span>
                  <span style={{ ...s.price, color: '#0EA5E9' }}>{billing === 'monthly' ? 69 : 207}</span>
                  <span style={s.period}>/{billing === 'monthly' ? 'month' : 'quarter'}</span>
                </div>
                {billing === 'quarterly' && <p style={s.perMonthNote}>₹69/month · billed quarterly</p>}
              </div>
            </div>
            <ul style={s.featureList}>
              {['Full access to all articles', 'Beginner, Mid & Advanced levels', 'Industry-filtered job listings', 'Post, comment & engage with community', 'Profile & portfolio tools', 'Learning progress tracker'].map(f => (
                <li key={f} style={s.featureItem}><span style={{ ...s.checkIcon, color: '#0EA5E9' }}>✓</span><span style={s.featureText}>{f}</span></li>
              ))}
            </ul>
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#F0F9FF', borderRadius: 10, border: '1px solid #7DD3FC' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#0369A1', fontFamily: "'DM Sans', sans-serif" }}>
                🚀 Online payment for Regular Plan coming soon. <span style={{ fontWeight: 700 }}>Have a referral code?</span> Use it below to get the Thermite rate now.
              </p>
            </div>
          </div>
        </div>

        {/* Have a referral code CTA */}
        <div style={s.ctaContainer}>
          <button style={s.codeBtn} onClick={() => setStep('enter')}>
            🎟 I have a referral code
          </button>
          <p style={s.secureNote}>Referral codes unlock the Thermite plan at ₹49</p>
          <p style={s.skipLink} onClick={() => navigate('/dashboard')}>Continue with free trial</p>
        </div>
      </div>
    );
  }

  // ── Step: Enter referral code ─────────────────────────────────────────────
  if (step === 'enter') {
    return (
      <div style={s.container}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={() => setStep('plans')}>← Back</button>
          <h1 style={s.title}>Enter Referral Code</h1>
          <p style={s.subtitle}>Shared by your trainer or coordinator</p>
        </div>

        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            value={codeInput}
            onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(''); }}
            placeholder="e.g. R9A4Q7KX"
            style={s.codeInput}
            onKeyDown={e => e.key === 'Enter' && handleValidateCode()}
            autoFocus
          />
          {codeError && <p style={s.codeError}>⚠ {codeError}</p>}
          <button
            style={{ ...s.subscribeBtn, backgroundColor: validating ? '#94A3B8' : '#0D9488', opacity: validating ? 0.8 : 1 }}
            onClick={handleValidateCode}
            disabled={validating}
          >
            {validating ? 'Checking…' : 'Apply Code →'}
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Valid code — show Thermite plan ─────────────────────────────────
  if (step === 'valid' && referral) {
    return (
      <div style={s.container}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={() => setStep('enter')}>← Back</button>
          <h1 style={s.title}>Thermite Plan</h1>
          <p style={s.subtitle}>Your exclusive rate is unlocked 🎉</p>
        </div>

        <div style={s.cardsContainer}>
          <div style={{ ...s.card, backgroundColor: '#F0FDF4', borderColor: '#16A34A', borderWidth: 2 }}>
            <div style={{ ...s.recommendedBadge, backgroundColor: '#16A34A' }}>Your Exclusive Rate</div>
            <div style={s.cardTop}>
              <div style={{ ...s.radio, borderColor: '#16A34A', backgroundColor: '#16A34A' }}>
                <div style={s.radioDot} />
              </div>
              <div style={s.cardInfo}>
                <span style={{ ...s.planBadge, backgroundColor: '#DCFCE7', color: '#166534' }}>For TherMite Students</span>
                <h2 style={{ ...s.planName, color: '#16A34A' }}>Thermite Plan</h2>
                <div style={s.priceRow}>
                  <span style={{ ...s.priceSymbol, color: '#16A34A' }}>₹</span>
                  <span style={{ ...s.price, color: '#16A34A' }}>{referral.price}</span>
                  <span style={s.period}>/month</span>
                </div>
              </div>
            </div>
            <ul style={s.featureList}>
              {['Everything in Free Trial', 'Like, comment & follow', 'Apply to jobs', 'All articles — beginner to advanced', 'E-Certificate every 90 days', 'Industry community access'].map(f => (
                <li key={f} style={s.featureItem}><span style={{ ...s.checkIcon, color: '#16A34A' }}>✓</span><span style={s.featureText}>{f}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <div style={s.ctaContainer}>
          <button style={{ ...s.subscribeBtn, backgroundColor: '#0D9488' }} onClick={handleSubscribeNow}>
            Subscribe Now — ₹{referral.price} →
          </button>
          <p style={s.secureNote}>You'll be redirected to the payment form</p>
          <p style={s.skipLink} onClick={() => navigate('/dashboard')}>Continue with free trial</p>
        </div>
      </div>
    );
  }

  // ── Step: Pending confirmation ────────────────────────────────────────────
  if (step === 'pending') {
    return (
      <div style={s.container}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>⏳</div>
          <h1 style={{ ...s.title, fontSize: 20 }}>Payment Submitted</h1>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
            Once your payment is confirmed, your Thermite plan will be activated within a few hours.
          </p>
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 12, padding: '14px 16px', width: '100%', maxWidth: 360 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#166534', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
              Not activated after 2 hours? Contact us at{' '}
              <a href="mailto:official@thermiteeducare.com" style={{ color: '#16A34A', fontWeight: 700 }}>
                official@thermiteeducare.com
              </a>
            </p>
          </div>
          <button
            style={{ ...s.subscribeBtn, backgroundColor: '#0D9488', maxWidth: 360, marginTop: 8 }}
            onClick={() => window.open(QFIX_URL, '_blank')}
          >
            Reopen Payment Form
          </button>
          <button style={s.skipLink} onClick={() => navigate('/dashboard')}>
            Continue with free trial for now
          </button>
        </div>
      </div>
    );
  }

  return null;
}

const s = {
  container: { minHeight: '100dvh', backgroundColor: '#F6F8FA', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' },
  header: { padding: '20px 16px 16px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0' },
  backBtn: { background: 'none', border: 'none', color: '#0EA5E9', fontSize: '14px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', padding: '0 0 12px', display: 'block' },
  title: { margin: '0 0 4px', fontSize: '22px', fontWeight: '700', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", textAlign: 'left' },
  subtitle: { margin: 0, fontSize: '13px', color: '#64748B', fontFamily: "'DM Sans', sans-serif", textAlign: 'left' },
  billingToggleWrap: { padding: '16px 16px 0', display: 'flex', justifyContent: 'center' },
  billingToggle: { display: 'flex', background: '#E2E8F0', borderRadius: '10px', padding: '3px', gap: '2px' },
  toggleBtn: { padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: '600', color: '#64748B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '6px' },
  toggleBtnActive: { background: '#FFFFFF', color: '#0F172A', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
  saveBadge: { fontSize: '10px', fontWeight: '700', background: '#DCFCE7', color: '#166534', borderRadius: '10px', padding: '2px 6px' },
  cardsContainer: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 },
  card: { borderRadius: '16px', border: '1.5px solid #E2E8F0', padding: '20px 18px', position: 'relative', backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  recommendedBadge: { position: 'absolute', top: '-11px', right: '16px', backgroundColor: '#0EA5E9', color: '#FFFFFF', fontSize: '11px', fontWeight: '600', padding: '3px 12px', borderRadius: '20px', fontFamily: "'DM Sans', sans-serif" },
  cardTop: { display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' },
  radio: { width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' },
  radioDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FFFFFF' },
  cardInfo: { flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' },
  planBadge: { display: 'inline-block', fontSize: '11px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px', fontFamily: "'DM Sans', sans-serif" },
  planName: { margin: 0, fontSize: '20px', fontWeight: '700', fontFamily: "'DM Sans', sans-serif" },
  priceRow: { display: 'flex', alignItems: 'baseline', gap: '2px', marginTop: '4px' },
  priceSymbol: { fontSize: '18px', fontWeight: '700', fontFamily: "'DM Sans', sans-serif" },
  price: { fontSize: '38px', fontWeight: '800', lineHeight: 1, fontFamily: "'DM Sans', sans-serif" },
  period: { fontSize: '13px', color: '#94A3B8', marginLeft: '4px', fontFamily: "'DM Sans', sans-serif" },
  perMonthNote: { margin: 0, fontSize: '11px', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif" },
  featureList: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' },
  featureItem: { display: 'flex', alignItems: 'center', gap: '10px' },
  checkIcon: { fontSize: '14px', fontWeight: '700', width: '16px', textAlign: 'center', flexShrink: 0 },
  featureText: { fontSize: '13px', color: '#475569', fontFamily: "'DM Sans', sans-serif" },
  ctaContainer: { padding: '16px 16px 32px', backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' },
  codeBtn: { width: '100%', padding: '15px', color: '#FFFFFF', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', fontFamily: "'DM Sans', sans-serif", backgroundColor: '#0D9488', cursor: 'pointer' },
  subscribeBtn: { width: '100%', padding: '15px', color: '#FFFFFF', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' },
  secureNote: { margin: 0, fontSize: '12px', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif" },
  skipLink: { margin: 0, fontSize: '13px', color: '#0EA5E9', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none' },
  codeInput: { width: '100%', background: '#FFFFFF', border: '1.5px solid #CBD5E1', borderRadius: 10, padding: '12px 14px', fontSize: 16, fontWeight: 700, color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.1em', boxSizing: 'border-box', textTransform: 'uppercase' },
  codeError: { fontSize: 12, color: '#EF4444', margin: 0, fontFamily: "'DM Sans', sans-serif" },
};
