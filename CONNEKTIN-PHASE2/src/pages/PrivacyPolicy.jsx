// src/pages/PrivacyPolicy.jsx
import { useNavigate } from 'react-router-dom';

const LAST_UPDATED = 'June 1, 2026';

const sections = [
  {
    title: '1. Introduction',
    content: `ConnektIn ("we", "our", or "the platform") is a professional community platform connecting working professionals and students across India. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use ConnektIn at connektin.in or via our mobile application.

By using ConnektIn, you agree to the terms of this Privacy Policy. If you do not agree, please discontinue use of the platform.`,
  },
  {
    title: '2. Information We Collect',
    content: `We collect the following information when you register and use ConnektIn:

• Full name and display name
• Email address
• Profile photo or selected avatar
• Industry and professional role
• Posts, articles, comments, and stories you create
• Job applications and saved jobs
• Device information and usage data (page views, session duration)
• Authentication data via Google Sign-In or email/password

We do not collect sensitive personal data such as Aadhaar, PAN, financial account numbers, or health information.`,
  },
  {
    title: '3. How We Use Your Information',
    content: `We use your information solely to operate and improve ConnektIn:

• To create and manage your account
• To display your profile to other community members
• To deliver industry-relevant articles, jobs, and posts
• To send platform notifications and updates
• To process subscription payments via Qfix
• To enforce our Community Guidelines and Terms of Use
• To improve platform performance and user experience

We do not sell, rent, or trade your personal information to any third party for marketing purposes.`,
  },
  {
    title: '4. Data Storage and Security',
    content: `Your data is stored securely on Google Firebase infrastructure, hosted in the Asia South (Mumbai) region. We implement industry-standard security measures including:

• HTTPS encryption for all data in transit
• Firebase Authentication for secure login
• Firestore security rules restricting unauthorized access
• Regular security reviews of platform infrastructure

While we take every precaution, no internet-based system is 100% secure. We encourage you to use a strong password and report any suspicious activity to us immediately.`,
  },
  {
    title: '5. Data Sharing',
    content: `We share your data only in the following limited circumstances:

• With Firebase (Google) as our infrastructure provider
• With Qfix (Pine Labs) for payment processing — only transaction-relevant data
• With law enforcement or legal authorities when required by applicable Indian law
• In an anonymised, aggregated form for platform analytics

We do not share your personal data with advertisers, data brokers, or third-party marketers under any circumstances.`,
  },
  {
    title: '6. Your Rights',
    content: `As a ConnektIn user, you have the following rights:

• Access: Request a copy of the personal data we hold about you
• Correction: Request correction of inaccurate or incomplete data
• Deletion: Request deletion of your account and associated data
• Portability: Request your data in a portable format
• Objection: Object to processing of your data in certain circumstances

To exercise any of these rights, contact us at privacy@connektin.in. We will respond within 30 days.`,
  },
  {
    title: '7. Cookies and Tracking',
    content: `ConnektIn uses essential cookies and browser storage (IndexedDB, localStorage) to maintain your session and improve performance. We do not use third-party advertising cookies or cross-site tracking technologies.

You may clear your browser storage at any time through your browser settings. This will log you out of the platform.`,
  },
  {
    title: '8. Children\'s Privacy',
    content: `ConnektIn is intended for users aged 16 and above. We do not knowingly collect personal information from children under 16. If you believe a minor has created an account, please contact us at privacy@connektin.in and we will delete the account promptly.`,
  },
  {
    title: '9. Community Guidelines and Legal Action',
    content: `ConnektIn is a professional platform. All users are expected to maintain respectful, lawful, and professional conduct. We strictly prohibit:

• Abusive, offensive, or discriminatory language
• Harassment, threats, or intimidation of any user
• Posting false, defamatory, or misleading content
• Sharing pornographic, violent, or illegal content
• Impersonation or identity fraud

Violations will result in immediate account suspension and permanent removal from the platform. Where the conduct constitutes a criminal offence under the Information Technology Act 2000, Indian Penal Code, or any applicable law, ConnektIn reserves the right to report the matter to the appropriate authorities and initiate legal proceedings against the offending user.

By using ConnektIn, you acknowledge and accept these terms.`,
  },
  {
    title: '10. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. When we do, we will revise the "Last Updated" date at the top of this page and notify users via the platform. Continued use of ConnektIn after changes are posted constitutes acceptance of the revised policy.`,
  },
  {
    title: '11. Contact Us',
    content: `For any questions, concerns, or requests regarding this Privacy Policy, please contact us at:

Email: privacy@connektin.in
Platform: connektin.in
Operated by: ConnektIn Platform, Bengaluru, Karnataka, India`,
  },
];

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>← Back</button>
        <img src="/icon-512.png" alt="ConnektIn" style={s.logo} />
      </div>

      <div style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.heroBadge}>Legal</div>
          <h1 style={s.heroTitle}>Privacy Policy</h1>
          <p style={s.heroSub}>Last updated: {LAST_UPDATED}</p>
          <p style={s.heroDesc}>
            ConnektIn is committed to protecting your privacy. This policy explains clearly and honestly how we handle your data.
          </p>
        </div>
      </div>

      <div style={s.body}>
        {sections.map((sec, i) => (
          <div key={i} style={s.section}>
            <div style={s.secLeft}>
              <div style={s.secNum}>{String(i + 1).padStart(2, '0')}</div>
            </div>
            <div style={s.secRight}>
              <h2 style={s.secTitle}>{sec.title}</h2>
              <p style={s.secContent}>{sec.content}</p>
            </div>
          </div>
        ))}

        <div style={s.footer}>
          <img src="/icon-512.png" alt="ConnektIn" style={s.footerLogo} />
          <p style={s.footerText}>ConnektIn · Your Professional Community · connektin.in</p>
          <p style={s.footerSub}>© {new Date().getFullYear()} ConnektIn. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100dvh',
    background: '#F3F2EF',
    fontFamily: "'DM Sans', sans-serif",
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    background: '#ffffff',
    borderBottom: '1px solid #E4E2DC',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#0D9488',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    padding: 0,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    objectFit: 'cover',
  },
  hero: {
    background: '#0A1628',
    padding: '40px 20px 36px',
  },
  heroInner: {
    maxWidth: 600,
    margin: '0 auto',
  },
  heroBadge: {
    display: 'inline-block',
    background: 'rgba(13,148,136,0.2)',
    color: '#0D9488',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '4px 12px',
    borderRadius: 20,
    marginBottom: 12,
    border: '1px solid rgba(13,148,136,0.3)',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 6px',
    letterSpacing: '-0.3px',
    fontFamily: "'DM Sans', sans-serif",
  },
  heroSub: {
    fontSize: 12,
    color: '#64748B',
    margin: '0 0 14px',
    fontFamily: "'DM Sans', sans-serif",
  },
  heroDesc: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 1.7,
    margin: 0,
    maxWidth: 480,
    fontFamily: "'DM Sans', sans-serif",
  },
  body: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '24px 16px 48px',
  },
  section: {
    display: 'flex',
    gap: 16,
    marginBottom: 28,
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #E4E2DC',
    padding: '18px 16px',
  },
  secLeft: {
    flexShrink: 0,
    paddingTop: 2,
  },
  secNum: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0D9488',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.05em',
    background: '#E6FDF9',
    border: '1px solid #5EEAD4',
    borderRadius: 6,
    padding: '3px 7px',
    minWidth: 32,
    textAlign: 'center',
  },
  secRight: {
    flex: 1,
  },
  secTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0A1628',
    margin: '0 0 8px',
    fontFamily: "'DM Sans', sans-serif",
  },
  secContent: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 1.75,
    margin: 0,
    whiteSpace: 'pre-line',
    fontFamily: "'DM Sans', sans-serif",
  },
  footer: {
    textAlign: 'center',
    padding: '32px 0 16px',
    borderTop: '1px solid #E4E2DC',
    marginTop: 16,
  },
  footerLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    objectFit: 'cover',
    marginBottom: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
    margin: '0 0 4px',
    fontFamily: "'DM Sans', sans-serif",
  },
  footerSub: {
    fontSize: 11,
    color: '#94A3B8',
    margin: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
};
