// src/components/ReportModal.jsx
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const REASONS = [
  { id: 'spam',          label: 'Spam',                              sub: 'Unwanted promotional or repetitive content' },
  { id: 'harassment',    label: 'Harassment or bullying',            sub: 'Targeting, threatening, or demeaning someone' },
  { id: 'inappropriate', label: 'Inappropriate or offensive content', sub: 'Explicit, hateful, or disturbing material' },
  { id: 'child_safety',  label: 'Child safety concern',              sub: 'Content or behavior that endangers a minor' },
  { id: 'misinformation',label: 'Misinformation',                    sub: 'False or misleading information' },
  { id: 'other',         label: 'Other',                             sub: 'Something else that concerns you' },
];

const TYPE_LABEL = { post: 'Post', article: 'Article', user: 'User', story: 'Story' };

export default function ReportModal({ targetType, targetId, targetName, targetOwnerUid, currentUser, profile, onClose }) {
  const [selected, setSelected]   = useState(null);
  const [details, setDetails]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  async function handleSubmit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, 'reports'), {
        reporterUid:  currentUser?.uid || null,
        reporterName: profile?.displayName || 'User',
        targetType,                        // 'post' | 'article' | 'user' | 'story'
        targetId:     targetId || null,
        targetName:   targetName || null,
        targetOwnerUid: targetOwnerUid || null,
        reason:       selected,
        details:      details.trim() || null,
        status:       'open',
        createdAt:    serverTimestamp(),
      });
      setDone(true);
      setTimeout(onClose, 1800);
    } catch (e) {
      console.error('Report error:', e);
      setError('Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div onClick={submitting ? undefined : onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 400 }} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401,
        background: '#fff', borderRadius: '22px 22px 0 0',
        padding: '0 0 28px', fontFamily: "'DM Sans', sans-serif",
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: '#E4E2DC' }} />
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '28px 24px 20px' }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>Report submitted</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>Thank you. Our team will review this shortly.</div>
          </div>
        ) : (
          <>
            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 4px' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>
                Report {TYPE_LABEL[targetType] || 'Content'}
              </span>
              <button
                onClick={onClose}
                disabled={submitting}
                style={{ background: 'none', border: 'none', fontSize: 13, color: '#0D9488', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
            <div style={{ padding: '0 20px 10px', fontSize: 12.5, color: '#6B7280' }}>
              Your report is confidential. {TYPE_LABEL[targetType] === 'User' ? 'This person' : 'The author'} won't know who reported.
            </div>

            {/* Reasons */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {REASONS.map((r, i) => (
                <div key={r.id}>
                  {i > 0 && <div style={{ height: 1, background: '#F3F2EF', margin: '0 20px' }} />}
                  <button
                    disabled={submitting}
                    onClick={() => setSelected(r.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px',
                      background: selected === r.id ? '#E6F7F5' : 'none',
                      border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      border: selected === r.id ? '6px solid #0D9488' : '2px solid #C4C4C4',
                      boxSizing: 'border-box', background: '#fff',
                    }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1A1A1A' }}>{r.label}</span>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{r.sub}</span>
                    </div>
                  </button>
                </div>
              ))}
            </div>

            {/* Details for 'Other' (optional for all) */}
            {selected && (
              <div style={{ padding: '10px 20px 0' }}>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={selected === 'other' ? 'Please describe the issue…' : 'Add details (optional)…'}
                  rows={2}
                  maxLength={500}
                  disabled={submitting}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'none',
                    border: '1.5px solid #E4E2DC', borderRadius: 12, padding: '10px 14px',
                    fontSize: 13, color: '#1A1A1A', outline: 'none', fontFamily: "'DM Sans', sans-serif",
                  }}
                />
              </div>
            )}

            {error && (
              <div style={{ textAlign: 'center', fontSize: 13, color: '#C0392B', marginTop: 8, fontWeight: 500 }}>{error}</div>
            )}

            {/* Submit */}
            <div style={{ padding: '14px 20px 0' }}>
              <button
                onClick={handleSubmit}
                disabled={!selected || (selected === 'other' && !details.trim()) || submitting}
                style={{
                  width: '100%', background: '#0D9488', color: '#fff', border: 'none',
                  borderRadius: 12, padding: '13px 0', fontSize: 14.5, fontWeight: 700,
                  fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                  opacity: (!selected || (selected === 'other' && !details.trim()) || submitting) ? 0.45 : 1,
                }}
              >
                {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}