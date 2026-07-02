import { useState } from "react";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";

// Region must match the Cloud Functions region (asia-south1).
const functions = getFunctions(undefined, "asia-south1");

// In local dev (npm run dev), talk to the Functions emulator instead of production.
if (import.meta.env.DEV) {
  try {
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  } catch (_) {
    /* already connected on hot-reload — ignore */
  }
}

/**
 * Drop this anywhere in the app (e.g. a paywall / settings page).
 * The user MUST be signed in — createPaymentSession requires auth.
 */
export default function SubscribeButton({ plan = "quarterly" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubscribe() {
    setLoading(true);
    setError("");
    try {
      const createSession = httpsCallable(functions, "createPaymentSession");
      const { data } = await createSession({ plan });
      if (data && data.paymentUrl) {
        // Sends the browser to the HDFC hosted page (or, in stub mode, straight
        // through paymentReturn as CHARGED).
        window.location.href = data.paymentUrl;
      } else {
        setError("No payment URL came back from the server.");
      }
    } catch (e) {
      // e.code is like 'functions/unauthenticated' if not signed in
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        style={{
          padding: "12px 18px",
          borderRadius: 10,
          border: "none",
          fontWeight: 700,
          cursor: loading ? "default" : "pointer",
          background: "#0FA37F",
          color: "#fff",
        }}
      >
        {loading ? "Starting…" : "Subscribe — ₹147 / quarter"}
      </button>
      {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
    </div>
  );
}
