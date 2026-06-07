// src/pages/ChatPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { db, storage } from '../firebase/config';
import {
  collection, query, orderBy, onSnapshot, addDoc,
  serverTimestamp, doc, setDoc, updateDoc, getDoc, increment
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatPage() {
  const { conversationId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [otherUser, setOtherUser] = useState(state?.otherUser || null);
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [consentFile, setConsentFile] = useState(null); // { file, type }
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileDocRef = useRef(null);

  const otherUid = conversationId?.split('_').find(id => id !== user?.uid);

  useEffect(() => {
    if (otherUser || !otherUid) return;
    getDoc(doc(db, 'users', otherUid)).then(snap => {
      if (snap.exists()) setOtherUser({ uid: otherUid, ...snap.data() });
    });
  }, [otherUid, otherUser]);

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

  useEffect(() => {
    if (!conversationId || !user?.uid) return;
    updateDoc(doc(db, 'conversations', conversationId), {
      [`unreadCount_${user.uid}`]: 0
    }).catch(() => {});
  }, [conversationId, user?.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close menus on outside click
  useEffect(() => {
    const handler = () => {
      setShowAttachMenu(false);
      setReactionPickerMsgId(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const sendNotification = async (preview) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        uid: otherUid,
        type: 'new_message',
        group: 'messages',
        fromUid: user.uid,
        fromName: profile?.displayName || 'Someone',
        fromPhoto: profile?.photoURL || null,
        message: preview,
        conversationId,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (e) { console.error(e); }
  };

  const upsertConvo = async (lastMessage) => {
    await setDoc(doc(db, 'conversations', conversationId), {
      participants: [user.uid, otherUid],
      lastMessage,
      lastMessageAt: serverTimestamp(),
      [`unreadCount_${otherUid}`]: increment(1),
      [`unreadCount_${user.uid}`]: 0,
    }, { merge: true });
  };

  // Send text message
  const sendMessage = async () => {
    if (!text.trim() || sending || !user?.uid || !otherUid) return;
    setSending(true);
    const msg = text.trim();
    setText('');
    try {
      await upsertConvo(msg);
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: user.uid,
        text: msg,
        type: 'text',
        createdAt: serverTimestamp(),
        read: false,
        reactions: {},
      });
      await sendNotification('sent you a message');
    } catch (e) {
      console.error(e);
      setText(msg);
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // File/image picker
  const handleFileSelect = (accept, type) => {
    setShowAttachMenu(false);
    fileInputRef.current.accept = accept;
    fileInputRef.current._type = type; // 'image' or 'file'
    fileInputRef.current.click();
  };

  const onFileChosen = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = fileInputRef.current._type || 'file';
    setConsentFile({ file, type });
    e.target.value = '';
  };

  // Upload to Firebase Storage after consent
  const sendFileAfterConsent = async () => {
    if (!consentFile) return;
    const { file, type } = consentFile;
    setConsentFile(null);
    setSending(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `chat_attachments/${conversationId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);
      task.on('state_changed', (snap) => {
        setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      });
      await task;
      setUploadProgress(null);
      const url = await getDownloadURL(storageRef);
      const preview = type === 'image' ? '📷 Image' : `📎 ${file.name}`;
      await upsertConvo(preview);
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: user.uid,
        type,
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size,
        text: '',
        createdAt: serverTimestamp(),
        read: false,
        reactions: {},
      });
      await sendNotification(preview);
    } catch (e) {
      console.error(e);
      setUploadProgress(null);
    }
    setSending(false);
  };

  // Send URL
  const sendUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setShowUrlInput(false);
    setUrlInput('');
    setSending(true);
    try {
      await upsertConvo(`🔗 ${url}`);
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: user.uid,
        type: 'url',
        url,
        text: '',
        createdAt: serverTimestamp(),
        read: false,
        reactions: {},
      });
      await sendNotification('shared a link');
    } catch (e) { console.error(e); }
    setSending(false);
  };

  // Emoji reaction
  const handleReact = async (msgId, emoji) => {
    setReactionPickerMsgId(null);
    try {
      const msgRef = doc(db, 'conversations', conversationId, 'messages', msgId);
      const snap = await getDoc(msgRef);
      if (!snap.exists()) return;
      const reactions = snap.data().reactions || {};
      const currentUsers = reactions[emoji] || [];
      const alreadyReacted = currentUsers.includes(user.uid);
      const updatedUsers = alreadyReacted
        ? currentUsers.filter(u => u !== user.uid)
        : [...currentUsers, user.uid];
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: updatedUsers,
      });
    } catch (e) { console.error(e); }
  };

  // Long press handlers
  const startLongPress = (msgId) => {
    const timer = setTimeout(() => setReactionPickerMsgId(msgId), 500);
    setLongPressTimer(timer);
  };
  const cancelLongPress = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
    setLongPressTimer(null);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const renderMessageContent = (item, isMine) => {
    const bubbleStyle = isMine ? s.bubbleMine : s.bubbleTheirs;
    if (item.type === 'image') {
      return (
        <div style={bubbleStyle}>
          <img
            src={item.fileUrl}
            alt={item.fileName}
            style={{ maxWidth: '100%', borderRadius: 8, display: 'block' }}
            onClick={() => window.open(item.fileUrl, '_blank')}
          />
          {item.fileName && <div style={{ fontSize: 10, marginTop: 4, opacity: 0.8 }}>{item.fileName}</div>}
        </div>
      );
    }
    if (item.type === 'file') {
      return (
        <div
          style={{ ...bubbleStyle, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => window.open(item.fileUrl, '_blank')}
        >
          <span style={{ fontSize: 22 }}>📎</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{item.fileName}</div>
            <div style={{ fontSize: 10, opacity: 0.75 }}>{formatSize(item.fileSize)}</div>
          </div>
        </div>
      );
    }
    if (item.type === 'url') {
      return (
        <div style={bubbleStyle}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>Shared a link</div>
          <div
            style={{
              background: isMine ? 'rgba(0,0,0,0.15)' : '#F3F2EF',
              borderRadius: 8, padding: '6px 8px',
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
            }}
            onClick={() => window.open(item.url, '_blank')}
          >
            <span style={{ fontSize: 13 }}>🔗</span>
            <div style={{ fontSize: 11, wordBreak: 'break-all', color: isMine ? '#9FE1CB' : '#185FA5' }}>{item.url}</div>
          </div>
        </div>
      );
    }
    return <div style={bubbleStyle}>{item.text}</div>;
  };

  const items = groupByDate(messages);

  return (
    <div style={s.page} onClick={() => setShowAttachMenu(false)}>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={onFileChosen}
      />

      {/* Top Bar */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate('/messages')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        {otherUser && (
          <div style={s.topBarUser} onClick={() => navigate(`/profile/${otherUid}`)}>
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

      {/* Upload progress bar */}
      {uploadProgress !== null && (
        <div style={s.progressWrap}>
          <div style={{ ...s.progressBar, width: `${uploadProgress}%` }} />
          <span style={s.progressText}>Uploading… {uploadProgress}%</span>
        </div>
      )}

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
          const reactions = item.reactions || {};
          const hasReactions = Object.entries(reactions).some(([, users]) => users.length > 0);

          return (
            <div key={item.id} style={{ position: 'relative' }}>
              {/* Reaction picker */}
              {reactionPickerMsgId === item.id && (
                <div
                  style={{
                    ...s.reactionPicker,
                    [isMine ? 'right' : 'left']: 0,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {EMOJI_LIST.map(emoji => (
                    <span
                      key={emoji}
                      style={s.reactionEmoji}
                      onClick={() => handleReact(item.id, emoji)}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              )}

              <div
                style={{ ...s.msgRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}
                onMouseDown={() => startLongPress(item.id)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(item.id)}
                onTouchEnd={cancelLongPress}
              >
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
                  {renderMessageContent(item, isMine)}
                  <div style={{ ...s.msgTime, textAlign: isMine ? 'right' : 'left' }}>
                    {formatTime(item.createdAt)}
                    {isMine && <span style={{ marginLeft: 4, color: '#9FE1CB' }}>✓✓</span>}
                  </div>
                  {/* Reactions display */}
                  {hasReactions && (
                    <div style={{ ...s.reactionsRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      {Object.entries(reactions).map(([emoji, users]) =>
                        users.length > 0 ? (
                          <div
                            key={emoji}
                            style={{
                              ...s.reactionBadge,
                              background: users.includes(user?.uid) ? '#E1F5EE' : '#fff',
                              border: users.includes(user?.uid) ? '1px solid #0D9488' : '1px solid #E4E2DC',
                            }}
                            onClick={() => handleReact(item.id, emoji)}
                          >
                            <span style={{ fontSize: 12 }}>{emoji}</span>
                            <span style={{ fontSize: 10, color: '#64748B' }}>{users.length}</span>
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Privacy Notice */}
      <div style={s.privacyNotice}>
        <span style={{ fontSize: 13 }}>🔒</span>
        <span style={s.privacyText}>
          Messages are private between members. Do not share patient data, PHI, or confidential records. Misuse will result in immediate account suspension.
        </span>
      </div>

      {/* Attach Menu */}
      {showAttachMenu && (
        <div style={s.attachMenu} onClick={e => e.stopPropagation()}>
          <div style={s.attachItem} onClick={() => handleFileSelect('image/*', 'image')}>
            <div style={{ ...s.attachIcon, background: '#E1F5EE' }}>📷</div>
            <div>
              <div style={s.attachLabel}>Image</div>
              <div style={s.attachSub}>Upload from device</div>
            </div>
          </div>
          <div style={s.attachItem} onClick={() => handleFileSelect('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv', 'file')}>
            <div style={{ ...s.attachIcon, background: '#E6F1FB' }}>📎</div>
            <div>
              <div style={s.attachLabel}>File</div>
              <div style={s.attachSub}>PDF, DOC, XLSX and more</div>
            </div>
          </div>
          <div style={s.attachItem} onClick={() => { setShowAttachMenu(false); setShowUrlInput(true); }}>
            <div style={{ ...s.attachIcon, background: '#FAEEDA' }}>🔗</div>
            <div>
              <div style={s.attachLabel}>URL</div>
              <div style={s.attachSub}>YouTube, articles, any link</div>
            </div>
          </div>
        </div>
      )}

      {/* URL Input Bar */}
      {showUrlInput && (
        <div style={s.urlInputBar}>
          <input
            style={s.urlInput}
            placeholder="Paste a URL…"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendUrl()}
            autoFocus
          />
          <button style={s.urlSendBtn} onClick={sendUrl} disabled={!urlInput.trim()}>Send</button>
          <button style={s.urlCancelBtn} onClick={() => { setShowUrlInput(false); setUrlInput(''); }}>✕</button>
        </div>
      )}

      {/* Input Bar */}
      {!showUrlInput && (
        <div style={s.inputBar}>
          <button
            style={s.attachBtn}
            onClick={e => { e.stopPropagation(); setShowAttachMenu(v => !v); }}
            aria-label="Attach"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
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
      )}

      {/* Consent Popup */}
      {consentFile && (
        <div style={s.consentOverlay} onClick={() => setConsentFile(null)}>
          <div style={s.consentBox} onClick={e => e.stopPropagation()}>
            <div style={s.consentTitle}>Before you share this {consentFile.type === 'image' ? 'image' : 'file'}</div>
            <div style={s.consentFile}>
              <span style={{ fontSize: 20 }}>{consentFile.type === 'image' ? '📷' : '📎'}</span>
              <span style={s.consentFileName}>{consentFile.file.name}</span>
              <span style={s.consentFileSize}>{formatSize(consentFile.file.size)}</span>
            </div>
            <div style={s.consentText}>
              Please confirm this {consentFile.type === 'image' ? 'image' : 'file'} does not contain any patient data, PHI, or confidential records. Sharing such content will result in immediate account suspension.
            </div>
            <div style={s.consentBtns}>
              <button style={s.consentCancel} onClick={() => setConsentFile(null)}>Cancel</button>
              <button style={s.consentConfirm} onClick={sendFileAfterConsent}>I confirm, send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:           { display: 'flex', flexDirection: 'column', height: '100dvh', background: '#F3F2EF', fontFamily: 'DM Sans, sans-serif', position: 'relative' },
  topBar:         { display: 'flex', alignItems: 'center', padding: '10px 16px', background: '#0A1628', gap: 10, flexShrink: 0 },
  backBtn:        { background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex', alignItems: 'center' },
  topBarUser:     { flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  topBarName:     { fontSize: 14, fontWeight: 600, color: '#fff' },
  topBarSub:      { fontSize: 11, color: '#9FE1CB' },
  iconBtn:        { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },

  progressWrap:   { position: 'relative', height: 28, background: '#E1F5EE', flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: 12 },
  progressBar:    { position: 'absolute', left: 0, top: 0, height: '100%', background: '#0D9488', transition: 'width 0.3s', opacity: 0.25 },
  progressText:   { fontSize: 11, color: '#0D9488', fontWeight: 600, zIndex: 1 },

  msgArea:        { flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 6 },
  dateDivider:    { textAlign: 'center', fontSize: 11, color: '#94A3B8', margin: '8px 0', background: 'rgba(243,242,239,0.9)', borderRadius: 20, padding: '4px 12px', alignSelf: 'center' },
  msgRow:         { display: 'flex', alignItems: 'flex-end', gap: 7 },
  bubbleTheirs:   { background: '#fff', border: '1px solid #E4E2DC', color: '#0A1628', padding: '9px 13px', borderRadius: 16, borderBottomLeftRadius: 3, fontSize: 13, lineHeight: 1.5 },
  bubbleMine:     { background: '#0D9488', color: '#fff', padding: '9px 13px', borderRadius: 16, borderBottomRightRadius: 3, fontSize: 13, lineHeight: 1.5 },
  msgTime:        { fontSize: 10, color: '#94A3B8', marginTop: 3, paddingLeft: 4, paddingRight: 4 },
  emptyChat:      { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60 },
  emptyChatIcon:  { fontSize: 36 },
  emptyChatText:  { fontSize: 14, color: '#94A3B8' },

  reactionsRow:   { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionBadge:  { display: 'inline-flex', alignItems: 'center', gap: 3, borderRadius: 20, padding: '2px 7px', cursor: 'pointer' },
  reactionPicker: { position: 'absolute', top: -44, zIndex: 20, background: '#fff', border: '1px solid #E4E2DC', borderRadius: 30, padding: '6px 12px', display: 'flex', gap: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' },
  reactionEmoji:  { fontSize: 22, cursor: 'pointer' },

  privacyNotice:  { display: 'flex', alignItems: 'flex-start', gap: 6, padding: '7px 14px', background: '#FFF8E7', borderTop: '1px solid #FDE68A', flexShrink: 0 },
  privacyText:    { fontSize: 11, color: '#92400E', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.4 },

  attachMenu:     { position: 'absolute', bottom: 70, left: 12, background: '#fff', borderRadius: 14, border: '1px solid #E4E2DC', padding: 8, zIndex: 30, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 220 },
  attachItem:     { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer' },
  attachIcon:     { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
  attachLabel:    { fontSize: 13, fontWeight: 600, color: '#0A1628', fontFamily: 'DM Sans, sans-serif' },
  attachSub:      { fontSize: 11, color: '#64748B', fontFamily: 'DM Sans, sans-serif' },

  urlInputBar:    { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff', borderTop: '1px solid #E4E2DC', flexShrink: 0 },
  urlInput:       { flex: 1, border: '1px solid #E4E2DC', borderRadius: 20, padding: '9px 14px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#0A1628', background: '#F3F2EF', outline: 'none' },
  urlSendBtn:     { background: '#0D9488', color: '#fff', border: 'none', borderRadius: 20, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' },
  urlCancelBtn:   { background: 'none', border: 'none', color: '#94A3B8', fontSize: 16, cursor: 'pointer' },

  inputBar:       { display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 14px', background: '#fff', borderTop: '1px solid #E4E2DC', flexShrink: 0 },
  attachBtn:      { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 },
  input:          { flex: 1, border: '1px solid #E4E2DC', borderRadius: 20, padding: '9px 14px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#0A1628', background: '#F3F2EF', outline: 'none', resize: 'none', maxHeight: 100, lineHeight: 1.5 },
  sendBtn:        { width: 38, height: 38, borderRadius: '50%', background: '#0D9488', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'opacity 0.2s' },

  consentOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  consentBox:     { background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: 480 },
  consentTitle:   { fontSize: 16, fontWeight: 700, color: '#0A1628', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' },
  consentFile:    { display: 'flex', alignItems: 'center', gap: 8, background: '#F3F2EF', borderRadius: 10, padding: '10px 14px', marginBottom: 12 },
  consentFileName:{ fontSize: 13, fontWeight: 600, color: '#0A1628', flex: 1, fontFamily: 'DM Sans, sans-serif' },
  consentFileSize:{ fontSize: 11, color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' },
  consentText:    { fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 20, fontFamily: 'DM Sans, sans-serif' },
  consentBtns:    { display: 'flex', gap: 10 },
  consentCancel:  { flex: 1, padding: '12px', border: '1px solid #E4E2DC', borderRadius: 12, background: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748B', fontFamily: 'DM Sans, sans-serif' },
  consentConfirm: { flex: 1, padding: '12px', border: 'none', borderRadius: 12, background: '#0D9488', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff', fontFamily: 'DM Sans, sans-serif' },
};
