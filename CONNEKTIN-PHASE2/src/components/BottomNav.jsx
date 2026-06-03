// src/components/BottomNav.jsx

const TEAL = '#0D9488';

const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? TEAL : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
          fill={active ? 'rgba(13,148,136,0.12)' : 'none'} />
      </svg>
    ),
  },
  {
    id: 'posts',
    label: 'Posts',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? TEAL : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          fill={active ? 'rgba(13,148,136,0.12)' : 'none'} />
      </svg>
    ),
  },
  {
    id: 'articles',
    label: 'Articles',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? TEAL : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          fill={active ? 'rgba(13,148,136,0.12)' : 'none'} />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    id: 'jobs',
    label: 'Jobs',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? TEAL : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"
          fill={active ? 'rgba(13,148,136,0.12)' : 'none'} />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Me',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? TEAL : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" fill={active ? 'rgba(13,148,136,0.12)' : 'none'} />
      </svg>
    ),
  },
];

export default function BottomNav({ activeTab, setActiveTab }) {
  function handleTabClick(id) {
    setActiveTab(id);
    // Scroll to top on every tab switch
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <style>{`
        @keyframes navTap {
          0% { transform: scale(0.9); }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 8px 4px 10px;
          cursor: pointer;
          border: none;
          background: none;
          -webkit-tap-highlight-color: transparent;
          position: relative;
        }
        .nav-item.active .nav-icon {
          animation: navTap 0.2s ease;
        }
        .nav-label {
          font-size: 10px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.02em;
          transition: color 0.15s ease;
        }
        .nav-dot {
          position: absolute;
          top: 6px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #0D9488;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
      `}</style>

      <nav style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => handleTabClick(item.id)}
              aria-label={item.label}
            >
              <span
                className="nav-dot"
                style={{ opacity: isActive ? 1 : 0, transform: isActive ? 'scale(1)' : 'scale(0)' }}
              />
              <span className="nav-icon">{item.icon(isActive)}</span>
              <span
                className="nav-label"
                style={{ color: isActive ? '#0D9488' : '#9CA3AF' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '64px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #E4E2DC',
    display: 'flex',
    alignItems: 'stretch',
    zIndex: 100,
    boxShadow: '0 -1px 8px rgba(0,0,0,0.06)',
  },
};
