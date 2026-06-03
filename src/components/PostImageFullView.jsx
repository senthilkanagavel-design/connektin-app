// src/components/PostImageFullView.jsx
// Full-screen post image viewer modal
// Usage: <PostImageFullView src={imageURL} onClose={() => setShowImageView(false)} />

import { useEffect } from "react";

export default function PostImageFullView({ src, onClose }) {
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
        background: "rgba(0, 0, 0, 0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "postImgFadeIn 0.18s ease",
      }}
    >
      <style>{`
        @keyframes postImgFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes postImgScaleIn {
          from { transform: scale(0.92); opacity: 0; }
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

      {/* Image */}
      <img
        src={src}
        alt="Post image"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "96vw",
          maxHeight: "92vh",
          objectFit: "contain",
          borderRadius: 8,
          boxShadow: "0 8px 48px rgba(0,0,0,0.7)",
          animation: "postImgScaleIn 0.2s ease",
          display: "block",
        }}
      />

      {/* Tap outside hint */}
      <div style={{
        position: "fixed",
        bottom: 24,
        color: "rgba(255,255,255,0.3)",
        fontSize: 12,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: 0.3,
        pointerEvents: "none",
      }}>
        Tap anywhere to close
      </div>
    </div>
  );
}
