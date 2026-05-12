"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

const WA = "919999999999"; // ← replace with real number

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-3.5 left-1/2 -translate-x-1/2 z-[300] w-[calc(100%-24px)] max-width-[600px]"
      style={{ maxWidth: 600 }}>
      <div
        className="flex items-center justify-between gap-2.5 rounded-full px-3.5 py-2.5 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(1,10,24,0.96)" : "rgba(1,15,36,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: `1.5px solid ${scrolled ? "rgba(0,180,216,0.55)" : "rgba(0,180,216,0.45)"}`,
          boxShadow: "0 4px 30px rgba(0,0,0,0.5)",
        }}
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <Image
            src="/images/logos/Dakhsrimp-logo.png"
            alt="DAKH Shrimp & Co."
            width={34}
            height={34}
            className="rounded-full object-contain"
            style={{ border: "1.5px solid rgba(0,180,216,0.4)", boxShadow: "0 0 14px rgba(0,180,216,0.3)" }}
          />
          <div className="leading-none">
            <div className="font-bold text-white" style={{ fontSize: "0.88rem", letterSpacing: "0.01em" }}>
              DAKH Shrimp
            </div>
            <div className="font-bold" style={{ fontSize: "0.56rem", color: "#48cae4", letterSpacing: "0.12em" }}>
              &amp; Co.
            </div>
          </div>
        </Link>

        {/* Links — desktop only */}
        <nav className="hidden sm:flex gap-5 items-center">
          {[["#products", "Explore"], ["#trace", "Trace"], ["#about", "About"]].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="transition-colors"
              style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.02em" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#48cae4")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Order CTA */}
        <a
          href={`https://wa.me/${WA}?text=Hi%20DAKH%20Shrimp!%20I%27d%20like%20to%20order.`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-extrabold text-white rounded-full transition-all"
          style={{
            background: "#25D366",
            fontSize: "0.76rem",
            padding: "9px 18px",
            boxShadow: "0 3px 14px rgba(37,211,102,0.4)",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Order
        </a>
      </div>
    </header>
  );
}
