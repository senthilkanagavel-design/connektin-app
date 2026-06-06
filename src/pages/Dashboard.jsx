// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import PulseButton from '../components/PulseButton';
import HomeTab from './tabs/HomeTab';
import ArticlesTab from './tabs/ArticlesTab';
import JobsTab from './tabs/JobsTab';
import PostsTab from './tabs/PostsTab';
import ProfileTab from './tabs/ProfileTab';
import CompaniesTab from './tabs/CompaniesTab';

const INDUSTRY_LABELS = {
  medical_billing:        'Medical Billing',
  medical_coding:         'Medical Coding',
  medical_coding_billing: 'Medical Coding & Billing',
  healthcare:             'Healthcare',
  information_technology: 'Information Technology',
  banking_finance:        'Banking & Finance',
  education:              'Education',
  manufacturing:          'Manufacturing',
  real_estate:            'Real Estate',
  media_entertainment:    'Media & Entertainment',
  hospitality_travel:     'Hospitality & Travel',
};

function getGreeting(displayName) {
  const hour = new Date().getHours();
  const time = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (displayName || 'there').trim().split(' ')[0];
  return `${time}, ${firstName}!`;
}

const DAILY_FOCUS = [
  "Build your professional story.",
  "Connect with someone new today.",
  "Share your expertise with the community.",
  "Read something that sharpens your edge.",
  "Update your profile — your next opportunity is looking.",
  "Engage with a post that inspires you.",
  "Celebrate a colleague's achievement today.",
  "Take one step closer to your next career goal.",
  "Your next big break could be one connection away.",
  "Show up for your career — it starts here.",
  "Learn something new and share it forward.",
  "A strong network is your greatest career asset.",
  "Make your presence felt in your community today.",
  "One conversation today could open a door tomorrow.",
  "Invest in yourself — the returns are lifelong.",
  "Your skills deserve to be seen. Share them today.",
  "Growth happens outside your comfort zone.",
  "Be the professional you aspire to work with.",
  "Small consistent steps lead to big career leaps.",
  "Your story is worth telling — start today.",
  "Opportunities favour those who stay connected.",
  "Add value to someone's journey today.",
  "The best time to grow your network is right now.",
  "Let your work speak — share it with the world.",
  "Stay curious, stay relevant, stay ahead.",
  "Every expert was once a beginner — keep going.",
  "Your next mentor could be one post away.",
  "Build bridges today that carry you forward tomorrow.",
  "Consistency in growth is the real career hack.",
  "You are closer to your goal than you were yesterday.",
];

const DAILY_FOCUS_RECRUITER = [
  "Find your next great hire today.",
  "A great job post attracts great talent.",
  "Your next shortlist is one search away.",
  "Build relationships before you need them.",
  "The best candidates are already on ConnektIn.",
  "One meaningful connection can fill your next role.",
  "A strong employer brand starts with engagement.",
  "Reach out to a promising profile today.",
  "Great hiring starts with great listening.",
  "Your talent pipeline grows one connection at a time.",
  "Post a job that stands out from the crowd.",
  "The right hire is worth every effort.",
  "Engage with the community — talent notices.",
  "Speed and empathy win the best candidates.",
  "Today's connection is tomorrow's great hire.",
  "Share what makes your team a great place to work.",
  "The best talent is often not actively looking — connect anyway.",
  "A thoughtful message opens more doors than a template.",
  "Build your employer presence — one post at a time.",
  "Great recruiters are great storytellers.",
  "Talent is everywhere — your job is to find it.",
  "Follow up with a candidate today — it matters.",
  "Make someone's career journey easier today.",
  "Your next hire could already be following you.",
  "Consistency in outreach is the real hiring hack.",
  "A diverse pipeline starts with an open mind.",
  "Celebrate a successful placement — inspire others.",
  "The best job descriptions speak to people, not positions.",
  "Stay active — top candidates notice who engages.",
  "Every great team started with one great hire.",
];

function getDailyFocus(role) {
  const index = (new Date().getDate() - 1) % 30;
  return role === 'recruiter' ? DAILY_FOCUS_RECRUITER[index] : DAILY_FOCUS[index];
}

function getDaysLeft(createdAt) {
  if (!createdAt) return 7;
  const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const end = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
  const diff = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// ── Avatar — profile photo or initials fallback ──────────────────
function UserAvatar({ userData, size = 32, onClick }) {
  const photoURL    = userData?.photoURL;
  const displayName = userData?.displayName || '';
  const initials    = displayName.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  const style = {
    width: size, height: size,
    borderRadius: '50%',
    border: '1.5px solid rgba(13,148,136,0.5)',
    flexShrink: 0,
    cursor: 'pointer',
    overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  if (photoURL) {
    return (
      <div style={style} onClick={onClick}>
        <img
          src={photoURL}
          alt={displayName}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>
    );
  }

  return (
    <div style={{ ...style, background: 'linear-gradient(135deg,#0D9488,#0A7A70)' }} onClick={onClick}>
      <span style={{ fontSize: size * 0.35, fontWeight: 700, color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
        {initials}
      </span>
    </div>
  );
}

// ── Quick Access Sheet — own profile ─────────────────────────────
function QuickAccessSheet({ userData, onClose, navigate, isTrial, daysLeft }) {
  const displayName = userData?.displayName || 'User';
  const email       = userData?.email || '';
  const plan        = userData?.plan || 'trial';
  const role        = userData?.role || 'participant';
  const industry    = userData?.industry
    ? INDUSTRY_LABELS[userData.industry] || userData.industry.replace(/_/g, ' ')
    : '—';

  const planConfig = {
    trial:    { label: `Free Trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`, color: '#B45309', bg: '#FEF3C7', icon: '⏱' },
    thermite: { label: 'Thermite Member',  color: '#0D9488', bg: '#E6FAF8', icon: '✦' },
    regular:  { label: 'Regular Member',   color: '#0A1628', bg: '#E8EAF0', icon: '●' },
  }[plan] || { label: plan, color: '#666', bg: '#F3F2EF', icon: '●' };

  const handleLogout = async () => {
    onClose();
    await signOut(auth);
    navigate('/login');
  };

  const menuItems = [
    {
      icon: '👤',
      iconBg: '#F0FDFB',
      iconColor: '#0D9488',
      title: 'View Profile',
      sub: 'See your public profile',
      onClick: () => { onClose(); navigate(`/profile/${userData?.uid}`); },
    },
    {
      icon: '⚙️',
      iconBg: '#F8F6FF',
      iconColor: '#7C3AED',
      title: 'Settings',
      sub: 'Notifications, privacy, account',
      onClick: () => { onClose(); navigate('/settings'); },
    },
    ...(isTrial ? [{
      icon: '👑',
      iconBg: '#F0FDFB',
      iconColor: '#0D9488',
      title: 'Upgrade to Thermite',
      sub: '₹49/month · Unlock everything',
      onClick: () => { onClose(); navigate('/subscribe'); },
    }] : []),
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }}
      />
      {/* Sheet */}
      <div style={qs.sheet}>
        {/* Handle */}
        <div style={qs.handle} />

        {/* Profile summary */}
        <div style={qs.profileRow}>
          <UserAvatar userData={userData} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={qs.name}>{displayName}</div>
            <div style={qs.industry}>{industry}</div>
            <div style={{ ...qs.planPill, background: planConfig.bg, color: planConfig.color }}>
              {planConfig.icon} {planConfig.label}
            </div>
          </div>
        </div>

        <div style={qs.divider} />

        {/* Menu items */}
        {menuItems.map((item, i) => (
          <div key={i} style={qs.menuItem} onClick={item.onClick}>
            <div style={{ ...qs.menuIcon, background: item.iconBg }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={qs.menuTitle}>{item.title}</div>
              <div style={qs.menuSub}>{item.sub}</div>
            </div>
            <span style={qs.menuArrow}>›</span>
          </div>
        ))}

        <div style={qs.divider} />

        {/* Sign out */}
        <div style={qs.menuItem} onClick={handleLogout}>
          <div style={{ ...qs.menuIcon, background: '#FEF2F2' }}>
            <span style={{ fontSize: 16 }}>🚪</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...qs.menuTitle, color: '#DC2626' }}>Sign Out</div>
            <div style={qs.menuSub}>See you soon</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Top Bar ───────────────────────────────────────────────────────
function TopBar({ isTrial, daysLeft, onUpgrade, userData, activeTab, onAvatarClick }) {
  const role     = userData?.role || 'participant';
  const isAdmin  = role === 'admin';
  const greeting = getGreeting(userData?.displayName);
  const showFocus = !isAdmin && activeTab !== 'profile';
  const focus     = showFocus ? getDailyFocus(role) : null;

  const isUrgent  = daysLeft <= 2;
  const isExpired = daysLeft === 0;

  const trialProgress  = Math.min(100, Math.max(0, (daysLeft / 7) * 100));
  const progressColor  = isExpired ? '#EF4444' : isUrgent ? '#F97316' : '#5EEAD4';
  const trialMsg       = isExpired ? 'Trial ended' : isUrgent ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : `${daysLeft} days left`;
  const upgradeBtnColor = isExpired ? '#DC2626' : isUrgent ? '#EA580C' : '#0D9488';

  return (
    <div style={tb.wrap}>
      <div style={tb.bar}>
        <img src="/icon-512.png" alt="ConnektIn" style={tb.logoImg} />
        <div style={tb.center}>
          <div style={tb.greeting}>{greeting} 👋</div>
          {focus && <div style={{ ...tb.focus, color: '#A7F3D0', fontSize: 12 }}>{focus}</div>}
        </div>
        <div style={tb.right}>
          <div style={tb.bellWrap}>
            <PulseButton />
            <div style={tb.bellDot} />
          </div>
          {/* Tappable avatar */}
          <UserAvatar userData={userData} size={32} onClick={onAvatarClick} />
        </div>
      </div>

      {isTrial && (
        <div style={tb.trialStrip}>
          <div style={tb.trialLeft}>
            <div style={tb.progressBg}>
              <div style={{ ...tb.progressFill, width: `${trialProgress}%`, background: progressColor }} />
            </div>
            <span style={{ ...tb.trialText, color: isExpired ? '#EF4444' : isUrgent ? '#F97316' : 'rgba(255,255,255,0.85)' }}>
              <strong style={{ color: isExpired ? '#EF4444' : isUrgent ? '#FB923C' : '#5EEAD4' }}>{trialMsg}</strong>{!isExpired && ' in trial'}
            </span>
          </div>
          <button
            onClick={onUpgrade}
            style={{ ...tb.trialBtn, background: upgradeBtnColor, borderColor: upgradeBtnColor, color: '#fff' }}
          >
            {isExpired ? 'Subscribe →' : 'Upgrade →'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, profile: authProfile } = useAuth();
  const location = useLocation();
  const [activeTab,     setActiveTab]     = useState(location.state?.tab || 'home');
  const [userData,      setUserData]      = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [quickSheetOpen, setQuickSheetOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.tab) setActiveTab(location.state.tab);
  }, [location.state?.tab]);

  useEffect(() => {
    if (!user) return;
    const unsubDoc = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) setUserData(snap.data());
        setLoading(false);
      },
      (err) => { console.error('Error listening to user:', err); setLoading(false); }
    );
    return () => unsubDoc();
  }, [user]);

  if (loading && !authProfile) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  const effectiveUserData = userData || authProfile;
  const isTrial   = effectiveUserData?.plan === 'trial' && effectiveUserData?.userType !== 'recruiter';
  const daysLeft  = getDaysLeft(effectiveUserData?.createdAt);
  const isExpiredTrial = isTrial && daysLeft === 0;
  const topPadding = isTrial ? '94px' : '56px';

  // Full block for expired trial
  if (isExpiredTrial) {
    return (
      <div style={{ minHeight: '100dvh', background: '#F3F2EF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E4E2DC', padding: '32px 24px', maxWidth: 400, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <img src="/icon-512.png" alt="ConnektIn" style={{ width: 64, height: 64, borderRadius: 16 }} />
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>⏰</div>
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0A1628' }}>Your free trial has ended</h2>
            <p style={{ margin: 0, fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>Subscribe to continue accessing ConnektIn — articles, jobs, community, games and more.</p>
          </div>
          <div style={{ background: '#F0FDFB', border: '1px solid #99F6E4', borderRadius: 12, padding: '14px 16px', width: '100%', textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0D9488', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>What you unlock</div>
            {['All Beginner, Intermediate & Advanced articles', 'Apply to jobs in your industry', 'Like, comment & engage with posts', 'Weekly games & signal points', 'Full community access'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: 13, color: '#374151' }}>
                <span style={{ color: '#0D9488', fontSize: 14, flexShrink: 0 }}>✓</span> {item}
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/plan-select')}
            style={{ width: '100%', padding: '14px', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 24, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            Subscribe Now →
          </button>
          <button
            onClick={async () => { await signOut(auth); navigate('/login'); }}
            style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const tabComponents = {
    home:     HomeTab,
    posts:    PostsTab,
    articles: ArticlesTab,
    jobs:     JobsTab,
    companies: CompaniesTab,
    profile:  ProfileTab,
  };
  const ActiveComponent = tabComponents[activeTab] || HomeTab;

  return (
    <div style={styles.container}>
      <TopBar
        isTrial={isTrial}
        daysLeft={daysLeft}
        onUpgrade={() => navigate('/subscribe')}
        userData={effectiveUserData}
        activeTab={activeTab}
        onAvatarClick={() => setQuickSheetOpen(true)}
      />

      <div style={{ ...styles.content, paddingTop: topPadding }}>
        <ActiveComponent
          userData={effectiveUserData}
          isTrial={isTrial}
          daysLeft={daysLeft}
          onUpgrade={() => navigate('/subscribe')}
        />
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Quick access sheet */}
      {quickSheetOpen && (
        <QuickAccessSheet
          userData={effectiveUserData}
          onClose={() => setQuickSheetOpen(false)}
          navigate={navigate}
          isTrial={isTrial}
          daysLeft={daysLeft}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const tb = {
  wrap: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99 },
  bar: {
    background: '#0A1628',
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '11px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logoImg: { width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 },
  center:  { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 },
  greeting: { fontSize: 14, fontWeight: 700, color: '#ffffff', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  focus:    { fontSize: 11, color: 'rgba(255,255,255,0.42)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: 'italic' },
  right:    { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  bellWrap: { position: 'relative', width: 32, height: 32, flexShrink: 0 },
  bellDot:  { position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#0D9488', border: '1.5px solid #0A1628', pointerEvents: 'none' },
  trialStrip: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 16px', background: '#0A1628', borderTop: '1px solid rgba(255,255,255,0.05)', gap: 10 },
  trialLeft:  { display: 'flex', alignItems: 'center', gap: 8 },
  progressBg: { width: 72, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 },
  progressFill: { height: '100%', borderRadius: 2, transition: 'width 0.4s ease' },
  trialText:  { fontSize: 11, fontFamily: 'DM Sans, sans-serif', lineHeight: 1 },
  trialBtn:   { flexShrink: 0, fontSize: 11, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', padding: '5px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', letterSpacing: '0.02em' },
};

const qs = {
  sheet: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    zIndex: 201,
    paddingBottom: 32,
    boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
    fontFamily: 'DM Sans, sans-serif',
  },
  handle: { width: 36, height: 3, background: '#E4E2DC', borderRadius: 2, margin: '12px auto 0' },
  profileRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '16px 20px 14px',
  },
  name:     { fontSize: 16, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.3px' },
  industry: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  planPill: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    borderRadius: 20, padding: '3px 10px',
    fontSize: 10, fontWeight: 700,
    marginTop: 6,
  },
  divider: { height: 1, background: '#F3F2EF', margin: '2px 0' },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '13px 20px',
    cursor: 'pointer',
  },
  menuIcon: {
    width: 38, height: 38, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  menuTitle: { fontSize: 14, fontWeight: 600, color: '#0A1628' },
  menuSub:   { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  menuArrow: { fontSize: 20, color: '#D1D5DB', lineHeight: 1 },
};

const styles = {
  container:   { position: 'relative', minHeight: '100dvh', backgroundColor: '#F6F8FA', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' },
  content:     { paddingBottom: '80px' },
  loadingScreen: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', backgroundColor: '#F6F8FA', gap: '16px' },
  spinner:     { width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTop: '3px solid #0EA5E9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { color: '#64748B', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", margin: 0 },
};
