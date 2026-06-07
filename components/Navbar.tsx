"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

const WA = "919999999999";

/* Add / remove links here — both desktop and mobile strip update automatically */
const NAV_LINKS = [
  { href: "/#products", label: "Explore"  },
  { href: "/#trace",    label: "Trace"    },
  { href: "/#about",    label: "About"    },
];

const WA_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeLink, setActiveLink] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Pill style — changes slightly on scroll */
  const pillStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 999,
    padding: "10px 14px",
    background: scrolled ? "rgba(1,10,24,0.96)" : "rgba(1,15,36,0.85)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: `1.5px solid ${scrolled ? "rgba(0,180,216,0.55)" : "rgba(0,180,216,0.45)"}`,
    boxShadow: "0 4px 30px rgba(0,0,0,0.5)",
    transition: "background 0.3s, border-color 0.3s",
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 300,
        width: "calc(100% - 24px)",
        maxWidth: 600,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {/* ── MAIN PILL — brand + desktop links + order CTA ── */}
      <div style={pillStyle}>

        {/* Brand */}
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, textDecoration: "none" }}
        >
          <Image
            src="/images/logos/Dakhsrimp-logo.png"
            alt="DAKH Shrimp & Co."
            width={34}
            height={34}
            style={{
              borderRadius: "50%",
              objectFit: "contain",
              border: "1.5px solid rgba(0,180,216,0.4)",
              boxShadow: "0 0 14px rgba(0,180,216,0.28)",
            }}
          />
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "white", letterSpacing: "0.01em" }}>
              DAKH Shrimp
            </div>
            <div style={{ fontSize: "0.56rem", color: "#48cae4", fontWeight: 700, letterSpacing: "0.12em" }}>
              &amp; Co.
            </div>
          </div>
        </Link>

        {/* Desktop nav links — hidden below 520 px */}
        <nav className="hidden sm:flex" style={{ gap: 22, alignItems: "center" }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                color: activeLink === link.href ? "#48cae4" : "rgba(255,255,255,0.5)",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.02em",
                textDecoration: "none",
                transition: "color 0.18s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#48cae4")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color =
                  activeLink === link.href ? "#48cae4" : "rgba(255,255,255,0.5)")
              }
              onClick={() => setActiveLink(link.href)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Order CTA */}
        <a
          href={`https://wa.me/${WA}?text=Hi%20DAKH%20Shrimp!%20I%27d%20like%20to%20order.`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "#25D366",
            color: "white",
            fontWeight: 800,
            fontSize: "0.78rem",
            padding: "9px 18px",
            borderRadius: 999,
            textDecoration: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 3px 14px rgba(37,211,102,0.4)",
            transition: "opacity 0.18s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.88")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
        >
          {WA_ICON}
          Order
        </a>
      </div>

      {/* ── MOBILE NAV STRIP ── visible only below 520 px ──────────────
          Horizontally scrollable — future-proof for more links.
          When you add a new item to NAV_LINKS above, it appears here
          automatically. The strip scrolls smoothly if links overflow.
          ─────────────────────────────────────────────────────────────── */}
      <div
        className="flex sm:hidden"
        style={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",          /* Firefox */
          msOverflowStyle: "none",         /* IE/Edge */
          gap: 8,
          padding: "8px 12px",
          background: scrolled ? "rgba(1,10,24,0.88)" : "rgba(1,15,36,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(0,180,216,0.25)",
          borderRadius: 999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
          transition: "background 0.3s",
        }}
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setActiveLink(link.href)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              whiteSpace: "nowrap",
              flexShrink: 0,
              padding: "5px 16px",
              borderRadius: 999,
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textDecoration: "none",
              transition: "background 0.18s, color 0.18s, border-color 0.18s",
              background:
                activeLink === link.href
                  ? "rgba(0,180,216,0.18)"
                  : "rgba(255,255,255,0.06)",
              border: `1px solid ${
                activeLink === link.href
                  ? "rgba(0,180,216,0.45)"
                  : "rgba(255,255,255,0.12)"
              }`,
              color:
                activeLink === link.href
                  ? "#48cae4"
                  : "rgba(255,255,255,0.7)",
            }}
          >
            {link.label}
          </Link>
        ))}

        {/*
          To add more links later — ONLY edit NAV_LINKS array at the top.
          Example:
            { href: "/#recipes", label: "Recipes" },
            { href: "/#blog",    label: "Blog"    },
          The strip scrolls horizontally so it never gets cluttered.
        */}
      </div>

      {/* Hide webkit scrollbar on the strip */}
      <style>{`
        .flex.sm\\:hidden::-webkit-scrollbar { display: none; }
      `}</style>
    </header>
  );
}
