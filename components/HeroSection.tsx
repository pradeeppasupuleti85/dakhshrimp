import Image from "next/image";
import Link from "next/link";

const WA_NUMBER = "919999999999"; // ← Replace with your real number

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-end overflow-hidden bg-[#02181d] pt-24 pb-14 px-6">

      {/* Background hero image */}
      <div className="absolute inset-0 opacity-15">
        <Image
          src="/images/hero/tigerpraws-hero.jpg"
          alt="Tiger Prawns"
          fill
          className="object-cover object-center"
          priority
        />
      </div>

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#02181d] via-[#02181d]/70 to-transparent" />

      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Animated wave lines */}
      <div className="absolute inset-0 overflow-hidden">
        <svg
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] opacity-[0.06]"
          viewBox="0 0 1200 300"
          preserveAspectRatio="none"
          fill="none"
        >
          <ellipse cx="600" cy="260" rx="580" ry="60" stroke="#22d3ee" strokeWidth="1">
            <animate attributeName="ry" values="60;75;60" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.4;1" dur="4s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="600" cy="260" rx="440" ry="42" stroke="#22d3ee" strokeWidth="0.8">
            <animate attributeName="ry" values="42;58;42" dur="5.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="5.5s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="600" cy="260" rx="280" ry="26" stroke="#22d3ee" strokeWidth="0.6">
            <animate attributeName="ry" values="26;40;26" dur="3.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="3.5s" repeatCount="indefinite" />
          </ellipse>
        </svg>
      </div>

      {/* Radial green glow bottom-left */}
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-cyan-900/20 blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-xl">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-[0.65rem] font-semibold uppercase tracking-[0.14em] px-3.5 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Farm to Fork · 100% Traceable · Est. 2026
        </div>

        {/* Headline */}
        <h1 className="font-black text-white leading-[1.0] mb-5" style={{ fontSize: "clamp(2.8rem, 11vw, 5rem)" }}>
          Shrimp you can
          <br />
          <span className="text-cyan-400 italic">trust completely.</span>
        </h1>

        <p className="text-white/50 text-[0.95rem] leading-relaxed max-w-sm mb-8 font-light">
          Every DAKH pack carries a QR linked to its harvest pond, lab
          results and cold chain records. From village ponds in Andhra
          Pradesh — direct to your kitchen.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="#scan"
            className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-sm px-6 py-3.5 rounded-xl transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="5" height="5" /><rect x="16" y="3" width="5" height="5" />
              <rect x="3" y="16" width="5" height="5" /><path d="M21 16h-3v3M15 21v-3h3M15 12h3v3M12 12v3h3M12 15v3M12 12h-3v-3h3" />
            </svg>
            Scan a Demo
          </Link>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=Hi%20DAKH%20Shrimp!%20I%27d%20like%20to%20order.`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border border-white/20 text-white/75 hover:border-white/50 hover:text-white text-sm font-medium px-6 py-3.5 rounded-xl transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp Order
          </a>
        </div>

        {/* Stats */}
        <div className="flex gap-8 mt-10 pt-8 border-t border-white/[0.06]">
          {[
            { n: "4+", l: "Varieties" },
            { n: "100%", l: "Lab Tested" },
            { n: "0–4°C", l: "Cold Chain" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-white font-black text-2xl leading-none">{s.n}</div>
              <div className="text-white/30 text-[0.65rem] uppercase tracking-[0.1em] mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Logo — floating right on desktop */}
      <div className="absolute right-6 bottom-16 hidden lg:block opacity-90 z-10">
        <Image
          src="/images/logos/Dakhsrimp-logo.png"
          alt="DAKH Shrimp Seafoods"
          width={220}
          height={220}
          className="object-contain drop-shadow-[0_0_60px_rgba(34,211,238,0.2)]"
        />
      </div>

    </section>
  );
}
