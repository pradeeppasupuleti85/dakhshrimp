import Image from "next/image";

const WA_NUMBER = "919999999999"; // ← Replace with your real number

export default function FooterCTA() {
  return (
    <>
      {/* CTA section */}
      <section className="bg-[#063743] py-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#02181d]/60 pointer-events-none" />
        <div className="relative z-10 max-w-md mx-auto">
          <h2 className="text-3xl font-black text-white mb-3 leading-tight">
            Taste the difference<br />
            <em className="text-cyan-400 not-italic opacity-80">trust makes.</em>
          </h2>
          <p className="text-white/40 text-sm font-light mb-6 leading-relaxed">
            Order fresh DAKH Shrimp. Delivered to Hyderabad.<br />
            From traditional village ponds — direct to your kitchen.
          </p>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=Hi%20DAKH%20Shrimp!%20I%27d%20like%20to%20place%20an%20order.%20Please%20share%20your%20latest%20availability.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20b858] text-white font-bold text-base px-7 py-4 rounded-xl transition shadow-lg shadow-green-900/30"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Order on WhatsApp
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#02181d] border-t border-cyan-900/20 py-8 px-6">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <Image
              src="/images/logos/Dakhsrimp-logo.png"
              alt="DAKH Shrimp"
              width={28}
              height={28}
              className="rounded-full object-contain opacity-70"
            />
            <span className="text-white/60 font-bold text-sm">DAKH Shrimp Seafoods</span>
          </div>
          <p className="text-white/25 text-xs">
            Premium Seafood from Traditional Village Ponds · Andhra Pradesh · Est. 2026
          </p>
          <div className="flex gap-5 text-white/30 text-xs">
            <a
              href="https://www.instagram.com/dakhshrimp/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 transition"
            >
              Instagram
            </a>
            <a
              href={`https://wa.me/${WA_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 transition"
            >
              WhatsApp
            </a>
            <a href="#about" className="hover:text-cyan-400 transition">
              About
            </a>
          </div>
          <p className="text-white/15 text-[0.65rem]">
            © 2026 DAKH Foods · FSSAI Registered · All batches lab certified
          </p>
        </div>
      </footer>
    </>
  );
}
