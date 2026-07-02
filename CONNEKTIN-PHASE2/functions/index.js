/**
 * ConnektIn — HDFC SmartGateway payments backend (v0 scaffold)
 * See: ConnektIn_HDFC_Payments_Bible.md
 *
 * Three entry points:
 *   createPaymentSession  (callable)  - app asks to start a subscription payment
 *   paymentReturn         (https)     - browser is redirected here after paying; verifies + grants
 *   paymentWebhook        (https)     - HDFC server-to-server notification (async safety net)
 *
 * STUB_MODE lets you validate the WHOLE flow on the emulator with NO HDFC creds:
 *   set env HDFC_STUB=true  -> createPaymentSession returns a fake pay URL that
 *   round-trips through paymentReturn as if CHARGED, so you can watch the order
 *   doc + user entitlement update end to end. Flip HDFC_STUB off once creds land.
 */

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
// expresscheckout-nodejs is lazy-required inside makeJuspay() (real path only),
// so STUB_MODE never imports it and can't be crashed by its loader.
const { customAlphabet } = require("nanoid");

admin.initializeApp();
const db = getFirestore();

/* ----------------------------- Secrets ------------------------------ *
 * Set each with:  firebase functions:secrets:set <NAME>
 * Until real creds arrive you can set placeholders ("PENDING") so deploy works;
 * STUB_MODE never reads them.                                          */
const HDFC_MERCHANT_ID    = defineSecret("HDFC_MERCHANT_ID");
const HDFC_KEY_UUID       = defineSecret("HDFC_KEY_UUID");
const HDFC_CLIENT_ID      = defineSecret("HDFC_CLIENT_ID");        // 'hdfcmaster' in sandbox
const HDFC_PRIVATE_KEY    = defineSecret("HDFC_PRIVATE_KEY");      // full PEM string (yours)
const HDFC_BANK_PUBLIC_KEY= defineSecret("HDFC_BANK_PUBLIC_KEY");  // full PEM string (bank's)
const WEBHOOK_USER        = defineSecret("HDFC_WEBHOOK_USER");
const WEBHOOK_PASS        = defineSecret("HDFC_WEBHOOK_PASS");

const PAY_SECRETS = [HDFC_MERCHANT_ID, HDFC_KEY_UUID, HDFC_CLIENT_ID, HDFC_PRIVATE_KEY, HDFC_BANK_PUBLIC_KEY];

/* ----------------------------- Config ------------------------------- */
const SANDBOX_BASE_URL    = "https://smartgateway.hdfcuat.bank.in";
const PRODUCTION_BASE_URL = "https://smartgateway.hdfc.bank.in";
const BASE_URL  = SANDBOX_BASE_URL;                       // flip at go-live
const REGION    = "asia-south1";
const PROJECT   = "connektin-phase2";
const APP_ORIGIN = "https://connektin-staging.web.app";   // swap to https://connektin.in for prod
const RETURN_URL = `https://${REGION}-${PROJECT}.cloudfunctions.net/paymentReturn`;
const STUB_MODE  = process.env.HDFC_STUB === "true";

/* Plan catalog — SERVER-SIDE source of truth for amounts. Never trust the client. */
const PLANS = {
  quarterly: { amount: "117", label: "ConnektIn Pro — Quarterly", days: 90 },
};

/* order_id: < 21 chars, alphanumeric, non-sequential (bible §6) */
const rand16 = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);
const newOrderId = () => `cxn${rand16()}`.slice(0, 20);

function makeJuspay() {
  const { Juspay } = require("expresscheckout-nodejs"); // lazy: real (non-stub) path only
  return new Juspay({
    merchantId: HDFC_MERCHANT_ID.value(),
    baseUrl: BASE_URL,
    jweAuth: {
      keyId: HDFC_KEY_UUID.value(),
      publicKey: HDFC_BANK_PUBLIC_KEY.value(),
      privateKey: HDFC_PRIVATE_KEY.value(),
    },
  });
}

/* Idempotent grant: same order can be hit by BOTH return handler and webhook,
 * possibly more than once. A transaction guarantees we grant exactly once. */
async function grantOrderIfCharged(orderId, verifiedAmount) {
  const ref = db.doc(`orders/${orderId}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error(`order not found: ${orderId}`);
    const order = snap.data();
    if (order.status === "CHARGED") return "already_granted";   // idempotent no-op

    if (String(verifiedAmount) !== String(order.amount)) {       // anti-tamper (bible §7)
      tx.update(ref, { status: "AMOUNT_MISMATCH", seenAmount: String(verifiedAmount),
        updatedAt: FieldValue.serverTimestamp() });
      throw new Error(`amount mismatch on ${orderId}: expected ${order.amount}, saw ${verifiedAmount}`);
    }

    const plan = PLANS[order.plan];
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + plan.days * 86400000);

    tx.update(ref, { status: "CHARGED", updatedAt: now });
    tx.set(db.doc(`users/${order.uid}`), {
      subscription: { status: "active", plan: order.plan, startedAt: now, expiresAt },
    }, { merge: true });
    return "granted";
  });
}

/* ------------------- 1) createPaymentSession (callable) ------------------- */
exports.createPaymentSession = onCall({ secrets: PAY_SECRETS, region: REGION }, async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Please sign in first.");

  const planId = (req.data && req.data.plan) || "quarterly";
  const plan = PLANS[planId];
  if (!plan) throw new HttpsError("invalid-argument", "Unknown plan.");

  const orderId = newOrderId();

  // record the order BEFORE talking to HDFC — this is our source of truth for amount + uid
  await db.doc(`orders/${orderId}`).set({
    uid, plan: planId, amount: plan.amount, currency: "INR",
    status: "NEW", createdAt: FieldValue.serverTimestamp(),
  });

  // STUB: skip HDFC, return a URL that round-trips through paymentReturn as CHARGED
  if (STUB_MODE) {
    logger.info(`[STUB] created order ${orderId} for ${uid} (${plan.amount} INR)`);
    return { orderId, paymentUrl: `${RETURN_URL}?order_id=${orderId}&stub=CHARGED` };
  }

  try {
    const session = await makeJuspay().orderSession.create({
      order_id: orderId,
      amount: plan.amount,
      payment_page_client_id: HDFC_CLIENT_ID.value(),
      customer_id: uid,
      action: "paymentPage",
      return_url: RETURN_URL,
      currency: "INR",
    });
    return { orderId, paymentUrl: session.payment_links.web };
  } catch (e) {
    logger.error("createSession failed", (e && e.message) || e);
    throw new HttpsError("internal", "Could not start payment. Please try again.");
  }
});

/* ------------------- 2) paymentReturn (browser redirect) ------------------- */
exports.paymentReturn = onRequest({ secrets: PAY_SECRETS, region: REGION }, async (req, res) => {
  const orderId = req.query.order_id || (req.body && req.body.order_id);
  if (!orderId) return res.redirect(`${APP_ORIGIN}/payment/status?result=error`);

  try {
    let statusId, statusStr, amount;

    if (STUB_MODE || req.query.stub) {                 // stub path: pretend CHARGED
      const snap = await db.doc(`orders/${orderId}`).get();
      amount = snap.exists ? snap.data().amount : undefined;
      statusId = 21; statusStr = "CHARGED";
    } else {                                           // real path: MANDATORY server-side verify
      const st = await makeJuspay().order.status(orderId);
      statusId = st.status_id; statusStr = st.status; amount = st.amount;
    }

    if (statusId === 21 || statusStr === "CHARGED") {
      await grantOrderIfCharged(orderId, amount);
      return res.redirect(`${APP_ORIGIN}/payment/status?result=success&order_id=${orderId}`);
    }
    const pending = [23, 28].includes(statusId);       // PENDING_VBV / AUTHORIZING (bible §8)
    return res.redirect(`${APP_ORIGIN}/payment/status?result=${pending ? "pending" : "failed"}&order_id=${orderId}`);
  } catch (e) {
    logger.error("paymentReturn error", e);
    return res.redirect(`${APP_ORIGIN}/payment/status?result=error&order_id=${orderId}`);
  }
});

/* ------------------- 3) paymentWebhook (S2S safety net) ------------------- */
exports.paymentWebhook = onRequest({ secrets: [...PAY_SECRETS, WEBHOOK_USER, WEBHOOK_PASS], region: REGION }, async (req, res) => {
  // Basic Auth (bible §9): HDFC sends Authorization: Basic base64(user:pass)
  const got = req.get("authorization") || "";
  const want = "Basic " + Buffer.from(`${WEBHOOK_USER.value()}:${WEBHOOK_PASS.value()}`).toString("base64");
  if (got !== want) { logger.warn("webhook auth mismatch"); return res.status(401).send("unauthorized"); }

  try {
    // TODO(bible §15): confirm exact event payload shape on the
    // "webhook-events-and-sample-payloads" page and map these fields precisely.
    const b = req.body || {};
    const order   = b.content && b.content.order ? b.content.order : b;
    const orderId = order.order_id;
    const statusId= order.status_id;
    const amount  = order.amount;

    if (orderId && statusId === 21) {
      await grantOrderIfCharged(orderId, amount);
    }
    return res.status(200).send("ok");   // ALWAYS 200 on a handled event so HDFC stops retrying
  } catch (e) {
    logger.error("webhook processing error", e);
    return res.status(500).send("retry"); // unexpected error -> let HDFC retry
  }
});
