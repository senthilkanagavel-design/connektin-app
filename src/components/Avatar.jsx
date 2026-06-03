import React from 'react';
import { avatars } from './avatars';

const getRingColor = (role, plan, inCircle) => {
  if (inCircle)            return '#0D9488'; // teal — circle bond overrides all
  if (role === 'admin')    return '#9333EA'; // purple
  if (plan === 'thermite') return '#0D9488'; // teal
  if (plan === 'regular')  return '#B8860B'; // gold
  return '#9CA3AF';                          // grey (trial)
};

const getAdminBadge = (role) => role === 'admin' ? '🛡️' : null;

const getReadBadge = (totalReads) => {
  if (totalReads >= 30) return '🏆';
  if (totalReads >= 15) return '⭐';
  if (totalReads >= 5)  return '📖';
  return null;
};

export default function Avatar({ uid, photoURL, avatarId, displayName, plan = 'trial', role = 'participant', readCount = 0, size = 44, onCamera, inCircle = false, onPress }) {
  const ringColor  = getRingColor(role, plan, inCircle);
  const badge      = getAdminBadge(role) || getReadBadge(readCount);
  const AvatarSVG  = avatarId && avatars?.[avatarId] ? avatars[avatarId] : null;
  const badgeSize  = Math.max(14, size * 0.28);
  const camSize    = Math.max(14, size * 0.26);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} onClick={onPress || undefined}>
      {/* Ring */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `3px solid ${ringColor}`,
        zIndex: 1, pointerEvents: 'none'
      }} />

      {/* Photo / SVG Avatar / Fallback */}
      <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: '#E4E2DC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {photoURL ? (
          <img key={photoURL} src={photoURL} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : AvatarSVG ? (
          <AvatarSVG style={{ width: '70%', height: '70%' }} />
        ) : (
          <span style={{ fontSize: size * 0.4, color: '#0A1628', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', userSelect: 'none' }}>
            {displayName ? displayName[0].toUpperCase() : uid ? uid[0].toUpperCase() : '?'}
          </span>
        )}
      </div>

      {/* ∞ Circle bond badge — bottom right (overrides read badge) */}
      {inCircle ? (
        <span style={{
          position: 'absolute', bottom: -3, right: -3,
          background: '#0D9488', color: '#fff',
          fontSize: Math.max(9, size * 0.22), fontWeight: 700,
          borderRadius: '50%', width: badgeSize, height: badgeSize,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, zIndex: 2, border: '1.5px solid #fff',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          ∞
        </span>
      ) : badge ? (
        <span style={{ position: 'absolute', bottom: -3, right: -3, fontSize: badgeSize, lineHeight: 1, zIndex: 2 }}>
          {badge}
        </span>
      ) : null}

      {/* Camera — bottom left */}
      {onCamera && (
        <button
          onClick={onCamera}
          style={{ position: 'absolute', bottom: -3, left: -3, background: '#fff', border: '1.5px solid #E4E2DC', borderRadius: '50%', width: camSize + 6, height: camSize + 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: camSize * 0.85, zIndex: 2, padding: 0 }}
          aria-label="Change profile photo"
        >
          📷
        </button>
      )}
    </div>
  );
}
