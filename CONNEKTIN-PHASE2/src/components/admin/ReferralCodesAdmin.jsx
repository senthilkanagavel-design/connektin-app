// src/components/admin/ReferralCodesAdmin.jsx
import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";

// ALWAYS-LOCK MODEL:
// A referral code sells the Thermite plan + ONE fixed billing interval.
// We write the INTERVAL (not a price). The real charge is always resolved
// server-side from plans/thermite_{interval}, so the amount shown here is
// display-only. Live values from the plan master override the fallback below.
const INTERVALS = [
  { value: "monthly",   label: "Monthly"   },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual",    label: "Annual"    },
];
// Cosmetic fallback so the preview isn't blank before the 6 plan docs are seeded.
// Live plans/thermite_{interval}.amount always overrides this.
const THERMITE_FALLBACK = { monthly: "49", quarterly: "132", annual: "488" };

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function ReferralCodesAdmin() {
  const [codes, setCodes]                   = useState([]);
  const [planPrices, setPlanPrices]         = useState({}); // { monthly, quarterly, annual } from plans master
  const [showForm, setShowForm]             = useState(false);
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [expiryDays, setExpiryDays]         = useState("30");
  const [notes, setNotes]                   = useState("");
  const [environment, setEnvironment]       = useState("live");
  const [saving, setSaving]                 = useState(false);
  const [newCode, setNewCode]               = useState("");

  // Referral codes list
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "referralCodes"), snap => {
      setCodes(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      );
    });
    return () => unsub();
  }, []);

  // Live Thermite prices from the plan master (display-only preview)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "plans"), snap => {
      const map = {};
      snap.docs.forEach(d => {
        const p = d.data();
        if (p.tier === "thermite" && p.interval) map[p.interval] = String(p.amount);
      });
      setPlanPrices(map);
    });
    return () => unsub();
  }, []);

  const priceFor = (iv) => planPrices[iv] ?? THERMITE_FALLBACK[iv] ?? null;
  const intervalLabel = (iv) => INTERVALS.find(x => x.value === iv)?.label || iv;
  const previewPrice = priceFor(billingInterval);

  async function handleCreate() {
    if (!billingInterval) return;
    setSaving(true);
    const code = generateCode();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + parseInt(expiryDays || "30", 10));
    try {
      await setDoc(doc(db, "referralCodes", code), {
        code,
        tier: "thermite",
        interval: billingInterval,          // "monthly" | "quarterly" | "annual"
        label: "Thermite",
        active: true,
        environment,
        notes: notes.trim() || "",
        expiresAt: expiry,
        createdAt: serverTimestamp(),
      });
      setNewCode(code);
      setShowForm(false);
      setBillingInterval("monthly");
      setNotes("");
      setEnvironment("live");
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function toggleActive(id, current) {
    await updateDoc(doc(db, "referralCodes", id), { active: !current });
  }

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <div style={S.title}>Referral Codes</div>
          <div style={S.sub}>Generate and manage codes for the Thermite plan</div>
        </div>
        <button style={S.createBtn} onClick={() => { setShowForm(true); setNewCode(""); }}>
          + Generate Code
        </button>
      </div>

      {/* New code generated confirmation */}
      {newCode && (
        <div style={S.newCodeBanner}>
          <span style={S.newCodeLabel}>New code generated:</span>
          <span style={S.newCode}>{newCode}</span>
          <button style={S.copyBtn} onClick={() => navigator.clipboard.writeText(newCode)}>Copy</button>
        </div>
      )}

      {/* Create form — dark card */}
      {showForm && (
        <div style={S.form}>
          <div style={S.formTitle}>New referral code</div>

          {/* Interval — mandatory segmented control */}
          <div style={S.formBlock}>
            <label style={S.lbl}>Billing interval</label>
            <div style={S.segment}>
              {INTERVALS.map(iv => {
                const on = billingInterval === iv.value;
                return (
                  <button
                    key={iv.value}
                    onClick={() => setBillingInterval(iv.value)}
                    style={{ ...S.segBtn, ...(on ? S.segBtnOn : {}) }}
                  >
                    {iv.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price preview + plan label */}
          <div style={S.previewRow}>
            <div style={S.previewBox}>
              <div style={S.previewLbl}>PRICE (FROM PLAN MASTER)</div>
              <div style={S.previewVal}>
                {previewPrice ? `₹${previewPrice}` : "—"}
                <span style={S.previewPer}>/{intervalLabel(billingInterval).toLowerCase()}</span>
              </div>
            </div>
            <div style={S.previewBox}>
              <div style={S.previewLbl}>PLAN</div>
              <div style={S.planChip}>Thermite</div>
            </div>
          </div>

          <div style={S.formRow}>
            <div style={S.formField}>
              <label style={S.lbl}>Expires in (days)</label>
              <input style={S.input} value={expiryDays} onChange={e => setExpiryDays(e.target.value)} placeholder="30" />
            </div>
            <div style={S.formField}>
              <label style={S.lbl}>Environment</label>
              <select style={S.input} value={environment} onChange={e => setEnvironment(e.target.value)}>
                <option value="live">🟢 Live</option>
                <option value="test">🧪 Test</option>
              </select>
            </div>
          </div>

          <div style={{ ...S.formBlock, marginBottom: 16 }}>
            <label style={S.lbl}>Notes (for your reference)</label>
            <input
              style={S.input}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. June 2026 — Bharath workshop students"
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.createBtn} onClick={handleCreate} disabled={saving}>
              {saving ? "Generating…" : "Generate"}
            </button>
            <button style={S.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Codes table */}
      <div style={S.table}>
        <div style={S.tableHeader}>
          <span style={{ flex: 1.4 }}>Code</span>
          <span style={{ flex: 1.2 }}>Plan</span>
          <span style={{ flex: 0.8 }}>Env</span>
          <span style={{ flex: 1.2 }}>Expires</span>
          <span style={{ flex: 2 }}>Notes</span>
          <span style={{ flex: 0.8 }}>Status</span>
        </div>

        {codes.length === 0 && (
          <div style={S.empty}>No codes yet. Generate one above.</div>
        )}

        {codes.map(c => {
          const legacy = !c.interval; // pre-always-lock codes had `price`, no interval
          return (
            <div key={c.id} style={S.tableRow}>
              <span style={{ ...S.codeCell, flex: 1.4 }}>{c.code}</span>
              <span style={{ flex: 1.2, fontSize: 12 }}>
                {legacy ? (
                  <span style={S.legacyBadge} title="Created before the interval model — regenerate this code">⚠ Legacy</span>
                ) : (
                  <span>
                    <span style={{ color: "#0D9488", fontWeight: 700 }}>₹{priceFor(c.interval) ?? "—"}</span>
                    <span style={{ color: "#888", marginLeft: 6 }}>{intervalLabel(c.interval)}</span>
                  </span>
                )}
              </span>
              <span style={{ flex: 0.8, fontSize: 12 }}>
                {c.environment === "test"
                  ? <span style={S.envTest}>🧪 Test</span>
                  : <span style={S.envLive}>🟢 Live</span>}
              </span>
              <span style={{ flex: 1.2, fontSize: 12, color: "#888" }}>
                {c.expiresAt?.toDate?.()?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) || "—"}
              </span>
              <span style={{ flex: 2, fontSize: 12, color: "#555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.notes || <span style={{ color: "#ccc" }}>—</span>}
              </span>
              <span style={{ flex: 0.8 }}>
                <button
                  onClick={() => toggleActive(c.id, c.active)}
                  style={{
                    ...S.toggleBtn,
                    background: c.active ? "#E6FAF8" : "#fff",
                    color: c.active ? "#0F6E56" : "#9CA3AF",
                    borderColor: c.active ? "#0D9488" : "#E4E2DC",
                  }}
                >
                  {c.active ? "Active" : "Inactive"}
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const S = {
  wrap:          { padding: "16px", fontFamily: "'DM Sans', sans-serif" },
  header:        { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title:         { fontSize: 16, fontWeight: 700, color: "#0A1628" },
  sub:           { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  createBtn:     { background: "#0D9488", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 },
  cancelBtn:     { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.78)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  newCodeBanner: { background: "#E6FAF8", border: "1px solid #0D9488", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  newCodeLabel:  { fontSize: 12, color: "#0F6E56", fontWeight: 600 },
  newCode:       { fontSize: 16, fontWeight: 800, color: "#0D9488", letterSpacing: "0.12em", flex: 1 },
  copyBtn:       { background: "#0D9488", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },

  // Dark create form
  form:          { background: "#0F2040", border: "1px solid rgba(13,148,136,0.35)", borderRadius: 12, padding: "18px", marginBottom: 16, boxShadow: "0 10px 30px rgba(10,22,40,0.25)" },
  formTitle:     { fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 14 },
  formBlock:     { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  formRow:       { display: "flex", gap: 12, marginBottom: 14 },
  formField:     { flex: 1, display: "flex", flexDirection: "column", gap: 6 },
  lbl:           { fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" },
  input:         { border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "9px 11px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: "#fff", outline: "none", background: "rgba(255,255,255,0.06)" },

  // Segmented interval control
  segment:       { display: "flex", gap: 6, background: "rgba(255,255,255,0.05)", padding: 4, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" },
  segBtn:        { flex: 1, padding: "9px 0", borderRadius: 7, border: "none", background: "transparent", color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  segBtnOn:      { background: "#0D9488", color: "#fff", fontWeight: 700, boxShadow: "0 2px 8px rgba(13,148,136,0.4)" },

  // Price preview
  previewRow:    { display: "flex", gap: 12, marginBottom: 14 },
  previewBox:    { flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px" },
  previewLbl:    { fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4, letterSpacing: 0.4 },
  previewVal:    { fontSize: 20, fontWeight: 800, color: "#5EEAD4" },
  previewPer:    { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginLeft: 3 },
  planChip:      { display: "inline-block", background: "#DBEAFE", color: "#1E40AF", fontSize: 13, fontWeight: 700, padding: "5px 12px", borderRadius: 20, marginTop: 2 },

  // Codes table (light — unchanged from original)
  table:         { border: "1px solid #E4E2DC", borderRadius: 10, overflow: "hidden" },
  tableHeader:   { display: "flex", padding: "10px 14px", background: "#F3F2EF", borderBottom: "1px solid #E4E2DC", fontSize: 11, fontWeight: 700, color: "#888", gap: 8 },
  tableRow:      { display: "flex", padding: "12px 14px", borderBottom: "1px solid #F3F2EF", alignItems: "center", gap: 8, background: "#fff" },
  codeCell:      { fontSize: 13, fontWeight: 700, color: "#0A1628", fontFamily: "monospace", letterSpacing: "0.08em" },
  empty:         { padding: "24px", textAlign: "center", fontSize: 13, color: "#9CA3AF" },
  toggleBtn:     { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: "1px solid", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  legacyBadge:   { background: "#FEF3C7", color: "#92400E", padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  envLive:       { background: "#E6FAF8", color: "#0F6E56", padding: "2px 7px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
  envTest:       { background: "#FFF7ED", color: "#92400E", padding: "2px 7px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
};
