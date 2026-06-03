// src/pages/tabs/ProfileTab.jsx
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/Avatar';
import ProfilePhotoSheet from '../../components/ProfilePhotoSheet';

export default function ProfileTab({ userData, isTrial, onUpgrade }) {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [localData, setLocalData] = useState(null);

  const profile     = localData ? { ...userData, ...localData } : userData;
  const displayName = profile?.displayName || 'User';
  const email       = profile?.email || '';
  const industry    = profile?.industry ? profile.industry.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
  const plan        = profile?.plan || 'trial';
  const role        = profile?.role || 'participant';
  const bio         = profile?.bio || '';
  const totalRead   = Object.values(profile?.readCounts || {}).reduce((a, b) => a + b, 0);
  const isAdmin     = role === 'admin';

  const planConfig = {
    trial:    { label: 'Free Trial',    color: '#B45309', bg: '#FEF3C7' },
    thermite: { label: 'TherMite Plan', color: '#0D9488', bg: '#E6FAF8' },
    regular:  { label: 'Regular Plan',  color: '#0A1628', bg: '#E8EAF0' },
  }[plan] || { label: plan, color: '#666', bg: '#F3F2EF' };

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  return (
    <div style={s.page}>
      {sheetOpen && (
        <ProfilePhotoSheet uid={profile?.uid} profile={profile} onClose={() => setSheetOpen(false)} onUpdated={(changes) => setLocalData(prev => ({ ...prev, ...changes }))} />
      )}

      <div style={s.heroCard}>
        {/* Navy gradient — this is where navy looks great */}
        <div style={s.heroBg} />
        <div style={s.heroContent}>
          <div style={{ marginBottom: 10 }}>
            <Avatar uid={profile?.uid} photoURL={profile?.photoURL} avatarId={profile?.avatarId} plan={plan} role={role} readCount={totalRead} size={72} onCamera={() => setSheetOpen(true)} />
          </div>
          <h2 style={s.name}>{displayName}</h2>
          <p style={s.industry}>{industry}</p>
          {bio ? <p style={s.bio}>{bio}</p> : null}
          <div style={s.planRow}>
            <span style={{ ...s.planBadge, backgroundColor: planConfig.bg, color: planConfig.color }}>{planConfig.label}</span>
          </div>
        </div>
        <div style={s.statsStrip}>
          <StatCell value={totalRead} label="Articles Read" />
          <div style={s.stripDiv} />
          <StatCell value={0} label="Jobs Viewed" />
          <div style={s.stripDiv} />
          <StatCell value={0} label="Profile Views" />
        </div>
      </div>

      {isTrial && (
        <div style={s.upgradeBanner}>
          <div style={s.upgradeLeft}>
            <p style={s.upgradeTitle}>You're on a free trial</p>
            <p style={s.upgradeSub}>Unlock all features with a paid plan</p>
          </div>
          <button style={s.upgradeBtn} onClick={onUpgrade}>Upgrade</button>
        </div>
      )}

      {isAdmin && (
        <div style={s.section}>
          <SectionHeader title="Admin" />
          <div onClick={() => navigate('/admin')} style={{ ...mr.row, borderBottom: 'none', cursor: 'pointer' }}>
            <span style={mr.icon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            <div style={mr.text}>
              <span style={{ ...mr.label, color: '#0D9488' }}>Admin Panel</span>
              <span style={mr.sub}>Manage articles, users, jobs & posts</span>
            </div>
            <ChevronIcon />
          </div>
        </div>
      )}

      <div style={s.section}>
        <SectionHeader title="Account" />
        <InfoRow label="Email"        value={email} />
        <InfoRow label="Industry"     value={industry} />
        <InfoRow label="Plan"         value={planConfig.label} highlight={planConfig.color} />
        <InfoRow label="Member since" value={formatDate(profile?.createdAt)} last />
      </div>

      <div style={s.section}>
        <SectionHeader title="Settings" />
        <MenuRow icon={<EditProfileIcon />} label="Edit Profile"     sub="Update name and bio"         onClick={() => navigate('/edit-profile')} />
        <MenuRow icon={<IndustryIcon />}    label="Change Industry"  sub="Free swap every 90 days"     disabled={isTrial} onClick={() => navigate('/industry-swap')} />
        <MenuRow icon={<BellIcon />}        label="Notifications"    sub="Manage alerts" />
        <MenuRow icon={<ShieldIcon />}      label="Privacy"          sub="Data & visibility" />
        <MenuRow icon={<HelpIcon />}        label="Help & Support"   sub="FAQs and contact" last />
      </div>

      <button style={s.signOutBtn} onClick={handleLogout}><SignOutIcon />Sign Out</button>
      <p style={s.version}>ConnektIn v2.0 · Powered by TherMite Educare</p>
    </div>
  );
}

function StatCell({ value, label }) {
  return <div style={sc.cell}><span style={sc.value}>{value}</span><span style={sc.label}>{label}</span></div>;
}
function SectionHeader({ title }) { return <p style={sh.text}>{title}</p>; }
function InfoRow({ label, value, highlight, last }) {
  return (
    <div style={{ ...ir.row, borderBottom: last ? 'none' : '1px solid #F3F2EF' }}>
      <span style={ir.label}>{label}</span>
      <span style={{ ...ir.value, color: highlight || '#1A1A1A' }}>{value}</span>
    </div>
  );
}
function MenuRow({ icon, label, sub, disabled, last, onClick }) {
  return (
    <div style={{ ...mr.row, opacity: disabled ? 0.4 : 1, borderBottom: last ? 'none' : '1px solid #F3F2EF', cursor: onClick && !disabled ? 'pointer' : 'default' }} onClick={!disabled && onClick ? onClick : undefined}>
      <span style={mr.icon}>{icon}</span>
      <div style={mr.text}><span style={mr.label}>{label}</span><span style={mr.sub}>{sub}</span></div>
      <ChevronIcon />
    </div>
  );
}
function formatDate(createdAt) {
  if (!createdAt) return '—';
  const d = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

const EditProfileIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IndustryIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const BellIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const ShieldIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const HelpIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const ChevronIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const SignOutIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

const s = {
  page:          { display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 32 },
  heroCard:      { backgroundColor: '#fff', border: '1px solid #E4E2DC', overflow: 'hidden', borderRadius: '0 0 12px 12px' },
  heroBg:        { height: 80, background: 'linear-gradient(135deg, #0A1628 0%, #0d2744 100%)' }, // navy — stays navy
  heroContent:   { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px 16px', marginTop: -36 },
  name:          { margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1A1A1A', fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.01em' },
  industry:      { margin: '0 0 6px', fontSize: 13, color: '#555', fontFamily: 'DM Sans, sans-serif' },
  bio:           { margin: '0 0 8px', fontSize: 13, color: '#888', fontFamily: 'DM Sans, sans-serif', textAlign: 'center', lineHeight: 1.5, maxWidth: 260, fontStyle: 'italic' },
  planRow:       { display: 'flex' },
  planBadge:     { fontSize: 11, fontWeight: 600, padding: '3px 12px', borderRadius: 20, fontFamily: 'DM Sans, sans-serif' },
  statsStrip:    { display: 'flex', borderTop: '1px solid #F3F2EF', marginTop: 12 },
  stripDiv:      { width: 1, backgroundColor: '#E4E2DC', margin: '8px 0' },
  upgradeBanner: { margin: '0 16px', backgroundColor: '#E6FAF8', borderRadius: 10, border: '1px solid #99F6E4', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  upgradeLeft:   { flex: 1 },
  upgradeTitle:  { margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#1A1A1A', fontFamily: 'DM Sans, sans-serif' },
  upgradeSub:    { margin: 0, fontSize: 12, color: '#555', fontFamily: 'DM Sans, sans-serif' },
  upgradeBtn:    { flexShrink: 0, padding: '8px 16px', backgroundColor: '#0D9488', color: '#fff', border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' },
  section:       { margin: '0 16px', backgroundColor: '#fff', borderRadius: 10, border: '1px solid #E4E2DC', overflow: 'hidden' },
  signOutBtn:    { margin: '4px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#fff', color: '#CC1A00', border: '1px solid #FECACA', borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' },
  version:       { textAlign: 'center', fontSize: 11, color: '#BBB', fontFamily: 'DM Sans, sans-serif', margin: '4px 0 0' },
};
const sc = { cell: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px', gap: 2 }, value: { fontSize: 17, fontWeight: 700, color: '#1A1A1A', fontFamily: 'DM Sans, sans-serif' }, label: { fontSize: 10, color: '#999', fontFamily: 'DM Sans, sans-serif', textAlign: 'center', lineHeight: 1.3 } };
const sh = { text: { margin: 0, padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: '#999', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #F3F2EF' } };
const ir = { row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }, label: { fontSize: 13, color: '#666', fontFamily: 'DM Sans, sans-serif' }, value: { fontSize: 13, fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'right', maxWidth: '60%' } };
const mr = { row: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px' }, icon: { width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, text: { flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }, label: { fontSize: 14, fontWeight: 500, color: '#1A1A1A', fontFamily: 'DM Sans, sans-serif' }, sub: { fontSize: 11, color: '#999', fontFamily: 'DM Sans, sans-serif' } };
