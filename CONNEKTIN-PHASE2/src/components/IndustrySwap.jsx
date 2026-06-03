// src/pages/IndustrySwap.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const SWAP_FEE = '9.99';
const FREE_SWAP_DAYS = 90;

const INDUSTRIES = [
  { value: 'medical_billing',        label: 'Medical Billing',          emoji: '🏥' },
  { value: 'medical_coding',         label: 'Medical Coding',           emoji: '🩺' },
  { value: 'medical_coding_billing', label: 'Medical Coding & Billing', emoji: '💉' },
  { value: 'healthcare',             label: 'Healthcare',               emoji: '💊' },
  { value: 'information_technology', label: 'IT',                       emoji: '💻' },
  { value: 'banking_finance',        label: 'Banking & Finance',        emoji: '🏦' },
  { value: 'education',              label: 'Education',                emoji: '🎓' },
  { value: 'manufacturing',          label: 'Manufacturing',            emoji: '🏭' },
  { value: 'real_estate',            label: 'Real Estate',              emoji: '🏘️' },
  { value: 'media_entertainment',    label: 'Media & Entertainment',    emoji: '🎬' },
  { value: 'hospitality_travel',     label: 'Hospitality & Travel',     emoji: '✈️' },
];

function daysSince(ts) {
  if (!ts) return 999;
  const ms = ts.toDate ? ts.toDate().getTime() : new Date(ts).getTime();
  return Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
}

const btn = {
  primary:  { width: '100%', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: 10 },
  success:  { width: '100%', background: '#16A34A', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: 10 },
  disabled: { width: '100%', background: '#9CA3AF', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'not-allowed', fontFamily: 'DM Sans, sans-serif', marginBottom: 10 },
  ghost:    { width: '100%', background: 'none', border: '1px solid #E4E2DC', borderRadius: 10, padding: '12px', fontSize: 14, cursor: 'pointer', color: '#6B6B6B', fontFamily: 'DM Sans, sans-serif' },
};

export default function IndustrySwap() {
  const { user, profile, patchProfile } = useAuth();
  const navigate = useNavigate();

  // Current industries — support both old single and new array
  const currentIndustries = profile?.industries || (profile?.industry ? [profile.industry] : []);
  const days   = daysSince(profile?.industrySwappedAt);
  const isFree = days >= FREE_SWAP_DAYS;

  const [selected, setSelected] = useState([...currentIndustries]);
  const [step, setStep]         = useState('select');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const toggle = (value) => {
    setError('');
    setSelected(prev =>
      prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]
    );
  };

  const hasChanged = JSON.stringify([...selected].sort()) !== JSON.stringify([...currentIndustries].sort());

  function handleContinue() {
    if (selected.length === 0) { setError('Please select at least one industry.'); return; }
    if (!hasChanged) { setError('Please select different industries from your current ones.'); return; }
    setError('');
    if (isFree) setStep('confirm');
    else setStep('upi');
  }

  async function doSwap() {
    setSaving(true); setError('');
    try {
      const ref = doc(db, 'users', user.uid);
      await updateDoc(ref, {
        industries: selected,
        industry: selected[0],  // primary — backward compat
        industrySwappedAt: serverTimestamp(),
      });
      patchProfile({ industries: selected, industry: selected[0], industrySwappedAt: new Date() });
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
        <span style={{ fontWeight: 700, fontSize: 17, color: '#1A1A1A' }}>Change Industries</span>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Current industries */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 20, border: '1px solid #E4E2DC' }}>
          <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Current Industries</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {currentIndustries.map(ind => {
              const found = INDUSTRIES.find(i => i.value === ind);
              return (
                <span key={ind} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#E6FAF8', color: '#0F6E56', border: '1px solid #99F6E4' }}>
                  {found?.emoji} {found?.label || ind}
                </span>
              );
            })}
          </div>
          {isFree
            ? <div style={{ fontSize: 12, color: '#16A34A', marginTop: 10, fontWeight: 600 }}>✓ Free update available</div>
            : <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10 }}>Free update in <strong>{FREE_SWAP_DAYS - days}</strong> day{FREE_SWAP_DAYS - days !== 1 ? 's' : ''}</div>
          }
        </div>

        {/* STEP: Select */}
        {step === 'select' && (
          <>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1A1A', marginBottom: 6 }}>Select your industries</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Tap to select or deselect. Pick as many as you like.</div>

            {selected.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0D9488' }}>{selected.length} selected</span>
                <button onClick={() => setSelected([])} style={{ background: 'none', border: 'none', fontSize: 12, color: '#9CA3AF', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Clear all</button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 7, marginBottom: 20 }}>
              {INDUSTRIES.map(ind => {
                const isSel = selected.includes(ind.value);
                return (
                  <button
                    key={ind.value}
                    onClick={() => toggle(ind.value)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '10px 6px', borderRadius: 10,
                      border: `1.5px solid ${isSel ? '#0D9488' : '#E4E2DC'}`,
                      background: isSel ? '#E6FAF8' : '#F9FAFB',
                      cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                      position: 'relative', gap: 3, transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{ind.emoji}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.3, color: isSel ? '#0F6E56' : '#0A1628' }}>{ind.label}</span>
                    {isSel && <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 9, color: '#0D9488', fontWeight: 700 }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button onClick={handleContinue} style={selected.length > 0 && hasChanged ? btn.primary : btn.disabled}>
              {isFree ? `Continue (Free)` : `Continue (₹${SWAP_FEE})`}
            </button>
          </>
        )}

        {/* STEP: UPI */}
        {step === 'upi' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #E4E2DC' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Pay ₹{SWAP_FEE} to update</div>
            <div style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 20 }}>Switching to {selected.length} industr{selected.length > 1 ? 'ies' : 'y'}</div>
            <div style={{ background: '#F0FDFB', borderRadius: 10, padding: 18, marginBottom: 20, textAlign: 'center', border: '1px solid #99F6E4' }}>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>Pay via UPI</div>
              <div style={{ fontSize: 14, color: '#1A1A1A' }}>Amount: <strong>₹{SWAP_FEE}</strong></div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>Note: Industry Update – {user?.displayName || user?.email}</div>
            </div>
            <button onClick={() => setStep('confirm')} style={btn.primary}>I've Paid — Confirm Update</button>
            <button onClick={() => setStep('select')} style={btn.ghost}>Go Back</button>
          </div>
        )}

        {/* STEP: Confirm */}
        {step === 'confirm' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #E4E2DC' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Confirm Update</div>
            <div style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 14, lineHeight: 1.7 }}>
              Your industries will be updated to:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {selected.map(val => {
                const found = INDUSTRIES.find(i => i.value === val);
                return (
                  <span key={val} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#E6FAF8', color: '#0F6E56', border: '1px solid #99F6E4' }}>
                    {found?.emoji} {found?.label || val}
                  </span>
                );
              })}
            </div>
            <div style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 20, lineHeight: 1.6 }}>
              Your feed, articles, and jobs will update to reflect your new industries.
              {!isFree && <span style={{ color: '#DC2626', display: 'block', marginTop: 6 }}>₹{SWAP_FEE} paid — this change is final.</span>}
            </div>
            {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button onClick={doSwap} disabled={saving} style={saving ? btn.disabled : btn.success}>
              {saving ? 'Updating...' : 'Yes, Update Industries'}
            </button>
            <button onClick={() => setStep('select')} disabled={saving} style={btn.ghost}>Cancel</button>
          </div>
        )}

        {/* STEP: Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#1A1A1A', marginBottom: 10 }}>Industries Updated!</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
              {selected.map(val => {
                const found = INDUSTRIES.find(i => i.value === val);
                return (
                  <span key={val} style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: '#E6FAF8', color: '#0F6E56', border: '1px solid #99F6E4' }}>
                    {found?.emoji} {found?.label || val}
                  </span>
                );
              })}
            </div>
            <div style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 32, lineHeight: 1.7 }}>
              Your feed and content will reflect this shortly.
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
