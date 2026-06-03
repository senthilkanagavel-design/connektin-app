// src/components/ProfilePhotoSheet.jsx
import { useRef, useState } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../firebase/config';
import { AVATARS } from '../utils/avatars';

async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 400;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, 'image/jpeg', 0.82);
    };
    img.src = url;
  });
}

export default function ProfilePhotoSheet({ uid, profile, onClose, onUpdated }) {
  const fileRef  = useRef(null);
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('main'); // 'main' | 'avatars'
  const [status, setStatus]   = useState('');

  const hasPhoto = !!(profile?.photoURL || profile?.avatarId);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatus('Compressing…');
    try {
      const blob       = await compressImage(file);
      setStatus('Uploading…');
      const storageRef = ref(storage, `users/${uid}/photo.jpg`);
      await uploadBytes(storageRef, blob);
      const rawURL    = await getDownloadURL(storageRef);
      const photoURL   = rawURL;
      await updateDoc(doc(db, 'users', uid), { photoURL, avatarId: null });
      onUpdated?.({ photoURL, avatarId: null });
      onClose();
    } catch (err) {
      console.error(err);
      setStatus('Upload failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarPick(avatarId) {
    setLoading(true);
    setStatus('Saving…');
    try {
      await updateDoc(doc(db, 'users', uid), { avatarId, photoURL: null });
      onUpdated?.({ avatarId, photoURL: null });
      setTimeout(onClose, 300);
    } catch (err) {
      console.error(err);
      setStatus('Failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setLoading(true);
    setStatus('Removing…');
    try {
      if (profile?.photoURL) {
        try {
          await deleteObject(ref(storage, `users/${uid}/photo.jpg`));
        } catch (_) {}
      }
      await updateDoc(doc(db, 'users', uid), { photoURL: null, avatarId: null });
      onUpdated?.({ photoURL: null, avatarId: null });
      setTimeout(onClose, 300);
    } catch (err) {
      console.error(err);
      setStatus('Failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: '#fff', borderRadius: '22px 22px 0 0',
        padding: '0 0 32px', fontFamily: 'DM Sans, sans-serif',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: '#E4E2DC' }} />
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 16px' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>
            {section === 'avatars' ? 'Choose Avatar' : 'Profile Photo'}
          </span>
          <button
            onClick={section === 'avatars' ? () => setSection('main') : onClose}
            style={{ background: 'none', border: 'none', fontSize: 13, color: '#0D9488', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
          >
            {section === 'avatars' ? '← Back' : 'Cancel'}
          </button>
        </div>

        {/* Status */}
        {status !== '' && (
          <div style={{ textAlign: 'center', fontSize: 13, color: '#0D9488', margin: '-8px 0 12px', fontWeight: 500 }}>
            {status}
          </div>
        )}

        {/* MAIN OPTIONS */}
        {section === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <button disabled={loading} onClick={() => fileRef.current?.click()} style={optionStyle}>
              <span style={iconWrap('#E6FAF8')}>📷</span>
              <div style={optionText}>
                <span style={optionLabel}>Upload photo</span>
                <span style={optionSub}>From your device · camera or gallery</span>
              </div>
            </button>

            <div style={divider} />

            <button disabled={loading} onClick={() => setSection('avatars')} style={optionStyle}>
              <span style={iconWrap('#EDF7F2')}>🎨</span>
              <div style={optionText}>
                <span style={optionLabel}>Choose avatar</span>
                <span style={optionSub}>8 abstract designs · no photo needed</span>
              </div>
              <span style={{ fontSize: 18, color: '#C4C4C4' }}>›</span>
            </button>

            {hasPhoto && (
              <>
                <div style={divider} />
                <button disabled={loading} onClick={handleRemove} style={{ ...optionStyle, opacity: loading ? 0.5 : 1 }}>
                  <span style={iconWrap('#FDF1EF')}>🗑️</span>
                  <div style={optionText}>
                    <span style={{ ...optionLabel, color: '#C0392B' }}>Remove photo</span>
                    <span style={optionSub}>Revert to default initials avatar</span>
                  </div>
                </button>
              </>
            )}
          </div>
        )}

        {/* AVATAR GRID */}
        {section === 'avatars' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, padding: '4px 20px 8px' }}>
            {AVATARS.map(av => (
              <button
                key={av.id}
                disabled={loading}
                onClick={() => handleAvatarPick(av.id)}
                style={{
                  background: 'none',
                  border: profile?.avatarId === av.id ? '2.5px solid #0D9488' : '2px solid #E4E2DC',
                  borderRadius: '50%', padding: 0, cursor: 'pointer',
                  width: 68, height: 68,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto', opacity: loading ? 0.5 : 1,
                  transition: 'border-color 0.15s',
                }}
              >
                {av.render(64)}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const optionStyle = { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'DM Sans, sans-serif' };
const iconWrap = (bg) => ({ width: 42, height: 42, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 });
const optionText = { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 };
const optionLabel = { fontSize: 15, fontWeight: 600, color: '#1A1A1A' };
const optionSub = { fontSize: 12, color: '#6B7280' };
const divider = { height: 1, background: '#F3F2EF', margin: '0 20px' };
