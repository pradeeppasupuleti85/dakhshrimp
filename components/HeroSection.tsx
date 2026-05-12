import Image from "next/image";
import Link from "next/link";

const WA = "919999999999";

const VALUES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    label: "Premium Quality",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    label: "Fresh & Hygienic",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
    ),
    label: "Sustainable Farming",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    label: "Lab Certified",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="5" height="5" />
        <rect x="16" y="3" width="5" height="5" />
        <rect x="3" y="16" width="5" height="5" />
        <path d="M21 16h-3v3M15 21v-3h3M15 12h3v3M12 15v3" />
      </svg>
    ),
    label: "QR Traceability",
  },
];

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen overflow-hidden flex flex-col justify-center"
style={{ paddingTop: 110, paddingBottom: 60, paddingLeft: 20, paddingRight: 20 }}
    >
      {/* ── Background image ── */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero/Village-ShrimpPondBG.webp"
          alt="DAKH Shrimp village pond"
          fill
          className="object-cover object-center"
          priority
          style={{ filter: "brightness(0.6) saturate(1.05)" }}
        />
      </div>

      {/* ── Gradient overlays ── */}
      {/* Bottom dark for text readability */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(1,10,26,0.97) 0%, rgba(0,30,70,0.75) 38%, rgba(0,60,120,0.3) 65%, transparent 100%)" }}
      />
      {/* Left dark for text column */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(110deg, rgba(1,10,26,0.88) 0%, rgba(1,18,42,0.55) 42%, transparent 72%)" }}
      />
      {/* Aqua glow bottom-left */}
      <div
        className="absolute pointer-events-none"
        style={{ bottom: "-8%", left: "-4%", width: "55%", height: "50%", background: "radial-gradient(ellipse, rgba(0,180,216,0.14) 0%, transparent 68%)" }}
      />

      {/* ── Animated ripple rings ── */}
      <div className="absolute pointer-events-none" style={{ bottom: "7%", left: "22%" }}>
        {[3.5, 3.5, 3.5].map((dur, i) => (
          <span
            key={i}
            className="ripple-ring absolute rounded-full"
            style={{
              width: 200, height: 50,
              border: `1px solid rgba(0,180,216,${0.4 - i * 0.12})`,
              top: -25, left: -100,
              animationDuration: `${dur}s`,
              animationDelay: `${i * 1.15}s`,
            }}
          />
        ))}
      </div>

      {/* ── Shimmer lines ── */}
      {[36, 56, 72].map((pct, i) => (
        <div
          key={i}
          className="shimmer-line absolute left-0 right-0 pointer-events-none"
          style={{ top: `${pct}%`, height: 1, opacity: 0.38 - i * 0.08, animationDelay: `${i * 2}s` }}
        />
      ))}

      {/* ── Content ── */}
      <div className="relative z-10" style={{ maxWidth: 560 }}>

        {/* Farm to fork badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full mb-5"
          style={{
            border: "1px solid rgba(201,168,76,0.45)",
            background: "rgba(201,168,76,0.09)",
            color: "#f0c94a",
            fontSize: "0.62rem",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            padding: "7px 16px",
          }}
        >
          <span
            className="rounded-full"
            style={{ width: 7, height: 7, background: "#00b4d8", animation: "dotPulse 2s infinite", flexShrink: 0, display: "inline-block" }}
          />
          Farm to Fork &nbsp;·&nbsp; QR Verified &nbsp;·&nbsp; Est. 2026
        </div>

        {/* Brand name */}
        <div
          className="font-bold text-white mb-1"
          style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1rem, 3.5vw, 1.4rem)", letterSpacing: "0.06em", color: "rgba(255,255,255,0.6)" }}
        >
          DAKH Shrimp &amp; Co.
        </div>

        {/* Main headline */}
        <h1
          className="font-black text-white leading-none mb-3"
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: "clamp(2.8rem, 11vw, 5.5rem)",
            letterSpacing: "-0.025em",
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

        {/* Sub-tagline */}
        <p
          className="font-light mb-5"
          style={{
            fontFamily: "var(--font-playfair)",
            fontStyle: "italic",
            fontSize: "clamp(0.92rem, 3.2vw, 1.3rem)",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          From Andhra&apos;s Coast to Your Kitchen.
        </p>

        {/* ── Five value blocks ── */}
        <div className="flex gap-3 flex-wrap mb-5">
          {VALUES.map((v) => (
            <div
              key={v.label}
              className="flex flex-col items-center gap-1.5 text-center"
              style={{ minWidth: 62 }}
            >
              {/* Circle icon */}
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 52,
                  height: 52,
                  background: "rgba(201,168,76,0.12)",
                  border: "1.5px solid rgba(201,168,76,0.45)",
                  color: "#f0c94a",
                  boxShadow: "0 0 16px rgba(201,168,76,0.15)",
                }}
              >
                {v.icon}
              </div>
              {/* Label */}
              <span
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: "0.58rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  lineHeight: 1.3,
                  maxWidth: 64,
                }}
              >
                {v.label}
              </span>
            </div>
          ))}
        </div>

        {/* Body copy */}
        <p
          className="font-light mb-2"
          style={{ color: "rgba(255,255,255,0.42)", fontSize: "0.86rem", lineHeight: 1.75, maxWidth: 380 }}
        >
          Every pack of DAKH Shrimps carries a QR code linked to its harvest pond,
          lab certificate, and cold chain record. 
        </p>

        {/* Microcopy */}
        <p
          className="font-semibold mb-6"
          style={{ color: "#48cae4", fontSize: "0.72rem", letterSpacing: "0.12em" }}
        >
          &ldquo;Scan Freshness. Taste Trust.&rdquo;
        </p>

        {/* CTAs */}
        <div className="flex gap-2.5 flex-wrap mb-7">
          {/* Gold glow button */}
          <a
            href="#products"
            className="relative overflow-hidden inline-flex items-center gap-2 font-black rounded-xl transition-transform hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #c9a84c, #f0c94a)",
              color: "#012a4a",
              fontSize: "0.9rem",
              padding: "13px 22px",
              animation: "goldGlow 2.5s ease infinite",
            }}
          >
            🎣 Explore the Catch
          </a>
          <a
            href={`https://wa.me/${WA}?text=Hi%20DAKH%20Shrimp!`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-semibold rounded-xl transition-all"
            style={{
              background: "rgba(37,211,102,0.14)",
              border: "1px solid rgba(37,211,102,0.4)",
              color: "#25D366",
              fontSize: "0.9rem",
              padding: "13px 18px",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
          <a
            href="#trace"
            className="inline-flex items-center gap-2 font-medium rounded-xl transition-all"
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.55)",
              fontSize: "0.9rem",
              padding: "13px 18px",
            }}
          >
            🔍 Trace
          </a>
        </div>

        {/* Stats */}
        <div
          className="flex gap-7"
          style={{ paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          {[
            { n: "3", l: "Varieties" },
            { n: "100%", l: "QR Verified" },
            { n: "AP", l: "Origin" },
            { n: "0–4°C", l: "Cold Chain" },
          ].map((s) => (
            <div key={s.l}>
              <div
                className="font-black text-white leading-none"
                style={{ fontFamily: "var(--font-playfair)", fontSize: "1.5rem" }}
              >
                {s.n}
              </div>
              <div
                style={{ color: "rgba(255,255,255,0.26)", fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 4 }}
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
