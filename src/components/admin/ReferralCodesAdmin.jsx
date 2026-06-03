// src/components/admin/ReferralCodesAdmin.jsx
import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function ReferralCodesAdmin() {
  const [codes, setCodes]           = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [price, setPrice]           = useState("");
  const [label, setLabel]           = useState("Thermite");
  const [expiryDays, setExpiryDays] = useState("30");
  const [notes, setNotes]           = useState("");
  const [environment, setEnvironment] = useState("live");
  const [saving, setSaving]         = useState(false);
  const [newCode, setNewCode]       = useState("");

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

  async function handleCreate() {
    if (!price) return;
    setSaving(true);
    const code = generateCode();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + parseInt(expiryDays));
    try {
      await setDoc(doc(db, "referralCodes", code), {
        code,
        price: `₹${price}`,
        label: label || "Thermite",
        active: true,
        environment,
        notes: notes.trim() || "",
        expiresAt: expiry,
        createdAt: serverTimestamp(),
      });
      setNewCode(code);
      setShowForm(false);
      setPrice("");
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
          <div style={S.sub}>Generate and manage pricing codes for Thermite plan</div>
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

      {/* Create form */}
      {showForm && (
        <div style={S.form}>
          <div style={S.formTitle}>New referral code</div>

          <div style={S.formRow}>
            <div style={S.formField}>
              <label style={S.lbl}>Price (₹)</label>
              <input style={S.input} value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 49" />
            </div>
            <div style={S.formField}>
              <label style={S.lbl}>Plan label</label>
              <input style={S.input} value={label} onChange={e => setLabel(e.target.value)} placeholder="Thermite" />
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

          <div style={{ ...S.formRow, marginBottom: 14 }}>
            <div style={{ ...S.formField, flex: 1 }}>
              <label style={S.lbl}>Notes (for your reference)</label>
              <input
                style={S.input}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. June 2026 — Bharath workshop students"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.createBtn} onClick={handleCreate} disabled={saving || !price}>
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
          <span style={{ flex: 0.7 }}>Price</span>
          <span style={{ flex: 0.8 }}>Env</span>
          <span style={{ flex: 1.2 }}>Expires</span>
          <span style={{ flex: 2 }}>Notes</span>
          <span style={{ flex: 0.8 }}>Status</span>
        </div>

        {codes.length === 0 && (
          <div style={S.empty}>No codes yet. Generate one above.</div>
        )}

        {codes.map(c => (
          <div key={c.id} style={S.tableRow}>
            <span style={{ ...S.codeCell, flex: 1.4 }}>{c.code}</span>
            <span style={{ flex: 0.7, fontSize: 13, color: "#0D9488", fontWeight: 700 }}>{c.price}</span>
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
        ))}
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
  cancelBtn:     { background: "#F3F2EF", color: "#555", border: "1px solid #E4E2DC", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  newCodeBanner: { background: "#E6FAF8", border: "1px solid #0D9488", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  newCodeLabel:  { fontSize: 12, color: "#0F6E56", fontWeight: 600 },
  newCode:       { fontSize: 16, fontWeight: 800, color: "#0D9488", letterSpacing: "0.12em", flex: 1 },
  copyBtn:       { background: "#0D9488", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  form:          { background: "#F9F9F7", border: "1px solid #E4E2DC", borderRadius: 12, padding: "16px", marginBottom: 16 },
  formTitle:     { fontSize: 13, fontWeight: 700, color: "#0A1628", marginBottom: 12 },
  formRow:       { display: "flex", gap: 12, marginBottom: 12 },
  formField:     { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  lbl:           { fontSize: 11, fontWeight: 600, color: "#555" },
  input:         { border: "1.5px solid #E4E2DC", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: "#0A1628", outline: "none", background: "#fff" },
  table:         { border: "1px solid #E4E2DC", borderRadius: 10, overflow: "hidden" },
  tableHeader:   { display: "flex", padding: "10px 14px", background: "#F3F2EF", borderBottom: "1px solid #E4E2DC", fontSize: 11, fontWeight: 700, color: "#888", gap: 8 },
  tableRow:      { display: "flex", padding: "12px 14px", borderBottom: "1px solid #F3F2EF", alignItems: "center", gap: 8, background: "#fff" },
  codeCell:      { fontSize: 13, fontWeight: 700, color: "#0A1628", fontFamily: "monospace", letterSpacing: "0.08em" },
  empty:         { padding: "24px", textAlign: "center", fontSize: 13, color: "#9CA3AF" },
  toggleBtn:     { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: "1px solid", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  envLive:       { background: "#E6FAF8", color: "#0F6E56", padding: "2px 7px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
  envTest:       { background: "#FFF7ED", color: "#92400E", padding: "2px 7px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
};
