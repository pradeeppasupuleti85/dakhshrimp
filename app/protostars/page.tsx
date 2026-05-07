"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { resolveActor } from "@/lib/resolver";

/* ════════════════════════════════════════════════
   LOOKUP TABLES
════════════════════════════════════════════════ */
const ACTOR_STAGE_CONFIG = {
  "Debut Talent":               { baseOpening: 3,  tierKey: "debut",    stability: 55 },
  "Rising Talent":              { baseOpening: 6,  tierKey: "debut",    stability: 65 },
  "Emerging Commercial Talent": { baseOpening: 10, tierKey: "emerging", stability: 72 },
  "Tier 3 Actor":               { baseOpening: 15, tierKey: "tier3",    stability: 78 },
  "Tier 2 Actor":               { baseOpening: 35, tierKey: "tier2",    stability: 85 },
  "Tier 1 Actor":               { baseOpening: 70, tierKey: "tier1",    stability: 92 },
} as const;

const ACTOR_BUZZ_CONFIG = {
  "None":        { multiplier: 1.00, score: 40  },
  "Moderate":    { multiplier: 1.15, score: 60  },
  "High":        { multiplier: 1.35, score: 80  },
  "Event Debut": { multiplier: 1.60, score: 100 },
} as const;

const DIRECTOR_STAGE_CONFIG = {
  "Debut Director":      { riskMult: 1.35 },
  "Promising Director":  { riskMult: 1.15 },
  "Breakout Director":   { riskMult: 1.00 },
  "Commercial Director": { riskMult: 0.90 },
} as const;

const DIRECTOR_BUZZ_CONFIG = {
  "None":          { contentBonus: 0  },
  "Industry Buzz": { contentBonus: 5  },
  "Festival Buzz": { contentBonus: 8  },
  "Viral Buzz":    { contentBonus: 10 },
} as const;

const GENRE_CONFIG = {
  "Action":   { mult: 3.5, baseDays: 100 },
  "Thriller": { mult: 3.0, baseDays: 60  },
  "Comedy":   { mult: 2.8, baseDays: 50  },
  "Drama":    { mult: 2.4, baseDays: 70  },
} as const;

const TIER_SAFE_MULT = {
  tier1: 4, tier2: 3, tier3: 2, emerging: 2, debut: 1.5,
} as const;

const COMP_MODEL_FACTOR = {
  "Traditional": 1.00,
  "Hybrid":      0.85,
  "ROI":         0.65,
} as const;

const MAX_OPENING = 112;

/* ════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════ */
type ActorStage    = keyof typeof ACTOR_STAGE_CONFIG;
type ActorBuzz     = keyof typeof ACTOR_BUZZ_CONFIG;
type DirectorStage = keyof typeof DIRECTOR_STAGE_CONFIG;
type DirectorBuzz  = keyof typeof DIRECTOR_BUZZ_CONFIG;
type Genre         = keyof typeof GENRE_CONFIG;
type CompModel     = keyof typeof COMP_MODEL_FACTOR;
type DangerZone    = "Safe Zone" | "Controlled" | "Elevated Risk" | "Danger Zone";
type BreakoutBand  = "High Breakout Potential" | "Moderate Breakout Potential" | "Limited Breakout Potential" | "Low Breakout Potential";

interface SimResults {
  actorOpening: number; expectedGross: number; effectiveBudget: number;
  adjustedBudget: number; projectedROI: number; producerShare: number;
  capitalExposure: number; safeBudget: number;
  recommendedBudgetLo: number; recommendedBudgetHi: number;
  dangerRatio: number; dangerZone: DangerZone; scheduleFactor: number;
  castingScore: number; contentScore: number; scheduleScore: number;
  starCapital: number; budgetEfficiency: number; cvi: number;
  breakoutScore: number; breakoutBand: BreakoutBand; stability: number;
}

/* ════════════════════════════════════════════════
   WEIGHTED CAPITAL PRESSURE ENGINE
════════════════════════════════════════════════ */
function simulate(p: {
  actorOpening: number; actorBuzz: ActorBuzz; actorStage: ActorStage | null;
  directorStage: DirectorStage; directorBuzz: DirectorBuzz; genre: Genre;
  leadPull: number; supporting: number; veteran: number;
  story: number; screenplay: number; charDepth: number; commercial: number;
  plannedDays: number; compModel: CompModel; budget: number;
  stability: number; tierKey: string;
  budgetTolerance?: number; // present for real StarsQ actors — Signal's calibrated safe ceiling
}): SimResults {
  const buzzMult    = ACTOR_BUZZ_CONFIG[p.actorBuzz].multiplier;
  const buzzScore   = ACTOR_BUZZ_CONFIG[p.actorBuzz].score;
  const dirRisk     = DIRECTOR_STAGE_CONFIG[p.directorStage].riskMult;
  const dirBonus    = DIRECTOR_BUZZ_CONFIG[p.directorBuzz].contentBonus;
  const genreMult   = GENRE_CONFIG[p.genre].mult;
  const baseDays    = GENRE_CONFIG[p.genre].baseDays;
  const tierKey     = p.tierKey as keyof typeof TIER_SAFE_MULT;
  const safeMult    = TIER_SAFE_MULT[tierKey] ?? 2;
  const modelFactor = COMP_MODEL_FACTOR[p.compModel];

  // Opening & gross
  const actorOpening  = p.actorOpening * buzzMult;
  const expectedGross = actorOpening * genreMult * (1 / dirRisk);

  // Scores
  const castingRaw   = p.leadPull * 0.5 + p.supporting * 0.3 + p.veteran * 0.2;
  const castingScore = Math.min(100, castingRaw + (p.compModel === "ROI" ? 10 : 0));
  const contentScore = Math.min(100, (p.story + p.screenplay + p.charDepth + p.commercial) / 4 + dirBonus);
  const scheduleScore = Math.min(100, (baseDays / Math.max(p.plannedDays, 1)) * 100);

  // Schedule factor — shorter shoot = lower capital pressure
  const scheduleFactor = p.plannedDays / baseDays;

  // AdjustedBudget = what producer actually commits
  const adjustedBudget  = p.budget * scheduleFactor * modelFactor;
  const effectiveBudget = p.budget * modelFactor;

  // ── SafeBudget: Signal-consistent BEP math ──────────────────────────────
  // Signal's TRUE BEP formula (shown on Signal page):
  //   BEP gross = Budget × 1.45 / 0.40 (dist share 40%, overheads 1.45×)
  // Inverted: SafeBudget = ExpectedGross × 0.40 / 1.45
  // This is the budget at which producer share exactly covers capital.
  // Above this = Signal starts showing increasing capital loss probability.
  // budgetTolerance (real actors only) is a hard cap — never recommend beyond
  // what Signal's actor history supports as viable ceiling.
  //
  // Content & casting flex the FLOOR (0.7–1.0× of SafeBudget), not the ceiling.
  // Poor content → cautious floor. Strong content → full range.
  const bepSafe = expectedGross * 0.40 / 1.45;
  const safeBase = p.budgetTolerance !== undefined
    ? Math.min(bepSafe, p.budgetTolerance)
    : bepSafe;
  // Floor modifier: strong content/casting = recommend up to full safe ceiling
  // weak content/casting = be more conservative (floor closer to 0.5×)
  const contentCastingFloor = 0.50 + (contentScore / 100 * 0.15) + (castingScore / 100 * 0.05);
  const safeBudget = safeBase; // ceiling
  const recommendedLo = Math.round(safeBase * contentCastingFloor);
  const recommendedHi = Math.round(safeBase);

  // Danger uses AdjustedBudget vs SafeBudget
  const dangerRatio = safeBudget > 0 ? adjustedBudget / safeBudget : 99;
  const dangerZone: DangerZone =
    dangerRatio < 0.6 ? "Safe Zone" : dangerRatio < 0.9 ? "Controlled" :
    dangerRatio < 1.2 ? "Elevated Risk" : "Danger Zone";

  const producerShare   = expectedGross * 0.40;
  const capitalExposure = adjustedBudget - producerShare;
  const projectedROI    = effectiveBudget > 0 ? expectedGross / effectiveBudget : 0;

  const starCapital      = Math.min(100, (actorOpening / MAX_OPENING) * 100);
  const budgetEfficiency = adjustedBudget > 0 ? Math.min(100, (safeBudget / adjustedBudget) * 100) : 100;
  const cvi = Math.round(starCapital * 0.35 + budgetEfficiency * 0.30 + castingScore * 0.20 + contentScore * 0.15);

  const breakoutScore =
    contentScore * 0.45 + (buzzScore) * 0.25 + castingScore * 0.20 + scheduleScore * 0.10;
  const breakoutBand: BreakoutBand =
    breakoutScore >= 80 ? "High Breakout Potential" :
    breakoutScore >= 65 ? "Moderate Breakout Potential" :
    breakoutScore >= 50 ? "Limited Breakout Potential" : "Low Breakout Potential";

  return {
    actorOpening:        Math.round(actorOpening * 10) / 10,
    expectedGross:       Math.round(expectedGross),
    effectiveBudget:     Math.round(effectiveBudget),
    adjustedBudget:      Math.round(adjustedBudget * 10) / 10,
    projectedROI:        Math.round(projectedROI * 100) / 100,
    producerShare:       Math.round(producerShare),
    capitalExposure:     Math.round(capitalExposure),
    safeBudget:          Math.round(safeBudget),
    recommendedBudgetLo: recommendedLo,
    recommendedBudgetHi: recommendedHi,
    dangerRatio:         Math.round(dangerRatio * 100) / 100,
    dangerZone, scheduleFactor: Math.round(scheduleFactor * 100) / 100,
    castingScore: Math.round(castingScore), contentScore: Math.round(contentScore),
    scheduleScore: Math.round(scheduleScore), starCapital: Math.round(starCapital),
    budgetEfficiency: Math.round(budgetEfficiency), cvi,
    breakoutScore: Math.round(breakoutScore), breakoutBand, stability: p.stability,
  };
}

/* ════════════════════════════════════════════════
   ROCKET ANIMATION
════════════════════════════════════════════════ */
function RocketLaunch({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9999 }}>
      <div className="ps-rocket-wrap">
        <div className="ps-rocket-emoji">🚀</div>
        {[0,1,2,3,4,5,6,7].map(i => <div key={i} className={`ps-spark ps-spark--${i}`} />)}
      </div>
      <div className="ps-starburst">
        {["✦","✧","★","✦","✧","✦","★","✧"].map((s, i) => (
          <span key={i} className={`ps-burst-star ps-burst-star--${i}`}>{s}</span>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   SLIDER
════════════════════════════════════════════════ */
function Slider({ label, value, onChange, min=0, max=100, step=1, unit="", sublabel }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; unit?: string; sublabel?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="ps-slider-wrap">
      <div className="ps-sl-header">
        <span className="ps-sl-label">{label}</span>
        <span className="ps-sl-value">{value}{unit}</span>
      </div>
      {sublabel && <div className="ps-sl-sub">{sublabel}</div>}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} className="ps-slider"
        style={{ "--pct": `${pct}%` } as React.CSSProperties} />
    </div>
  );
}

/* ════════════════════════════════════════════════
   SELECT
════════════════════════════════════════════════ */
function PSSelect<T extends string>({ label, value, options, onChange, disabled }: {
  label: string; value: T; options: T[]; onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <div className={`ps-sel-wrap${disabled ? " ps-disabled" : ""}`}>
      <label className="ps-sel-label">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value as T)}
        disabled={disabled} className="ps-sel">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ════════════════════════════════════════════════
   CARD WRAPPER
════════════════════════════════════════════════ */
function Card({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="ps-card">
      <div className="ps-card-header">
        <h3 className="ps-card-title">{title}</h3>
        {badge && <span className="ps-card-badge">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════
   CVI RING
════════════════════════════════════════════════ */
function CVIRing({ value }: { value: number }) {
  const r = 52, circ = 2 * Math.PI * r, fill = (value / 100) * circ;
  const color = value >= 70 ? "#0EA5E9" : value >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <div className="ps-cvi-ring">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(14,165,233,0.12)" strokeWidth="8"/>
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}/>
      </svg>
      <div className="ps-cvi-inner">
        <div style={{ fontSize:36, fontWeight:800, color, letterSpacing:"-0.03em", lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:11, fontWeight:700, color:"#64748b", letterSpacing:"0.08em", textTransform:"uppercase" }}>CVI</div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   DANGER METER
════════════════════════════════════════════════ */
function DangerMeter({ ratio, zone }: { ratio: number; zone: string }) {
  const pct   = Math.min(ratio * 50, 100);
  const color = zone === "Safe Zone" ? "#22C55E" : zone === "Controlled" ? "#0EA5E9" :
    zone === "Elevated Risk" ? "#F59E0B" : "#EF4444";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ height:8, background:"rgba(14,165,233,0.12)", borderRadius:4, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:4, minWidth:4,
          transition:"width 0.7s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:11, color:"#22C55E" }}>Safe</span>
        <span style={{ fontSize:11, color:"#EF4444" }}>Danger</span>
      </div>
      <div style={{ fontSize:14, fontWeight:700, color }}>{zone}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   STARFIELD
════════════════════════════════════════════════ */
function StarfieldBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let animId: number;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.3,
      phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.6,
    }));
    let t = 0;
    const draw = () => {
      t += 0.008; ctx.clearRect(0, 0, c.width, c.height);
      stars.forEach(s => {
        const op = 0.12 + 0.10 * Math.sin(t * s.speed + s.phase);
        ctx.beginPath(); ctx.arc(s.x * c.width, s.y * c.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op})`; ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, opacity:0.7 }} />;
}

/* ════════════════════════════════════════════════
   AWAITING CARD
════════════════════════════════════════════════ */
function AwaitingCard({ label }: { label: string }) {
  return (
    <div className="ps-res-card" style={{ textAlign:"center" }}>
      <div className="ps-res-label">{label}</div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"20px 0 10px" }}>
        <div className="ps-await-dots"><span/><span/><span/></div>
        <div style={{ fontSize:13, color:"#94a3b8", fontWeight:500 }}>Awaiting analysis…</div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════ */
export default function ProtoStars() {
  const [actorSearch, setActorSearch]             = useState("");
  const [actorSuggestions, setActorSuggestions]   = useState<string[]>([]);
  const [selectedActor, setSelectedActor]         = useState<{
    name: string; openingCr: number; stability: number; tierKey: string; budgetTolerance: number;
  } | null>(null);
  const [actorStage, setActorStage]               = useState<ActorStage>("Debut Talent");
  const [actorBuzz,  setActorBuzz]                = useState<ActorBuzz>("None");
  const [directorStage, setDirectorStage]         = useState<DirectorStage>("Debut Director");
  const [directorBuzz,  setDirectorBuzz]          = useState<DirectorBuzz>("None");
  const [genre, setGenre]                         = useState<Genre>("Action");
  const [leadPull,   setLeadPull]                 = useState(50);
  const [supporting, setSupporting]               = useState(50);
  const [veteran,    setVeteran]                  = useState(50);
  const [story,      setStory]                    = useState(50);
  const [screenplay, setScreenplay]               = useState(50);
  const [charDepth,  setCharDepth]                = useState(50);
  const [commercial, setCommercial]               = useState(50);
  const [plannedDays, setPlannedDays]             = useState<number>(100);
  const [compModel, setCompModel]                 = useState<CompModel>("Traditional");
  const [budget, setBudget]                       = useState(20);

  // Analysis state
  const [hasRun, setHasRun]                       = useState(false);
  const [displayResults, setDisplayResults]       = useState<SimResults | null>(null);
  const [rocketActive, setRocketActive]           = useState(false);
  const [resultsVisible, setResultsVisible]       = useState(false);
  const resultsRef                                = useRef<HTMLDivElement>(null);

  useEffect(() => { setPlannedDays(GENRE_CONFIG[genre].baseDays); }, [genre]);

  const handleActorSearch = (val: string) => {
    setActorSearch(val);
    if (!val.trim()) { setActorSuggestions([]); return; }
    const r = resolveActor(val);
    if (r.type === "single")       setActorSuggestions([r.actor.name]);
    else if (r.type === "multiple") setActorSuggestions(r.options.slice(0, 5));
    else if (r.type === "suggest") setActorSuggestions([r.suggestion]);
    else                           setActorSuggestions([]);
  };

  const selectActor = (name: string) => {
    const r = resolveActor(name); if (r.type !== "single") return;
    const a = r.actor;
    const tierKey = a.openingCr >= 60 ? "tier1" : a.openingCr >= 30 ? "tier2" :
      a.openingCr >= 10 ? "tier3" : "emerging";
    // Stability display value: kept as openingCr-tier for the UI number shown
    // (Signal's stabilityIndex needs roiStdDev which may not be in deployed Actor type)
    const stability = a.openingCr >= 100 ? 88 : a.openingCr >= 60 ? 82 :
      a.openingCr >= 30 ? 72 : a.openingCr >= 15 ? 68 : 60;
    // budgetTolerance = Signal's pre-calibrated safe capital ceiling for this actor
    setSelectedActor({ name, openingCr: a.openingCr, stability, tierKey, budgetTolerance: a.budgetTolerance });
    setActorSearch(name); setActorSuggestions([]);
  };

  const clearActor = () => { setSelectedActor(null); setActorSearch(""); setActorSuggestions([]); };

  const isCustomMode = !selectedActor;
  const stageConfig  = ACTOR_STAGE_CONFIG[actorStage];
  const rawOpening   = selectedActor ? selectedActor.openingCr : stageConfig.baseOpening;
  const tierKey      = selectedActor ? selectedActor.tierKey   : stageConfig.tierKey;
  const stability    = selectedActor ? selectedActor.stability : stageConfig.stability;

  const handleRun = useCallback(() => {
    if (rocketActive) return;
    const res = simulate({
      actorOpening: rawOpening, actorBuzz: isCustomMode ? actorBuzz : "None",
      actorStage: isCustomMode ? actorStage : null,
      directorStage, directorBuzz, genre, leadPull, supporting, veteran,
      story, screenplay, charDepth, commercial, plannedDays, compModel, budget,
      stability, tierKey,
      budgetTolerance: selectedActor?.budgetTolerance, // undefined for custom talent
    });
    setResultsVisible(false); setRocketActive(true); setHasRun(true);
    setTimeout(() => {
      setDisplayResults(res); setResultsVisible(true); setRocketActive(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }, 1500);
  }, [rawOpening, isCustomMode, actorBuzz, actorStage, directorStage, directorBuzz,
      genre, leadPull, supporting, veteran, story, screenplay, charDepth, commercial,
      plannedDays, compModel, budget, stability, tierKey, rocketActive]);

  const displayOpening   = selectedActor ? selectedActor.openingCr : (displayResults?.actorOpening ?? rawOpening);
  const scheduleBaseline = GENRE_CONFIG[genre].baseDays;

  return (
    <>
      <style>{`
        .ps-root{min-height:100vh;background:linear-gradient(160deg,#0369a1 0%,#0284c7 15%,#0ea5e9 35%,#38bdf8 55%,#7dd3fc 75%,#bae6fd 90%,#e0f2fe 100%);position:relative;font-family:-apple-system,"SF Pro Display","SF Pro Text",BlinkMacSystemFont,"Helvetica Neue",sans-serif;}
        .ps-nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:14px 40px;background:rgba(2,132,199,0.72);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.18);}
        .ps-nav-brand{font-size:15px;font-weight:700;color:rgba(255,255,255,0.7);text-decoration:none;}
        .ps-nav-brand span{color:#fff;}
        .ps-nav-title{font-size:15px;font-weight:700;color:#fff;}
        .ps-nav-tag{font-size:11px;font-weight:700;letter-spacing:0.10em;text-transform:uppercase;color:rgba(255,255,255,0.6);}
        .ps-hero{position:relative;z-index:1;text-align:center;padding:52px 24px 40px;}
        .ps-hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.65);margin-bottom:12px;}
        .ps-hero-title{font-size:clamp(42px,7vw,72px);font-weight:800;letter-spacing:-0.04em;color:#fff;margin:0 0 10px;line-height:1;text-shadow:0 2px 32px rgba(2,132,199,0.5);}
        .ps-hero-title span{background:linear-gradient(135deg,#fff 0%,#bae6fd 60%,#38bdf8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .ps-hero-sub{font-size:16px;color:rgba(255,255,255,0.75);margin:0;}
        .ps-body{position:relative;z-index:1;max-width:1240px;margin:0 auto;padding:0 24px 80px;display:grid;grid-template-columns:1fr 420px;gap:28px;align-items:start;}
        .ps-left{display:flex;flex-direction:column;gap:18px;}
        .ps-card{background:rgba(255,255,255,0.88);border:1px solid rgba(255,255,255,0.95);border-radius:20px;padding:22px 24px;box-shadow:0 4px 24px rgba(2,132,199,0.12),0 1px 4px rgba(0,0,0,0.06);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}
        .ps-card-header{display:flex;align-items:center;gap:10px;margin-bottom:18px;}
        .ps-card-title{font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0369a1;margin:0;}
        .ps-card-badge{font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:3px 8px;border-radius:20px;background:rgba(14,165,233,0.12);color:#0284c7;border:1px solid rgba(14,165,233,0.25);}
        .ps-mode-banner{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;font-weight:600;}
        .ps-mode-real{background:rgba(14,165,233,0.10);border:1px solid rgba(14,165,233,0.28);color:#0284c7;}
        .ps-mode-custom{background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.22);color:#7c3aed;}
        .ps-mode-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
        .ps-clear{margin-left:auto;background:none;border:1px solid rgba(14,165,233,0.3);border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600;color:#0369a1;cursor:pointer;font-family:inherit;}
        .ps-clear:hover{background:rgba(14,165,233,0.10);}
        .ps-search-wrap{position:relative;margin-bottom:6px;}
        .ps-search-input{width:100%;box-sizing:border-box;padding:11px 40px 11px 14px;border:1.5px solid rgba(14,165,233,0.35);border-radius:11px;font-size:14px;font-family:inherit;color:#0c4a6e;background:rgba(255,255,255,0.9);outline:none;transition:border-color 150ms;}
        .ps-search-input:focus{border-color:#0ea5e9;background:#fff;}
        .ps-search-input::placeholder{color:rgba(14,116,144,0.45);}
        .ps-search-icon{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:14px;color:rgba(14,165,233,0.5);pointer-events:none;}
        .ps-suggestions{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1px solid rgba(14,165,233,0.25);border-radius:10px;overflow:hidden;z-index:20;box-shadow:0 8px 24px rgba(2,132,199,0.15);}
        .ps-sug-item{padding:10px 14px;font-size:14px;color:#0c4a6e;cursor:pointer;font-family:inherit;transition:background 120ms;}
        .ps-sug-item:hover{background:rgba(14,165,233,0.08);}
        .ps-hint{font-size:11px;color:rgba(14,116,144,0.55);margin-top:5px;}
        .ps-sel-wrap{display:flex;flex-direction:column;gap:5px;margin-top:12px;}
        .ps-sel-wrap:first-child{margin-top:0;}
        .ps-disabled{opacity:0.38;pointer-events:none;}
        .ps-sel-label{font-size:12px;font-weight:600;color:#0369a1;}
        .ps-sel{padding:10px 32px 10px 12px;border:1.5px solid rgba(14,165,233,0.28);border-radius:10px;font-size:14px;font-family:inherit;color:#0c4a6e;background:rgba(255,255,255,0.9);outline:none;cursor:pointer;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%230369a1' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;}
        .ps-genre-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
        .ps-genre-pill{padding:10px 6px;border-radius:12px;border:1.5px solid rgba(14,165,233,0.25);background:rgba(255,255,255,0.7);color:#0369a1;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;text-align:center;transition:all 160ms;}
        .ps-genre-pill:hover{border-color:#0ea5e9;background:rgba(14,165,233,0.08);}
        .ps-genre-pill--on{background:#0ea5e9!important;border-color:#0284c7!important;color:#fff!important;box-shadow:0 4px 14px rgba(14,165,233,0.35);}
        .ps-genre-days{font-size:10px;opacity:0.7;display:block;margin-top:2px;}
        .ps-slider-wrap{display:flex;flex-direction:column;gap:6px;margin-top:14px;}
        .ps-slider-wrap:first-of-type{margin-top:0;}
        .ps-sl-header{display:flex;justify-content:space-between;align-items:baseline;}
        .ps-sl-label{font-size:13px;font-weight:600;color:#0c4a6e;}
        .ps-sl-value{font-size:14px;font-weight:700;color:#0284c7;min-width:40px;text-align:right;}
        .ps-sl-sub{font-size:11px;color:rgba(14,116,144,0.6);}
        .ps-slider{-webkit-appearance:none;appearance:none;width:100%;height:5px;border-radius:3px;outline:none;cursor:pointer;margin-top:4px;background:linear-gradient(to right,#0ea5e9 0%,#0ea5e9 var(--pct,50%),rgba(14,165,233,0.18) var(--pct,50%),rgba(14,165,233,0.18) 100%);}
        .ps-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;border:2.5px solid #0ea5e9;box-shadow:0 2px 8px rgba(14,165,233,0.35);cursor:pointer;}
        .ps-comp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:4px;}
        .ps-comp-btn{padding:12px 8px;border-radius:12px;border:1.5px solid rgba(14,165,233,0.22);background:rgba(255,255,255,0.7);color:#0369a1;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;text-align:center;transition:all 160ms;}
        .ps-comp-btn:hover{border-color:#0ea5e9;}
        .ps-comp-btn--on{background:#0c4a6e!important;border-color:#0c4a6e!important;color:#fff!important;}
        .ps-comp-sub{font-size:10px;opacity:0.65;display:block;margin-top:3px;}
        .ps-budget-wrap{display:flex;align-items:center;border:1.5px solid rgba(14,165,233,0.35);border-radius:12px;background:rgba(255,255,255,0.9);overflow:hidden;margin-top:8px;}
        .ps-budget-pfx{padding:12px 14px;font-size:16px;font-weight:700;color:#0369a1;background:rgba(14,165,233,0.08);border-right:1px solid rgba(14,165,233,0.18);}
        .ps-budget-input{flex:1;border:none;outline:none;padding:12px 14px;font-size:22px;font-weight:700;font-family:inherit;color:#0c4a6e;background:transparent;min-width:0;}
        .ps-budget-unit{padding:12px 14px;font-size:13px;font-weight:600;color:rgba(14,116,144,0.55);}

        /* ── RUN BUTTON ── */
        .ps-run-btn{width:100%;padding:18px 32px;background:linear-gradient(135deg,#0369a1 0%,#0284c7 40%,#0ea5e9 100%);border:none;border-radius:16px;color:#fff;font-size:16px;font-weight:800;font-family:inherit;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;position:relative;overflow:hidden;box-shadow:0 8px 32px rgba(3,105,161,0.45);transition:transform 150ms,box-shadow 150ms;}
        .ps-run-btn:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(3,105,161,0.55);}
        .ps-run-btn:disabled{opacity:0.75;cursor:not-allowed;}
        .ps-run-btn::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.15) 50%,transparent 100%);transform:translateX(-100%);animation:btnShimmer 2.5s infinite 1s;}
        @keyframes btnShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
        .ps-run-inner{display:flex;align-items:center;justify-content:center;gap:12px;}

        /* ── ROCKET ── */
        .ps-rocket-wrap{position:absolute;bottom:22%;left:32%;animation:rocketFly 1.4s cubic-bezier(0.25,0.46,0.45,0.94) forwards;}
        .ps-rocket-emoji{font-size:32px;display:block;filter:drop-shadow(0 0 8px rgba(14,165,233,0.8));transform:rotate(-45deg);animation:rocketWobble 0.15s ease-in-out infinite alternate;}
        @keyframes rocketWobble{from{transform:rotate(-47deg) scale(1)}to{transform:rotate(-43deg) scale(1.04)}}
        @keyframes rocketFly{0%{bottom:22%;left:32%;opacity:1}60%{bottom:55%;left:62%;opacity:1}85%{bottom:68%;left:68%;opacity:1}95%{bottom:70%;left:70%;opacity:0.5}100%{bottom:72%;left:71%;opacity:0}}
        .ps-spark{position:absolute;width:6px;height:6px;border-radius:50%;top:50%;left:-4px;}
        .ps-spark--0{background:#ff9a00;animation:spk 0.4s 0.0s ease-out infinite;}
        .ps-spark--1{background:#ffcc00;animation:spk 0.4s 0.1s ease-out infinite;}
        .ps-spark--2{background:#ff6600;animation:spk 0.5s 0.05s ease-out infinite;}
        .ps-spark--3{background:#fff;animation:spk 0.35s 0.15s ease-out infinite;}
        .ps-spark--4{background:#ffaa44;animation:spk 0.45s 0.08s ease-out infinite;}
        .ps-spark--5{background:#ff4400;animation:spk 0.4s 0.2s ease-out infinite;}
        .ps-spark--6{background:#ffdd88;animation:spk 0.38s 0.12s ease-out infinite;}
        .ps-spark--7{background:#ff8800;animation:spk 0.42s 0.03s ease-out infinite;}
        @keyframes spk{0%{transform:translate(0,0) scale(1);opacity:0.9}100%{transform:translate(-14px,8px) scale(0);opacity:0}}
        .ps-starburst{position:absolute;top:28%;right:28%;animation:burstReveal 0.6s 1.1s ease-out both;}
        @keyframes burstReveal{from{opacity:0;transform:scale(0.2)}60%{opacity:1;transform:scale(1.3)}to{opacity:0;transform:scale(1.8)}}
        .ps-burst-star{position:absolute;font-size:20px;color:#38bdf8;animation:starOut 0.6s 1.1s ease-out both;}
        .ps-burst-star--0{color:#fff;font-size:22px;--dx:0px;--dy:-30px;}
        .ps-burst-star--1{color:#38bdf8;font-size:16px;--dx:21px;--dy:-21px;}
        .ps-burst-star--2{color:#ffd700;font-size:20px;--dx:30px;--dy:0px;}
        .ps-burst-star--3{color:#fff;font-size:14px;--dx:21px;--dy:21px;}
        .ps-burst-star--4{color:#38bdf8;font-size:18px;--dx:0px;--dy:30px;}
        .ps-burst-star--5{color:#ffd700;font-size:16px;--dx:-21px;--dy:21px;}
        .ps-burst-star--6{color:#fff;font-size:20px;--dx:-30px;--dy:0px;}
        .ps-burst-star--7{color:#38bdf8;font-size:14px;--dx:-21px;--dy:-21px;}
        @keyframes starOut{from{opacity:1;transform:translate(0,0) scale(0.5)}to{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.2)}}

        /* ── RESULTS PANEL ── */
        .ps-right{position:sticky;top:72px;display:flex;flex-direction:column;gap:14px;}
        .ps-res-card{background:rgba(255,255,255,0.92);border:1px solid rgba(255,255,255,0.98);border-radius:20px;padding:22px;box-shadow:0 6px 30px rgba(2,132,199,0.14),0 1px 4px rgba(0,0,0,0.06);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);}
        .ps-res-label{font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#0369a1;text-align:center;margin:0 0 10px;}
        .ps-results-wrap{display:flex;flex-direction:column;gap:14px;opacity:0;transform:translateY(12px);transition:opacity 0.5s ease,transform 0.5s ease;}
        .ps-results-wrap--vis{opacity:1;transform:translateY(0);}
        .ps-cvi-card{display:flex;flex-direction:column;align-items:center;gap:10px;}
        .ps-cvi-ring{position:relative;width:128px;height:128px;display:flex;align-items:center;justify-content:center;}
        .ps-cvi-ring svg{position:absolute;inset:0;}
        .ps-cvi-inner{position:relative;z-index:1;text-align:center;}
        .ps-sub-scores{display:flex;border-radius:10px;overflow:hidden;border:1px solid rgba(14,165,233,0.18);width:100%;}
        .ps-sub-score{flex:1;padding:9px 6px;text-align:center;background:rgba(14,165,233,0.05);border-right:1px solid rgba(14,165,233,0.12);}
        .ps-sub-score:last-child{border-right:none;}
        .ps-sub-v{font-size:15px;font-weight:800;color:#0284c7;display:block;}
        .ps-sub-l{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:#94a3b8;display:block;margin-top:2px;}
        .ps-metrics-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        .ps-metric-item{display:flex;flex-direction:column;gap:3px;}
        .ps-metric-lbl{font-size:10px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#94a3b8;}
        .ps-metric-val{font-size:18px;font-weight:800;color:#0c4a6e;letter-spacing:-0.02em;}
        .ps-metric-sub{font-size:11px;color:#64748b;}
        .ps-divider{height:1px;background:rgba(14,165,233,0.12);margin:14px 0;}
        .ps-rec-budget{background:linear-gradient(135deg,rgba(14,165,233,0.10) 0%,rgba(56,189,248,0.08) 100%);border:1.5px solid rgba(14,165,233,0.25);border-radius:14px;padding:16px 18px;}
        .ps-rec-label{font-size:10px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#0369a1;margin-bottom:8px;}
        .ps-rec-range{font-size:22px;font-weight:800;color:#0284c7;letter-spacing:-0.02em;}
        .ps-rec-note{font-size:11px;color:#64748b;margin-top:4px;}
        .ps-mode-tag{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;margin-bottom:4px;}
        .ps-tag-real{background:rgba(14,165,233,0.10);color:#0284c7;border:1px solid rgba(14,165,233,0.25);}
        .ps-tag-custom{background:rgba(139,92,246,0.08);color:#7c3aed;border:1px solid rgba(139,92,246,0.22);}
        .ps-danger-chips{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;}
        .ps-danger-chip{font-size:11px;font-weight:600;padding:4px 9px;border-radius:20px;background:rgba(14,165,233,0.08);color:#0369a1;border:1px solid rgba(14,165,233,0.18);}
        .ps-await-dots{display:flex;gap:6px;}
        .ps-await-dots span{width:8px;height:8px;border-radius:50%;background:rgba(14,165,233,0.3);animation:dotPulse 1.4s ease-in-out infinite;}
        .ps-await-dots span:nth-child(2){animation-delay:0.2s;}
        .ps-await-dots span:nth-child(3){animation-delay:0.4s;}
        @keyframes dotPulse{0%,80%,100%{transform:scale(0.8);opacity:0.4}40%{transform:scale(1.2);opacity:1}}
        @media(max-width:960px){.ps-body{grid-template-columns:1fr;}.ps-right{position:static;}.ps-nav{padding:14px 20px;}}
        @media(max-width:640px){.ps-genre-grid{grid-template-columns:repeat(2,1fr);}.ps-metrics-grid{grid-template-columns:1fr;}.ps-hero{padding:36px 16px 28px;}.ps-body{padding:0 16px 60px;}}
      `}</style>

      <div className="ps-root">
        <StarfieldBg />
        <RocketLaunch active={rocketActive} />

        {/* NAV */}
        <nav className="ps-nav">
          <Link href="/" className="ps-nav-brand">Stars<span>Q</span></Link>
          <div className="ps-nav-title">ProtoStars</div>
          <div className="ps-nav-tag">Capital Simulation</div>
        </nav>

        {/* HERO */}
        <header className="ps-hero">
          <p className="ps-hero-eyebrow">New Talent · Capital Modeling</p>
          <h1 className="ps-hero-title">Proto<span>Stars</span></h1>
          <p className="ps-hero-sub">Model capital viability before the camera rolls.</p>
        </header>

        <div className="ps-body">

          {/* ═══ LEFT INPUTS ═══ */}
          <div className="ps-left">

            {/* ACTOR */}
            <Card title="Actor / Talent" badge={selectedActor ? "StarsQ Data" : "Custom Mode"}>
              {selectedActor ? (
                <div className="ps-mode-banner ps-mode-real">
                  <div className="ps-mode-dot" style={{ background:"#0ea5e9" }}/>
                  Using real data: <strong style={{ marginLeft:4 }}>{selectedActor.name}</strong>
                  <button className="ps-clear" onClick={clearActor}>Clear</button>
                </div>
              ) : (
                <div className="ps-mode-banner ps-mode-custom">
                  <div className="ps-mode-dot" style={{ background:"#7c3aed" }}/>
                  Custom talent simulation active
                </div>
              )}
              <div className="ps-search-wrap">
                <input type="text" className="ps-search-input"
                  placeholder="Search StarsQ actor… or leave empty for custom"
                  value={actorSearch} onChange={e => handleActorSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setActorSuggestions([]), 180)}/>
                <span className="ps-search-icon">⌕</span>
                {actorSuggestions.length > 0 && (
                  <div className="ps-suggestions">
                    {actorSuggestions.map(s => (
                      <div key={s} className="ps-sug-item" onMouseDown={() => selectActor(s)}>{s}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="ps-hint">
                {selectedActor
                  ? `Opening: ₹${selectedActor.openingCr}Cr · Stability: ${selectedActor.stability}`
                  : "Type to search 21 StarsQ actors, or configure below for custom talent"}
              </div>
              <div style={{ marginTop:16 }}>
                <PSSelect label="Actor Talent Stage" value={actorStage}
                  options={Object.keys(ACTOR_STAGE_CONFIG) as ActorStage[]}
                  onChange={setActorStage} disabled={!!selectedActor}/>
                <PSSelect label="Actor Buzz" value={actorBuzz}
                  options={Object.keys(ACTOR_BUZZ_CONFIG) as ActorBuzz[]}
                  onChange={setActorBuzz} disabled={!!selectedActor}/>
              </div>
            </Card>

            {/* DIRECTOR */}
            <Card title="Director">
              <PSSelect label="Director Stage" value={directorStage}
                options={Object.keys(DIRECTOR_STAGE_CONFIG) as DirectorStage[]}
                onChange={setDirectorStage}/>
              <PSSelect label="Director Buzz" value={directorBuzz}
                options={Object.keys(DIRECTOR_BUZZ_CONFIG) as DirectorBuzz[]}
                onChange={setDirectorBuzz}/>
            </Card>

            {/* GENRE */}
            <Card title="Genre">
              <div className="ps-genre-grid">
                {(Object.keys(GENRE_CONFIG) as Genre[]).map(g => (
                  <button key={g} className={`ps-genre-pill${genre===g?" ps-genre-pill--on":""}`}
                    onClick={() => setGenre(g)}>
                    {g}<span className="ps-genre-days">{GENRE_CONFIG[g].baseDays}d baseline</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* CASTING */}
            <Card title="Casting Structure" badge={compModel==="ROI" ? "+10 Cap. Discipline" : undefined}>
              <Slider label="Lead Actor Pull" value={leadPull} onChange={setLeadPull}
                sublabel="Protagonist's market drawing power"/>
              <Slider label="Supporting Cast Strength" value={supporting} onChange={setSupporting}
                sublabel="Quality and recognition of supporting roles"/>
              <Slider label="Veteran Presence" value={veteran} onChange={setVeteran}
                sublabel="Experience and stability of veteran cast"/>
              {compModel==="ROI" && (
                <div style={{ marginTop:14,padding:"8px 12px",background:"rgba(14,165,233,0.08)",
                  borderRadius:8,fontSize:12,color:"#0369a1",fontWeight:600 }}>
                  ✦ +10 Capital Discipline Bonus — ROI model active
                </div>
              )}
            </Card>

            {/* CONTENT */}
            <Card title="Content Score"
              badge={DIRECTOR_BUZZ_CONFIG[directorBuzz].contentBonus>0
                ? `+${DIRECTOR_BUZZ_CONFIG[directorBuzz].contentBonus} Dir. Buzz` : undefined}>
              <Slider label="Story"             value={story}      onChange={setStory}      sublabel="Narrative strength and originality"/>
              <Slider label="Screenplay"        value={screenplay} onChange={setScreenplay} sublabel="Script quality and execution"/>
              <Slider label="Character Depth"   value={charDepth}  onChange={setCharDepth}  sublabel="Role complexity and emotional range"/>
              <Slider label="Commercial Appeal" value={commercial} onChange={setCommercial} sublabel="Mass-market entertainment value"/>
            </Card>

            {/* SCHEDULE */}
            <Card title="Schedule Plan">
              <Slider label="Planned Shoot Days" value={plannedDays} onChange={setPlannedDays}
                min={20} max={200} step={1} unit=" days"
                sublabel={`${genre} baseline: ${scheduleBaseline}d — Capital pressure factor: ×${(plannedDays/scheduleBaseline).toFixed(2)}`}/>
              <div style={{ display:"flex",gap:10,marginTop:14 }}>
                {[
                  { label:"Rush",     days:Math.round(scheduleBaseline*0.6) },
                  { label:"Baseline", days:scheduleBaseline },
                  { label:"Extended", days:Math.round(scheduleBaseline*1.4) },
                ].map(p => (
                  <button key={p.label} onClick={() => setPlannedDays(p.days)}
                    style={{ flex:1,padding:"8px 4px",border:"1.5px solid",
                      borderColor:plannedDays===p.days?"#0ea5e9":"rgba(14,165,233,0.22)",
                      borderRadius:9,background:plannedDays===p.days?"rgba(14,165,233,0.10)":"rgba(255,255,255,0.6)",
                      color:"#0369a1",fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer" }}>
                    {p.label}<br/><span style={{ fontSize:10,opacity:0.65 }}>{p.days}d</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* COMPENSATION */}
            <Card title="Compensation Model">
              <div className="ps-comp-grid">
                {(["Traditional","Hybrid","ROI"] as CompModel[]).map(m => (
                  <button key={m} className={`ps-comp-btn${compModel===m?" ps-comp-btn--on":""}`}
                    onClick={() => setCompModel(m)}>
                    {m}<span className="ps-comp-sub">{m==="Traditional"?"×1.00":m==="Hybrid"?"×0.85":"×0.65"}</span>
                  </button>
                ))}
              </div>
              <div style={{ marginTop:12,fontSize:12,color:"#64748b",lineHeight:1.6 }}>
                {compModel==="Traditional" && "Full upfront fee. No capital reduction."}
                {compModel==="Hybrid"      && "Partial fee + backend. 15% adjusted budget reduction."}
                {compModel==="ROI"         && "Minimal upfront. Profit-share backend. 35% adjusted budget reduction."}
              </div>
            </Card>

            {/* BUDGET */}
            <Card title="Budget — Final Decision Variable">
              <div className="ps-budget-wrap">
                <span className="ps-budget-pfx">₹</span>
                <input type="number" className="ps-budget-input" value={budget} min={1}
                  onChange={e => setBudget(Math.max(1,Number(e.target.value)))}/>
                <span className="ps-budget-unit">Cr</span>
              </div>
              <div style={{ marginTop:10,fontSize:12,color:"#64748b" }}>
                Adjusted = ₹{budget}Cr × schedule factor × comp model
              </div>
            </Card>

            {/* RUN BUTTON */}
            <button className="ps-run-btn" onClick={handleRun} disabled={rocketActive}>
              <div className="ps-run-inner">
                <span style={{ fontSize:20 }}>🚀</span>
                <span>{rocketActive ? "Launching analysis…" : "Run Capital Analysis"}</span>
              </div>
            </button>

          </div>

          {/* ═══ RIGHT RESULTS ═══ */}
          <div className="ps-right" ref={resultsRef}>

            <div className={`ps-mode-tag ${selectedActor?"ps-tag-real":"ps-tag-custom"}`}>
              <span>{selectedActor ? "◉" : "◎"}</span>
              {selectedActor ? `StarsQ Actor — ${selectedActor.name}` : "Custom Talent Simulation"}
            </div>

            {!hasRun ? (
              <>
                <AwaitingCard label="Capital Viability Index"/>
                <AwaitingCard label="Breakout Probability"/>
                <AwaitingCard label="Budget Danger Level"/>
                <AwaitingCard label="Projection Metrics"/>
              </>
            ) : (
              <div className={`ps-results-wrap${resultsVisible?" ps-results-wrap--vis":""}`}>

                {/* CVI */}
                <div className="ps-res-card ps-cvi-card">
                  <p className="ps-res-label">Capital Viability Index</p>
                  <CVIRing value={displayResults?.cvi ?? 0}/>
                  <div className="ps-sub-scores">
                    {[
                      { v: displayResults?.starCapital,      l:"Star Capital" },
                      { v: displayResults?.budgetEfficiency, l:"Budget Eff."  },
                      { v: displayResults?.castingScore,     l:"Casting"      },
                      { v: displayResults?.contentScore,     l:"Content"      },
                    ].map(({ v, l }) => (
                      <div key={l} className="ps-sub-score">
                        <span className="ps-sub-v">{v ?? "–"}</span>
                        <span className="ps-sub-l">{l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BREAKOUT */}
                <div className="ps-res-card" style={{ textAlign:"center" }}>
                  <p className="ps-res-label">Breakout Probability</p>
                  {displayResults && (
                    <>
                      <div style={{ fontSize:32,fontWeight:800,letterSpacing:"-0.03em",
                        color: displayResults.breakoutBand.startsWith("High") ? "#0EA5E9" :
                               displayResults.breakoutBand.startsWith("Moderate") ? "#8B5CF6" :
                               displayResults.breakoutBand.startsWith("Limited") ? "#F59E0B" : "#94A3B8" }}>
                        {displayResults.breakoutScore}
                      </div>
                      <div style={{ fontSize:13,fontWeight:700,marginTop:3,
                        color: displayResults.breakoutBand.startsWith("High") ? "#0EA5E9" :
                               displayResults.breakoutBand.startsWith("Moderate") ? "#8B5CF6" :
                               displayResults.breakoutBand.startsWith("Limited") ? "#F59E0B" : "#94A3B8" }}>
                        {displayResults.breakoutBand}
                      </div>
                    </>
                  )}
                </div>

                {/* DANGER */}
                <div className="ps-res-card">
                  <p className="ps-res-label">Budget Danger Level</p>
                  {displayResults && (
                    <>
                      <DangerMeter ratio={displayResults.dangerRatio} zone={displayResults.dangerZone}/>
                      <div className="ps-danger-chips">
                        <span className="ps-danger-chip">Schedule ×{displayResults.scheduleFactor}</span>
                        <span className="ps-danger-chip">Adj. ₹{displayResults.adjustedBudget}Cr</span>
                        <span className="ps-danger-chip">Safe ₹{displayResults.safeBudget}Cr</span>
                      </div>
                    </>
                  )}
                </div>

                {/* METRICS */}
                <div className="ps-res-card">
                  <p className="ps-res-label">Projection Metrics</p>
                  {displayResults && (
                    <>
                      <div className="ps-metrics-grid">
                        <div className="ps-metric-item">
                          <span className="ps-metric-lbl">Expected Gross</span>
                          <span className="ps-metric-val">₹{displayResults.expectedGross}Cr</span>
                          <span className="ps-metric-sub">₹{displayOpening}Cr × {GENRE_CONFIG[genre].mult}× genre</span>
                        </div>
                        <div className="ps-metric-item">
                          <span className="ps-metric-lbl">Projected ROI</span>
                          <span className="ps-metric-val" style={{
                            color: displayResults.projectedROI>=1.5?"#22c55e":displayResults.projectedROI>=1?"#0284c7":"#ef4444" }}>
                            {displayResults.projectedROI}×
                          </span>
                          <span className="ps-metric-sub">Gross / Effective Budget</span>
                        </div>
                        <div className="ps-metric-item">
                          <span className="ps-metric-lbl">Capital Exposure</span>
                          <span className="ps-metric-val" style={{
                            color: displayResults.capitalExposure<=0?"#22c55e":"#ef4444" }}>
                            {displayResults.capitalExposure<=0
                              ? `+₹${Math.abs(displayResults.capitalExposure)}Cr surplus`
                              : `₹${displayResults.capitalExposure}Cr at risk`}
                          </span>
                          <span className="ps-metric-sub">Adj. budget − 40% producer share</span>
                        </div>
                        <div className="ps-metric-item">
                          <span className="ps-metric-lbl">Stability Signal</span>
                          <span className="ps-metric-val">{displayResults.stability}</span>
                          <span className="ps-metric-sub">{selectedActor ? "Signal formula: 100−(σ×50)" : "Simulated by stage"}</span>
                        </div>
                      </div>
                      <div className="ps-divider"/>
                      <div className="ps-rec-budget">
                        <div className="ps-rec-label">Recommended Budget Range</div>
                        <div className="ps-rec-range">₹{displayResults.recommendedBudgetLo}Cr – ₹{displayResults.recommendedBudgetHi}Cr</div>
                        <div className="ps-rec-note">
                          Signal TRUE BEP: gross × 40% ÷ 1.45. Budget above this range enters capital risk territory.
                          Current adjusted budget is <strong style={{
                            color: displayResults.dangerZone==="Safe Zone"?"#22c55e":
                                   displayResults.dangerZone==="Controlled"?"#0284c7":
                                   displayResults.dangerZone==="Elevated Risk"?"#f59e0b":"#ef4444" }}>
                            {displayResults.dangerZone.toLowerCase()}
                          </strong>.
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
