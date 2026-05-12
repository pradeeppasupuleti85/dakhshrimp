import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrustRibbon from "@/components/TrustRibbon";
import ProductCard from "@/components/ProductCard";
import TraceSteps from "@/components/TraceSteps";
import FooterCTA from "@/components/FooterCTA";
import WhatsAppFloat from "@/components/WhatsAppFloat";

const WA_NUMBER = "919999999999"; // ← replace with your real WhatsApp number

const PRODUCTS = [
  {
    name: "Chitti Royyalu",
    teluguName: "చిట్టి రొయ్యలు",
    description:
      "Traditional Andhra village pond shrimp. Tender, flavourful, perfect for everyday Andhra cooking. Harvested from Bhimavaram's brackish ponds.",
    badge: "Daily Cooking Favourite",
    countPerKg: "35–45 pieces per kg",
    imageSrc: "/images/products/chittiroyyalu.png",
    imageAlt: "Chitti Royyalu - Andhra village pond shrimp",
    weights: [
      { weight: "600g", price: 360, count: "20–27 pcs" },
      { weight: "1kg",  price: 600, count: "35–45 pcs" },
    ],
    batchId: "CR-240801-A",
    source: "Bhimavaram",
    accentColor: "emerald" as const,
  },
  {
    name: "Normal Shrimp",
    teluguName: "వనామీ రొయ్యలు",
    description:
      "Clean, versatile Pacific White Shrimp. Export-grade quality, mild flavour, ideal for grilling, fry and curries. From Ganapavaram ponds.",
    badge: "Most Popular",
    countPerKg: "20–30 count per kg",
    imageSrc: "/images/products/peeled shrimp.jpg",
    imageAlt: "Normal Shrimp - Vannamei white shrimp",
    weights: [
      { weight: "600g", price: 600,  count: "12–18 pcs" },
      { weight: "1kg",  price: 1000, count: "20–30 pcs" },
    ],
    batchId: "NS-240801-A",
    source: "Ganapavaram",
    accentColor: "aqua" as const,
  },
  {
    name: "Tiger Shrimp",
    teluguName: "పులి రొయ్యలు",
    description:
      "Jumbo Black Tiger Prawns. Firm, rich, export-grade. 8–10 pieces per kg. Sourced from Kavali's sea inlet ponds on the Andhra coast.",
    badge: "Premium Jumbo",
    countPerKg: "8–10 pieces per kg",
    imageSrc: "/images/products/tigerprawn.webp",
    imageAlt: "Tiger Shrimp - Premium Black Tiger Prawn",
    weights: [
      { weight: "600g", price: 1080, count: "5–6 pcs" },
      { weight: "1kg",  price: 1800, count: "8–10 pcs" },
    ],
    batchId: "TS-240801-A",
    source: "Kavali",
    accentColor: "gold" as const,
  },
];

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", background: "#dff0fa", color: "#012a4a", overflowX: "hidden" }}>

      <Navbar />
      <HeroSection />
      <TrustRibbon />

      {/* ── Products ── */}
      <section
        id="products"
        style={{
          padding: "60px 18px",
          background: "linear-gradient(180deg, #cce8f6 0%, #dff0fa 100%)",
          position: "relative",
        }}
      >
        {/* Subtle glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 50% 0%, rgba(0,180,216,0.06) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 480, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <p
            style={{
              color: "#0096c7",
              fontSize: "0.64rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 6,
            }}
          >
            Explore the Catch 🎣
          </p>
          <h2
            className="reveal"
            style={{
              fontFamily: "var(--font-playfair)",
              fontSize: "clamp(1.7rem, 6vw, 2.5rem)",
              fontWeight: 800,
              color: "#012a4a",
              marginBottom: 6,
            }}
          >
            Fresh. Verified. Yours.
          </h2>
          <p style={{ color: "#0096c7", fontSize: "0.8rem", opacity: 0.65, marginBottom: 36 }}>
            Pick your pack — price updates instantly.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {PRODUCTS.map((p) => (
              <ProductCard key={p.batchId} {...p} waNumber={WA_NUMBER} />
            ))}
          </div>
        </div>
      </section>

      <TraceSteps />

      {/* ── About ── */}
      <section
        id="about"
        style={{
          padding: "60px 18px",
          background: "linear-gradient(135deg, #c8e6f4, #dff0fa)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 440, margin: "0 auto" }}>
          <p
            style={{
              color: "#0096c7",
              fontSize: "0.64rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 6,
            }}
          >
            Our Story
          </p>
          <h2
            className="reveal"
            style={{
              fontFamily: "var(--font-playfair)",
              fontSize: "clamp(1.7rem, 6vw, 2.4rem)",
              fontWeight: 800,
              color: "#012a4a",
              marginBottom: 16,
            }}
          >
            About DAKH Shrimp &amp; Co.
          </h2>
          <p
            style={{
              color: "#4a5568",
              fontSize: "0.86rem",
              lineHeight: 1.85,
              fontWeight: 300,
            }}
          >
            DAKH Shrimp &amp; Co. is India&apos;s premium transparent seafood brand —
            built on the belief that every customer deserves to know exactly
            where their food comes from. We source from traditional village ponds
            across Andhra Pradesh, lab-test every batch, and attach a QR code to
            every pack. From Andhra&apos;s coast to your kitchen —
            traceable, trusted, premium.
          </p>
          <p
            style={{
              color: "#0096c7",
              fontSize: "0.66rem",
              fontStyle: "italic",
              marginTop: 14,
              opacity: 0.5,
            }}
          >
            A DAKH Biotech initiative
          </p>

          <div
            style={{
              marginTop: 32,
              paddingTop: 28,
              borderTop: "1px solid rgba(0,150,200,0.15)",
              display: "flex",
              justifyContent: "center",
              gap: 40,
            }}
          >
            {[
              { n: "3", l: "Shrimp Varieties" },
              { n: "100%", l: "QR Verified" },
              { n: "AP", l: "Andhra Origin" },
            ].map((s) => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "var(--font-playfair)",
                    color: "#012a4a",
                    fontSize: "2rem",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    color: "rgba(1,42,74,0.35)",
                    fontSize: "0.6rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
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

      <FooterCTA />
      <WhatsAppFloat />

      {/* ── Scroll reveal script ── */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var io = new IntersectionObserver(function(entries){
                entries.forEach(function(e){ if(e.isIntersecting) e.target.classList.add('in'); });
              }, { threshold: 0.06 });
              document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
            })();
          `,
        }}
      />
    </main>
  );
}
