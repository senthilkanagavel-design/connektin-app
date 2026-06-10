import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ChangePassword() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const checks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };

  const passed = Object.values(checks).filter(Boolean).length;

  const getStrength = () => {
    if (passed <= 2)
      return {
        label: 'Weak',
        width: '35%',
        color: '#EF4444',
      };

    if (passed <= 4)
      return {
        label: 'Medium',
        width: '70%',
        color: '#F59E0B',
      };

    return {
      label: 'Strong',
      width: '100%',
      color: '#14A39A',
    };
  };

  const strength = getStrength();

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button
          style={S.backBtn}
          onClick={() => navigate('/privacy-security')}
        >
          ←
        </button>

        <div style={S.headerTitle}>
          Change Password
        </div>

        <div style={{ width: 30 }} />
      </div>

      <div style={S.content}>
        <div style={S.heroCard}>
          <div style={{ flex: 1 }}>
            <div style={S.heroTitle}>
              Keep Your Account Secure
            </div>

            <div style={S.heroText}>
              A strong password helps protect
              your professional profile,
              connections and activity on
              ConnektIn.
            </div>
          </div>

          <img
            src="/icon-512.png"
            alt="ConnektIn"
            style={S.logo}
          />
        </div>

        <div style={S.label}>
          Current Password
        </div>

        <div style={S.inputWrapper}>
          <input
            type={showCurrent ? 'text' : 'password'}
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) =>
              setCurrentPassword(e.target.value)
            }
            style={S.input}
          />

          <button
            type="button"
            style={S.eyeBtn}
            onClick={() =>
              setShowCurrent(!showCurrent)
            }
          >
            {showCurrent ? '🙈' : '👁'}
          </button>
        </div>

        <div style={S.label}>
          New Password
        </div>

        <div style={S.inputWrapper}>
          <input
            type={showNew ? 'text' : 'password'}
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) =>
              setNewPassword(e.target.value)
            }
            style={S.input}
          />

          <button
            type="button"
            style={S.eyeBtn}
            onClick={() =>
              setShowNew(!showNew)
            }
          >
            {showNew ? '🙈' : '👁'}
          </button>
        </div>

        <div style={S.label}>
          Confirm Password
        </div>

        <div style={S.inputWrapper}>
          <input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            style={S.input}
          />

          <button
            type="button"
            style={S.eyeBtn}
            onClick={() =>
              setShowConfirm(!showConfirm)
            }
          >
            {showConfirm ? '🙈' : '👁'}
          </button>
        </div>

        <div style={S.strengthContainer}>
          <div style={S.strengthHeader}>
            Password Strength
          </div>

          <div style={S.strengthBar}>
            <div
              style={{
                ...S.strengthFill,
                width: strength.width,
                background: strength.color,
              }}
            />
          </div>

          <div
            style={{
              color: strength.color,
              fontWeight: 700,
              marginTop: 8,
            }}
          >
            {strength.label}
          </div>
        </div>

        <div style={S.rulesCard}>
          <Rule
            ok={checks.length}
            text="At least 8 characters"
          />

          <Rule
            ok={checks.upper}
            text="One uppercase letter"
          />

          <Rule
            ok={checks.lower}
            text="One lowercase letter"
          />

          <Rule
            ok={checks.number}
            text="One number"
          />

          <Rule
            ok={checks.special}
            text="One special character"
          />
        </div>

        <div style={S.infoCard}>
          <div style={S.infoTitle}>
            Session Protection
          </div>

          <div>
            After updating your password,
            all other active sessions will
            be signed out automatically.
          </div>
        </div>

        <div style={S.buttonRow}>
          <button
            style={S.cancelBtn}
            onClick={() =>
              navigate('/privacy-security')
            }
          >
            Cancel
          </button>

          <button style={S.updateBtn}>
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}

function Rule({ ok, text }) {
  return (
    <div style={styles.rule}>
      <span
        style={{
          color: ok ? '#14A39A' : '#CBD5E1',
          fontWeight: 700,
        }}
      >
        ✓
      </span>

      <span>{text}</span>
    </div>
  );
}

const styles = {
  rule: {
    display: 'flex',
    gap: 10,
    fontSize: 13,
    marginBottom: 10,
    color: '#475569',
  },
};

const S = {
  page: {
    minHeight: '100vh',
    background: '#FAFCFC',
    fontFamily: 'DM Sans, sans-serif',
  },

  header: {
    background: '#FFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottom: '1px solid #E5E7EB',
  },

  backBtn: {
    border: 'none',
    background: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: '#062B5B',
  },

  headerTitle: {
    fontWeight: 700,
    fontSize: 20,
    color: '#062B5B',
  },

  content: {
    padding: 20,
  },

  heroCard: {
    background:
      'linear-gradient(135deg,#F8FCFB,#EAF7F5)',
    border: '1px solid #DDEEEB',
    borderRadius: 24,
    padding: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  heroTitle: {
    fontWeight: 700,
    fontSize: 18,
    color: '#062B5B',
    marginBottom: 8,
  },

  heroText: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#475569',
  },

  logo: {
    width: 70,
    height: 70,
  },

  label: {
    fontWeight: 600,
    marginBottom: 8,
    marginTop: 18,
    color: '#1A2433',
  },

  inputWrapper: {
    position: 'relative',
  },

  input: {
    width: '100%',
    padding: '16px',
    borderRadius: 16,
    border: '1px solid #DDE5EA',
    boxSizing: 'border-box',
    fontSize: 14,
  },

  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: 18,
  },

  strengthContainer: {
    marginTop: 20,
  },

  strengthHeader: {
    fontWeight: 600,
    marginBottom: 8,
  },

  strengthBar: {
    height: 8,
    background: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },

  strengthFill: {
    height: '100%',
    borderRadius: 999,
    transition: 'all .3s ease',
  },

  rulesCard: {
    background: '#FFF',
    padding: 18,
    borderRadius: 18,
    marginTop: 18,
    border: '1px solid #EEF2F7',
  },

  infoCard: {
    background: '#F8FAFB',
    borderRadius: 18,
    padding: 18,
    marginTop: 20,
    color: '#475569',
    lineHeight: 1.7,
  },

  infoTitle: {
    fontWeight: 700,
    color: '#062B5B',
    marginBottom: 8,
  },

  buttonRow: {
    display: 'flex',
    gap: 12,
    marginTop: 28,
  },

  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    border: '1px solid #D1D5DB',
    background: '#FFF',
    cursor: 'pointer',
  },

  updateBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    border: 'none',
    background:
      'linear-gradient(135deg,#14A39A,#0F8D85)',
    color: '#FFF',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
