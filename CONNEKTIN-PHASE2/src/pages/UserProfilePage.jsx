// src/pages/UserProfilePage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import {
  doc, getDoc, updateDoc, addDoc, onSnapshot,
  collection, query, where, orderBy, getDocs,
  arrayUnion, arrayRemove, increment, serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { addSignal, SIGNAL_POINTS } from '../utils/signal';
import { getSignalBar } from '../utils/signalBar';
import Avatar from '../components/Avatar';
import AvatarFullView from '../components/AvatarFullView';
import { startConversation } from '../utils/startConversation';
import ReportModal from '../components/ReportModal';

const INDUSTRY_LABELS = {
  medical_coding_billing: 'Medical Coding & Billing',
  medical_billing:        'Medical Billing',
  nursing:                'Nursing',
  pharmacy:               'Pharmacy',
  healthcare_it:          'Healthcare IT',
  other:                  'Other',
};

function useSignalRank(uid, industry) {
  const [monthlyRank, setMonthlyRank] = useState(null);
  useEffect(() => {
    if (!uid || !industry) return;
    getDocs(query(collection(db, 'users'), where('industry', '==', industry))).then(snap => {
      const users = snap.docs.map(d => d.data());
      const byMonthly = [...users].sort((a, b) => (b.monthlySignal || 0) - (a.monthlySignal || 0));
      const mIdx = byMonthly.findIndex(u => u.uid === uid);
      setMonthlyRank(mIdx >= 0 ? mIdx + 1 : null);
    }).catch(() => {});
  }, [uid, industry]);
  return { monthlyRank };
}

export default function UserProfilePage() {
  const { uid }        = useParams();
  const navigate       = useNavigate();
  const { user, profile: myProfile } = useAuth();

  const [targetUser, setTargetUser]       = useState(null);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showUpgrade, setShowUpgrade]     = useState(false);
  const [showNoteSheet, setShowNoteSheet] = useState(false);
  const [noteText, setNoteText]           = useState('');
  const [noteSent, setNoteSent]           = useState(false);
  const [articles, setArticles]           = useState([]);
  // ── NEW ──────────────────────────────────────────────────────
  const [showFullView, setShowFullView]   = useState(false);
  // ─────────────────────────────────────────────────────────────
  const [showReport, setShowReport]       = useState(false);

  const isOwnProfile  = user?.uid === uid;
  const isTrialLocked = myProfile?.plan === 'trial' && myProfile?.userType !== 'recruiter';
  const myPlanIsPaid  = myProfile?.plan === 'thermite' || myProfile?.plan === 'regular';

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), snap => {
      setTargetUser(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    getDocs(query(collection(db, 'articles'), where('authorUid', '==', uid), where('status', '==', 'published'), orderBy('createdAt', 'desc'))).then(snap => {
      setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(() => {});
  }, [uid]);

  useEffect(() => {
    if (!uid || !user || isOwnProfile || !targetUser) return;
    updateDoc(doc(db, 'users', uid), { profileViews: increment(1) }).catch(() => {});
    addSignal(uid, SIGNAL_POINTS.PROFILE_VIEWED);
  }, [targetUser?.uid]);

  const { monthlyRank } = useSignalRank(targetUser?.uid, targetUser?.industry);

  const isMember   = targetUser?.circleMembers?.includes(user?.uid);
  const isPending  = targetUser?.circleRequests?.includes(user?.uid);
  const iRequested = myProfile?.circleSent?.includes(uid);

  const goBack = () => navigate(-1);

  const handleJoinCircle = async (note = '') => {
    if (isTrialLocked) { setShowUpgrade(true); return; }
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', uid), { circleRequests: arrayUnion(user.uid) });
      await updateDoc(doc(db, 'users', user.uid), { circleSent: arrayUnion(uid) });
      await addSignal(user.uid, SIGNAL_POINTS.CIRCLE_REQUEST_SENT);
      await addDoc(collection(db, 'notifications'), {
        uid, type: 'circle_request', group: 'circle',
        fromUid: user.uid,
        fromName: myProfile?.displayName || 'Someone',
        fromPhoto: myProfile?.photoURL || null,
        message: 'sent you a Circle request',
        note: note.trim() || null,
        read: false,
        createdAt: serverTimestamp(),
      });
      if (note.trim()) setNoteSent(true);
    } catch (e) { console.error('Circle join error:', e); }
    setActionLoading(false);
    setShowNoteSheet(false);
  };

  const handleWithdraw = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', uid), { circleRequests: arrayRemove(user.uid) });
      await updateDoc(doc(db, 'users', user.uid), { circleSent: arrayRemove(uid) });
    } catch (e) { console.error('Withdraw error:', e); }
    setActionLoading(false);
  };

  const handleLeaveCircle = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', uid), { circleMembers: arrayRemove(user.uid), circleCount: increment(-1) });
      await updateDoc(doc(db, 'users', user.uid), { circling: arrayRemove(uid), circlingCount: increment(-1) });
    } catch (e) { console.error('Leave circle error:', e); }
    setActionLoading(false);
  };

  const handleSendNote = async () => {
    if (!noteText.trim() && !iRequested && !isMember) {
      await handleJoinCircle('');
      return;
    }
    await handleJoinCircle(noteText);
  };

  if (loading) {
    return (
      <div style={s.loadingScreen}>
        <div style={s.spinner} />
        <p style={s.loadingText}>Loading profile...</p>
      </div>
    );
  }
  if (!targetUser) {
    return (
      <div style={s.loadingScreen}>
        <p style={s.loadingText}>User not found.</p>
        <button style={s.backBtn} onClick={goBack}>Go Back</button>
      </div>
    );
  }

  const displayName   = targetUser.displayName || 'ConnektIn User';
  const industry      = INDUSTRY_LABELS[targetUser.industry] || targetUser.industry || '—';
  const bio           = targetUser.bio || '';
  const plan          = targetUser.plan || 'trial';
  const role          = targetUser.role || 'participant';
  const totalRead     = Object.values(targetUser.readCounts || {}).reduce((a, b) => a + b, 0);
  const circleCount   = targetUser.circleCount || 0;
  const circlingCount = targetUser.circlingCount || 0;
  const theirWeeklyBar = getSignalBar(targetUser.weeklySignal || 0);

  const planConfig = {
    trial:    { label: 'Free Trial',    color: '#B45309', bg: '#FEF3C7' },
    thermite: { label: 'TherMite Plan', color: '#0D9488', bg: '#E6FAF8' },
    regular:  { label: 'Regular Plan',  color: '#0A1628', bg: '#E8EAF0' },
  }[plan] || { label: plan, color: '#666', bg: '#F3F2EF' };

  const circleButton = () => {
    if (isOwnProfile) return null;
    if (isMember) {
      return (
        <button style={s.btnInCircle} onClick={handleLeaveCircle} disabled={actionLoading}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><polyline points="20 6 9 17 4 12"/></svg>
          {actionLoading ? 'Updating...' : 'In Circle'}
        </button>
      );
    }
    if (iRequested || isPending) {
      return (
        <button style={s.btnPending} onClick={handleWithdraw} disabled={actionLoading}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {actionLoading ? 'Updating...' : 'Pending · Withdraw'}
        </button>
      );
    }
    if (isTrialLocked) {
      return (
        <button style={s.btnLocked} onClick={() => setShowUpgrade(true)}>
          🔒 Join Circle · Upgrade to unlock
        </button>
      );
    }
    return (
      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <button style={{ ...s.btnJoin, flex: 1 }} onClick={() => setShowNoteSheet(true)} disabled={actionLoading}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          {actionLoading ? 'Sending...' : 'Add to Circle'}
        </button>
        <button style={s.btnNoteOnly} onClick={() => setShowNoteSheet(true)} disabled={actionLoading}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Note
        </button>
      </div>
    );
  };

  return (
    <div style={s.page}>

      {/* Top Bar */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={goBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={s.topBarTitle}>Profile</span>
        {!isOwnProfile ? (
          <button style={s.backBtn} onClick={() => setShowReport(true)} aria-label="Report user">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        ) : (
          <div style={{ width: 36 }} />
        )}
      </div>

      {/* Hero */}
      <div style={s.hero}>
        {/* ── NEW: tap avatar to open full view ── */}
        <div
          style={{ ...s.avatarWrap, cursor: targetUser.photoURL ? 'zoom-in' : 'default' }}
          onClick={() => { if (targetUser.photoURL) setShowFullView(true); }}
        >
          <Avatar
            uid={targetUser.uid}
            photoURL={targetUser.photoURL}
            avatarId={targetUser.avatarId || targetUser.avatar}
            displayName={displayName}
            plan={plan}
            role={role}
            size={72}
          />
        </div>
        {/* ─────────────────────────────────────── */}
        <div style={s.heroName}>{displayName}</div>
        <div style={s.heroIndustry}>{industry}</div>
        <div style={{ ...s.planPill, background: planConfig.bg, color: planConfig.color }}>
          ● {planConfig.label}
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          <div style={s.stat}>
            <span style={s.statVal}>{circleCount}</span>
            <span style={s.statLbl}>In Circle</span>
          </div>
          <div style={s.statDivider} />
          <div style={s.stat}>
            <span style={s.statVal}>{circlingCount}</span>
            <span style={s.statLbl}>Circles</span>
          </div>
          <div style={s.statDivider} />
          <div style={s.stat}>
            <span style={s.statVal}>{totalRead}</span>
            <span style={s.statLbl}>Articles</span>
          </div>
        </div>

        {/* Signal */}
        {!isOwnProfile && (
          <div style={s.signalRow}>
            <div style={s.signalBars}>
              {[1,2,3,4,5].map(b => (
                <div key={b} style={{ ...s.signalBar, background: b <= theirWeeklyBar.bars ? '#0D9488' : '#E4E2DC' }} />
              ))}
            </div>
            <div style={s.signalRight}>
              <div style={s.signalLabel}>{theirWeeklyBar.label}</div>
              <div style={s.signalSub}>Monthly rank: {monthlyRank ? `#${monthlyRank}` : '—'}</div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isOwnProfile && (
          <div style={s.actionRow}>
            {circleButton()}
            {myPlanIsPaid && (
              <button
                style={{ ...s.btnNoteOnly, marginTop: 8, width: '100%', justifyContent: 'center', gap: 8, color: '#0D9488', borderColor: '#0D9488' }}
                onClick={() => startConversation(user.uid, uid, navigate)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Message {displayName.split(' ')[0]}
              </button>
            )}
          </div>
        )}
        {isOwnProfile && (
          <div style={s.actionRow}>
            <button style={s.btnOutline} onClick={() => navigate('/dashboard', { state: { tab: 'profile' } })}>
              This is your profile — Go to Settings
            </button>
          </div>
        )}

        {noteSent && (
          <div style={s.noteSentBadge}>✓ Circle request + note sent!</div>
        )}
      </div>

      {/* Bio */}
      {bio ? (
        <div style={s.section}>
          <div style={s.sectionHdr}>Bio</div>
          <p style={s.bioText}>{bio}</p>
        </div>
      ) : null}

      {/* About */}
      <div style={s.section}>
        <div style={s.sectionHdr}>About</div>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>Industry</span>
          <span style={s.infoValue}>{industry}</span>
        </div>
        <div style={{ ...s.infoRow, borderBottom: 'none' }}>
          <span style={s.infoLabel}>Member Plan</span>
          <span style={{ ...s.infoValue, color: planConfig.color }}>{planConfig.label}</span>
        </div>
      </div>

      {/* Articles */}
      {articles.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionHdr}>Articles by {displayName.split(' ')[0]}</div>
          {articles.map(a => (
            <div key={a.id} style={s.articleRow} onClick={() => navigate(`/article/${a.id}`)}>
              <div style={s.articleThumb}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.articleTitle}>{a.title}</div>
                <div style={s.articleMeta}>{a.level} · {a.readTime}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
        </div>
      )}

      {/* Note Sheet */}
      {showNoteSheet && (
        <div style={s.sheetOverlay} onClick={() => setShowNoteSheet(false)}>
          <div style={s.sheet} onClick={e => e.stopPropagation()}>
            <div style={s.sheetHandle} />
            <div style={s.sheetTitle}>Add {displayName.split(' ')[0]} to Circle</div>
            <div style={s.sheetSub}>Send a short note with your request — helps them know why you want to connect.</div>
            <div style={s.noteTarget}>
              <Avatar uid={targetUser.uid} photoURL={targetUser.photoURL} avatarId={targetUser.avatarId || targetUser.avatar} displayName={displayName} plan={plan} role={role} size={38} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', fontFamily: 'DM Sans, sans-serif' }}>{displayName}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>{industry}</div>
              </div>
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value.slice(0, 140))}
              placeholder={`Hi ${displayName.split(' ')[0]}, I'm also in ${industry}. Would love to connect!`}
              rows={3}
              style={s.noteInput}
            />
            <div style={s.charCount}>{noteText.length} / 140</div>
            <button onClick={handleSendNote} disabled={actionLoading} style={{ ...s.sendBtn, opacity: actionLoading ? 0.6 : 1 }}>
              {actionLoading ? 'Sending...' : noteText.trim() ? 'Send Circle Request + Note' : 'Send Circle Request'}
            </button>
            <button style={s.skipBtn} onClick={() => setShowNoteSheet(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Upgrade Overlay */}
      {showUpgrade && (
        <div style={s.overlay}>
          <div style={s.overlayCard}>
            <div style={s.overlayIcon}>🔒</div>
            <h3 style={s.overlayTitle}>Upgrade to Join Circles</h3>
            <p style={s.overlaySub}>Joining professional circles is a premium feature. Upgrade to connect, engage and grow your network on ConnektIn.</p>
            <button style={s.overlayBtn} onClick={() => { setShowUpgrade(false); navigate('/subscribe'); }}>View Plans</button>
            <button style={s.overlayCancel} onClick={() => setShowUpgrade(false)}>Maybe Later</button>
          </div>
        </div>
      )}

      {/* ── NEW: Full-view photo modal ── */}
      {showFullView && targetUser.photoURL && (
        <AvatarFullView
          src={targetUser.photoURL}
          name={displayName}
          onClose={() => setShowFullView(false)}
        />
      )}
      {/* ─────────────────────────────── */}

      {/* Report user */}
      {showReport && (
        <ReportModal
          targetType="user"
          targetId={targetUser.uid}
          targetName={displayName}
          targetOwnerUid={targetUser.uid}
          currentUser={user}
          profile={myProfile}
          onClose={() => setShowReport(false)}
        />
      )}

    </div>
  );
}

const s = {
  page:           { background: '#F3F2EF', minHeight: '100dvh', paddingBottom: 32, fontFamily: 'DM Sans, sans-serif' },
  loadingScreen:  { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#F3F2EF', gap: 16 },
  spinner:        { width: 28, height: 28, border: '3px solid #E4E2DC', borderTop: '3px solid #0D9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText:    { fontSize: 14, color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' },
  topBar:         { position: 'sticky', top: 0, zIndex: 10, background: '#0A1628', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' },
  backBtn:        { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#fff' },
  topBarTitle:    { fontSize: 15, fontWeight: 700, color: '#fff' },
  hero:           { background: '#0A1628', padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  avatarWrap:     { marginBottom: 4 },
  heroName:       { fontSize: 20, fontWeight: 700, color: '#fff' },
  heroIndustry:   { fontSize: 12, color: '#9CA3AF' },
  planPill:       { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, marginTop: 2 },
  statsRow:       { display: 'flex', alignItems: 'center', gap: 0, marginTop: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 0', width: '100%' },
  stat:           { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  statVal:        { fontSize: 18, fontWeight: 700, color: '#fff' },
  statLbl:        { fontSize: 10, color: '#9CA3AF' },
  statDivider:    { width: 1, height: 28, background: 'rgba(255,255,255,0.1)' },
  signalRow:      { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, width: '100%' },
  signalBars:     { display: 'flex', gap: 3, alignItems: 'flex-end' },
  signalBar:      { width: 5, height: 16, borderRadius: 3 },
  signalRight:    { display: 'flex', flexDirection: 'column', gap: 1 },
  signalLabel:    { fontSize: 12, fontWeight: 600, color: '#fff' },
  signalSub:      { fontSize: 11, color: '#9CA3AF' },
  actionRow:      { width: '100%', marginTop: 12 },
  btnJoin:        { display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%' },
  btnNoteOnly:    { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(13,148,136,0.4)', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 },
  btnInCircle:    { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,148,136,0.2)', color: '#0D9488', border: '1px solid #0D9488', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%' },
  btnPending:     { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%' },
  btnLocked:      { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%' },
  btnOutline:     { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%' },
  noteSentBadge:  { background: 'rgba(13,148,136,0.2)', border: '1px solid rgba(13,148,136,0.4)', borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#0D9488', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', marginTop: 4 },
  section:        { background: '#fff', margin: '8px 0', padding: '14px 16px' },
  sectionHdr:     { fontSize: 11, fontWeight: 700, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
  bioText:        { fontSize: 13, color: '#374151', lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif', margin: 0 },
  infoRow:        { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #F3F2EF' },
  infoLabel:      { fontSize: 13, color: '#9CA3AF' },
  infoValue:      { fontSize: 13, fontWeight: 600, color: '#0A1628' },
  articleRow:     { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid #F3F2EF', cursor: 'pointer' },
  articleThumb:   { width: 36, height: 36, borderRadius: 8, background: '#E6FAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  articleTitle:   { fontSize: 13, fontWeight: 600, color: '#0A1628', lineHeight: 1.3 },
  articleMeta:    { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  sheetOverlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end' },
  sheet:          { background: '#fff', borderRadius: '20px 20px 0 0', padding: '16px 18px 36px', width: '100%', fontFamily: 'DM Sans, sans-serif' },
  sheetHandle:    { width: 36, height: 4, background: '#E4E2DC', borderRadius: 2, margin: '0 auto 16px' },
  sheetTitle:     { fontSize: 16, fontWeight: 700, color: '#0A1628', marginBottom: 4 },
  sheetSub:       { fontSize: 13, color: '#6B7280', lineHeight: 1.5, marginBottom: 14 },
  noteTarget:     { display: 'flex', alignItems: 'center', gap: 10, background: '#F3F2EF', borderRadius: 10, padding: '10px 12px', marginBottom: 12 },
  noteInput:      { width: '100%', background: '#F8F8F8', border: '1.5px solid #E4E2DC', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#1A1A1A', resize: 'none', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' },
  charCount:      { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4, marginBottom: 14 },
  sendBtn:        { width: '100%', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' },
  skipBtn:        { width: '100%', background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginTop: 8, padding: '6px 0' },
  overlay:        { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  overlayCard:    { background: '#fff', borderRadius: 20, padding: '28px 24px', maxWidth: 340, width: '100%', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' },
  overlayIcon:    { fontSize: 36, marginBottom: 12 },
  overlayTitle:   { fontSize: 18, fontWeight: 700, color: '#0A1628', marginBottom: 8 },
  overlaySub:     { fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 20 },
  overlayBtn:     { width: '100%', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: 8 },
  overlayCancel:  { background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' },
};
