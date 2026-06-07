// src/pages/PrivacySecurity.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivacySecurity() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const memberSince = profile?.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
    month: 'short', year: 'numeric',
  }) || 'Recently';

  const securityItems = [
    { icon: '✉️', label: 'Email Verified', sub: user?.email || 'No email', verified: user?.emailVerified, onClick: () => {} },
    { icon: '🔑', label: 'Change Password', sub: 'Update your password', onClick: () => {} },
    { icon: '🕐', label: 'Last Login Activity', sub: 'See recent login history', onClick: () => navigate('/last-login-activity') },
    { icon: '📱', label: 'Active Sessions', sub: `${1} active session`, onClick: () => navigate('/active-sessions') },
    { icon: '👁️', label: 'Biometric Login', sub: 'Face ID / Fingerprint', toggle: true },
  ];

  const privacyItems = [
    { icon: '👤', label: 'Profile Visibility', sub: 'Control who can see your profile', onClick: () => navigate('/profile-visibility') },
    { icon: '📦', label: 'Download My Data', sub: 'Get a copy of your data', onClick: () => navigate('/data-privacy') },
  ];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate('/settings')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <span style={S.headerTitle}>Privacy & Security</span>
        <div style={{ width: 32 }} />
      </div>

      <div style={S.content}>

        {/* Hero Card */}
        <div style={S.heroCard}>
          <div style={S.heroLeft}>
            <div style={S.heroTitle}>You're in Control</div>
            <div style={S.heroText}>We are committed to keeping your data safe and private.</div>
            <div style={S.profileName}>{profile?.displayName || 'Community Member'}</div>
            <div style={S.profileEmail}>{user?.email || ''}</div>
            <div style={S.profileSince}>Member since {memberSince}</div>
          </div>
          <div style={S.heroIconWrap}>
            <div style={S.heroShield}>🛡️</div>
          </div>
        </div>

        {/* Account Security */}
        <div style={S.sectionLabel}>Account Security</div>
        <div style={S.card}>
          {securityItems.map((item, i) => (
            <div
              key={i}
              style={{ ...S.row, borderBottom: i < securityItems.length - 1 ? '1px solid #F3F2EF' : 'none' }}
              onClick={item.onClick}
            >
              <div style={S.rowIcon}>{item.icon}</div>
              <div style={S.rowText}>
                <div style={S.rowLabel}>{item.label}</div>
                <div style={S.rowSub}>{item.sub}</div>
              </div>
              {item.verified !== undefined ? (
                <div style={{ ...S.verifiedBadge, background: item.verified ? '#E1F5EE' : '#FEF3C7', color: item.verified ? '#0D9488' : '#B45309' }}>
                  {item.verified ? '✓ Verified' : '⚠ Unverified'}
                </div>
              ) : item.toggle ? (
                <div style={S.toggleOn} />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              )}
            </div>
          ))}
        </div>

        {/* Data & Privacy */}
        <div style={S.sectionLabel}>Data & Privacy</div>
        <div style={S.card}>
          {privacyItems.map((item, i) => (
            <div
              key={i}
              style={{ ...S.row, borderBottom: i < privacyItems.length - 1 ? '1px solid #F3F2EF' : 'none' }}
              onClick={item.onClick}
            >
              <div style={S.rowIcon}>{item.icon}</div>
              <div style={S.rowText}>
                <div style={S.rowLabel}>{item.label}</div>
                <div style={S.rowSub}>{item.sub}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
        </div>

        {/* Legal */}
        <div style={S.sectionLabel}>Legal & Transparency</div>
        <div style={S.card}>
          {[
            { icon: '📄', label: 'Privacy Policy', sub: 'Read how we protect your data', onClick: () => navigate('/privacy') },
            { icon: '📋', label: 'Terms of Service', sub: 'Rules and guidelines', onClick: () => {} },
            { icon: '💬', label: 'Community Guidelines', sub: 'Be respectful and professional', onClick: () => {} },
          ].map((item, i) => (
            <div
              key={i}
              style={{ ...S.row, borderBottom: i < 2 ? '1px solid #F3F2EF' : 'none' }}
              onClick={item.onClick}
            >
              <div style={S.rowIcon}>{item.icon}</div>
              <div style={S.rowText}>
                <div style={S.rowLabel}>{item.label}</div>
                <div style={S.rowSub}>{item.sub}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
        </div>

        {/* Delete Account */}
        <div style={S.dangerCard}>
          <div style={S.dangerIcon}>🗑️</div>
          <div style={S.dangerText}>
            <div style={S.dangerTitle}>Delete Account</div>
            <div style={S.dangerSub}>Permanently remove your account and all data.</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </div>

        <div style={S.footer}>A safe space helps you grow with confidence. 🤍</div>
      </div>
    </div>
  );
}

const S = {
  page:        { minHeight: '100vh', background: '#F3F2EF', fontFamily: 'DM Sans, sans-serif' },
  header:      { background: '#0A1628', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:     { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 700, color: '#fff' },
  content:     { padding: 16 },

  heroCard:    { background: '#fff', borderRadius: 16, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  heroLeft:    { flex: 1 },
  heroTitle:   { fontSize: 16, fontWeight: 700, color: '#0A1628', marginBottom: 4 },
  heroText:    { fontSize: 12, color: '#64748B', lineHeight: 1.5, marginBottom: 12 },
  profileName: { fontSize: 14, fontWeight: 700, color: '#0A1628' },
  profileEmail:{ fontSize: 12, color: '#64748B', marginTop: 2 },
  profileSince:{ fontSize: 11, color: '#94A3B8', marginTop: 2 },
  heroIconWrap:{ flexShrink: 0 },
  heroShield:  { fontSize: 48 },

  sectionLabel:{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
  card:        { background: '#fff', borderRadius: 16, padding: '4px 16px', marginBottom: 20 },
  row:         { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', cursor: 'pointer' },
  rowIcon:     { fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 },
  rowText:     { flex: 1 },
  rowLabel:    { fontSize: 14, fontWeight: 600, color: '#0A1628' },
  rowSub:      { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  verifiedBadge:{ fontSize: 11, fontWeight: 600, borderRadius: 10, padding: '4px 10px', flexShrink: 0 },
  toggleOn:    { width: 36, height: 20, borderRadius: 10, background: '#0D9488', flexShrink: 0 },

  dangerCard:  { background: '#fff', borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #FECACA', cursor: 'pointer', marginBottom: 20 },
  dangerIcon:  { fontSize: 20 },
  dangerText:  { flex: 1 },
  dangerTitle: { fontSize: 14, fontWeight: 700, color: '#DC2626' },
  dangerSub:   { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  footer:      { textAlign: 'center', fontSize: 13, color: '#94A3B8', fontStyle: 'italic', paddingBottom: 32 },
};
