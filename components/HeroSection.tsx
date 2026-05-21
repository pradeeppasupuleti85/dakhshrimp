import Image from "next/image";
import TrustIconsClient from "@/components/TrustIconsClient";

const WA = "919999999999";

/* ──────────────────────────────────────────────────────────────────
   Decorative water sparkle positions (x%, y%, delay, size)
   Pure CSS — no JS, no extra requests.
   ────────────────────────────────────────────────────────────────── */
const SPARKLES = [
  [62, 58, "0.5s",  4],
  [71, 65, "1.8s",  3],
  [55, 72, "3.2s",  5],
  [78, 60, "2.1s",  3],
  [48, 68, "4.0s",  4],
  [83, 73, "1.2s",  3],
  [67, 80, "2.7s",  4],
];

/* Water light rays — horizontal stripes that drift upward */
const RAYS = [
  { top: "62%", delay: "0s",   dur: "7s",  width: "18%", opacity: 0.10 },
  { top: "68%", delay: "2.5s", dur: "9s",  width: "12%", opacity: 0.08 },
  { top: "74%", delay: "4.8s", dur: "11s", width: "22%", opacity: 0.07 },
  { top: "59%", delay: "1.4s", dur: "8s",  width: "10%", opacity: 0.09 },
];

export default function HeroSection() {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "100svh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingTop: 110,
        paddingBottom: 60,
        paddingLeft: 20,
        paddingRight: 20,
        backgroundColor: "#010e20", /* prevents flash while image loads */
      }}
    >
      {/* ── Background image — NO CSS filter (LCP optimised) ── */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Image
          src="/images/hero/Village-ShrimpPondBG.webp"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          quality={80}
          className="object-cover object-center"
          aria-hidden="true"
        />

        {/* Dark overlays replace CSS filter brightness() */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.38)" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(1,10,26,0.97) 0%, rgba(0,30,70,0.78) 38%, rgba(0,60,120,0.3) 65%, transparent 100%)" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(110deg, rgba(1,10,26,0.90) 0%, rgba(1,18,42,0.60) 42%, transparent 72%)" }} />
      </div>

      {/* ════════════════════════════════════════════════════
          AMBIENT MOTION LAYER — all pure CSS, GPU-only
          transform + opacity only, zero layout impact
          ════════════════════════════════════════════════════ */}

      {/* Morning mist — two slow drifting radial gradients */}
      <div
        aria-hidden="true"
        className="hero-mist-1"
        style={{
          position: "absolute",
          top: "10%", left: "-10%",
          width: "70%", height: "55%",
          background: "radial-gradient(ellipse, rgba(180,230,255,0.14) 0%, transparent 65%)",
          pointerEvents: "none",
          borderRadius: "50%",
        }}
      />
      <div
        aria-hidden="true"
        className="hero-mist-2"
        style={{
          position: "absolute",
          top: "30%", right: "-8%",
          width: "55%", height: "45%",
          background: "radial-gradient(ellipse, rgba(0,180,216,0.10) 0%, transparent 68%)",
          pointerEvents: "none",
          borderRadius: "50%",
        }}
      />

      {/* Water surface light rays */}
      {RAYS.map((r, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="water-ray"
          style={{
            position: "absolute",
            top: r.top,
            left: `${20 + i * 15}%`,
            width: r.width,
            height: 2,
            background: "linear-gradient(90deg, transparent, rgba(150,220,255,0.6), transparent)",
            borderRadius: 999,
            animationDuration: r.dur,
            animationDelay: r.delay,
            opacity: r.opacity,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Water sparkle glints */}
      {SPARKLES.map(([x, y, delay, size], i) => (
        <div
          key={i}
          aria-hidden="true"
          className="water-sparkle"
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            width: size as number,
            height: size as number,
            borderRadius: "50%",
            background: "rgba(200,240,255,0.9)",
            boxShadow: "0 0 6px rgba(150,220,255,0.8)",
            animationDelay: delay as string,
            animationDuration: `${2.4 + (i * 0.7) % 2}s`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Water ripple rings (lower-centre, like pond surface) */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", bottom: "8%", left: "52%", pointerEvents: "none" }}
      >
        {[
          { dur: "3.8s", delay: "0s",    opacity: 0.45 },
          { dur: "3.8s", delay: "1.25s", opacity: 0.30 },
          { dur: "3.8s", delay: "2.50s", opacity: 0.18 },
        ].map((r, i) => (
          <span
            key={i}
            className="ripple-ring"
            style={{
              position: "absolute",
              width: 180,
              height: 46,
              borderRadius: "50%",
              border: `1px solid rgba(0,180,216,${r.opacity})`,
              top: -23,
              left: -90,
              animationDuration: r.dur,
              animationDelay: r.delay,
            }}
          />
        ))}
      </div>

      {/* Shimmer lines */}
      {[36, 55, 71].map((pct, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="shimmer-line"
          style={{
            position: "absolute",
            left: 0, right: 0,
            top: `${pct}%`,
            height: 1,
            opacity: 0.34 - i * 0.08,
            animationDelay: `${i * 2}s`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Paddle wheel — lower right, subtle decorative */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "6%",
          right: "5%",
          width: 60,
          height: 60,
          opacity: 0.18,
          pointerEvents: "none",
        }}
      >
        <svg
          viewBox="0 0 60 60"
          className="paddle-spin"
          style={{ width: "100%", height: "100%" }}
        >
          <circle cx="30" cy="30" r="5" fill="#48cae4" />
          {/* 6 blades */}
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <rect
              key={angle}
              x="28" y="8"
              width="4" height="16"
              rx="2"
              fill="#48cae4"
              transform={`rotate(${angle} 30 30)`}
            />
          ))}
        </svg>
      </div>

      {/* Shrimp leap — lower centre, occasional */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "9%",
          left: "46%",
          width: 28,
          height: 18,
          opacity: 0,          /* animation handles opacity */
          pointerEvents: "none",
        }}
      >
        <svg
          viewBox="0 0 28 18"
          className="shrimp-leap"
          style={{ width: "100%", height: "100%", filter: "drop-shadow(0 0 4px rgba(0,180,216,0.6))" }}
        >
          {/* Simple shrimp silhouette path */}
          <path
            d="M2 14 C4 8, 10 4, 16 5 C22 6, 26 10, 24 14 C22 17, 18 18, 14 16 C10 14, 8 16, 6 16 Z"
            fill="#48cae4"
            opacity="0.85"
          />
          {/* Tail */}
          <path d="M2 14 C0 12, 0 10, 2 9" stroke="#48cae4" strokeWidth="1.5" fill="none" />
          {/* Antenna */}
          <path d="M22 7 L26 3 M20 6 L23 2" stroke="#48cae4" strokeWidth="1" fill="none" opacity="0.7" />
          {/* Legs */}
          {[12, 15, 18].map((x) => (
            <path key={x} d={`M${x} 14 L${x - 2} 17`} stroke="#48cae4" strokeWidth="0.8" fill="none" opacity="0.6" />
          ))}
        </svg>
      </div>

      {/* Aqua bottom glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "-8%", left: "-4%",
          width: "55%", height: "50%",
          background: "radial-gradient(ellipse, rgba(0,180,216,0.14) 0%, transparent 68%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Hero Content ── */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 560 }}>

        {/* Farm to fork badge */}
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            border: "1px solid rgba(201,168,76,0.45)",
            background: "rgba(201,168,76,0.09)",
            color: "#f0c94a",
            fontSize: "0.62rem", fontWeight: 700,
            letterSpacing: "0.16em", textTransform: "uppercase",
            padding: "7px 16px", borderRadius: 999, marginBottom: 20,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00b4d8", animation: "dotPulse 2s infinite", flexShrink: 0, display: "inline-block" }} />
          Farm to Fork &nbsp;·&nbsp; QR Verified &nbsp;·&nbsp; Est. 2026
        </div>

        {/* Brand name */}
        <div style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(0.9rem, 3vw, 1.3rem)", fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em", marginBottom: 8 }}>
          DAKH Shrimp &amp; Co.
        </div>

        {/* Headline */}
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(2.8rem, 10vw, 5.5rem)", fontWeight: 900, color: "white", lineHeight: 1.0, letterSpacing: "-0.025em", marginBottom: 10 }}>
          Global Quality.
          <br />
          <span style={{ background: "linear-gradient(135deg, #c9a84c, #f0c94a, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Indian Price.
          </span>
        </h1>

        {/* Tagline */}
        <p style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic", fontSize: "clamp(0.9rem, 3vw, 1.25rem)", color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>
          From Andhra&apos;s Coast to Your Kitchen.
        </p>

        {/* ── Interactive Trust Icons (client component) ── */}
        <TrustIconsClient />

        {/* Body copy */}
        <p style={{ color: "rgba(255,255,255,0.42)", fontSize: "0.86rem", lineHeight: 1.85, maxWidth: 400, marginBottom: 10, fontWeight: 300 }}>
          Every pack of DAKH Shrimps carries a QR code linked to its harvest
          pond, lab certificate, and cold chain record. From Andhra&apos;s coast to your kitchen.
        </p>

        {/* Microcopy */}
        <p style={{ color: "#48cae4", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.12em", marginBottom: 28 }}>
          &ldquo;Scan Freshness. Taste Trust.&rdquo;
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
          <a
            href="#products"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #c9a84c, #f0c94a)", color: "#012a4a", fontWeight: 900, fontSize: "0.9rem", padding: "13px 22px", borderRadius: 14, textDecoration: "none", animation: "goldGlow 2.5s ease infinite" }}
          >
            🎣 Explore the Catch
          </a>
          <a
            href={`https://wa.me/${WA}?text=Hi%20DAKH%20Shrimp!`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(37,211,102,0.14)", border: "1px solid rgba(37,211,102,0.4)", color: "#25D366", fontWeight: 600, fontSize: "0.9rem", padding: "13px 18px", borderRadius: 14, textDecoration: "none" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
          <a
            href="#trace"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.55)", fontWeight: 500, fontSize: "0.9rem", padding: "13px 18px", borderRadius: 14, textDecoration: "none" }}
          >
            🔍 Trace
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 32, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {[{ n: "3", l: "Varieties" }, { n: "100%", l: "QR Verified" }, { n: "AP", l: "Origin" }, { n: "0–4°C", l: "Cold Chain" }].map((s) => (
            <div key={s.l}>
              <div style={{ fontFamily: "var(--font-playfair)", color: "white", fontSize: "1.5rem", fontWeight: 800, lineHeight: 1 }}>
                {s.n}
              </div>
              <div style={{ color: "rgba(255,255,255,0.26)", fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 4 }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
