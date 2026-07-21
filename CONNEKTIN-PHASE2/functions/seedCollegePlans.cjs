// seedCollegePlans.cjs
// One-time seed of the college "student" plan-master doc(s) into Firestore.
// Mirrors seedPlans.cjs exactly — same Admin SDK / safety-rail / usage pattern.
//
// SEED : node seedCollegePlans.cjs
// UNDO : node seedCollegePlans.cjs --delete
// LIVE : $env:SEED_PROJECT="connektin-phase2"; node seedCollegePlans.cjs   (later, not today)
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
  console.error(`   For live: $env:SEED_PROJECT="connektin-phase2"; node seedCollegePlans.cjs\n`);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// College students are annual-only (see functions/index.js createPaymentSession —
// "student" tier always-locks the interval the same way "thermite" does).
// amount + perMonth are STRINGS (charge logic reads amount as a string).
// intervalDays + sortOrder are NUMBERS; active is a BOOLEAN.
const PLANS = {
  student_annual: { tier: "student", interval: "annual", label: "Student", amount: "490", currency: "INR", intervalDays: 365, active: true, sortOrder: 7, perMonth: "41", badge: "College" },
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
  console.log(`✅ ${DELETE ? "Deleted" : "Wrote"} ${Object.keys(PLANS).length} doc(s).\n`);

  const snap = await db.collection("plans").where("tier", "==", "student").get();
  console.log(`Verifying — ${snap.size} doc(s) now in /plans with tier "student":`);
  snap.forEach((doc) => {
    const d = doc.data();
    console.log(
      `  ${doc.id.padEnd(19)} ₹${String(d.amount).padStart(5)}  ` +
      `${String(d.intervalDays).padStart(3)}d  /mo ₹${String(d.perMonth).padEnd(4)} ` +
      `(amount:${typeof d.amount}, intervalDays:${typeof d.intervalDays})`
    );
  });
  console.log("");
  process.exit(0);
}

run().catch((err) => {
  console.error("\n❌ Failed:", err.message || err, "\n");
  process.exit(1);
});
