// src/utils/avatars.jsx

export const AVATARS = [
  {
    id: 'av1',
    label: 'Navy Geo',
    render: (size = 72) => (
      <svg width={size} height={size} viewBox="0 0 72 72" style={{ borderRadius: '50%', display: 'block' }}>
        <circle cx="36" cy="36" r="36" fill="#0A1628" />
        <polygon points="36,8 64,58 8,58" fill="#0D9488" opacity="0.85" />
        <circle cx="36" cy="36" r="11" fill="#0A1628" />
        <circle cx="36" cy="36" r="5" fill="#0D9488" />
      </svg>
    ),
  },
  {
    id: 'av2',
    label: 'Teal Wave',
    render: (size = 72) => (
      <svg width={size} height={size} viewBox="0 0 72 72" style={{ borderRadius: '50%', display: 'block' }}>
        <circle cx="36" cy="36" r="36" fill="#0F2A3A" />
        <path d="M0,38 Q18,22 36,38 Q54,54 72,38 L72,72 L0,72 Z" fill="#0D9488" opacity="0.9" />
        <path d="M0,50 Q18,34 36,50 Q54,66 72,50 L72,72 L0,72 Z" fill="#065F4C" opacity="0.8" />
        <circle cx="36" cy="24" r="10" fill="#0D9488" opacity="0.95" />
        <circle cx="36" cy="24" r="5" fill="#E1F5EE" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'av3',
    label: 'Purple Grid',
    render: (size = 72) => (
      <svg width={size} height={size} viewBox="0 0 72 72" style={{ borderRadius: '50%', display: 'block' }}>
        <circle cx="36" cy="36" r="36" fill="#1E1040" />
        <rect x="10" y="10" width="22" height="22" rx="3" fill="#534AB7" />
        <rect x="36" y="10" width="26" height="10" rx="3" fill="#AFA9EC" opacity="0.8" />
        <rect x="36" y="24" width="26" height="8" rx="3" fill="#7F77DD" opacity="0.9" />
        <rect x="10" y="36" width="14" height="26" rx="3" fill="#AFA9EC" opacity="0.7" />
        <rect x="28" y="36" width="34" height="12" rx="3" fill="#534AB7" opacity="0.85" />
        <rect x="28" y="52" width="34" height="10" rx="3" fill="#3C3489" />
      </svg>
    ),
  },
  {
    id: 'av4',
    label: 'Amber Arcs',
    render: (size = 72) => (
      <svg width={size} height={size} viewBox="0 0 72 72" style={{ borderRadius: '50%', display: 'block' }}>
        <circle cx="36" cy="36" r="36" fill="#1A0E00" />
        <circle cx="36" cy="36" r="30" fill="none" stroke="#BA7517" strokeWidth="4" opacity="0.5" />
        <circle cx="36" cy="36" r="22" fill="none" stroke="#EF9F27" strokeWidth="5" opacity="0.7" />
        <circle cx="36" cy="36" r="13" fill="none" stroke="#BA7517" strokeWidth="6" opacity="0.9" />
        <circle cx="36" cy="36" r="5" fill="#EF9F27" />
        <line x1="36" y1="6" x2="36" y2="14" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round" />
        <line x1="66" y1="36" x2="58" y2="36" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round" />
        <line x1="36" y1="66" x2="36" y2="58" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round" />
        <line x1="6" y1="36" x2="14" y2="36" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'av5',
    label: 'Blue Blocks',
    render: (size = 72) => (
      <svg width={size} height={size} viewBox="0 0 72 72" style={{ borderRadius: '50%', display: 'block' }}>
        <circle cx="36" cy="36" r="36" fill="#071428" />
        <rect x="8" y="8" width="56" height="56" rx="4" fill="none" />
        <rect x="8" y="8" width="26" height="12" rx="2" fill="#185FA5" />
        <rect x="38" y="8" width="26" height="26" rx="2" fill="#0A66C2" opacity="0.8" />
        <rect x="8" y="24" width="26" height="26" rx="2" fill="#378ADD" opacity="0.6" />
        <rect x="8" y="54" width="56" height="10" rx="2" fill="#185FA5" opacity="0.9" />
        <rect x="38" y="38" width="26" height="12" rx="2" fill="#B5D4F4" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: 'av6',
    label: 'Green Hex',
    render: (size = 72) => (
      <svg width={size} height={size} viewBox="0 0 72 72" style={{ borderRadius: '50%', display: 'block' }}>
        <circle cx="36" cy="36" r="36" fill="#071A10" />
        <polygon points="36,10 50,18 50,34 36,42 22,34 22,18" fill="#1A6640" opacity="0.9" />
        <polygon points="36,18 46,24 46,36 36,42 26,36 26,24" fill="#3B6D11" opacity="0.7" />
        <polygon points="36,26 42,30 42,38 36,42 30,38 30,30" fill="#639922" opacity="0.95" />
        <circle cx="50" cy="50" r="12" fill="#1A6640" opacity="0.8" />
        <circle cx="50" cy="50" r="6" fill="#3B6D11" />
        <circle cx="22" cy="54" r="8" fill="#639922" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'av7',
    label: 'Coral Burst',
    render: (size = 72) => (
      <svg width={size} height={size} viewBox="0 0 72 72" style={{ borderRadius: '50%', display: 'block' }}>
        <circle cx="36" cy="36" r="36" fill="#1A0800" />
        {[0,30,60,90,120,150,180,210,240,270,300,330].map((angle, i) => {
          const r1 = 14, r2 = 30;
          const a = (angle * Math.PI) / 180;
          const x1 = 36 + r1 * Math.cos(a);
          const y1 = 36 + r1 * Math.sin(a);
          const x2 = 36 + r2 * Math.cos(a);
          const y2 = 36 + r2 * Math.sin(a);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D85A30" strokeWidth={i % 2 === 0 ? "3" : "1.5"} strokeLinecap="round" opacity={i % 2 === 0 ? "0.9" : "0.6"} />;
        })}
        <circle cx="36" cy="36" r="12" fill="#993C1D" />
        <circle cx="36" cy="36" r="6" fill="#D85A30" />
      </svg>
    ),
  },
  {
    id: 'av8',
    label: 'Pink Diamond',
    render: (size = 72) => (
      <svg width={size} height={size} viewBox="0 0 72 72" style={{ borderRadius: '50%', display: 'block' }}>
        <circle cx="36" cy="36" r="36" fill="#1A0410" />
        <rect x="24" y="24" width="24" height="24" rx="2" fill="#D4537E" transform="rotate(45 36 36)" />
        <rect x="28" y="28" width="16" height="16" rx="1" fill="#ED93B1" transform="rotate(45 36 36)" opacity="0.7" />
        <rect x="32" y="32" width="8" height="8" rx="1" fill="#FBEAF0" transform="rotate(45 36 36)" opacity="0.9" />
        <circle cx="36" cy="10" r="4" fill="#D4537E" opacity="0.7" />
        <circle cx="36" cy="62" r="4" fill="#D4537E" opacity="0.7" />
        <circle cx="10" cy="36" r="4" fill="#D4537E" opacity="0.7" />
        <circle cx="62" cy="36" r="4" fill="#D4537E" opacity="0.7" />
      </svg>
    ),
  },
];

// Auto-assign avatar from UID if user hasn't picked one
export function getAutoAvatar(uid = '') {
  const index = uid ? uid.charCodeAt(0) % AVATARS.length : 0;
  return AVATARS[index];
}

// Get avatar by id
export function getAvatarById(id) {
  return AVATARS.find(a => a.id === id) || AVATARS[0];
}
