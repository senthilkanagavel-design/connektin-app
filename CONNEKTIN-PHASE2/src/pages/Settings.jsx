// src/pages/Settings.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const navigate  = useNavigate();
  const { profile } = useAuth();
  const isLocked = profile?.plan === 'trial' && profile?.userType !== 'recruiter';

  const items = [
    {
      icon: '✏️', label: 'Edit Profile',
      sub: 'Update name and bio',
      onClick: () => navigate('/edit-profile'),
    },
    {
      icon: '🏭', label: 'Change Industry',
      sub: 'Free swap every 90 days',
      locked: isLocked,
      onClick: () => { if (!isLocked) navigate('/industry-swap'); },
    },
    {
      icon: '🔔', label: 'Notifications',
      sub: 'Manage alerts',
      onClick: () => {},
    },
    {
      icon: '🔒', label: 'Privacy',
      sub: 'Data & visibility',
      onClick: () => {},
    },
    {
      icon: '❓', label: 'Help & Support',
      sub: 'FAQs and contact',
      onClick: () => {},
    },
  ];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate('/dashboard', { state: { tab: 'profile' } })}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <span style={S.headerTitle}>Settings</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Items */}
      <div style={S.list}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{ ...S.item, opacity: item.locked ? 0.6 : 1 }}
            onClick={item.onClick}
          >
            <div style={S.iconWrap}>{item.icon}</div>
            <div style={S.itemText}>
              <div style={S.itemLabel}>{item.label}</div>
              <div style={S.itemSub}>{item.sub}</div>
            </div>
            {item.locked ? (
              <button
                style={S.lockBtn}
                onClick={e => { e.stopPropagation(); navigate('/subscribe'); }}
              >
                🔒 Upgrade
              </button>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const S = {
  page:   { minHeight: '100vh', background: '#F3F2EF', fontFamily: 'DM Sans, sans-serif' },
  header: {
    background: '#0A1628', padding: '14px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 700, color: '#fff' },
  list:   { padding: '12px 0' },
  item:   {
    display: 'flex', alignItems: 'center', gap: 14,
    background: '#fff', padding: '14px 16px',
    borderBottom: '1px solid #F3F2EF', cursor: 'pointer',
  },
  iconWrap: { fontSize: 20, width: 36, textAlign: 'center', flexShrink: 0 },
  itemText: { flex: 1 },
  itemLabel: { fontSize: 14, fontWeight: 600, color: '#0A1628' },
  itemSub:   { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  lockBtn: {
    background: '#FEF3C7', color: '#B45309',
    border: '1px solid #FDE68A', borderRadius: 12,
    padding: '4px 10px', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', flexShrink: 0,
    fontFamily: 'DM Sans, sans-serif',
  },
};
