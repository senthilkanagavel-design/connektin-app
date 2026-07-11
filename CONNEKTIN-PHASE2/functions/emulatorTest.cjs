// emulatorTest.cjs — always-lock validation harness (runs against the LOCAL emulator only).
//
// Prerequisite: emulator running in stub mode WITH auth, e.g.:
//   $env:HDFC_STUB="true"
//   firebase emulators:start --only functions,firestore,auth --project connektin-staging
//
// Run from INSIDE functions/ so firebase-admin resolves:
//   node emulatorTest.cjs
//
// It calls the REAL createPaymentSession / paymentReturn in the emulator with a
// genuine emulator ID token, then inspects Firestore to prove behaviour.
// No service-account key and no real project are touched — everything is local.

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";

const admin = require("firebase-admin");
admin.initializeApp({ projectId: "connektin-staging" });
const db = admin.firestore();
const auth = admin.auth();

const PROJECT = "connektin-staging";
const REGION = "us-central1";
const FN_BASE = `http://127.0.0.1:5001/${PROJECT}/${REGION}`;
const AUTH_BASE = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1`;

// Same 6 plan-master docs, pricing locked 8 Jul 2026.
const PLANS = {
  regular_monthly:    { tier: "regular",  interval: "monthly",   label: "Regular",  amount: "129",  currency: "INR", intervalDays: 30,  active: true, sortOrder: 1, perMonth: "129", badge: "" },
  regular_quarterly:  { tier: "regular",  interval: "quarterly", label: "Regular",  amount: "348",  currency: "INR", intervalDays: 90,  active: true, sortOrder: 2, perMonth: "116", badge: "Save 10%" },
  regular_annual:     { tier: "regular",  interval: "annual",    label: "Regular",  amount: "1238", currency: "INR", intervalDays: 365, active: true, sortOrder: 3, perMonth: "103", badge: "Save 20%" },
  thermite_monthly:   { tier: "thermite", interval: "monthly",   label: "Thermite", amount: "49",   currency: "INR", intervalDays: 30,  active: true, sortOrder: 4, perMonth: "49",  badge: "" },
  thermite_quarterly: { tier: "thermite", interval: "quarterly", label: "Thermite", amount: "132",  currency: "INR", intervalDays: 90,  active: true, sortOrder: 5, perMonth: "44",  badge: "Save 10%" },
  thermite_annual:    { tier: "thermite", interval: "annual",    label: "Thermite", amount: "488",  currency: "INR", intervalDays: 365, active: true, sortOrder: 6, perMonth: "41",  badge: "Save 17%" },
};

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  \u2705 PASS  ${name}`); pass++; }
  else { console.log(`  \u274C FAIL  ${name}  \u2014 ${detail}`); fail++; }
}

async function seed() {
  const batch = db.batch();
  for (const [id, data] of Object.entries(PLANS)) batch.set(db.doc(`plans/${id}`), data);
  await batch.commit();
  // .set() with no merge => replaces the doc each run, so subscription state is clean.
  await db.doc("users/thermiteLocked").set({ billingTier: "thermite", billingInterval: "quarterly", role: "member" });
  await db.doc("users/thermiteBadlock").set({ billingTier: "thermite", role: "member" }); // deliberately no billingInterval
  await db.doc("users/regularUser").set({ role: "member" });                              // no billingTier => resolves to regular
}

async function idTokenFor(uid) {
  await auth.createUser({ uid }).catch((e) => { if (e.code !== "auth/uid-already-exists") throw e; });
  const customToken = await auth.createCustomToken(uid);
  const res = await fetch(`${AUTH_BASE}/accounts:signInWithCustomToken?key=fake-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const j = await res.json();
  if (!j.idToken) throw new Error("Could not mint emulator idToken: " + JSON.stringify(j));
  return j.idToken;
}

async function createSession(uid, interval) {
  const idToken = await idTokenFor(uid);
  const res = await fetch(`${FN_BASE}/createPaymentSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data: { interval } }),
  });
  const body = await res.json().catch(() => ({}));
  return { httpStatus: res.status, body };
}

async function hitReturn(orderId) {
  // Grant happens synchronously inside paymentReturn before it redirects.
  await fetch(`${FN_BASE}/paymentReturn?order_id=${orderId}`, { redirect: "manual" }).catch(() => {});
}

async function order(id) { return (await db.doc(`orders/${id}`).get()).data(); }
async function user(id)  { return (await db.doc(`users/${id}`).get()).data(); }

async function main() {
  console.log("\n=== Always-Lock Emulator Validation ===\n");
  await seed();
  console.log("Seeded 6 plans + 3 test users.\n");

  // ── Test A: always-lock ──────────────────────────────────────────
  console.log("Test A \u2014 Always-lock forces thermite interval (client LIES 'annual'):");
  const a = await createSession("thermiteLocked", "annual");
  const aId = a.body?.result?.orderId;
  check("callable returned an order", !!aId, JSON.stringify(a));
  const ao = aId ? await order(aId) : null;
  check("planId locked to thermite_quarterly", ao?.planId === "thermite_quarterly", `got ${ao?.planId}`);
  check("interval forced to quarterly (client 'annual' ignored)", ao?.interval === "quarterly", `got ${ao?.interval}`);
  check("amount is 132 from plan master", ao?.amount === "132", `got ${ao?.amount}`);
  check("amount stored as string", typeof ao?.amount === "string", `got ${typeof ao?.amount}`);

  // ── Test B: regular user free choice honored ─────────────────────
  console.log("\nTest B \u2014 Regular user's interval choice is honored ('annual'):");
  const b = await createSession("regularUser", "annual");
  const bId = b.body?.result?.orderId;
  const bo = bId ? await order(bId) : null;
  check("planId is regular_annual", bo?.planId === "regular_annual", `got ${bo?.planId}`);
  check("amount is 1238", bo?.amount === "1238", `got ${bo?.amount}`);

  // ── Test C: broken lock is rejected, not silently defaulted ──────
  console.log("\nTest C \u2014 Thermite user with no billingInterval is REJECTED:");
  const c = await createSession("thermiteBadlock", "monthly");
  check("call rejected (no order issued)", c.httpStatus >= 400 && !c.body?.result, `httpStatus ${c.httpStatus}, body ${JSON.stringify(c.body)}`);
  check("rejected with failed-precondition", c.body?.error?.status === "FAILED_PRECONDITION", `got ${JSON.stringify(c.body?.error)}`);

  // ── Test D: grant on CHARGED + idempotency ───────────────────────
  console.log("\nTest D \u2014 Grant on CHARGED, then no double-grant on repeat:");
  if (!aId) {
    check("prerequisite order from Test A exists", false, "no order to grant");
  } else {
    await hitReturn(aId);
    const o1 = await order(aId);
    const u1 = await user("thermiteLocked");
    check("order status CHARGED after return", o1?.status === "CHARGED", `got ${o1?.status}`);
    check("entitlementGranted = true", o1?.entitlementGranted === true, `got ${o1?.entitlementGranted}`);
    check("user subscription active", u1?.subscription?.status === "active", `got ${u1?.subscription?.status}`);
    check("subscription interval = quarterly", u1?.subscription?.interval === "quarterly", `got ${u1?.subscription?.interval}`);
    check("subscription plan = thermite_quarterly", u1?.subscription?.plan === "thermite_quarterly", `got ${u1?.subscription?.plan}`);
    const exp1 = u1?.subscription?.expiresAt?.toMillis?.();

    await hitReturn(aId); // second time — must be a no-op
    const u2 = await user("thermiteLocked");
    const exp2 = u2?.subscription?.expiresAt?.toMillis?.();
    check("repeat return did NOT extend expiry (idempotent)", !!exp1 && exp1 === exp2, `exp1=${exp1} exp2=${exp2}`);
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\nHarness error:", e.message || e);
  console.error("If this is a connection error to 127.0.0.1:9099, the emulator was started");
  console.error("without auth. Restart it with: --only functions,firestore,auth\n");
  process.exit(1);
});
