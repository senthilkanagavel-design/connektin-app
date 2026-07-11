// seedPlans.cjs
// One-time seed of the 6 plan-master docs into Firestore.
//
// Uses the Firebase Admin SDK (service-account auth), which BYPASSES Firestore
// security rules — so this works even before the `plans` rules block is deployed.
//
// SEED : node seedPlans.cjs
// UNDO : node seedPlans.cjs --delete
// LIVE : $env:SEED_PROJECT="connektin-phase2"; node seedPlans.cjs   (later, not today)
//
// Run from INSIDE the functions/ folder so firebase-admin resolves from
// functions/node_modules. Requires ./serviceAccountKey.json in the same folder.

const admin = require("firebase-admin");

let serviceAccount;
try {
  serviceAccount = require("./serviceAccountKey.json");
} catch (e) {
  console.error("\n❌ Could not find ./serviceAccountKey.json in the functions/ folder.");
  console.error("   Firebase Console → Project settings → Service accounts → Generate new");
  console.error("   private key. Save it as serviceAccountKey.json inside functions/, re-run.\n");
  process.exit(1);
}

// Safety rail: refuse to run unless the key belongs to the expected project.
// Defaults to staging; override for live with $env:SEED_PROJECT="connektin-phase2".
const EXPECTED_PROJECT = process.env.SEED_PROJECT || "connektin-staging";
if (serviceAccount.project_id !== EXPECTED_PROJECT) {
  console.error(`\n❌ Safety stop: this key is for "${serviceAccount.project_id}",`);
  console.error(`   but SEED_PROJECT is "${EXPECTED_PROJECT}". Wrong key for this target.`);
  console.error(`   For live: $env:SEED_PROJECT="connektin-phase2"; node seedPlans.cjs\n`);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// The 6 plan-master docs — pricing locked 8 Jul 2026.
// amount + perMonth are STRINGS (charge logic reads amount as a string).
// intervalDays + sortOrder are NUMBERS; active is a BOOLEAN.
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
  console.log(`\nProject: ${serviceAccount.project_id}`);
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
    const amtType = typeof d.amount;      // must read: string
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
