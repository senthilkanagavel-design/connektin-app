// src/components/CommunityGuidelinesBar.jsx
// Usage: Add <CommunityGuidelinesBar /> at the bottom of CreatePost, WriteArticle, PostJob, CreateStory pages

import { useState } from 'react';

export default function CommunityGuidelinesBar({ compact = false }) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <div style={s.compact}>
        <span style={s.compactIcon}>⚖️</span>
        <span style={s.compactText}>
          By posting, you agree to our{' '}
          <span style={s.compactLink} onClick={() => setExpanded(true)}>Community Guidelines</span>.
          Abuse or illegal content will result in immediate removal and legal action.
        </span>
        {expanded && <GuidelinesModal onClose={() => setExpanded(false)} />}
      </div>
    );
  }

  return (
    <div style={s.bar}>
      <div style={s.barTop}>
        <div style={s.barLeft}>
          <span style={s.barIcon}>⚖️</span>
          <div>
            <div style={s.barTitle}>Community Guidelines</div>
            <div style={s.barSub}>ConnektIn is a professional platform. Keep it respectful.</div>
          </div>
        </div>
        <button style={s.barBtn} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide' : 'View'} →
        </button>
      </div>

      {expanded && (
        <div style={s.barBody}>
          <GuidelinesContent />
        </div>
      )}

      {!expanded && (
        <div style={s.barFooter}>
          By submitting, you confirm this content complies with our guidelines. Violations result in
          immediate account suspension and may be reported to law enforcement under the
          Information Technology Act, 2000.
        </div>
      )}
    </div>
  );
}

function GuidelinesContent() {
  const rules = [
    { icon: '✅', title: 'Be professional and respectful', desc: 'Treat all members with dignity. Disagreements are fine — personal attacks are not.' },
    { icon: '🚫', title: 'No abuse or harassment', desc: 'Abusive language, threats, or intimidation of any kind will result in immediate removal.' },
    { icon: '🚫', title: 'No discriminatory content', desc: 'Content targeting race, religion, gender, caste, nationality, or disability is strictly prohibited.' },
    { icon: '🚫', title: 'No misinformation', desc: 'Do not post false, misleading, or unverified claims that could harm individuals or communities.' },
    { icon: '🚫', title: 'No illegal content', desc: 'Pornographic, violent, fraudulent, or any otherwise illegal content is strictly forbidden.' },
    { icon: '⚖️', title: 'Legal consequences', desc: 'Violations may be reported to authorities under the IT Act 2000, IPC, and other applicable Indian laws. ConnektIn will cooperate fully with law enforcement.' },
  ];

  return (
    <div style={s.guideWrap}>
      {rules.map((r, i) => (
        <div key={i} style={s.ruleRow}>
          <span style={s.ruleIcon}>{r.icon}</span>
          <div style={s.ruleInfo}>
            <div style={s.ruleTitle}>{r.title}</div>
            <div style={s.ruleDesc}>{r.desc}</div>
          </div>
        </div>
      ))}
      <div style={s.legalNote}>
        ConnektIn reserves the right to remove any content, suspend any account, and pursue legal
        action against users who violate these guidelines. By using ConnektIn, you agree to be
        bound by these terms and all applicable laws of India.
      </div>
    </div>
  );
}

function GuidelinesModal({ onClose }) {
  return (
    <>
      <div style={s.overlay} onClick={onClose} />
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <span style={s.modalTitle}>Community Guidelines</span>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>
        <div style={s.modalBody}>
          <GuidelinesContent />
        </div>
      </div>
    </>
  );
}

const s = {
  bar: {
    margin: '12px 0 0',
    background: '#FAFAFA',
    border: '1px solid #E4E2DC',
    borderLeft: '3px solid #0D9488',
    borderRadius: '0 8px 8px 0',
    overflow: 'hidden',
    fontFamily: "'DM Sans', sans-serif",
  },
  barTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
  },
  barLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  barIcon: {
    fontSize: 18,
    flexShrink: 0,
  },
  barTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0A1628',
    fontFamily: "'DM Sans', sans-serif",
  },
  barSub: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: "'DM Sans', sans-serif",
    marginTop: 1,
  },
  barBtn: {
    background: 'none',
    border: '1px solid #E4E2DC',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 11,
    fontWeight: 600,
    color: '#0D9488',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    flexShrink: 0,
  },
  barBody: {
    borderTop: '1px solid #E4E2DC',
    padding: '0 12px 12px',
  },
  barFooter: {
    padding: '0 12px 10px',
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 1.6,
    fontFamily: "'DM Sans', sans-serif",
  },

  guideWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingTop: 12,
  },
  ruleRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  ruleIcon: {
    fontSize: 14,
    flexShrink: 0,
    marginTop: 1,
    width: 20,
    textAlign: 'center',
  },
  ruleInfo: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0A1628',
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: 1,
  },
  ruleDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 1.5,
    fontFamily: "'DM Sans', sans-serif",
  },
  legalNote: {
    marginTop: 8,
    padding: '10px 12px',
    background: '#FFF8EE',
    border: '1px solid #FDE68A',
    borderRadius: 8,
    fontSize: 11,
    color: '#B45309',
    lineHeight: 1.6,
    fontFamily: "'DM Sans', sans-serif",
  },

  compact: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    padding: '8px 12px',
    background: '#F8FAFC',
    border: '1px solid #E4E2DC',
    borderRadius: 8,
    margin: '8px 0',
    fontFamily: "'DM Sans', sans-serif",
  },
  compactIcon: {
    fontSize: 13,
    flexShrink: 0,
    marginTop: 1,
  },
  compactText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 1.5,
    fontFamily: "'DM Sans', sans-serif",
  },
  compactLink: {
    color: '#0D9488',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
  },

  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  modal: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    borderRadius: '16px 16px 0 0',
    zIndex: 101,
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'DM Sans', sans-serif",
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #E4E2DC',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0A1628',
    fontFamily: "'DM Sans', sans-serif",
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    color: '#94A3B8',
    cursor: 'pointer',
  },
  modalBody: {
    padding: '0 16px 32px',
    overflowY: 'auto',
  },
};
