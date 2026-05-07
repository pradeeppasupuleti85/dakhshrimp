"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { runEngine, EngineResponse, EngineResult } from "@/lib/engine";
import { parseQuery } from "@/lib/parser";
import { resolveActor } from "@/lib/resolver";
import { ShareSignal } from "@/components/ShareSignal";
import Link from "next/link";

/* ════════════════════════════════════════════════
   GLOSSARY DEFINITIONS
════════════════════════════════════════════════ */
const GLOSSARY_DEFINITIONS: Record<string, { short: string; detail: string }> = {
  "scale index": {
    short: "Measures how widely an actor's capital can expand.",
    detail:
      "Combines three signals: gross ceiling (how high the career peak goes), PanIndia reach (how broadly the actor draws audiences beyond home state), and budget tolerance (how large a production they can anchor). Higher = larger capital footprint.",
  },
  "stability index": {
    short: "Indicates consistency of openings and ROI across films.",
    detail:
      "Derived from ROI volatility across the career. An actor who delivers similar results film after film scores high. One with wild swings — a blockbuster followed by a collapse — scores low. High stability = predictable investment.",
  },
  "tier": {
    short: "Capital classification based on opening-day strength.",
    detail:
      "Tier 1: Opening ₹60Cr+ (mega-cap, national anchors). Tier 2: ₹30–60Cr (scalable mid-cap operators). Tier 3: below ₹30Cr (emerging capital with migration potential). Tier is determined purely by opening-day performance — not fame, not awards.",
  },
  "risk band": {
    short: "Categorizes investment risk based on ROI volatility.",
    detail:
      "Controlled: ROI stdDev below 0.3 — very predictable. Balanced: 0.3–0.7 — manageable swings. High: above 0.7 — significant unpredictability. Producers use this to calibrate budget exposure.",
  },
  "migration": {
    short: "Probability of a Tier 3 actor moving up, based on recent momentum.",
    detail:
      "Only shown for Tier 3 actors. High migration = last 3 films averaged ROI above 1.5 — strong upward trajectory. Moderate = 0.8–1.5. Low = below 0.8 — capital not yet building momentum toward Tier 2.",
  },
  "roi": {
    short: "Return on Investment — gross earned vs budget spent.",
    detail:
      "ROI = Box Office Gross ÷ Production Budget. A film grossing ₹90Cr on a ₹18Cr budget has ROI of 5.0. StarsQ tracks ROI across the last 3 films to measure momentum, and across the career to measure volatility.",
  },
  "pan india": {
    short: "How broadly an actor draws audiences beyond their home industry.",
    detail:
      "Scored 0–100. A fully PanIndia actor (score 100) draws equally from Telugu, Tamil, Hindi, Malayalam, and Kannada markets. A regional actor (score 30) primarily draws from one state. PanIndia viability expands the gross ceiling and reduces single-market risk.",
  },
  "opening": {
    short: "Opening-day box office collection — the primary tier signal.",
    detail:
      "StarsQ uses opening-day performance as the cleanest signal of an actor's capital pull. It removes noise from content quality, word of mouth, and long runs. A high opener means producers can bet on a large first-day return regardless of the film's quality.",
  },
  "volatility": {
    short: "Dispersion of ROI results across an actor's career.",
    detail:
      "High volatility = the actor has both mega hits and significant failures. Low volatility = consistent performance film after film. Volatility is measured as standard deviation of ROI scores and directly maps to the Risk Band.",
  },
  "starsq": {
    short: "A Cinema Capital Intelligence Engine.",
    detail:
      "StarsQ treats film actors as capital assets — quantifying their opening strength, gross ceiling, ROI resilience, and volatility using deterministic formulas. It is not a fan ranking or popularity chart. It is a financial framework for cinema investment decisions.",
  },
  "budget tolerance": {
    short: "The maximum budget an actor can safely anchor.",
    detail:
      "Derived from the highest-budget film in their career that achieved positive ROI. An actor with budget tolerance of ₹450Cr can anchor a large-scale production without capital risk. Below their tolerance threshold, the investment risk is manageable.",
  },
  "momentum": {
    short: "Acceleration of an actor's capital trajectory — how fast and in which direction they're moving.",
    detail:
      "Momentum measures the direction and speed of an actor's recent performance across their last 3 films. High momentum = consecutive ROI growth with rising opening-day strength. Tied directly to the Migration signal: High Migration actors carry High Momentum. Bands: High (last 3 ROI avg >1.5), Moderate (0.8–1.5), Low (<0.8), Negative (declining). Full momentum analytics available in Star Quantum.",
  },
};

function findGlossaryEntry(term: string) {
  const t = term.toLowerCase();
  if (GLOSSARY_DEFINITIONS[t]) return { key: t, ...GLOSSARY_DEFINITIONS[t] };
  for (const key of Object.keys(GLOSSARY_DEFINITIONS)) {
    if (t.includes(key) || key.includes(t)) return { key, ...GLOSSARY_DEFINITIONS[key] };
  }
  return null;
}

/* ════════════════════════════════════════════════
   ACTOR PORTRAIT HELPERS
════════════════════════════════════════════════ */

function actorSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

const TIER_AURA: Record<number, string> = {
  1: "radial-gradient(circle, rgba(212,175,55,0.35) 0%, transparent 70%)",
  2: "radial-gradient(circle, rgba(180,200,240,0.25) 0%, transparent 70%)",
  3: "radial-gradient(circle, rgba(160,120,80,0.25) 0%, transparent 70%)",
};

const RISK_BORDER: Record<string, string> = {
  Controlled: "rgba(77,163,255,0.55)",
  Balanced:   "rgba(74,222,128,0.55)",
  High:       "rgba(251,146,60,0.55)",
};

function ActorPortrait({
  name,
  tier,
  riskBand,
  scaleIndex,
  maxGross,
  isWinner,
}: {
  name: string;
  tier: number;
  riskBand: string;
  scaleIndex: number;
  maxGross: number;
  isWinner: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const slug = actorSlug(name);
  const src = `/actors/images/${slug}.webp`;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const grossRatio = Math.min(maxGross / 2000, 1);
  const strokeDash = circumference * grossRatio;

  return (
    <div className="actor-portrait-wrap">
      <div
        className="actor-aura"
        style={{ background: TIER_AURA[tier] }}
        aria-hidden="true"
      />
      <svg className="actor-gross-ring" width="124" height="124" viewBox="0 0 124 124">
        <circle cx="62" cy="62" r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
        <circle cx="62" cy="62" r={radius} fill="none"
          stroke={TIER_AURA[tier].includes("212") ? "rgba(212,175,55,0.35)" : tier === 2 ? "rgba(77,163,255,0.3)" : "rgba(160,120,80,0.3)"}
          strokeWidth="2"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 62 62)"
        />
      </svg>
      <div
        className="actor-portrait-frame"
        style={{ borderColor: RISK_BORDER[riskBand] ?? "rgba(255,255,255,0.15)" }}
      >
        {!imgError ? (
          <Image
            src={src}
            alt={name}
            width={96}
            height={96}
            className="actor-portrait-img"
            onError={() => setImgError(true)}
            loading="lazy"
            style={{ objectFit: "cover", objectPosition: "top" }}
          />
        ) : (
          <div className="actor-portrait-fallback">
            {name.split(" ").map(w => w[0]).slice(0, 2).join("")}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   COMPARISON CARD COMPONENT
════════════════════════════════════════════════ */

function ComparisonCard({
  data,
  isWinner,
}: {
  data: EngineResult;
  isWinner: boolean;
}) {
  const scalePercent = (data.scaleIndex / 100) * 100;

  return (
    <div className={`comp-card ${isWinner ? "comp-card-winner" : "comp-card-loser"}`}>
      {isWinner && <div className="comp-winner-badge">Winner</div>}
      <ActorPortrait
        name={data.name}
        tier={data.tier}
        riskBand={data.riskBand}
        scaleIndex={data.scaleIndex}
        maxGross={data.maxGross}
        isWinner={isWinner}
      />
      <h3 className="comp-name">{data.name}</h3>
      <div className="comp-meter-wrap">
        <div className="comp-meter-label">Scale Index</div>
        <div className="comp-meter-track">
          <div
            className="comp-meter-fill"
            style={{ width: `${scalePercent}%` }}
          />
        </div>
        <div className="comp-meter-value">{data.scaleIndex}</div>
      </div>
      <div className="comp-stats">
        <div className="comp-stat">
          <span className="comp-stat-label">Tier</span>
          <span className="comp-stat-value comp-tier"
            data-tier={data.tier}>T{data.tier}</span>
        </div>
        <div className="comp-stat">
          <span className="comp-stat-label">Stability</span>
          <span className="comp-stat-value">{data.stabilityIndex}</span>
        </div>
        <div className="comp-stat">
          <span className="comp-stat-label">Opening</span>
          <span className="comp-stat-value">₹{data.openingCr}Cr</span>
        </div>
        <div className="comp-stat">
          <span className="comp-stat-label">Gross</span>
          <span className="comp-stat-value">₹{data.maxGross}Cr</span>
        </div>
      </div>
      <div className="comp-risk">
        <span
          className="comp-risk-dot"
          style={{
            background:
              data.riskBand === "Controlled" ? "#4da3ff"
              : data.riskBand === "Balanced" ? "#4ade80"
              : "#fb923c"
          }}
        />
        <span className="comp-risk-label">{data.riskBand} Risk</span>
      </div>
      <p className="comp-overlay">{data.overlay}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════
   STAT ROW
════════════════════════════════════════════════ */

const STAT_TIPS: Record<string, string> = {
  "Scale Index":     "Measures how widely an actor's capital can expand.",
  "Stability Index": "Consistency of openings and ROI. Higher = more predictable.",
  "Tier":            "Tier 1: ₹60Cr+ opening. Tier 2: ₹30–60Cr. Tier 3: below ₹30Cr.",
  "Risk Band":       "Controlled = low volatility. Balanced = moderate. High = unpredictable.",
  "Migration":       "Tier 3 only — upward mobility signal based on recent ROI momentum.",
};

function StatRow({ label, value }: { label: string; value: string | number }) {
  const [show, setShow] = useState(false);
  const tip = STAT_TIPS[label];
  return (
    <div className="stat-row">
      <span className="stat-label">
        {label}:&nbsp;
        {tip && <span className="stat-info" onClick={() => setShow(s => !s)}>ℹ</span>}
      </span>
      <strong className="stat-value">{value}</strong>
      {show && tip && <p className="stat-tooltip">{tip}</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════
   TIER VERDICT
════════════════════════════════════════════════ */
function tierVerdict(tier: number, queriedTier: number | undefined, openingCr: number, migration: string, riskBand: string, si: number) {
  if (queriedTier === undefined) {
    const label = tier === 1 ? "Tier 1 — Mega-Cap" : tier === 2 ? "Tier 2 — Mid-Cap" : "Tier 3 — Emerging";
    const threshold = tier === 1 ? "₹60Cr+ opening" : tier === 2 ? "₹30–60Cr opening" : "below ₹30Cr opening";
    return { verdict: label, isYes: true, explanation: `Classified based on ${threshold} band. SI: ${si}.` };
  }
  if (tier === queriedTier) {
    const hold = riskBand === "High"
      ? `Position holds, but High risk means consistent delivery is required.`
      : `${riskBand} risk band supports a stable Tier ${tier} position.`;
    return { verdict: `Yes — Tier ${tier}`, isYes: true, explanation: hold };
  }
  const threshold = queriedTier === 1 ? 60 : 30;
  const gap = threshold - openingCr;
  if (queriedTier < tier) {
    const migLine = migration !== "N/A" ? ` Migration signal: ${migration}.` : "";
    return {
      verdict: `No — currently Tier ${tier}`,
      isYes: false,
      explanation: `Opening band of ₹${openingCr}Cr places this actor in Tier ${tier}. Reaching Tier ${queriedTier} requires ₹${gap > 0 ? gap : 0}Cr more in opening strength.${migLine}`,
    };
  }
  const buffer = openingCr - (tier === 1 ? 60 : 30);
  return {
    verdict: `No — currently Tier ${tier}, above Tier ${queriedTier}`,
    isYes: false,
    explanation: `Opening band of ₹${openingCr}Cr exceeds the Tier ${queriedTier} threshold. Current position: Tier ${tier}, with ₹${buffer}Cr buffer above the lower tier boundary.`,
  };
}

/* ════════════════════════════════════════════════
   QUANTUM EXPANSION CARD
════════════════════════════════════════════════ */
function QuantumExpansionCard({ label, route, raw }: { label: string; route: string; raw: string }) {
  const isWhyQuery = /^why\s+is/i.test(raw);
  const isTopQuery = /top\s+\d/i.test(raw);

  const headline = isWhyQuery
    ? "Deep Capital Analysis"
    : isTopQuery
    ? "Ranked Capital View"
    : "Structured Exploration";

  const desc = isWhyQuery
    ? "Tier classification explanations, structural breakdowns, and migration signals live in Star Quantum — built for depth."
    : isTopQuery
    ? "Ranked actor views with filtering, sorting, and tier segmentation are available in Star Quantum."
    : "This query requires multi-actor filtering and ranked comparison. Star Quantum is built for this.";

  return (
    <div className="card fade-in quantum-expansion-card">
      <div className="quantum-expansion-tag">{headline}</div>
      <h3 className="quantum-expansion-query">"{raw}"</h3>
      <p className="quantum-expansion-desc">{desc}</p>
      <div className="quantum-expansion-label">{label}</div>
      <Link href={route} className="quantum-expansion-btn quantum-expansion-btn--yellow">
        Enter Star Quantum →
      </Link>
    </div>
  );
}

/* ════════════════════════════════════════════════
   HOME ENGAGE BLOCK
════════════════════════════════════════════════ */
function HomeEngageBlock({
  title,
  chips,
  quantumCta,
  onSubmit,
}: {
  title: string;
  chips?: { label: string; query: string; learn?: boolean }[];
  quantumCta?: boolean;
  onSubmit: (q: string) => void;
}) {
  return (
    <div className="home-engage-block fade-in">
      <p className="home-engage-title">{title}</p>
      {chips && chips.length > 0 && (
        <div className="home-engage-chips">
          {chips.map((c, i) => (
            <button
              key={i}
              className={`home-engage-chip${c.learn ? " home-engage-chip--learn" : ""}`}
              onClick={() => onSubmit(c.query)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      {quantumCta && (
        <Link href="/starquantum" className="home-engage-quantum-cta">
          Enter Star Quantum →
        </Link>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   MICRO ACTIONS
════════════════════════════════════════════════ */
function MicroActions({
  actorName,
  tier,
  onCompare,
}: {
  actorName: string;
  tier?: number;
  onCompare: () => void;
}) {
  return (
    <div className="micro-actions fade-in">
      <button className="micro-action-btn" onClick={onCompare}>
        ⚡ Compare
      </button>
      {tier && (
        <Link href={`/starquantum?tier=${tier}`} className="micro-action-btn micro-action-link">
          ◎ View Tier {tier}
        </Link>
      )}
      <Link href="/starquantum" className="micro-action-btn micro-action-link micro-action-muted">
        ↗ Full Leaderboard
      </Link>
    </div>
  );
}

/* ════════════════════════════════════════════════
   FORMULA GUARD CARD
   Shown when user asks for formulas / internals
════════════════════════════════════════════════ */
function FormulaGuardCard({ onSubmit }: { onSubmit: (q: string) => void }) {
  return (
    <div className="card fade-in formula-guard-card">
      <div className="formula-guard-emblem">⬡</div>
      <h3 className="formula-guard-title">Classified Architecture</h3>
      <p className="formula-guard-desc">
        StarsQ is built on proprietary capital intelligence models.
        Core formulas and calculation methodology are not publicly disclosed.
      </p>
      <p className="formula-guard-sub">
        What the engine surfaces is the output — classified by tier, scored by capital logic,
        risk-banded by structural volatility. The signal, not the source.
      </p>
      <div className="formula-guard-actions">
        <button className="home-engage-chip" onClick={() => onSubmit("what is scale index")}>
          What is Scale Index?
        </button>
        <button className="home-engage-chip" onClick={() => onSubmit("what is stability index")}>
          What is Stability Index?
        </button>
        <Link href="/about" className="home-engage-chip home-engage-chip--learn">
          About StarsQ →
        </Link>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   STARSQ INFO CARD
   Shown when user asks "what is starsq" etc.
════════════════════════════════════════════════ */
function StarsQInfoCard({ onSubmit }: { onSubmit: (q: string) => void }) {
  return (
    <div className="card fade-in starsq-info-card">
      <div className="starsq-info-tag">Capital Intelligence System</div>
      <h2 className="starsq-info-title">StarsQ</h2>
      <p className="starsq-info-lead">
        A decision intelligence engine for cinema capital.
      </p>
      <p className="starsq-info-body">
        StarsQ treats film actors as financial assets — quantifying opening-day strength,
        gross ceiling, ROI volatility, and PanIndia reach using deterministic models.
        Not fan rankings. Not opinions. Capital structure, precisely measured.
      </p>
      <div className="starsq-info-pillars">
        {[
          { label: "Scale Index",     desc: "How far capital can expand" },
          { label: "Stability Index", desc: "Consistency of returns" },
          { label: "Risk Band",       desc: "Capital volatility class" },
          { label: "Migration",       desc: "Tier mobility signal" },
        ].map(p => (
          <div key={p.label} className="starsq-pillar">
            <span className="starsq-pillar-label">{p.label}</span>
            <span className="starsq-pillar-desc">{p.desc}</span>
          </div>
        ))}
      </div>
      <div className="starsq-info-actions">
        <button className="home-engage-chip" onClick={() => onSubmit("allu arjun vs prabhas")}>
          Try a comparison
        </button>
        <button className="home-engage-chip" onClick={() => onSubmit("what is scale index")}>
          What is Scale Index?
        </button>
        <Link href="/about" className="home-engage-chip home-engage-chip--learn">
          Full Intel Brief →
        </Link>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   CYCLING PLACEHOLDERS
════════════════════════════════════════════════ */
const PLACEHOLDERS = [
  "Compare actors. Ask tiers. Explore capital.",
  "Try: Allu Arjun vs Prabhas",
  "Try: Will Nani reach Tier 1?",
  "Try: What is scale index?",
  "Try: Is Teja Sajja Tier 2?",
];

/* ════════════════════════════════════════════════
   HOME PAGE
════════════════════════════════════════════════ */
export default function Home() {
  const router = useRouter();
  const [query, setQuery]             = useState("");
  const [response, setResponse]       = useState<EngineResponse | null>(null);
  const [loading, setLoading]         = useState(false);
  const [activated, setActivated]     = useState(false);
  const [placeholder, setPlaceholder] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [lastActor, setLastActor]     = useState<string | null>(null);
  const [lastTier, setLastTier]       = useState<number | undefined>(undefined);
  const [quantumRoute, setQuantumRoute] = useState<{ label: string; route: string; raw: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cycle placeholder — LOGIC UNTOUCHED
  useEffect(() => {
    if (activated) return;
    const interval = setInterval(() => {
      setPlaceholder(p => (p + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activated]);

  // Network canvas animation — LOGIC UNTOUCHED
  useEffect(() => {
    if (activated) return;
    const canvas = document.getElementById("bgNetwork") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const NODES = [
      [0.1, 0.2], [0.25, 0.6], [0.4, 0.15], [0.55, 0.7], [0.7, 0.3],
      [0.85, 0.55], [0.15, 0.8], [0.6, 0.45], [0.9, 0.15], [0.35, 0.9],
      [0.78, 0.8], [0.5, 0.35], [0.05, 0.5], [0.92, 0.68],
    ];
    const EDGES = [
      [0,2],[2,4],[4,6],[1,3],[3,5],[5,6],[0,12],[12,1],[2,11],[11,7],
      [7,3],[4,8],[8,5],[9,1],[10,5],[13,5],[6,9],
    ];

    const draw = () => {
      t += 0.002;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const W = canvas.width, H = canvas.height;

      const pos = NODES.map(([x, y], i) => [
        x * W + Math.sin(t * 0.7 + i * 1.3) * 8,
        y * H + Math.cos(t * 0.5 + i * 0.9) * 6,
      ]);

      ctx.strokeStyle = "rgba(160,80,255,0.12)";
      ctx.lineWidth = 0.7;
      EDGES.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(pos[a][0], pos[a][1]);
        ctx.lineTo(pos[b][0], pos[b][1]);
        ctx.stroke();
      });

      pos.forEach(([x, y], i) => {
        const pulse = 0.18 + 0.14 * Math.sin(t * 1.2 + i * 0.7);
        // Soft glow halo
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(190,100,255,${pulse * 0.22})`;
        ctx.fill();
        // Bright core
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,160,255,${pulse})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    // Double RAF: defer canvas until after first two browser renders
    // Allows initial paint to complete before canvas runs → better Speed Index + LCP
    requestAnimationFrame(() => requestAnimationFrame(draw));
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [activated]);

  // handleSubmit — core logic UNTOUCHED. Informational + guard layers added above engine call.
  const handleSubmit = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;
    if (overrideQuery) setQuery(overrideQuery);

    const qLower = q.toLowerCase();

    // ── Formula guard — proprietary model protection ──────────────────
    if (/\b(formula|algorithm|calculat|how.*(built|derived|computed)|source.?code|internal.*(model|logic)|show.*formula|give.*formula|what.*formula|reveal.*formula)\b/.test(qLower)) {
      setActivated(true);
      setLoading(false);
      setQuantumRoute(null);
      setResponse({ type: "error", message: "FORMULA_GUARD" } as any);
      return;
    }

    // ── StarsQ informational queries ─────────────────────────────────
    if (/\b(what is starsq|what is star.?q|how does.*(starsq|this).*(work|operate)|is.*(starsq|it).*(accurate|reliable|real|legit)|how.*(accurate|reliable).*(starsq|it)|about starsq|tell me about starsq)\b/.test(qLower)) {
      setActivated(true);
      setLoading(false);
      setQuantumRoute(null);
      setResponse({ type: "error", message: "STARSQ_INFO" } as any);
      return;
    }

    const intent = parseQuery(q);

    if (intent.type === "category") {
      setActivated(true);
      setQuantumRoute({ label: intent.label, route: `${intent.route}${intent.route.includes("?") ? "&" : "?"}q=${encodeURIComponent(q)}`, raw: q });
      setResponse(null);
      setLoading(false);
      return;
    }

    if (intent.type === "tier-explain") {
      setActivated(true);
      setQuantumRoute({
        label: `Why is ${intent.token} Tier ${intent.queriedTier}? — Capital Structure Analysis`,
        route: `/starquantum?q=${encodeURIComponent(q)}`,
        raw: q,
      });
      setResponse(null);
      setLoading(false);
      return;
    }

    setQuantumRoute(null);
    setActivated(true);
    setLoading(true);
    setResponse(null);

    await new Promise(r => setTimeout(r, 1600));
    const result = runEngine(q);
    setResponse(result);
    setLoading(false);

    if (result.type === "single") {
      setLastActor(result.data.name);
      setLastTier(result.data.tier);
    } else if (result.type === "predict") {
      setLastActor(result.data.name);
      setLastTier(result.data.tier);
    } else {
      setLastActor(null);
      setLastTier(undefined);
    }
  };

  const handleCompareActivate = () => {
    if (lastActor) {
      setQuery(`${lastActor} vs `);
      setCompareMode(true);
      inputRef.current?.focus();
    }
  };

  // renderResult — ALL LOGIC UNTOUCHED
  const renderResult = () => {
    if (!response) return null;

    if (quantumRoute) {
      return (
        <QuantumExpansionCard
          label={quantumRoute.label}
          route={quantumRoute.route}
          raw={quantumRoute.raw}
        />
      );
    }

    if (response.type === "glossary") {
      const entry = findGlossaryEntry(response.term);
      if (entry) {
        const isScaleIndex = entry.key === "scale index";
        const isTier = entry.key === "tier";
        const isStability = entry.key === "stability index";

        return (
          <>
            <div className="card fade-in glossary-card">
              <div className="glossary-tag">Definition</div>
              <h2 className="glossary-term">{entry.key.replace(/\b\w/g, c => c.toUpperCase())}</h2>
              <p className="glossary-short">{entry.short}</p>
              <p className="glossary-detail">{entry.detail}</p>

              {(isScaleIndex || isStability) && (
                <div className="glossary-range">
                  <div className="glossary-range-label">Score Range 0 → 100</div>
                  <div className="glossary-range-track">
                    <div className="glossary-range-zone glossary-zone-t3">
                      <span>T3</span><span>&lt;40</span>
                    </div>
                    <div className="glossary-range-zone glossary-zone-t2">
                      <span>T2</span><span>40–69</span>
                    </div>
                    <div className="glossary-range-zone glossary-zone-t1">
                      <span>T1</span><span>70+</span>
                    </div>
                  </div>
                </div>
              )}

              {isTier && (
                <div className="glossary-tier-breakdown">
                  <div className="glossary-tier-row" style={{ borderLeftColor: "#D4AF37" }}>
                    <span className="glossary-tier-badge" style={{ color: "#D4AF37" }}>Tier 1</span>
                    <span>Opening ₹60Cr+ · Mega-cap national anchor</span>
                  </div>
                  <div className="glossary-tier-row" style={{ borderLeftColor: "#4DA3FF" }}>
                    <span className="glossary-tier-badge" style={{ color: "#4DA3FF" }}>Tier 2</span>
                    <span>Opening ₹30–60Cr · Scalable mid-cap operator</span>
                  </div>
                  <div className="glossary-tier-row" style={{ borderLeftColor: "#2EC4B6" }}>
                    <span className="glossary-tier-badge" style={{ color: "#2EC4B6" }}>Tier 3</span>
                    <span>Opening &lt;₹30Cr · Emerging with migration potential</span>
                  </div>
                </div>
              )}

              {isScaleIndex && (
                <div className="glossary-example">
                  <span className="glossary-example-tag">Example</span>
                  <p>Prabhas scores near 100 — PanIndia reach + ₹1800Cr gross ceiling + ₹600Cr budget tolerance. Nani scores ~62.5 — strong regionally but narrower nationally.</p>
                </div>
              )}
            </div>

            <HomeEngageBlock
              title="See It In Action"
              chips={
                isScaleIndex ? [
                  { label: "Compare Two Tier 1 Actors", query: "allu arjun vs prabhas" },
                  { label: "Who Is Closest To Tier 1?", query: "who is closest to tier 1" },
                  { label: "Show Top 5 By Scale", query: "top 5 by scale" },
                  { label: "What is Stability Index?", query: "what is stability index", learn: true },
                ] : isTier ? [
                  { label: "Compare Two Tier 1 Actors", query: "allu arjun vs prabhas" },
                  { label: "Will Nani reach Tier 1?", query: "will nani reach tier 1" },
                  { label: "Show Top 5 By Scale", query: "top 5 by scale" },
                  { label: "What is Scale Index?", query: "what is scale index", learn: true },
                ] : isStability ? [
                  { label: "Compare Two Tier 1 Actors", query: "allu arjun vs prabhas" },
                  { label: "Who Is Closest To Tier 1?", query: "who is closest to tier 1" },
                  { label: "Show Top 5 By Scale", query: "top 5 by scale" },
                  { label: "What is Risk Band?", query: "what is risk band", learn: true },
                ] : [
                  { label: "Compare Two Tier 1 Actors", query: "allu arjun vs prabhas" },
                  { label: "Who Is Closest To Tier 1?", query: "who is closest to tier 1" },
                  { label: "Show Top 5 By Scale", query: "top 5 by scale" },
                ]
              }
              onSubmit={handleSubmit}
            />
          </>
        );
      }
      return (
        <div className="card fade-in">
          <p style={{ color: "#A3A9B6" }}>
            Term not found. Try: "what is scale index", "what is tier", "what is risk band"
          </p>
        </div>
      );
    }

    if (response.type === "error") {
      // ── Special informational responses ──────────────────────────────
      if ((response as any).message === "FORMULA_GUARD") {
        return <FormulaGuardCard onSubmit={handleSubmit} />;
      }
      if ((response as any).message === "STARSQ_INFO") {
        return <StarsQInfoCard onSubmit={handleSubmit} />;
      }

      const words = query.trim().split(/\s+/).filter(w => w.length > 2);
      let suggestion: string | null = null;
      for (const word of words) {
        const resolved = resolveActor(word);
        if (resolved.type === "single") { suggestion = resolved.actor.name; break; }
        if (resolved.type === "suggest") { suggestion = resolved.suggestion; break; }
      }

      const rawLower = query.toLowerCase();
      const wantsStats = /stat|info|profile|data|show|give|detail/.test(rawLower);
      const wantsCompare = /vs|versus|compare/.test(rawLower);
      const suggestionQuery = suggestion
        ? wantsCompare
          ? `${suggestion} vs `
          : `${suggestion}`
        : null;

      return (
        <div className="card fade-in error-card">
          <div className="error-query-line">
            <span className="error-query-text">{query}</span>
            <span className="error-squiggle" title="Query not recognized">~</span>
          </div>
          <p className="error-message">Not in the registry.</p>
          <p className="error-sub">
            StarsQ tracks top Telugu cinema actors. This signal isn't in the capital registry yet.
          </p>

          {suggestionQuery && (
            <div className="error-suggestion-row">
              <span className="error-did-you-mean">Did you mean</span>
              <button
                className="error-suggestion-chip"
                onClick={() => handleSubmit(suggestionQuery)}
              >
                {wantsStats
                  ? `${suggestion} stats`
                  : wantsCompare
                  ? `${suggestion} vs ...`
                  : suggestion}
                <span className="error-chip-arrow">→</span>
              </button>
            </div>
          )}

          <div className="error-guided-actions">
            <Link href="/starquantum" className="error-guided-btn error-guided-btn--primary">
              Explore Stars →
            </Link>
            <Link href="/about" className="error-guided-btn error-guided-btn--ghost">
              What is StarsQ?
            </Link>
          </div>

          <p className="error-hint">
            Try: actor name · <span className="error-hint-ex" onClick={() => handleSubmit("allu arjun vs prabhas")}>X vs Y</span> · <span className="error-hint-ex" onClick={() => handleSubmit("will nani become tier 1")}>tier prediction</span> · <span className="error-hint-ex" onClick={() => handleSubmit("what is scale index")}>definitions</span>
          </p>
        </div>
      );
    }

    if (response.type === "clarify-single") {
      return (
        <div className="card fade-in">
          <h3 style={{ marginTop: 0 }}>Did you mean:</h3>
          {response.options.map((opt, i) => (
            <div key={i} className="suggestion" onClick={() => handleSubmit(opt)}>{opt}</div>
          ))}
        </div>
      );
    }

    if (response.type === "clarify-comparison") {
      return (
        <div className="card fade-in">
          <h3 style={{ marginTop: 0 }}>Clarify comparison:</h3>
          {response.leftOptions.map((opt, i) => (
            <div key={"L" + i} className="suggestion"
              onClick={() => handleSubmit(`${opt} vs ${response.rightRaw}`)}>{opt}</div>
          ))}
          {response.rightOptions.map((opt, i) => (
            <div key={"R" + i} className="suggestion"
              onClick={() => handleSubmit(`${response.leftRaw} vs ${opt}`)}>{opt}</div>
          ))}
        </div>
      );
    }

    if (response.type === "tier-check") {
      const r = response.data;
      const { verdict, isYes, explanation } = tierVerdict(
        r.tier, response.queriedTier, r.openingCr, r.migration, r.riskBand, r.scaleIndex
      );
      return (
        <>
          <div className={`card fade-in tier-check-card ${isYes ? "verdict-yes-card" : "verdict-no-card"}`}>
            <h2 style={{ marginTop: 0 }}>{r.name}</h2>
            <p className={`verdict-label ${isYes ? "verdict-yes" : "verdict-no"}`}>{verdict}</p>
            <p className="verdict-explanation">{explanation}</p>
            <div className="stat-divider" />
            <StatRow label="Scale Index"     value={r.scaleIndex} />
            <StatRow label="Stability Index" value={r.stabilityIndex} />
            <StatRow label="Risk Band"       value={r.riskBand} />
            {r.migration !== "N/A" && <StatRow label="Migration" value={r.migration} />}
          </div>
          <MicroActions actorName={r.name} tier={r.tier} onCompare={handleCompareActivate} />
          <ShareSignal payload={{ mode: "single", name: r.name, scaleIndex: r.scaleIndex, tier: r.tier, riskBand: r.riskBand }} />
        </>
      );
    }

    if (response.type === "single") {
      const r = response.data;
      return (
        <>
          <div className="card fade-in">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <ActorPortrait
                name={r.name} tier={r.tier} riskBand={r.riskBand}
                scaleIndex={r.scaleIndex} maxGross={r.maxGross} isWinner={false}
              />
            </div>
            <h2 style={{ marginTop: 0, textAlign: "center" }}>{r.name}</h2>
            <StatRow label="Scale Index"     value={r.scaleIndex} />
            <StatRow label="Stability Index" value={r.stabilityIndex} />
            <StatRow label="Tier"            value={r.tier} />
            <StatRow label="Risk Band"       value={r.riskBand} />
            {r.migration !== "N/A" && <StatRow label="Migration" value={r.migration} />}
            <p className="overlay">{r.overlay}</p>
          </div>
          <MicroActions actorName={r.name} tier={r.tier} onCompare={handleCompareActivate} />
          <ShareSignal payload={{ mode: "single", name: r.name, scaleIndex: r.scaleIndex, tier: r.tier, riskBand: r.riskBand }} />
          <HomeEngageBlock
            title="Explore Further"
            chips={[
              ...(r.tier > 1 ? [{ label: `Will ${r.name} reach Tier ${r.tier - 1}?`, query: `will ${r.name} reach tier ${r.tier - 1}` }] : []),
              { label: `${r.name} vs ${r.tier === 1 ? "Jr NTR" : "Allu Arjun"}`, query: `${r.name} vs ${r.tier === 1 ? "Jr NTR" : "Allu Arjun"}` },
              { label: "Who Is Closest To Tier 1?", query: "who is closest to tier 1" },
              { label: "What is Risk Band?", query: "what is risk band", learn: true },
            ]}
            quantumCta
            onSubmit={handleSubmit}
          />
        </>
      );
    }

    if (response.type === "predict") {
      const r = response.data;
      const isUpgrade = response.targetTier < r.tier;
      const threshold = response.targetTier === 1 ? 60 : 30;
      const gap = threshold - r.openingCr;
      const label = isUpgrade
        ? `Target: Tier ${response.targetTier} — Gap ₹${Math.max(gap, 0)}Cr`
        : r.tier === response.targetTier
        ? `Already at Tier ${r.tier}`
        : `Currently Tier ${r.tier} — above target`;
      return (
        <>
          <div className="card fade-in predict-card">
            <div className="predict-tag">Migration Analysis</div>
            <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 8px" }}>
              <ActorPortrait
                name={r.name} tier={r.tier} riskBand={r.riskBand}
                scaleIndex={r.scaleIndex} maxGross={r.maxGross} isWinner={false}
              />
            </div>
            <h2 style={{ marginTop: 8, marginBottom: 4, textAlign: "center" }}>{r.name}</h2>
            <p className="predict-label">{label}</p>
            <div className="stat-divider" />
            <StatRow label="Scale Index"     value={r.scaleIndex} />
            <StatRow label="Stability Index" value={r.stabilityIndex} />
            <StatRow label="Tier"            value={r.tier} />
            <StatRow label="Risk Band"       value={r.riskBand} />
            {r.migration !== "N/A" && <StatRow label="Migration" value={r.migration} />}
            <p className="overlay">{r.overlay}</p>
          </div>
          <MicroActions actorName={r.name} tier={r.tier} onCompare={handleCompareActivate} />
          <ShareSignal payload={{ mode: "single", name: r.name, scaleIndex: r.scaleIndex, tier: r.tier, riskBand: r.riskBand }} />
        </>
      );
    }

    if (response.type === "comparison") {
      const { left, right, winner } = response;
      return (
        <>
          <div className="compare-outer fade-in">
            <div className="compare-row">
              <ComparisonCard data={left}  isWinner={winner === left.name}  />
              <div className="compare-vs-center">
                <span className="compare-vs-text">VS</span>
                <div className="compare-vs-line" />
              </div>
              <ComparisonCard data={right} isWinner={winner === right.name} />
            </div>
            <div className="compare-winner-bar">
              <span className="compare-winner-label">Capital Edge:</span>
              <strong className="compare-winner-name">{winner}</strong>
            </div>
            <ShareSignal payload={{ mode: "comparison", left: left.name, right: right.name, winner }} />
          </div>
          <HomeEngageBlock
            title="Go Deeper"
            chips={[
              { label: `${winner} full profile`, query: winner },
              { label: `Will ${winner === left.name ? right.name : left.name} close the gap?`, query: `will ${winner === left.name ? right.name : left.name} reach tier ${Math.min(left.tier, right.tier)}` },
              { label: "Who Is Closest To Tier 1?", query: "who is closest to tier 1" },
            ]}
            quantumCta
            onSubmit={handleSubmit}
          />
        </>
      );
    }

    return null;
  };

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────

  if (!activated) {
    return (
      <div className="page-shell">

        {/* ══ BACKGROUND ══
            Layer order (bottom → top):
            1. bg.png image fill
            2. Lavender gradient overlay (readability)
            3. Original purple gradient (depth)
            4. Canvas network animation (unchanged)
            5. Grain texture (unchanged)
        */}
        <div className="cinematic-bg" aria-hidden="true">
          <img
  src="/background/bg.webp"
  alt=""
  fetchPriority="high"
  decoding="async"
  aria-hidden="true"
  style={{
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center top",
    opacity: 0.40,
    filter: "saturate(0.75) brightness(0.85)",
    pointerEvents: "none",
  }}
/>
          <div className="cinematic-bg__lavender" />
          <div className="cinematic-bg__scan" />
          <div className="cinematic-bg__grad-a" />
          <div className="cinematic-bg__grad-b" />
          <div className="cinematic-bg__grad-c" />
          <canvas className="cinematic-bg__network" id="bgNetwork" />
          <div className="cinematic-bg__grain" />
        </div>

        <div className="hero-shell">
          {/* Floating star particles — UNTOUCHED */}
          <div className="hero-particles" aria-hidden="true">
            {[
              { x:"12%", y:"18%", d:"0s", dur:"6s" }, { x:"88%", y:"22%", d:"1.4s", dur:"7s" },
              { x:"25%", y:"72%", d:"0.7s", dur:"5s" }, { x:"78%", y:"68%", d:"2.1s", dur:"8s" },
              { x:"50%", y:"10%", d:"1.0s", dur:"6s" }, { x:"6%",  y:"48%", d:"2.8s", dur:"7s" },
              { x:"94%", y:"52%", d:"0.3s", dur:"5s" }, { x:"38%", y:"85%", d:"1.7s", dur:"9s" },
              { x:"63%", y:"80%", d:"3.2s", dur:"6s" }, { x:"72%", y:"15%", d:"0.9s", dur:"7s" },
            ].map((p, i) => (
              <span key={i} className="hero-particle"
                style={{ left: p.x, top: p.y, animationDelay: p.d, animationDuration: p.dur }} />
            ))}
          </div>

          {/* Logo — UNTOUCHED */}
          <h1 className="title-cinematic" aria-label="StarsQ">
            <span className="title-stars-text">Stars</span>
            <svg
              className="title-q-reel"
              viewBox="0 0 56 72"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="qRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="55%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#22D3EE" />
                </linearGradient>
                <radialGradient id="qHubGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.4" />
                </radialGradient>
                <linearGradient id="qTailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22D3EE" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <circle cx="27" cy="27" r="24" fill="url(#qRingGrad)" />
              {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const cx = 27 + 16 * Math.cos(rad);
                const cy = 27 + 16 * Math.sin(rad);
                return <circle key={i} cx={cx} cy={cy} r={4.2} fill="#0b0d12" />;
              })}
              <circle cx="27" cy="27" r="9.5" fill="#0b0d12" />
              <circle cx="27" cy="27" r="6.5" fill="url(#qHubGrad)" />
              <line
                x1="43.5" y1="42" x2="52" y2="66"
                stroke="url(#qTailGrad)" strokeWidth="4.5" strokeLinecap="round"
              />
            </svg>
          </h1>

          {/* Subtitle — UNTOUCHED */}
          <p className="subtitle">Capital Intelligence for Cinema</p>

          {/* ══ NEW: Cinematic tagline ══ */}
          <p className="hero-tagline">
            Cinema is <span className="hero-tagline-accent">Creative &amp; CAPITAL.</span>
          </p>

          {/* ══ NEW: CTA row ══ */}
          <div className="hero-cta-row">
            <Link href="/starquantum" className="hero-cta-btn hero-cta-btn--primary">
              Enter Star Quantum →
            </Link>
            <Link href="/filmlab" className="hero-cta-btn hero-cta-btn--ghost">
              Open FilmLab
            </Link>
          </div>

          {/* ── Hero explainer ── */}
          <p className="hero-explainer">
            StarsQ decodes Cinema -{" "}
            <span className="hero-explainer-accent">Every star, every Tier, every ₹</span>
          </p>

          {/* Search box — UNTOUCHED */}
          <div className="search-box" style={{ marginTop: 20, width: "100%", maxWidth: 620 }}>
            <span className="search-q-embed">Q</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder={PLACEHOLDERS[placeholder]}
            />
            <button className="search-analyze-btn" onClick={() => handleSubmit()}>
              Analyze
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AFTER SEARCH — UNTOUCHED
  return (
    <div className="page-shell">
      <div className="cinematic-bg" aria-hidden="true">
        <img
  src="/background/bg.webp"
  alt=""
  fetchPriority="high"
  decoding="async"
  aria-hidden="true"
  style={{
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center top",
    opacity: 0.40,
    filter: "saturate(0.75) brightness(0.85)",
    pointerEvents: "none",
  }}
/>
        <div className="cinematic-bg__lavender" />
        <div className="cinematic-bg__scan" />
        <div className="cinematic-bg__grad-a" />
        <div className="cinematic-bg__grad-b" />
        <div className="cinematic-bg__grad-c" />
        <div className="cinematic-bg__grain" />
      </div>

      <div className="engaged-bar">
        <div className="search-box" style={{ width: "100%", maxWidth: 640 }}>
          <span className="search-q-embed">Q</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder={PLACEHOLDERS[placeholder]}
          />
          {!loading && (
            <button className="search-reanalyze" onClick={() => handleSubmit()} title="Re-analyze" aria-label="Re-analyze">
              ↺
            </button>
          )}
          <button className="search-analyze-btn" onClick={() => handleSubmit()}>
            {loading ? <span className="search-btn-spinner" /> : "Analyze"}
          </button>
        </div>
      </div>

      <div className="results-section">
        {loading && (
          <div className="loader-container">
            <div className="pq-loader">
              {/* Outer slow-rotating orbital — preserves cosmo feel */}
              <div className="pq-orbit" />
              {/* Orbiting dot — the cosmo ball dot */}
              <div className="pq-stardust" />
              {/* Peacock eye — concentric rings */}
              <div className="pq-eye">
                <div className="pq-ring pq-ring-gold" />
                <div className="pq-ring pq-ring-teal" />
                <div className="pq-ring pq-ring-blue" />
                <div className="pq-core" />
                <div className="pq-q">Q</div>
              </div>
            </div>
            <p className="loader-text">
              <span className="loader-brand">StarsQ</span> Capital Analysis
            </p>
          </div>
        )}
        {!loading && quantumRoute && (
          <QuantumExpansionCard
            label={quantumRoute.label}
            route={quantumRoute.route}
            raw={quantumRoute.raw}
          />
        )}
        {!loading && !quantumRoute && renderResult()}
      </div>
    </div>
  );
}
