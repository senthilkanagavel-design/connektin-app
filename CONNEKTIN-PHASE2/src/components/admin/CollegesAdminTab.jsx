// src/components/admin/CollegesAdminTab.jsx
//
// Admin CRUD for college tenants, following the exact same pattern as the
// (inline, in Admin.jsx) CompaniesAdminTab: create a doc → generate an
// invites/{token} doc → shareable /invite/:token link → InvitePage.jsx
// activates it. Here the invite carries collegeId/collegeRole instead of
// companyId, and the FIRST invite for a college is always the Principal
// (collegeRole: "principal") — Lecturer invites are generated afterward,
// per-college, once the Principal's account (or an admin) needs to add staff.
import { useState, useEffect } from "react";
import {
  collection, doc, addDoc, setDoc,
  onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase/config";

const T = {
  navy: "#0A1628", teal: "#0D9488", white: "#FFFFFF", border: "#E4E2DC",
  text: "#1A1A1A", muted: "#6B7280", faint: "#9CA3AF", danger: "#DC2626",
  font: "'DM Sans', sans-serif",
};

function generateToken() {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

function fmtDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CollegesAdminTab() {
  const [colleges, setColleges]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [logoFile, setLogoFile]   = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch]       = useState("");
  const [inviteModal, setInviteModal] = useState(null); // { name, email, inviteLink }
  const [copied, setCopied]       = useState(false);
  const [lecturerFor, setLecturerFor] = useState(null); // college being invited a lecturer for
  const [lecturerEmail, setLecturerEmail] = useState("");
  const [invitingLecturer, setInvitingLecturer] = useState(false);
  const [lecturerError, setLecturerError] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "colleges"), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setColleges(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  function resetForm() { setName(""); setEmail(""); setLogoFile(null); setLogoPreview(null); setFormError(""); }
  function closeForm() { resetForm(); setShowForm(false); }

  async function saveCollege() {
    if (!name.trim()) { setFormError("College name is required."); return; }
    if (!EMAIL_RE.test(email.trim())) { setFormError("Enter a valid email address for the Principal."); return; }
    setFormError("");
    setSaving(true);
    try {
      let logoURL = "";
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const storageRef = ref(storage, `colleges/${Date.now()}.${ext}`);
        await uploadBytes(storageRef, logoFile);
        logoURL = await getDownloadURL(storageRef);
      }
      const token = generateToken();
      const inviteLink = `${window.location.origin}/invite/${token}`;
      const collegeRef = await addDoc(collection(db, "colleges"), {
        name: name.trim(),
        email: email.trim(),
        logoURL,
        status: "invited",
        principalUid: null,
        studentCount: 0,
        lecturerCount: 0,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "invites", token), {
        collegeId: collegeRef.id,
        collegeRole: "principal",
        name: name.trim(),
        email: email.trim(),
        logoURL: logoURL || "",
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setInviteModal({ name: name.trim(), email: email.trim(), inviteLink });
      closeForm();
    } catch (err) {
      console.error(err);
      setFormError(
        err?.code === "storage/unauthorized"
          ? "Couldn't upload the logo — storage permissions aren't set up for this yet. Try again without a logo, or ask your admin to check Storage rules."
          : "Couldn't save this college. Please try again."
      );
    }
    finally { setSaving(false); }
  }

  function copyLink(link) {
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  async function inviteLecturer() {
    if (!EMAIL_RE.test(lecturerEmail.trim())) { setLecturerError("Enter a valid email address."); return; }
    setLecturerError("");
    setInvitingLecturer(true);
    try {
      const token = generateToken();
      const inviteLink = `${window.location.origin}/invite/${token}`;
      await setDoc(doc(db, "invites", token), {
        collegeId: lecturerFor.id,
        collegeRole: "lecturer",
        name: lecturerFor.name,
        email: lecturerEmail.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setLecturerFor(null);
      setLecturerEmail("");
      setInviteModal({ name: `${lecturerFor.name} — Lecturer`, email: lecturerEmail.trim(), inviteLink });
    } catch (err) {
      console.error(err);
      setLecturerError("Couldn't generate this invite. Please try again.");
    }
    finally { setInvitingLecturer(false); }
  }

  const qq = search.trim().toLowerCase();
  const visible = colleges.filter(c =>
    !qq || (c.name || "").toLowerCase().includes(qq) || (c.email || "").toLowerCase().includes(qq)
  );

  const inpStyle = { padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ padding: 16, fontFamily: T.font }}>
      {/* Invite link modal */}
      {inviteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: T.white, borderRadius: 16, padding: "28px 24px", maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 8 }}>Invite ready</div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>
              Share this invite link with <strong style={{ color: T.text }}>{inviteModal.name}</strong> ({inviteModal.email}). Once they click it, they'll set a password and land on their dashboard.
            </div>
            <div style={{ background: "#F0F4F8", border: `1px solid ${T.border}`, borderRadius: 9, padding: "10px 12px", fontSize: 11, color: "#185FA5", wordBreak: "break-all", textAlign: "left", marginBottom: 14 }}>
              {inviteModal.inviteLink}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => copyLink(inviteModal.inviteLink)} style={{ flex: 1, padding: "10px 0", background: T.white, color: copied ? "#065F46" : T.muted, border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 13, cursor: "pointer", fontFamily: T.font, fontWeight: 600 }}>
                {copied ? "Copied ✓" : "Copy link"}
              </button>
              <button onClick={() => setInviteModal(null)} style={{ flex: 1, padding: "10px 0", background: T.teal, color: T.white, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Lecturer modal */}
      {lecturerFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: T.white, borderRadius: 16, padding: "24px", maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Invite a Lecturer</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>for {lecturerFor.name}</div>
            <input value={lecturerEmail} onChange={e => setLecturerEmail(e.target.value)} placeholder="Lecturer's email" type="email" style={{ ...inpStyle, marginBottom: lecturerError ? 8 : 14 }} autoFocus />
            {lecturerError && <div style={{ fontSize: 12, color: T.danger, marginBottom: 14 }}>⚠ {lecturerError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setLecturerFor(null); setLecturerEmail(""); setLecturerError(""); }} style={{ flex: 1, padding: "10px 0", background: T.white, color: T.muted, border: `1.5px solid ${T.border}`, borderRadius: 9, fontSize: 13, cursor: "pointer", fontFamily: T.font }}>Cancel</button>
              <button onClick={inviteLecturer} disabled={invitingLecturer || !lecturerEmail.trim()} style={{ flex: 1, padding: "10px 0", background: T.teal, color: T.white, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.font, opacity: (invitingLecturer || !lecturerEmail.trim()) ? 0.6 : 1 }}>
                {invitingLecturer ? "Sending…" : "Generate invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>Colleges ({colleges.length})</div>
          <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>Onboard a college, invite its Principal, then Lecturers</div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: T.teal, color: T.white, border: "none", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>
          + Add College
        </button>
      </div>

      {showForm && (
        <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: "18px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>Add a college</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="College name *" style={inpStyle} />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Principal's contact email * (invite will be sent here)" type="email" style={inpStyle} />
            <div onClick={() => document.getElementById("college-logo-upload").click()} style={{ border: `2px dashed ${T.border}`, borderRadius: 9, padding: 12, cursor: "pointer", textAlign: "center", background: "#FAFAFA", display: "flex", alignItems: "center", gap: 12 }}>
              {logoPreview ? (
                <img src={logoPreview} alt="logo" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8 }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 8, background: T.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{"🎓"}</div>
              )}
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{logoPreview ? "Logo selected ✓" : "Upload college logo"}</div>
                <div style={{ fontSize: 11, color: T.faint }}>PNG, JPG · Max 2MB · optional</div>
              </div>
              <input id="college-logo-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (!f) return; setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }} />
            </div>
            {formError && <div style={{ fontSize: 12, color: T.danger, background: "#FEE2E2", borderRadius: 8, padding: "8px 12px" }}>⚠ {formError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveCollege} disabled={saving || !name.trim() || !email.trim()} style={{ flex: 1, padding: "10px 0", background: T.teal, color: T.white, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.font, opacity: (saving || !name.trim() || !email.trim()) ? 0.6 : 1 }}>
                {saving ? "Saving…" : "Save & generate Principal invite"}
              </button>
              <button onClick={closeForm} style={{ padding: "10px 16px", background: T.white, color: T.muted, border: `1.5px solid ${T.border}`, borderRadius: 9, fontSize: 13, cursor: "pointer", fontFamily: T.font }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "relative", marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by college name or email" style={inpStyle} />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: T.faint }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: T.faint }}>🎓 No colleges match</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map(c => {
            const isActive = c.status === "active";
            return (
              <div key={c.id} style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, padding: "13px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "#F3F2EF", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c.logoURL
                      ? <img src={c.logoURL} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      : <span style={{ fontSize: 18, fontWeight: 800, color: T.navy }}>{(c.name || "C")[0].toUpperCase()}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: isActive ? "#D1FAE5" : "#FEF3C7", color: isActive ? "#065F46" : "#854F0B" }}>
                        {isActive ? "Active" : "Invite sent"}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: T.teal, margin: "1px 0 3px" }}>{c.email}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>
                      {c.studentCount || 0} student{(c.studentCount || 0) === 1 ? "" : "s"} · {c.lecturerCount || 0} lecturer{(c.lecturerCount || 0) === 1 ? "" : "s"} · Added {fmtDate(c.createdAt)}
                    </div>
                  </div>
                  {isActive && (
                    <button onClick={() => { setLecturerFor(c); setLecturerEmail(""); setLecturerError(""); }} style={{ padding: "6px 11px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.white, color: T.muted, fontSize: 12, cursor: "pointer", fontFamily: T.font, flexShrink: 0 }}>
                      + Lecturer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
