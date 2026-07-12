import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// ============================================================
//  CONFIG
// ============================================================
// 1) `db` is imported from ../firebase/config (the app's
//    initialised Firestore export).
// 2) Routes these buttons navigate to (all confirmed in App.jsx):
const HOME_ROUTE = '/dashboard';
const SUBSCRIBE_ROUTE = '/subscribe';       // renders PlanSelect (plans master)
const SUBSCRIPTION_ROUTE = '/dashboard';    // was '/me' (no such route → landed on Splash)
// 3) Order status buckets — the exact strings Cloud Functions
//    write to orders/{id}.status. Anything unlisted = "pending".
const SUCCESS_STATUSES = ['CHARGED'];
const FAILED_STATUSES = [
  'AUTHENTICATION_FAILED',
  'AUTHORIZATION_FAILED',
  'FAILED',
  'DECLINED',
  'VOIDED',
  'AUTO_REFUNDED',
];
// 4) Order-id query param — reads ?order=, ?orderId=, or ?order_id=
//    so it matches whatever paymentReturn appends on redirect.
// ============================================================

const TEAL = '#0D9488';
// Order docs store `interval` (monthly | quarterly | annual) and
// `billingTier` (regular | thermite). The receipt Plan row is built
// from those two — there is no `plan` field on the order.
const PLAN_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual' };
const TIER_LABELS = { regular: 'Regular', thermite: 'Thermite' };

const VARIANTS = {
  success: { icon: '✓', color: '#16A34A', bg: '#DCFCE7', title: 'Payment successful', badge: 'Active' },
  pending: { icon: '…', color: '#B45309', bg: '#FEF3C7', title: 'Payment processing', badge: 'Processing' },
  failed:  { icon: '✕', color: '#DC2626', bg: '#FEE2E2', title: 'Payment failed', badge: 'Failed' },
};

function bucketFor(status) {
  if (!status) return 'pending';
  const s = String(status).toUpperCase();
  if (SUCCESS_STATUSES.includes(s)) return 'success';
  if (FAILED_STATUSES.includes(s)) return 'failed';
  return 'pending';
}

function shortId(id) {
  if (!id) return '—';
  return id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-3)}` : id;
}

export default function PaymentStatus() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get('order') || params.get('orderId') || params.get('order_id');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'orders', orderId),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
        } else {
          setOrder({ id: snap.id, ...snap.data() });
          setNotFound(false);
        }
        setLoading(false);
      },
      () => {
        // permission or network error — treat as not found so the
        // user gets a clear message instead of a spinner forever
        setNotFound(true);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [orderId]);

  const bucket = order ? bucketFor(order.status) : 'pending';
  const v = VARIANTS[bucket];
  const tierLabel = order ? (TIER_LABELS[order.billingTier] || order.billingTier || '') : '';
  const intervalLabel = order ? (PLAN_LABELS[order.interval] || order.interval || '') : '';
  const planLabel = [tierLabel, intervalLabel].filter(Boolean).join(' · ') || '—';
  const amountLabel = order && order.amount != null ? `₹${order.amount}` : '—';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {loading ? (
          <div style={styles.centerBlock}>
            <div style={styles.spinner} />
            <p style={styles.subtle}>Confirming your payment…</p>
          </div>
        ) : notFound ? (
          <div style={styles.centerBlock}>
            <div style={{ ...styles.iconCircle, background: '#F3F4F6', color: '#6B7280' }}>?</div>
            <p style={styles.title}>Order not found</p>
            <p style={styles.subtle}>We couldn’t find this payment. If you were charged, it will still be applied — check your subscription.</p>
            <button style={styles.primaryBtn} onClick={() => navigate(HOME_ROUTE)}>Go to ConnektIn</button>
          </div>
        ) : (
          <>
            <div style={styles.centerBlock}>
              <div style={{ ...styles.iconCircle, background: v.bg, color: v.color }}>{v.icon}</div>
              <p style={styles.title}>{v.title}</p>
              {bucket === 'pending' && (
                <p style={styles.subtle}>We’ll activate your subscription automatically once the payment is confirmed. This can take a minute.</p>
              )}
              {bucket === 'failed' && (
                <p style={styles.subtle}>Your payment didn’t go through and you were not charged.</p>
              )}
            </div>

            <div style={styles.receipt}>
              <Row label="Plan" value={planLabel} />
              <Row label="Amount" value={amountLabel} />
              <Row label="Order ID" value={shortId(order.id)} mono />
              <div style={{ ...styles.row, borderBottom: 'none' }}>
                <span style={styles.rowLabel}>Status</span>
                <span style={{ ...styles.badge, background: v.bg, color: v.color }}>{v.badge}</span>
              </div>
            </div>

            {bucket === 'success' && (
              <>
                <button style={styles.primaryBtn} onClick={() => navigate(HOME_ROUTE)}>Go to ConnektIn</button>
                <button style={styles.secondaryBtn} onClick={() => navigate(SUBSCRIPTION_ROUTE)}>View subscription</button>
              </>
            )}
            {bucket === 'pending' && (
              <button style={styles.primaryBtn} onClick={() => navigate(HOME_ROUTE)}>Continue to ConnektIn</button>
            )}
            {bucket === 'failed' && (
              <>
                <button style={styles.primaryBtn} onClick={() => navigate(SUBSCRIBE_ROUTE)}>Try again</button>
                <button style={styles.secondaryBtn} onClick={() => navigate(HOME_ROUTE)}>Back to ConnektIn</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={{ ...styles.rowValue, ...(mono ? { fontFamily: 'monospace', fontSize: 13 } : {}) }}>{value}</span>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#F3F2EF', boxSizing: 'border-box' },
  card: { width: '100%', maxWidth: 380, background: '#fff', border: '0.5px solid #E4E2DC', borderRadius: 20, padding: '28px 22px', display: 'flex', flexDirection: 'column' },
  centerBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  iconCircle: { width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 600, lineHeight: 1 },
  title: { fontSize: 19, fontWeight: 600, color: '#1A1A1A', margin: '14px 0 0' },
  subtle: { fontSize: 14, color: '#6B7280', margin: '8px 0 0', lineHeight: 1.6 },
  receipt: { margin: '22px 0', border: '0.5px solid #E4E2DC', borderRadius: 12, padding: '2px 14px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '0.5px solid #F3F2EF', fontSize: 14 },
  rowLabel: { color: '#6B7280' },
  rowValue: { color: '#1A1A1A' },
  badge: { padding: '2px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  primaryBtn: { width: '100%', height: 46, background: TEAL, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { width: '100%', height: 42, marginTop: 8, background: 'transparent', color: '#6B7280', border: '0.5px solid #D1D5DB', borderRadius: 10, fontSize: 14, cursor: 'pointer' },
  spinner: { width: 34, height: 34, border: `3px solid #E4E2DC`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
};
