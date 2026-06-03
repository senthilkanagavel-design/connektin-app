// src/components/PulseButton.jsx
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import PulseSheet from './PulseSheet';

export default function PulseButton() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadGroup, setUnreadGroup] = useState(null); // 'circle' | 'content' | 'career'
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', user.uid),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      const unread = snap.docs.map(d => d.data());
      setUnreadCount(unread.length);
      // Determine dot color by priority: system > circle > content > career
      if (unread.some(n => n.group === 'system'))       setUnreadGroup('system');
      else if (unread.some(n => n.group === 'circle'))  setUnreadGroup('circle');
      else if (unread.some(n => n.group === 'content')) setUnreadGroup('content');
      else if (unread.some(n => n.group === 'career'))  setUnreadGroup('career');
      else setUnreadGroup(null);
    });
    return () => unsub();
  }, [user]);

  const dotColor = unreadGroup === 'system'  ? '#F59E0B'
                 : unreadGroup === 'circle'  ? '#0D9488'
                 : unreadGroup === 'content' ? '#F59E0B'
                 : unreadGroup === 'career'  ? '#34D399'
                 : '#D1D5DB';

  const hasUnread = unreadCount > 0;

  return (
    <>
      <style>{`
        @keyframes pulse-breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.5; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .pulse-dot-inner {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .pulse-dot-inner.active {
          animation: pulse-breathe 2s ease-in-out infinite;
        }
        .pulse-ring-anim {
          position: absolute;
          top: -1px; left: -1px;
          width: 12px; height: 12px;
          border-radius: 50%;
          animation: pulse-ring 2s ease-out infinite;
        }
        .pulse-btn-wrap {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.15s;
        }
        .pulse-btn-wrap:active {
          background: rgba(255,255,255,0.18);
        }
      `}</style>

      <button
        className="pulse-btn-wrap"
        onClick={() => setSheetOpen(true)}
        aria-label={hasUnread ? `${unreadCount} unread notifications` : 'No new notifications'}
      >
        <div
          className={`pulse-dot-inner ${hasUnread ? 'active' : ''}`}
          style={{ background: dotColor }}
        >
          {hasUnread && (
            <div className="pulse-ring-anim" style={{ background: dotColor }} />
          )}
        </div>
      </button>

      {sheetOpen && (
        <PulseSheet onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
}
