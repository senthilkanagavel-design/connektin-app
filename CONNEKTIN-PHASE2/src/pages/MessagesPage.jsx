// src/pages/MessagesPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, getDoc
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

export default function MessagesPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );
    const unsub = onSnapshot(q, async (snap) => {
      const convos = await Promise.all(snap.docs.map(async (d) => {
        const data = { id: d.id, ...d.data() };
        const otherUid = data.participants.find(p => p !== user.uid);
        if (!otherUid) return null;
        try {
          const userSnap = await getDoc(doc(db, 'users', otherUid));
          data.otherUser = userSnap.exists() ? { uid: otherUid, ...userSnap.data() } : { uid: otherUid, displayName: 'ConnektIn User' };
        } catch {
          data.otherUser = { uid: otherUid, displayName: 'ConnektIn User' };
        }
        return data;
      }));
      setConversations(convos.filter(Boolean));
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  const filtered = conversations.filter(c =>
    c.otherUser?.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const myUnread = (c) => c[`unreadCount_${user?.uid}`] || 0;

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    const days = Math.floor(diff / 86400000);
    if (days === 1) return 'Yesterday';
    if (days < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={s.page}>
      {/* Top Bar */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate('/dashboard', { state: { tab: 'profile' } })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={s.topBarTitle}>Messages</span>
        <button style={s.iconBtn} onClick={() => navigate('/my-circle')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9FE1CB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>

      {/* Search */}
      <div style={s.searchWrap}>
        <div style={s.searchInner}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            style={s.searchInput}
            placeholder="Search conversations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div style={s.list}>
        {loading ? (
          <div style={s.empty}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={s.emptyWrap}>
            <div style={s.emptyIcon}>💬</div>
            <div style={s.emptyTitle}>No messages yet</div>
            <div style={s.emptySub}>Go to someone's profile in Circle and tap Message to start a conversation.</div>
            <button style={s.emptyBtn} onClick={() => navigate('/my-circle')}>Browse Circle</button>
          </div>
        ) : (
          filtered.map((c, i) => {
            const u = c.otherUser;
            const unread = myUnread(c);
            return (
              <div
                key={c.id}
                style={{ ...s.convoItem, borderBottom: i < filtered.length - 1 ? '1px solid #F3F2EF' : 'none' }}
                onClick={() => navigate(`/messages/${c.id}`, { state: { otherUser: u } })}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    uid={u.uid}
                    photoURL={u.photoURL}
                    avatarId={u.avatarId || u.avatar}
                    displayName={u.displayName}
                    plan={u.plan}
                    role={u.role}
                    size={44}
                  />
                </div>
                <div style={s.convoBody}>
                  <div style={s.convoName}>{u.displayName}</div>
                  <div style={{ ...s.convoPreview, fontWeight: unread > 0 ? 600 : 400 }}>
                    {c.lastMessage || 'Say hello!'}
                  </div>
                </div>
                <div style={s.convoMeta}>
                  <div style={s.convoTime}>{formatTime(c.lastMessageAt)}</div>
                  {unread > 0 && <div style={s.unreadDot} />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const s = {
  page:        { display: 'flex', flexDirection: 'column', background: '#F3F2EF', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' },
  topBar:      { display: 'flex', alignItems: 'center', padding: '12px 16px', background: '#0A1628', position: 'sticky', top: 0, zIndex: 10, gap: 10 },
  backBtn:     { background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex', alignItems: 'center' },
  topBarTitle: { flex: 1, fontSize: 16, fontWeight: 700, color: '#fff' },
  iconBtn:     { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  searchWrap:  { background: '#fff', padding: '10px 16px', borderBottom: '1px solid #E4E2DC' },
  searchInner: { display: 'flex', alignItems: 'center', gap: 8, background: '#F3F2EF', borderRadius: 20, padding: '8px 14px' },
  searchInput: { border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#374151', flex: 1, fontFamily: 'DM Sans, sans-serif' },
  list:        { background: '#fff', flex: 1 },
  convoItem:   { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: '#fff' },
  convoBody:   { flex: 1, minWidth: 0 },
  convoName:   { fontSize: 14, fontWeight: 600, color: '#0A1628', marginBottom: 2 },
  convoPreview:{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  convoMeta:   { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  convoTime:   { fontSize: 11, color: '#94A3B8' },
  unreadDot:   { width: 9, height: 9, borderRadius: '50%', background: '#0D9488' },
  empty:       { padding: 32, textAlign: 'center', fontSize: 14, color: '#94A3B8' },
  emptyWrap:   { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 32px', gap: 10 },
  emptyIcon:   { fontSize: 40 },
  emptyTitle:  { fontSize: 16, fontWeight: 700, color: '#0A1628' },
  emptySub:    { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 1.5 },
  emptyBtn:    { marginTop: 8, background: '#0D9488', color: '#fff', border: 'none', borderRadius: 20, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' },
};
