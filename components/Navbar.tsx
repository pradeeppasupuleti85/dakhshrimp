"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

const WA_NUMBER = "919999999999";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg transition-all duration-500">
      <div
        className={`
          flex items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500
          ${scrolled
            ? "bg-black/85 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/60"
            : "bg-black/50 backdrop-blur-xl border border-white/[0.06]"}
        `}
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10">
            <Image
              src="/images/logos/Dakhsrimp-logo.png"
              alt="DAKH Shrimps & Co."
              fill
              className="object-contain"
            />
          </div>
          <div className="leading-none">
            <div className="text-white text-xs font-bold tracking-wide">DAKH Shrimps</div>
            <div className="text-white/30 text-[0.6rem] tracking-[0.12em] uppercase">&amp; Co.</div>
          </div>
        </Link>

        {/* Links */}
        <nav className="hidden sm:flex gap-5">
          {[["#products","Shop"],["#trace","Trace"],["#about","About"]].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="text-white/45 hover:text-white text-[0.72rem] font-medium tracking-wide transition"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* WA */}
        <a
          href={`https://wa.me/${WA_NUMBER}?text=Hi%20DAKH%20Shrimps!%20I%27d%20like%20to%20order.`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1fb856] text-white text-[0.72rem] font-semibold px-3.5 py-2 rounded-full transition-all hover:shadow-lg hover:shadow-green-900/30"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Order
        </a>
      </div>
    </header>
  );
}
