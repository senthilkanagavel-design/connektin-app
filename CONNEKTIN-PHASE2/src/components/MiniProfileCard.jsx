// src/components/MiniProfileCard.jsx
// Shown when tapping any other user's profile photo anywhere in the app.
// Usage: <MiniProfileCard uid="abc123" onClose={() => setOpen(false)} />

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  doc, onSnapshot, updateDoc,
  arrayUnion, arrayRemove, increment,
  addDoc, collection, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { useSignalRank } from '../hooks/useSignalRank';
import { getSignalBar, addSignal, SIGNAL_POINTS } from '../utils/signal';

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

export default function MiniProfileCard({ uid, onClose }) {
  const navigate = useNavigate();
  const { user, profile: myProfile } = useAuth();

  const [targetUser,    setTargetUser]    = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showUpgrade,   setShowUpgrade]   = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const isTrialLocked = myProfile?.plan === 'trial' && myProfile?.userType !== 'recruiter';

  // Circle states — same logic as UserProfilePage
  const isMember   = targetUser?.circleMembers?.includes(user?.uid);
  const iRequested = myProfile?.circleSent?.includes(uid);

  // Signal rank
  const { weeklyRank, totalInIndustry } = useSignalRank(uid, targetUser?.industry);
  const weeklySignal = targetUser?.weeklySignal || 0;
  const signalBar    = getSignalBar(weeklySignal);

  // Derived display values
  const displayName  = targetUser?.displayName || 'User';
  const industry     = targetUser?.industry
    ? INDUSTRY_LABELS[targetUser.industry] || targetUser.industry.replace(/_/g, ' ')
    : '—';
  const plan         = targetUser?.plan || 'trial';
  const role         = targetUser?.role || 'participant';
  const circleCount  = targetUser?.circleCount  || 0;
  const postCount    = targetUser?.postCount     || 0;
  const articleCount = targetUser?.articleCount  || 0;

  const rankPct = weeklyRank && totalInIndustry
    ? Math.round((weeklyRank / totalInIndustry) * 100)
    : null;

  const planConfig = {
    thermite: { label: 'Thermite', color: '#0F6E56', bg: '#E6FAF8', icon: '✦' },
    regular:  { label: 'Regular',  color: '#92400E', bg: '#FEF3C7', icon: '●' },
    trial:    { label: 'Trial',    color: '#6B7280', bg: '#F3F4F6', icon: '○' },
  }[plan] || { label: plan, color: '#6B7280', bg: '#F3F4F6', icon: '○' };

  // Load target user
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), snap => {
      if (snap.exists()) setTargetUser({ uid, ...snap.data() });
      setLoading(false);
    });
    // Track profile view
    if (user?.uid && user.uid !== uid) {
      updateDoc(doc(db, 'users', uid), { profileViews: increment(1) }).catch(() => {});
      addSignal(uid, SIGNAL_POINTS.PROFILE_VIEWED);
    }
    return () => unsub();
  }, [uid]);

  // ── Circle actions ───────────────────────────────────────────
  const handleAddCircle = async () => {
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
        read: false, createdAt: serverTimestamp(),
      });
    } catch (e) { console.error('Circle add error:', e); }
    setActionLoading(false);
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

  const handleLeave = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', uid), { circleMembers: arrayRemove(user.uid), circleCount: increment(-1) });
      await updateDoc(doc(db, 'users', user.uid), { circling: arrayRemove(uid), circlingCount: increment(-1) });
      await addDoc(collection(db, 'notifications'), {
        uid, type: 'circle_leave', group: 'circle',
        fromUid: user.uid,
        fromName: myProfile?.displayName || 'Someone',
        fromPhoto: myProfile?.photoURL || null,
        message: 'left your Circle 😔 They may still be in yours — that\'s up to you.',
        read: false, createdAt: serverTimestamp(),
      });
    } catch (e) { console.error('Leave circle error:', e); }
    setActionLoading(false);
    setShowLeaveConfirm(false);
  };

  const handleViewFull = () => {
    onClose();
    navigate(`/profile/${uid}`);
  };

  // ── Circle button state ──────────────────────────────────────
  const CircleButton = () => {
    if (isMember) return (
      <button style={{ ...S.btnBase, ...S.btnCircle }} onClick={() => setShowLeaveConfirm(true)} disabled={actionLoading}>
        ∞ In {displayName.split(' ')[0]}'s Circle
      </button>
    );
    if (iRequested) return (
      <button style={{ ...S.btnBase, ...S.btnPending }} onClick={handleWithdraw} disabled={actionLoading}>
        ⏳ Request Sent
      </button>
    );
    return (
      <button style={{ ...S.btnBase, ...S.btnAdd }} onClick={handleAddCircle} disabled={actionLoading}>
        {actionLoading ? '…' : '+ Add to Circle'}
      </button>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={S.backdrop} />

      {/* Sheet */}
      <div style={S.sheet}>
        <div style={S.handle} />

        {loading ? (
          <div style={S.loadingWrap}>
            <div style={S.spinner} />
          </div>
        ) : (
          <>
            {/* Cover + avatar */}
            <div style={S.cover}>
              <div style={{ ...S.planPill, background: planConfig.bg, color: planConfig.color }}>
                {planConfig.icon} {planConfig.label}
              </div>
            </div>
            <div style={S.avatarWrap}>
              <Avatar
                uid={uid}
                photoURL={targetUser?.photoURL}
                avatarId={targetUser?.avatarId || targetUser?.avatar}
                displayName={displayName}
                plan={plan}
                role={role}
                size={52}
                inCircle={isMember}
              />
            </div>

            {/* Info */}
            <div style={S.body}>
              <div style={S.name}>{displayName}</div>
              <div style={S.role}>{industry}</div>

              {/* Stats */}
              <div style={S.statsRow}>
                <div style={S.stat}>
                  <div style={S.statNum}>{circleCount}</div>
                  <div style={S.statLabel}>Circle</div>
                </div>
                <div style={S.statDivider} />
                <div style={S.stat}>
                  <div style={S.statNum}>{postCount}</div>
                  <div style={S.statLabel}>Posts</div>
                </div>
                <div style={S.statDivider} />
                <div style={S.stat}>
                  <div style={S.statNum}>{articleCount}</div>
                  <div style={S.statLabel}>Articles</div>
                </div>
              </div>

              {/* Signal bar */}
              {weeklySignal > 0 && (
                <div style={S.signalRow}>
                  <span style={{ fontSize: 13 }}>⚡</span>
                  <div style={S.signalBg}>
                    <div style={{ ...S.signalFill, width: `${Math.min(100, (weeklySignal / 500) * 100)}%` }} />
                  </div>
                  <span style={S.signalPts}>{weeklySignal} pts</span>
                  {rankPct !== null && (
                    <span style={S.signalRank}>· Top {rankPct}%</span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={S.actions}>
                <CircleButton />
                <button style={S.btnMsg} title="Message (coming soon)" disabled>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* View Full Profile */}
            <div style={S.viewFull} onClick={handleViewFull}>
              View Full Profile
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
          </>
        )}
      </div>

      {/* Trial upgrade modal */}
      {showUpgrade && (
        <div style={S.upgradeOverlay} onClick={() => setShowUpgrade(false)}>
          <div style={S.upgradeCard} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
            <div style={S.upgradeTitle}>Upgrade to Add to Circle</div>
            <div style={S.upgradeSub}>
              Build your professional network. Available on paid plans.
            </div>
            <button
              style={S.upgradeBtn}
              onClick={() => { setShowUpgrade(false); onClose(); navigate('/subscribe'); }}
            >
              Upgrade Now
            </button>
            <button style={S.upgradeLater} onClick={() => setShowUpgrade(false)}>
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {/* Leave Circle confirmation modal */}
      {showLeaveConfirm && (
        <div style={S.upgradeOverlay} onClick={() => !actionLoading && setShowLeaveConfirm(false)}>
          <div style={S.upgradeCard} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"/><path d="M5.17 11.75l-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"/><line x1="8" y1="2" x2="8" y2="5"/><line x1="2" y1="8" x2="5" y2="8"/><line x1="16" y1="19" x2="16" y2="22"/><line x1="19" y1="16" x2="22" y2="16"/></svg>
            </div>
            <div style={S.upgradeTitle}>Leave {displayName.split(' ')[0]}'s Circle?</div>
            <div style={S.upgradeSub}>
              {displayName.split(' ')[0]} will be notified that you left. You may still remain in their Circle — that's their choice to keep or remove.
            </div>
            <button
              style={{ ...S.upgradeBtn, background: '#DC2626', opacity: actionLoading ? 0.6 : 1 }}
              onClick={handleLeave}
              disabled={actionLoading}
            >
              {actionLoading ? 'Leaving...' : 'Yes, Leave Circle'}
            </button>
            <button style={S.upgradeLater} onClick={() => setShowLeaveConfirm(false)} disabled={actionLoading}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const S = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 300,
  },
  sheet: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    zIndex: 301,
    paddingBottom: 32,
    boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
    fontFamily: 'DM Sans, sans-serif',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  handle: {
    width: 36, height: 3,
    background: '#E4E2DC', borderRadius: 2,
    margin: '12px auto 0',
  },
  loadingWrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 0',
  },
  spinner: {
    width: 28, height: 28,
    border: '3px solid #E4E2DC',
    borderTop: '3px solid #0D9488',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  // Cover strip
  cover: {
    height: 56,
    background: 'linear-gradient(135deg, #0A1628 0%, #0D3D35 100%)',
    position: 'relative',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
    padding: '0 16px 8px',
  },
  planPill: {
    borderRadius: 20, padding: '3px 10px',
    fontSize: 10, fontWeight: 700,
  },
  avatarWrap: {
    position: 'relative',
    marginTop: -26,
    marginLeft: 20,
    marginBottom: 6,
    width: 'fit-content',
  },
  body: { padding: '0 18px 14px' },
  name: {
    fontSize: 17, fontWeight: 700,
    color: '#0A1628', letterSpacing: '-0.3px',
    marginBottom: 2,
  },
  role: { fontSize: 12, color: '#9CA3AF', marginBottom: 14 },
  // Stats
  statsRow: {
    display: 'flex', alignItems: 'center',
    border: '1px solid #F0EEEA', borderRadius: 12,
    overflow: 'hidden', marginBottom: 12,
  },
  stat: { flex: 1, padding: '10px 0', textAlign: 'center' },
  statDivider: { width: 1, height: 32, background: '#F0EEEA', flexShrink: 0 },
  statNum:   { fontSize: 16, fontWeight: 700, color: '#0A1628', lineHeight: 1 },
  statLabel: { fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 },
  // Signal
  signalRow: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: '#F9F9F9', borderRadius: 10, padding: '9px 12px',
    marginBottom: 14,
  },
  signalBg: {
    flex: 1, height: 4, borderRadius: 2,
    background: '#E4E2DC', overflow: 'hidden',
  },
  signalFill: {
    height: '100%', borderRadius: 2,
    background: 'linear-gradient(90deg,#0D9488,#5EEAD4)',
    transition: 'width 0.4s ease',
  },
  signalPts:  { fontSize: 11, fontWeight: 700, color: '#0D9488', whiteSpace: 'nowrap' },
  signalRank: { fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap' },
  // Action buttons
  actions: { display: 'flex', gap: 8 },
  btnBase: {
    flex: 1, padding: '11px 0',
    border: 'none', borderRadius: 10,
    fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
    transition: 'opacity 0.2s',
  },
  btnAdd: {
    background: '#0D9488', color: '#fff',
  },
  btnCircle: {
    background: '#F0FDFB',
    border: '1.5px solid #99F6E4',
    color: '#0D9488',
  },
  btnPending: {
    background: '#F3F4F6',
    border: '1.5px solid #E4E2DC',
    color: '#9CA3AF',
  },
  btnMsg: {
    width: 44, height: 44, flexShrink: 0,
    background: '#F3F2EF',
    border: '1.5px solid #E4E2DC',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'not-allowed',
  },
  // View full
  viewFull: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '13px 0 0',
    borderTop: '1px solid #F3F2EF',
    margin: '14px 18px 0',
    fontSize: 13, fontWeight: 600, color: '#0A1628',
    cursor: 'pointer',
  },
  // Upgrade modal
  upgradeOverlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 400,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  upgradeCard: {
    background: '#fff', borderRadius: 16,
    padding: '28px 24px', maxWidth: 320, width: '100%',
    textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
  },
  upgradeTitle: { fontSize: 17, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 },
  upgradeSub:   { fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 20 },
  upgradeBtn: {
    width: '100%', background: '#0D9488', color: '#fff',
    border: 'none', borderRadius: 10, padding: '13px 0',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif', marginBottom: 10,
  },
  upgradeLater: {
    background: 'none', border: 'none',
    color: '#9CA3AF', fontSize: 13, cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
  },
};
