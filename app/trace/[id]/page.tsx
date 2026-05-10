import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getBatch } from "@/lib/batchData";
import type { BatchData } from "@/lib/batchData";

const WA = "919999999999";

// ── Metadata ──────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const batch = await getBatch(params.id);
  if (!batch) return { title: "Batch Not Found — DAKSH Shrimps" };
  return {
    title: `${batch.variety} · ${batch.batchId} — DAKSH Trace`,
    description: `Verified batch ${batch.batchId}. Harvested ${batch.harvestDate} from ${batch.source}.`,
  };
}

// ── Static params ─────────────────────────────────────────────────
export function generateStaticParams() {
  return [
    { id: "NS-240801-A" },
    { id: "CR-240801-A" },
    { id: "TS-240801-A" },
  ];
}

// ── Sub-components ────────────────────────────────────────────────
function Row({
  label,
  value,
  mono = false,
  accent = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-white/[0.05] last:border-0">
      <span className="text-white/30 text-xs font-light flex-shrink-0">{label}</span>
      <span
        className={[
          "text-right text-xs font-medium break-words max-w-[58%] leading-snug",
          mono ? "font-mono" : "",
          accent ? "text-cyan-400" : "text-white/75",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/[0.05]">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <span className="text-white/50 text-[0.68rem] font-semibold uppercase tracking-[0.1em]">
          {title}
        </span>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

function GreenBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[0.62rem] font-semibold px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
      {label}
    </span>
  );
}

function GoldBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[0.62rem] font-semibold px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
      {label}
    </span>
  );
}

function Step({
  emoji,
  title,
  date,
  last = false,
}: {
  emoji: string;
  title: string;
  date: string;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3 py-3 relative">
      {!last && (
        <div className="absolute left-3.5 top-9 bottom-0 w-px bg-white/[0.05]" />
      )}
      <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-xs z-10">
        {emoji}
      </div>
      <div>
        <div className="text-white/60 text-xs font-semibold">{title}</div>
        <div className="text-white/28 text-[0.68rem] font-mono mt-0.5">{date}</div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default async function TracePage({
  params,
}: {
  params: { id: string };
}) {
  const batch: BatchData | null = await getBatch(params.id);
  if (!batch) notFound();

  const waOrder = encodeURIComponent(
    `Hi DAKSH Shrimps! I verified batch ${batch!.batchId} (${batch!.variety}) and I'd like to order!`
  );
  const waShare = encodeURIComponent(
    `DAKSH batch trace:\n${batch!.variety} · ${batch!.batchId}\nhttps://www.dakhshrimp.com/trace/${batch!.batchId}`
  );
  const verifiedAt = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#020f12] text-white pb-12">

      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#020f12]/92 backdrop-blur-xl border-b border-white/[0.05] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-white/35 hover:text-white text-xs font-medium transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          DAKSH Shrimps
        </Link>
        <span className="text-white/60 font-black text-sm tracking-wide" style={{ fontFamily: "Georgia, serif" }}>
          DAKSH<span className="text-yellow-400">.</span>
        </span>
        <span className="text-white/20 text-[0.6rem] uppercase tracking-wider">Trace</span>
      </div>

      {/* Verified hero */}
      <div
        className="relative overflow-hidden px-4 pt-8 pb-6 text-center"
        style={{ background: "linear-gradient(160deg,#071f18 0%,#020f12 65%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(34,211,238,0.1) 0%,transparent 65%)" }}
        />
        <div className="relative z-10">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/10 border-2 border-cyan-500/25 flex items-center justify-center"
            style={{ boxShadow: "0 0 40px rgba(34,211,238,0.14)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[0.62rem] font-semibold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Verified Authentic
            </span>
          </div>
          <div className="font-mono text-white/40 text-xs mb-1">{batch!.batchId}</div>
          <h1 className="text-white font-black text-2xl leading-tight mb-1" style={{ fontFamily: "Georgia, serif" }}>
            {batch!.variety}
          </h1>
          <div className="text-white/30 text-xs mb-2">{batch!.source} · {batch!.district}</div>
          <div className="text-white/18 text-[0.6rem] tracking-wider">
            Verified through DAKH Traceability System · {verifiedAt}
          </div>
        </div>
      </div>

      {/* Trust seals */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {["✓ QR Verified", "❄️ Cold Chain", "🧪 Lab Tested", "🌿 Freshness Verified", "🏅 FSSAI Compliant"].map((s) => (
          <span key={s} className="flex-shrink-0 inline-flex items-center bg-cyan-500/8 border border-cyan-500/15 text-cyan-400/75 text-[0.6rem] font-semibold px-2.5 py-1.5 rounded-full whitespace-nowrap">
            {s}
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 flex flex-col gap-3 mt-1">

        {/* Identity */}
        <Card
          title="Batch Identity"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M15 21v-3h3M15 12h3v3M12 15v3"/></svg>}
        >
          <Row label="Batch ID" value={batch!.batchId} mono accent />
          <Row label="Product" value={batch!.variety} />
        </Card>

        {/* Source */}
        <Card
          title="Pond Source & Origin"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
        >
          <Row label="Farm" value={batch!.farm} accent />
          <Row label="Location" value={batch!.source} />
          <Row label="District" value={batch!.district} />
          <Row label="Water Source" value={batch!.waterSource} />
          <Row label="GPS" value={batch!.coords} mono />
        </Card>

        {/* Timeline */}
        <Card
          title="Journey Timeline"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        >
          <div className="py-1">
            <Step emoji="🎣" title="Harvested" date={batch!.harvestDate} />
            <Step emoji="⚙️" title="Processed" date={batch!.processingDate} />
            <Step emoji="🧪" title="Lab Tested" date={batch!.labDate} />
            <Step emoji="📦" title="Packaged" date={batch!.packagedDate} last />
          </div>
        </Card>

        {/* Lab */}
        <Card
          title="Lab Report"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h6M9 17h4"/></svg>}
        >
          <div className="flex justify-between items-center py-3.5 border-b border-white/[0.05]">
            <span className="text-white/30 text-xs font-light">Lab Status</span>
            <GreenBadge label={batch!.labStatus} />
          </div>
          <Row label="Lab" value={batch!.labName} />
          <Row label="Antibiotic Residue" value={batch!.antibioticResult} accent />
          <Row label="Heavy Metals" value={batch!.heavyMetals} accent />
          <Row label="Microbial Count" value={batch!.microbialCount} accent />
          <div className="flex justify-between items-center py-3.5">
            <span className="text-white/30 text-xs font-light">FSSAI</span>
            <GoldBadge label="FSSAI Certified" />
          </div>
        </Card>

        {/* Cold chain */}
        <Card
          title="Cold Chain"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/></svg>}
        >
          <Row label="Temperature" value={batch!.tempRange} accent />
          <div className="flex justify-between items-center py-3.5 border-b border-white/[0.05]">
            <span className="text-white/30 text-xs font-light">Status</span>
            <GreenBadge label={batch!.tempMaintained} />
          </div>
          <Row label="Storage" value={batch!.storageFacility} />
          <div className="py-4">
            <div className="flex justify-between mb-2">
              <span className="text-white/22 text-[0.6rem] uppercase tracking-wider">Compliance Score</span>
              <span className="text-cyan-400 font-mono text-xs">{batch!.tempScore}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${batch!.tempScore}%`, background: "linear-gradient(90deg,#0891b2,#22d3ee)" }}
              />
            </div>
          </div>
        </Card>

        {/* Seal */}
        <div className="rounded-2xl p-4 text-center border border-white/[0.06]"
          style={{ background: "linear-gradient(135deg,rgba(34,211,238,0.04),rgba(0,0,0,0))" }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <span className="text-cyan-400/65 text-[0.65rem] font-semibold uppercase tracking-[0.12em]">
              QR Verified Seal
            </span>
          </div>
          <p className="text-white/18 text-[0.6rem] leading-relaxed">
            Verified through DAKH Traceability System<br />
            From Andhra Coast to Your Kitchen<br />
            Every batch traceable. Scan Freshness. Taste Trust.
          </p>
        </div>

        {/* Share */}
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={`https://wa.me/?text=${waShare}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-500/[0.08] border border-green-500/20 text-[#25D366] text-xs font-semibold py-3 rounded-xl transition hover:bg-green-500/14"
          >
            Share via WhatsApp
          </a>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.08] text-white/50 text-xs font-medium py-3 rounded-xl transition hover:bg-white/[0.07]"
          >
            ← Back to Shop
          </Link>
        </div>

        {/* Order CTA */}
        <div className="rounded-2xl p-5 text-center border border-cyan-900/20"
          style={{ background: "linear-gradient(160deg,#042b1f,#020f12)" }}>
          <h2 className="text-white font-black text-xl mb-1.5 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
            Love this batch?<br />Order it now.
          </h2>
          <p className="text-white/28 text-xs font-light mb-4 leading-relaxed">
            Same traceability guaranteed on every order.<br />
            Scan Freshness. Taste Trust.
          </p>
          <a
            href={`https://wa.me/${WA}?text=${waOrder}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1fb856] text-white font-bold text-sm px-7 py-3.5 rounded-xl transition"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Order on WhatsApp
          </a>
        </div>

      </div>
    </div>
  );
}
