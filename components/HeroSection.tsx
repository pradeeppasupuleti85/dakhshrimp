import Image from "next/image";
import TrustIconsClient from "@/components/TrustIconsClient";

const WA = "919999999999";

/* ─────────────────────────────────────────────────────────────────
   PADDLE WHEEL AERATOR
   Authentic silhouette of Andhra aquaculture paddle-wheel aerators.
   Each has: pontoon float, support frame, axle shaft, 8-blade wheel,
   bilateral water spray, and elliptical pond ripples below.
   ───────────────────────────────────────────────────────────────── */
type AeratorProps = {
  speedClass: string;
  opacity: number;
  scale: number;
};

function PaddleWheelAerator({ speedClass, opacity, scale }: AeratorProps) {
  /* Spray particle definitions: position around wheel hub, delay, direction */
  const sprayParticles = [
    { cx: -18, cy: -4, delay: "0s",    dur: "1.1s", cls: "spray-l", r: 2.5 },
    { cx: -12, cy: -8, delay: "0.28s", dur: "1.1s", cls: "spray-l", r: 2   },
    { cx: -22, cy:  0, delay: "0.55s", dur: "1.1s", cls: "spray-l", r: 1.8 },
    { cx:  18, cy: -4, delay: "0.14s", dur: "1.1s", cls: "spray-r", r: 2.5 },
    { cx:  12, cy: -8, delay: "0.42s", dur: "1.1s", cls: "spray-r", r: 2   },
    { cx:  22, cy:  0, delay: "0.68s", dur: "1.1s", cls: "spray-r", r: 1.8 },
  ];

  const paddleAngles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div
      style={{
        position: "absolute",
        width: 110,
        height: 80,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center bottom",
        pointerEvents: "none",
      }}
    >
      {/* ── SVG silhouette ── */}
      <svg
        viewBox="0 0 110 80"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
        aria-hidden="true"
      >
        {/* Pontoon / float body — sits at waterline */}
        <ellipse cx="55" cy="66" rx="38" ry="7"
          fill="#48cae4" opacity="0.22" />
        <ellipse cx="55" cy="64" rx="36" ry="5"
          fill="none" stroke="#48cae4" strokeWidth="1" opacity="0.35" />

        {/* Left support leg */}
        <line x1="22" y1="62" x2="28" y2="40"
          stroke="#48cae4" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
        {/* Right support leg */}
        <line x1="88" y1="62" x2="82" y2="40"
          stroke="#48cae4" strokeWidth="2" opacity="0.5" strokeLinecap="round" />

        {/* Horizontal axle shaft */}
        <line x1="24" y1="40" x2="86" y2="40"
          stroke="#48cae4" strokeWidth="3" opacity="0.6" strokeLinecap="round" />

        {/* Motor / gearbox housing above centre */}
        <rect x="46" y="30" width="18" height="14" rx="4"
          fill="#48cae4" opacity="0.35" />
        <rect x="50" y="26" width="10" height="6" rx="2"
          fill="#48cae4" opacity="0.25" />

        {/* ── Rotating paddle wheel centred on shaft ── */}
        <g transform="translate(55, 40)">
          <g className={speedClass}>
            {/* Central hub */}
            <circle cx="0" cy="0" r="5" fill="#48cae4" opacity="0.8" />

            {/* 8 rectangular paddle blades */}
            {paddleAngles.map((angle) => (
              <rect
                key={angle}
                x="-3.5" y="-24"
                width="7" height="17"
                rx="2"
                fill="#48cae4"
                opacity="0.7"
                transform={`rotate(${angle})`}
              />
            ))}

            {/* Spoke lines for realism */}
            {paddleAngles.map((angle) => (
              <line
                key={`s-${angle}`}
                x1="0" y1="0" x2="0" y2="-24"
                stroke="#48cae4"
                strokeWidth="1"
                opacity="0.3"
                transform={`rotate(${angle})`}
              />
            ))}
          </g>
        </g>

        {/* ── Bilateral spray foam particles ── */}
        {sprayParticles.map((p, i) => (
          <circle
            key={i}
            cx={55 + p.cx}
            cy={40 + p.cy}
            r={p.r}
            fill="rgba(180,235,255,0.85)"
            className={p.cls}
            style={{
              animationDelay: p.delay,
              animationDuration: p.dur,
            }}
          />
        ))}

        {/* White foam patch at water surface (static glow) */}
        <ellipse cx="55" cy="60" rx="20" ry="4"
          fill="rgba(200,240,255,0.12)" />
      </svg>

      {/* ── Pond ripples below the aerator (elliptical) ── */}
      {[
        { dur: "2.8s", delay: "0s",    w: 70, h: 20, top: 65 },
        { dur: "2.8s", delay: "0.95s", w: 70, h: 20, top: 65 },
        { dur: "2.8s", delay: "1.90s", w: 70, h: 20, top: 65 },
      ].map((r, i) => (
        <div
          key={i}
          className="pond-ripple"
          style={{
            position: "absolute",
            left: "50%",
            top: r.top,
            marginLeft: -(r.w / 2),
            marginTop: -(r.h / 2),
            width: r.w,
            height: r.h,
            borderRadius: "50%",
            border: "1px solid rgba(0,190,220,0.55)",
            animationDuration: r.dur,
            animationDelay: r.delay,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SHRIMP WATER INTERACTION
   Rare (18 s cycle), cinematic arc, natural parabola, splash rings.
   ───────────────────────────────────────────────────────────────── */
function ShrimpMoment({ left, top, delay }: { left: string; top: string; delay: string }) {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", left, top, pointerEvents: "none" }}
    >
      {/* Shrimp — real image, white bg removed, tinted cyan to match theme */}
      {/* Place /public/shrimp.webp in your Next.js project root */}
      <img
        src="/shrimp.webp"
        width={80}
        height={80}
        className="shrimp-arc"
        style={{
          animationDelay: delay,
          filter:
            "drop-shadow(0 0 6px rgba(0,180,216,0.65))" +
            " sepia(1) saturate(3) hue-rotate(155deg) brightness(1.1)",
          willChange: "transform, opacity",
          display: "block",
        }}
        alt=""
        aria-hidden="true"
      />

      {/* Splash rings — triggered at re-entry (~93% of 18s ≈ 16.7s) */}
      {[
        { w: 28, h: 8, dur: "1.1s", delay: `calc(${delay} + 16.7s)`, opacity: 0.7 },
        { w: 44, h: 12, dur: "1.5s", delay: `calc(${delay} + 16.9s)`, opacity: 0.45 },
      ].map((ring, i) => (
        <div
          key={i}
          className="pond-ripple"
          style={{
            position: "absolute",
            left: 44,   /* approximate splash x position */
            top: 4,
            marginLeft: -(ring.w / 2),
            marginTop: -(ring.h / 2),
            width: ring.w,
            height: ring.h,
            borderRadius: "50%",
            border: `1px solid rgba(0,190,220,${ring.opacity})`,
            animationDuration: ring.dur,
            animationDelay: ring.delay,
            animationIterationCount: "infinite",
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   WATER CAUSTIC RAYS — light shimmering on pond surface
   ───────────────────────────────────────────────────────────────── */
const CAUSTICS = [
  { top: "59%", left: "42%", w: "16%", dur: "9s",  delay: "0s",   opacity: 0.10 },
  { top: "65%", left: "50%", w: "11%", dur: "12s", delay: "2.8s", opacity: 0.08 },
  { top: "71%", left: "60%", w: "19%", dur: "8s",  delay: "5.2s", opacity: 0.09 },
  { top: "62%", left: "35%", w: "9%",  dur: "11s", delay: "1.5s", opacity: 0.07 },
];

/* Water surface glint positions */
const GLINTS = [
  [60, 58, "0.4s",  3.5],
  [68, 63, "1.7s",  2.8],
  [54, 70, "3.0s",  4.0],
  [76, 61, "2.2s",  2.5],
  [47, 67, "4.1s",  3.2],
  [82, 72, "1.1s",  2.8],
  [65, 75, "2.6s",  3.5],
  [71, 58, "0.9s",  2.2],
];

/* ─────────────────────────────────────────────────────────────────
   HERO SECTION
   ───────────────────────────────────────────────────────────────── */
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
        backgroundColor: "#010e20",
      }}
    >
      {/* ── Background image — NO CSS filter on Image (preserves LCP) ── */}
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
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.36)" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(1,10,26,0.97) 0%, rgba(0,30,70,0.75) 38%, rgba(0,60,120,0.28) 65%, transparent 100%)" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(110deg, rgba(1,10,26,0.88) 0%, rgba(1,18,42,0.55) 44%, transparent 72%)" }} />
      </div>

      {/* ════════════════════════════════════════════════════
          AQUACULTURE POND AMBIENT LAYER
          Positioned to align with the actual pond in the image
          (centre-right, lower 40% of hero)
          ════════════════════════════════════════════════════ */}

      {/* Morning mist — atmospheric depth */}
      <div aria-hidden="true" className="pond-mist-a"
        style={{ position: "absolute", top: "8%", left: "-8%", width: "65%", height: "50%",
          background: "radial-gradient(ellipse, rgba(170,220,255,0.13) 0%, transparent 65%)",
          borderRadius: "50%", pointerEvents: "none" }} />
      <div aria-hidden="true" className="pond-mist-b"
        style={{ position: "absolute", top: "32%", right: "-6%", width: "52%", height: "42%",
          background: "radial-gradient(ellipse, rgba(0,180,216,0.09) 0%, transparent 68%)",
          borderRadius: "50%", pointerEvents: "none" }} />

      {/* Water caustic light rays — shimmer on pond surface */}
      {CAUSTICS.map((c, i) => (
        <div key={i} aria-hidden="true" className="caustic-ray"
          style={{
            position: "absolute", top: c.top, left: c.left,
            width: c.w, height: 2,
            background: "linear-gradient(90deg, transparent, rgba(160,230,255,0.65), transparent)",
            borderRadius: 999,
            animationDuration: c.dur,
            animationDelay: c.delay,
            opacity: c.opacity,
            pointerEvents: "none",
          }} />
      ))}

      {/* Water surface glints */}
      {GLINTS.map(([x, y, delay, size], i) => (
        <div key={i} aria-hidden="true" className="water-glint"
          style={{
            position: "absolute",
            left: `${x}%`, top: `${y}%`,
            width: size as number, height: size as number,
            borderRadius: "50%",
            background: "rgba(210,245,255,0.92)",
            boxShadow: "0 0 7px rgba(160,230,255,0.8)",
            animationDelay: delay as string,
            animationDuration: `${2.2 + (i * 0.65) % 2.4}s`,
            pointerEvents: "none",
          }} />
      ))}

      {/* Shimmer lines — soft surface light */}
      {[37, 54, 70].map((pct, i) => (
        <div key={i} aria-hidden="true" className="shimmer-line"
          style={{
            position: "absolute", left: 0, right: 0, top: `${pct}%`,
            height: 1,
            opacity: 0.30 - i * 0.07,
            animationDelay: `${i * 2.2}s`,
            pointerEvents: "none",
          }} />
      ))}

      {/* ── PADDLE-WHEEL AERATORS ──────────────────────────────────
          Three aerators mirroring the real machinery visible in the
          background pond image (right-centre region of frame).
          Different scales create fore/mid/background depth.
          ─────────────────────────────────────────────────────────── */}

      {/* Foreground aerator — largest, most visible */}
      <div aria-hidden="true"
        style={{ position: "absolute", left: "68%", top: "54%", pointerEvents: "none" }}>
        <PaddleWheelAerator
          speedClass="paddle-wheel-fast"
          opacity={0.32}
          scale={1.0}
        />
      </div>

      {/* Mid-ground aerator — slightly smaller, more distant */}
      <div aria-hidden="true"
        style={{ position: "absolute", left: "55%", top: "50%", pointerEvents: "none" }}>
        <PaddleWheelAerator
          speedClass="paddle-wheel-medium"
          opacity={0.20}
          scale={0.72}
        />
      </div>

      {/* Background aerator — smallest, most distant */}
      <div aria-hidden="true"
        style={{ position: "absolute", left: "80%", top: "48%", pointerEvents: "none" }}>
        <PaddleWheelAerator
          speedClass="paddle-wheel-slow"
          opacity={0.13}
          scale={0.52}
        />
      </div>

      {/* ── SHRIMP WATER INTERACTIONS ──────────────────────────────
          Two shrimp moments at different positions and timings.
          Rare, cinematic, natural — not looping decorations.
          ─────────────────────────────────────────────────────────── */}

      {/* Primary shrimp — in the open pond water */}
      <ShrimpMoment left="46%" top="64%" delay="0s" />

      {/* Secondary shrimp — slightly different position and offset */}
      <ShrimpMoment left="58%" top="68%" delay="9s" />

      {/* Aqua atmosphere glow — bottom left */}
      <div aria-hidden="true"
        style={{
          position: "absolute", bottom: "-8%", left: "-4%",
          width: "55%", height: "50%",
          background: "radial-gradient(ellipse, rgba(0,180,216,0.13) 0%, transparent 68%)",
          pointerEvents: "none",
        }} />

      {/* ════════════════════════════════════════════════════
          HERO CONTENT
          ════════════════════════════════════════════════════ */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 560 }}>

        {/* Farm-to-fork badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          border: "1px solid rgba(201,168,76,0.45)",
          background: "rgba(201,168,76,0.09)",
          color: "#f0c94a",
          fontSize: "0.62rem", fontWeight: 700,
          letterSpacing: "0.16em", textTransform: "uppercase",
          padding: "7px 16px", borderRadius: 999, marginBottom: 20,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#00b4d8",
            animation: "dotPulse 2s infinite",
            flexShrink: 0, display: "inline-block",
          }} />
          Farm to Fork &nbsp;·&nbsp; QR Verified &nbsp;·&nbsp; Est. 2026
        </div>

        {/* Brand name */}
        <div style={{
          fontFamily: "var(--font-playfair)",
          fontSize: "clamp(0.9rem, 3vw, 1.3rem)",
          fontWeight: 700,
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}>
          DAKH Shrimp &amp; Co.
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "var(--font-playfair)",
          fontSize: "clamp(2.8rem, 10vw, 5.5rem)",
          fontWeight: 900, color: "white",
          lineHeight: 1.0, letterSpacing: "-0.025em",
          marginBottom: 10,
        }}>
          Global Quality.
          <br />
          <span style={{
            background: "linear-gradient(135deg, #c9a84c, #f0c94a, #c9a84c)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Indian Price.
          </span>
        </h1>

        {/* Sub-tagline */}
        <p style={{
          fontFamily: "var(--font-playfair)",
          fontStyle: "italic",
          fontSize: "clamp(0.9rem, 3vw, 1.25rem)",
          color: "rgba(255,255,255,0.4)",
          marginBottom: 28,
        }}>
          From Andhra&apos;s Coast to Your Kitchen.
        </p>

        {/* Interactive trust icons (client component) */}
        <TrustIconsClient />

        {/* Body copy */}
        <p style={{
          color: "rgba(255,255,255,0.42)",
          fontSize: "0.86rem", lineHeight: 1.85,
          maxWidth: 400, marginBottom: 10, fontWeight: 300,
        }}>
          Every pack of DAKH Shrimps carries a QR code linked to its harvest
          pond, lab certificate, and cold chain record. From Andhra&apos;s
          coast to your kitchen.
        </p>

        {/* Microcopy */}
        <p style={{
          color: "#48cae4",
          fontSize: "0.72rem", fontWeight: 600,
          letterSpacing: "0.12em", marginBottom: 28,
        }}>
          &ldquo;Scan Freshness. Taste Trust.&rdquo;
        </p>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
          <a href="#products" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, #c9a84c, #f0c94a)",
            color: "#012a4a", fontWeight: 900, fontSize: "0.9rem",
            padding: "13px 22px", borderRadius: 14, textDecoration: "none",
            animation: "goldGlow 2.5s ease infinite",
          }}>
            🎣 Explore the Catch
          </a>
          <a
            href={`https://wa.me/${WA}?text=Hi%20DAKH%20Shrimp!`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(37,211,102,0.14)",
              border: "1px solid rgba(37,211,102,0.4)",
              color: "#25D366", fontWeight: 600, fontSize: "0.9rem",
              padding: "13px 18px", borderRadius: 14, textDecoration: "none",
            }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
          <a href="#trace" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.55)",
            fontWeight: 500, fontSize: "0.9rem",
            padding: "13px 18px", borderRadius: 14, textDecoration: "none",
          }}>
            🔍 Trace
          </a>
        </div>

        {/* Stats strip */}
        <div style={{
          display: "flex", gap: 32,
          paddingTop: 20,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}>
          {[
            { n: "3",    l: "Varieties"  },
            { n: "100%", l: "QR Verified" },
            { n: "AP",   l: "Origin"      },
            { n: "0–4°C",l: "Cold Chain"  },
          ].map((s) => (
            <div key={s.l}>
              <div style={{
                fontFamily: "var(--font-playfair)",
                color: "white", fontSize: "1.5rem",
                fontWeight: 800, lineHeight: 1,
              }}>
                {s.n}
              </div>
              <div style={{
                color: "rgba(255,255,255,0.26)",
                fontSize: "0.55rem",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginTop: 4,
              }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
