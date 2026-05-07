import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrustRibbon from "@/components/TrustRibbon";
import ProductCard from "@/components/ProductCard";
import QRDemo from "@/components/QRDemo";
import TraceSteps from "@/components/TraceSteps";
import FooterCTA from "@/components/FooterCTA";
import WhatsAppFloat from "@/components/WhatsAppFloat";

const WA_NUMBER = "919866059902"; // ← Replace with your real number

const PRODUCTS = [
  {
    name: "Tiger Prawns",
    teluguName: "పులి రొయ్యలు",
    description:
      "Large Black Tiger Shrimp from Nellore. Firm, sweet flavour. Export-grade. Perfect for grilling and Andhra curry.",
    price: "₹420",
    unit: "500g",
    imageSrc: "/images/products/tigerprawn.webp",
    badge: "Bestseller",
    tags: ["Penaeus monodon", "Headless Shell-on", "500g"],
    batchId: "DAKH-2024-AP-001",
    waMessage: "Hi DAKH! I want to order Tiger Prawns (500g) — ₹420.",
  },
  {
    name: "Chitti Royyalu",
    teluguName: "చిట్టి రొయ్యలు",
    description:
      "Traditional Andhra coastal village pond shrimp. Tender, mild, versatile. Cleaned & deveined.",
    price: "₹380",
    unit: "500g",
    imageSrc: "/images/products/chittiroyyalu.png",
    badge: "Premium",
    tags: ["L. vannamei", "Cleaned & Deveined", "500g"],
    batchId: "DAKH-2024-AP-002",
    waMessage: "Hi DAKH! I want to order Chitti Royyalu (500g) — ₹380.",
  },
  {
    name: "Frozen Peeled Shrimp",
    teluguName: "వలిచిన రొయ్యలు",
    description:
      "Hygienically processed, peeled & deveined. HACCP certified. Ready-to-cook for home and retail.",
    price: "₹340",
    unit: "500g",
    imageSrc: "/images/products/peeled shrimp.jpg",
    badge: "New",
    tags: ["Peeled & Deveined", "HACCP Certified", "500g"],
    batchId: "DAKH-2024-AP-003",
    waMessage: "Hi DAKH! I want to order Frozen Peeled Shrimp (500g) — ₹340.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#02181d] text-white">

      <Navbar />
      <HeroSection />
      <TrustRibbon />

      {/* ── Products ── */}
      <section id="products" className="py-20 px-6 bg-[#02181d]">
        <div className="max-w-lg mx-auto">
          <p className="text-cyan-400 text-[0.68rem] font-semibold uppercase tracking-[0.15em] mb-2">
            Fresh from the Pond
          </p>
          <h2 className="text-3xl font-black text-white mb-2">Our Products</h2>
          <p className="text-white/35 text-sm font-light mb-8">
            Farm-raised in Andhra Pradesh. Delivered fresh.
          </p>
          <div className="flex flex-col gap-5">
            {PRODUCTS.map((p) => (
              <ProductCard key={p.batchId} {...p} waNumber={WA_NUMBER} />
            ))}
          </div>
        </div>
      </section>

      <QRDemo />
      <TraceSteps />

      {/* ── About (preserved from original) ── */}
      <section id="about" className="py-20 px-6 bg-[#02181d]">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-cyan-400 text-[0.68rem] font-semibold uppercase tracking-[0.15em] mb-2">
            Our Story
          </p>
          <h2 className="text-3xl font-black text-white mb-5">About DAKH Shrimp</h2>
          <p className="text-white/45 text-sm leading-relaxed font-light">
            DAKH Shrimp focuses on transparent seafood sourcing, verified pond
            traceability, and premium shrimp retail powered by digital
            verification systems. Every pack tells the full story of your
            shrimp — from the village pond to your plate.
          </p>
        </div>
      </section>

      <FooterCTA />
      <WhatsAppFloat />

    </main>
  );
}
