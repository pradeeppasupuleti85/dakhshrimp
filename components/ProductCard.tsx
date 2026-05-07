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
  teluguName: string;
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

  const accentStyles = {
    aqua: {
      pill: "border-cyan-400/60 bg-cyan-400/15 text-cyan-300",
      pillInactive: "border-white/10 text-white/40 hover:border-cyan-400/30 hover:text-white/70",
      badge: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20",
      price: "text-cyan-400",
      glow: "rgba(34,211,238,0.08)",
    },
    gold: {
      pill: "border-yellow-400/60 bg-yellow-400/15 text-yellow-300",
      pillInactive: "border-white/10 text-white/40 hover:border-yellow-400/30 hover:text-white/70",
      badge: "bg-yellow-400/10 text-yellow-300 border-yellow-400/20",
      price: "text-yellow-400",
      glow: "rgba(200,148,58,0.08)",
    },
    emerald: {
      pill: "border-emerald-400/60 bg-emerald-400/15 text-emerald-300",
      pillInactive: "border-white/10 text-white/40 hover:border-emerald-400/30 hover:text-white/70",
      badge: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
      price: "text-emerald-400",
      glow: "rgba(52,211,153,0.08)",
    },
  }[accentColor];

  const waMsg = encodeURIComponent(
    `Hi DAKSH Shrimps! I'd like to order ${name} — ${selected.weight} pack at ₹${selected.price}. Batch: ${batchId}`
  );

  return (
    <div
      className="group relative glass-card rounded-2xl overflow-hidden glow-hover transition-all duration-500 hover:-translate-y-1.5"
      style={{ boxShadow: `0 4px 40px ${accentStyles.glow}, 0 1px 0 rgba(255,255,255,0.04) inset` }}
    >
      {/* ── Image ── */}
      <div className="relative h-56 overflow-hidden">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020f12] via-[#020f12]/30 to-transparent" />

        {/* Badge */}
        <div className="absolute top-3.5 left-3.5">
          <span className={`text-[0.62rem] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${accentStyles.badge}`}>
            {badge}
          </span>
        </div>

        {/* QR Verified badge */}
        <div className="absolute top-3.5 right-3.5 flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <span className="text-cyan-400/90 text-[0.58rem] font-semibold uppercase tracking-wider">QR Verified</span>
        </div>

        {/* Cold chain badge */}
        <div className="absolute bottom-3.5 left-3.5 flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" strokeWidth="2.5">
            <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
          </svg>
          <span className="text-cyan-300/80 text-[0.58rem] font-semibold uppercase tracking-wider">Cold Chain Maintained</span>
        </div>

        {/* Source */}
        <div className="absolute bottom-3.5 right-3.5 flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          <span className="text-white/40 text-[0.58rem] tracking-wide">{source}</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-5">

        {/* Name row */}
        <div className="mb-1">
          <div
            className="text-white font-black text-xl leading-tight tracking-tight"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            {name}
          </div>
          <div className="text-white/30 text-xs italic mt-0.5">{teluguName}</div>
        </div>

        <p className="text-white/40 text-xs leading-relaxed mb-4 font-light">{description}</p>

        {/* Count info */}
        <div className="text-white/25 text-[0.65rem] uppercase tracking-[0.1em] mb-3 flex items-center gap-1.5">
          <span className="w-3 h-px bg-white/15 inline-block" />
          {countPerKg}
          <span className="w-3 h-px bg-white/15 inline-block" />
        </div>

        {/* Weight selector */}
        <div className="flex gap-2 mb-4">
          {weights.map((w, i) => (
            <button
              key={w.weight}
              onClick={() => setSelectedIdx(i)}
              className={`flex-1 py-2 px-3 rounded-lg border text-[0.72rem] font-semibold tracking-wide transition-all duration-200 ${
                i === selectedIdx ? accentStyles.pill : accentStyles.pillInactive
              }`}
            >
              {w.weight}
            </button>
          ))}
        </div>

        {/* Dynamic pricing + count */}
        <div className="flex items-end justify-between mb-5 pt-3 border-t border-white/[0.06]">
          <div>
            <div className={`font-black text-2xl leading-none ${accentStyles.price}`}
              style={{ fontFamily: "'Georgia', serif" }}>
              ₹{selected.price}
            </div>
            <div className="text-white/25 text-[0.65rem] mt-1">
              ≈ {selected.count} pieces
            </div>
          </div>
          <div className="text-right">
            <div className="text-white/20 text-[0.6rem] uppercase tracking-wider">Pack size</div>
            <div className="text-white/50 text-sm font-semibold mt-0.5">{selected.weight}</div>
          </div>
        </div>

        {/* Mini QR scan preview */}
        <div className="mb-4 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center gap-3">
          {/* Tiny QR icon */}
          <div className="w-10 h-10 bg-white rounded-lg p-1 flex-shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 21 21" className="w-full h-full">
              <rect width="21" height="21" fill="white"/>
              <rect x="1" y="1" width="5" height="5" fill="#020f12"/>
              <rect x="2" y="2" width="3" height="3" fill="white"/>
              <rect x="15" y="1" width="5" height="5" fill="#020f12"/>
              <rect x="16" y="2" width="3" height="3" fill="white"/>
              <rect x="1" y="15" width="5" height="5" fill="#020f12"/>
              <rect x="2" y="16" width="3" height="3" fill="white"/>
              <rect x="7" y="1" width="1" height="1" fill="#020f12"/>
              <rect x="9" y="1" width="2" height="1" fill="#020f12"/>
              <rect x="7" y="3" width="2" height="1" fill="#020f12"/>
              <rect x="7" y="5" width="1" height="1" fill="#020f12"/>
              <rect x="10" y="5" width="2" height="1" fill="#020f12"/>
              <rect x="13" y="7" width="1" height="2" fill="#020f12"/>
              <rect x="1" y="7" width="2" height="1" fill="#020f12"/>
              <rect x="4" y="7" width="1" height="1" fill="#020f12"/>
              <rect x="7" y="7" width="2" height="2" fill="#22d3ee"/>
              <rect x="10" y="7" width="1" height="1" fill="#020f12"/>
              <rect x="1" y="9" width="1" height="1" fill="#020f12"/>
              <rect x="3" y="9" width="2" height="1" fill="#020f12"/>
              <rect x="7" y="9" width="1" height="2" fill="#020f12"/>
              <rect x="9" y="10" width="2" height="1" fill="#020f12"/>
              <rect x="12" y="9" width="2" height="2" fill="#22d3ee"/>
              <rect x="15" y="7" width="3" height="1" fill="#020f12"/>
              <rect x="15" y="9" width="2" height="1" fill="#020f12"/>
              <rect x="18" y="9" width="2" height="2" fill="#020f12"/>
              <rect x="1" y="12" width="4" height="1" fill="#020f12"/>
              <rect x="7" y="12" width="1" height="1" fill="#020f12"/>
              <rect x="9" y="12" width="3" height="1" fill="#020f12"/>
              <rect x="14" y="12" width="1" height="1" fill="#020f12"/>
              <rect x="7" y="14" width="2" height="1" fill="#020f12"/>
              <rect x="10" y="14" width="2" height="2" fill="#22d3ee"/>
              <rect x="13" y="14" width="2" height="1" fill="#020f12"/>
              <rect x="16" y="14" width="3" height="1" fill="#020f12"/>
              <rect x="7" y="16" width="3" height="1" fill="#020f12"/>
              <rect x="13" y="16" width="1" height="1" fill="#020f12"/>
              <rect x="15" y="16" width="4" height="1" fill="#020f12"/>
              <rect x="7" y="18" width="2" height="2" fill="#020f12"/>
              <rect x="10" y="18" width="3" height="1" fill="#020f12"/>
              <rect x="14" y="18" width="2" height="1" fill="#020f12"/>
              <rect x="17" y="18" width="3" height="2" fill="#020f12"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white/60 text-[0.68rem] font-semibold mb-0.5">Batch: <span className="font-mono text-cyan-400/80">{batchId}</span></div>
            <div className="text-white/25 text-[0.6rem] leading-snug">Verified through DAKH Traceability System</div>
          </div>
          <Link
            href={`/trace/${batchId}`}
            className="flex-shrink-0 text-cyan-400/60 hover:text-cyan-400 text-[0.6rem] font-semibold uppercase tracking-wider transition-colors"
          >
            Trace →
          </Link>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5">
          <a
            href={`https://wa.me/${waNumber}?text=${waMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fb856] text-white text-xs font-bold py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-green-900/30"
          >
            {WA_ICON}
            Order on WhatsApp
          </a>
          <Link
            href={`/trace/${batchId}`}
            className="flex items-center justify-center gap-1.5 border border-white/10 hover:border-cyan-400/30 text-white/40 hover:text-cyan-400 text-xs font-medium px-3.5 py-3 rounded-xl transition-all"
            title="Trace This Batch"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/>
              <rect x="3" y="16" width="5" height="5"/>
              <path d="M21 16h-3v3M15 21v-3h3M15 12h3v3M12 15v3"/>
            </svg>
            Trace
          </Link>
        </div>

        {/* Microcopy */}
        <p className="text-white/20 text-[0.6rem] text-center mt-3 tracking-wide">
          From Andhra Coast to Your Kitchen
        </p>
      </div>
    </div>
  );
}
