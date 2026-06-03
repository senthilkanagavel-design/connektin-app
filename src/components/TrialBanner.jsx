// src/components/TrialBanner.jsx
import PulseButton from './PulseButton';

export default function TrialBanner({ daysLeft, onUpgrade }) {
  const isUrgent  = daysLeft <= 2;
  const isExpired = daysLeft === 0;

  const bgColor     = isExpired ? '#FEF2F2' : isUrgent ? '#FFF7ED' : '#F0FDFB';
  const borderColor = isExpired ? '#FECACA' : isUrgent ? '#FED7AA' : '#99F6E4';
  const textColor   = isExpired ? '#DC2626' : isUrgent ? '#EA580C' : '#0F6E56';
  const dotColor    = isExpired ? '#EF4444' : isUrgent ? '#F97316' : '#0D9488';
  const btnColor    = isExpired ? '#DC2626' : isUrgent ? '#EA580C' : '#0D9488';

  const message = isExpired
    ? 'Your free trial has ended.'
    : isUrgent
    ? `Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your trial!`
    : `${daysLeft} days left in your free trial`;

  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        .trial-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 99;
          padding: 8px 12px 8px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-bottom: 1px solid ${borderColor};
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .upgrade-btn {
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          padding: 6px 14px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: transform 0.15s ease, opacity 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .upgrade-btn:active {
          transform: scale(0.95);
          opacity: 0.85;
        }
      `}</style>

      <div className="trial-banner" style={{ backgroundColor: bgColor }}>
        {/* Left: trial message */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: dotColor, flexShrink: 0,
            animation: isUrgent || isExpired ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
          }} />
          <span style={{
            fontSize: '13px', fontWeight: '500',
            fontFamily: "'DM Sans', sans-serif",
            color: textColor,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {message}
          </span>
        </div>

        {/* Right: Pulse button + Upgrade button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <PulseButton />
          <button
            className="upgrade-btn"
            onClick={onUpgrade}
            style={{ backgroundColor: btnColor, color: '#FFFFFF' }}
          >
            {isExpired ? 'Subscribe Now' : 'Upgrade'}
          </button>
        </div>
      </div>
    </>
  );
}
