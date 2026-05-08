"use client";
import { useState } from "react";
import Link from "next/link";
import { BatchData } from "@/lib/types";

interface Props {
  batch: BatchData;
  onClose: () => void;
}

function Row({ label, value, mono = false, green = false }: {
  label: string; value: string; mono?: boolean; green?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-white/[0.05] last:border-0">
      <span className="text-white/30 text-xs font-light flex-shrink-0">{label}</span>
      <span className={`text-right text-xs font-medium max-w-[58%] break-words leading-snug ${mono ? "font-mono" : ""} ${green ? "text-cyan-400" : "text-white/80"}`}>
        {value}
      </span>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[0.62rem] font-semibold px-2 py-0.5 rounded-full">
      <span className="w-1 h-1 rounded-full bg-cyan-400" />{label}
    </span>
  );
}

export default function TraceModal({ batch, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-sm bg-[#060f12] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[90svh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Shield */}
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
            <div>
              <div className="text-white text-xs font-bold">Batch Verified</div>
              <div className="text-white/30 text-[0.6rem] font-mono">{batch.batchId}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Product name */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex-shrink-0"
          style={{ background: "linear-gradient(to bottom, rgba(34,211,238,0.04), transparent)" }}>
          <div className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[0.6rem] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full mb-2">
            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
            Verified Authentic
          </div>
          <div className="text-white font-black text-lg" style={{ fontFamily: "'Georgia', serif" }}>
            {batch.productName}
          </div>
          <div className="text-white/30 text-xs mt-0.5">{batch.variety}</div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Origin */}
          <div>
            <div className="text-white/20 text-[0.6rem] uppercase tracking-[0.12em] mb-2 flex items-center gap-2">
              <span className="w-3 h-px bg-white/15" />Pond Source
            </div>
            <Row label="Farm" value={batch.farm} green />
            <Row label="Location" value={batch.location} />
            <Row label="Pond ID" value={batch.pondId} mono />
            <Row label="GPS" value={batch.coords} mono />
          </div>

          {/* Timeline */}
          <div>
            <div className="text-white/20 text-[0.6rem] uppercase tracking-[0.12em] mb-3 flex items-center gap-2">
              <span className="w-3 h-px bg-white/15" />Journey
            </div>
            <div className="space-y-0">
              {[
                { icon: "🎣", label: "Harvest Date", val: batch.harvestDate },
                { icon: "⚙️", label: "Processing Date", val: batch.processingDate },
                { icon: "🧪", label: "Lab Tested", val: batch.labDate },
                { icon: "📦", label: "Packaged", val: batch.packagedDate },
              ].map((item, i, arr) => (
                <div key={item.label} className="flex gap-3 relative">
                  {i < arr.length - 1 && (
                    <div className="absolute left-3.5 top-7 bottom-0 w-px bg-white/[0.06]" />
                  )}
                  <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-[0.6rem] z-10">
                    {item.icon}
                  </div>
                  <div className="pb-3">
                    <div className="text-white/40 text-[0.65rem]">{item.label}</div>
                    <div className="text-white/80 text-xs font-semibold font-mono">{item.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lab */}
          <div>
            <div className="text-white/20 text-[0.6rem] uppercase tracking-[0.12em] mb-2 flex items-center gap-2">
              <span className="w-3 h-px bg-white/15" />Lab Report
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/[0.05]">
              <span className="text-white/30 text-xs">Status</span>
              <Badge label="Passed" />
            </div>
            <Row label="Antibiotic" value={batch.antibioticResult} green />
            <Row label="Heavy Metals" value={batch.heavyMetals} green />
            <Row label="FSSAI" value={batch.fssaiCompliant} />
          </div>

          {/* Cold chain */}
          <div>
            <div className="text-white/20 text-[0.6rem] uppercase tracking-[0.12em] mb-2 flex items-center gap-2">
              <span className="w-3 h-px bg-white/15" />Cold Chain
            </div>
            <Row label="Temperature" value={batch.tempRange} green />
            <div className="pt-2 pb-1">
              <div className="flex justify-between mb-1.5">
                <span className="text-white/25 text-[0.6rem]">Compliance</span>
                <span className="text-cyan-400 font-mono text-[0.68rem]">{batch.tempScore}%</span>
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300"
                  style={{ width: `${batch.tempScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* QR Verified seal */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-center">
            <div className="text-cyan-400/60 text-[0.6rem] uppercase tracking-[0.14em] mb-1">
              Verified through DAKH Traceability System
            </div>
            <div className="text-white/20 text-[0.58rem]">Every batch traceable.</div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex-shrink-0 flex gap-2.5">
          <Link
            href={`/trace/${batch.batchId}`}
            className="flex-1 flex items-center justify-center gap-1.5 border border-cyan-400/25 text-cyan-400/80 hover:text-cyan-400 hover:border-cyan-400/50 text-xs font-semibold py-3 rounded-xl transition"
            onClick={onClose}
          >
            Full Report →
          </Link>
          <button
            onClick={() => navigator.clipboard?.writeText(`https://dakhshrimp.com/trace/${batch.batchId}`)}
            className="flex items-center justify-center gap-1.5 border border-white/10 text-white/30 hover:text-white/60 text-xs py-3 px-4 rounded-xl transition"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
