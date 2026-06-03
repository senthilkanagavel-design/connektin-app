import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

const QFIX_URL = "https://form.qfixonline.com/thereduform";

// ── Referral code validator ───────────────────────────────────────
async function validateReferralCode(code) {
  try {
    const snap = await getDoc(doc(db, "referralCodes", code.toUpperCase()));
    if (!snap.exists()) return { valid: false, error: "Code not found." };
    const data = snap.data();
    if (!data.active) return { valid: false, error: "This code is no longer active." };
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) return { valid: false, error: "This code has expired." };
    return { valid: true, price: data.price, label: data.label || "Thermite" };
  } catch (e) {
    return { valid: false, error: "Could not validate code. Try again." };
  }
}

export default function PlanSelect() {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]             = useState("ask");   // ask | enter | valid | plans | pending
  const [codeInput, setCodeInput]   = useState("");
  const [codeError, setCodeError]   = useState("");
  const [validating, setValidating] = useState(false);
  const [referral, setReferral]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────

  async function handleValidateCode() {
    if (!codeInput.trim()) { setCodeError("Please enter your referral code."); return; }
    setValidating(true); setCodeError("");
    const result = await validateReferralCode(codeInput.trim());
    setValidating(false);
    if (!result.valid) { setCodeError(result.error); return; }
    setReferral({ price: result.price, label: result.label });
    setStep("valid");
  }

  async function handleFreeTrial() {
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { plan: "trial", trialStartDate: serverTimestamp() });
      await fetchProfile(user.uid);
      navigate("/dashboard");
    } catch (err) {
      console.error(err); setLoading(false);
    }
  }

  function handleSubscribeNow() {
    // Mark pending in Firestore so we can track who clicked
    updateDoc(doc(db, "users", user.uid), {
      subscriptionPending: true,
      subscriptionPendingAt: serverTimestamp(),
    }).catch(() => {});
    // Open Qfix payment form in new tab
    window.open(QFIX_URL, "_blank");
    // Show pending confirmation screen
    setStep("pending");
  }

  // ── Step: Ask if they have a code ─────────────────────────────
  if (step === "ask") {
    return (
      <div style={s.page}>
        <div style={s.logoRow}>
          <img src="/icon-512.png" alt="ConnektIn" style={s.logoImg} />
          <span style={s.logoText}>ConnektIn</span>
        </div>
        <h1 style={s.heading}>One last thing</h1>
        <p style={s.sub}>Do you have a referral code?</p>

        <div style={{ ...s.card, maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
            Referral codes give you access to special pricing on the Thermite plan.
          </p>
          <button style={{ ...s.btn, ...s.btnYes }} onClick={() => setStep("enter")}>
            Yes, I have a referral code
          </button>
          <button style={{ ...s.btn, ...s.btnNo }} onClick={() => setStep("plans")}>
            No, show me the plans
          </button>
        </div>

        <p style={s.footer}>Already have an account? <span style={s.link} onClick={() => navigate("/login")}>Sign in</span></p>
      </div>
    );
  }

  // ── Step: Enter code ──────────────────────────────────────────
  if (step === "enter") {
    return (
      <div style={s.page}>
        <div style={s.logoRow}>
          <img src="/icon-512.png" alt="ConnektIn" style={s.logoImg} />
          <span style={s.logoText}>ConnektIn</span>
        </div>
        <h1 style={s.heading}>Enter your code</h1>
        <p style={s.sub}>Shared by your trainer or coordinator</p>

        <div style={{ ...s.card, maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={codeInput}
            onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
            placeholder="Enter your referral code"
            style={s.codeInput}
            onKeyDown={e => e.key === "Enter" && handleValidateCode()}
            autoFocus
          />
          {codeError && <p style={s.codeError}>⚠ {codeError}</p>}
          <button
            style={{ ...s.btn, ...s.btnYes, opacity: validating ? 0.7 : 1 }}
            onClick={handleValidateCode}
            disabled={validating}
          >
            {validating ? "Checking…" : "Apply Code →"}
          </button>
          <button style={{ ...s.btn, ...s.btnNo }} onClick={() => { setStep("ask"); setCodeInput(""); setCodeError(""); }}>
            ← Back
          </button>
        </div>

        <p style={s.footer}>Already have an account? <span style={s.link} onClick={() => navigate("/login")}>Sign in</span></p>
      </div>
    );
  }

  // ── Step: Valid code — show Thermite plan ─────────────────────
  if (step === "valid" && referral) {
    const features = [
      "Everything in Free Trial",
      "Like, comment & follow",
      "Apply to jobs",
      "All articles — beginner to advanced",
      "E-Certificate every 90 days",
      "Live webinars every 15 days",
    ];
    return (
      <div style={s.page}>
        <div style={s.logoRow}>
          <img src="/icon-512.png" alt="ConnektIn" style={s.logoImg} />
          <span style={s.logoText}>ConnektIn</span>
        </div>
        <h1 style={s.heading}>Thermite Plan</h1>
        <p style={s.sub}>Special pricing unlocked with your referral code</p>

        <div style={{ ...s.cardThermite, maxWidth: 400, width: "100%" }}>
          <div style={s.thermiteBadge}>✦ THERMITE PLAN — REFERRAL PRICING</div>
          <div style={s.thermitePrice}>
            <span style={s.thermitePriceNum}>{referral.price}</span>
            <span style={s.thermitePriceSub}>/month</span>
          </div>
          <ul style={{ ...s.list, marginBottom: 20 }}>
            {features.map(f => (
              <li key={f} style={s.item}><span style={s.checkGreen}>✓</span>{f}</li>
            ))}
          </ul>

          <button style={{ ...s.btn, ...s.btnThermite }} onClick={handleSubscribeNow}>
            Subscribe Now — {referral.price}/month →
          </button>
          <button style={s.btnGhost} onClick={handleFreeTrial} disabled={loading}>
            {loading ? "Starting…" : "Start free trial instead"}
          </button>
        </div>

        <p style={s.footer}>Already have an account? <span style={s.link} onClick={() => navigate("/login")}>Sign in</span></p>
      </div>
    );
  }

  // ── Step: Payment Pending ─────────────────────────────────────
  if (step === "pending") {
    return (
      <div style={s.page}>
        <div style={s.logoRow}>
          <img src="/icon-512.png" alt="ConnektIn" style={s.logoImg} />
          <span style={s.logoText}>ConnektIn</span>
        </div>

        <div style={{ ...s.card, maxWidth: 400, width: "100%", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 44 }}>🎉</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Payment Form Opened</h2>
          <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>
            Complete your payment in the tab that just opened. Once your payment is confirmed, your Thermite plan will be activated within a few hours.
          </p>
          <div style={s.pendingNote}>
            <span style={{ fontSize: 16 }}>📧</span>
            <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
              Not activated after a few hours? Write to us at{" "}
              <a href="mailto:official@thermiteeducare.com" style={{ color: "#0D9488", fontWeight: 600 }}>
                official@thermiteeducare.com
              </a>
            </span>
          </div>
          <button
            style={{ ...s.btn, ...s.btnYes, width: "100%" }}
            onClick={() => window.open(QFIX_URL, "_blank")}
          >
            Reopen Payment Form
          </button>
          <button style={s.btnGhost} onClick={() => { handleFreeTrial(); }}>
            Continue with Free Trial for now
          </button>
        </div>

        <p style={s.footer}>Already have an account? <span style={s.link} onClick={() => navigate("/login")}>Sign in</span></p>
      </div>
    );
  }

  // ── Step: Standard plans (no code) ───────────────────────────
  return (
    <div style={s.page}>
      {showComingSoon && (
        <div style={s.overlay} onClick={() => setShowComingSoon(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalIcon}>🚀</div>
            <div style={s.modalTitle}>Payments Coming Soon</div>
            <div style={s.modalBody}>Pro subscriptions will be live shortly. We'll notify you as soon as payments are enabled.</div>
            <button style={s.modalBtn} onClick={() => setShowComingSoon(false)}>Got it</button>
          </div>
        </div>
      )}

      <div style={s.logoRow}>
        <img src="/icon-512.png" alt="ConnektIn" style={s.logoImg} />
        <span style={s.logoText}>ConnektIn</span>
      </div>

      <h1 style={s.heading}>Pro Plan</h1>
      <p style={s.sub}>Full access. Cancel anytime.</p>

      <div style={{ maxWidth: 340, width: "100%" }}>
        {/* Pro */}
        <div style={{ ...s.cardPro, padding: "20px 18px" }}>
          <div style={s.badgePro}>Most Popular</div>
          <div style={{ ...s.cardTitle, color: "#fff" }}>Pro</div>
          <div style={s.priceRow}>
            <span style={s.pricePro}>₹199</span>
            <span style={{ ...s.priceSub, color: "#9ca3af" }}>/mo</span>
          </div>
          <ul style={s.list}>
            <li style={{ ...s.item, color: "#d1fae5" }}><span style={s.checkGreen}>✓</span>Browse all tabs</li>
            <li style={{ ...s.item, color: "#d1fae5" }}><span style={s.checkGreen}>✓</span>Like, comment & follow</li>
            <li style={{ ...s.item, color: "#d1fae5" }}><span style={s.checkGreen}>✓</span>Apply to jobs</li>
            <li style={{ ...s.item, color: "#d1fae5" }}><span style={s.checkGreen}>✓</span>All articles — beginner to advanced</li>
            <li style={{ ...s.item, color: "#d1fae5" }}><span style={s.checkGreen}>✓</span>E-Certificate every 90 days</li>
            <li style={{ ...s.item, color: "#d1fae5" }}><span style={s.checkGreen}>✓</span>Live webinars every 15 days</li>
          </ul>
          <button style={{ ...s.btn, ...s.btnPro }} onClick={() => setShowComingSoon(true)}>
            Subscribe Now — ₹199/month →
          </button>
        </div>
      </div>

      <button style={s.haveCodeLink} onClick={() => setStep("enter")}>
        Have a referral code?
      </button>

      <p style={s.footer}>Already have an account? <span style={s.link} onClick={() => navigate("/login")}>Sign in</span></p>
    </div>
  );
}

const s = {
  page:             { minHeight: "100dvh", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 14px", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" },
  overlay:          { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 },
  modal:            { background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: "28px 24px", maxWidth: 300, width: "100%", textAlign: "center" },
  modalIcon:        { fontSize: 36, marginBottom: 12 },
  modalTitle:       { fontSize: 17, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 },
  modalBody:        { fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 20 },
  modalBtn:         { background: "#0d9488", color: "#fff", border: "none", borderRadius: 9, padding: "10px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  logoRow:          { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 },
  logoImg:          { width: 32, height: 32, borderRadius: 8, objectFit: "cover" },
  logoText:         { fontSize: 18, fontWeight: 700, color: "#0d9488" },
  heading:          { fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", textAlign: "center" },
  sub:              { fontSize: 12, color: "#94a3b8", margin: "0 0 14px", textAlign: "center" },
  card:             { background: "#1e293b", border: "1px solid #334155", borderRadius: 14, padding: "20px 18px" },
  codeInput:        { width: "100%", background: "#0f172a", border: "1.5px solid #334155", borderRadius: 10, padding: "12px 14px", fontSize: 16, fontWeight: 700, color: "#f1f5f9", outline: "none", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em", boxSizing: "border-box", textTransform: "uppercase" },
  codeError:        { fontSize: 12, color: "#F87171", margin: 0 },
  pendingNote:      { background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start", textAlign: "left", width: "100%" },
  row:              { display: "flex", gap: 10, width: "100%", maxWidth: 480, alignItems: "stretch" },
  cardTrial:        { flex: 1, background: "#1e293b", border: "2px solid #0d9488", borderRadius: 14, padding: "14px 12px", boxShadow: "0 0 20px rgba(13,148,136,0.25)", display: "flex", flexDirection: "column" },
  cardPro:          { flex: 1, background: "linear-gradient(160deg, #0f3460 0%, #1a4a7a 100%)", border: "1px solid #0ea5e9", borderRadius: 14, padding: "14px 12px", boxShadow: "0 0 20px rgba(14,165,233,0.15)", display: "flex", flexDirection: "column" },
  cardThermite:     { background: "linear-gradient(160deg, #0a2a20 0%, #0f3d2d 100%)", border: "2px solid #0D9488", borderRadius: 16, padding: "20px 18px", boxShadow: "0 0 30px rgba(13,148,136,0.3)", display: "flex", flexDirection: "column", gap: 0 },
  thermiteBadge:    { fontSize: 11, fontWeight: 700, color: "#0D9488", letterSpacing: "0.08em", marginBottom: 12 },
  thermitePrice:    { display: "flex", alignItems: "baseline", gap: 4, marginBottom: 14 },
  thermitePriceNum: { fontSize: 36, fontWeight: 800, color: "#4ade80" },
  thermitePriceSub: { fontSize: 13, color: "#94a3b8" },
  badgeTrial:       { display: "inline-block", background: "rgba(13,148,136,0.2)", color: "#0d9488", fontSize: 9, fontWeight: 700, padding: "3px 7px", borderRadius: 20, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4, width: "fit-content" },
  badgePro:         { display: "inline-block", background: "rgba(74,222,128,0.15)", color: "#4ade80", fontSize: 9, fontWeight: 700, padding: "3px 7px", borderRadius: 20, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4, width: "fit-content" },
  cardTitle:        { fontSize: 15, fontWeight: 700, color: "#cbd5e1", margin: "0 0 6px" },
  priceRow:         { display: "flex", alignItems: "baseline", gap: 3, marginBottom: 8 },
  priceTrial:       { fontSize: 22, fontWeight: 800, color: "#0ea5e9" },
  pricePro:         { fontSize: 22, fontWeight: 800, color: "#4ade80" },
  priceSub:         { fontSize: 11, color: "#64748b" },
  list:             { listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 5, flex: 1 },
  item:             { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#94a3b8" },
  itemLocked:       { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#475569" },
  check:            { color: "#0ea5e9", fontWeight: 700, fontSize: 12, flexShrink: 0 },
  checkGreen:       { color: "#4ade80", fontWeight: 700, fontSize: 12, flexShrink: 0 },
  lock:             { fontSize: 10, flexShrink: 0 },
  btn:              { width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "'DM Sans', sans-serif" },
  btnYes:           { background: "#0D9488", color: "#fff" },
  btnNo:            { background: "transparent", border: "1.5px solid #334155", color: "#94a3b8" },
  btnTrial:         { background: "linear-gradient(135deg, #0d9488, #0ea5e9)", color: "#fff", marginTop: "auto" },
  btnPro:           { background: "transparent", border: "1.5px solid #0ea5e9", color: "#0ea5e9", marginTop: "auto" },
  btnThermite:      { background: "#0D9488", color: "#fff", padding: "13px 0", fontSize: 14, marginTop: 8 },
  btnGhost:         { background: "none", border: "none", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 8, padding: "4px 0" },
  haveCodeLink:     { background: "none", border: "none", color: "#0D9488", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 12, textDecoration: "underline" },
  footer:           { marginTop: 12, fontSize: 12, color: "#94a3b8", textAlign: "center" },
  link:             { color: "#0d9488", cursor: "pointer", fontWeight: 600 },
};
