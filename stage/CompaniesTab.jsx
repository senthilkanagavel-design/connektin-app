// src/pages/tabs/CompaniesTab.jsx
import { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

function ExternalLinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

export default function CompaniesTab() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  if (loading) {
    return (
      <div style={s.center}>
        <div style={s.spinner} />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyIcon}>🏢</div>
        <div style={s.emptyTitle}>Companies coming soon</div>
        <div style={s.emptySub}>Our partner companies will appear here. Check back soon!</div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.headerRow}>
        <span style={s.headerLabel}>Our Partner Companies</span>
        <span style={s.headerCount}>{companies.length} listed</span>
      </div>
      <div style={s.grid}>
        {companies.map(company => (
          <div key={company.id} style={s.card}>
            {/* Logo */}
            <div style={s.logoWrap}>
              {company.logoURL ? (
                <img src={company.logoURL} alt={company.name} style={s.logoImg} />
              ) : (
                <div style={s.logoFallback}>
                  {(company.name || "C")[0].toUpperCase()}
                </div>
              )}
            </div>
            {/* Name */}
            <div style={s.companyName}>{company.name}</div>
            {/* Tagline */}
            {company.tagline && (
              <div style={s.tagline}>{company.tagline}</div>
            )}
            {/* Visit button */}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                style={s.visitBtn}
              >
                Visit <ExternalLinkIcon />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  wrap:         { padding: "14px 16px 80px" },
  headerRow:    { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerLabel:  { fontSize: 11, fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "DM Sans, sans-serif" },
  headerCount:  { fontSize: 11, color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" },
  grid:         { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  card:         { background: "#fff", borderRadius: 14, border: "0.5px solid #E4E2DC", padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" },
  logoWrap:     { width: 52, height: 52, borderRadius: 12, overflow: "hidden", background: "#F3F2EF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  logoImg:      { width: "100%", height: "100%", objectFit: "contain" },
  logoFallback: { width: 52, height: 52, borderRadius: 12, background: "#0A1628", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 700, fontFamily: "DM Sans, sans-serif" },
  companyName:  { fontSize: 13, fontWeight: 600, color: "#0A1628", fontFamily: "DM Sans, sans-serif", lineHeight: 1.3 },
  tagline:      { fontSize: 11, color: "#9CA3AF", fontFamily: "DM Sans, sans-serif", lineHeight: 1.4 },
  visitBtn:     { display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#0D9488", textDecoration: "none", background: "#E6FAF8", padding: "5px 12px", borderRadius: 20, marginTop: 2, fontFamily: "DM Sans, sans-serif" },
  center:       { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 },
  spinner:      { width: 24, height: 24, border: "3px solid #E4E2DC", borderTop: "3px solid #0D9488", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  empty:        { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" },
  emptyIcon:    { fontSize: 40, marginBottom: 12 },
  emptyTitle:   { fontSize: 16, fontWeight: 700, color: "#0A1628", fontFamily: "DM Sans, sans-serif", marginBottom: 6 },
  emptySub:     { fontSize: 13, color: "#9CA3AF", fontFamily: "DM Sans, sans-serif", lineHeight: 1.5 },
};
