import Image from "next/image";

const WA_NUMBER = "919999999999";

export default function FooterCTA() {
  return (
    <>
      {/* CTA */}
      <section className="relative overflow-hidden py-20 px-6 text-center"
        style={{ background: "linear-gradient(160deg, #042b1f 0%, #020f12 100%)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.07) 0%, transparent 65%)" }} />

        <div className="relative z-10 max-w-md mx-auto">
          <p className="text-cyan-400/50 text-[0.65rem] uppercase tracking-[0.18em] mb-4">
            From Andhra Coast to Your Kitchen
          </p>
          <h2
            className="text-white font-black leading-tight mb-4"
            style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(1.9rem, 8vw, 3rem)" }}
          >
            Taste the difference<br />
            <span className="text-cyan-400/80 italic">trust makes.</span>
          </h2>
          <p className="text-white/30 text-sm font-light mb-8 leading-relaxed">
            Order premium DAKSH Shrimps. Delivered fresh.<br />
            Every pack QR verified. Every batch lab certified.
          </p>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=Hi%20DAKSH%20Shrimps%20%26%20Co!%20I%27d%20like%20to%20place%20an%20order.%20Please%20share%20your%20availability.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#1fb856] text-white font-bold text-[0.95rem] px-8 py-4 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-green-900/30"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Order on WhatsApp
          </a>

          <div className="flex items-center justify-center gap-6 mt-10 pt-8 border-t border-white/[0.06]">
            {["FSSAI Certified", "Lab Verified", "Cold Chain"].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-white/25 text-[0.62rem] uppercase tracking-wider">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#020f12] border-t border-white/[0.05] py-10 px-6">
        <div className="max-w-lg mx-auto">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex items-center gap-3">
              <Image
                src="/images/logos/Dakhsrimp-logo.png"
                alt="DAKSH Shrimps & Co."
                width={36}
                height={36}
                className="rounded-full object-contain opacity-70"
              />
              <div>
                <div className="text-white/70 font-bold text-sm tracking-wide">DAKSH Shrimps & Co.</div>
                <div className="text-white/20 text-[0.6rem] tracking-wider">Premium Indian Seafood</div>
              </div>
            </div>

            <p className="text-white/20 text-[0.68rem] leading-relaxed max-w-xs">
              Farm-to-fork transparency powered by QR traceability.<br />
              Traditional village ponds · Andhra Pradesh · Est. 2026
            </p>

            <div className="flex gap-5 text-white/20 text-xs">
              <a href="https://www.instagram.com/dakhshrimp/" target="_blank" rel="noopener noreferrer"
                className="hover:text-cyan-400 transition">Instagram</a>
              <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer"
                className="hover:text-cyan-400 transition">WhatsApp</a>
              <a href="#about" className="hover:text-cyan-400 transition">About</a>
            </div>

            {/* DAKH Biotech — subtle */}
            <p className="text-white/[0.12] text-[0.58rem] tracking-[0.1em] mt-2">
              A DAKH Biotech initiative · FSSAI Reg. 10013022000041
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
