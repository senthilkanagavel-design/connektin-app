// src/components/AvatarFullView.jsx
// Full-screen profile picture viewer modal
// Usage: <AvatarFullView src={photoURL} name={displayName} onClose={() => setShowFullView(false)} />

import { useEffect } from "react";

export default function AvatarFullView({ src, name, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.88)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        animation: "avatarFadeIn 0.18s ease",
      }}
    >
      <style>{`
        @keyframes avatarFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes avatarScaleIn {
          from { transform: scale(0.88); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          top: 18,
          right: 18,
          background: "rgba(255,255,255,0.12)",
          border: "none",
          borderRadius: "50%",
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
          fontSize: 20,
          lineHeight: 1,
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 10000,
        }}
        aria-label="Close"
      >
        ✕
      </button>

      {/* Photo */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: "avatarScaleIn 0.2s ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <img
          src={src}
          alt={name || "Profile photo"}
          style={{
            width: "min(82vw, 320px)",
            height: "min(82vw, 320px)",
            borderRadius: "50%",
            objectFit: "cover",
            border: "3px solid rgba(255,255,255,0.18)",
            boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
            display: "block",
          }}
        />
        {name && (
          <div style={{
            color: "#fff",
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: 0.2,
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}>
            {name}
          </div>
        )}
      </div>

      {/* Tap outside hint */}
      <div style={{
        position: "fixed",
        bottom: 24,
        color: "rgba(255,255,255,0.35)",
        fontSize: 12,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: 0.3,
      }}>
        Tap anywhere to close
      </div>
    </div>
  );
}
