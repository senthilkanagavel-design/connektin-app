// seedEmulator.cjs
// Seed the 6 plan-master docs into the LOCAL Firestore EMULATOR only.
//
// Unlike seedPlans.cjs, this needs NO serviceAccountKey.json: the Admin SDK
// talks to the emulator purely via FIRESTORE_EMULATOR_HOST, with no real
// credentials. It also CANNOT touch production — it refuses to run unless the
// Firestore host is a loopback address (127.0.0.1 / localhost).
//
// Prereq: the Firestore emulator must be running (firebase emulators:start ...).
//
// SEED : node seedEmulator.cjs
// UNDO : node seedEmulator.cjs --delete
//
// Run from INSIDE the functions/ folder so firebase-admin resolves from
// functions/node_modules.

const admin = require("firebase-admin");

// Point the Admin SDK at the local Firestore emulator (default port 8080).
// Override with $env:FIRESTORE_EMULATOR_HOST if you started it elsewhere.
const HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIRESTORE_EMULATOR_HOST = HOST;

// Safety rail: refuse to run against anything that isn't the local emulator.
const hostname = HOST.split(":")[0];
const isLoopback = hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
if (!isLoopback) {
  console.error(`\n❌ Safety stop: FIRESTORE_EMULATOR_HOST is "${HOST}", not a loopback address.`);
  console.error(`   This script only seeds the LOCAL emulator. Aborting.\n`);
  process.exit(1);
}

// No credential needed for the emulator — projectId is enough.
admin.initializeApp({ projectId: "connektin-staging" });
const db = admin.firestore();

// The 6 plan-master docs — identical to seedPlans.cjs (pricing locked 8 Jul 2026).
// amount + perMonth are STRINGS; intervalDays + sortOrder are NUMBERS; active is BOOLEAN.
const PLANS = {
  regular_monthly:    { tier: "regular",  interval: "monthly",   label: "Regular",  amount: "129",  currency: "INR", intervalDays: 30,  active: true, sortOrder: 1, perMonth: "129", badge: "" },
  regular_quarterly:  { tier: "regular",  interval: "quarterly", label: "Regular",  amount: "348",  currency: "INR", intervalDays: 90,  active: true, sortOrder: 2, perMonth: "116", badge: "Save 10%" },
  regular_annual:     { tier: "regular",  interval: "annual",    label: "Regular",  amount: "1238", currency: "INR", intervalDays: 365, active: true, sortOrder: 3, perMonth: "103", badge: "Save 20%" },
  thermite_monthly:   { tier: "thermite", interval: "monthly",   label: "Thermite", amount: "49",   currency: "INR", intervalDays: 30,  active: true, sortOrder: 4, perMonth: "49",  badge: "" },
  thermite_quarterly: { tier: "thermite", interval: "quarterly", label: "Thermite", amount: "132",  currency: "INR", intervalDays: 90,  active: true, sortOrder: 5, perMonth: "44",  badge: "Save 10%" },
  thermite_annual:    { tier: "thermite", interval: "annual",    label: "Thermite", amount: "488",  currency: "INR", intervalDays: 365, active: true, sortOrder: 6, perMonth: "41",  badge: "Save 17%" },
};

const DELETE = process.argv.includes("--delete");

async function run() {
  console.log(`\nTarget:  EMULATOR @ ${HOST}`);
  console.log(`Mode:    ${DELETE ? "DELETE (undo)" : "SEED"}\n`);

  const batch = db.batch();
  for (const [planId, data] of Object.entries(PLANS)) {
    const ref = db.collection("plans").doc(planId);
    if (DELETE) batch.delete(ref);
    else batch.set(ref, data); // set() overwrites → re-running is safe
  }
  await batch.commit();
  console.log(`✅ ${DELETE ? "Deleted" : "Wrote"} ${Object.keys(PLANS).length} docs.\n`);

  // Read back /plans so you can eyeball values + types.
  const snap = await db.collection("plans").orderBy("sortOrder").get();
  console.log(`Verifying — ${snap.size} doc(s) now in /plans:`);
  snap.forEach((doc) => {
    const d = doc.data();
    const amtType = typeof d.amount;        // must read: string
    const daysType = typeof d.intervalDays; // must read: number
    console.log(
      `  ${doc.id.padEnd(19)} ₹${String(d.amount).padStart(5)}  ` +
      `${String(d.intervalDays).padStart(3)}d  /mo ₹${String(d.perMonth).padEnd(4)} ` +
      `${(d.badge ? "[" + d.badge + "]" : "").padEnd(11)} ` +
      `(amount:${amtType}, intervalDays:${daysType})`
    );
  });
  console.log("");
  process.exit(0);
}

run().catch((err) => {
  console.error("\n❌ Failed:", err.message || err, "\n");
  process.exit(1);
});
