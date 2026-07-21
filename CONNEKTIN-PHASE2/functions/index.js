/**
 * ConnektIn — Cloud Functions (payments)
 *
 * createPaymentSession  (callable)
 *   Creates an HDFC SmartGateway (Juspay) hosted-checkout order for the
 *   signed-in user and returns the payment URL to redirect the browser to.
 *   Tier + price are resolved SERVER-SIDE (see below) — the client only picks
 *   the interval, so a Regular user can never request Thermite pricing.
 *
 * paymentReturn  (HTTPS, browser redirect target)
 *   Where HDFC sends the browser back after payment. Does NOT trust the query
 *   params — it re-verifies order.status server-to-server, checks the amount,
 *   grants the subscription (idempotently), then redirects to /payment/status.
 *
 * paymentWebhook  (HTTPS, server-to-server safety net)
 *   Basic-Auth validated. Re-verifies via order.status (does not trust the
 *   webhook body's status either), grants idempotently, always returns 200.
 *
 * SECURITY SPINE
 *   - billingTier is read from users/{uid}.billingTier, never from the client
 *   - the amount comes from the plans/{tier}_{interval} master doc
 *   - the charged amount is verified against the recorded order amount
 *   - grants run in a transaction keyed on entitlementGranted → no double-grant
 *
 * Deploy (staging):
 *   firebase deploy --only functions --project connektin-staging
 *
 * Emulator (stub mode — no HDFC creds, treats orders as CHARGED):
 *   $env:HDFC_STUB="true"
 *   firebase emulators:start --only functions,firestore
 */

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { customAlphabet } = require("nanoid");

initializeApp();
const db = getFirestore();

// ── Config (env-driven so staging and prod each point at their own domain) ──
const STUB_MODE = process.env.HDFC_STUB === "true";

// Where HDFC redirects the browser back to after payment. NOT hardcoded to
// connektin.in — set PAYMENT_RETURN_URL per environment.
const RETURN_URL =
  process.env.PAYMENT_RETURN_URL ||
  "https://connektin-staging.web.app/payment/return";

// The SPA status page the user ends up on (derived from RETURN_URL's origin).
const STATUS_BASE = RETURN_URL.replace(/\/payment\/return\/?$/, "");

// Sandbox uses 'hdfcmaster'; production uses the real merchant client id.
const PAYMENT_PAGE_CLIENT_ID = process.env.HDFC_CLIENT_ID || "hdfcmaster";

// Sandbox (UAT) by default; prod = https://smartgateway.hdfc.bank.in
const HDFC_BASE_URL =
  process.env.HDFC_BASE_URL || "https://smartgateway.hdfcuat.bank.in";

// Secrets — only read on the real (non-stub) paths.
const HDFC_MERCHANT_ID = defineSecret("HDFC_MERCHANT_ID");
const HDFC_KEY_UUID = defineSecret("HDFC_KEY_UUID");
const HDFC_PRIVATE_KEY = defineSecret("HDFC_PRIVATE_KEY");
const HDFC_BANK_PUBLIC_KEY = defineSecret("HDFC_BANK_PUBLIC_KEY");
const HDFC_WEBHOOK_USER = defineSecret("HDFC_WEBHOOK_USER");
const HDFC_WEBHOOK_PASS = defineSecret("HDFC_WEBHOOK_PASS");

const HDFC_SECRETS = [
  HDFC_MERCHANT_ID,
  HDFC_KEY_UUID,
  HDFC_PRIVATE_KEY,
  HDFC_BANK_PUBLIC_KEY,
];

const VALID_INTERVALS = ["monthly", "quarterly", "annual"];
const DAY_MS = 24 * 60 * 60 * 1000;

// order_id rules (HDFC): alphanumeric only, no special chars, < 21 chars,
// non-sequential. 16-char random over [A-Za-z0-9] satisfies all four.
const makeOrderId = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  16
);

// ── Shared helpers ─────────────────────────────────────────────────

function loadJuspay() {
  const { Juspay } = require("expresscheckout-nodejs");
  return new Juspay({
    merchantId: HDFC_MERCHANT_ID.value(),
    baseUrl: HDFC_BASE_URL,
    jweAuth: {
      keyId: HDFC_KEY_UUID.value(),
      publicKey: HDFC_BANK_PUBLIC_KEY.value(),
      privateKey: HDFC_PRIVATE_KEY.value(),
    },
  });
}

/**
 * Idempotently grant the subscription for a CHARGED order.
 * Keyed on orders/{id}.entitlementGranted inside a transaction, so the return
 * handler and the webhook can both call it and only one grant ever happens.
 * Renewal: if the user is still active, extend from their current expiry;
 * otherwise start from now.
 */
async function grantOrderIfCharged(orderId, txnId) {
  const orderRef = db.doc(`orders/${orderId}`);
  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) return false;
    const order = orderSnap.data();
    if (order.entitlementGranted === true) return false; // already granted

    const userRef = db.doc(`users/${order.uid}`);
    const userSnap = await tx.get(userRef);

    const now = Date.now();
    const days = Number(order.intervalDays) || 30;
    let base = now;
    const sub = userSnap.exists ? userSnap.get("subscription") : null;
    if (sub && sub.expiresAt && typeof sub.expiresAt.toMillis === "function") {
      const current = sub.expiresAt.toMillis();
      if (current > now) base = current; // renewal → extend from current expiry
    }
    const expiresAt = new Date(base + days * DAY_MS);

    tx.set(
      userRef,
      {
        subscription: {
          status: "active",
          plan: order.planId,
          tier: order.billingTier,
          interval: order.interval,
          startedAt: FieldValue.serverTimestamp(),
          expiresAt,
        },
      },
      { merge: true }
    );

    tx.set(
      orderRef,
      {
        status: "CHARGED",
        entitlementGranted: true,
        txnId: txnId || order.txnId || null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return true;
  });
}

/**
 * Re-verify an order server-side and grant if genuinely CHARGED.
 * Never trusts a redirect query param or a webhook body — always asks HDFC
 * (order.status) for the truth, then checks the amount matches what we recorded.
 * Returns { granted, status }.
 */
async function verifyAndGrant(orderId) {
  const orderRef = db.doc(`orders/${orderId}`);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) return { granted: false, status: "NOT_FOUND" };
  const order = orderSnap.data();

  let status = "PENDING";
  let txnId = null;

  if (STUB_MODE) {
    status = "CHARGED"; // emulator: treat every order as paid
  } else {
    const juspay = loadJuspay();
    const resp = await juspay.order.status(orderId);
    status = resp.status;
    txnId = resp.txn_id || resp.txn_uuid || null;

    if (status === "CHARGED" && String(resp.amount) !== String(order.amount)) {
      // Charged amount doesn't match what we intended → never grant.
      await orderRef.set(
        { status: "AMOUNT_MISMATCH", updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      logger.error("Amount mismatch on order", {
        orderId,
        expected: order.amount,
        got: resp.amount,
      });
      return { granted: false, status: "AMOUNT_MISMATCH" };
    }
  }

  if (status !== "CHARGED") {
    await orderRef.set(
      { status, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return { granted: false, status };
  }

  const granted = await grantOrderIfCharged(orderId, txnId);
  return { granted, status: "CHARGED" };
}

// ── createPaymentSession ───────────────────────────────────────────
exports.createPaymentSession = onCall(
  { secrets: HDFC_SECRETS },
  async (request) => {
    const uid = request.auth && request.auth.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in to subscribe.");

    const clientInterval = String((request.data && request.data.interval) || "").toLowerCase();

    // Tier resolved SERVER-SIDE. Missing / anything but "thermite"/"student" = Regular.
    const LOCKED_TIERS = ["thermite", "student"];
    const userSnap = await db.doc(`users/${uid}`).get();
    const storedTier = userSnap.exists ? userSnap.get("billingTier") : null;
    const billingTier = LOCKED_TIERS.includes(storedTier) ? storedTier : "regular";

    // Interval resolution:
    //  - Thermite/Student → ALWAYS-LOCK: force the interval from
    //    users.billingInterval and IGNORE whatever the client sent, so a
    //    locked user can't buy a different interval by crafting the request.
    //    Reject if the lock is missing/invalid (e.g. a legacy code that never
    //    set billingInterval).
    //  - Regular → the client picks freely, but validate it's a real interval.
    let interval;
    if (LOCKED_TIERS.includes(billingTier)) {
      interval = String(userSnap.get("billingInterval") || "").toLowerCase();
      if (!VALID_INTERVALS.includes(interval)) {
        throw new HttpsError(
          "failed-precondition",
          "Your referral code isn't set up correctly. Please re-enter it or ask for a new one."
        );
      }
    } else {
      interval = clientInterval;
      if (!VALID_INTERVALS.includes(interval)) {
        throw new HttpsError("invalid-argument", "Invalid billing interval.");
      }
    }

    // Authoritative amount from the plans master.
    const planId = `${billingTier}_${interval}`;
    const planSnap = await db.doc(`plans/${planId}`).get();
    if (!planSnap.exists || planSnap.get("active") !== true) {
      throw new HttpsError("failed-precondition", "Selected plan is unavailable.");
    }
    const plan = planSnap.data();
    const amount = String(plan.amount);
    const currency = plan.currency || "INR";
    const intervalDays = Number(plan.intervalDays);

    // Record the order BEFORE payment so return/webhook can verify the amount.
    const orderId = makeOrderId();
    await db.doc(`orders/${orderId}`).set({
      uid,
      billingTier,
      interval,
      planId,
      amount,
      currency,
      intervalDays,
      status: "NEW",
      entitlementGranted: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Stub path — no HDFC call. Returns the status-page URL so the emulator
    // flow can be exercised end-to-end (pair with a paymentReturn stub call).
    if (STUB_MODE) {
      return { orderId, paymentUrl: `${STATUS_BASE}/payment/status?order=${orderId}` };
    }

    // Real path — create the HDFC hosted-checkout session.
    const juspay = loadJuspay();
    try {
      const session = await juspay.orderSession.create({
        order_id: orderId,
        amount,
        payment_page_client_id: PAYMENT_PAGE_CLIENT_ID,
        customer_id: uid,
        action: "paymentPage",
        return_url: RETURN_URL,
        currency,
      });
      return { orderId, paymentUrl: session.payment_links.web };
    } catch (err) {
      await db.doc(`orders/${orderId}`).set(
        { status: "SESSION_FAILED", updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      logger.error("orderSession.create failed", { orderId, err: String(err) });
      throw new HttpsError("internal", "Could not start payment. Please try again.");
    }
  }
);

// ── paymentReturn (browser redirect target) ────────────────────────
exports.paymentReturn = onRequest({ secrets: HDFC_SECRETS }, async (req, res) => {
  const orderId = String(
    (req.query && req.query.order_id) || (req.body && req.body.order_id) || ""
  );

  if (!orderId) {
    res.redirect(302, `${STATUS_BASE}/payment/status`);
    return;
  }

  try {
    await verifyAndGrant(orderId); // never trusts the redirect params
  } catch (err) {
    logger.error("paymentReturn verify failed", { orderId, err: String(err) });
  }

  // The SPA status page reads orders/{id} live and shows success/pending/failed.
  res.redirect(302, `${STATUS_BASE}/payment/status?order=${orderId}`);
});

// ── paymentWebhook (async safety net, server-to-server) ────────────
exports.paymentWebhook = onRequest(
  { secrets: [...HDFC_SECRETS, HDFC_WEBHOOK_USER, HDFC_WEBHOOK_PASS] },
  async (req, res) => {
    // Basic-Auth: HDFC sends base64(username:password). Reject a mismatch.
    if (!STUB_MODE) {
      const got = req.get("authorization") || "";
      const expected =
        "Basic " +
        Buffer.from(
          `${HDFC_WEBHOOK_USER.value()}:${HDFC_WEBHOOK_PASS.value()}`
        ).toString("base64");
      if (got !== expected) {
        res.status(401).send("unauthorized");
        return;
      }
    }

    // Extract order_id defensively — exact payload shape is TBD (Bible §15),
    // so check the common locations.
    const b = req.body || {};
    const orderId = String(
      b.order_id ||
        (b.content && b.content.order && b.content.order.order_id) ||
        (b.data && b.data.order_id) ||
        ""
    );

    if (orderId) {
      try {
        await verifyAndGrant(orderId); // re-verify via order.status, then grant
      } catch (err) {
        logger.error("webhook grant failed", { orderId, err: String(err) });
      }
    }

    // ALWAYS 200 so HDFC stops re-sending.
    res.status(200).send("ok");
  }
);

// ── onUserCollegeRoleChange (college student/lecturer rollup counters) ──
// Keeps colleges/{collegeId}.studentCount / .lecturerCount in sync with the
// users collection. Must be onDocumentWritten (not onCreate): Principal/
// Lecturer get collegeId/collegeRole at doc-creation time (InvitePage's
// setDoc), but students get it via updateDoc on an already-existing doc
// (PlanSelect's college-code redemption) — a create-only trigger would miss
// students. firestore.rules only allows non-admin writes to these two count
// fields via this Admin-SDK trigger, so there is no client path that could
// race or double-count it.
exports.onUserCollegeRoleChange = onDocumentWritten("users/{uid}", async (event) => {
  const before = event.data.before.exists ? event.data.before.data() : null;
  const after = event.data.after.exists ? event.data.after.data() : null;

  const key = (d) =>
    d && d.collegeId && (d.collegeRole === "student" || d.collegeRole === "lecturer")
      ? `${d.collegeId}|${d.collegeRole}`
      : null;

  const beforeKey = key(before);
  const afterKey = key(after);
  if (beforeKey === afterKey) return; // no relevant change — avoid re-counting

  if (beforeKey) {
    const [collegeId, role] = beforeKey.split("|");
    await db
      .doc(`colleges/${collegeId}`)
      .update({ [`${role}Count`]: FieldValue.increment(-1) })
      .catch((e) => logger.error("rollup decrement failed", { collegeId, role, err: String(e) }));
  }
  if (afterKey) {
    const [collegeId, role] = afterKey.split("|");
    await db
      .doc(`colleges/${collegeId}`)
      .update({ [`${role}Count`]: FieldValue.increment(1) })
      .catch((e) => logger.error("rollup increment failed", { collegeId, role, err: String(e) }));
  }
});
