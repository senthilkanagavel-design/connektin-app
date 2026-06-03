// src/components/PulseSheet.jsx
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const GROUP_CONFIG = {
  system:  { label: 'Announcements',    color: '#F59E0B', textColor: '#B45309', bg: '#FEF3C7' },
  circle:  { label: 'Circle activity',  color: '#0A66C2', textColor: '#0A66C2', bg: '#E8F4FF' },
  content: { label: 'Content activity', color: '#F59E0B', textColor: '#B45309', bg: '#FEF3C7' },
  career:  { label: 'Career activity',  color: '#0D9488', textColor: '#0D9488', bg: '#E6FAF8' },
};

const GROUP_ORDER = ['system', 'circle', 'content', 'career'];

export default function PulseSheet({ onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }));
    await batch.commit();
  };

  const markRead = async (notifId) => {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  };

  const handleTap = async (notif) => {
    await markRead(notif.id);
    onClose();
    if (notif.type === 'circle_request' || notif.type === 'circle_accept') {
      if (notif.fromUid) navigate(`/profile/${notif.fromUid}`);
      else navigate('/dashboard', { state: { tab: 'profile' } });
    } else if (notif.type === 'post_like' || notif.type === 'post_comment') {
      navigate('/dashboard', { state: { tab: 'home' } });
    } else if (notif.type === 'new_article') {
      if (notif.articleId) navigate(`/article/${notif.articleId}`);
    } else if (notif.type === 'job_match') {
      navigate('/dashboard', { state: { tab: 'jobs' } });
    } else if (notif.type === 'plan_upgrade' || notif.type === 'broadcast') {
      navigate('/dashboard', { state: { tab: 'home' } });
    }
  };

  // Group notifications
  const grouped = GROUP_ORDER.reduce((acc, group) => {
    const items = notifications.filter(n => n.group === group);
    if (items.length > 0) acc[group] = items;
    return acc;
  }, {});

  const hasAny = notifications.length > 0;
  const hasUnread = notifications.some(n => !n.read);

  const getInitial = (name) => (name || '?').charAt(0).toUpperCase();

  const avatarBg = (fromUid) => {
    const colors = ['#0A66C2', '#0D9488', '#7C3AED', '#B45309', '#0A1628'];
    if (!fromUid) return colors[0];
    return colors[fromUid.charCodeAt(0) % colors.length];
  };

  return (
    <>
      <style>{`
        @keyframes sheet-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .pulse-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 200;
          display: flex;
          align-items: flex-end;
        }
        .pulse-sheet {
          background: #fff;
          border-radius: 20px 20px 0 0;
          width: 100%;
          max-height: 82dvh;
          overflow-y: auto;
          animation: sheet-up 0.28s ease-out;
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
        }
        .pulse-sheet::-webkit-scrollbar { display: none; }
        .notif-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 11px 16px;
          border-bottom: 0.5px solid #F3F2EF;
          cursor: pointer;
          transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .notif-row:last-child { border-bottom: none; }
        .notif-row:active { background: #F8F8F8; }
        .notif-row.unread { background: #FAFCFF; }
      `}</style>

      <div className="pulse-overlay" onClick={onClose}>
        <div className="pulse-sheet" onClick={e => e.stopPropagation()}>

          {/* Handle */}
          <div style={{ width: 36, height: 4, background: '#E4E2DC', borderRadius: 2, margin: '12px auto 0' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'linear-gradient(135deg, #0A66C2, #0D9488)' }} />
              <span style={{ fontSize: 17, fontWeight: 700, color: '#0A1628', fontFamily: 'DM Sans, sans-serif' }}>Your Pulse</span>
            </div>
            {hasUnread && (
              <button
                onClick={markAllRead}
                style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: '#0A66C2', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', padding: '4px 0' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#BBB', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
              Loading your pulse...
            </div>
          )}

          {/* Empty state */}
          {!loading && !hasAny && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🫀</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1628', fontFamily: 'DM Sans, sans-serif', marginBottom: 6 }}>All quiet for now</div>
              <div style={{ fontSize: 13, color: '#888', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                When someone joins your circle, likes your post, or new jobs appear — you'll see it here.
              </div>
            </div>
          )}

          {/* Grouped notifications */}
          {!loading && Object.entries(grouped).map(([group, items]) => {
            const cfg = GROUP_CONFIG[group];
            return (
              <div key={group}>
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px 5px', borderTop: '0.5px solid #F3F2EF' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: cfg.textColor, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Notification items */}
                {items.map(notif => (
                  <div
                    key={notif.id}
                    className={`notif-row ${!notif.read ? 'unread' : ''}`}
                    onClick={() => handleTap(notif)}
                  >
                    {/* Avatar */}
                    {notif.group === 'system' ? (
                      <img
                        src="/icon-512.png"
                        alt="ConnektIn"
                        style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : notif.fromPhoto ? (
                      <img
                        src={notif.fromPhoto}
                        alt={notif.fromName}
                        style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : notif.type === 'job_match' ? (
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E6FAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                      </div>
                    ) : (
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarBg(notif.fromUid), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0, fontFamily: 'DM Sans, sans-serif' }}>
                        {getInitial(notif.fromName)}
                      </div>
                    )}

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.45, fontFamily: 'DM Sans, sans-serif' }}>
                        {notif.fromName && (
                          <span style={{ fontWeight: 700 }}>{notif.fromName} </span>
                        )}
                        {notif.message}
                      </div>
                      {notif.note && (
                        <div style={{ background: '#F0FDFB', border: '1px solid #99F6E4', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#0F6E56', fontStyle: 'italic', marginTop: 6, lineHeight: 1.5, borderLeft: '3px solid #0D9488' }}>
                          "{notif.note}"
                        </div>
                      )}
                      <div style={{ display: 'none' }}>
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 3, fontFamily: 'DM Sans, sans-serif' }}>
                        {timeAgo(notif.createdAt)}
                      </div>
                    </div>

                    {/* Unread dot */}
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                      background: !notif.read ? cfg.color : 'transparent',
                    }} />
                  </div>
                ))}
              </div>
            );
          })}

          {!loading && hasAny && (
            <div style={{ textAlign: 'center', color: '#BBB', fontSize: 12, fontStyle: 'italic', fontFamily: 'DM Sans, sans-serif', padding: '16px 0 4px' }}>
              You're all caught up
            </div>
          )}

        </div>
      </div>
    </>
  );
}

function timeAgo(ts) {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
