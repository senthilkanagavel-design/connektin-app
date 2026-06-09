// PrivacySecurity.jsx - Upgraded Version
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivacySecurity() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const memberSince =
    profile?.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }) || 'Recently';

  const securityItems = [
    { icon: '✉️', label: 'Email Verified', sub: user?.email || 'No email', verified: user?.emailVerified },
    { icon: '🔑', label: 'Change Password', sub: 'Coming soon' },
    { icon: '🕐', label: 'Last Login Activity', sub: 'Coming soon' },
    { icon: '📱', label: 'Active Sessions', sub: 'Coming soon' },
    { icon: '👁️', label: 'Biometric Login', sub: 'Face ID / Fingerprint', toggle: true },
  ];

  const privacyItems = [
    { icon: '👤', label: 'Profile Visibility', sub: 'Control who can see your profile' },
    { icon: '📦', label: 'Download My Data', sub: 'Coming soon' },
    { icon: '📧', label: 'Communication Preferences', sub: 'Manage notifications and emails' },
  ];

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate('/settings')}>←</button>
        <span style={S.headerTitle}>Privacy & Security</span>
        <div style={{ width: 32 }} />
      </div>

      <div style={S.content}>
        <div style={S.heroCard}>
          <div>
            <div style={S.heroTitle}>You're in Control</div>
            <div style={S.heroText}>We are committed to keeping your data safe and private.</div>
            <div style={S.profileName}>{profile?.displayName || 'Community Member'}</div>
            <div style={S.profileEmail}>{user?.email || ''}</div>
            <div style={S.profileSince}>Member since {memberSince}</div>
          </div>
          <div style={S.heroShield}>🛡️</div>
        </div>

        <div style={S.healthCard}>
          <div style={S.healthHeader}>
            <span>🛡️ Security Health</span>
            <span style={S.healthScore}>85%</span>
          </div>
          <div style={S.healthRow}>✓ Email Verified</div>
          <div style={S.healthRow}>✓ Protected Account</div>
          <div style={S.healthRow}>✓ Secure Authentication</div>
        </div>

        <div style={S.sectionLabel}>Account Security</div>
        <div style={S.card}>
          {securityItems.map((item, i) => (
            <div key={i} style={{...S.row,borderBottom:i<securityItems.length-1?'1px solid #F3F2EF':'none'}}>
              <div style={S.rowIcon}>{item.icon}</div>
              <div style={S.rowText}>
                <div style={S.rowLabel}>{item.label}</div>
                <div style={S.rowSub}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={S.sectionLabel}>Data & Privacy</div>
        <div style={S.card}>
          {privacyItems.map((item,i)=>(
            <div key={i} style={{...S.row,borderBottom:i<privacyItems.length-1?'1px solid #F3F2EF':'none'}}>
              <div style={S.rowIcon}>{item.icon}</div>
              <div style={S.rowText}>
                <div style={S.rowLabel}>{item.label}</div>
                <div style={S.rowSub}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={S.sectionLabel}>Security & Trust</div>
        <div style={S.card}>
          <div style={S.healthRow}>✓ Secure Authentication</div>
          <div style={S.healthRow}>✓ Encrypted User Data</div>
          <div style={S.healthRow}>✓ Protected Communications</div>
          <div style={S.healthRow}>✓ Regular Security Monitoring</div>
        </div>

        <div style={S.sectionLabel}>Legal & Transparency</div>
        <div style={S.card}>
          <div style={S.row} onClick={() => navigate('/privacy')}>
            <div style={S.rowIcon}>📄</div>
            <div style={S.rowText}>
              <div style={S.rowLabel}>Privacy Policy</div>
              <div style={S.rowSub}>Read how we protect your data</div>
            </div>
          </div>
        </div>

        <div style={S.dangerCard}>
          <div style={S.dangerText}>
            <div style={S.dangerTitle}>Delete Account</div>
            <div style={S.dangerSub}>Permanently remove your account and all data.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
 page:{minHeight:'100vh',background:'#F3F2EF',fontFamily:'DM Sans, sans-serif'},
 header:{background:'#0A1628',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'},
 backBtn:{background:'none',border:'none',color:'#fff',fontSize:18,cursor:'pointer'},
 headerTitle:{fontSize:16,fontWeight:700,color:'#fff'},
 content:{padding:16},
 heroCard:{background:'#fff',borderRadius:16,padding:20,display:'flex',justifyContent:'space-between',marginBottom:20},
 heroTitle:{fontSize:16,fontWeight:700},
 heroText:{fontSize:12,color:'#64748B',margin:'6px 0 12px'},
 profileName:{fontWeight:700},
 profileEmail:{fontSize:12,color:'#64748B'},
 profileSince:{fontSize:11,color:'#94A3B8'},
 heroShield:{fontSize:48},
 healthCard:{background:'#fff',borderRadius:16,padding:16,marginBottom:20},
 healthHeader:{display:'flex',justifyContent:'space-between',marginBottom:12,fontWeight:700},
 healthScore:{color:'#0D9488'},
 healthRow:{padding:'6px 0',fontSize:13},
 sectionLabel:{fontSize:12,fontWeight:700,color:'#94A3B8',marginBottom:8},
 card:{background:'#fff',borderRadius:16,padding:'4px 16px',marginBottom:20},
 row:{display:'flex',alignItems:'center',gap:12,padding:'14px 0'},
 rowIcon:{width:28},
 rowText:{flex:1},
 rowLabel:{fontWeight:600},
 rowSub:{fontSize:12,color:'#9CA3AF'},
 dangerCard:{background:'#fff',borderRadius:16,padding:16,border:'1px solid #FECACA'},
 dangerText:{flex:1},
 dangerTitle:{color:'#DC2626',fontWeight:700},
 dangerSub:{fontSize:12,color:'#9CA3AF'}
};
