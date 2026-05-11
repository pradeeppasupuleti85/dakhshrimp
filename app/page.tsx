import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrustRibbon from "@/components/TrustRibbon";
import ProductCard from "@/components/ProductCard";
import TraceSteps from "@/components/TraceSteps";
import FooterCTA from "@/components/FooterCTA";
import WhatsAppFloat from "@/components/WhatsAppFloat";

const WA_NUMBER = "919999999999"; // ← Replace with your real WhatsApp number

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
    <main className="min-h-screen bg-[#020f12] text-white overflow-x-hidden">

      <Navbar />
      <HeroSection />
      <TrustRibbon />

      {/* ── Products ── */}
      <section id="products" className="py-20 px-5 bg-[#020f12] relative">
        {/* Section glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.03) 0%, transparent 60%)" }} />

        <div className="max-w-lg mx-auto relative z-10">
          <p className="text-cyan-400 text-[0.65rem] font-semibold uppercase tracking-[0.18em] mb-2">
            Fresh from the Pond
          </p>
          <h2
            className="text-white font-black mb-2 tracking-tight"
            style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}
          >
            Our Products
          </h2>
          <p className="text-white/30 text-sm font-light mb-10 leading-relaxed">
            Select your pack size. Price updates instantly.
          </p>

          <div className="flex flex-col gap-6">
            {PRODUCTS.map((p) => (
              <ProductCard key={p.batchId} {...p} waNumber={WA_NUMBER} />
            ))}
          </div>
        </div>
      </section>

      <TraceSteps />

      {/* ── About ── */}
      <section id="about" className="py-20 px-6 bg-[#030d10]">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-cyan-400/50 text-[0.65rem] font-semibold uppercase tracking-[0.18em] mb-3">
            Our Story
          </p>
          <h2
            className="text-white font-black mb-6 tracking-tight"
            style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}
          >
            About DAKH Shrimps & Co.
          </h2>
          <p className="text-white/35 text-sm leading-[1.85] font-light">
            DAKH Shrimps & Co. is India's premium transparent seafood brand —
            built on the belief that every customer deserves to know exactly
            where their food comes from. We source from traditional village ponds
            across Andhra Pradesh, lab-test every batch, and attach a QR code to
            every pack. From Andhra's coast to your kitchen — traceable,
            trusted, premium.
          </p>
          <div className="mt-8 pt-8 border-t border-white/[0.05] flex justify-center gap-10">
            {[
              { n: "3", l: "Shrimp Varieties" },
              { n: "100%", l: "QR Verified" },
              { n: "AP", l: "Andhra Origin" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-white/80 font-black text-2xl"
                  style={{ fontFamily: "'Georgia', serif" }}>{s.n}</div>
                <div className="text-white/20 text-[0.6rem] uppercase tracking-[0.1em] mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FooterCTA />
      <WhatsAppFloat />

    </main>
  );
}
