// src/pages/ChatPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { db } from '../firebase/config';
import {
  collection, query, orderBy, onSnapshot, addDoc,
  serverTimestamp, doc, setDoc, updateDoc, getDoc, increment
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

export default function ChatPage() {
  const { conversationId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [otherUser, setOtherUser] = useState(state?.otherUser || null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Derive otherUid from conversationId (uid1_uid2 format)
  const otherUid = conversationId?.split('_').find(id => id !== user?.uid);

  // Fetch other user if not in state
  useEffect(() => {
    if (otherUser || !otherUid) return;
    getDoc(doc(db, 'users', otherUid)).then(snap => {
      if (snap.exists()) setOtherUser({ uid: otherUid, ...snap.data() });
    });
  }, [otherUid, otherUser]);

  // Listen to messages
  useEffect(() => {
    if (!conversationId) return;
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [conversationId]);

  // Mark as read when entering chat
  useEffect(() => {
    if (!conversationId || !user?.uid) return;
    updateDoc(doc(db, 'conversations', conversationId), {
      [`unreadCount_${user.uid}`]: 0
    }).catch(() => {});
  }, [conversationId, user?.uid]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || sending || !user?.uid || !otherUid) return;
    setSending(true);
    const msg = text.trim();
    setText('');
    try {
      const convoRef = doc(db, 'conversations', conversationId);
      // Upsert conversation doc
      await setDoc(convoRef, {
        participants: [user.uid, otherUid],
        lastMessage: msg,
        lastMessageAt: serverTimestamp(),
        [`unreadCount_${otherUid}`]: increment(1),
        [`unreadCount_${user.uid}`]: 0,
      }, { merge: true });
      // Add message
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: user.uid,
        text: msg,
        createdAt: serverTimestamp(),
        read: false,
      });
      // Notification for other user
      await addDoc(collection(db, 'notifications'), {
        uid: otherUid,
        type: 'new_message',
        group: 'messages',
        fromUid: user.uid,
        fromName: profile?.displayName || 'Someone',
        fromPhoto: profile?.photoURL || null,
        message: `sent you a message`,
        conversationId,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      setText(msg);
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const groupByDate = (msgs) => {
    const groups = [];
    let lastDate = null;
    msgs.forEach(m => {
      const d = m.createdAt?.toDate ? m.createdAt.toDate() : new Date();
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      if (dateStr !== lastDate) { groups.push({ type: 'date', label: dateStr }); lastDate = dateStr; }
      groups.push({ type: 'msg', ...m });
    });
    return groups;
  };

  const items = groupByDate(messages);

  return (
    <div style={s.page}>
      {/* Top Bar */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate('/messages')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        {otherUser && (
          <div
            style={s.topBarUser}
            onClick={() => navigate(`/profile/${otherUid}`)}
          >
            <Avatar
              uid={otherUser.uid}
              photoURL={otherUser.photoURL}
              avatarId={otherUser.avatarId || otherUser.avatar}
              displayName={otherUser.displayName}
              plan={otherUser.plan}
              role={otherUser.role}
              size={34}
            />
            <div>
              <div style={s.topBarName}>{otherUser.displayName}</div>
              <div style={s.topBarSub}>
                {otherUser.industry
                  ? otherUser.industry.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                  : 'ConnektIn Member'}
              </div>
            </div>
          </div>
        )}
        <button style={s.iconBtn} onClick={() => otherUid && navigate(`/profile/${otherUid}`)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9FE1CB" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        </button>
      </div>

      {/* Messages */}
      <div style={s.msgArea}>
        {items.length === 0 && (
          <div style={s.emptyChat}>
            <div style={s.emptyChatIcon}>👋</div>
            <div style={s.emptyChatText}>Start the conversation!</div>
          </div>
        )}
        {items.map((item, i) => {
          if (item.type === 'date') {
            return <div key={`date-${i}`} style={s.dateDivider}>{item.label}</div>;
          }
          const isMine = item.senderId === user?.uid;
          return (
            <div key={item.id} style={{ ...s.msgRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              {!isMine && otherUser && (
                <div style={{ flexShrink: 0, alignSelf: 'flex-end' }}>
                  <Avatar
                    uid={otherUser.uid}
                    photoURL={otherUser.photoURL}
                    avatarId={otherUser.avatarId || otherUser.avatar}
                    displayName={otherUser.displayName}
                    plan={otherUser.plan}
                    role={otherUser.role}
                    size={28}
                  />
                </div>
              )}
              <div style={{ maxWidth: '72%' }}>
                <div style={isMine ? s.bubbleMine : s.bubbleTheirs}>{item.text}</div>
                <div style={{ ...s.msgTime, textAlign: isMine ? 'right' : 'left' }}>
                  {formatTime(item.createdAt)}
                  {isMine && <span style={{ marginLeft: 4, color: '#9FE1CB' }}>✓✓</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div style={s.inputBar}>
        <textarea
          style={s.input}
          placeholder="Type a message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          style={{ ...s.sendBtn, opacity: text.trim() && !sending ? 1 : 0.5 }}
          onClick={sendMessage}
          disabled={!text.trim() || sending}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}

const s = {
  page:          { display: 'flex', flexDirection: 'column', height: '100dvh', background: '#F3F2EF', fontFamily: 'DM Sans, sans-serif' },
  topBar:        { display: 'flex', alignItems: 'center', padding: '10px 16px', background: '#0A1628', gap: 10, flexShrink: 0 },
  backBtn:       { background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex', alignItems: 'center' },
  topBarUser:    { flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  topBarName:    { fontSize: 14, fontWeight: 600, color: '#fff' },
  topBarSub:     { fontSize: 11, color: '#9FE1CB' },
  iconBtn:       { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  msgArea:       { flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 6 },
  dateDivider:   { textAlign: 'center', fontSize: 11, color: '#94A3B8', margin: '8px 0', background: 'rgba(243,242,239,0.9)', borderRadius: 20, padding: '4px 12px', alignSelf: 'center' },
  msgRow:        { display: 'flex', alignItems: 'flex-end', gap: 7 },
  bubbleTheirs:  { background: '#fff', border: '1px solid #E4E2DC', color: '#0A1628', padding: '9px 13px', borderRadius: 16, borderBottomLeftRadius: 3, fontSize: 13, lineHeight: 1.5 },
  bubbleMine:    { background: '#0D9488', color: '#fff', padding: '9px 13px', borderRadius: 16, borderBottomRightRadius: 3, fontSize: 13, lineHeight: 1.5 },
  msgTime:       { fontSize: 10, color: '#94A3B8', marginTop: 3, paddingLeft: 4, paddingRight: 4 },
  emptyChat:     { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60 },
  emptyChatIcon: { fontSize: 36 },
  emptyChatText: { fontSize: 14, color: '#94A3B8' },
  inputBar:      { display: 'flex', alignItems: 'flex-end', gap: 10, padding: '10px 14px', background: '#fff', borderTop: '1px solid #E4E2DC', flexShrink: 0 },
  input:         { flex: 1, border: '1px solid #E4E2DC', borderRadius: 20, padding: '9px 14px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#0A1628', background: '#F3F2EF', outline: 'none', resize: 'none', maxHeight: 100, lineHeight: 1.5 },
  sendBtn:       { width: 38, height: 38, borderRadius: '50%', background: '#0D9488', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'opacity 0.2s' },
};
