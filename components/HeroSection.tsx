import Image from "next/image";
import Link from "next/link";

const WA = "919999999999";

const VALUES = [
  {
    label: "Premium\nQuality",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: "Fresh &\nHygienic",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
  },
  {
    label: "Sustainable\nFarming",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
    ),
  },
  {
    label: "Lab\nCertified",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
  },
  {
    label: "QR\nTraceability",
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
      }}
    >
      {/* Background image */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Image
          src="/images/hero/Village-ShrimpPondBG.webp"
          alt="DAKH Shrimp village pond"
          fill
          className="object-cover object-center"
          priority
          style={{ filter: "brightness(0.58) saturate(1.05)" }}
        />
      </div>

      {/* Gradient overlays */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(1,10,26,0.97) 0%, rgba(0,30,70,0.78) 38%, rgba(0,60,120,0.3) 65%, transparent 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(110deg, rgba(1,10,26,0.9) 0%, rgba(1,18,42,0.58) 42%, transparent 72%)",
        }}
      />

      {/* Aqua glow */}
      <div
        style={{
          position: "absolute",
          bottom: "-8%",
          left: "-4%",
          width: "55%",
          height: "50%",
          background:
            "radial-gradient(ellipse, rgba(0,180,216,0.14) 0%, transparent 68%)",
          pointerEvents: "none",
        }}
      />

      {/* Shimmer lines */}
      {[36, 56, 72].map((pct, i) => (
        <div
          key={i}
          className="shimmer-line"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${pct}%`,
            height: 1,
            opacity: 0.35 - i * 0.08,
            animationDelay: `${i * 2}s`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* ── Content ── */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 600 }}>

        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid rgba(201,168,76,0.45)",
            background: "rgba(201,168,76,0.09)",
            color: "#f0c94a",
            fontSize: "0.62rem",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            padding: "7px 16px",
            borderRadius: 999,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#00b4d8",
              animation: "dotPulse 2s infinite",
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          Farm to Fork &nbsp;·&nbsp; QR Verified &nbsp;·&nbsp; Est. 2026
        </div>

        {/* Brand name */}
        <div
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: "clamp(0.9rem, 3vw, 1.3rem)",
            fontWeight: 700,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.06em",
            marginBottom: 8,
          }}
        >
          DAKH Shrimp &amp; Co.
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: "clamp(2.8rem, 10vw, 5.5rem)",
            fontWeight: 900,
            color: "white",
            lineHeight: 1.0,
            letterSpacing: "-0.025em",
            marginBottom: 10,
          }}
        >
          Global Quality.
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #c9a84c, #f0c94a, #c9a84c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Indian Price.
          </span>
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontFamily: "var(--font-playfair)",
            fontStyle: "italic",
            fontSize: "clamp(0.9rem, 3vw, 1.25rem)",
            color: "rgba(255,255,255,0.4)",
            marginBottom: 28,
          }}
        >
          From Andhra&apos;s Coast to Your Kitchen.
        </p>

        {/* 5 Value icons */}
        <div
          style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          {VALUES.map((v, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                minWidth: 56,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(201,168,76,0.12)",
                  border: "1.5px solid rgba(201,168,76,0.45)",
                  color: "#f0c94a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 16px rgba(201,168,76,0.15)",
                  animation: "iconPulse 2s ease-in-out infinite",
                  animationDelay: DELAYS[i],
                }}
              >
                {v.icon}
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.72)",
                  fontSize: "0.56rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  lineHeight: 1.35,
                  textAlign: "center",
                  maxWidth: 64,
                  whiteSpace: "pre-line",
                }}
              >
                {v.label}
              </span>
            </div>
          ))}
        </div>

        {/* Body copy */}
        <p
          style={{
            color: "rgba(255,255,255,0.42)",
            fontSize: "0.86rem",
            lineHeight: 1.85,
            maxWidth: 400,
            marginBottom: 10,
            fontWeight: 300,
          }}
        >
          Every pack of DAKH Shrimps carries a QR code linked to its harvest
          pond, lab certificate, and cold chain record. From Andhra&apos;s
          coast to your kitchen.
        </p>

        {/* Microcopy */}
        <p
          style={{
            color: "#48cae4",
            fontSize: "0.72rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            marginBottom: 28,
          }}
        >
          &ldquo;Scan Freshness. Taste Trust.&rdquo;
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
          <a
            href="#products"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #c9a84c, #f0c94a)",
              color: "#012a4a",
              fontWeight: 900,
              fontSize: "0.9rem",
              padding: "13px 22px",
              borderRadius: 14,
              textDecoration: "none",
              animation: "goldGlow 2.5s ease infinite",
            }}
          >
            🎣 Explore the Catch
          </a>

          <a
            href={`https://wa.me/${WA}?text=Hi%20DAKH%20Shrimp!`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(37,211,102,0.14)",
              border: "1px solid rgba(37,211,102,0.4)",
              color: "#25D366",
              fontWeight: 600,
              fontSize: "0.9rem",
              padding: "13px 18px",
              borderRadius: 14,
              textDecoration: "none",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>

          <a
            href="#trace"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.55)",
              fontWeight: 500,
              fontSize: "0.9rem",
              padding: "13px 18px",
              borderRadius: 14,
              textDecoration: "none",
            }}
          >
            🔍 Trace
          </a>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 32,
            paddingTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {[
            { n: "3", l: "Varieties" },
            { n: "100%", l: "QR Verified" },
            { n: "AP", l: "Origin" },
            { n: "0–4°C", l: "Cold Chain" },
          ].map((s) => (
            <div key={s.l}>
              <div
                style={{
                  fontFamily: "var(--font-playfair)",
                  color: "white",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.26)",
                  fontSize: "0.55rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginTop: 4,
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
