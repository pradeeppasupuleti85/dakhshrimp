import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getBatch } from "@/lib/batchData";
import type { BatchData } from "@/lib/batchData";

const WA = "919999999999";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const batch = await getBatch(id);
  if (!batch) return { title: "Batch Not Found — DAKH Shrimp" };
  return {
    title: `${batch.variety} · ${batch.batchId} — DAKH Trace`,
    description: `Verified batch ${batch.batchId}. Harvested ${batch.harvestDate} from ${batch.source}.`,
  };
}

export function generateStaticParams() {
  return [
    { id: "NS-240801-A" },
    { id: "CR-240801-A" },
    { id: "TS-240801-A" },
  ];
}

// ── Small components ──────────────────────────────────────────────

function Row({ label, value, mono = false, accent = false }: {
  label: string; value: string; mono?: boolean; accent?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      gap: 16, padding: "12px 0",
      borderBottom: "1px solid rgba(0,150,200,0.08)",
    }}
      className="last:border-0"
    >
      <span style={{ color: "rgba(1,42,74,0.45)", fontSize: "0.76rem", fontWeight: 400, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        textAlign: "right", fontSize: "0.78rem", fontWeight: 600,
        maxWidth: "58%", wordBreak: "break-word", lineHeight: 1.4,
        fontFamily: mono ? "monospace" : "inherit",
        color: accent ? "#0096c7" : "#012a4a",
      }}>
        {value}
      </span>
    </div>
  );
}

function Card({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "white",
      borderRadius: 18,
      overflow: "hidden",
      border: "1px solid rgba(0,180,216,0.12)",
      boxShadow: "0 2px 16px rgba(0,150,200,0.08)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px",
        borderBottom: "1px solid rgba(0,180,216,0.08)",
        background: "rgba(0,180,216,0.03)",
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "rgba(0,180,216,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{
          color: "#0077a8", fontSize: "0.68rem",
          fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "4px 16px 8px" }}>{children}</div>
    </div>
  );
}

function AquaBadge({ label }: { label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.25)",
      color: "#0096c7", fontSize: "0.62rem", fontWeight: 700,
      padding: "4px 10px", borderRadius: 999,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00b4d8", display: "inline-block" }} />
      {label}
    </span>
  );
}

function GoldBadge({ label }: { label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)",
      color: "#c9a84c", fontSize: "0.62rem", fontWeight: 700,
      padding: "4px 10px", borderRadius: 999,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block" }} />
      {label}
    </span>
  );
}

function Step({ emoji, title, date, last = false }: {
  emoji: string; title: string; date: string; last?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", position: "relative" }}>
      {!last && (
        <div style={{
          position: "absolute", left: 13, top: 36, bottom: 0,
          width: 1, background: "rgba(0,180,216,0.15)",
        }} />
      )}
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "rgba(0,180,216,0.08)",
        border: "1px solid rgba(0,180,216,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontSize: "0.75rem", zIndex: 1,
      }}>
        {emoji}
      </div>
      <div>
        <div style={{ color: "#012a4a", fontSize: "0.78rem", fontWeight: 600 }}>{title}</div>
        <div style={{ color: "#0096c7", fontSize: "0.68rem", fontFamily: "monospace", marginTop: 2, opacity: 0.7 }}>{date}</div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default async function TracePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch: BatchData | null = await getBatch(id);
  if (!batch) notFound();

  const waOrder = encodeURIComponent(
    `Hi DAKH Shrimp! I verified batch ${batch!.batchId} (${batch!.variety}) and I'd like to order!`
  );
  const waShare = encodeURIComponent(
    `DAKH batch trace:\n${batch!.variety} · ${batch!.batchId}\nhttps://www.dakhshrimp.com/trace/${batch!.batchId}`
  );
  const verifiedAt = new Date().toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#dff0fa", color: "#012a4a", paddingBottom: 48 }}>

      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(223,240,250,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,180,216,0.15)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link
          href="/"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            color: "rgba(1,42,74,0.45)", fontSize: "0.76rem",
            fontWeight: 600, textDecoration: "none", transition: "color .18s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          DAKH Shrimp
        </Link>
        <span style={{
          fontFamily: "var(--font-playfair)",
          color: "#012a4a", fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.04em",
        }}>
          DAKH<span style={{ color: "#c9a84c" }}>.</span>
        </span>
        <span style={{ color: "rgba(1,42,74,0.3)", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Trace
        </span>
      </div>

      {/* ── Verified hero ── */}
      <div style={{
        background: "linear-gradient(160deg, #cce8f6 0%, #dff0fa 65%)",
        padding: "32px 16px 24px",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        {/* Aqua radial glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse at 50% 0%, rgba(0,180,216,0.12) 0%, transparent 65%)",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Shield */}
          <div style={{
            width: 64, height: 64, margin: "0 auto 16px",
            borderRadius: "50%",
            background: "rgba(0,180,216,0.1)",
            border: "2px solid rgba(0,180,216,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 40px rgba(0,180,216,0.18)",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>

          {/* Verified badge */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(0,180,216,0.12)",
              border: "1px solid rgba(0,180,216,0.3)",
              color: "#0096c7",
              fontSize: "0.62rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em",
              padding: "6px 14px", borderRadius: 999,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#00b4d8", display: "inline-block",
                animation: "dotPulse 2s infinite",
              }} />
              Verified Authentic
            </span>
          </div>

          <div style={{ fontFamily: "monospace", color: "rgba(1,42,74,0.4)", fontSize: "0.75rem", marginBottom: 4 }}>
            {batch!.batchId}
          </div>
          <h1 style={{
            fontFamily: "var(--font-playfair)",
            color: "#012a4a", fontWeight: 800,
            fontSize: "clamp(1.5rem, 5vw, 2rem)",
            lineHeight: 1.2, marginBottom: 4,
          }}>
            {batch!.variety}
          </h1>
          <div style={{ color: "rgba(1,42,74,0.4)", fontSize: "0.72rem", marginBottom: 8 }}>
            {batch!.source} · {batch!.district}
          </div>
          <div style={{ color: "rgba(1,42,74,0.25)", fontSize: "0.58rem", letterSpacing: "0.08em" }}>
            Verified through DAKH Traceability System · {verifiedAt}
          </div>
        </div>
      </div>

      {/* ── Trust seals ── */}
      <div style={{
        padding: "12px 16px",
        display: "flex", gap: 8, overflowX: "auto",
        scrollbarWidth: "none",
        borderBottom: "1px solid rgba(0,180,216,0.1)",
        background: "rgba(0,180,216,0.03)",
      }}>
        {[
          "✓ QR Verified",
          "❄️ Cold Chain",
          "🧪 Lab Tested",
          "🌿 Freshness Verified",
          "🏅 FSSAI Compliant",
        ].map((s) => (
          <span key={s} style={{
            flexShrink: 0,
            display: "inline-flex", alignItems: "center",
            background: "rgba(0,180,216,0.08)",
            border: "1px solid rgba(0,180,216,0.2)",
            color: "#0096c7",
            fontSize: "0.6rem", fontWeight: 600,
            padding: "5px 10px", borderRadius: 999,
            whiteSpace: "nowrap",
          }}>
            {s}
          </span>
        ))}
      </div>

      {/* ── Content cards ── */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Batch identity */}
        <Card
          title="Batch Identity"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M15 21v-3h3M15 12h3v3M12 15v3"/></svg>}
        >
          <Row label="Batch ID" value={batch!.batchId} mono accent />
          <Row label="Product" value={batch!.variety} />
        </Card>

        {/* Pond source */}
        <Card
          title="Pond Source & Origin"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
        >
          <Row label="Farm" value={batch!.farm} accent />
          <Row label="Location" value={batch!.source} />
          <Row label="District" value={batch!.district} />
          <Row label="Water Source" value={batch!.waterSource} />
          <Row label="GPS" value={batch!.coords} mono />
        </Card>

        {/* Pond map visual */}
        <div style={{
          background: "white",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(0,180,216,0.12)",
          boxShadow: "0 2px 16px rgba(0,150,200,0.08)",
        }}>
          <div style={{
            height: 110,
            background: "linear-gradient(160deg, #0a3d28, #0b4d38)",
            backgroundImage: "linear-gradient(rgba(0,180,216,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,216,0.06) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            <div className="ripple-ring" style={{ position: "absolute", width: 60, height: 60, borderRadius: "50%", border: "1px solid rgba(0,180,216,0.4)", animationDuration: "3s" }} />
            <div className="ripple-ring" style={{ position: "absolute", width: 90, height: 90, borderRadius: "50%", border: "1px solid rgba(0,180,216,0.22)", animationDuration: "3s", animationDelay: "1s" }} />
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,180,216,0.2)",
              border: "2px solid #00b4d8",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 1, boxShadow: "0 0 20px rgba(0,180,216,0.35)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          </div>
          <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "rgba(1,42,74,0.3)", fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>GPS</div>
              <div style={{ color: "#0096c7", fontFamily: "monospace", fontSize: "0.72rem" }}>{batch!.coords}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "rgba(1,42,74,0.3)", fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Source</div>
              <div style={{ color: "#012a4a", fontSize: "0.76rem", fontWeight: 600 }}>{batch!.source}</div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <Card
          title="Journey Timeline"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        >
          <div style={{ padding: "4px 0" }}>
            <Step emoji="🎣" title="Harvested" date={batch!.harvestDate} />
            <Step emoji="⚙️" title="Processed" date={batch!.processingDate} />
            <Step emoji="🧪" title="Lab Tested" date={batch!.labDate} />
            <Step emoji="📦" title="Packaged" date={batch!.packagedDate} last />
          </div>
        </Card>

        {/* Lab report */}
        <Card
          title="Lab Report"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h6M9 17h4"/></svg>}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(0,180,216,0.08)" }}>
            <span style={{ color: "rgba(1,42,74,0.45)", fontSize: "0.76rem" }}>Lab Status</span>
            <AquaBadge label={batch!.labStatus} />
          </div>
          <Row label="Lab" value={batch!.labName} />
          <Row label="Antibiotic Residue" value={batch!.antibioticResult} accent />
          <Row label="Heavy Metals" value={batch!.heavyMetals} accent />
          <Row label="Microbial Count" value={batch!.microbialCount} accent />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
            <span style={{ color: "rgba(1,42,74,0.45)", fontSize: "0.76rem" }}>FSSAI</span>
            <GoldBadge label="FSSAI Certified" />
          </div>
        </Card>

        {/* Cold chain */}
        <Card
          title="Cold Chain Status"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="2"><path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/></svg>}
        >
          <Row label="Temperature" value={batch!.tempRange} accent />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(0,180,216,0.08)" }}>
            <span style={{ color: "rgba(1,42,74,0.45)", fontSize: "0.76rem" }}>Status</span>
            <AquaBadge label="Maintained" />
          </div>
          <Row label="Storage" value={batch!.storageFacility} />
          {/* Score bar */}
          <div style={{ padding: "14px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "rgba(1,42,74,0.35)", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Compliance Score
              </span>
              <span style={{ color: "#0096c7", fontFamily: "monospace", fontSize: "0.72rem", fontWeight: 700 }}>
                {batch!.tempScore}%
              </span>
            </div>
            <div style={{ height: 6, background: "rgba(0,180,216,0.1)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 999,
                background: "linear-gradient(90deg, #0891b2, #00b4d8)",
                width: `${batch!.tempScore}%`,
              }} />
            </div>
          </div>
        </Card>

        {/* Verified seal */}
        <div style={{
          background: "white",
          borderRadius: 18,
          border: "1px solid rgba(0,180,216,0.15)",
          padding: 16, textAlign: "center",
          boxShadow: "0 2px 16px rgba(0,150,200,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <span style={{ color: "#0096c7", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              QR Verified Seal
            </span>
          </div>
          <p style={{ color: "rgba(1,42,74,0.35)", fontSize: "0.6rem", lineHeight: 1.7 }}>
            Verified through DAKH Traceability System<br />
            From Andhra Coast to Your Kitchen<br />
            Every batch traceable. Scan Freshness. Taste Trust.
          </p>
        </div>

        {/* Share row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <a
            href={`https://wa.me/?text=${waShare}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "rgba(37,211,102,0.08)",
              border: "1px solid rgba(37,211,102,0.25)",
              color: "#25D366",
              fontSize: "0.75rem", fontWeight: 600,
              padding: 12, borderRadius: 14,
              textDecoration: "none",
            }}
          >
            Share
          </a>
          <Link
            href="/"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,180,216,0.06)",
              border: "1px solid rgba(0,180,216,0.18)",
              color: "#0096c7",
              fontSize: "0.75rem", fontWeight: 600,
              padding: 12, borderRadius: 14,
              textDecoration: "none",
            }}
          >
            ← Back to Shop
          </Link>
        </div>

        {/* Order CTA */}
        <div style={{
          background: "linear-gradient(160deg, #023e8a, #012a4a)",
          borderRadius: 20, padding: 20,
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(1,42,74,0.2)",
        }}>
          <h2 style={{
            fontFamily: "var(--font-playfair)",
            color: "white", fontWeight: 800,
            fontSize: "1.3rem", lineHeight: 1.3,
            marginBottom: 6,
          }}>
            Love this batch?<br />Order it now.
          </h2>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", fontWeight: 300, marginBottom: 16, lineHeight: 1.6 }}>
            Same traceability guaranteed on every order.<br />
            From Andhra Coast to Your Kitchen.
          </p>
          <a
            href={`https://wa.me/${WA}?text=${waOrder}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "#25D366", color: "white",
              fontWeight: 700, fontSize: "0.92rem",
              padding: "14px 28px", borderRadius: 14,
              textDecoration: "none",
              boxShadow: "0 6px 20px rgba(37,211,102,0.3)",
            }}
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
