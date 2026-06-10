import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ChangePassword() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      {/* Header */}

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

        <div style={{ width: 32 }} />
      </div>

      <div style={S.content}>

        {/* Hero */}

        <div style={S.heroCard}>
          <div style={{ flex: 1 }}>
            <div style={S.heroTitle}>
              Keep Your Account Secure
            </div>

            <div style={S.heroText}>
              A strong password helps protect
              your professional profile,
              connections, and activity on
              ConnektIn.
            </div>
          </div>

          <div style={S.heroIcon}>
            🛡️
          </div>
        </div>

        {/* Current Password */}

        <div style={S.label}>
          Current Password
        </div>

        <input
          type="password"
          placeholder="Enter current password"
          value={currentPassword}
          onChange={(e) =>
            setCurrentPassword(e.target.value)
          }
          style={S.input}
        />

        {/* New Password */}

        <div style={S.label}>
          New Password
        </div>

        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) =>
            setNewPassword(e.target.value)
          }
          style={S.input}
        />

        {/* Strength */}

        <div style={S.strengthContainer}>
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
              fontWeight: 600,
              marginTop: 6,
            }}
          >
            {strength.label}
          </div>
        </div>

        {/* Rules */}

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

        {/* Confirm */}

        <div style={S.label}>
          Confirm Password
        </div>

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(e.target.value)
          }
          style={S.input}
        />

        {/* Info */}

        <div style={S.infoCard}>
          🔒 For your security, all other
          active sessions will be signed
          out after your password is
          updated.
        </div>

        {/* Buttons */}

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
    background: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid #E5E7EB',
    position: 'sticky',
    top: 0,
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
    fontSize: 18,
    color: '#062B5B',
  },

  content: {
    padding: 20,
  },

  heroCard: {
    background: '#EAF7F5',
    borderRadius: 24,
    padding: 20,
    display: 'flex',
    alignItems: 'center',
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
    lineHeight: 1.6,
    color: '#475569',
  },

  heroIcon: {
    fontSize: 50,
  },

  label: {
    fontWeight: 600,
    color: '#1A2433',
    marginBottom: 8,
    marginTop: 16,
  },

  input: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    border: '1px solid #DDE5EA',
    fontSize: 14,
    boxSizing: 'border-box',
  },

  strengthContainer: {
    marginTop: 16,
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
  },

  rulesCard: {
    background: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    marginTop: 16,
    marginBottom: 12,
    border: '1px solid #EEF2F7',
  },

  infoCard: {
    background: '#F8FAFB',
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
    color: '#475569',
    lineHeight: 1.6,
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
    background: '#FFFFFF',
    cursor: 'pointer',
  },

  updateBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    border: 'none',
    background: '#14A39A',
    color: '#FFFFFF',
    fontWeight: 600,
    cursor: 'pointer',
  },
};