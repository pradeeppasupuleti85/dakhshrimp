import Image from "next/image";

const WA = "919999999999";

const WA_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function FooterCTA() {
  return (
    <>
      {/* ── CTA Section ── */}
      <section
        style={{
          padding: "60px 18px",
          textAlign: "center",
          background: "linear-gradient(160deg, #023e8a, #011829)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 50% 0%, rgba(0,180,216,0.08) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <p
            style={{
              color: "rgba(0,180,216,0.5)",
              fontSize: "0.62rem",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 14,
            }}
          >
            Global Quality · Indian Price
          </p>

          <h2
            className="reveal"
            style={{
              fontFamily: "var(--font-playfair)",
              color: "white",
              fontSize: "clamp(1.9rem, 8vw, 3rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              maxWidth: 360,
              margin: "0 auto 14px",
            }}
          >
            Taste the difference{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #c9a84c, #f0c94a, #c9a84c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              trust makes.
            </span>
          </h2>

          <p
            style={{
              color: "rgba(255,255,255,0.28)",
              fontSize: "0.84rem",
              marginBottom: 28,
              lineHeight: 1.65,
            }}
          >
            Order premium DAKH Shrimp. Delivered fresh.<br />
            Every batch QR verified. Every pack traceable.
          </p>

          <a
            href={`https://wa.me/${WA}?text=Hi%20DAKH%20Shrimp%20%26%20Co!%20I%27d%20like%20to%20place%20an%20order.`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#25D366",
              color: "white",
              fontWeight: 800,
              fontSize: "1rem",
              padding: "16px 34px",
              borderRadius: 16,
              textDecoration: "none",
              boxShadow: "0 8px 28px rgba(37,211,102,0.35)",
              transition: "transform .18s",
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)")}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)")}
          >
            {WA_SVG}
            Order on WhatsApp
          </a>

          {/* Trust checks */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
              marginTop: 32,
              paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              flexWrap: "wrap",
            }}
          >
            {["FSSAI Certified", "Lab Verified", "Cold Chain", "QR Traceable"].map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "rgba(255,255,255,0.25)",
                  fontSize: "0.62rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "#010f1f", padding: "28px 18px", textAlign: "center" }}>
        <Image
          src="/images/logos/Dakhsrimp-logo.png"
          alt="DAKH Shrimp & Co."
          width={42}
          height={42}
          className="rounded-full object-contain mx-auto mb-2.5"
          style={{ opacity: 0.6 }}
        />
        <p style={{ color: "rgba(255,255,255,0.48)", fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>
          DAKH Shrimp &amp; Co.
        </p>
        <p style={{ color: "rgba(255,255,255,0.16)", fontSize: "0.62rem", marginBottom: 14 }}>
          Global Quality · Indian Price · Andhra Pradesh · Est. 2026
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 14 }}>
          {[
            ["https://www.instagram.com/dakhshrimp/", "Instagram"],
            [`https://wa.me/${WA}`, "WhatsApp"],
            ["https://dakhshrimp.com", "Website"],
          ].map(([href, label]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.7rem", textDecoration: "none", transition: "color .18s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = "#00b4d8")}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.2)")}
            >
              {label}
            </a>
          ))}
        </div>
        <p style={{ color: "rgba(255,255,255,0.07)", fontSize: "0.55rem" }}>
          A DAKH Biotech initiative · FSSAI Reg. 10013022000041
        </p>
      </footer>
    </>
  );
}
