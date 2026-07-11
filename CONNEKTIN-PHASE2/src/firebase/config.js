// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app     = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// ── Local emulator wiring (DEV ONLY) ───────────────────────────────
// Activates ONLY when VITE_USE_EMULATOR === "true" (set in .env.local, which
// is gitignored). In every normal/production build this flag is absent, so the
// whole block is skipped and the app talks to the real Firebase project.
// Never set VITE_USE_EMULATOR in a deployed build.
if (import.meta.env.VITE_USE_EMULATOR === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  // getFunctions(app) with no region defaults to us-central1 — the same
  // instance PlanSelect resolves for createPaymentSession, so connecting the
  // emulator here routes that callable to the local functions emulator too.
  connectFunctionsEmulator(getFunctions(app), "127.0.0.1", 5001);
  // eslint-disable-next-line no-console
  console.warn("[firebase] LOCAL EMULATORS active — auth:9099, firestore:8080, functions:5001");
}

export default app;
