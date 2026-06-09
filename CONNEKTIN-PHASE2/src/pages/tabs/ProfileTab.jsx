// src/pages/tabs/ProfileTab.jsx
import { useState, useEffect } from 'react';
import { addSignal, SIGNAL_POINTS, getSignalBar } from '../../utils/signal';
import { useSignalRank } from '../../hooks/useSignalRank';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, increment, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/Avatar';
import ProfilePhotoSheet from '../../components/ProfilePhotoSheet';
import AvatarFullView from '../../components/AvatarFullView';

export default function ProfileTab({ userData, isTrial, onUpgrade }) {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localData, setLocalData] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  // ── NEW ──────────────────────────────────────────────────────────────────
  const [showFullView, setShowFullView] = useState(false);
  // ─────────────────────────────────────────────────────────────────────────

  const profile     = { ...userData, ...liveData, ...localData };
  const displayName = profile?.displayName || 'User';
  const email       = profile?.email || '';
  // Support both old single industry and new industries array
  const myIndustries = profile?.industries || (profile?.industry ? [profile.industry] : []);
  const industry    = profile?.industry
    ? profile.industry.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : '—';
  const plan        = profile?.plan || 'trial';
  const role        = profile?.role || 'participant';
  const bio         = profile?.bio || '';
  const totalRead   = Object.values(profile?.readCounts || {}).reduce((a, b) => a + b, 0);
  const isAdmin     = role === 'admin';
  const isLocked    = plan === 'trial' && profile?.userType !== 'recruiter';
  const isPaid      = plan === 'thermite' || plan === 'regular';

  const circleCount    = profile?.circleCount    || 0;
  const circlingCount  = profile?.circlingCount  || 0;
  const profileViews   = profile?.profileViews   || 0;
  const jobsViewed     = profile?.jobsViewed     || 0;
  const circleRequests = profile?.circleRequests || [];

  const weeklySignal  = liveData?.weeklySignal  ?? profile?.weeklySignal  ?? 0;
  const monthlySignal = liveData?.monthlySignal ?? profile?.monthlySignal ?? 0;
  const weeklyBar     = getSignalBar(weeklySignal);
  const monthlyBar    = getSignalBar(monthlySignal);
  const { weeklyRank, monthlyRank, totalInIndustry } = useSignalRank(profile?.uid, profile?.industry);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', profile.uid), (snap) => {
      if (snap.exists()) setLiveData(snap.data());
    });
    return () => unsub();
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.uid || !isPaid) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', profile.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      let total = 0;
      snap.docs.forEach(d => { total += d.data()[`unreadCount_${profile.uid}`] || 0; });
      setUnreadMessages(total);
    });
    return () => unsub();
  }, [profile?.uid, isPaid]);

  const planConfig = {
    trial:    { label: 'Free Trial',    color: '#92400E', bg: '#FEF3C7', border: '#FCD34D', dot: '#F59E0B' },
    thermite: { label: 'TherMite Plan', color: '#0F766E', bg: '#CCFBF1', border: '#5EEAD4', dot: '#0D9488' },
    regular:  { label: 'Regular Plan',  color: '#374151', bg: '#F1F5F9', border: '#CBD5E1', dot: '#64748B' },
    recruiter:{ label: 'Recruiter',     color: '#92400E', bg: '#FEF3C7', border: '#FCD34D', dot: '#F59E0B' },
  }[plan] || { label: plan, color: '#374151', bg: '#F1F5F9', border: '#CBD5E1', dot: '#64748B' };

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  const handleAccept = async (uid) => {
    if (!profile?.uid) return;
    const myRef = doc(db, 'users', profile.uid);
    const theirRef = doc(db, 'users', uid);
    await updateDoc(myRef, { circleRequests: arrayRemove(uid), circleMembers: arrayUnion(uid), circleCount: increment(1) });
    await updateDoc(theirRef, { circling: arrayUnion(profile.uid), circlingCount: increment(1), circleSent: arrayRemove(profile.uid) });
    await addDoc(collection(db, 'notifications'), {
      uid: uid, type: 'circle_accept', group: 'circle',
      fromUid: profile.uid, fromName: profile.displayName || 'Someone',
      fromPhoto: profile.photoURL || null,
      message: 'accepted your Circle request',
      read: false, createdAt: serverTimestamp(),
    });
    await addSignal(profile.uid, SIGNAL_POINTS.CIRCLE_ACCEPTED);
    await addSignal(uid, SIGNAL_POINTS.CIRCLE_ACCEPTED);
  };

  const handleDecline = async (uid) => {
    if (!profile?.uid) return;
    await updateDoc(doc(db, 'users', profile.uid), { circleRequests: arrayRemove(uid) });
  };

  return (
    <div style={s.page}>

      {/* Sticky Top Bar */}
      <div style={s.topBar}>
        <span style={s.topBarTitle}>My Profile</span>
        <div style={s.topBarActions}>
          <button style={s.topBarBtn} onClick={() => setSettingsOpen(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Settings
          </button>
          <button style={s.topBarLogout} onClick={handleLogout}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </div>

      {settingsOpen && (
        <SettingsSheet onClose={() => setSettingsOpen(false)} isLocked={isLocked} onUpgrade={onUpgrade} navigate={navigate} />
      )}

      {sheetOpen && (
        <ProfilePhotoSheet
          uid={profile?.uid} profile={profile}
          onClose={() => setSheetOpen(false)}
          onUpdated={(changes) => setLocalData(prev => ({ ...prev, ...changes }))}
        />
      )}

      {/* Navy Hero Band */}
      <div style={s.heroBand} />

      {/* Hero Card */}
      <div style={s.heroCard}>
        <div style={s.avatarWrap}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* ── NEW: tap avatar to open full view if real photo exists ── */}
            <div
              onClick={() => { if (profile?.photoURL) setShowFullView(true); }}
              style={{ cursor: profile?.photoURL ? 'zoom-in' : 'default' }}
            >
              <Avatar
                uid={profile?.uid} photoURL={profile?.photoURL}
                avatarId={profile?.avatarId || profile?.avatar}
                displayName={displayName} plan={plan} role={role}
                readCount={totalRead} size={84}
                onCamera={() => setSheetOpen(true)}
              />
            </div>
            {/* ─────────────────────────────────────────────────────────── */}
          </div>
        </div>

        <div style={s.heroBody}>
          <h2 style={s.name}>{displayName}</h2>
          {/* ── Industry pills ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginBottom: 8 }}>
            {myIndustries.length > 0 ? myIndustries.map(ind => (
              <span key={ind} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#E6FAF8', color: '#0F6E56', border: '1px solid #99F6E4', fontFamily: 'DM Sans, sans-serif' }}>
                {ind.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            )) : (
              <span style={{ fontSize: 13, color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>{industry}</span>
            )}
          </div>
          {/* ─────────────────── */}
          {bio ? <p style={s.bio}>{bio}</p> : null}
          <div style={s.planRow}>
            <span style={{ ...s.planBadge, backgroundColor: planConfig.bg, color: planConfig.color, border: `1px solid ${planConfig.border}` }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: planConfig.dot, display: 'inline-block', marginRight: 6 }} />
              {planConfig.label}
            </span>
          </div>
        </div>

        {/* Signal Card */}
        <div style={s.signalCard}>
          <div style={s.signalLeft}>
            <div style={s.signalLabel}>Your Signal</div>
            <div style={s.signalBars}>
              {[1,2,3,4,5].map(b => (
                <div key={b} style={{
                  width: 10,
                  height: 8 + (b * 6),
                  borderRadius: 3,
                  background: b <= weeklyBar.bars ? '#0D9488' : '#2A4A7F',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
            <div style={s.signalSub}>{weeklyBar.label} · Monthly: {monthlyRank ? `#${monthlyRank}` : '—'}</div>
          </div>
          <div style={s.signalRight}>
            <div style={s.signalRank}>
              {weeklyRank ? `#${weeklyRank} of ${totalInIndustry}` : '—'}
            </div>
            <div style={s.signalRankLabel}>Community rank</div>
          </div>
        </div>

        {/* Stats Strip */}
        <div style={s.statsStrip}>
          <StatCell value={circleCount}   label="In your Circle"    color="#0D9488" />
          <div style={s.stripDiv} />
          <StatCell value={circlingCount} label="Circles you're in" color="#0A1628" />
          <div style={s.stripDiv} />
          <StatCell value={totalRead}     label="Articles Read"     color="#F59E0B" />
        </div>

        {/* Action Buttons */}
        <div style={s.actionRow}>
          <button style={s.btnPrimary} onClick={() => navigate('/my-circle')}>
            <span style={{ fontSize: 16, marginRight: 6, fontWeight: 700 }}>∞</span>
            View My Circle
          </button>
          <button style={s.btnOutline} onClick={() => {
            if (navigator.share) navigator.share({ title: displayName, text: `Check out ${displayName} on ConnektIn`, url: window.location.origin });
            else { navigator.clipboard.writeText(window.location.origin); alert('Link copied!'); }
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share Profile
          </button>
        </div>
      </div>

      {/* Wall of Fame */}
      <div style={s.wofCard} onClick={() => navigate('/wall-of-fame', { state: { from: 'profile' } })}>
        <div>
          <div style={s.wofMeta}>Community</div>
          <div style={s.wofTitle}>🏆 Wall of Fame</div>
          <div style={s.wofSub}>See top signal earners in your industry</div>
        </div>
        <div style={s.wofBtn}>View →</div>
      </div>

      {/* Certificate Hero Card */}
      <div style={s.certCard} onClick={() => navigate('/certificate')}>
        <div style={s.certCardLeft}>
          <div style={s.certCardMeta}>🏅 My Achievement</div>
          <div style={s.certCardTitle}>
            {plan === 'thermite' || plan === 'regular'
              ? 'View My Certificate'
              : 'View Sample Certificate'}
          </div>
          <div style={s.certCardSub}>
            {plan === 'thermite' || plan === 'regular'
              ? 'Your 90-day professional certificate'
              : 'Preview your certificate — earn it in 90 days'}
          </div>
        </div>
        <div style={s.certCardBtn}>View →</div>
      </div>

      {/* Upgrade Banner — trial only */}
      {isTrial && (
        <div style={s.upgradeBanner}>
          <div style={s.upgradeLeft}>
            <p style={s.upgradeTitle}>You're on a free trial</p>
            <p style={s.upgradeSub}>Unlock Circle, likes, comments &amp; more</p>
          </div>
          <button style={s.upgradeBtn} onClick={onUpgrade}>Upgrade</button>
        </div>
      )}

      {/* Admin Panel */}
      {isAdmin && (
        <div style={s.section}>
          <SectionHeader title="Admin" icon="🛡️" />
          <div onClick={() => navigate('/admin')} style={{ ...mr.row, borderBottom: 'none', cursor: 'pointer' }}>
            <span style={mr.iconWrap}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            <div style={mr.text}>
              <span style={{ ...mr.label, color: '#0D9488' }}>Admin Panel</span>
              <span style={mr.sub}>Manage articles, users, jobs &amp; posts</span>
            </div>
            <ChevronIcon />
          </div>
        </div>
      )}

      {/* Circle Requests */}
      {circleRequests.length > 0 && (
        <div style={s.section}>
          <SectionHeader title="Circle Requests" icon="👥" badge={circleRequests.length} />
          {circleRequests.map((uid, i) => (
            <CircleRequestRow
              key={uid} uid={uid}
              onAccept={() => handleAccept(uid)}
              onDecline={() => handleDecline(uid)}
              last={i === circleRequests.length - 1}
            />
          ))}
        </div>
      )}

      {/* Activity */}
      <div style={s.section}>
        <SectionHeader title="Activity" icon="📊" />

        {isPaid ? (
          <div
            style={{ ...ar.row, borderBottom: '1px solid #F3F2EF', cursor: 'pointer', background: unreadMessages > 0 ? '#F0FDF9' : 'transparent' }}
            onClick={() => navigate('/messages')}
          >
            <div style={{ ...ar.iconWrap, background: '#EEF9F7' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <span style={ar.label}>Messages</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unreadMessages > 0 && (
                <span style={{ background: '#0D9488', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, fontFamily: 'DM Sans, sans-serif' }}>
                  {unreadMessages}
                </span>
              )}
              <ChevronIcon />
            </div>
          </div>
        ) : (
          <div style={{ ...ar.row, borderBottom: '1px solid #F3F2EF', opacity: 0.6 }}>
            <div style={{ ...ar.iconWrap, background: '#F3F2EF' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <span style={ar.label}>Messages</span>
            <button style={mr.lockBtn} onClick={onUpgrade}>🔒 Upgrade</button>
          </div>
        )}

        <ActivityRow icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>} iconBg="#EEF9F7" label="Profile Views" value={profileViews} />
        <ActivityRow icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F6BED" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>} iconBg="#EEF3FF" label="Jobs Viewed" value={jobsViewed} />
        <ActivityRow icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} iconBg="#FFF8EE" label="Articles Read" value={totalRead} last />
      </div>

      {/* Account */}
      <div style={s.section}>
        <SectionHeader title="Account" icon="👤" />
        <InfoRow label="Email"        value={email} />
        <InfoRow label="Industry"     value={industry} />
        <InfoRow label="Plan"         value={planConfig.label} highlight={planConfig.color} />
        <InfoRow label="Member since" value={formatDate(profile?.createdAt)} last />
      </div>

      <div style={s.version}>
        <span>ConnektIn v2.0 · Your Professional Community</span>
        <span
          style={{ color: '#0D9488', cursor: 'pointer', textDecoration: 'underline', fontSize: 11 }}
          onClick={() => navigate('/privacy')}
        >
          Privacy Policy
        </span>
      </div>

      {/* ── NEW: Full-view photo modal ──────────────────────────────────────── */}
      {showFullView && profile?.photoURL && (
        <AvatarFullView
          src={profile.photoURL}
          name={displayName}
          onClose={() => setShowFullView(false)}
        />
      )}
      {/* ───────────────────────────────────────────────────────────────────── */}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CircleRequestRow({ uid, onAccept, onDecline, last }) {
  const [requester, setRequester] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => { if (snap.exists()) setRequester(snap.data()); });
    return () => unsub();
  }, [uid]);
  const name     = requester?.displayName || 'ConnektIn User';
  const industry = requester?.industry ? requester.industry.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
  const photo    = requester?.photoURL || null;
  const initial  = name.charAt(0).toUpperCase();
  const goToProfile = () => navigate(`/profile/${uid}`, { state: { from: 'profile', tab: 'profile' } });
  return (
    <div style={{ ...cr.row, borderBottom: last ? 'none' : '1px solid #F3F2EF' }}>
      <div onClick={goToProfile} style={{ cursor: 'pointer', flexShrink: 0 }}>
        {photo ? <img src={photo} alt={name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2px solid #0D9488' }} />
               : <div style={cr.avatar}>{initial}</div>}
      </div>
      <div style={{ ...cr.info, cursor: 'pointer' }} onClick={goToProfile}>
        <div style={cr.name}>{name}</div>
        {industry ? <div style={cr.sub}>{industry}</div> : null}
        <div style={cr.viewProfile}>Tap to view profile →</div>
      </div>
      <div style={cr.actions}>
        <button style={cr.acceptBtn} onClick={onAccept}>Accept</button>
        <button style={cr.declineBtn} onClick={onDecline}>Decline</button>
      </div>
    </div>
  );
}

function StatCell({ value, label, color }) {
  return (
    <div style={sc.cell}>
      <span style={{ ...sc.value, color }}>{value}</span>
      <span style={sc.label}>{label}</span>
    </div>
  );
}

function SectionHeader({ title, icon, badge }) {
  return (
    <div style={sh.wrap}>
      <span style={sh.text}>{icon ? `${icon} ` : ''}{title}</span>
      {badge > 0 && <span style={sh.badge}>{badge}</span>}
    </div>
  );
}

function ActivityRow({ icon, iconBg, label, value, last }) {
  return (
    <div style={{ ...ar.row, borderBottom: last ? 'none' : '1px solid #F3F2EF' }}>
      <div style={{ ...ar.iconWrap, background: iconBg }}>{icon}</div>
      <span style={ar.label}>{label}</span>
      <span style={ar.value}>{value}</span>
    </div>
  );
}

function InfoRow({ label, value, highlight, last }) {
  return (
    <div style={{ ...ir.row, borderBottom: last ? 'none' : '1px solid #F3F2EF' }}>
      <span style={ir.label}>{label}</span>
      <span style={{ ...ir.value, color: highlight || '#1A1A1A' }}>{value}</span>
    </div>
  );
}

function MenuRow({ icon, label, sub, disabled, last, onClick, lockedMsg, onUpgrade }) {
  return (
    <div style={{ ...mr.row, opacity: 1, borderBottom: last ? 'none' : '1px solid #F3F2EF', cursor: onClick && !disabled ? 'pointer' : 'default' }} onClick={!disabled && onClick ? onClick : undefined}>
      <span style={mr.iconWrap}>{icon}</span>
      <div style={mr.text}><span style={mr.label}>{label}</span><span style={mr.sub}>{sub}</span></div>
      {disabled && lockedMsg ? <button style={mr.lockBtn} onClick={onUpgrade}>🔒 {lockedMsg}</button> : <ChevronIcon />}
    </div>
  );
}

function formatDate(createdAt) {
  if (!createdAt) return '—';
  const d = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

const EditIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IndustryIcon= () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const BellIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const ShieldIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const HelpIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const ChevronIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;

function SettingsSheet({ onClose, isLocked, onUpgrade, navigate }) {
  const items = [
    { icon: <EditIcon />,     label: 'Edit Profile',    sub: 'Update name and bio',     onClick: () => { onClose(); navigate('/edit-profile'); } },
    { icon: <IndustryIcon />, label: 'Change Industry', sub: 'Free swap every 90 days', locked: isLocked, onClick: () => { if (!isLocked) { onClose(); navigate('/industry-swap'); } } },
    { icon: <BellIcon />,     label: 'Notifications',   sub: 'Manage alerts',           onClick: () => {} },
    { icon: <ShieldIcon />,   label: 'Privacy & Security', sub: 'Manage your data and security',       onClick: () => { onClose(); navigate('/privacy-security'); } },
    { icon: <HelpIcon />,     label: 'Help & Support',  sub: 'FAQs and contact',        onClick: () => {} },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '16px 16px 0 0', zIndex: 101, fontFamily: 'DM Sans, sans-serif', paddingBottom: 24, boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E4E2DC' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0A1628' }}>Settings</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ borderTop: '1px solid #F3F2EF' }}>
          {items.map((item, i) => (
            <div key={i} onClick={item.locked ? undefined : item.onClick}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < items.length - 1 ? '1px solid #F3F2EF' : 'none', cursor: item.locked ? 'default' : 'pointer', opacity: item.locked ? 0.7 : 1 }}>
              <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>{item.sub}</div>
              </div>
              {item.locked ? <button onClick={onUpgrade} style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', borderRadius: 12, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>🔒 Upgrade</button> : <ChevronIcon />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page:         { display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: 32, background: '#F3F2EF', minHeight: '100vh' },
  topBar:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px', background: '#fff', borderBottom: '1px solid #E4E2DC', position: 'sticky', top: 0, zIndex: 10 },
  topBarTitle:  { fontSize: 16, fontWeight: 700, color: '#0A1628', fontFamily: 'DM Sans, sans-serif' },
  topBarActions:{ display: 'flex', gap: 8 },
  topBarBtn:    { display: 'flex', alignItems: 'center', padding: '6px 12px', borderRadius: 8, border: '1px solid #E4E2DC', background: '#F8F8F8', fontSize: 12, fontWeight: 500, color: '#374151', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' },
  topBarLogout: { display: 'flex', alignItems: 'center', padding: '6px 12px', borderRadius: 8, border: '1px solid #FECACA', background: '#FFF5F5', fontSize: 12, fontWeight: 500, color: '#DC2626', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' },
  heroBand:     { height: 72, background: '#0A1628', flexShrink: 0 },
  heroCard:     { background: '#fff', borderBottom: '1px solid #E4E2DC', marginBottom: 8 },
  avatarWrap:   { display: 'flex', justifyContent: 'center', marginTop: -44, marginBottom: 10 },
  heroBody:     { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px 4px' },
  name:         { margin: '0 0 3px', fontSize: 18, fontWeight: 700, color: '#0A1628', fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.01em' },
  industry:     { margin: '0 0 8px', fontSize: 13, color: '#64748B', fontFamily: 'DM Sans, sans-serif' },
  bio:          { margin: '0 0 8px', fontSize: 13, color: '#888', fontFamily: 'DM Sans, sans-serif', textAlign: 'center', lineHeight: 1.5, maxWidth: 260, fontStyle: 'italic' },
  planRow:      { display: 'flex', marginBottom: 4 },
  planBadge:    { display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 500, padding: '4px 14px', borderRadius: 20, fontFamily: 'DM Sans, sans-serif' },
  signalCard:      { margin: '12px 16px 4px', background: '#0A1628', borderRadius: 12, padding: '13px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  signalLeft:      { flex: 1 },
  signalLabel:     { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontFamily: 'DM Sans, sans-serif' },
  signalBars:      { display: 'flex', alignItems: 'flex-end', gap: 5 },
  signalSub:       { fontSize: 10, color: '#64748B', marginTop: 6, fontFamily: 'DM Sans, sans-serif' },
  signalRight:     { textAlign: 'center', flexShrink: 0 },
  signalRank:      { background: '#0D9488', color: '#fff', padding: '5px 13px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', display: 'inline-block' },
  signalRankLabel: { fontSize: 10, color: '#64748B', marginTop: 4, fontFamily: 'DM Sans, sans-serif' },
  statsStrip:   { display: 'flex', borderTop: '1px solid #F3F2EF', margin: '8px 16px 0' },
  stripDiv:     { width: 1, backgroundColor: '#E4E2DC', margin: '8px 0' },
  actionRow:    { display: 'flex', gap: 8, padding: '12px 16px 16px' },
  btnPrimary:   { flex: 1, background: '#0D9488', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnOutline:   { flex: 1, background: '#fff', color: '#0D9488', border: '1.5px solid #0D9488', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  wofCard:    { margin: '0 16px 8px', background: '#fff', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: '1px solid #E4E2DC', borderLeft: '4px solid #0D9488' },
  wofMeta:    { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, fontFamily: 'DM Sans, sans-serif' },
  wofTitle:   { fontSize: 15, fontWeight: 700, color: '#0A1628', fontFamily: 'DM Sans, sans-serif' },
  wofSub:     { fontSize: 11, color: '#64748B', marginTop: 3, fontFamily: 'DM Sans, sans-serif' },
  wofBtn:     { background: '#0D9488', color: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', flexShrink: 0 },
  certCard:     { margin: '0 16px 8px', background: '#fefcf7', border: '1px solid #d4b896', borderLeft: '4px solid #B8860B', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: '0 2px 8px rgba(184,134,11,0.08)' },
  certCardLeft: { flex: 1 },
  certCardMeta: { fontSize: 11, color: '#B8860B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, fontFamily: 'DM Sans, sans-serif', fontWeight: 600 },
  certCardTitle:{ fontSize: 15, fontWeight: 700, color: '#0A1628', fontFamily: 'DM Sans, sans-serif' },
  certCardSub:  { fontSize: 11, color: '#8a7560', marginTop: 3, fontFamily: 'DM Sans, sans-serif' },
  certCardBtn:  { background: '#B8860B', color: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', flexShrink: 0 },
  upgradeBanner:{ margin: '0 16px 8px', background: '#F0FDF9', border: '1px solid #A7F3D0', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  upgradeLeft:  { flex: 1 },
  upgradeTitle: { margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#064E3B', fontFamily: 'DM Sans, sans-serif' },
  upgradeSub:   { margin: 0, fontSize: 12, color: '#065F46', fontFamily: 'DM Sans, sans-serif' },
  upgradeBtn:   { flexShrink: 0, padding: '8px 16px', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' },
  section:      { margin: '0 0 8px', backgroundColor: '#fff', borderTop: '1px solid #E4E2DC', borderBottom: '1px solid #E4E2DC', overflow: 'hidden' },
  version:      { textAlign: 'center', fontSize: 11, color: '#BBB', fontFamily: 'DM Sans, sans-serif', margin: '8px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
};

const sc = {
  cell:  { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px', gap: 2 },
  value: { fontSize: 18, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', lineHeight: 1 },
  label: { fontSize: 10, color: '#94A3B8', fontFamily: 'DM Sans, sans-serif', textAlign: 'center', lineHeight: 1.3, marginTop: 2 },
};
const sh = {
  wrap:  { display: 'flex', alignItems: 'center', padding: '11px 14px 8px', borderBottom: '1px solid #F3F2EF' },
  text:  { margin: 0, fontSize: 11, fontWeight: 700, color: '#0A1628', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 },
  badge: { background: '#0A1628', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' },
};
const ar = {
  row:     { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' },
  iconWrap:{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label:   { flex: 1, fontSize: 13, color: '#374151', fontFamily: 'DM Sans, sans-serif' },
  value:   { fontSize: 15, fontWeight: 700, color: '#0A1628', fontFamily: 'DM Sans, sans-serif' },
};
const ir = {
  row:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' },
  label: { fontSize: 13, color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' },
  value: { fontSize: 13, fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'right', maxWidth: '60%' },
};
const mr = {
  row:     { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px' },
  iconWrap:{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text:    { flex: 1, display: 'flex', flexDirection: 'column', gap: 1 },
  label:   { fontSize: 14, fontWeight: 500, color: '#1A1A1A', fontFamily: 'DM Sans, sans-serif' },
  sub:     { fontSize: 11, color: '#999', fontFamily: 'DM Sans, sans-serif' },
  lockBtn: { background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', borderRadius: 12, padding: '4px 10px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', flexShrink: 0 },
};
const cr = {
  row:        { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' },
  avatar:     { width: 42, height: 42, borderRadius: '50%', background: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0, fontFamily: 'DM Sans, sans-serif', border: '2px solid #5EEAD4' },
  info:       { flex: 1, minWidth: 0 },
  name:       { fontSize: 13, fontWeight: 600, color: '#0A1628', fontFamily: 'DM Sans, sans-serif', marginBottom: 2 },
  sub:        { fontSize: 11, color: '#888', fontFamily: 'DM Sans, sans-serif' },
  viewProfile:{ fontSize: 10, color: '#0D9488', marginTop: 2, fontFamily: 'DM Sans, sans-serif' },
  actions:    { display: 'flex', gap: 6, flexShrink: 0 },
  acceptBtn:  { background: '#0D9488', color: '#fff', border: 'none', borderRadius: 14, padding: '6px 13px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' },
  declineBtn: { background: '#fff', color: '#64748B', border: '1px solid #E4E2DC', borderRadius: 14, padding: '6px 13px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' },
};
