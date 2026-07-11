// src/pages/PlanSelect.jsx
// Onboarding subscribe screen (Option B — code-forward, yes/no gate).
// Runs right after the role step. Replaces the old Qfix/trial PlanSelect.
//
// Flow:  ask ("Do you have a referral code?")
//          → YES → enter code → always-lock Thermite panel (interval frozen)
//          → NO  → Regular panel (free interval toggle)
//        Subscribe → createPaymentSession({ interval }) → Juspay hosted page.
//
// Pricing is ALWAYS read from the plan master (plans/{tier}_{interval}); the
// same docs the server charges from, so what the user sees == what's charged.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { collection, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
// NOTE (verify): this assumes firebase/config exports the initialized `app`.
// If it exports something else (e.g. a ready-made `functions` instance), swap
// the import + the getFunctions(app) call below accordingly.
import { db, app } from "../firebase/config";

const INTERVALS  = ["monthly", "quarterly", "annual"];
const IV_LABEL   = { monthly: "Monthly", quarterly: "Quarterly", annual: "Annual" };
const IV_PERIOD  = { monthly: "/mo", quarterly: "/qtr", annual: "/yr" };
const IV_WORD    = { monthly: "month", quarterly: "quarter", annual: "year" };
const MULT       = { monthly: 1, quarterly: 3, annual: 12 };
const FEATURES   = [
  "Browse all tabs",
  "Like, comment & follow",
  "Apply to jobs",
  "All articles — beginner to advanced",
  "E-Certificate every 90 days",
  "Live webinars every 15 days",
];

// ── Referral code validator (always-lock) ─────────────────────────
// Rejects legacy codes (no `interval`). Returns the code's locked interval;
// the display price is resolved from the plan master, not the code.
async function validateReferralCode(code) {
  try {
    const snap = await getDoc(doc(db, "referralCodes", code.toUpperCase()));
    if (!snap.exists()) return { valid: false, error: "Code not found." };
    const data = snap.data();
    if (!data.active) return { valid: false, error: "This code is no longer active." };
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) return { valid: false, error: "This code has expired." };
    if (!data.interval) return { valid: false, error: "This code is outdated. Please ask for a new one." };
    return { valid: true, interval: data.interval, label: data.label || "Thermite" };
  } catch (e) {
    return { valid: false, error: "Could not validate code. Try again." };
  }
}

export default function PlanSelect() {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]                 = useState("ask");     // ask | enter | plan
  const [tier, setTier]                 = useState("regular"); // regular | thermite
  const [lockedInterval, setLocked]     = useState(null);
  const [appliedCode, setAppliedCode]   = useState(null);
  const [selected, setSelected]         = useState("monthly");
  const [codeInput, setCodeInput]       = useState("");
  const [codeError, setCodeError]       = useState("");
  const [validating, setValidating]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [payError, setPayError]         = useState("");

  const [plans, setPlans]               = useState(null);      // { regular:{monthly:{...}}, thermite:{...} }
  const [plansError, setPlansError]     = useState(false);

  // Live pricing from the plan master
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "plans"),
      snap => {
        const map = { regular: {}, thermite: {} };
        snap.docs.forEach(d => {
          const p = d.data();
          if (!p.tier || !p.interval) return;
          if (!map[p.tier]) map[p.tier] = {};
          map[p.tier][p.interval] = {
            amount:   Number(p.amount),
            perMonth: p.perMonth != null ? Number(p.perMonth) : null,
            badge:    p.badge || null,
          };
        });
        setPlans(map);
        setPlansError(false);
      },
      () => setPlansError(true)
    );
    return () => unsub();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────
  async function handleValidateCode() {
    if (!codeInput.trim()) { setCodeError("Please enter your referral code."); return; }
    setValidating(true); setCodeError("");
    const result = await validateReferralCode(codeInput.trim());
    if (!result.valid) { setValidating(false); setCodeError(result.error); return; }

    // Commit tier + locked interval BEFORE showing pricing. createPaymentSession
    // resolves tier server-side and FORCES the interval from billingInterval for
    // Thermite, so both must be persisted here.
    try {
      await updateDoc(doc(db, "users", user.uid), {
        billingTier: "thermite",
        billingInterval: result.interval,
      });
      await fetchProfile(user.uid);
    } catch (e) {
      setValidating(false);
      setCodeError("Couldn't apply your code. Please try again.");
      return;
    }

    setValidating(false);
    setTier("thermite");
    setLocked(result.interval);
    setSelected(result.interval);
    setAppliedCode(codeInput.trim().toUpperCase());
    setStep("plan");
  }

  async function chooseRegular() {
    // Regular is the server-side default, but write it explicitly so a user who
    // applied a code earlier and backed out isn't left as thermite in Firestore.
    try {
      await updateDoc(doc(db, "users", user.uid), { billingTier: "regular", billingInterval: null });
      await fetchProfile(user.uid);
    } catch (e) { /* regular is the default; proceed regardless */ }
    setTier("regular");
    setLocked(null);
    setAppliedCode(null);
    setSelected("monthly");
    setStep("plan");
  }

  function pick(iv) {
    if (tier === "thermite" && iv !== lockedInterval) return; // frozen
    setSelected(iv);
  }

  async function handleSubscribe() {
    setSubmitting(true); setPayError("");
    try {
      // NOTE (verify): if your functions are deployed outside us-central1
      // (e.g. asia-south1), pass the region: getFunctions(app, "asia-south1").
      const createSession = httpsCallable(getFunctions(app), "createPaymentSession");
      const res = await createSession({ interval: selected });
      const url = res?.data?.paymentUrl;
      if (!url) throw new Error("No payment URL returned");
      window.location.assign(url); // Juspay hosted page → returns to /payment/status
    } catch (e) {
      console.error(e);
      setSubmitting(false);
      setPayError("Couldn't start checkout. Please try again.");
    }
  }

  const Logo = (
    <div style={s.logoRow}>
      <img src="/icon-512.png" alt="ConnektIn" style={s.logoImg} />
      <span style={s.logoText}>ConnektIn</span>
    </div>
  );
  const Footer = (
    <p style={s.footer}>Already have an account? <span style={s.link} onClick={() => navigate("/login")}>Sign in</span></p>
  );

  // ── Step: ask ─────────────────────────────────────────────────
  if (step === "ask") {
    return (
      <div style={s.page}>
        {Logo}
        <h1 style={s.heading}>One last thing</h1>
        <p style={s.sub}>Do you have a referral code?</p>
        <div style={{ ...s.card, maxWidth: 400 }}>
          <p style={s.muted}>Referral codes unlock special pricing on the Thermite plan.</p>
          <button style={{ ...s.btn, ...s.btnYes }} onClick={() => setStep("enter")}>Yes, I have a referral code</button>
          <button style={{ ...s.btn, ...s.btnNo }} onClick={chooseRegular}>No, show me the plans</button>
        </div>
        {Footer}
      </div>
    );
  }

  // ── Step: enter code ──────────────────────────────────────────
  if (step === "enter") {
    return (
      <div style={s.page}>
        {Logo}
        <h1 style={s.heading}>Enter your code</h1>
        <p style={s.sub}>Shared by your trainer or coordinator</p>
        <div style={{ ...s.card, maxWidth: 400 }}>
          <input
            value={codeInput}
            onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
            placeholder="Enter your referral code"
            style={s.codeInput}
            onKeyDown={e => e.key === "Enter" && handleValidateCode()}
            autoFocus
          />
          {codeError && <p style={s.err}>⚠ {codeError}</p>}
          <button style={{ ...s.btn, ...s.btnYes, opacity: validating ? 0.7 : 1 }} onClick={handleValidateCode} disabled={validating}>
            {validating ? "Checking…" : "Apply Code →"}
          </button>
          <button style={{ ...s.btn, ...s.btnNo }} onClick={() => { setStep("ask"); setCodeInput(""); setCodeError(""); }}>← Back</button>
        </div>
        {Footer}
      </div>
    );
  }

  // ── Step: plan ────────────────────────────────────────────────
  const isTherm   = tier === "thermite";
  const tierMap   = plans && plans[tier];
  const cur       = tierMap ? tierMap[selected] : null;
  const monthly   = tierMap ? tierMap.monthly : null;
  const fullPrice = (monthly && selected !== "monthly") ? monthly.amount * MULT[selected] : null;

  return (
    <div style={s.page}>
      {Logo}
      <h1 style={s.heading}>{isTherm ? "Thermite Plan" : "Choose your plan"}</h1>
      <p style={s.sub}>{isTherm ? "Special pricing unlocked with your referral code" : "Full access. Cancel anytime."}</p>

      <div style={{ ...s.card, maxWidth: 400, gap: 0 }}>
        {!plans && !plansError && <Loader />}
        {plansError && <p style={s.muted}>Couldn't load pricing. Please check your connection and try again.</p>}

        {plans && !plansError && (
          <>
            <div style={{ ...s.tierBadge, color: isTherm ? "#0D9488" : "#38bdf8" }}>
              {isTherm ? "✦ THERMITE — REFERRAL PRICING" : "REGULAR PLAN"}
            </div>

            {isTherm && appliedCode && (
              <div style={s.appliedRow}>
                Code applied <span style={s.chip}>{appliedCode}</span> · locked to {IV_LABEL[lockedInterval]}
              </div>
            )}

            {/* Segmented interval toggle */}
            <div style={s.segment}>
              {INTERVALS.map(iv => {
                const on = iv === selected;
                const locked = isTherm && iv !== lockedInterval;
                const badge = tierMap[iv]?.badge;
                return (
                  <button
                    key={iv}
                    onClick={() => pick(iv)}
                    disabled={locked}
                    title={locked ? `This code is fixed to ${IV_LABEL[lockedInterval]}. Ask for a different code to change it.` : ""}
                    style={{ ...s.seg, ...(on ? s.segOn : {}), ...(locked ? s.segLocked : {}) }}
                  >
                    <span>{IV_LABEL[iv]}{locked ? " 🔒" : ""}</span>
                    <span style={{ ...s.segSave, color: on ? "#d1fae5" : "#4ade80" }}>{badge || "\u00A0"}</span>
                  </button>
                );
              })}
            </div>

            {/* Price */}
            <div style={s.priceRow}>
              <span style={{ ...s.priceNum, color: isTherm ? "#4ade80" : "#38bdf8" }}>
                {cur ? `₹${cur.amount}` : "—"}
              </span>
              <span style={s.pricePeriod}>{IV_PERIOD[selected]}</span>
              {fullPrice && <span style={s.strike}>₹{fullPrice}</span>}
            </div>
            <div style={s.perMonth}>
              {selected === "monthly"
                ? "Billed monthly"
                : `${cur?.perMonth ? `₹${cur.perMonth}/month equivalent · ` : ""}billed every ${IV_WORD[selected]}`}
            </div>

            <ul style={s.feats}>
              {FEATURES.map(f => <li key={f} style={s.feat}><span style={s.ck}>✓</span>{f}</li>)}
            </ul>

            {payError && <p style={{ ...s.err, textAlign: "center" }}>⚠ {payError}</p>}

            <button
              style={{ ...s.btn, ...s.btnYes, opacity: (submitting || !cur) ? 0.7 : 1 }}
              onClick={handleSubscribe}
              disabled={submitting || !cur}
            >
              {submitting ? "Starting checkout…" : `Subscribe Now — ₹${cur ? cur.amount : ""}${IV_PERIOD[selected]} →`}
            </button>

            {isTherm ? (
              <p style={s.lockNote}>Your code is fixed to {IV_LABEL[lockedInterval]}. To pick a different interval, ask for a different code.</p>
            ) : (
              <button style={s.linkBtn} onClick={() => setStep("enter")}>Have a referral code?</button>
            )}
          </>
        )}
      </div>
      {Footer}
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
      <div style={{ width: 28, height: 28, border: "3px solid #334155", borderTopColor: "#0D9488", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

const s = {
  page:        { minHeight: "100dvh", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 14px", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" },
  logoRow:     { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 },
  logoImg:     { width: 32, height: 32, borderRadius: 8, objectFit: "cover" },
  logoText:    { fontSize: 18, fontWeight: 700, color: "#0D9488" },
  heading:     { fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", textAlign: "center" },
  sub:         { fontSize: 12, color: "#94a3b8", margin: "0 0 16px", textAlign: "center" },
  card:        { background: "#1e293b", border: "1px solid #334155", borderRadius: 14, padding: "18px", width: "100%", display: "flex", flexDirection: "column", gap: 12 },
  muted:       { fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 1.6, margin: 0 },

  btn:         { width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "'DM Sans', sans-serif" },
  btnYes:      { background: "#0D9488", color: "#fff" },
  btnNo:       { background: "transparent", border: "1.5px solid #334155", color: "#94a3b8" },
  linkBtn:     { background: "none", border: "none", color: "#0D9488", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textDecoration: "underline", marginTop: 14 },

  codeInput:   { width: "100%", background: "#0f172a", border: "1.5px solid #334155", borderRadius: 10, padding: "12px 14px", fontSize: 16, fontWeight: 700, color: "#f1f5f9", outline: "none", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em", boxSizing: "border-box", textTransform: "uppercase" },
  err:         { fontSize: 12, color: "#f87171", margin: 0 },

  tierBadge:   { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 },
  appliedRow:  { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", marginBottom: 12, flexWrap: "wrap" },
  chip:        { background: "rgba(13,148,136,0.15)", color: "#5eead4", fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.06em" },

  segment:     { display: "flex", gap: 6, background: "#0f172a", padding: 5, borderRadius: 12, border: "1px solid #334155", marginBottom: 16 },
  seg:         { flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "transparent", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "0.15s" },
  segOn:       { background: "#0D9488", color: "#fff", boxShadow: "0 2px 10px rgba(13,148,136,0.4)" },
  segLocked:   { opacity: 0.38, cursor: "not-allowed" },
  segSave:     { fontSize: 9, fontWeight: 700 },

  priceRow:    { display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 },
  priceNum:    { fontSize: 38, fontWeight: 800 },
  pricePeriod: { fontSize: 14, color: "#94a3b8" },
  strike:      { color: "#64748b", textDecoration: "line-through", fontSize: 15, fontWeight: 600, marginLeft: 4 },
  perMonth:    { fontSize: 12, color: "#64748b", marginBottom: 16 },

  feats:       { listStyle: "none", padding: 0, margin: "4px 0 18px", display: "flex", flexDirection: "column", gap: 7 },
  feat:        { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cbd5e1" },
  ck:          { color: "#4ade80", fontWeight: 800, flexShrink: 0 },

  lockNote:    { fontSize: 11, color: "#64748b", textAlign: "center", marginTop: 10, lineHeight: 1.5 },
  footer:      { marginTop: 16, fontSize: 12, color: "#94a3b8", textAlign: "center" },
  link:        { color: "#0D9488", cursor: "pointer", fontWeight: 600 },
};
