// src/pages/Settings.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// SVG Icons
const EditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IndustryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
    <line x1="10" y1="14" x2="14" y2="14"/>
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const HelpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default function Settings() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isLocked = profile?.plan === 'trial' && profile?.userType !== 'recruiter';

  const sections = [
    {
      items: [
        {
          icon: <EditIcon />,
          label: 'Edit Profile',
          sub: 'Update name and bio',
          onClick: () => navigate('/edit-profile'),
        },
        {
          icon: <IndustryIcon />,
          label: 'Change Industry',
          sub: 'Free swap every 90 days',
          locked: isLocked,
          onClick: () => { if (!isLocked) navigate('/industry-swap'); },
        },
        {
          icon: <BellIcon />,
          label: 'Notifications',
          sub: 'Manage alerts',
          onClick: () => {},
        },
      ],
    },
    {
      items: [
        {
          icon: <ShieldIcon />,
          label: 'Privacy & Security',
          sub: 'Manage your data and security',
          highlight: true,
          onClick: () => navigate('/privacy-security'),
        },
        {
          icon: <HelpIcon />,
          label: 'Help & Support',
          sub: 'FAQs and contact',
          onClick: () => {},
        },
      ],
    },
  ];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate('/dashboard', { state: { tab: 'profile' } })}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <span style={S.headerTitle}>Settings</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Profile summary */}
      {profile && (
        <div style={S.profileCard}>
          <div style={S.avatar}>
            {profile.displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={S.profileName}>{profile.displayName || 'User'}</div>
            <div style={S.profileSub}>{profile.industry || 'ConnektIn Member'}</div>
          </div>
        </div>
      )}

      {/* Sections */}
      <div style={S.body}>
        {sections.map((section, si) => (
          <div key={si} style={S.section}>
            {section.items.map((item, i) => (
              <div
                key={i}
                style={{
                  ...S.item,
                  ...(item.highlight ? S.itemHighlight : {}),
                  opacity: item.locked ? 0.6 : 1,
                  borderBottom: i < section.items.length - 1 ? '1px solid #F3F2EF' : 'none',
                }}
                onClick={item.onClick}
              >
                <div style={{
                  ...S.iconWrap,
                  background: item.highlight ? '#E6F7F5' : '#F3F2EF',
                }}>
                  {item.icon}
                </div>
                <div style={S.itemText}>
                  <div style={{
                    ...S.itemLabel,
                    color: item.highlight ? '#0D9488' : '#0A1628',
                  }}>
                    {item.label}
                  </div>
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
                  <ChevronRight />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Version footer */}
      <div style={S.footer}>ConnektIn v1.0</div>
    </div>
  );
}

const S = {
  page:        { minHeight: '100vh', background: '#F3F2EF', fontFamily: 'DM Sans, sans-serif' },
  header:      {
    background: '#0A1628', padding: '14px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn:     { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 700, color: '#fff' },

  profileCard: {
    background: '#fff', padding: '16px',
    display: 'flex', alignItems: 'center', gap: 12,
    borderBottom: '4px solid #F3F2EF',
  },
  avatar: {
    width: 44, height: 44, borderRadius: '50%',
    background: '#0D9488', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 700, flexShrink: 0,
  },
  profileName: { fontSize: 15, fontWeight: 700, color: '#0A1628' },
  profileSub:  { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  body:    { padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 },
  section: { background: '#fff' },
  item:    {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px', cursor: 'pointer',
    transition: 'background 0.15s',
  },
  itemHighlight: { background: '#FAFFFE' },
  iconWrap: {
    width: 38, height: 38, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  itemText:  { flex: 1 },
  itemLabel: { fontSize: 14, fontWeight: 600, color: '#0A1628' },
  itemSub:   { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  lockBtn: {
    background: '#FEF3C7', color: '#B45309',
    border: '1px solid #FDE68A', borderRadius: 12,
    padding: '4px 10px', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', flexShrink: 0,
    fontFamily: 'DM Sans, sans-serif',
  },
  footer: {
    textAlign: 'center', padding: '24px 16px',
    fontSize: 11, color: '#D1D5DB',
  },
};
