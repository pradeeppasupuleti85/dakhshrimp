import { notFound } from "next/navigation";
import Link from "next/link";
import { getBatch } from "@/lib/batchData";

const WA_NUMBER = "919866059902"; // ← Replace with your real number

interface Props {
  params: { id: string };
}

// ── small reusable row ──────────────────────────────────────────────
function DataRow({ label, value, mono = false, green = false }: {
  label: string; value: string; mono?: boolean; green?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-4 py-3.5 border-b border-white/[0.05] last:border-0">
      <span className="text-white/35 text-xs font-light flex-shrink-0">{label}</span>
      <span
        className={[
          "text-right text-xs font-medium break-words max-w-[60%]",
          mono ? "font-mono" : "",
          green ? "text-cyan-400" : "text-white",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

// ── badge ───────────────────────────────────────────────────────────
function Badge({ label, variant = "green" }: { label: string; variant?: "green" | "gold" }) {
  const cls =
    variant === "gold"
      ? "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
      : "bg-cyan-500/10 border-cyan-500/25 text-cyan-400";
  return (
    <span className={`inline-flex items-center gap-1.5 ${cls} border text-[0.65rem] font-semibold px-2.5 py-1 rounded-full`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ── section card ────────────────────────────────────────────────────
function Card({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <span className="text-white/60 text-[0.7rem] font-semibold uppercase tracking-[0.08em]">
          {title}
        </span>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

// ── timeline item ───────────────────────────────────────────────────
function TimelineItem({ step, title, date, last = false }: {
  step: React.ReactNode; title: string; date: string; last?: boolean;
}) {
  return (
    <div className="flex gap-3 py-3 relative">
      {!last && (
        <div className="absolute left-[13px] top-10 bottom-0 w-px bg-cyan-500/10" />
      )}
      <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 z-10">
        {step}
      </div>
      <div>
        <div className="text-white text-xs font-semibold">{title}</div>
        <div className="text-white/35 text-[0.7rem] font-mono mt-0.5">{date}</div>
      </div>
    </div>
  );
}

// ── page ────────────────────────────────────────────────────────────
export default function TracePage({ params }: Props) {
  const batch = getBatch(params.id);
  if (!batch) notFound();

  const waMessage = encodeURIComponent(
    `Hi DAKH! I verified batch ${batch.batchId} (${batch.productName}) and I'd like to order!`
  );

  return (
    <div className="min-h-screen bg-[#02181d] text-white pb-10">

      {/* ── Header ── */}
      <div className="sticky top-0 z-50 bg-[#02181d]/90 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs transition"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </Link>
        <span className="text-white font-bold text-sm">
          DAKH<span className="text-yellow-400">.</span>
        </span>
        <span className="text-white/25 text-[0.65rem]">Trace Report</span>
      </div>

      {/* ── Verified hero ── */}
      <div className="bg-gradient-to-b from-[#0d2b1f] to-[#02181d] px-4 pt-8 pb-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.1),transparent_70%)] pointer-events-none" />
        <div className="relative z-10">
          {/* Shield */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.12)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[0.65rem] font-semibold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Verified Authentic
          </div>

          <div className="font-mono text-white/60 text-xs mb-1">{batch.batchId}</div>
          <h1 className="text-2xl font-black text-white leading-tight">{batch.productName}</h1>
          <p className="text-white/30 text-[0.65rem] mt-2">
            Verified · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* ── Content sections ── */}
      <div className="px-4 flex flex-col gap-3 mt-3">

        {/* Batch identity */}
        <Card
          title="Batch Identity"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
              <rect x="3" y="3" width="5" height="5" /><rect x="16" y="3" width="5" height="5" />
              <rect x="3" y="16" width="5" height="5" /><path d="M21 16h-3v3M15 21v-3h3M15 12h3v3M12 12v3h3M12 15v3M12 12h-3v-3h3" />
            </svg>
          }
        >
          <DataRow label="Batch ID" value={batch.batchId} mono />
          <DataRow label="Product Variety" value={batch.variety} />
          <DataRow label="Pack Weight" value={batch.weight} />
          <DataRow label="Grading Size" value={batch.grade} />
        </Card>

        {/* Pond source */}
        <Card
          title="Pond Source & Origin"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
          }
        >
          <DataRow label="Farm Name" value={batch.farm} green />
          <DataRow label="Pond ID" value={batch.pondId} mono />
          <DataRow label="Location" value={batch.location} />
          <DataRow label="District" value={batch.district} />
          <DataRow label="Water Source" value={batch.waterSource} />
          <DataRow label="GPS Coords" value={batch.coords} mono />
          <DataRow label="Pond Area" value={batch.pondArea} />
        </Card>

        {/* Pond map visual */}
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="h-32 relative flex items-center justify-center overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #0a3d28, #0d5c3e)",
              backgroundImage:
                "linear-gradient(rgba(34,211,238,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.05) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          >
            {/* Rings */}
            <div className="absolute w-20 h-20 rounded-full border border-cyan-400/20 animate-ping" style={{ animationDuration: "3s" }} />
            <div className="absolute w-28 h-28 rounded-full border border-cyan-400/10 animate-ping" style={{ animationDuration: "3s", animationDelay: "1s" }} />
            {/* Marker */}
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_24px_rgba(34,211,238,0.3)] z-10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Journey timeline */}
        <Card
          title="Journey Timeline"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        >
          <div className="py-1">
            <TimelineItem
              step={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>}
              title="Harvest"
              date={batch.harvestDate}
            />
            <TimelineItem
              step={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>}
              title="Processing"
              date={batch.processingDate}
            />
            <TimelineItem
              step={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>}
              title="Lab Tested"
              date={batch.labDate}
            />
            <TimelineItem
              step={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>}
              title="Packaged"
              date={batch.packagedDate}
              last
            />
          </div>
        </Card>

        {/* Quality & Lab */}
        <Card
          title="Quality & Lab Report"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
              <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" /><path d="M9 13h6M9 17h4" />
            </svg>
          }
        >
          <div className="py-3 border-b border-white/[0.05] flex justify-between items-center">
            <span className="text-white/35 text-xs font-light">Lab Status</span>
            <Badge label={batch.labStatus} />
          </div>
          <DataRow label="Lab Name" value={batch.labName} />
          <DataRow label="Antibiotic Residue" value={batch.antibioticResult} green />
          <DataRow label="Heavy Metals" value={batch.heavyMetals} green />
          <DataRow label="Microbial Count" value={batch.microbialCount} green />
          <div className="py-3 flex justify-between items-center">
            <span className="text-white/35 text-xs font-light">FSSAI Compliant</span>
            <Badge label="Certified" variant="gold" />
          </div>
        </Card>

        {/* Cold Chain */}
        <Card
          title="Cold Chain Integrity"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
              <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
            </svg>
          }
        >
          <DataRow label="Temperature Range" value={batch.tempRange} green />
          <div className="py-3 border-b border-white/[0.05] flex justify-between items-center">
            <span className="text-white/35 text-xs font-light">Maintained</span>
            <Badge label={batch.tempMaintained} />
          </div>
          <DataRow label="Storage Facility" value={batch.storageFacility} />
          {/* Score bar */}
          <div className="py-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/35 text-[0.65rem]">Compliance Score</span>
              <span className="text-cyan-400 font-mono text-xs">{batch.tempScore}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-1000"
                style={{ width: `${batch.tempScore}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Share row */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/70 text-xs font-medium py-3 rounded-xl transition"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy Link
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`DAKH Shrimp batch ${batch.batchId} — ${batch.productName}\nhttps://dakhshrimp.com/trace/${batch.batchId}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 text-[#25D366] text-xs font-semibold py-3 rounded-xl transition hover:bg-green-500/15"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Share
          </a>
        </div>

        {/* Order CTA */}
        <div className="bg-[#063743] rounded-2xl p-5 text-center border border-cyan-900/20">
          <h3 className="text-xl font-black text-white mb-1.5 leading-tight">
            Love what you see?<br />Order this batch.
          </h3>
          <p className="text-white/40 text-xs font-light mb-4">
            Fresh delivery to Hyderabad · Same traceability guaranteed
          </p>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20b858] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition shadow-lg shadow-green-900/30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Order on WhatsApp
          </a>
        </div>

      </div>
    </div>
  );
}

// Tell Next.js about the known batch IDs for static generation
export function generateStaticParams() {
  return [
    { id: "DAKH-2024-AP-001" },
    { id: "DAKH-2024-AP-002" },
    { id: "DAKH-2024-AP-003" },
  ];
}
