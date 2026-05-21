"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const TRUST_ITEMS = [
  {
    label: "Premium\nQuality",
    title: "Premium Quality",
    desc: "Carefully selected export-grade shrimp processed under controlled standards.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: "Fresh &\nHygienic",
    title: "Fresh & Hygienic",
    desc: "Maintained through rapid freezing and hygienic cold-chain handling.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
  },
  {
    label: "Sustainable\nFarming",
    title: "Sustainable Farming",
    desc: "Responsibly sourced from trusted Andhra aquaculture partners.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
    ),
  },
  {
    label: "Lab\nCertified",
    title: "Lab Certified",
    desc: "Each active batch is verified through quality and safety checks.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
  },
  {
    label: "QR\nTraceability",
    title: "QR Traceability",
    desc: "Every DAKH pack can be traced back to its batch source through QR verification.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="5" height="5" />
        <rect x="16" y="3" width="5" height="5" />
        <rect x="3" y="16" width="5" height="5" />
        <path d="M21 16h-3v3M15 21v-3h3M15 12h3v3M12 15v3" />
      </svg>
    ),
  },
];

const DELAYS = ["0s", "0.2s", "0.4s", "0.6s", "0.8s"];

export default function TrustIconsClient() {
  const [active, setActive] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Close on outside click (mobile tap-away) */
  useEffect(() => {
    if (active === null) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setActive(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [active]);

  const handleEnter = useCallback((i: number) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setActive(i);
  }, []);

  const handleLeave = useCallback(() => {
    /* Small delay so cursor can move into the card without it closing */
    leaveTimer.current = setTimeout(() => setActive(null), 180);
  }, []);

  const handleToggle = useCallback((i: number) => {
    setActive(prev => (prev === i ? null : i));
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 28 }}
    >
      {TRUST_ITEMS.map((item, i) => (
        <div
          key={i}
          style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
        >
          {/* ── Floating icon button ── */}
          <button
            onClick={() => handleToggle(i)}
            onMouseEnter={() => handleEnter(i)}
            onMouseLeave={handleLeave}
            aria-label={`Learn about ${item.title}`}
            aria-expanded={active === i}
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              border: `1.5px solid ${active === i ? "rgba(0,180,216,0.7)" : "rgba(201,168,76,0.45)"}`,
              background: active === i
                ? "rgba(0,180,216,0.18)"
                : "rgba(201,168,76,0.12)",
              color: active === i ? "#48cae4" : "#f0c94a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: active === i
                ? "0 0 24px rgba(0,180,216,0.4), 0 0 8px rgba(0,180,216,0.2)"
                : "0 0 16px rgba(201,168,76,0.15)",
              animation: "iconPulse 2s ease-in-out infinite",
              animationDelay: DELAYS[i],
              transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s, color 0.2s",
              /* Prevent the pulse from fighting the transition */
              willChange: "transform, box-shadow",
            }}
          >
            {item.icon}
          </button>

          {/* Label */}
          <span
            style={{
              color: active === i ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.72)",
              fontSize: "0.56rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              lineHeight: 1.35,
              textAlign: "center",
              maxWidth: 64,
              whiteSpace: "pre-line",
              transition: "color 0.2s",
            }}
          >
            {item.label}
          </span>

          {/* ── Explainer card ── */}
          {active === i && (
            <div
              className="trust-card-enter"
              onMouseEnter={() => handleEnter(i)}
              onMouseLeave={handleLeave}
              role="tooltip"
              style={{
                position: "absolute",
                bottom: "calc(100% + 14px)",
                left: "50%",
                transform: "translateX(-50%)",
                width: 200,
                /* Clamp to screen on small viewports */
                maxWidth: "calc(100vw - 32px)",
                zIndex: 50,
                /* Glassmorphism */
                background: "rgba(1, 20, 44, 0.82)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(0,180,216,0.35)",
                borderRadius: 14,
                padding: "14px 16px",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,180,216,0.1) inset",
                pointerEvents: "auto",
              }}
            >
              {/* Aqua top accent line */}
              <div
                style={{
                  position: "absolute",
                  top: 0, left: 16, right: 16,
                  height: 2,
                  background: "linear-gradient(90deg, transparent, #00b4d8, transparent)",
                  borderRadius: 999,
                }}
              />

              {/* Arrow pointer */}
              <div
                style={{
                  position: "absolute",
                  bottom: -7,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 12,
                  height: 7,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    background: "rgba(1, 20, 44, 0.82)",
                    border: "1px solid rgba(0,180,216,0.35)",
                    transform: "rotate(45deg) translate(-1px, -1px)",
                    borderRadius: 2,
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#48cae4",
                  marginBottom: 6,
                  letterSpacing: "0.04em",
                }}
              >
                {item.title}
              </div>
              <p
                style={{
                  fontSize: "0.72rem",
                  color: "rgba(255,255,255,0.62)",
                  lineHeight: 1.6,
                  fontWeight: 300,
                  margin: 0,
                }}
              >
                {item.desc}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
