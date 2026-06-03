import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const UPI_ID = 'your-upi-id@bank'; // ← replace with actual UPI ID
const SWAP_FEE = '9.99';
const FREE_SWAP_DAYS = 90;

const INDUSTRIES = [
  { value: 'medical_billing',        label: 'Medical Billing' },
  { value: 'healthcare',             label: 'Healthcare' },
  { value: 'information_technology', label: 'Information Technology' },
  { value: 'banking_finance',        label: 'Banking & Finance' },
  { value: 'education',              label: 'Education' },
  { value: 'manufacturing',          label: 'Manufacturing' },
  { value: 'retail_ecommerce',       label: 'Retail & E-Commerce' },
  { value: 'media_entertainment',    label: 'Media & Entertainment' },
  { value: 'real_estate',            label: 'Real Estate' },
  { value: 'logistics_supply_chain', label: 'Logistics & Supply Chain' },
  { value: 'hospitality_travel',     label: 'Hospitality & Travel' },
];

function daysSince(ts) {
  if (!ts) return 999;
  const ms = ts.toDate ? ts.toDate().getTime() : new Date(ts).getTime();
  return Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
}

function getLabel(value) {
  return INDUSTRIES.find(i => i.value === value)?.label || value || '—';
}

const btn = {
  primary: {
    width: '100%', background: '#0D9488', color: '#fff',
    border: 'none', borderRadius: 10, padding: '14px',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif', marginBottom: 10,
  },
  success: {
    width: '100%', background: '#16A34A', color: '#fff',
    border: 'none', borderRadius: 10, padding: '14px',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif', marginBottom: 10,
  },
  disabled: {
    width: '100%', background: '#9CA3AF', color: '#fff',
    border: 'none', borderRadius: 10, padding: '14px',
    fontSize: 15, fontWeight: 700, cursor: 'not-allowed',
    fontFamily: 'DM Sans, sans-serif', marginBottom: 10,
  },
  ghost: {
    width: '100%', background: 'none', border: '1px solid #E4E2DC',
    borderRadius: 10, padding: '12px', fontSize: 14, cursor: 'pointer',
    color: '#6B6B6B', fontFamily: 'DM Sans, sans-serif',
  },
};

export default function IndustrySwap() {
  const { user, profile, patchProfile } = useAuth();
  const navigate = useNavigate();

  const currentIndustry = profile?.industry || '';
  const days   = daysSince(profile?.industrySwappedAt);
  const isFree = days >= FREE_SWAP_DAYS;

  const [selected, setSelected] = useState('');
  const [step, setStep]         = useState('select');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  function handleContinue() {
    if (!selected || selected === currentIndustry) { setError('Please select a different industry.'); return; }
    setError('');
    if (isFree) setStep('confirm');
    else setStep('upi');
  }

  async function doSwap() {
    setSaving(true); setError('');
    try {
      const ref = doc(db, 'users', user.uid);
      await updateDoc(ref, { industry: selected, industrySwappedAt: serverTimestamp() });
      patchProfile({ industry: selected, industrySwappedAt: new Date() });
      setStep('done');
    } catch (e) {
      console.error('IndustrySwap error:', e);
      setError('Something went wrong. Please try again.');
    }
    setSaving(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F2EF', display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E2DC', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate('/dashboard', { state: { tab: 'profile' } })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#1A1A1A', padding: 0, lineHeight: 1 }}>←</button>
        <span style={{ fontWeight: 700, fontSize: 17, color: '#1A1A1A' }}>Change Industry</span>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Current industry card */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 20, border: '1px solid #E4E2DC' }}>
          <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Current Industry</div>
          <div style={{ fontWeight: 700, color: '#0D9488', fontSize: 16 }}>{getLabel(currentIndustry)}</div>
          {isFree
            ? <div style={{ fontSize: 12, color: '#16A34A', marginTop: 8, fontWeight: 600 }}>✓ Free swap available</div>
            : <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>Free swap available in <strong>{FREE_SWAP_DAYS - days}</strong> day{FREE_SWAP_DAYS - days !== 1 ? 's' : ''}</div>
          }
        </div>

        {/* STEP: Select */}
        {step === 'select' && (
          <>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1A1A', marginBottom: 12 }}>Select new industry</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {INDUSTRIES.filter(i => i.value !== currentIndustry).map(ind => (
                <button key={ind.value} onClick={() => { setSelected(ind.value); setError(''); }} style={{ background: selected === ind.value ? '#F0FDFB' : '#fff', border: `2px solid ${selected === ind.value ? '#0D9488' : '#E4E2DC'}`, borderRadius: 10, padding: '13px 16px', textAlign: 'left', cursor: 'pointer', color: '#1A1A1A', fontSize: 14, fontWeight: selected === ind.value ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'border-color 0.15s, background 0.15s' }}>
                  {ind.label}
                </button>
              ))}
            </div>
            {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button onClick={handleContinue} style={btn.primary}>
              {isFree ? 'Continue  (Free)' : `Continue  (₹${SWAP_FEE})`}
            </button>
          </>
        )}

        {/* STEP: UPI */}
        {step === 'upi' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #E4E2DC' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Pay ₹{SWAP_FEE} to swap</div>
            <div style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 20 }}>Switching to <strong>{getLabel(selected)}</strong></div>
            <div style={{ background: '#F0FDFB', borderRadius: 10, padding: 18, marginBottom: 20, textAlign: 'center', border: '1px solid #99F6E4' }}>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>UPI ID</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#0D9488', letterSpacing: 0.5, marginBottom: 8 }}>{UPI_ID}</div>
              <div style={{ fontSize: 14, color: '#1A1A1A' }}>Amount: <strong>₹{SWAP_FEE}</strong></div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>Note: Industry Swap – {user?.displayName || user?.email}</div>
            </div>
            <div style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 20, lineHeight: 1.6 }}>After paying, tap confirm below. Your industry will update immediately.</div>
            <button onClick={() => setStep('confirm')} style={btn.primary}>I've Paid — Confirm Swap</button>
            <button onClick={() => setStep('select')} style={btn.ghost}>Go Back</button>
          </div>
        )}

        {/* STEP: Confirm */}
        {step === 'confirm' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #E4E2DC' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Confirm Switch</div>
            <div style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 6, lineHeight: 1.7 }}>
              <strong>{getLabel(currentIndustry)}</strong>{' → '}<strong style={{ color: '#0D9488' }}>{getLabel(selected)}</strong>
            </div>
            <div style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 20, lineHeight: 1.6 }}>
              Your feed, articles, and jobs will update to reflect the new industry.
              {!isFree && <span style={{ color: '#DC2626', display: 'block', marginTop: 6 }}>₹{SWAP_FEE} paid — this change is final.</span>}
            </div>
            {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button onClick={doSwap} disabled={saving} style={saving ? btn.disabled : btn.success}>
              {saving ? 'Updating...' : 'Yes, Switch Industry'}
            </button>
            <button onClick={() => setStep('select')} disabled={saving} style={btn.ghost}>Cancel</button>
          </div>
        )}

        {/* STEP: Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#1A1A1A', marginBottom: 10 }}>Industry Updated!</div>
            <div style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 32, lineHeight: 1.7 }}>
              You're now in <strong>{getLabel(selected)}</strong>.<br />Your feed and content will reflect this shortly.
            </div>
            <button onClick={() => navigate('/dashboard', { state: { tab: 'profile' } })} style={{ ...btn.primary, width: 'auto', padding: '14px 36px' }}>
              Back to Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
