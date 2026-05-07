"use client";
// /app/login/page.tsx — StarsQ Unified Login
// ─────────────────────────────────────────────────────────────────────────────
// Sets starsq_session cookie on successful authentication.
// Redirects to ?from= param, or /filmlab if no param present.
// Credentials match Signal's existing demo gate:
//   producer@starsq.com / signal2024
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const DEMO_EMAIL = "producer@starsq.com";
const DEMO_PASS  = "signal2024";
const SESSION_COOKIE = "starsq_session";

// Cookie helper — expires in 8 hours (a working session)
function setSessionCookie(email: string) {
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(email)}; path=/; expires=${expires}; SameSite=Lax`;
}

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const returnTo     = searchParams.get("from") ?? "/filmlab";

  const [email, setEmail]     = useState("");
  const [pass, setPass]       = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => emailRef.current?.focus(), 400);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Simulate async validation
    await new Promise((r) => setTimeout(r, 600));

    const validEmail = email.trim().toLowerCase();
    const validPass  = pass.trim();

    if (validEmail === DEMO_EMAIL && validPass === DEMO_PASS) {
      setSessionCookie(email.trim());
      router.replace(returnTo);
    } else {
      setError("Invalid credentials. Check email and password.");
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0B0F17;
          font-family: 'Space Mono', monospace;
          color: #E2E8F0;
          min-height: 100vh;
        }

        @keyframes drift {
          0%   { transform: translate(0, 0) rotate(0deg); }
          33%  { transform: translate(30px, -20px) rotate(120deg); }
          66%  { transform: translate(-20px, 30px) rotate(240deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }

        @keyframes scanline {
          0%   { top: -4px; opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }

        .login-card {
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .submit-btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 40px rgba(0,229,255,0.35), 0 8px 24px rgba(0,0,0,0.5);
        }
        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #111826 inset !important;
          -webkit-text-fill-color: #E2E8F0 !important;
          border-color: rgba(0,229,255,0.3) !important;
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#0B0F17",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Ambient orbs */}
        <div style={{
          position: "fixed", top: "15%", left: "10%",
          width: 500, height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)",
          animation: "drift 18s ease-in-out infinite",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "fixed", bottom: "10%", right: "8%",
          width: 400, height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)",
          animation: "drift 24s ease-in-out infinite reverse",
          pointerEvents: "none",
        }} />

        {/* Scanline */}
        <div style={{
          position: "fixed", left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.15), transparent)",
          animation: "scanline 8s linear infinite",
          pointerEvents: "none",
          zIndex: 1,
        }} />

        {/* Grid overlay */}
        <div style={{
          position: "fixed", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }} />

        {/* Login card */}
        <div
          className="login-card"
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            maxWidth: 420,
            margin: "0 24px",
            background: "#111826",
            border: "1px solid rgba(0,229,255,0.12)",
            borderRadius: 16,
            padding: "44px 40px",
            boxShadow: "0 0 80px rgba(0,229,255,0.05), 0 32px 64px rgba(0,0,0,0.6)",
          }}
        >
          {/* Top accent line */}
          <div style={{
            position: "absolute",
            top: 0, left: "15%", right: "15%",
            height: 2,
            borderRadius: "0 0 2px 2px",
            background: "linear-gradient(90deg, transparent, #00E5FF, #7C3AED, transparent)",
            animation: "glow-pulse 3s ease-in-out infinite",
          }} />

          {/* Logo mark */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 36,
          }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: 8,
              background: "linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(124,58,237,0.15) 100%)",
              border: "1px solid rgba(0,229,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {/* Film frame icon */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="1" width="16" height="16" rx="2" stroke="url(#g)" strokeWidth="1.5"/>
                <rect x="3" y="3" width="4" height="3" rx="0.5" fill="rgba(0,229,255,0.4)"/>
                <rect x="11" y="3" width="4" height="3" rx="0.5" fill="rgba(0,229,255,0.4)"/>
                <rect x="3" y="12" width="4" height="3" rx="0.5" fill="rgba(0,229,255,0.4)"/>
                <rect x="11" y="12" width="4" height="3" rx="0.5" fill="rgba(0,229,255,0.4)"/>
                <rect x="7" y="6" width="4" height="6" rx="1" fill="rgba(124,58,237,0.5)"/>
                <defs>
                  <linearGradient id="g" x1="1" y1="1" x2="17" y2="17" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#00E5FF"/>
                    <stop offset="1" stopColor="#7C3AED"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <div style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.3px",
                background: "linear-gradient(90deg, #00E5FF, #7C3AED)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                StarsQ
              </div>
              <div style={{
                fontSize: 9,
                color: "rgba(226,232,240,0.3)",
                textTransform: "uppercase",
                letterSpacing: "2px",
                marginTop: 1,
              }}>
                Restricted Access
              </div>
            </div>
          </div>

          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 26,
            fontWeight: 800,
            color: "#E2E8F0",
            letterSpacing: "-0.5px",
            marginBottom: 6,
          }}>
            FilmLab
          </h1>
          <p style={{
            fontSize: 11,
            color: "rgba(226,232,240,0.35)",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: 32,
          }}>
            Pre-Production Capital Simulator
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{
                fontSize: 9,
                color: "rgba(226,232,240,0.35)",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
              }}>
                Email
              </label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  padding: "11px 14px",
                  fontSize: 13,
                  color: "#E2E8F0",
                  fontFamily: "'Space Mono', monospace",
                  outline: "none",
                  transition: "border-color 0.15s",
                  width: "100%",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{
                fontSize: 9,
                color: "rgba(226,232,240,0.35)",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
              }}>
                Password
              </label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  padding: "11px 14px",
                  fontSize: 13,
                  color: "#E2E8F0",
                  fontFamily: "'Space Mono', monospace",
                  outline: "none",
                  transition: "border-color 0.15s",
                  width: "100%",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            {error && (
              <div style={{
                fontSize: 11,
                color: "#FF4D4D",
                background: "rgba(255,77,77,0.08)",
                border: "1px solid rgba(255,77,77,0.2)",
                borderRadius: 6,
                padding: "8px 12px",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="submit-btn"
              style={{
                marginTop: 6,
                padding: "13px 0",
                borderRadius: 8,
                border: "none",
                background: loading
                  ? "rgba(255,255,255,0.06)"
                  : "linear-gradient(90deg, #00E5FF, #7C3AED)",
                color: loading ? "rgba(255,255,255,0.3)" : "#ffffff",
                fontFamily: "'Syne', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "1px",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                width: "100%",
              }}
            >
              {loading ? "Authenticating..." : "Enter FilmLab"}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            margin: "28px 0 20px",
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          }} />

        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
