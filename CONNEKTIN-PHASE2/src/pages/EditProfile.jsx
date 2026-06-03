// src/pages/EditProfile.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const S = {
  page: {
    minHeight: '100vh',
    background: '#F3F2EF',
    fontFamily: "'DM Sans', sans-serif",
    paddingBottom: 40,
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #E4E2DC',
    padding: '0 16px',
    height: 56,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: 22,
    cursor: 'pointer',
    color: '#1A1A1A',
    padding: '4px 8px 4px 0',
    lineHeight: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: '#1A1A1A',
    flex: 1,
  },
  saveBtn: {
    background: '#0D9488',
    color: '#fff',
    border: 'none',
    borderRadius: 20,
    padding: '8px 20px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    opacity: 1,
    transition: 'opacity 0.2s',
  },
  avatarSection: {
    background: 'linear-gradient(135deg, #0A1628, #0d2744)',
    padding: '32px 16px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: '50%',
    background: '#0A1628',
    border: '3px solid rgba(13,148,136,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: 700,
    color: '#fff',
  },
  avatarName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
  },
  avatarEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    margin: '16px 16px 0',
    border: '1px solid #E4E2DC',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '14px 16px 8px',
  },
  fieldWrap: {
    padding: '0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #E4E2DC',
    borderRadius: 10,
    fontSize: 15,
    color: '#1A1A1A',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff',
    transition: 'border-color 0.2s',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #E4E2DC',
    borderRadius: 10,
    fontSize: 15,
    color: '#1A1A1A',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff',
    resize: 'none',
    lineHeight: 1.6,
    transition: 'border-color 0.2s',
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 2,
  },
  readonlyRow: {
    padding: '12px 16px',
    borderTop: '1px solid #F3F2EF',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readonlyLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  readonlyValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: 500,
    maxWidth: '60%',
    textAlign: 'right',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  divider: {
    height: 1,
    background: '#F3F2EF',
    margin: '0 16px',
  },
  errorBox: {
    margin: '12px 16px 0',
    background: 'rgba(220,38,38,0.08)',
    border: '1px solid rgba(220,38,38,0.2)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#DC2626',
  },
  successBox: {
    margin: '12px 16px 0',
    background: 'rgba(13,148,136,0.08)',
    border: '1px solid rgba(13,148,136,0.25)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#0D9488',
    fontWeight: 600,
  },
};

const BIO_MAX = 150;

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, profile, patchProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio]                 = useState(profile?.bio || '');
  const [focused, setFocused]         = useState(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  const industryLabel = profile?.industry
    ? profile.industry.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : '—';

  const planLabel = profile?.plan
    ? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)
    : '—';

  async function handleSave() {
    const name = displayName.trim();
    if (!name) { setError('Display name cannot be empty.'); return; }
    if (name.length < 2) { setError('Display name must be at least 2 characters.'); return; }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      // 1. Update Firebase Auth display name
      if (user) {
        await updateProfile(user, { displayName: name });
      }

      // 2. Update Firestore user doc
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: name,
        bio: bio.trim(),
      });

      // 3. Update local profile state instantly
      patchProfile({ displayName: name, bio: bio.trim() });

      setSuccess(true);
      setTimeout(() => navigate('/dashboard', { state: { tab: 'profile' } }), 1200);

    } catch (err) {
      console.error(err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const initial = (profile?.displayName || 'U').charAt(0).toUpperCase();

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate('/dashboard', { state: { tab: 'profile' } })}>←</button>
        <span style={S.headerTitle}>Edit Profile</span>
        <button
          style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Avatar section */}
      <div style={S.avatarSection}>
        <div style={S.avatarRing}>
          {profile?.photoURL
            ? <img src={profile.photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={S.avatarInitial}>{initial}</span>
          }
        </div>
        <div style={S.avatarName}>{profile?.displayName || 'Your Name'}</div>
        <div style={S.avatarEmail}>{profile?.email || ''}</div>
      </div>

      {/* Feedback */}
      {error   && <div style={S.errorBox}>{error}</div>}
      {success && <div style={S.successBox}>✓ Profile updated successfully</div>}

      {/* Editable fields */}
      <div style={S.card}>
        <div style={S.cardTitle}>Public Info</div>
        <div style={S.fieldWrap}>

          <div style={S.field}>
            <label style={S.label}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
              style={{
                ...S.input,
                borderColor: focused === 'name' ? '#0D9488' : '#E4E2DC',
              }}
              placeholder="Your name"
              maxLength={50}
            />
          </div>

          <div style={S.field}>
            <label style={S.label}>Bio</label>
            <textarea
              value={bio}
              onChange={e => { if (e.target.value.length <= BIO_MAX) setBio(e.target.value); }}
              onFocus={() => setFocused('bio')}
              onBlur={() => setFocused(null)}
              style={{
                ...S.textarea,
                borderColor: focused === 'bio' ? '#0D9488' : '#E4E2DC',
                height: 90,
              }}
              placeholder="A short bio — what you do, where you're headed…"
            />
            <div style={{
              ...S.charCount,
              color: bio.length >= BIO_MAX ? '#DC2626' : '#9CA3AF',
            }}>
              {bio.length} / {BIO_MAX}
            </div>
          </div>

        </div>
      </div>

      {/* Read-only fields */}
      <div style={S.card}>
        <div style={S.cardTitle}>Account Details</div>
        <div style={S.readonlyRow}>
          <span style={S.readonlyLabel}>Email</span>
          <span style={S.readonlyValue}>{profile?.email || '—'}</span>
        </div>
        <div style={S.divider} />
        <div style={S.readonlyRow}>
          <span style={S.readonlyLabel}>Industry</span>
          <span style={S.readonlyValue}>{industryLabel}</span>
        </div>
        <div style={S.divider} />
        <div style={S.readonlyRow}>
          <span style={S.readonlyLabel}>Plan</span>
          <span style={{ ...S.readonlyValue, color: '#0D9488', fontWeight: 700 }}>{planLabel}</span>
        </div>
        <div style={S.divider} />
        <div style={S.readonlyRow}>
          <span style={S.readonlyLabel}>Role</span>
          <span style={S.readonlyValue}>{profile?.role || 'participant'}</span>
        </div>
      </div>

      <div style={{ margin: '12px 16px 0', fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
        To change your industry, use <strong style={{ color: '#0D9488' }}>Change Industry</strong> from your profile settings. Email cannot be changed here.
      </div>

    </div>
  );
}
