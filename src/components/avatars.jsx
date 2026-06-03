// src/components/avatars.jsx
// 8 abstract SVG avatars — av1 through av8

const Av1 = ({ style }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <circle cx="32" cy="32" r="32" fill="#DBEAFE" />
    <circle cx="32" cy="26" r="10" fill="#3B82F6" />
    <ellipse cx="32" cy="50" rx="16" ry="10" fill="#3B82F6" opacity="0.6" />
    <circle cx="32" cy="26" r="6" fill="#BFDBFE" />
  </svg>
);

const Av2 = ({ style }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <circle cx="32" cy="32" r="32" fill="#D1FAE5" />
    <rect x="20" y="16" width="24" height="24" rx="12" fill="#10B981" />
    <rect x="16" y="44" width="32" height="12" rx="6" fill="#10B981" opacity="0.6" />
    <circle cx="32" cy="28" r="6" fill="#A7F3D0" />
  </svg>
);

const Av3 = ({ style }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <circle cx="32" cy="32" r="32" fill="#FEF3C7" />
    <polygon points="32,14 44,38 20,38" fill="#F59E0B" />
    <ellipse cx="32" cy="50" rx="14" ry="8" fill="#F59E0B" opacity="0.6" />
    <circle cx="32" cy="29" r="5" fill="#FDE68A" />
  </svg>
);

const Av4 = ({ style }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <circle cx="32" cy="32" r="32" fill="#EDE9FE" />
    <rect x="22" y="14" width="20" height="20" rx="4" fill="#7C3AED" transform="rotate(15 32 24)" />
    <ellipse cx="32" cy="50" rx="15" ry="9" fill="#7C3AED" opacity="0.6" />
    <circle cx="32" cy="26" r="5" fill="#DDD6FE" />
  </svg>
);

const Av5 = ({ style }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <circle cx="32" cy="32" r="32" fill="#FFE4E6" />
    <circle cx="32" cy="26" r="11" fill="#F43F5E" />
    <path d="M18 52 Q32 40 46 52" stroke="#F43F5E" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.6" />
    <circle cx="32" cy="26" r="5" fill="#FECDD3" />
  </svg>
);

const Av6 = ({ style }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <circle cx="32" cy="32" r="32" fill="#E0F2FE" />
    <path d="M32 14 L46 28 L40 46 L24 46 L18 28 Z" fill="#0284C7" />
    <ellipse cx="32" cy="50" rx="13" ry="7" fill="#0284C7" opacity="0.5" />
    <circle cx="32" cy="30" r="5" fill="#BAE6FD" />
  </svg>
);

const Av7 = ({ style }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <circle cx="32" cy="32" r="32" fill="#FDF4FF" />
    <circle cx="32" cy="24" r="12" fill="#A855F7" />
    <path d="M20 50 Q32 42 44 50 Q44 58 20 58 Z" fill="#A855F7" opacity="0.6" />
    <circle cx="32" cy="24" r="5" fill="#E9D5FF" />
    <circle cx="26" cy="20" r="3" fill="#C4B5FD" />
    <circle cx="38" cy="20" r="3" fill="#C4B5FD" />
  </svg>
);

const Av8 = ({ style }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <circle cx="32" cy="32" r="32" fill="#FFF7ED" />
    <rect x="20" y="14" width="24" height="26" rx="12" fill="#EA580C" />
    <ellipse cx="32" cy="50" rx="14" ry="8" fill="#EA580C" opacity="0.6" />
    <circle cx="32" cy="27" r="5" fill="#FDBA74" />
    <circle cx="26" cy="23" r="2.5" fill="#FED7AA" />
    <circle cx="38" cy="23" r="2.5" fill="#FED7AA" />
  </svg>
);

export const avatars = {
  av1: Av1,
  av2: Av2,
  av3: Av3,
  av4: Av4,
  av5: Av5,
  av6: Av6,
  av7: Av7,
  av8: Av8,
};
