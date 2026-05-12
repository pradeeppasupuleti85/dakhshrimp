"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface WeightOption {
  weight: string;
  price: number;
  count: string;
}

interface ProductCardProps {
  name: string;
  teluguName?: string;
  description: string;
  badge: string;
  countPerKg: string;
  imageSrc: string;
  imageAlt: string;
  weights: WeightOption[];
  batchId: string;
  source: string;
  waNumber: string;
  accentColor?: "aqua" | "gold" | "emerald";
}

const WA_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function ProductCard({
  name,
  teluguName,
  description,
  badge,
  countPerKg,
  imageSrc,
  imageAlt,
  weights,
  batchId,
  source,
  waNumber,
  accentColor = "aqua",
}: ProductCardProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = weights[selectedIdx];

  const accent = {
    aqua:    { hex: "#00b4d8", rgb: "0,180,216",   badge: "background:#00b4d8;color:white;" },
    gold:    { hex: "#c9a84c", rgb: "201,168,76",  badge: "background:linear-gradient(135deg,#c9a84c,#f0c94a);color:#012a4a;" },
    emerald: { hex: "#10b981", rgb: "16,185,129",  badge: "background:#10b981;color:white;" },
  }[accentColor];

  const waMsg = encodeURIComponent(
    `Hi DAKH Shrimp! I'd like to order ${name} — ${selected.weight} pack at ₹${selected.price}. Batch: ${batchId}`
  );

  return (
    <div
      className="group reveal"
      style={{
        background: "white",
        borderRadius: 22,
        overflow: "hidden",
        border: `1px solid rgba(${accent.rgb},0.15)`,
        boxShadow: "0 4px 20px rgba(0,150,200,0.09)",
        transition: "transform .28s, box-shadow .28s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-5px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 18px 50px rgba(0,150,200,0.2)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,150,200,0.09)";
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", height: 210, overflow: "hidden", background: "#012a4a" }}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(1,42,74,0.72) 0%,transparent 55%)" }} />

        {/* Badge top-left */}
        <span
          style={{
            position: "absolute", top: 12, left: 12,
            fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase",
            letterSpacing: "0.08em", padding: "4px 12px", borderRadius: 999,
            ...Object.fromEntries(accent.badge.split(";").filter(Boolean).map(s => {
              const [k, v] = s.split(":");
              return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.trim()];
            })),
          }}
        >
          {badge}
        </span>

        {/* QR verified badge */}
        <div
          style={{
            position: "absolute", top: 12, right: 12,
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999,
            padding: "4px 10px",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={accent.hex} strokeWidth="3">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <span style={{ color: accent.hex, fontSize: "0.56rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            QR Verified
          </span>
        </div>

        {/* Cold chain badge */}
        <div
          style={{
            position: "absolute", bottom: 12, left: 12,
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.14)", borderRadius: 999,
            padding: "4px 10px",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.56rem", fontWeight: 600 }}>
            ❄️ Cold Chain ✓
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 18px 18px" }}>
        <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.3rem", fontWeight: 800, color: "#012a4a", lineHeight: 1.1 }}>
          {name}
        </div>
        {teluguName && (
          <div style={{ fontSize: "0.72rem", fontStyle: "italic", marginTop: 2, color: accent.hex, opacity: 0.8 }}>
            {teluguName} · {source}
          </div>
        )}
        <p style={{ color: "#4a5568", fontSize: "0.76rem", lineHeight: 1.6, marginTop: 8, marginBottom: 10 }}>
          {description}
        </p>
        <div style={{ color: "#0077a8", fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10, opacity: 0.65 }}>
          {countPerKg}
        </div>

        {/* Weight pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {weights.map((w, i) => (
            <button
              key={w.weight}
              className="wpill"
              style={i === selectedIdx ? {
                background: accent.hex,
                borderColor: accent.hex,
                color: "white",
                boxShadow: `0 3px 12px rgba(${accent.rgb},0.35)`,
              } : {
                borderColor: `rgba(${accent.rgb},0.35)`,
                color: accent.hex,
              }}
              onClick={() => setSelectedIdx(i)}
            >
              {w.weight}
            </button>
          ))}
        </div>

        {/* Price strip */}
        <div
          style={{
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            padding: "12px 0", marginBottom: 12,
            borderTop: "1px solid rgba(0,150,200,0.1)",
            borderBottom: "1px solid rgba(0,150,200,0.1)",
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.9rem", fontWeight: 800, color: accent.hex, lineHeight: 1 }}>
              ₹{selected.price.toLocaleString("en-IN")}
            </div>
            <div style={{ color: "#999", fontSize: "0.62rem", marginTop: 3 }}>≈ {selected.count} pieces</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#bbb", fontSize: "0.56rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pack size</div>
            <div style={{ color: "#012a4a", fontSize: "0.85rem", fontWeight: 700, marginTop: 2 }}>{selected.weight}</div>
          </div>
        </div>

        {/* Mini QR strip */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: accentColor === "gold" ? "#fffbf0" : "#f0f9ff",
            border: `1px solid rgba(${accent.rgb},0.18)`,
            borderRadius: 12, padding: "10px 12px", marginBottom: 12,
          }}
        >
          <div style={{ width: 34, height: 34, background: "white", borderRadius: 8, padding: 2, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,150,200,0.15)" }}>
            <svg viewBox="0 0 21 21" style={{ width: "100%", height: "100%" }}>
              <rect width="21" height="21" fill="white" />
              <rect x="1" y="1" width="5" height="5" fill="#012a4a" /><rect x="2" y="2" width="3" height="3" fill="white" />
              <rect x="15" y="1" width="5" height="5" fill="#012a4a" /><rect x="16" y="2" width="3" height="3" fill="white" />
              <rect x="1" y="15" width="5" height="5" fill="#012a4a" /><rect x="2" y="16" width="3" height="3" fill="white" />
              <rect x="7" y="7" width="3" height="3" fill={accent.hex} />
              <rect x="11" y="7" width="2" height="2" fill="#012a4a" />
              <rect x="7" y="11" width="2" height="2" fill="#012a4a" />
              <rect x="10" y="11" width="4" height="2" fill={accent.hex} />
              <rect x="7" y="17" width="4" height="3" fill="#012a4a" />
              <rect x="14" y="17" width="5" height="3" fill="#012a4a" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#012a4a", fontSize: "0.62rem", fontWeight: 700 }}>
              Batch: <span style={{ fontFamily: "monospace", color: accent.hex }}>{batchId}</span>
            </div>
            <div style={{ color: "#999", fontSize: "0.55rem", marginTop: 1 }}>Verified · DAKH Traceability System</div>
          </div>
          <Link
            href={`/trace/${batchId}`}
            style={{ color: accent.hex, fontSize: "0.6rem", fontWeight: 700, flexShrink: 0, textDecoration: "none" }}
          >
            Trace →
          </Link>
        </div>

        {/* Order button */}
        <a
          href={`https://wa.me/${waNumber}?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "#25D366", color: "white", fontWeight: 700, fontSize: "0.84rem",
            padding: 14, borderRadius: 13, width: "100%", textDecoration: "none",
            boxShadow: "0 4px 16px rgba(37,211,102,0.25)",
            transition: "opacity .18s",
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.9")}
          onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
        >
          {WA_ICON} Order on WhatsApp
        </a>

        <p style={{ textAlign: "center", color: "#ccc", fontSize: "0.55rem", marginTop: 8, letterSpacing: "0.06em" }}>
          From Andhra Coast to Your Kitchen 🌊
        </p>
      </div>
    </div>
  );
}
