"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { runEngine, EngineResult, EngineResponse } from "@/lib/engine";
import { parseQuery } from "@/lib/parser";
import { actors } from "@/data/actors";
import { arenaContent, ArenaContent } from "@/data/arenaContent";
import { ShareSignal } from "@/components/ShareSignal";

/* ═══════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════ */

type SortKey = "scale" | "stability" | "momentum";
type ActorCard = EngineResult & { migration: string };

/* ═══════════════════════════════════════════════════════════════════
   NARRATIVE BUILDERS — unchanged from arena
═══════════════════════════════════════════════════════════════════ */

function narrativeSingle(r: EngineResult): string {
  const tierLabel =
    r.tier === 1 ? "Tier 1 mega-cap anchor"
    : r.tier === 2 ? "Tier 2 mid-cap operator"
    : "Tier 3 emerging asset";

  const stabilityLine =
    r.riskBand === "Controlled"
      ? "ROI volatility is tightly controlled — a rare trait at scale."
      : r.riskBand === "Balanced"
      ? "ROI volatility sits in a balanced band — manageable for most producers."
      : "ROI volatility is elevated, making capital deployment a calculated risk.";

  const migrationLine =
    r.migration !== "N/A"
      ? ` Recent ROI momentum signals ${r.migration.toLowerCase()} migration probability toward Tier ${r.tier - 1}.`
      : "";

  return `${r.name} is classified as a ${tierLabel} with a Scale Index of ${r.scaleIndex}. ` +
    `Opening-day strength sits at ₹${r.openingCr}Cr, with a career gross ceiling of ₹${r.maxGross}Cr. ` +
    `Stability Index: ${r.stabilityIndex}. ${stabilityLine}${migrationLine}`;
}

function narrativePredict(r: EngineResult, targetTier: number): string {
  const tierThreshold = targetTier === 1 ? 60 : 30;
  const isAlready = r.tier === targetTier;
  const isUpgrade = targetTier < r.tier;
  const isDowngrade = targetTier > r.tier;

  if (isAlready) {
    const hold =
      r.riskBand === "High"
        ? `However, elevated ROI volatility (${r.stabilityIndex} Stability Index) means this position requires consistent delivery to hold.`
        : `With ${r.riskBand.toLowerCase()} risk and SI ${r.scaleIndex}, the position is structurally stable.`;
    return `${r.name} already operates at Tier ${r.tier}. ${hold}`;
  }

  if (isUpgrade) {
    const gap = tierThreshold - r.openingCr;
    if (gap <= 0) {
      return `${r.name}'s opening strength (₹${r.openingCr}Cr) already clears the ₹${tierThreshold}Cr threshold for Tier ${targetTier}. ` +
        `The current Tier ${r.tier} classification reflects ROI volatility drag (${r.riskBand} risk band). ` +
        `If consistency improves, a Tier ${targetTier} reclassification is structurally viable.`;
    }
    const migrationLine =
      r.migration === "High"
        ? `Migration signal is High — ROI momentum is building. But capital crossover needs ₹${gap}Cr more in opening strength.`
        : r.migration === "Moderate"
        ? `Migration signal is Moderate. Progress is measurable, but ₹${gap}Cr opening gap makes near-term Tier ${targetTier} unlikely without a breakout release.`
        : `Migration signal is Low. Recent ROI doesn't support the trajectory needed to close the ₹${gap}Cr opening gap.`;

    return `${r.name} is currently Tier ${r.tier} with SI ${r.scaleIndex}. ` +
      `To reach Tier ${targetTier}, opening-day performance must cross ₹${tierThreshold}Cr — ` +
      `currently ₹${r.openingCr}Cr, a gap of ₹${gap}Cr. ${migrationLine}`;
  }

  if (isDowngrade) {
    const buffer = r.openingCr - tierThreshold;
    const safe =
      r.riskBand === "Controlled" || r.riskBand === "Balanced"
        ? `With ${r.riskBand.toLowerCase()} volatility and a ₹${buffer}Cr buffer above the tier threshold, a drop is not imminent.`
        : `Elevated volatility (${r.riskBand} risk) and a ₹${buffer}Cr buffer above the threshold means the position is watchable but not immediately threatened.`;
    return `${r.name} is Tier ${r.tier} — a fall to Tier ${targetTier} would require sustained opening failures below ₹${tierThreshold}Cr. ` +
      `Current opening band: ₹${r.openingCr}Cr. ${safe}`;
  }

  return `${r.name} — Tier ${r.tier} | SI ${r.scaleIndex}. Target Tier ${targetTier} analysis unavailable.`;
}

function narrativeComparison(left: EngineResult, right: EngineResult, winner: string): string {
  const tierDiff = left.tier !== right.tier;
  const winnerData = winner === left.name ? left : right;
  const loserData  = winner === left.name ? right : left;

  if (tierDiff) {
    return `${winnerData.name} holds the structural edge at Tier ${winnerData.tier} versus ${loserData.name}'s Tier ${loserData.tier}. ` +
      `Tier advantage is the primary differentiator here — SI scores of ${winnerData.scaleIndex} vs ${loserData.scaleIndex} confirm the gap. ` +
      `${loserData.name} would need opening-day expansion to close this structural distance.`;
  }

  const siGap = Math.abs(left.scaleIndex - right.scaleIndex);
  return `Both ${left.name} and ${right.name} occupy Tier ${left.tier} — the comparison is decided at the Scale Index level. ` +
    `${winnerData.name} leads with SI ${winnerData.scaleIndex} vs ${loserData.scaleIndex} — a margin of ${siGap.toFixed(1)} points. ` +
    (siGap < 3
      ? `This is an extremely tight capital contest. Volatility band and recent ROI momentum separate them at the margin.`
      : `${winnerData.name}'s advantage comes from superior gross ceiling and PanIndia reach.`);
}

/* ═══════════════════════════════════════════════════════════════════
   CONTENT RETRIEVAL
═══════════════════════════════════════════════════════════════════ */

function findRelatedContent(names: string[], tier?: number): ArenaContent[] {
  const normalised = names.map(n => n.toLowerCase());
  return arenaContent.filter(c => {
    const actorMatch = c.actors.some(a => normalised.includes(a.toLowerCase()));
    const tierMatch  = tier !== undefined && c.tierFocus === tier;
    return actorMatch || tierMatch;
  });
}

/* ═══════════════════════════════════════════════════════════════════
   TIER COLOR MAP
═══════════════════════════════════════════════════════════════════ */

const TIER_COLORS: Record<number, string> = {
  1: "#D4AF37",   // Tier Gold
  2: "#4DA3FF",   // Tier Blue
  3: "#2EC4B6",   // Tier Teal
};

const TIER_BG: Record<number, string> = {
  1: "rgba(212,175,55,0.08)",
  2: "rgba(77,163,255,0.08)",
  3: "rgba(46,196,182,0.08)",
};

const RISK_COLORS: Record<string, string> = {
  Controlled: "#4ade80",
  Balanced:   "#fbbf24",
  High:       "#f87171",
};

/* ═══════════════════════════════════════════════════════════════════
   ACTOR PORTRAIT — circular image with tier ring + initials fallback
═══════════════════════════════════════════════════════════════════ */

function actorSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function ActorPortrait({ name, tier, size = 72 }: { name: string; tier: number; size?: number }) {
  const [err, setErr] = useState(false);
  const ringColor = ({ 1: "rgba(212,175,55,0.7)", 2: "rgba(77,163,255,0.6)", 3: "rgba(46,196,182,0.55)" } as Record<number,string>)[tier] ?? "rgba(255,255,255,0.2)";
  const initials = name.split(" ").map((w: string) => w[0]).slice(0, 2).join("");
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${ringColor}`, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 14px ${ringColor}` }}>
      {!err ? (
        <img src={`/actors/images/${actorSlug(name)}.webp`} alt={name} width={size} height={size} loading="lazy" onError={() => setErr(true)} style={{ objectFit: "cover", objectPosition: "top center", width: "100%", height: "100%" }} />
      ) : (
        <span style={{ fontSize: size * 0.3, fontWeight: 800, color: ringColor, letterSpacing: "0.02em" }}>{initials}</span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ACTOR CARD COMPONENT
═══════════════════════════════════════════════════════════════════ */

function ActorCardItem({
  data,
  onCompare,
  onInspect,
}: {
  data: EngineResult;
  onCompare: (name: string) => void;
  onInspect: (name: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const tierColor = TIER_COLORS[data.tier];
  const tierBg    = TIER_BG[data.tier];

  return (
    <div
      className={`sq-actor-card sq-tier-${data.tier}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderColor: hovered ? tierColor : `${tierColor}44` }}
    >
      {/* Tier badge */}
      <div className="sq-tier-badge" style={{ background: tierBg, color: tierColor }}>
        T{data.tier}
      </div>

      {/* Portrait */}
      <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 8px" }}>
        <ActorPortrait name={data.name} tier={data.tier} size={68} />
      </div>

      {/* Name */}
      <h3 className="sq-card-name">{data.name}</h3>

      {/* Primary metrics */}
      <div className="sq-card-metrics">
        <div className="sq-metric">
          <span className="sq-metric-label">Scale</span>
          <span className="sq-metric-value" style={{ color: tierColor }}>{data.scaleIndex}</span>
        </div>
        <div className="sq-metric">
          <span className="sq-metric-label">Stability</span>
          <span className="sq-metric-value">{data.stabilityIndex}</span>
        </div>
        <div className="sq-metric">
          <span className="sq-metric-label">Opening</span>
          <span className="sq-metric-value">₹{data.openingCr}Cr</span>
        </div>
      </div>

      {/* Risk band */}
      <div className="sq-risk-row">
        <span className="sq-risk-dot" style={{ background: RISK_COLORS[data.riskBand] }} />
        <span className="sq-risk-label">{data.riskBand} Risk</span>
        {data.migration !== "N/A" && (
          <span className="sq-migration-tag">{data.migration} Migration</span>
        )}
      </div>

      {/* Hover overlay actions */}
      {hovered && (
        <div className="sq-card-actions">
          <button className="sq-action-btn" onClick={() => onInspect(data.name)}>
            Inspect
          </button>
          <button className="sq-action-btn sq-action-secondary" onClick={() => onCompare(data.name)}>
            Compare
          </button>
        </div>
      )}

      {/* Gross ceiling bar */}
      <div className="sq-gross-bar-track">
        <div
          className="sq-gross-bar-fill"
          style={{
            width: `${Math.min((data.maxGross / 1810) * 100, 100)}%`,
            background: tierColor,
          }}
        />
      </div>
      <p className="sq-gross-label">₹{data.maxGross}Cr gross ceiling</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TIER RISK PANEL — "who is most risky in tier 2"
═══════════════════════════════════════════════════════════════════ */

const RISK_COLORS_MAP: Record<string, string> = {
  High: "#f87171", Balanced: "#fbbf24", Controlled: "#4ade80",
};

function TierRiskPanel({ data, onRequery }: { data: { tier: number; actors: EngineResult[] }; onRequery: (q: string) => void }) {
  const top = data.actors[0];
  const riskColor = RISK_COLORS_MAP[top.riskBand] ?? "#ffffff";
  return (
    <div className="sq-intel-output sq-tier-risk fade-in" style={{ borderLeftColor: riskColor }}>
      <div className="sq-intel-tag">Volatility Analysis · Tier {data.tier}</div>
      <h2 className="sq-intel-name">{top.name}</h2>
      <p style={{ color: riskColor, fontWeight: 700, fontSize: 15, margin: "4px 0 8px" }}>
        {top.riskBand} Risk Band
      </p>
      <p className="sq-intel-meta">
        Stability Index: <strong>{top.stabilityIndex}</strong> &nbsp;·&nbsp;
        Tier: <strong style={{ color: TIER_COLORS[top.tier] }}>T{top.tier}</strong> &nbsp;·&nbsp;
        Opening: ₹{top.openingCr}Cr
      </p>
      <p className="sq-intel-narrative">
        {top.name} carries the highest capital volatility in Tier {data.tier} with a Stability Index of{" "}
        {top.stabilityIndex} and {top.riskBand} Risk classification. ROI standard deviation signals wide
        performance swings — budget exposure must be carefully calibrated against the tolerance ceiling.
      </p>

      {/* All tier actors ranked by risk */}
      {data.actors.length > 1 && (
        <div style={{ marginTop: 16 }}>
          <div className="sq-explain-section-label" style={{ marginBottom: 8 }}>
            All Tier {data.tier} actors ranked by volatility
          </div>
          {data.actors.map((a, i) => (
            <div key={a.name} className="sq-topn-row" onClick={() => onRequery(a.name)}
              style={{ cursor: "pointer", marginBottom: 4 }}>
              <span className="sq-topn-rank">#{i + 1}</span>
              <span className="sq-topn-name">{a.name}</span>
              <div className="sq-topn-metrics">
                <span className="sq-topn-metric">
                  <span className="sq-topn-metric-label">Risk</span>
                  <strong style={{ color: RISK_COLORS_MAP[a.riskBand] }}>{a.riskBand}</strong>
                </span>
                <span className="sq-topn-metric">
                  <span className="sq-topn-metric-label">Stability</span>
                  <strong>{a.stabilityIndex}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Producer CTA */}
      <a href="/signal" className="sq-volatility-cta">
        🟡 View Volatility Model — Producer Access
      </a>

      {/* Next moves */}
      <div className="sq-next-moves" style={{ marginTop: 16 }}>
        <div className="sq-next-moves-title">Explore Further</div>
        <div className="sq-next-moves-chips">
          <button className="sq-next-chip" onClick={() => onRequery(top.name)}>{top.name} full profile</button>
          <button className="sq-next-chip" onClick={() => onRequery(`most stable in tier ${data.tier}`)}>Most stable in Tier {data.tier}</button>
          <button className="sq-next-chip" onClick={() => onRequery("what is risk band")}>What is Risk Band?</button>
          <button className="sq-next-chip" onClick={() => onRequery("what is volatility")}>What is Volatility?</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   INTELLIGENCE OUTPUT RENDERER
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   CONTEXTUAL FOLLOW-UP CHIPS
   Appears after EVERY result type to keep the intelligence loop alive.
   Chips are generated from the current result context — actor, tier,
   comparison subjects, etc. — so they always feel relevant.
═══════════════════════════════════════════════════════════════════ */

function FollowUpChips({
  chips,
  onRequery,
}: {
  chips: { label: string; query: string }[];
  onRequery: (q: string) => void;
}) {
  if (!chips.length) return null;
  return (
    <div className="sq-next-moves" style={{ marginTop: 18 }}>
      <div className="sq-next-moves-title">Explore Further</div>
      <div className="sq-next-moves-chips">
        {chips.map((c, i) => (
          <button key={i} className="sq-next-chip" onClick={() => onRequery(c.query)}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Chip generators per context ── */

function chipsForSingle(r: EngineResult): { label: string; query: string }[] {
  const nextTier = r.tier > 1 ? r.tier - 1 : null;
  const peers = r.tier === 1
    ? ["Jr NTR", "Ram Charan", "Mahesh Babu"].filter(n => n !== r.name)
    : r.tier === 2
    ? ["Nithiin", "Naga Chaitanya", "Akhil Akkineni"].filter(n => n !== r.name)
    : ["Naveen Polishetty", "Nikhil Siddhartha", "Raj Tarun"].filter(n => n !== r.name);
  const chips: { label: string; query: string }[] = [];
  if (nextTier) chips.push({ label: `Will ${r.name} reach Tier ${nextTier}?`, query: `will ${r.name} become tier ${nextTier}` });
  if (peers[0]) chips.push({ label: `${r.name} vs ${peers[0]}`, query: `${r.name} vs ${peers[0]}` });
  chips.push({ label: `Why Tier ${r.tier}?`, query: `why is ${r.name} tier ${r.tier}` });
  chips.push({ label: `What is ${r.riskBand} Risk?`, query: `what is ${r.riskBand} risk` });
  chips.push({ label: "Top 5 by Scale", query: "top 5 by scale" });
  return chips;
}

function chipsForPredict(r: EngineResult, targetTier: number): { label: string; query: string }[] {
  const chips: { label: string; query: string }[] = [];
  chips.push({ label: `${r.name} full profile`, query: r.name });
  chips.push({ label: `What is Migration?`, query: "what is migration" });
  if (r.tier > 1) chips.push({ label: `Closest to Tier ${r.tier - 1}`, query: `closest to tier ${r.tier - 1}` });
  chips.push({ label: `Most stable in Tier ${r.tier}`, query: `most stable in tier ${r.tier}` });
  chips.push({ label: `Top 5 by Momentum`, query: "top 5 by momentum" });
  return chips;
}

function chipsForComparison(left: EngineResult, right: EngineResult, winner: string): { label: string; query: string }[] {
  const loser = winner === left.name ? right.name : left.name;
  const winnerTier = winner === left.name ? left.tier : right.tier;
  const chips: { label: string; query: string }[] = [];
  chips.push({ label: `${winner} full profile`, query: winner });
  chips.push({ label: `${loser} full profile`, query: loser });
  chips.push({ label: `Will ${loser} reach Tier ${Math.max(1, winnerTier)}?`, query: `will ${loser} become tier ${Math.max(1, winnerTier)}` });
  chips.push({ label: "Top 5 by Scale", query: "top 5 by scale" });
  chips.push({ label: `Most stable in Tier ${winnerTier}`, query: `most stable in tier ${winnerTier}` });
  return chips;
}

function chipsForTopN(label: string, actors: EngineResult[]): { label: string; query: string }[] {
  const chips: { label: string; query: string }[] = [];
  const top = actors[0];
  if (!top) return chips;
  // Detect context from label
  const isStability = /stable/i.test(label);
  const isTier1 = /tier 1/i.test(label);
  const isTier2 = /tier 2/i.test(label);
  const isTier3 = /tier 3/i.test(label);
  const tier = isTier1 ? 1 : isTier2 ? 2 : isTier3 ? 3 : null;

  chips.push({ label: `${top.name} full profile`, query: top.name });
  if (actors[1]) chips.push({ label: `${top.name} vs ${actors[1].name}`, query: `${top.name} vs ${actors[1].name}` });
  if (isStability) {
    chips.push({ label: `What is Stability Index?`, query: "what is stability index" });
    if (tier) chips.push({ label: `Most volatile in Tier ${tier}`, query: `most volatile in tier ${tier}` });
  } else {
    chips.push({ label: `What is Scale Index?`, query: "what is scale index" });
    if (tier) chips.push({ label: `Most stable in Tier ${tier}`, query: `most stable in tier ${tier}` });
  }
  chips.push({ label: "Top 5 by Momentum", query: "top 5 by momentum" });
  return chips;
}

function chipsForTierCheck(r: EngineResult): { label: string; query: string }[] {
  return [
    { label: `${r.name} full profile`, query: r.name },
    { label: `Why Tier ${r.tier}?`, query: `why is ${r.name} tier ${r.tier}` },
    { label: `Most stable in Tier ${r.tier}`, query: `most stable in tier ${r.tier}` },
    { label: `What is Tier System?`, query: "what is tier" },
  ];
}

function chipsForTierExplain(r: EngineResult): { label: string; query: string }[] {
  const chips: { label: string; query: string }[] = [];
  if (r.tier > 1) chips.push({ label: `Will ${r.name} reach Tier ${r.tier - 1}?`, query: `will ${r.name} become tier ${r.tier - 1}` });
  chips.push({ label: `${r.name} vs ${r.tier === 1 ? "Prabhas" : "Allu Arjun"}`, query: `${r.name} vs ${r.tier === 1 ? "Prabhas" : "Allu Arjun"}` });
  chips.push({ label: `Most stable in Tier ${r.tier}`, query: `most stable in tier ${r.tier}` });
  chips.push({ label: "What is Scale Index?", query: "what is scale index" });
  return chips;
}

const HINT_QUERIES = [
  "Will Vijay become Tier 1?",
  "Can Naveen enter Tier 2?",
  "Will Pawan fall to Tier 2?",
  "allu arjun vs prabhas",
  "nani stats",
];

function IntelligencePanel({
  response,
  onRequery,
}: {
  response: EngineResponse;
  onRequery: (q: string) => void;
}) {
  if (response.type === "error") {
    const msg = response.message;

    // ── Signal boundary card ──
    if (msg === "SIGNAL_BOUNDARY") {
      return (
        <div className="sq-intel-output sq-signal-boundary fade-in">
          <div className="sq-intel-tag">Producer Intelligence Layer</div>
          <h2 className="sq-intel-name" style={{ fontSize: 20 }}>StarsQSignal</h2>
          <p className="sq-intel-narrative">
            Safe investment bands, capital risk simulations, and ROI recovery projections are producer-only tools — available inside StarsQSignal.
          </p>
          <div className="sq-signal-badge">Producer Access Required</div>
        </div>
      );
    }

    // ── SQ Glossary — scientific definitions for all terms ──
    if (msg.startsWith("SQ_GLOSSARY:")) {
      const termKey = msg.replace("SQ_GLOSSARY:", "");
      const SQ_DEFS: Record<string, {
        tag: string; title: string; formula?: string;
        short: string; detail: string;
        signals: string[];
        examples?: { name: string; value: string; note: string }[];
        followUps: string[];
      }> = {
        "stability index": {
          tag: "Capital Metric", title: "Stability Index",
          formula: "100 − (ROI_stdDev × 50)",
          short: "How predictable an actor's box office performance is across films.",
          detail: "Derived from ROI standard deviation across career. A Stability Index of 85+ means the actor delivers within a tight performance band film after film — producers can model capital return with confidence. Below 60 signals high swing risk: one film can be a blockbuster, the next a failure. It does not measure fame or quality — only capital predictability.",
          signals: ["85–100 → Controlled risk, reliable pre-release capital signal", "60–84 → Balanced band, manageable deployment risk", "Below 60 → High volatility, budget ceiling is non-negotiable"],
          examples: [{ name: "Allu Arjun", value: "SI 85.5", note: "ROI stdDev 0.29 — tightest band in Tier 1" }, { name: "Prabhas", value: "SI 45.5", note: "ROI stdDev 1.09 — wide swing between Baahubali and Radhe Shyam" }],
          followUps: ["Who is most stable in Tier 1?", "allu arjun stats", "what is volatility", "top 5 by stability"],
        },
        "scale index": {
          tag: "Capital Metric", title: "Scale Index",
          formula: "Normalized Gross Ceiling (40%) + PanIndia Viability (30%) + Budget Tolerance Score (30%)",
          short: "Composite score measuring how large an actor's capital footprint can grow.",
          detail: "Three signals combined: gross ceiling (peak WW gross, normalized), PanIndia viability (0–100, how broadly the actor draws across all language markets), and budget tolerance (largest budget with positive ROI). Weights gross ceiling heaviest because it defines the upper boundary of the capital envelope. An actor can have strong opening but limited scale if they draw from a single region.",
          signals: ["90+ → Mega-cap, can anchor ₹300–600Cr productions nationally", "70–89 → Large-cap, strong regional + partial national draw", "Below 70 → Mid/small-cap, ceiling constrained"],
          examples: [{ name: "Prabhas", value: "SI 97", note: "100% PanIndia, ₹1810Cr ceiling, ₹600Cr budget tolerance" }, { name: "Nani", value: "SI 62.5", note: "Strong Telugu base but limited cross-market draw" }],
          followUps: ["Prabhas stats", "allu arjun vs prabhas", "who has highest scale", "what is stability index"],
        },
        "tier": {
          tag: "Classification System", title: "Capital Tier System",
          formula: "Tier 1: opening ≥₹60Cr · Tier 2: ₹30–59Cr · Tier 3: <₹30Cr",
          short: "Three-band classification of actors by opening-day capital pull.",
          detail: "StarsQ uses opening-day performance as the primary signal because it isolates the actor's raw capital draw before word of mouth, critical reception, or content quality can amplify collections. A Tier 1 actor generates massive pre-release ticket demand regardless of the film. Tier 2 actors are bankable at mid-scale. Tier 3 actors are emerging — their value lies in ROI efficiency and migration potential.",
          signals: ["Tier 1 (₹60Cr+ opening) → Mega-cap national anchor", "Tier 2 (₹30–59Cr opening) → Mid-cap operator, scalable with right content", "Tier 3 (<₹30Cr opening) → Emerging, tracked for migration signal"],
          examples: [{ name: "Prabhas", value: "Tier 1", note: "₹150Cr opening — highest in registry" }, { name: "Nani", value: "Tier 2", note: "₹35Cr opening — strong regional mid-cap" }],
          followUps: ["show Tier 1 actors", "who is closest to Tier 1?", "will Nani reach Tier 1?", "what is Scale Index?"],
        },
        "roi": {
          tag: "Financial Metric", title: "Return on Investment (ROI)",
          formula: "ROI = WW Gross ÷ Production Budget",
          short: "Box office gross divided by production budget — the core capital efficiency signal.",
          detail: "StarsQ tracks ROI across two windows: last 3 films (momentum signal) and career average (volatility signal). A film grossing ₹90Cr on an ₹18Cr budget delivers ROI of 5.0 — exceptional. A ₹250Cr film grossing ₹200Cr delivers 0.8 — capital loss. High ROI on a small budget does not make an actor Tier 1. High ROI on a large budget at scale defines sustained capital viability.",
          signals: ["ROI > 2.0 → Strong capital efficiency, producer-favourable", "ROI 1.0–2.0 → Break-even to moderate return", "ROI < 1.0 → Capital loss territory"],
          examples: [{ name: "Teja Sajja", value: "Last 3 ROI: 3.46", note: "Hanu-Man (7.41) drove average up sharply" }, { name: "Ram Charan", value: "Last 3 ROI: 0.36", note: "Recent films below break-even" }],
          followUps: ["Teja Sajja stats", "what is migration", "top 5 by momentum", "what is stability index"],
        },
        "pan india": {
          tag: "Capital Metric", title: "PanIndia Viability",
          formula: "Score 0–100 across 5 markets: Telugu · Tamil · Hindi · Malayalam · Kannada",
          short: "How broadly an actor draws ticket demand beyond their home language market.",
          detail: "PanIndia viability directly expands the gross ceiling. An actor pulling exclusively from Telugu (score ~30) has a hard ceiling regardless of content quality. An actor drawing equally across all five markets (score 95–100) can multiply the gross 3–5x on the same budget. This is the key variable separating a ₹300Cr gross ceiling from a ₹1500Cr one.",
          signals: ["Score 90–100 → True PanIndia, all five markets active", "Score 50–89 → Regional + partial national draw", "Score < 50 → Primarily single-market, ceiling constrained"],
          examples: [{ name: "Prabhas", value: "Score: 100", note: "Equal draw across all 5 markets post-Baahubali" }, { name: "Mahesh Babu", value: "Score: 70", note: "Strong Telugu + partial Hindi, Tamil weaker" }],
          followUps: ["Prabhas vs Allu Arjun", "who has highest scale", "what is scale index", "top 5 by scale"],
        },
        "migration": {
          tag: "Momentum Signal", title: "Migration Signal",
          formula: "last 3 films avg ROI → High: >1.5 · Moderate: 0.8–1.5 · Low: <0.8 (Tier 3 only)",
          short: "Probability of a Tier 3 actor crossing into Tier 2 based on recent ROI trajectory.",
          detail: "Migration is only tracked for Tier 3 actors because Tier 1 and 2 positions are structurally stable. The signal uses last 3 films average ROI — not career average — because recent momentum better predicts near-term opening growth. A High migration signal means the actor is building consistent capital efficiency. But actual tier migration still requires opening-day expansion.",
          signals: ["High → Last 3 ROI avg >1.5, strong upward trajectory", "Moderate → 0.8–1.5, progress measurable but not decisive", "Low → Below 0.8, recent films not building momentum"],
          examples: [{ name: "Naveen Polishetty", value: "High Migration", note: "Last 3 ROI avg 3.86 — strongest signal in Tier 3" }, { name: "Nikhil Siddhartha", value: "High Migration", note: "Karthikeya 2 changed the trajectory" }],
          followUps: ["top 5 by momentum", "Naveen Polishetty stats", "who is closest to Tier 1?", "what is ROI?"],
        },
        "volatility": {
          tag: "Risk Metric", title: "ROI Volatility",
          formula: "Standard deviation of ROI across career films",
          short: "Dispersion of box office returns — measures how unpredictable an actor's performance is.",
          detail: "High volatility means the actor has produced both extreme outliers and significant failures. Low volatility means consistent band performance. Volatility is not inherently negative — Prabhas has high volatility because Baahubali was an outlier. From a capital deployment perspective, high volatility means producers cannot reliably model returns. ROI stdDev directly determines the Risk Band classification.",
          signals: ["StdDev < 0.3 → Controlled, predictable capital return", "StdDev 0.3–0.7 → Balanced, manageable swing", "StdDev > 0.7 → High, significant return uncertainty"],
          examples: [{ name: "Allu Arjun", value: "0.29 stdDev", note: "Tightest in Tier 1" }, { name: "Adivi Sesh", value: "1.95 stdDev", note: "Highest in registry — Major vs Minor" }],
          followUps: ["who is most risk actor in tier 1", "allu arjun stats", "what is risk band", "what is stability index"],
        },
        "gross ceiling": {
          tag: "Capital Metric", title: "Gross Ceiling",
          formula: "maxGross = career peak WW gross (₹Cr)",
          short: "The highest worldwide gross an actor has ever generated — the top of their capital envelope.",
          detail: "Gross ceiling is the empirical upper boundary of what an actor's name can pull at the box office under ideal conditions. It is a ceiling, not an expectation. Deploying capital expecting ceiling performance on every film is a modelling error. The ceiling is used in Scale Index to weight the actor's potential expansion, not their average delivery.",
          signals: ["₹1000Cr+ → Mega-cap, franchise-capable", "₹200–999Cr → Large-cap, blockbuster range", "Below ₹200Cr → Regional or contained commercial scale"],
          examples: [{ name: "Prabhas", value: "₹1810Cr", note: "Baahubali 2 — highest in registry" }, { name: "Naveen Polishetty", value: "₹79Cr", note: "Jathi Ratnalu — punched above opening" }],
          followUps: ["Prabhas stats", "what is scale index", "allu arjun vs prabhas", "top 5 by scale"],
        },
        "budget tolerance": {
          tag: "Risk Metric", title: "Budget Tolerance",
          formula: "max(budget) where ROI ≥ 1.0 across career",
          short: "The highest production budget an actor has anchored with a positive return.",
          detail: "Budget tolerance defines the safe capital ceiling for an actor. Deploying above this ceiling historically results in capital loss — the actor's opening and gross ceiling cannot justify the production cost. It is a historical upper boundary, not a prediction. Producers can choose to exceed it, but the data does not support that decision.",
          signals: ["₹400Cr+ → Can anchor tentpole franchise productions", "₹100–400Cr → Mid-to-large scale viable", "Below ₹100Cr → ROI only works at contained budget scale"],
          examples: [{ name: "Prabhas", value: "₹600Cr", note: "KGF-scale justified by PanIndia draw" }, { name: "Naveen Polishetty", value: "₹20Cr", note: "Agent Sai at ₹75Cr exceeded tolerance" }],
          followUps: ["Prabhas stats", "what is ROI", "what is scale index", "allu arjun vs prabhas"],
        },
        "opening": {
          tag: "Primary Classification Signal", title: "Opening Day Performance",
          formula: "Tier 1: ≥₹60Cr · Tier 2: ₹30–59Cr · Tier 3: <₹30Cr",
          short: "Day-one box office — the cleanest measure of an actor's raw capital pull.",
          detail: "Opening day strips away all variables except the actor's name value: word of mouth hasn't circulated, reviews haven't spread, repeat viewing hasn't started. What remains is purely how many tickets the actor's name alone sells. This is capital pull in its purest form. Content quality affects Week 2 — but Day 1 is almost entirely actor-driven.",
          signals: ["₹100Cr+ → Phenomenon-tier, national cultural event", "₹60–100Cr → Mega-cap, reliable blockbuster infrastructure", "₹30–59Cr → Strong regional with national aspirations"],
          examples: [{ name: "Prabhas", value: "₹150Cr", note: "Highest in registry" }, { name: "Allu Arjun", value: "₹110Cr", note: "Pushpa 2 opening" }],
          followUps: ["Prabhas stats", "what is tier system", "allu arjun vs jr ntr", "top 5 by scale"],
        },
        "capital intelligence": {
          tag: "Platform Definition", title: "Capital Intelligence",
          short: "The systematic application of financial frameworks to evaluate film actors as investable assets.",
          detail: "Capital intelligence treats actors not as celebrities but as economic instruments. Every actor in the registry is evaluated on opening-day strength, gross ceiling, ROI resilience, PanIndia reach, and volatility — the same dimensions used to evaluate any capital asset. StarsQ's intelligence layer translates these signals into tier classifications, migration probabilities, and risk bands that producers can use for deployment decisions.",
          signals: ["Opening → Raw capital draw (demand signal)", "Scale Index → Capital growth ceiling (expansion signal)", "Stability Index → Predictability of return (reliability signal)", "Migration → Upward trajectory momentum (growth signal)"],
          followUps: ["what is scale index", "what is tier system", "top 5 by scale", "allu arjun vs prabhas"],
        },
        "starsq": {
          tag: "Platform Definition", title: "StarsQ",
          short: "A Cinema Capital Intelligence Engine — not a fan ranking, a financial framework.",
          detail: "StarsQ applies investment analysis methodology to the Telugu film industry. Actors are treated as capital assets with quantifiable opening strength, gross ceilings, ROI volatility, and budget tolerance. The engine runs deterministic formulas — no opinion, no sentiment, no popularity weighting. Every classification, every tier, every risk band is the output of a defined mathematical model.",
          signals: ["Star Quantum → Public intelligence: tier, scale, stability, migration", "StarsQSignal → Producer layer: budget safety, ROI recovery, risk simulation"],
          followUps: ["what is capital intelligence", "what is scale index", "top 5 by scale", "allu arjun stats"],
        },
        "star quantum": {
          tag: "Platform Layer", title: "Star Quantum",
          short: "The public capital intelligence layer of StarsQ — exploration engine for actor metrics.",
          detail: "Star Quantum is where public capital intelligence lives: tier classifications, Scale Index rankings, migration analysis, head-to-head comparisons. It is built for exploration. The deeper layer, StarsQSignal, handles producer-specific modeling: budget safety bands, ROI probability curves, and capital risk scenarios.",
          signals: ["Available here → Actor profiles, tier checks, comparisons, migration, rankings", "Available in Signal → Budget safety, probability modeling, scenario forecasting"],
          followUps: ["what is capital intelligence", "top 5 by scale", "allu arjun vs prabhas", "who is closest to Tier 1?"],
        },
        "capital asset": {
          tag: "Framework Concept", title: "Capital Asset (Actor as Asset)",
          short: "An actor evaluated on financial dimensions: opening strength, gross ceiling, ROI, and volatility.",
          detail: "In StarsQ's framework, a capital asset is any actor whose box office performance can be modelled using investment-grade metrics. Tier 1 actors are mega-cap assets — they can anchor ₹300–600Cr productions. Tier 3 are micro-cap emerging assets — high upside potential, significant deployment risk.",
          signals: ["Tier 1 → Mega-cap anchor, national infrastructure", "Tier 2 → Mid-cap operator, scalable with right content", "Tier 3 → Emerging capital, track migration signal"],
          followUps: ["what is scale index", "what is tier system", "top 5 by scale", "what is migration"],
        },
        "momentum": {
          tag: "Capital Metric", title: "Momentum Index",
          formula: "Recent Trajectory × Stability Variance Adjustment",
          short: "Measures the acceleration of an actor's capital trajectory — not just current standing, but the direction and speed of movement.",
          detail: "Momentum tracks whether an actor's ROI and opening-day performance are improving, stable, or declining across their last 3 films. High momentum actors show consecutive ROI growth with rising opening strength. Closely tied to the Migration signal — a High Migration actor is, by definition, a High Momentum actor. Momentum is the velocity signal; tier is the position signal.",
          signals: ["High Momentum → Last 3 ROI avg >1.5, rising opening trend. Active migration signal.", "Moderate → ROI 0.8–1.5. Stable, progress measurable but not decisive.", "Low → ROI <0.8, no directional gain. Capital not building.", "Negative → Declining ROI across 3-film window. Depreciation risk."],
          examples: [
            { name: "Naveen Polishetty", value: "High Momentum", note: "Last 3 ROI avg 3.86 — strongest trajectory in Tier 3" },
            { name: "Teja Sajja", value: "High Momentum", note: "Last 3 ROI avg 3.46 — Hanu-Man drove sharp acceleration" },
            { name: "Ram Charan", value: "Negative Momentum", note: "Last 3 ROI avg 0.36 — recent films below break-even" },
          ],
          followUps: ["top 5 by momentum", "Naveen Polishetty stats", "what is migration", "who is closest to Tier 1?"],
        },
      };

      const def = SQ_DEFS[termKey];
      if (!def) {
        return (
          <div className="sq-intel-output sq-intel-error fade-in">
            <p style={{ color: "#f87171", margin: 0 }}>Term not found: "{termKey}"</p>
            <p className="sq-intel-sub" style={{ marginTop: 8 }}>
              Try: "what is scale index" · "what is tier" · "what is stability" · "what is capital intelligence"
            </p>
          </div>
        );
      }

      return (
        <div className="sq-intel-output fade-in">
          <div className="sq-intel-tag">{def.tag}</div>
          <h2 className="sq-intel-name">{def.title}</h2>
          {def.formula && (
            <div className="sq-glossary-formula">
              <span className="sq-glossary-formula-label">Formula</span>
              <code className="sq-glossary-formula-code">{def.formula}</code>
            </div>
          )}
          <p className="sq-intel-narrative" style={{ fontWeight: 600, fontSize: 15, color: "rgba(255,255,255,0.9)", marginBottom: 6 }}>{def.short}</p>
          <p className="sq-intel-narrative">{def.detail}</p>
          <div className="sq-glossary-signals">
            {def.signals.map((s, i) => (
              <div key={i} className="sq-glossary-signal-row">
                <span className="sq-glossary-signal-dot" />
                <span>{s}</span>
              </div>
            ))}
          </div>
          {def.examples && (
            <div className="sq-glossary-examples">
              <div className="sq-explain-section-label" style={{ marginBottom: 8 }}>Live Examples</div>
              <div className="sq-glossary-example-chips">
                {def.examples.map((ex, i) => (
                  <div key={i} className="sq-glossary-example-chip" onClick={() => onRequery(ex.name)}>
                    <div className="sq-glossary-ex-name">{ex.name}</div>
                    <div className="sq-glossary-ex-value">{ex.value}</div>
                    <div className="sq-glossary-ex-note">{ex.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="sq-glossary-followup">
            <div className="sq-next-moves-title" style={{ marginBottom: 8 }}>Explore Further</div>
            <div className="sq-next-moves-chips">
              {def.followUps.map((f, i) => (
                <button key={i} className="sq-next-chip" onClick={() => onRequery(f)}>{f}</button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── Risk band glossary card ──
    if (msg.startsWith("RISK_GLOSSARY:")) {
      const band = msg.replace("RISK_GLOSSARY:", "") as "High" | "Controlled" | "Balanced";
      const color = { High: "#f87171", Controlled: "#4ade80", Balanced: "#fbbf24" }[band];
      const GLOSSARY: Record<string, { title: string; desc: string; traits: string[]; examples: string[] }> = {
        High: {
          title: "High Risk Band",
          desc: "ROI standard deviation exceeds 0.9. Opens strongly on name recognition but performance is volatile — films can dramatically over or under-deliver. Past ROI shows wide swings across projects.",
          traits: ["Opening-dependent box office", "ROI stdDev > 0.9", "High budget tolerance mismatch", "Volatile across 3-film window"],
          examples: ["Prabhas (1.09)", "Vijay Deverakonda (1.20)", "Nikhil Siddhartha (1.66)", "Adivi Sesh (1.95)"],
        },
        Controlled: {
          title: "Controlled Risk Band",
          desc: "ROI standard deviation below 0.40. Opening matches projected range consistently. Capital deployed against this asset has the most predictable return envelope in the registry.",
          traits: ["Opening within ±15% of projection", "Consistent ROI across films", "ROI stdDev < 0.40", "Strongest pre-release capital signal"],
          examples: ["Allu Arjun (0.29)", "Nithin (0.38)"],
        },
        Balanced: {
          title: "Balanced Risk Band",
          desc: "ROI standard deviation between 0.40–0.89. Moderate opening predictability with occasional outlier films. Acceptable capital exposure for mid-to-large budget investments.",
          traits: ["Moderate opening variance", "Some ROI outliers", "ROI stdDev 0.40–0.89", "Budget ceiling is critical"],
          examples: ["Jr NTR (0.50)", "Naga Chaitanya (0.50)", "Ram Pothineni (0.66)", "Mahesh Babu (0.72)"],
        },
      };
      const info = GLOSSARY[band];
      return (
        <div className="sq-intel-output sq-risk-glossary fade-in" style={{ borderLeftColor: color }}>
          <div className="sq-intel-tag">Risk Classification</div>
          <h2 className="sq-intel-name" style={{ color }}>{info.title}</h2>
          <p className="sq-intel-narrative">{info.desc}</p>
          <div className="sq-risk-traits">
            {info.traits.map((t, i) => (
              <div key={i} className="sq-risk-trait"><span style={{ color }}>·</span> {t}</div>
            ))}
          </div>
          <div className="sq-risk-examples">
            <span className="sq-explain-section-label">Actors in this band</span>
            <div className="sq-risk-example-chips">
              {info.examples.map((e, i) => (
                <span key={i} className="sq-risk-example-chip" onClick={() => onRequery(e.split(" (")[0])}>
                  {e}
                </span>
              ))}
            </div>
          </div>
          <div className="sq-risk-other-bands">
            <span className="sq-explain-section-label">Compare other bands</span>
            <div className="sq-risk-band-btns">
              {["High", "Controlled", "Balanced"].filter(b => b !== band).map(b => (
                <button key={b} className="sq-explain-ask-btn" onClick={() => onRequery(`what is ${b} risk`)}>
                  {b} Risk →
                </button>
              ))}
            </div>
          </div>
          <FollowUpChips
            chips={[
              { label: `Who is most ${band === "High" ? "volatile" : "stable"} in Tier 1?`, query: band === "High" ? "most volatile in tier 1" : "most stable in tier 1" },
              { label: "Who is most risk in Tier 2?", query: "most risk actor in tier 2" },
              { label: "What is Volatility?", query: "what is volatility" },
              { label: "What is Stability Index?", query: "what is stability index" },
              { label: "Top 5 by Stability", query: "top 5 by stability" },
            ]}
            onRequery={onRequery}
          />
        </div>
      );
    }

    // ── Risk overview (no band specified) ──
    if (msg === "RISK_OVERVIEW") {
      return (
        <div className="sq-intel-output fade-in">
          <div className="sq-intel-tag">Risk Classification System</div>
          <p className="sq-intel-narrative">StarsQ classifies every actor across three risk bands based on ROI standard deviation across their last 3 films.</p>
          <div className="sq-risk-band-btns" style={{ marginTop: 16 }}>
            {[
              { band: "Controlled", color: "#4ade80" },
              { band: "Balanced", color: "#fbbf24" },
              { band: "High", color: "#f87171" },
            ].map(({ band, color }) => (
              <button key={band} className="sq-explain-ask-btn" onClick={() => onRequery(`what is ${band} risk`)}
                style={{ borderColor: `${color}40`, color }}>
                {band} Risk →
              </button>
            ))}
          </div>
          <FollowUpChips
            chips={[
              { label: "Who is most stable in Tier 1?", query: "most stable in tier 1" },
              { label: "Most volatile in Tier 2?", query: "most volatile in tier 2" },
              { label: "Who is most risk in Tier 2?", query: "most risk actor in tier 2" },
              { label: "What is Stability Index?", query: "what is stability index" },
              { label: "Top 5 by Stability", query: "top 5 by stability" },
            ]}
            onRequery={onRequery}
          />
        </div>
      );
    }

    // ── Generic error ──
    return (
      <div className="sq-intel-output sq-intel-error">
        <p style={{ color: "#f87171", margin: 0 }}>{msg}</p>
        <p className="sq-intel-sub" style={{ marginTop: 8 }}>
          Try: actor name · "X vs Y" · "will X become tier 1" · "why is X tier 2" · "top 5 actors"
        </p>
      </div>
    );
  }

  if (response.type === "clarify-single") {
    return (
      <div className="sq-intel-output">
        <p className="sq-intel-clarify-label">Did you mean:</p>
        {response.options.map((opt, i) => (
          <div key={i} className="suggestion" onClick={() => onRequery(opt)}>{opt}</div>
        ))}
      </div>
    );
  }

  if (response.type === "clarify-comparison") {
    return (
      <div className="sq-intel-output">
        <p className="sq-intel-clarify-label">Clarify comparison:</p>
        {response.leftOptions.map((opt, i) => (
          <div key={"L" + i} className="suggestion"
            onClick={() => onRequery(`${opt} vs ${response.rightRaw}`)}>{opt}</div>
        ))}
        {response.rightOptions.map((opt, i) => (
          <div key={"R" + i} className="suggestion"
            onClick={() => onRequery(`${response.leftRaw} vs ${opt}`)}>{opt}</div>
        ))}
      </div>
    );
  }

  if (response.type === "single") {
    // Check if this is a tier-explain query (annotated by handleAnalyze)
    const explainTier = (response as any)._explainTier;
    if (explainTier !== undefined) {
      const r = response.data;
      const tierColor = TIER_COLORS[r.tier];
      // Tier thresholds from engine logic
      const T1_THRESHOLD = 60;
      const T2_THRESHOLD = 30;
      const gapToT1 = Math.max(T1_THRESHOLD - r.openingCr, 0);
      const gapToT2 = Math.max(T2_THRESHOLD - r.openingCr, 0);
      const isCorrectTier = r.tier === explainTier;

      const tierExplain = r.tier === 1
        ? `Opening ₹${r.openingCr}Cr exceeds the ₹${T1_THRESHOLD}Cr Tier 1 threshold. Combined with SI ${r.scaleIndex} and PanIndia reach, ${r.name} qualifies as a Tier 1 capital asset.`
        : r.tier === 2
        ? `Opening ₹${r.openingCr}Cr clears the ₹${T2_THRESHOLD}Cr Tier 2 floor but sits ₹${gapToT1}Cr below the ₹${T1_THRESHOLD}Cr Tier 1 threshold. Scale Index ${r.scaleIndex} reflects strong but sub-national reach.`
        : `Opening ₹${r.openingCr}Cr is below the ₹${T2_THRESHOLD}Cr Tier 2 floor (gap: ₹${gapToT2}Cr). Migration signal ${r.migration !== "N/A" ? r.migration : "not tracked"} — capital footprint still in development.`;

      const nextTierMsg = r.tier > 1
        ? `To reach Tier ${r.tier - 1}, opening must cross ₹${r.tier === 2 ? T1_THRESHOLD : T2_THRESHOLD}Cr — currently ₹${r.tier === 2 ? gapToT1 : gapToT2}Cr away.`
        : `${r.name} is already at the top tier.`;

      return (
        <>
          <div className="sq-intel-output sq-intel-explain" style={{ borderLeftColor: tierColor }}>
            <div className="sq-intel-tag">Tier Classification Explained</div>
            <div className="sq-explain-header">
              <h2 className="sq-intel-name">{r.name}</h2>
              <span className="sq-explain-tier-badge" style={{ color: tierColor }}>Tier {r.tier}</span>
            </div>

            <div className="sq-explain-reason">
              <div className="sq-explain-section-label">Why Tier {r.tier}?</div>
              <p className="sq-intel-narrative">{tierExplain}</p>
            </div>

            <div className="sq-explain-metrics">
              <div className="sq-explain-metric">
                <span className="sq-explain-metric-label">Opening Day</span>
                <span className="sq-explain-metric-value">₹{r.openingCr}Cr</span>
                <div className="sq-explain-threshold-bar">
                  <div className="sq-explain-threshold-fill" style={{
                    width: `${Math.min((r.openingCr / T1_THRESHOLD) * 100, 100)}%`,
                    background: tierColor
                  }} />
                  <div className="sq-explain-threshold-mark t1" style={{ left: "100%" }}>₹60Cr T1</div>
                </div>
              </div>
              <div className="sq-explain-metric">
                <span className="sq-explain-metric-label">Scale Index</span>
                <span className="sq-explain-metric-value">{r.scaleIndex}</span>
              </div>
              <div className="sq-explain-metric">
                <span className="sq-explain-metric-label">Stability Index</span>
                <span className="sq-explain-metric-value">{r.stabilityIndex}</span>
              </div>
              <div className="sq-explain-metric">
                <span className="sq-explain-metric-label">Risk Band</span>
                <span className="sq-explain-metric-value" style={{ color: RISK_COLORS[r.riskBand] }}>{r.riskBand}</span>
              </div>
            </div>

            {r.tier > 1 && (
              <div className="sq-explain-next-tier">
                <div className="sq-explain-section-label">Path to Tier {r.tier - 1}</div>
                <p className="sq-intel-narrative">{nextTierMsg}</p>
                <p className="sq-intel-narrative" style={{ marginTop: 4 }}>
                  Migration signal: <strong style={{ color: r.migration === "High" ? "#4ade80" : r.migration === "Moderate" ? "#facc15" : "#f87171" }}>
                    {r.migration !== "N/A" ? r.migration : "Not tracked"}
                  </strong>
                </p>
                <button
                  className="sq-explain-ask-btn"
                  onClick={() => onRequery(`will ${r.name} become tier ${r.tier - 1}`)}
                >
                  Run Migration Analysis →
                </button>
              </div>
            )}
            <FollowUpChips chips={chipsForTierExplain(r)} onRequery={onRequery} />
          </div>
          <ShareSignal payload={{ mode: "single", name: r.name, scaleIndex: r.scaleIndex, tier: r.tier, riskBand: r.riskBand }} />
        </>
      );
    }

    // Normal single profile

    const r = response.data;
    const related = findRelatedContent([r.name], r.tier);
    const tierColor = TIER_COLORS[r.tier];
    return (
      <>
        <div className="sq-intel-output" style={{ borderLeftColor: tierColor }}>
          <div className="sq-intel-tag">Capital Profile</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "10px 0 14px" }}>
            <ActorPortrait name={r.name} tier={r.tier} size={80} />
            <div>
              <h2 className="sq-intel-name" style={{ margin: 0 }}>{r.name}</h2>
              <p className="sq-intel-meta" style={{ margin: "4px 0 0" }}>
                SI <strong>{r.scaleIndex}</strong> &nbsp;·&nbsp; Tier <strong>{r.tier}</strong>
                &nbsp;·&nbsp; Stability {r.stabilityIndex} &nbsp;·&nbsp; Risk: {r.riskBand}
              </p>
            </div>
          </div>
          <p className="sq-intel-narrative">{narrativeSingle(r)}</p>
          <FollowUpChips chips={chipsForSingle(r)} onRequery={onRequery} />
        </div>
        <ShareSignal payload={{ mode: "single", name: r.name, scaleIndex: r.scaleIndex, tier: r.tier, riskBand: r.riskBand }} />
        {related.length > 0 && <ContentCards items={related} />}
      </>
    );
  }

  if (response.type === "predict") {
    const r = response.data;
    const related = findRelatedContent([r.name], r.tier);
    const isUpgrade   = response.targetTier < r.tier;
    const isDowngrade = response.targetTier > r.tier;
    const directionTag = isUpgrade ? "Migration Analysis" : isDowngrade ? "Tier Risk Assessment" : "Tier Confirmation";
    return (
      <>
        <div className="sq-intel-output sq-intel-predict">
          <div className="sq-intel-tag">{directionTag}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "10px 0 14px" }}>
            <ActorPortrait name={r.name} tier={r.tier} size={80} />
            <div>
              <h2 className="sq-intel-name" style={{ margin: 0 }}>{r.name}</h2>
              <p className="sq-intel-meta" style={{ margin: "4px 0 0" }}>
                Current: Tier <strong>{r.tier}</strong> &nbsp;·&nbsp; SI <strong>{r.scaleIndex}</strong>
                &nbsp;·&nbsp; Target: Tier <strong>{response.targetTier}</strong>
                &nbsp;·&nbsp; Opening: ₹{r.openingCr}Cr
              </p>
            </div>
          </div>
          <p className="sq-intel-narrative">{narrativePredict(r, response.targetTier)}</p>
          {r.migration !== "N/A" && (
            <p className="sq-migration-badge">Migration Signal: <strong>{r.migration}</strong></p>
          )}
          <FollowUpChips chips={chipsForPredict(r, response.targetTier)} onRequery={onRequery} />
        </div>
        <ShareSignal payload={{ mode: "single", name: r.name, scaleIndex: r.scaleIndex, tier: r.tier, riskBand: r.riskBand }} />
        {related.length > 0 && <ContentCards items={related} />}
      </>
    );
  }

  if (response.type === "tier-check") {
    const r = response.data;
    const isMatch = response.queriedTier === undefined || r.tier === response.queriedTier;
    const tierColor = TIER_COLORS[r.tier];
    return (
      <div className="sq-intel-output" style={{ borderLeftColor: isMatch ? "#4ade80" : "#fbbf24" }}>
        <div className="sq-intel-tag">Tier Classification</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "10px 0 14px" }}>
          <ActorPortrait name={r.name} tier={r.tier} size={80} />
          <div>
            <h2 className="sq-intel-name" style={{ margin: 0 }}>{r.name}</h2>
            <p className="sq-verdict" style={{ color: isMatch ? "#4ade80" : "#fbbf24", margin: "4px 0 0" }}>
              {isMatch ? `Confirmed — Tier ${r.tier}` : `No — currently Tier ${r.tier}`}
            </p>
            <p className="sq-intel-meta" style={{ margin: "4px 0 0" }}>
              SI <strong style={{ color: tierColor }}>{r.scaleIndex}</strong>
              &nbsp;·&nbsp; Opening ₹{r.openingCr}Cr &nbsp;·&nbsp; Risk: {r.riskBand}
            </p>
          </div>
        </div>
        <FollowUpChips chips={chipsForTierCheck(r)} onRequery={onRequery} />
      </div>
    );
  }

  if (response.type === "comparison") {
    const { left, right, winner } = response;
    const related = findRelatedContent([left.name, right.name]);
    return (
      <>
        <div className="sq-intel-output sq-intel-comparison">
          <div className="sq-intel-tag">Head-to-Head</div>
          <p className="sq-winner-line">Winner: <strong>{winner}</strong></p>
          <p className="sq-intel-narrative">{narrativeComparison(left, right, winner)}</p>

          <div className="sq-compare-grid">
            <div className={`sq-compare-card ${winner === left.name ? "sq-card-win" : "sq-card-lose"}`}
              style={{ borderTopColor: winner === left.name ? TIER_COLORS[left.tier] : "transparent" }}>
              <h3>{left.name}</h3>
              <p>SI: <strong>{left.scaleIndex}</strong> &nbsp;|&nbsp; Tier: <strong style={{ color: TIER_COLORS[left.tier] }}>{left.tier}</strong></p>
              <p>Opening: ₹{left.openingCr}Cr &nbsp;|&nbsp; Gross: ₹{left.maxGross}Cr</p>
              <p style={{ color: RISK_COLORS[left.riskBand] }}>{left.riskBand} Risk</p>
            </div>

            <div className="sq-vs-badge">VS</div>

            <div className={`sq-compare-card ${winner === right.name ? "sq-card-win" : "sq-card-lose"}`}
              style={{ borderTopColor: winner === right.name ? TIER_COLORS[right.tier] : "transparent" }}>
              <h3>{right.name}</h3>
              <p>SI: <strong>{right.scaleIndex}</strong> &nbsp;|&nbsp; Tier: <strong style={{ color: TIER_COLORS[right.tier] }}>{right.tier}</strong></p>
              <p>Opening: ₹{right.openingCr}Cr &nbsp;|&nbsp; Gross: ₹{right.maxGross}Cr</p>
              <p style={{ color: RISK_COLORS[right.riskBand] }}>{right.riskBand} Risk</p>
            </div>
          </div>
          <FollowUpChips chips={chipsForComparison(left, right, winner)} onRequery={onRequery} />
        </div>
        <ShareSignal payload={{ mode: "comparison", left: left.name, right: right.name, winner }} />
        {related.length > 0 && <ContentCards items={related} />}
      </>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   CONTENT CARDS
═══════════════════════════════════════════════════════════════════ */

function ContentCards({ items }: { items: ArenaContent[] }) {
  const typeLabel: Record<string, string> = {
    battle: "Battle", postmortem: "Postmortem", migration: "Migration Report", podcast: "Podcast",
  };
  return (
    <div className="sq-content-section">
      <p className="sq-content-label">Related Capital Intelligence</p>
      <div className="sq-content-grid">
        {items.map(item => (
          <div key={item.id} className="sq-content-card">
            <span className="sq-content-type">{typeLabel[item.type]}</span>
            <h4 className="sq-content-title">{item.title}</h4>
            <p className="sq-content-summary">{item.summary}</p>
            {item.audioUrl && (
              <iframe src={item.audioUrl} width="100%" height="80" frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                style={{ borderRadius: 8, marginTop: 12 }} />
            )}
            <p className="sq-content-date">{item.publishedAt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════════════ */

export default function StarQuantumPage() {
  return (
    <Suspense fallback={
      <div className="sq-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="loader-container">
          <div className="nebula-orbit">
            <div className="nebula-core" />
            <div className="nebula-ring" />
            <div className="stardust" />
          </div>
          <p className="loader-text">Loading Capital Field...</p>
        </div>
      </div>
    }>
      <StarQuantumInner />
    </Suspense>
  );
}

function StarQuantumInner() {
   const searchParams = useSearchParams();
   const urlTier    = searchParams.get("tier");
   const urlSort    = searchParams.get("sort") as SortKey | null;
   const urlCompare = searchParams.get("compare");
   const urlQ       = searchParams.get("q");
   const urlLimit   = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : null;

   const [query, setQuery]             = useState(urlCompare ? urlCompare.split(",").join(" vs ") : (urlQ ?? ""));
   const [response, setResponse]       = useState<EngineResponse | null>(null);
   const [loading, setLoading]         = useState(false);
   const [intelActive, setIntelActive] = useState(false);
   const [activeSort, setActiveSort]   = useState<SortKey>(urlSort ?? "scale");
   const [activeTier, setActiveTier]   = useState<number | null>(urlTier ? parseInt(urlTier) : null);
   const [compareWith, setCompareWith] = useState<string | null>(null);
   const [topNResult, setTopNResult]   = useState<EngineResult[] | null>(null);
   const [topNLabel, setTopNLabel]     = useState<string>("");
   const [tierRiskResult, setTierRiskResult] = useState<{ tier: number; actors: EngineResult[] } | null>(null);

   // Compute leaderboard data from actors
   const leaderboard: EngineResult[] = useMemo(() => {
     return actors.map(actor => {
       const result = runEngine(actor.name);
       if (result.type === "single") return result.data;
       return null;
     }).filter(Boolean) as EngineResult[];
   }, []);

   // Filter + sort leaderboard
   const displayedActors = useMemo(() => {
     let list = [...leaderboard];
     if (activeTier !== null) list = list.filter(a => a.tier === activeTier);
     if (activeSort === "scale")     list.sort((a, b) => b.scaleIndex - a.scaleIndex);
     if (activeSort === "stability") list.sort((a, b) => b.stabilityIndex - a.stabilityIndex);
     if (activeSort === "momentum")  list.sort((a, b) => {
       const migScore = (m: string) => m === "High" ? 3 : m === "Moderate" ? 2 : m === "Low" ? 1 : 0;
       return migScore(b.migration) - migScore(a.migration) || b.scaleIndex - a.scaleIndex;
     });
     return list;
   }, [leaderboard, activeTier, activeSort]);

  // ── Actor token cleaner: strips noise, resolves word-by-word ──────
  const resolveFromNoiseToken = (rawToken: string): EngineResult | null => {
    // Strip noise words including typos like "stil", "stil", motion/status words
    const noiseWords = /\b(stil|still|remains?|stuck|currently|in|a|an|the|actor|star|hero|is|are|was|been)\b/gi;
    const cleaned = rawToken.replace(noiseWords, " ").replace(/\s+/g, " ").trim();

    // Try engine with cleaned token first
    const direct = runEngine(cleaned);
    if (direct.type === "single") return direct.data;
    if (direct.type === "tier-check") return direct.data;

    // Word-by-word fallback
    const words = cleaned.split(" ").filter(w => w.length > 2);
    for (const word of words) {
      const r = runEngine(word);
      if (r.type === "single") return r.data;
      if (r.type === "tier-check") return r.data;
    }
    return null;
  };

  const handleAnalyze = (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;
    if (overrideQuery) setQuery(overrideQuery);
    setLoading(true);
    setResponse(null);
    setTopNResult(null);
    setTierRiskResult(null);
    setIntelActive(true);

    setTimeout(() => {
      const qLower = q.toLowerCase().replace(/[?]/g, "").trim();

      // ══════════════════════════════════════════════
      // 1. SIGNAL BOUNDARY — producer-only modeling
      // ══════════════════════════════════════════════
      if (/\b(safe budget|investment band|recovery probability|stress scenario|risk ceiling|capital survival|downside protection|roi recovery modeling)\b/.test(qLower)) {
        setResponse({
          type: "error",
          message: "SIGNAL_BOUNDARY",
        } as any);
        setLoading(false);
        return;
      }

      // ══════════════════════════════════════════════
      // 2. RISK BAND GLOSSARY — "what is high risk",
      //    "explain controlled risk", "why high risk"
      // ══════════════════════════════════════════════
      const RISK_GLOSSARY: Record<string, { title: string; desc: string; traits: string[]; examples: string[] }> = {
        High: {
          title: "High Risk Band",
          desc: "ROI standard deviation exceeds 0.9. Opens strongly on name recognition but performance is volatile — films can dramatically over or under-deliver against investment. Past ROI shows wide swings.",
          traits: ["Opening-dependent box office", "High budget tolerance mismatch", "Volatility > 90%", "ROI unpredictable across 3 films"],
          examples: ["Prabhas (1.09 stdDev)", "Vijay Deverakonda (1.20)", "Nikhil Siddhartha (1.66)"],
        },
        Controlled: {
          title: "Controlled Risk Band",
          desc: "ROI standard deviation below 0.40. Opening matches expected range consistently. Capital deployment against this asset has the most predictable return envelope. Lowest volatility tier.",
          traits: ["Opening within ±15% of projection", "Consistent ROI across films", "StdDev < 0.40", "Strong pre-release capital signal"],
          examples: ["Allu Arjun (0.29 stdDev)", "Nithin (0.38)"],
        },
        Balanced: {
          title: "Balanced Risk Band",
          desc: "ROI standard deviation between 0.40–0.89. Moderate opening predictability with occasional outliers. Acceptable capital exposure for mid-budget investments.",
          traits: ["Moderate volatility", "Some ROI variance across films", "StdDev 0.40–0.89", "Budget ceiling matters"],
          examples: ["Jr NTR (0.50)", "Naga Chaitanya (0.50)", "Ram Pothineni (0.66)"],
        },
      };

      // Detect which risk band is being asked about
      const riskBandQuery =
        /\b(high risk|risk high|high.risk band)\b/.test(qLower) ? "High"
        : /\b(controlled risk|risk controlled|controlled.risk band)\b/.test(qLower) ? "Controlled"
        : /\b(balanced risk|risk balanced|balanced.risk band)\b/.test(qLower) ? "Balanced"
        : /\b(what is risk|explain risk|risk band|what.*risk band)\b/.test(qLower) ? "overview"
        : null;

      if (riskBandQuery) {
        if (riskBandQuery === "overview") {
          setResponse({ type: "error", message: "RISK_OVERVIEW" } as any);
        } else {
          setResponse({ type: "error", message: `RISK_GLOSSARY:${riskBandQuery}` } as any);
        }
        setLoading(false);
        return;
      }

      // ══════════════════════════════════════════════
      // 1b. SQ GLOSSARY INTERCEPTOR
      //     Catches ALL definitional queries before engine.
      //     Handles "what is stability", "what is tier",
      //     "what is capital intelligence", etc.
      //     Must run BEFORE engine to prevent silent null.
      // ══════════════════════════════════════════════
      const isDefinitionQuery = /^(what is|what's|what are|explain|define|tell me about|how does|how is|what does|describe|meaning of)\b/.test(qLower);
      if (isDefinitionQuery) {
        const termMap: Record<string, string> = {
          "stability index": "stability index",
          "stability":       "stability index",
          "scale index":     "scale index",
          "scale":           "scale index",
          "tier":            "tier",
          "product tier":    "tier",
          "capital tier":    "tier",
          "tier system":     "tier",
          "roi":             "roi",
          "return on investment": "roi",
          "pan india":       "pan india",
          "pan-india":       "pan india",
          "panindia":        "pan india",
          "migration":       "migration",
          "migration signal":"migration",
          "opening":         "opening",
          "opening day":     "opening",
          "budget tolerance":"budget tolerance",
          "budget":          "budget tolerance",
          "volatility":      "volatility",
          "gross ceiling":   "gross ceiling",
          "gross":           "gross ceiling",
          "starsq":          "starsq",
          "star quantum":    "star quantum",
          "capital intelligence": "capital intelligence",
          "cinema capital":  "capital intelligence",
          "capital asset":   "capital asset",
          "capital":         "capital intelligence",
          "momentum":        "momentum",
          "momentum index":  "momentum",
        };
        const stripped = qLower
          .replace(/^(what is|what's|what are|explain|define|tell me about|how does|how is|what does|describe|meaning of)\s+/, "")
          .replace(/\b(a|an|the)\b/g, "")
          .trim();
        const matchedKey = Object.keys(termMap).find(k =>
          stripped === k || stripped.includes(k) || k.includes(stripped)
        );
        if (matchedKey) {
          setResponse({ type: "error", message: `SQ_GLOSSARY:${termMap[matchedKey]}` } as any);
          setLoading(false);
          return;
        }
      }

      // ══════════════════════════════════════════════
      // 3. TOP N — "top 3 actors", "top 5 by stability"
      // ══════════════════════════════════════════════
      const topNMatch = qLower.match(/top\s+(\d+)/);
      if (topNMatch) {
        const n = Math.min(parseInt(topNMatch[1]), 20);
        const isByStability = /stability/.test(qLower);
        const isByMomentum  = /momentum|migration/.test(qLower);
        const sorted = [...leaderboard].sort((a, b) =>
          isByStability ? b.stabilityIndex - a.stabilityIndex
          : isByMomentum ? (
            (b.migration === "High" ? 3 : b.migration === "Moderate" ? 2 : 1) -
            (a.migration === "High" ? 3 : a.migration === "Moderate" ? 2 : 1)
          ) : b.scaleIndex - a.scaleIndex
        );
        setTopNResult(sorted.slice(0, n));
        setTopNLabel(`Top ${n} by ${isByStability ? "Stability" : isByMomentum ? "Momentum" : "Scale"}`);
        setLoading(false);
        return;
      }

      // ══════════════════════════════════════════════
      // 3b. TIER RISK RANKING
      //     "who is most risk actor in tier 2"
      //     "highest risk tier 1 actor"
      //     "most volatile tier 3"
      //     Filter by tier → sort High>Balanced>Controlled
      //     then lowest stabilityIndex within same band
      // ══════════════════════════════════════════════
      const hasRiskIntent = /\b(most risk|riskiest|highest risk|most risky|most volatile|high risk actor|riskiest actor)\b/.test(qLower);
      const tierRiskTierMatch = qLower.match(/tier\s*([123])/);
      if (hasRiskIntent && tierRiskTierMatch) {
        const t = parseInt(tierRiskTierMatch[1]);
        const riskScore = (rb: string) => rb === "High" ? 3 : rb === "Balanced" ? 2 : 1;
        const pool = [...leaderboard]
          .filter(a => a.tier === t)
          .sort((a, b) => {
            const diff = riskScore(b.riskBand) - riskScore(a.riskBand);
            return diff !== 0 ? diff : a.stabilityIndex - b.stabilityIndex;
          });
        if (pool.length === 0) {
          setResponse({ type: "error", message: `No Tier ${t} actors found in registry.` } as any);
        } else {
          setTierRiskResult({ tier: t, actors: pool });
        }
        setLoading(false);
        return;
      }

      // ══════════════════════════════════════════════
      // 3c. CLOSEST TO TIER
      //     "closest to tier 1", "which tier 2 is closest to tier 1"
      // ══════════════════════════════════════════════
      const closestTierMatch = qLower.match(/closest\s+to\s+tier\s*([123])/);
      if (closestTierMatch) {
        const targetTier = parseInt(closestTierMatch[1]);
        const threshold = targetTier === 1 ? 60 : 30;
        const pool = [...leaderboard]
          .filter(a => a.tier > targetTier)
          .map(a => ({ ...a, gap: threshold - a.openingCr }))
          .filter(a => a.gap > 0)
          .sort((a, b) => (a as any).gap - (b as any).gap);
        if (pool.length === 0) {
          setResponse({ type: "error", message: `No actors below Tier ${targetTier} threshold found.` } as any);
        } else {
          setTopNResult(pool.slice(0, 5) as any);
          setTopNLabel(`Closest to Tier ${targetTier} — Ranked by Opening Gap to ₹${threshold}Cr`);
        }
        setLoading(false);
        return;
      }

      // ══════════════════════════════════════════════
      // 3d. MOST STABLE / MOST VOLATILE IN TIER
      //     "most stable in tier 1"
      //     "who has highest volatility in tier 1"
      // ══════════════════════════════════════════════
      const stableInTierMatch = qLower.match(/(most stable|highest stability|most volatile|highest volatility).+tier\s*([123])/);
      if (stableInTierMatch) {
        const isVolatility = /volatil/.test(stableInTierMatch[1]);
        const targetTier = parseInt(stableInTierMatch[2]);
        const pool = [...leaderboard]
          .filter(a => a.tier === targetTier)
          .sort((a, b) => isVolatility
            ? a.stabilityIndex - b.stabilityIndex
            : b.stabilityIndex - a.stabilityIndex
          );
        setTopNResult(pool.slice(0, 5));
        setTopNLabel(isVolatility
          ? `Most Volatile in Tier ${targetTier} — Lowest Stability Index`
          : `Most Stable in Tier ${targetTier} — Highest Stability Index`);
        setLoading(false);
        return;
      }

      // ══════════════════════════════════════════════
      // 4. RANKING WITHOUT N — "top actors", "top hero",
      //    "strongest tier 2", "most stable", "who leads",
      //    "is X top hero", "highest opening"
      // ══════════════════════════════════════════════
      const isRankingQuery =
        /\b(top (actor|hero|star|capital)|strongest|most stable|who leads|highest (scale|opening|stability)|best actor|is \w+ top)\b/.test(qLower) ||
        (/\b(top|best|strongest)\b/.test(qLower) && !/\bvs\b/.test(qLower) && !topNMatch);

      if (isRankingQuery) {
        // Check if a specific actor is mentioned ("is prabhas top hero?")
        const actorInQuery = leaderboard.find(a =>
          qLower.includes(a.name.toLowerCase()) ||
          (a as any).aliases?.some?.((al: string) => qLower.includes(al.toLowerCase()))
        );

        if (actorInQuery) {
          // Show their rank in context
          const sortedAll = [...leaderboard].sort((a, b) => b.scaleIndex - a.scaleIndex);
          const rank = sortedAll.findIndex(a => a.name === actorInQuery.name) + 1;
          setTopNResult([actorInQuery]);
          setTopNLabel(`${actorInQuery.name} — Ranked #${rank} of 20 by Scale Index`);
          setResponse(null);
        } else {
          // Generic top 5
          const sorted = [...leaderboard].sort((a, b) => b.scaleIndex - a.scaleIndex);
          setTopNResult(sorted.slice(0, 5));
          setTopNLabel("Top 5 Capital Assets by Scale");
        }
        setLoading(false);
        return;
      }

      // ══════════════════════════════════════════════
      // 5. TIER-EXPLAIN — "why is naveen stil in tier 3"
      //    Uses noisy token cleaner + word-by-word resolve
      // ══════════════════════════════════════════════
      const intent = parseQuery(q);
      if (intent.type === "tier-explain") {
        const actor = resolveFromNoiseToken(intent.token);
        if (actor) {
          const fakeResponse = runEngine(actor.name);
          if (fakeResponse.type === "single" || fakeResponse.type === "tier-check") {
            setResponse({ ...fakeResponse, _explainTier: intent.queriedTier } as unknown as EngineResponse);
          } else {
            setResponse(fakeResponse);
          }
        } else {
          setResponse({
            type: "error",
            message: `Actor not recognized. Try the full name — e.g. "Naveen Polishetty", "Vijay Deverakonda".`,
          } as any);
        }
        setLoading(false);
        return;
      }

      // ══════════════════════════════════════════════
      // 6. DEFAULT ENGINE — single, compare, predict, etc.
      // ══════════════════════════════════════════════
      setResponse(runEngine(q));
      setLoading(false);
    }, 900);
  };

  // Auto-execute if homepage redirected with ?q= param
  useEffect(() => {
    if (urlQ && urlQ.trim()) {
      handleAnalyze(urlQ.trim());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCompare = (name: string) => {
    if (compareWith && compareWith !== name) {
      setQuery(`${compareWith} vs ${name}`);
      setCompareWith(null);
      setTimeout(() => handleAnalyze(`${compareWith} vs ${name}`), 50);
    } else {
      setCompareWith(name);
    }
  };

  const handleInspect = (name: string) => {
    setQuery(name);
    setTimeout(() => handleAnalyze(name), 50);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAnalyze();
  };

  const tierCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    leaderboard.forEach(a => counts[a.tier]++);
    return counts;
  }, [leaderboard]);

  return (
    <div className="sq-wrapper">

      {/* ── Page header ── */}
      <div className="sq-header">
        <div className="sq-header-left">
          <h1 className="sq-title">Star Quantum</h1>
          <p className="sq-subtitle">Capital Asset Leaderboard · {leaderboard.length} Actors Tracked</p>
        </div>
        <div className="sq-header-right">
          {compareWith && (
            <div className="sq-compare-pending">
              <span className="sq-compare-pending-dot" />
              <span>Comparing with <strong>{compareWith}</strong> — pick second actor</span>
              <button onClick={() => setCompareWith(null)}>×</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Intelligence search ── */}
      <div className="sq-search-row">
        <div className="sq-intel-search">
          <div className="sq-search-icon">Q</div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask capital intelligence: compare, predict tier, analyze actor..."
            className="sq-intel-input"
          />
          <button onClick={() => handleAnalyze()} className="sq-analyze-btn">Analyze</button>
        </div>

        {/* Hint chips */}
        {!intelActive && (
          <div className="sq-hint-row">
            {HINT_QUERIES.map((hint, i) => (
              <span key={i} className="sq-hint-chip" onClick={() => handleAnalyze(hint)}>
                {hint}
              </span>
            ))}
          </div>
        )}
      </div>

       {/* ── Intelligence output ── */}
       {(loading || (response && intelActive) || topNResult || tierRiskResult) && (
         <div className="sq-intel-zone">
           {loading ? (
             <div className="loader-container">
               <div className="nebula-orbit">
                 <div className="nebula-core" />
                 <div className="nebula-ring" />
                 <div className="stardust" />
               </div>
               <p className="loader-text">Analyzing Capital Field...</p>
             </div>
           ) : tierRiskResult ? (
             <TierRiskPanel data={tierRiskResult} onRequery={handleAnalyze} />
           ) : topNResult ? (
             <div className="sq-topn-result fade-in">
               <div className="sq-intel-tag">Ranked Capital View</div>
               <h2 className="sq-topn-label">{topNLabel}</h2>
               <div className="sq-topn-list">
                 {topNResult.map((actor, i) => (
                   <div key={actor.name} className="sq-topn-row" onClick={() => handleAnalyze(actor.name)}>
                     <span className="sq-topn-rank">#{i + 1}</span>
                     <span className="sq-topn-name">{actor.name}</span>
                     <div className="sq-topn-metrics">
                       <span className="sq-topn-metric">
                         <span className="sq-topn-metric-label">Scale</span>
                         <strong>{actor.scaleIndex}</strong>
                       </span>
                       <span className="sq-topn-metric">
                         <span className="sq-topn-metric-label">Stability</span>
                         <strong>{actor.stabilityIndex}</strong>
                       </span>
                       <span className="sq-topn-tier" style={{ color: TIER_COLORS[actor.tier] }}>T{actor.tier}</span>
                     </div>
                   </div>
                 ))}
               </div>
               {/* Contextual follow-up chips — always present after ranked results */}
               <FollowUpChips
                 chips={chipsForTopN(topNLabel, topNResult)}
                 onRequery={handleAnalyze}
               />
             </div>
           ) : (
             response && (
               <IntelligencePanel
                 response={response}
                 onRequery={handleAnalyze}
               />
             )
           )}
           {(intelActive || topNResult || tierRiskResult) && !loading && (
             <button className="sq-close-intel" onClick={() => {
               setIntelActive(false); setResponse(null);
               setTopNResult(null); setTierRiskResult(null); setQuery("");
             }}>
               ← Back to Leaderboard
             </button>
           )}
         </div>
       )}

      {/* ── Leaderboard controls ── */}
      <div className="sq-controls">
        {/* Tier filters */}
        <div className="sq-tier-filters">
          <button
            className={`sq-filter-btn ${activeTier === null ? "sq-filter-active" : ""}`}
            onClick={() => setActiveTier(null)}
          >
            All &nbsp;<span className="sq-filter-count">{leaderboard.length}</span>
          </button>
          {[1, 2, 3].map(t => (
            <button
              key={t}
              className={`sq-filter-btn sq-filter-tier-${t} ${activeTier === t ? "sq-filter-active" : ""}`}
              onClick={() => setActiveTier(activeTier === t ? null : t)}
              style={{ "--tier-color": TIER_COLORS[t] } as React.CSSProperties}
            >
              Tier {t} &nbsp;<span className="sq-filter-count">{tierCounts[t]}</span>
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="sq-sort-row">
          <span className="sq-sort-label">Sort by:</span>
          {(["scale", "stability", "momentum"] as SortKey[]).map(s => (
            <button
              key={s}
              className={`sq-sort-btn ${activeSort === s ? "sq-sort-active" : ""}`}
              onClick={() => setActiveSort(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Leaderboard grid ── */}
      <div className="sq-grid">
        {displayedActors.map((actor, idx) => (
          <ActorCardItem
            key={actor.name}
            data={actor}
            onCompare={handleCompare}
            onInspect={handleInspect}
          />
        ))}
      </div>

      {/* ── Tier legend ── */}
      <div className="sq-legend">
        {[1, 2, 3].map(t => (
          <div key={t} className="sq-legend-item">
            <span className="sq-legend-dot" style={{ background: TIER_COLORS[t] }} />
            <span>
              Tier {t} — {t === 1 ? "Opening ₹60Cr+" : t === 2 ? "Opening ₹30–60Cr" : "Opening < ₹30Cr"}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}
