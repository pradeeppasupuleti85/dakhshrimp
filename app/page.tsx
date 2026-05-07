export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#02181d] text-white">

      {/* NAVBAR */}
      <header className="fixed top-0 left-0 w-full z-50 bg-black/40 backdrop-blur-md border-b border-cyan-900/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <h1 className="text-3xl font-black text-cyan-400">
            DAKH Shrimp
          </h1>

          <nav className="flex gap-8 text-sm font-medium">
            <a href="#products" className="hover:text-cyan-400 transition">
              Products
            </a>

            <a href="#traceability" className="hover:text-cyan-400 transition">
              Traceability
            </a>

            <a href="#about" className="hover:text-cyan-400 transition">
              About
            </a>

            <a href="#contact" className="hover:text-cyan-400 transition">
              Contact
            </a>
          </nav>

        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden">

        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/images/hero/tigerpraws-hero.jpg')",
          }}
        ></div>

        <div className="absolute inset-0 bg-gradient-to-r from-[#02181d] via-[#02181ddf] to-[#02181d99]"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 w-full">

          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* LEFT CONTENT */}
            <div>

              <p className="uppercase tracking-[0.3em] text-cyan-400 text-sm mb-6">
                Future of Transparent Seafood Retail
              </p>

              <h1 className="text-6xl md:text-7xl font-black leading-none mb-8">
                Verified
                <br />
                <span className="text-cyan-400">
                  Shrimp
                </span>
              </h1>

              <p className="text-gray-300 text-xl leading-relaxed max-w-2xl mb-10">
                Premium tiger prawns and village pond shrimp with
                QR-powered transparency, cold-chain verification,
                and batch traceability.
              </p>

              <div className="flex flex-wrap gap-4">

                <button className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-8 py-4 rounded-full transition">
                  Scan Demo Batch
                </button>

                <button className="border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black px-8 py-4 rounded-full transition">
                  WhatsApp Orders
                </button>

              </div>

            </div>

            {/* RIGHT LOGO */}
            <div className="flex justify-center">

              <img
                src="/images/logos/Dakhsrimp-logo.png"
                alt="DAKH Shrimp"
                className="w-[280px] md:w-[340px] object-contain drop-shadow-[0_0_40px_rgba(0,255,255,0.25)]"
              />

            </div>

          </div>

        </div>

      </section>

      {/* WHY DAKH */}
      <section
        id="traceability"
        className="py-24 px-6 bg-[#042b33]"
      >

        <div className="max-w-6xl mx-auto">

          <h2 className="text-5xl font-black text-center mb-16">
            Why DAKH Shrimp?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">

            <div className="bg-[#063743] border border-cyan-900/40 rounded-3xl p-8">
              <h3 className="text-3xl font-bold mb-4 text-cyan-400">
                Lab Tested
              </h3>

              <p className="text-gray-300 leading-relaxed">
                Every batch verified for food safety and export-grade quality.
              </p>
            </div>

            <div className="bg-[#063743] border border-cyan-900/40 rounded-3xl p-8">
              <h3 className="text-3xl font-bold mb-4 text-cyan-400">
                Cold Chain Verified
              </h3>

              <p className="text-gray-300 leading-relaxed">
                Temperature monitored from harvest to packaging.
              </p>
            </div>

            <div className="bg-[#063743] border border-cyan-900/40 rounded-3xl p-8">
              <h3 className="text-3xl font-bold mb-4 text-cyan-400">
                QR Transparency
              </h3>

              <p className="text-gray-300 leading-relaxed">
                Customers can instantly verify pond source and batch details.
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* PRODUCTS */}
      <section
        id="products"
        className="py-24 px-6"
      >

        <div className="max-w-7xl mx-auto">

          <h2 className="text-5xl font-black text-center mb-20">
            Premium Shrimp Collection
          </h2>

          <div className="grid md:grid-cols-3 gap-10">

            {/* CARD 1 */}
            <div className="bg-[#063743] rounded-3xl overflow-hidden border border-cyan-900/30 hover:scale-[1.02] transition">

              <img
                src="/images/products/tigerprawn.webp"
                alt="Tiger Prawns"
                className="w-full h-80 object-cover"
              />

              <div className="p-8">

                <h3 className="text-4xl font-bold mb-4">
                  Tiger Prawns
                </h3>

                <p className="text-gray-300 mb-8">
                  Export-grade premium black tiger prawns.
                </p>

                <button className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-4 rounded-full transition">
                  View Verified Batch
                </button>

              </div>

            </div>

            {/* CARD 2 */}
            <div className="bg-[#063743] rounded-3xl overflow-hidden border border-cyan-900/30 hover:scale-[1.02] transition">

              <img
                src="/images/products/chittiroyyalu.png"
                alt="Chitti Royyalu"
                className="w-full h-80 object-cover"
              />

              <div className="p-8">

                <h3 className="text-4xl font-bold mb-4">
                  Chitti Royyalu
                </h3>

                <p className="text-gray-300 mb-8">
                  Traditional Andhra coastal village pond shrimp.
                </p>

                <button className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-4 rounded-full transition">
                  View Verified Batch
                </button>

              </div>

            </div>

            {/* CARD 3 */}
            <div className="bg-[#063743] rounded-3xl overflow-hidden border border-cyan-900/30 hover:scale-[1.02] transition">

              <img
                src="/images/products/peeled shrimp.jpg"
                alt="Frozen Peeled Shrimp"
                className="w-full h-80 object-cover"
              />

              <div className="p-8">

                <h3 className="text-4xl font-bold mb-4">
                  Frozen Peeled Shrimp
                </h3>

                <p className="text-gray-300 mb-8">
                  Hygienically processed frozen shrimp for retail supply.
                </p>

                <button className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-4 rounded-full transition">
                  View Verified Batch
                </button>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* ABOUT */}
      <section
        id="about"
        className="py-24 px-6 bg-[#042b33]"
      >

        <div className="max-w-5xl mx-auto text-center">

          <h2 className="text-5xl font-black mb-10">
            About DAKH Shrimp
          </h2>

          <p className="text-xl text-gray-300 leading-relaxed">
            DAKH Shrimp focuses on transparent seafood sourcing,
            verified pond traceability, and premium shrimp retail
            powered by digital verification systems.
          </p>

        </div>

      </section>

      {/* FOOTER */}
      <footer
        id="contact"
        className="border-t border-cyan-900/30 py-12 px-6"
      >

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

          <div>

            <h3 className="text-3xl font-black text-cyan-400 mb-2">
              DAKH Shrimp
            </h3>

            <p className="text-gray-400">
              Transparent seafood retail powered by traceability.
            </p>

          </div>

          <div className="flex gap-6 text-gray-300">

            <a href="#">Instagram</a>
            <a href="#">WhatsApp</a>
            <a href="#">Contact</a>

          </div>

        </div>

      </footer>

    </main>
  );
}