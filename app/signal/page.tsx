"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { actors, Actor } from "@/data/actors";
import { getAllActorProfiles, EngineResult } from "@/lib/engine";

/* ═══════════════════════════════════════════════════════════════
   SIGNAL CAPITAL MODELING LAYER v4
   Capital Economics Upgrade — All 8 directives applied

   CONFIRMATION ANSWERS:
   [1] Break-even multiple: TRUE_BEP_MULTIPLE = 1.45x gross.
       All BEP, survival, and loss logic references 1.45x, not 1.0x.
   [2] Marginal decay: projectedGross × exp(−strain × 0.5)
       Higher budgets compress projected gross structurally.
   [3] Ceiling regression: projectedGross × (1 − dvolPct/100 × 0.30)
       Volatile actors regress up to 30% from historical ceiling.
   [4] Share modeling: Gross → Nett (×0.82 GST) → Share (×0.40 dist).
       UI shows all three layers. ROI band shows share-based economic ROI.
   [5] Survival and loss: both use same TRUE_BEP_MULTIPLE gate.
       Incoherence (low survival + ₹0 loss) is eliminated.
   [6] Exposure: shown as Budget × MissProbability × SeverityFactor.
       No hidden smoothing. Three components displayed explicitly.

   Economics constants (all surfaced to UI):
   TRUE_BEP_MULTIPLE = 1.45    Gross multiple required for producer break-even
   GST_RATE          = 0.18    GST on box office (₹100+ ticket tier)
   DIST_SHARE        = 0.40    Distributor share of gross
   PNA_RATE_T1       = 0.25    P&A as % of budget (Tier 1)
   PNA_RATE_T2       = 0.18    P&A as % of budget (Tier 2)
   PNA_RATE_T3       = 0.12    P&A as % of budget (Tier 3)
   DECAY_K           = 0.50    Marginal return decay exponent
   REGRESSION_COEFF  = 0.30    Max regression from ceiling (at dvol=100%)
   BEP_K             = 1.2     BEP exponential decay constant
   RECOVERY_FLOOR    = 0.25    Minimum recovery from OTT/satellite/music
═══════════════════════════════════════════════════════════════ */

const ALL_PROFILES: EngineResult[] = getAllActorProfiles();

// ─── Capital Economics Constants (all exposed to UI) ─────────
const TRUE_BEP_MULTIPLE = 1.45;
const GST_RATE          = 0.18;
const DIST_SHARE        = 0.40;
const PNA_RATE: Record<number, number> = { 1: 0.25, 2: 0.18, 3: 0.12 };
const DECAY_K           = 0.50;
const REGRESSION_COEFF  = 0.30;
const BEP_K             = 1.2;
const RECOVERY_FLOOR    = 0.25;
// Opening elasticity: how much a % opening drop translates to % gross drop
// Lower tiers are more opening-sensitive (less long-leg potential)
const OPENING_ELASTICITY: Record<number, number> = { 1: 0.55, 2: 0.65, 3: 0.75 };
// Growth dampening elasticity — how aggressively budget expansion translates to gross growth
// T1 Global: 1.0 (can scale beyond peak), T1: 0.8, T2: 0.6, T3: 0.5
// Lower = more conservative ceiling enforcement for smaller-tier actors
const GROWTH_ELASTICITY: Record<number, number> = { 1: 0.80, 2: 0.60, 3: 0.50 };
// Scenario probabilities for ECV engine (must sum to 1.0)
const SCENARIO_PROBS = { base: 0.40, opening: 0.20, wom: 0.20, slowdown: 0.10, combo: 0.10 };

const MOMENTUM_SCORE: Record<string, number> = {
  "Acceleration": 1.00, "Expansion Ready": 1.00, "Breakout Potential": 1.00,
  "Stable": 0.60,       "Climbing": 0.60,
  "Stagnation Risk": 0.20, "Capital Fatigue": 0.15, "Dormant": 0.10,
  "Insufficient Data": 0.30,
};

// ── PLASMA DEEP SPACE BACKGROUND ──────────────────────────────────────────────
// Animated canvas: magnetar-style energy star with radiating field lines,
// plasma arcs, and particle trails. Refs the "mysterious deep space signals" brief.
// Colors: white-blue core, electric cyan arcs, purple nebula haze — all subtle.
function PlasmaBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    let W = 0, H = 0, cx = 0, cy = 0;
    let t = 0;

    // ── Field line config ─────────────────────────────────────────────────
    const LINE_COUNT   = 28;   // magnetic field lines
    const ARC_COUNT    = 6;    // plasma arc loops
    const PARTICLE_COUNT = 55; // ambient energy particles

    type Particle = {
      angle: number; dist: number; speed: number;
      size: number; alpha: number; phase: number; color: string;
    };

    const PARTICLE_COLORS = [
      "rgba(120,200,255,",   // electric blue
      "rgba(80,220,200,",    // cyan
      "rgba(160,140,255,",   // soft purple
      "rgba(200,220,255,",   // ice white-blue
      "rgba(100,180,255,",   // deep blue
    ];

    const particles: Particle[] = [];

    function resize() {
      W  = canvas.offsetWidth;
      H  = canvas.offsetHeight;
      canvas.width  = W;
      canvas.height = H;
      cx = W * 0.68;   // Star offset to right-center, like the reference
      cy = H * 0.52;
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          angle: Math.random() * Math.PI * 2,
          dist:  80 + Math.random() * (Math.min(W, H) * 0.55),
          speed: 0.0008 + Math.random() * 0.0015,
          size:  0.8 + Math.random() * 1.8,
          alpha: 0.3 + Math.random() * 0.55,
          phase: Math.random() * Math.PI * 2,
          color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        });
      }
    }

    // ── Draw a single field line (bezier arc from star) ──────────────────
    function drawFieldLine(
      angle: number, len: number, sweep: number,
      alpha: number, color: string, width: number
    ) {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const ex  = cx + cos * len;
      const ey  = cy + sin * len;
      // Control point: perpendicular swing = "sweep" factor
      const cpx = cx + cos * len * 0.45 + Math.sin(angle) * sweep;
      const cpy = cy + sin * len * 0.45 - Math.cos(angle) * sweep;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cpx, cpy, ex, ey);
      ctx.strokeStyle = color + alpha.toFixed(3) + ")";
      ctx.lineWidth   = width;
      ctx.stroke();
    }

    // ── Draw plasma arc (closed loop off the star surface) ───────────────
    function drawPlasmaArc(
      angle: number, height: number, width_: number,
      alpha: number, phase: number
    ) {
      const pulse = 0.7 + 0.3 * Math.sin(t * 0.8 + phase);
      const r0 = 12;   // star radius (scaled to 25%)
      const ax  = cx + Math.cos(angle) * r0;
      const ay  = cy + Math.sin(angle) * r0;
      const bx  = cx + Math.cos(angle + width_) * r0;
      const by  = cy + Math.sin(angle + width_) * r0;
      // Arc peak
      const mx  = (ax + bx) / 2;
      const my  = (ay + by) / 2;
      const nx  = mx - cx; const ny = my - cy;
      const nl  = Math.sqrt(nx*nx + ny*ny) || 1;
      const px  = mx + (nx/nl) * height * pulse;
      const py  = my + (ny/nl) * height * pulse;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(px, py, bx, by);
      ctx.strokeStyle = `rgba(100,210,255,${(alpha * pulse).toFixed(3)})`;
      ctx.lineWidth   = 1.2;
      ctx.shadowColor = "rgba(80,200,255,0.8)";
      ctx.shadowBlur  = 8;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      t += 0.006;

      // ── 1. Deep nebula haze (background atmosphere) ───────────────────
      const nebula1 = ctx.createRadialGradient(W * 0.25, H * 0.35, 0, W * 0.25, H * 0.35, W * 0.55);
      nebula1.addColorStop(0,   "rgba(40,20,80,0.22)");
      nebula1.addColorStop(0.5, "rgba(20,10,50,0.12)");
      nebula1.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = nebula1;
      ctx.fillRect(0, 0, W, H);

      const nebula2 = ctx.createRadialGradient(W * 0.7, H * 0.6, 0, W * 0.7, H * 0.6, W * 0.45);
      nebula2.addColorStop(0,   "rgba(10,30,70,0.18)");
      nebula2.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = nebula2;
      ctx.fillRect(0, 0, W, H);

      // ── 2. Rotating magnetic field lines ─────────────────────────────
      const rotOffset = t * 0.04;   // very slow global rotation
      for (let i = 0; i < LINE_COUNT; i++) {
        const baseAngle = (i / LINE_COUNT) * Math.PI * 2 + rotOffset;
        const len     = 160 + Math.sin(i * 1.3 + t * 0.3) * 80 + (W * 0.22);
        const sweep   = Math.sin(i * 0.7 + t * 0.15) * (len * 0.55);
        const pulse   = 0.5 + 0.5 * Math.sin(t * 1.1 + i * 0.8);
        const alpha   = (0.12 + 0.14 * pulse);

        // Field line color: mix of cyan and purple
        const isCyan  = i % 3 !== 0;
        const color   = isCyan
          ? `rgba(60,200,255,`
          : `rgba(140,100,255,`;

        drawFieldLine(baseAngle, len, sweep, alpha, color, 0.7 + pulse * 0.5);
      }

      // ── 3. Plasma energy arcs off the star surface ───────────────────
      for (let i = 0; i < ARC_COUNT; i++) {
        const angle  = (i / ARC_COUNT) * Math.PI * 2 + t * 0.06 + i * 0.9;
        const height = 55 + 30 * Math.sin(t * 0.5 + i * 1.1);
        const arcW   = 0.6 + 0.2 * Math.sin(i);
        const alpha  = 0.4 + 0.3 * Math.sin(t * 0.7 + i * 1.3);
        drawPlasmaArc(angle, height, arcW, alpha, i * 1.2);
      }

      // ── 4. Ambient energy particles orbiting the star ─────────────────
      for (const p of particles) {
        p.angle += p.speed;
        const px   = cx + Math.cos(p.angle) * p.dist;
        const py   = cy + Math.sin(p.angle) * p.dist;
        const glow = 0.5 + 0.5 * Math.sin(t * 2 + p.phase);
        const a    = p.alpha * (0.6 + 0.4 * glow);

        // Particle glow halo
        const halo = ctx.createRadialGradient(px, py, 0, px, py, p.size * 4);
        halo.addColorStop(0,   p.color + (a * 0.6).toFixed(3) + ")");
        halo.addColorStop(1,   p.color + "0)");
        ctx.beginPath();
        ctx.arc(px, py, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        // Core particle
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + a.toFixed(3) + ")";
        ctx.fill();
      }

      // ── 5. Star core: compact white-blue energy point (25% of original)
      const starR = 10 + 1 * Math.sin(t * 1.5);   // breathing radius — subtle

      // Outer corona glow (kept wide so energy field still reads from afar)
      const corona = ctx.createRadialGradient(cx, cy, 0, cx, cy, starR * 18);
      corona.addColorStop(0,   "rgba(150,220,255,0.18)");
      corona.addColorStop(0.25,"rgba(80,170,255,0.09)");
      corona.addColorStop(0.6, "rgba(60,120,255,0.03)");
      corona.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, starR * 18, 0, Math.PI * 2);
      ctx.fillStyle = corona;
      ctx.fill();

      // Mid glow ring
      const midGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, starR * 6);
      midGlow.addColorStop(0,   "rgba(200,240,255,0.40)");
      midGlow.addColorStop(0.5, "rgba(120,200,255,0.16)");
      midGlow.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, starR * 6, 0, Math.PI * 2);
      ctx.fillStyle = midGlow;
      ctx.fill();

      // Star body
      const star = ctx.createRadialGradient(cx - starR * 0.2, cy - starR * 0.15, 0, cx, cy, starR);
      star.addColorStop(0,   "rgba(255,255,255,0.98)");
      star.addColorStop(0.35,"rgba(220,240,255,0.92)");
      star.addColorStop(0.7, "rgba(140,200,255,0.78)");
      star.addColorStop(1,   "rgba(80,160,255,0.52)");
      ctx.beginPath();
      ctx.arc(cx, cy, starR, 0, Math.PI * 2);
      ctx.fillStyle = star;
      ctx.fill();

      // Bright inner core
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, starR * 0.45);
      core.addColorStop(0, "rgba(255,255,255,1.0)");
      core.addColorStop(1, "rgba(220,240,255,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, starR * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();

      // ── 6. Subtle shooting energy streams toward upper-left ──────────
      for (let i = 0; i < 4; i++) {
        const sa    = Math.PI + 0.3 + i * 0.22 + Math.sin(t * 0.2 + i) * 0.08;
        const sLen  = W * 0.45 + i * 30 + Math.sin(t * 0.3 + i) * 40;
        const alpha = 0.06 + 0.05 * Math.sin(t * 0.5 + i);

        const sx = cx + Math.cos(sa) * sLen;
        const sy = cy + Math.sin(sa) * sLen;

        const grad = ctx.createLinearGradient(cx, cy, sx, sy);
        grad.addColorStop(0,   `rgba(180,220,255,${(alpha * 2.5).toFixed(3)})`);
        grad.addColorStop(0.3, `rgba(100,180,255,${(alpha * 1.5).toFixed(3)})`);
        grad.addColorStop(1,   "rgba(60,120,255,0)");
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 1.5 + i * 0.5;
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(() => { resize(); initParticles(); });
    ro.observe(canvas);
    resize();
    initParticles();
    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function pct(n: number): number { return Math.round(n * 100); }

/* ─── Types ───────────────────────────────────────────────────── */

export type SignalProfile = EngineResult & {
  budgetTolerance:    number;
  panIndiaViability:  number;
  safeBandMax:        number;
  recentLogROI:       number;
  recentDvol:         number;
  // Capital economics — computed per actor
  tier:               number;
  pnaRate:            number;
  // Projected gross economics (no budget input yet — anchored at openingCr scale)
  baseExpectedGross:  number;
  // STEP 2: Historical ceiling data (derived from actor.films)
  peakGrossCr:        number;  // max(film.grossCr) — historical best performance
  historicalAvgBudget: number; // avg(film.budgetCr) — baseline budget reference
};

export type RevenueBreakdown = {
  projectedGross:       number;   // after decay + regression
  projectedNett:        number;   // gross × (1 − GST_RATE)
  producerShare:        number;   // gross × DIST_SHARE
  pnaCost:              number;   // budget × pnaRate
  totalCapital:         number;   // budget + pnaCost
  economicROI:          number;   // producerShare / totalCapital
  // ── v5: Full Capital Recovery (DECISION METRICS) ───────────
  capitalDeficit:       number;   // max(totalCapital − producerShare, 0)
  capitalSurplus:       number;   // max(producerShare − totalCapital, 0)
  capitalRecoveryRatio: number;   // producerShare / totalCapital  (≥1.0 = full recovery)
  fullCapitalRecovered: boolean;  // capitalRecoveryRatio >= 1.0
  fullRecoveryGross:    number;   // gross needed = totalCapital / DIST_SHARE
  fullRecoveryROI:      number;   // fullRecoveryGross / budget  (~3.125x T1)
  // ── v5: Theatrical BEP (INFORMATIONAL ONLY) ────────────────
  breakEvenGross:       number;   // budget × TRUE_BEP_MULTIPLE
  breakEvenShare:       number;   // breakEvenGross × DIST_SHARE
  theatricalBEPGap:     number;   // projectedGross − breakEvenGross
  decayFactor:          number;
  regressionFactor:     number;
};

export type BudgetResult = {
  breakEvenProb:       number;
  riskClass:           string;
  // Explicit exposure components
  missProbability:     number;
  severityFactor:      number;
  downsideExposure:    number;
  // ROI band (share-adjusted, economic)
  economicROILow:      number;
  economicROIHigh:     number;
  grossROILow:         number;
  grossROIHigh:        number;
  // Strain
  strain:              number;
  strainLabel:         string;
  strainColor:         string;
  // Revenue breakdown
  revenue:             RevenueBreakdown;
};

export type StressResult = {
  stressedOpening:      number;
  stressedGrossROI:     number;
  stressedEconomicROI:  number;
  // ── v5: Full Capital Recovery under stress ─────────────────
  survivalProb:         number;   // P(ProducerShare >= TotalCapital)
  fullCapitalRecovered: boolean;  // stressedShare >= totalCapital  [v5 DECISION GATE]
  // ── v5: Capital deficit is PRIMARY LOSS metric ─────────────
  capitalDeficit:       number;   // max(totalCapital − stressedShare, 0)
  capitalSurplus:       number;   // max(stressedShare − totalCapital, 0)
  capitalRecoveryRatio: number;   // stressedShare / totalCapital
  // ── Theatrical BEP gap (INFORMATIONAL) ─────────────────────
  theatricalBEPGap:     number;   // stressedGross − (budget × 1.45x)
  worstCaseLoss:        number;   // alias for capitalDeficit (backward compat)
  tierHeld:             boolean;
  selectedBudget:       number;
  stressedGross:        number;
  stressedShare:        number;
  totalCapital:         number;
};

export type ECVScenario = {
  name:          string;
  prob:          number;
  stressedGross: number;
  share:         number;
  profit:        number;    // share − totalCapital
  roi:           number;    // share / totalCapital
  isLoss:        boolean;
};

export type ECVResult = {
  scenarios:          ECVScenario[];
  expectedProfit:     number;   // Σ(prob × profit)
  expectedROI:        number;   // Σ(prob × roi)
  probabilityOfLoss:  number;   // Σ(prob where profit < 0)
  var25:              number;   // 25th-percentile downside (worst quarter outcome)
  totalCapital:       number;
};

export type MigrationResult = {
  // Core score
  score:              number;    // MS = CM + SI + CS + CDP (0–100)
  direction:          "upgrade" | "degrade";
  targetTier:         number;
  targetThreshold:    number;
  gap:                number;
  // Score components (capital-derived, not lookup-table)
  cmPts:              number;    // Capital Momentum 0–40
  siPts:              number;    // Stability Index 0–30
  csPts:              number;    // Capital Safety Score 0–30
  cdpPts:             number;    // Capital Destruction Penalty (negative, ≥ −30)
  // Derived signals
  degradationRisk:    number;
  degradationSignal:  string;
  momentum:           string;    // kept from engine for display
  verdict:            string;
  // Explicit conditions
  rollingAvgGross:    number;    // 3-film rolling average gross
  bepSurvivalRate:    number;    // fraction of last N films ≥ TRUE_BEP
  consecutiveFails:   number;    // consecutive ROI < 1.0 count (most recent)
  hasSeveDestruction: boolean;   // any ROI < 0.8 in last 3 films
  upgradeConditionsMet: boolean;
  downgradeTriggered:   boolean;
  upgradeProbability: number;    // 0–100
  downgradeProbability: number;  // 0–100
  // Prescriptive output
  requiredAvgGross:   number;    // avg gross next 2 films need to achieve
  requiredBEPStreak:  number;    // consecutive BEP-clearing films required
  capitalPenaltyApplied: number; // penalty from Risk Lab simulation (0 if not linked)
  // Trajectory
  openingHistory:     number[];
  forecastReadiness:  number;
};

export type CapitalContext = {
  actor:         Actor;
  budget:        number;
  budgetResult:  BudgetResult | null;
  stressResult:  StressResult | null;
};




/* ═══════════════════════════════════════════════════════════════
   RISK-REWARD SCATTER PLOT — Capital Quadrant Map
   Reads ALL_PROFILES (module-level) + actors (imported)
   Zero new imports required.
═══════════════════════════════════════════════════════════════ */

const QUADRANTS = [
  {
    id: "anchor",
    label: "Tier-1 Anchors",
    sub: "High Scale · High Stability",
    xMin: 50, xMax: 100, yMin: 50, yMax: 100,
    color: "#22e5a5",
    bg: "rgba(34,229,165,0.035)",
  },
  {
    id: "volatile",
    label: "Volatile Superstars",
    sub: "High Scale · Low Stability",
    xMin: 0, xMax: 50, yMin: 50, yMax: 100,
    color: "#ffb347",
    bg: "rgba(255,179,71,0.035)",
  },
  {
    id: "safemid",
    label: "Safe Mid-Tier",
    sub: "Low Scale · High Stability",
    xMin: 50, xMax: 100, yMin: 0, yMax: 50,
    color: "#4DA3FF",
    bg: "rgba(77,163,255,0.035)",
  },
  {
    id: "risky",
    label: "High-Risk Emerging",
    sub: "Low Scale · Low Stability",
    xMin: 0, xMax: 50, yMin: 0, yMax: 50,
    color: "#ff4d5a",
    bg: "rgba(255,77,90,0.035)",
  },
] as const;

function computeEfficientFrontier(
  points: { x: number; y: number }[],
  plotW: number,
  plotH: number,
  padL: number,
  padT: number,
): string {
  const bands: Record<number, number> = {};
  for (const p of points) {
    const b = Math.floor(p.x / 10) * 10;
    if (bands[b] === undefined || p.y > bands[b]) bands[b] = p.y;
  }
  const frontier = Object.entries(bands)
    .map(([b, s]) => ({ x: Number(b) + 5, y: s }))
    .sort((a, b) => a.x - b.x);
  if (frontier.length < 2) return "";
  const toSvg = (x: number, y: number) => ({
    sx: padL + (x / 100) * plotW,
    sy: padT + plotH - (y / 100) * plotH,
  });
  let d = "";
  frontier.forEach((pt, i) => {
    const { sx, sy } = toSvg(pt.x, pt.y);
    if (i === 0) {
      d += `M ${sx.toFixed(1)} ${sy.toFixed(1)}`;
    } else {
      const prev = frontier[i - 1];
      const { sx: px, sy: py } = toSvg(prev.x, prev.y);
      const cpx1 = px + (sx - px) * 0.5;
      const cpx2 = sx - (sx - px) * 0.5;
      d += ` C ${cpx1.toFixed(1)} ${py.toFixed(1)}, ${cpx2.toFixed(1)} ${sy.toFixed(1)}, ${sx.toFixed(1)} ${sy.toFixed(1)}`;
    }
  });
  return d;
}

function getFilmLineage(actorName: string): {
  title: string; year: number; roi: number; isLoss: boolean;
}[] {
  const actor = actors.find(a => a.name === actorName);
  if (!actor?.films) return [];
  return actor.films
    .slice(-6)
    .map(f => {
      const w   = f.multiStarrerWeight ?? 1.0;
      const roi = (f.grossCr * w) / Math.max(f.budgetCr, 1);
      return { title: f.title, year: f.year, roi, isLoss: roi < 1.0 };
    })
    .reverse();
}

function RiskRewardScatterPlot() {
  const [hovered, setHovered]           = useState<string | null>(null);
  const [showFrontier, setShowFrontier] = useState(true);

  const PAD_L = 52;
  const PAD_B = 44;
  const PAD_T = 24;
  const PAD_R = 20;
  const TOTAL_W = 640;
  const TOTAL_H = 480;
  const PLOT_W  = TOTAL_W - PAD_L - PAD_R;
  const PLOT_H  = TOTAL_H - PAD_T - PAD_B;

  const toSx = (stability: number) => PAD_L + (stability / 100) * PLOT_W;
  const toSy = (scale: number) => PAD_T + PLOT_H - (scale / 100) * PLOT_H;

  const points = ALL_PROFILES.map(p => ({
    name:      p.name,
    tier:      p.tier,
    x:         p.stabilityIndex,
    y:         p.scaleIndex,
    scale:     p.scaleIndex,
    stability: p.stabilityIndex,
    chi:       p.chiScore,
    maxGross:  p.maxGross,
    openingCr: p.openingCr,
    riskBand:  p.riskBand,
    momentum:  p.momentum,
    dvolPct:   p.dvolPct,
  }));

  const frontierPath = showFrontier
    ? computeEfficientFrontier(points, PLOT_W, PLOT_H, PAD_L, PAD_T)
    : "";

  const hoveredPoint = hovered ? points.find(p => p.name === hovered) : null;
  const filmLineage  = hovered ? getFilmLineage(hovered) : [];

  const dotRadius = (scale: number) => 4 + (scale / 100) * 4;

  const dotColor = (tier: number, isHovered: boolean) =>
    isHovered ? "#ffffff" : (TIER_COLORS[tier] ?? "#8B95A8");

  const qMidX = (xMin: number, xMax: number) =>
    PAD_L + ((xMin + xMax) / 200) * PLOT_W;
  const qMidY = (yMin: number, yMax: number) =>
    PAD_T + PLOT_H - ((yMin + yMax) / 200) * PLOT_H;

  return (
    <div style={{
      background: "rgba(10,10,28,0.60)",
      border: "1px solid rgba(255,199,0,0.10)",
      borderRadius: 16,
      padding: "24px 20px 20px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: "0.20em", textTransform: "uppercase", color: "rgba(255,199,0,0.55)", fontWeight: 700, marginBottom: 6 }}>
            Risk-Reward Matrix · All 21 Actors
          </p>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#E8EAF0", margin: 0, letterSpacing: "-0.02em" }}>
            Capital Quadrant Map
          </h3>
          <p style={{ fontSize: 13, color: "rgba(139,149,168,0.75)", marginTop: 4 }}>
            X = Stability Index (capital consistency) · Y = Scale Index (commercial ceiling)
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setShowFrontier(v => !v)}
            style={{
              padding: "5px 12px", borderRadius: 6,
              border: `1px solid ${showFrontier ? "rgba(255,199,0,0.35)" : "rgba(255,255,255,0.08)"}`,
              background: showFrontier ? "rgba(255,199,0,0.07)" : "transparent",
              color: showFrontier ? "#FFC700" : "rgba(139,149,168,0.6)",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit",
              transition: "all 150ms",
            }}
          >
            Frontier {showFrontier ? "On" : "Off"}
          </button>
          {[1, 2, 3].map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: TIER_COLORS[t] }} />
              <span style={{ fontSize: 11, color: "rgba(139,149,168,0.65)", fontWeight: 600 }}>T{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plot + Tooltip */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* SVG Plot */}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} style={{ width: "100%", height: "auto", display: "block" }}>
            {/* Quadrant backgrounds */}
            {QUADRANTS.map(q => (
              <rect key={q.id}
                x={PAD_L + (q.xMin / 100) * PLOT_W}
                y={PAD_T + PLOT_H - (q.yMax / 100) * PLOT_H}
                width={(q.xMax - q.xMin) / 100 * PLOT_W}
                height={(q.yMax - q.yMin) / 100 * PLOT_H}
                fill={q.bg}
              />
            ))}
            {/* Grid lines */}
            {[25, 50, 75].map(v => (
              <g key={v}>
                <line x1={PAD_L} x2={PAD_L + PLOT_W} y1={toSy(v)} y2={toSy(v)}
                  stroke="rgba(255,255,255,0.04)" strokeWidth={v === 50 ? 1.2 : 0.6}
                  strokeDasharray={v === 50 ? "4 4" : "2 4"} />
                <line x1={toSx(v)} x2={toSx(v)} y1={PAD_T} y2={PAD_T + PLOT_H}
                  stroke="rgba(255,255,255,0.04)" strokeWidth={v === 50 ? 1.2 : 0.6}
                  strokeDasharray={v === 50 ? "4 4" : "2 4"} />
              </g>
            ))}
            {/* Quadrant dividers */}
            <line x1={toSx(50)} x2={toSx(50)} y1={PAD_T} y2={PAD_T + PLOT_H}
              stroke="rgba(255,199,0,0.18)" strokeWidth={1} />
            <line x1={PAD_L} x2={PAD_L + PLOT_W} y1={toSy(50)} y2={toSy(50)}
              stroke="rgba(255,199,0,0.18)" strokeWidth={1} />
            {/* Quadrant labels */}
            {QUADRANTS.map(q => (
              <g key={q.id + "-lbl"}>
                <text x={qMidX(q.xMin, q.xMax)} y={qMidY(q.yMin, q.yMax) - 10}
                  textAnchor="middle" fill={q.color} fontSize={11} fontWeight={700} opacity={0.55}
                  style={{ letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
                  {q.label}
                </text>
                <text x={qMidX(q.xMin, q.xMax)} y={qMidY(q.yMin, q.yMax) + 8}
                  textAnchor="middle" fill={q.color} fontSize={9.5} opacity={0.35}>
                  {q.sub}
                </text>
              </g>
            ))}
            {/* Efficient Frontier */}
            {showFrontier && frontierPath && (
              <g>
                <path d={frontierPath} fill="none" stroke="rgba(255,199,0,0.15)" strokeWidth={8} strokeLinecap="round" />
                <path d={frontierPath} fill="none" stroke="rgba(255,199,0,0.55)" strokeWidth={1.5}
                  strokeLinecap="round" strokeDasharray="6 3" />
                <text x={PAD_L + PLOT_W - 8} y={PAD_T + 16} textAnchor="end"
                  fill="rgba(255,199,0,0.50)" fontSize={10} fontWeight={700}
                  style={{ letterSpacing: "0.10em" }}>
                  EFFICIENT FRONTIER
                </text>
              </g>
            )}
            {/* Axes */}
            {[0, 25, 50, 75, 100].map(v => (
              <g key={"ax" + v}>
                <line x1={toSx(v)} x2={toSx(v)} y1={PAD_T + PLOT_H} y2={PAD_T + PLOT_H + 5}
                  stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                <text x={toSx(v)} y={PAD_T + PLOT_H + 17} textAnchor="middle"
                  fill="rgba(139,149,168,0.55)" fontSize={10}>{v}</text>
                <line x1={PAD_L - 5} x2={PAD_L} y1={toSy(v)} y2={toSy(v)}
                  stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                <text x={PAD_L - 8} y={toSy(v) + 4} textAnchor="end"
                  fill="rgba(139,149,168,0.55)" fontSize={10}>{v}</text>
              </g>
            ))}
            <text x={PAD_L + PLOT_W / 2} y={TOTAL_H - 4} textAnchor="middle"
              fill="rgba(139,149,168,0.50)" fontSize={11} fontWeight={600}
              style={{ letterSpacing: "0.10em", textTransform: "uppercase" as const }}>
              Stability Index →
            </text>
            <text x={14} y={PAD_T + PLOT_H / 2} textAnchor="middle"
              fill="rgba(139,149,168,0.50)" fontSize={11} fontWeight={600}
              transform={`rotate(-90, 14, ${PAD_T + PLOT_H / 2})`}
              style={{ letterSpacing: "0.10em", textTransform: "uppercase" as const }}>
              Scale Index ↑
            </text>
            <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H}
              fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
            {/* Actor dots — non-hovered first so hovered renders on top */}
            {[...points.filter(p => p.name !== hovered), ...points.filter(p => p.name === hovered)].map(p => {
              const isHov = p.name === hovered;
              const sx    = toSx(p.x);
              const sy    = toSy(p.y);
              const r     = dotRadius(p.scale);
              const col   = dotColor(p.tier, isHov);
              return (
                <g key={p.name}>
                  {isHov && (
                    <circle cx={sx} cy={sy} r={r + 8}
                      fill={`${TIER_COLORS[p.tier]}18`}
                      stroke={`${TIER_COLORS[p.tier]}50`} strokeWidth={1} />
                  )}
                  <circle cx={sx} cy={sy} r={r + 2} fill={`${TIER_COLORS[p.tier]}30`} />
                  <circle cx={sx} cy={sy} r={r}
                    fill={col}
                    stroke={isHov ? "#fff" : `${TIER_COLORS[p.tier]}60`}
                    strokeWidth={isHov ? 2 : 1}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHovered(p.name)}
                    onMouseLeave={() => setHovered(null)}
                  />
                  {(isHov || p.tier === 1) && (
                    <text x={sx + r + 4} y={sy + 4}
                      fill={isHov ? "#ffffff" : `${TIER_COLORS[p.tier]}cc`}
                      fontSize={isHov ? 11 : 9.5} fontWeight={isHov ? 800 : 600}
                      style={{ pointerEvents: "none", userSelect: "none" as const }}>
                      {p.name.split(" ").slice(-1)[0]}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Data Lineage Panel */}
        <div style={{
          width: 260, flexShrink: 0,
          background: "rgba(6,9,24,0.85)",
          border: `1px solid ${hoveredPoint ? `${TIER_COLORS[hoveredPoint.tier]}35` : "rgba(255,255,255,0.05)"}`,
          borderRadius: 12,
          padding: hoveredPoint ? "16px" : "20px 16px",
          minHeight: 340,
          transition: "border-color 200ms ease",
          display: "flex", flexDirection: "column" as const, gap: 12,
        }}>
          {!hoveredPoint ? (
            <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", height: "100%", gap: 10, opacity: 0.5 }}>
              <svg width={32} height={32} viewBox="0 0 32 32" fill="none">
                <circle cx={16} cy={16} r={6} stroke="rgba(255,199,0,0.5)" strokeWidth={1.5} />
                <path d="M16 2v4M16 26v4M2 16h4M26 16h4" stroke="rgba(255,199,0,0.3)" strokeWidth={1.5} strokeLinecap="round" />
              </svg>
              <p style={{ fontSize: 11, color: "rgba(139,149,168,0.65)", textAlign: "center", lineHeight: 1.6, letterSpacing: "0.05em" }}>
                Hover an actor<br/>to see data lineage
              </p>
            </div>
          ) : (
            <>
              {/* Actor header */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: TIER_COLORS[hoveredPoint.tier], flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#E8EAF0", letterSpacing: "-0.01em" }}>
                    {hoveredPoint.name}
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: `${TIER_COLORS[hoveredPoint.tier]}18`, color: TIER_COLORS[hoveredPoint.tier], fontWeight: 700, letterSpacing: "0.06em" }}>
                    T{hoveredPoint.tier}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(139,149,168,0.55)", letterSpacing: "0.06em" }}>
                  {(() => {
                    const q = QUADRANTS.find(q =>
                      hoveredPoint.x >= q.xMin && hoveredPoint.x < q.xMax &&
                      hoveredPoint.y >= q.yMin && hoveredPoint.y < q.yMax
                    );
                    return q ? `${q.label} · ${q.sub}` : "—";
                  })()}
                </div>
              </div>
              {/* Score metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { label: "Scale",     val: hoveredPoint.scale.toFixed(1),    color: TIER_COLORS[hoveredPoint.tier] },
                  { label: "Stability", val: hoveredPoint.stability.toFixed(1), color: "#22e5a5" },
                  { label: "CHI",       val: hoveredPoint.chi.toFixed(0),       color: "#9B72FF" },
                  { label: "Risk Band", val: hoveredPoint.riskBand,             color: RISK_COLORS[hoveredPoint.riskBand] ?? "#8B95A8" },
                  { label: "Max Gross", val: `₹${hoveredPoint.maxGross}Cr`,     color: "#FFC700" },
                  { label: "Opening",   val: `₹${hoveredPoint.openingCr}Cr`,    color: "#4DA3FF" },
                ].map(m => (
                  <div key={m.label} style={{ background: "rgba(255,255,255,0.025)", borderRadius: 6, padding: "7px 8px" }}>
                    <p style={{ fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "rgba(139,149,168,0.60)", marginBottom: 2 }}>{m.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.val}</p>
                  </div>
                ))}
              </div>
              {/* Downside vol bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "rgba(139,149,168,0.55)" }}>Downside Vol</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: hoveredPoint.dvolPct < 15 ? "#22e5a5" : hoveredPoint.dvolPct < 40 ? "#ffb347" : "#ff4d5a" }}>
                    {hoveredPoint.dvolPct.toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${hoveredPoint.dvolPct}%`,
                    background: hoveredPoint.dvolPct < 15 ? "#22e5a5" : hoveredPoint.dvolPct < 40 ? "#ffb347" : "#ff4d5a",
                    borderRadius: 2, transition: "width 400ms ease",
                  }} />
                </div>
              </div>
              {/* Data lineage */}
              <div>
                <p style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(255,199,0,0.50)", fontWeight: 700, marginBottom: 8 }}>
                  Data Lineage · Recent Films
                </p>
                {filmLineage.length === 0 ? (
                  <p style={{ fontSize: 11, color: "rgba(139,149,168,0.4)", fontStyle: "italic" }}>No film data</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                    {filmLineage.map((f, i) => (
                      <div key={i} style={{
                        display: "grid", gridTemplateColumns: "1fr auto",
                        alignItems: "center", padding: "5px 7px", borderRadius: 5, gap: 6,
                        background: f.isLoss ? "rgba(255,77,90,0.06)" : "rgba(34,229,165,0.04)",
                        border: `1px solid ${f.isLoss ? "rgba(255,77,90,0.12)" : "rgba(34,229,165,0.08)"}`,
                      }}>
                        <div>
                          <p style={{ fontSize: 11, color: "#D0D8E8", fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.title}</p>
                          <p style={{ fontSize: 9, color: "rgba(139,149,168,0.50)", marginTop: 1 }}>{f.year}</p>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 800, color: f.isLoss ? "#ff4d5a" : "#22e5a5", letterSpacing: "-0.02em" }}>{f.roi.toFixed(2)}×</p>
                          <p style={{ fontSize: 9, color: "rgba(139,149,168,0.45)" }}>ROI</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Momentum */}
              <div style={{ padding: "8px 10px", borderRadius: 7, background: "rgba(255,199,0,0.04)", border: "1px solid rgba(255,199,0,0.10)" }}>
                <p style={{ fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "rgba(255,199,0,0.45)", marginBottom: 3 }}>Momentum</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#FFC700" }}>{hoveredPoint.momentum}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quadrant legend strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8,
        marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        {QUADRANTS.map(q => (
          <div key={q.id + "-leg"} style={{ padding: "8px 10px", borderRadius: 7, background: q.bg, border: `1px solid ${q.color}20` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: q.color }} />
              <p style={{ fontSize: 10, fontWeight: 700, color: q.color, letterSpacing: "0.06em" }}>{q.label}</p>
            </div>
            <p style={{ fontSize: 9.5, color: "rgba(139,149,168,0.55)", lineHeight: 1.5 }}>{q.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function computeProfile(actor: Actor): SignalProfile {
  const ep = ALL_PROFILES.find(p => p.name === actor.name);
  if (!ep) throw new Error(`[Signal] Profile not found: ${actor.name}`);

  const films   = actor.films ?? [];
  const recent3 = films.slice(-3);

  const recentLogROIs = recent3.map(f => {
    const w   = f.multiStarrerWeight ?? 1.0;
    const roi = (f.grossCr * w) / f.budgetCr;
    return Math.log1p(roi);
  });
  const recentLogROI = recentLogROIs.length > 0
    ? recentLogROIs.reduce((a, b) => a + b, 0) / recentLogROIs.length
    : Math.log1p(ep.chiScore / 100 * 3);

  // v5: Downside vol calibrated against FULL CAPITAL RECOVERY threshold, not 1.45x.
  // fullRecoveryROI = (1 + pnaRate) / DIST_SHARE  ≈ 3.125x T1, 2.95x T2, 2.80x T3
  // Actors consistently at 1.5–2.5x gross ROI are structurally below recovery gate
  // and must register as volatile, not stable.
  const pnaRateForDvol    = PNA_RATE[actor.openingCr >= 60 ? 1 : actor.openingCr >= 30 ? 2 : 3] ?? 0.18;
  const fullRecoveryROI   = (1 + pnaRateForDvol) / DIST_SHARE; // e.g. 3.125x for T1
  const recentLossSq = recent3.map(f => {
    const w   = f.multiStarrerWeight ?? 1.0;
    const roi = (f.grossCr * w) / f.budgetCr;
    const lr  = Math.max(0, fullRecoveryROI - roi); // loss relative to full recovery gate
    return lr * lr;
  });
  const recentDvol = recent3.length > 0
    ? Math.sqrt(recentLossSq.reduce((a, b) => a + b, 0) / recentLossSq.length)
    : (ep.dvolPct / 100) * 0.6;

  const tier = actor.openingCr >= 60 ? 1 : actor.openingCr >= 30 ? 2 : 3;

  // baseExpectedGross = proven solo ceiling × 1.10 (actors.ts v2 already excludes ensemble/franchise)
  const baseExpectedGross = Math.round(actor.maxGross * 1.10);

  // STEP 2: Derive historical ceiling data from existing film records
  // peakGrossCr = highest gross ever recorded (multiStarrer-weighted)
  // historicalAvgBudget = typical budget baseline for growth ratio denominator
  const allFilms = actor.films ?? [];
  const peakGrossCr = allFilms.length > 0
    ? Math.max(...allFilms.map(f => (f.grossCr ?? 0) * (f.multiStarrerWeight ?? 1.0)))
    : actor.openingCr * 4;   // fallback: 4x opening estimate if no film data
  const historicalAvgBudget = allFilms.length > 0
    ? allFilms.reduce((s, f) => s + (f.budgetCr ?? 0), 0) / allFilms.length
    : actor.openingCr * 1.2; // fallback: budget ~ 1.2x opening

  return {
    ...ep,
    budgetTolerance:     actor.budgetTolerance,
    panIndiaViability:   actor.panIndiaViability,
    safeBandMax:         Math.round(actor.budgetTolerance * 0.8),
    recentLogROI,
    recentDvol,
    tier,
    pnaRate:             PNA_RATE[tier] ?? 0.18,
    baseExpectedGross,
    peakGrossCr:         Math.round(peakGrossCr),
    historicalAvgBudget: Math.round(historicalAvgBudget),
  };
}

/* ─── computeRevenueBreakdown ─────────────────────────────────── */
// Full gross → nett → share chain for a given budget
// Applies marginal decay and ceiling regression to projected gross

function computeRevenueBreakdown(
  profile: SignalProfile,
  budget: number
): RevenueBreakdown {
  const pnaCost      = Math.round(budget * profile.pnaRate);
  const totalCapital = budget + pnaCost;

  // STEP 2: Logarithmic growth dampening against historical ceiling
  // rawGross = uncapped regression estimate (openingCr × scaleMultiplier × decay)
  // cappedGross = peakGrossCr × (1 + log(1 + growthRatio) × growthElasticity)
  // projectedGross = min(rawGross, cappedGross)
  // This prevents Tier-2 actors from projecting 2× their lifetime best
  const rawStrain        = budget / Math.max(profile.baseExpectedGross, 1);
  const decayFactor      = Math.exp(-rawStrain * DECAY_K);
  const regressionFactor = 1 - (profile.dvolPct / 100) * REGRESSION_COEFF;
  const rawGross         = Math.round(profile.baseExpectedGross * decayFactor * regressionFactor);

  // Growth dampening — only applies if we have real historical data
  const growthElasticity  = GROWTH_ELASTICITY[profile.tier] ?? 0.60;
  const avgBudget         = Math.max(profile.historicalAvgBudget, 1);
  const growthRatio       = budget / avgBudget;
  const dampenedGrowth    = Math.log(1 + growthRatio);
  const cappedGross       = Math.round(profile.peakGrossCr * (1 + dampenedGrowth * growthElasticity));
  // Only cap if we have real film data (peakGrossCr > 0) — no cap for actors without history
  const projectedGross    = profile.peakGrossCr > 0
    ? Math.min(rawGross, cappedGross)
    : rawGross;
  const projectedNett  = Math.round(projectedGross * (1 - GST_RATE));
  const producerShare  = Math.round(projectedGross * DIST_SHARE);
  const economicROI    = r2(producerShare / Math.max(totalCapital, 1));

  // ── v5: Full Capital Recovery (DECISION METRICS) ──────────────
  // Full recovery = ProducerShare >= TotalCapital
  // Required gross = TotalCapital / DIST_SHARE  (not budget × 1.45x)
  const capitalDeficit       = Math.round(Math.max(totalCapital - producerShare, 0));
  const capitalSurplus       = Math.round(Math.max(producerShare - totalCapital, 0));
  const capitalRecoveryRatio = r2(producerShare / Math.max(totalCapital, 1));
  const fullCapitalRecovered = producerShare >= totalCapital;
  const fullRecoveryGross    = Math.round(totalCapital / DIST_SHARE);
  const fullRecoveryROI      = r2(fullRecoveryGross / Math.max(budget, 1));

  // ── Theatrical BEP (INFORMATIONAL ONLY) ───────────────────────
  const breakEvenGross   = Math.round(budget * TRUE_BEP_MULTIPLE);
  const breakEvenShare   = Math.round(breakEvenGross * DIST_SHARE);
  const theatricalBEPGap = projectedGross - breakEvenGross;

  return {
    projectedGross, projectedNett, producerShare,
    pnaCost, totalCapital, economicROI,
    capitalDeficit, capitalSurplus, capitalRecoveryRatio,
    fullCapitalRecovered, fullRecoveryGross, fullRecoveryROI,
    breakEvenGross, breakEvenShare, theatricalBEPGap,
    decayFactor: r2(decayFactor),
    regressionFactor: r2(regressionFactor),
  };
}

/* ─── computeBudgetRisk v4 ────────────────────────────────────── */
// [DIRECTIVE 1] BEP uses TRUE_BEP_MULTIPLE = 1.45x as floor
// [DIRECTIVE 2] Revenue breakdown shown explicitly
// [DIRECTIVE 3] Marginal decay applied to expectedGross
// [DIRECTIVE 4] Ceiling regression applied
// [DIRECTIVE 6] Exposure = budget × missProbability × severityFactor (transparent)
// [DIRECTIVE 7] Strain = budget / projectedGross (shown explicitly)

function computeBudgetRisk(
  profile: SignalProfile,
  budget: number,
  distribution: string
): BudgetResult {
  const revenue      = computeRevenueBreakdown(profile, budget);
  const totalCapital = revenue.totalCapital;

  const distStrainReduction = distribution === "Pan-India" ? 0.08
    : distribution === "Global" ? 0.12 : 0;

  const careerDvolAtBEP = Math.max(profile.dvolPct / 100 * 0.5, 0);
  const effectiveDvol   = Math.max(profile.recentDvol, careerDvolAtBEP);

  // ── v5: Survival = P(ProducerShare >= TotalCapital) ───────────
  // Strain is now relative to full capital recovery threshold, not 1.45x
  // fullRecoveryGross = totalCapital / DIST_SHARE  (e.g. 3.125x for T1)
  const recoveryStrain = revenue.fullRecoveryGross / Math.max(revenue.projectedGross, 1);
  const strain         = Math.max(recoveryStrain - distStrainReduction, 0.01);

  // Survival probability: exponential decay against full recovery threshold
  const rawBEP        = Math.exp(-strain * effectiveDvol * BEP_K);
  const stabilityFloor = (profile.scaleIndex * 0.3 + profile.stabilityIndex * 0.7) / 100 * 0.80;
  const blended        = rawBEP * 0.6 + stabilityFloor * 0.4;
  // This is now: Probability of Full Capital Recovery
  const breakEvenProb  = Math.min(Math.max(pct(blended), 10), 97);
  const riskClass      = breakEvenProb >= 75 ? "Controlled" : breakEvenProb >= 55 ? "Moderate" : "High";

  // ── Theatrical BEP strain (informational) ─────────────────────
  const theatricalStrain = (budget * TRUE_BEP_MULTIPLE) / Math.max(revenue.projectedGross, 1);

  // ── Exposure — severity tied to capital destruction depth ──────
  const missProbability = (100 - breakEvenProb) / 100;
  const baseGrossROI    = r1(Math.expm1(profile.recentLogROI));
  // Severity: how far below full recovery ratio is recent ROI's share
  const recentShareROI  = (baseGrossROI * DIST_SHARE * budget) / Math.max(totalCapital, 1);
  const expectedLossDepth = Math.max(1.0 - recentShareROI, 0); // how far below 1.0x recovery
  const severityFactor    = Math.min(expectedLossDepth, 1.0);
  const capitalAtRisk     = totalCapital * missProbability * severityFactor;
  const recoveryFloor     = totalCapital * RECOVERY_FLOOR * missProbability;
  const downsideExposure  = Math.round(Math.max(capitalAtRisk, recoveryFloor));

  // ROI band
  const spread        = r1(profile.recentDvol * 2.8);
  const grossROILow   = r1(Math.max(baseGrossROI - spread, 0.1));
  const grossROIHigh  = r1(baseGrossROI + spread * 0.35);
  const economicROILow  = r2(Math.max((grossROILow  * DIST_SHARE * budget) / Math.max(totalCapital, 1), 0.05));
  const economicROIHigh = r2((grossROIHigh * DIST_SHARE * budget) / Math.max(totalCapital, 1));

  // Strain display (BEP survival strain = recovery strain)
  const strainColor = strain < 0.5 ? "#22e5a5" : strain < 0.9 ? "#ffb347" : strain < 1.3 ? "#ffb347" : "#ff4d5a";
  const strainLabel = strain < 0.5 ? "Comfortable" : strain < 0.9 ? "Moderate" : strain < 1.3 ? "High Strain" : "Overextended";

  return {
    breakEvenProb, riskClass,
    missProbability: r2(missProbability),
    severityFactor:  r2(severityFactor),
    downsideExposure,
    economicROILow, economicROIHigh,
    grossROILow, grossROIHigh,
    strain: r2(strain), strainLabel, strainColor,
    revenue,
  };
}


/* ─── computeStress v4 ────────────────────────────────────────── */
// [DIRECTIVE 1] worstCaseLoss = budget × max(TRUE_BEP − stressedGrossROI, 0)
// [DIRECTIVE 5] survivalProb tied to TRUE_BEP gate
// selectedBudget flows in (unified with Budget Analyzer)

function computeStress(
  profile: SignalProfile,
  budget: number,
  scenarios: { openingDrop: boolean; negWOM: boolean; marketSlowdown: boolean },
  // STEP 1: Pass Budget Analyzer's breakEvenProb for exact neutral pass-through
  neutralBreakEvenProb?: number
): StressResult {
  // ── A: Unified forecast base ────────────────────────────────
  const rev          = computeRevenueBreakdown(profile, budget);
  const baseGross    = rev.projectedGross;
  const totalCapital = rev.totalCapital;
  const pnaCost      = rev.pnaCost;

  const noneSelected = !scenarios.openingDrop && !scenarios.negWOM && !scenarios.marketSlowdown;

  // ── STEP 1: Exact neutral pass-through ──────────────────────
  // When no scenario selected, Stress Test must mirror Budget Analyzer exactly.
  // No approximation. No parallel formula. Direct pass-through of breakEvenProb.
  if (noneSelected && neutralBreakEvenProb !== undefined) {
    const capitalRecoveryRatio = r2(rev.producerShare / Math.max(totalCapital, 1));
    return {
      stressedOpening:      r1(profile.openingCr),
      stressedGrossROI:     r2(baseGross / Math.max(budget, 1)),
      stressedEconomicROI:  r2(rev.producerShare / Math.max(totalCapital, 1)),
      survivalProb:         neutralBreakEvenProb,   // ← exact Budget Analyzer value
      fullCapitalRecovered: rev.fullCapitalRecovered,
      capitalDeficit:       rev.capitalDeficit,
      capitalSurplus:       rev.capitalSurplus,
      capitalRecoveryRatio,
      theatricalBEPGap:     rev.theatricalBEPGap,
      worstCaseLoss:        rev.capitalDeficit,
      tierHeld:             true,
      selectedBudget:       budget,
      stressedGross:        baseGross,
      stressedShare:        rev.producerShare,
      totalCapital,
    };
  }

  // ── C: Opening elasticity ───────────────────────────────────
  // −20% opening does not map 1:1 to gross.
  // elasticity coefficient translates opening drop to full-gross impact.
  // T1: 0.55 (long-leg potential buffers opening), T2: 0.65, T3: 0.75
  const elasticity   = OPENING_ELASTICITY[profile.tier] ?? 0.65;
  const openingDropPct = 0.20; // fixed −20% opening scenario
  const openingFactor  = scenarios.openingDrop
    ? (1 - openingDropPct * elasticity)   // e.g. T1: 1 − 0.11 = 0.89
    : 1.0;

  // WOM compression: reduces gross via audience decay acceleration
  const womFactor  = scenarios.negWOM ? 0.78 : 1.0;

  // Market slowdown: reduces gross via decay coefficient shift
  const marketFactor = scenarios.marketSlowdown ? 0.88 : 1.0;

  // Combined stress adjustment applied to projectedGross
  const stressAdjustmentFactor = openingFactor * womFactor * marketFactor;
  const stressedGross          = noneSelected
    ? baseGross
    : Math.round(baseGross * stressAdjustmentFactor);

  // Opening stress for tier-hold check
  const openingAdjust  = scenarios.openingDrop ? (1 - openingDropPct) : 1.0;
  const marketOpenAdj  = scenarios.marketSlowdown ? 0.90 : 1.0;
  const stressedOpening = r1(profile.openingCr * openingAdjust * marketOpenAdj);

  // ── Capital chain from stressed gross ──────────────────────
  const stressedShare        = Math.round(stressedGross * DIST_SHARE);
  const stressedGrossROI     = r2(stressedGross / Math.max(budget, 1));
  const stressedEconomicROI  = r2(stressedShare / Math.max(totalCapital, 1));

  // ── v5: Capital deficit (PRIMARY) ──────────────────────────
  const capitalDeficit       = Math.round(Math.max(totalCapital - stressedShare, 0));
  const capitalSurplus       = Math.round(Math.max(stressedShare - totalCapital, 0));
  const capitalRecoveryRatio = r2(stressedShare / Math.max(totalCapital, 1));
  const fullCapitalRecovered = stressedShare >= totalCapital;
  const worstCaseLoss        = capitalDeficit;

  // ── Theatrical BEP gap (INFORMATIONAL) ─────────────────────
  const theatricalBEPGap = stressedGross - Math.round(budget * TRUE_BEP_MULTIPLE);

  // ── MONOTONIC SURVIVAL — anchored to Budget Analyzer baseline ──
  // Root cause of non-monotonic bug: baseSurv×stressAdjFactor uses a completely
  // different formula to Budget Analyzer's exp(-strain×dvol). For T1 actors with
  // high scaleIndex, this formula can EXCEED Budget Analyzer, causing probability
  // to rise under stress (-20% opening → 87% when default is 64%).
  //
  // Fix: ALL stressed probabilities start from neutralBreakEvenProb and apply
  // a confidence decay. confidenceDecay is always ≤ 1 → strict monotonicity.
  //
  // stressIntensity: additive weights per scenario
  //   openingDrop: 0.20 (bounded downside — elasticity already in gross)
  //   negWOM:      0.30 (sustained audience erosion)
  //   slowdown:    0.25 (market-wide compression)
  // confidenceDecay = exp(−effectiveDvol × stressIntensity)
  // For low-dvol T1: small decay (confident actor handles stress better)
  // For high-dvol T2/T3: large decay (volatile actor hit hard by stress)
  //
  // MONOTONIC SURVIVAL FORMULA v2 — pure confidence decay
  // Proof of monotonicity:
  //   stressIntensity is strictly additive (each scenario adds a fixed amount)
  //   confidenceDecay = exp(-k) is strictly decreasing in k
  //   Therefore: adding any scenario can ONLY decrease survivalProb. QED.
  //
  // capitalPenalty was removed — it introduced non-monotonicity because
  // CRR varies non-uniformly per scenario (slowdown CRR=0.88×base >
  // wom CRR=0.78×base), causing "slowdown alone" to EXCEED "WOM alone"
  // in probability. Capital deficit is shown factually in the UI.
  //
  // stressIntensity weights (calibrated to Indian film market):
  //   -20% Opening:    0.20 (elasticity already dampens gross impact)
  //   Negative WOM:    0.30 (sustained multi-week audience collapse)
  //   Market Slowdown: 0.25 (industry-wide decay acceleration)
  const careerDvolAtBEP   = Math.max(profile.dvolPct / 100 * 0.5, 0);
  const effectiveDvol     = Math.max(profile.recentDvol, careerDvolAtBEP);
  const stressIntensity   = (scenarios.openingDrop   ? 0.20 : 0)
                          + (scenarios.negWOM         ? 0.30 : 0)
                          + (scenarios.marketSlowdown ? 0.25 : 0);
  const baseProb          = neutralBreakEvenProb ?? 50;
  const confidenceDecay   = Math.exp(-effectiveDvol * stressIntensity);
  const survivalProb      = Math.max(Math.round(baseProb * confidenceDecay), 5);

  const tierHeld = stressedOpening >= (profile.tier === 1 ? 60 : 30);

  return {
    stressedOpening, stressedGrossROI, stressedEconomicROI,
    survivalProb, fullCapitalRecovered,
    capitalDeficit, capitalSurplus, capitalRecoveryRatio,
    theatricalBEPGap, worstCaseLoss,
    tierHeld, selectedBudget: budget,
    stressedGross, stressedShare, totalCapital,
  };
}


/* ─── computeECV — Expected Capital Value Engine ─────────────── */
// Runs 5 canonical scenarios with assigned probabilities.
// Computes expected profit, expected ROI, probability of capital loss, VaR25.
// All scenarios perturb the same projectedGross base (unified with Budget Analyzer).

function computeECV(profile: SignalProfile, budget: number): ECVResult {
  const rev          = computeRevenueBreakdown(profile, budget);
  const baseGross    = rev.projectedGross;
  const totalCapital = rev.totalCapital;
  const elasticity   = OPENING_ELASTICITY[profile.tier] ?? 0.65;

  // Scenario definitions — each produces a stressedGross off the shared base
  const scenarioDefs: Array<{ name: string; prob: number; factor: number }> = [
    { name: "Base",               prob: SCENARIO_PROBS.base,     factor: 1.0 },
    { name: "Opening Drop −20%",  prob: SCENARIO_PROBS.opening,  factor: 1 - 0.20 * elasticity },
    { name: "Negative WOM",       prob: SCENARIO_PROBS.wom,      factor: 0.78 },
    { name: "Market Slowdown",    prob: SCENARIO_PROBS.slowdown,  factor: 0.88 },
    { name: "Combined Stress",    prob: SCENARIO_PROBS.combo,
      factor: (1 - 0.20 * elasticity) * 0.78 * 0.88 },
  ];

  const scenarios: ECVScenario[] = scenarioDefs.map(({ name, prob, factor }) => {
    const stressedGross = Math.round(baseGross * factor);
    const share         = Math.round(stressedGross * DIST_SHARE);
    const profit        = share - totalCapital;
    const roi           = r2(share / Math.max(totalCapital, 1));
    return { name, prob, stressedGross, share, profit, roi, isLoss: profit < 0 };
  });

  const expectedProfit    = Math.round(scenarios.reduce((a, s) => a + s.prob * s.profit, 0));
  const expectedROI       = r2(scenarios.reduce((a, s) => a + s.prob * s.roi, 0));
  const probabilityOfLoss = r2(scenarios.filter(s => s.isLoss).reduce((a, s) => a + s.prob, 0));

  // VaR25: worst outcome that contains the bottom 25% of probability mass
  // Sort scenarios ascending by profit, accumulate prob until ≥ 0.25
  const sorted = [...scenarios].sort((a, b) => a.profit - b.profit);
  let cumProb = 0;
  let var25 = sorted[0].profit;
  for (const s of sorted) {
    cumProb += s.prob;
    var25 = s.profit;
    if (cumProb >= 0.25) break;
  }

  return { scenarios, expectedProfit, expectedROI, probabilityOfLoss, var25, totalCapital };
}


/* ─── computeMigrationScore v2 ────────────────────────────────── */
// Capital Credibility Trajectory — not popularity score
// MS = CM (Capital Momentum, 0–40)
//    + SI (Stability Index, 0–30)
//    + CS (Capital Safety Score, 0–30)
//    + CDP (Capital Destruction Penalty, ≤0)
// All derived from actor.films[] gross/budget data — no lookup tables

function computeMigration(
  profile: SignalProfile,
  actor: Actor,
  capitalContext: CapitalContext | null = null
): MigrationResult {
  const films  = actor.films ?? [];
  const last4  = films.slice(-4);
  const last3  = films.slice(-3);
  const N      = last4.length;

  // Per-film economic values
  const filmEcon = last4.map(f => {
    const w       = f.multiStarrerWeight ?? 1.0;
    const gross   = f.grossCr * w;
    const budget  = f.budgetCr;
    const pna     = budget * profile.pnaRate;
    const capital = budget + pna;
    const share   = gross * DIST_SHARE;
    const roi     = gross / Math.max(budget, 1);
    const econROI = share / Math.max(capital, 1);
    return { gross, budget, capital, share, roi, econROI };
  });

  const grossVals = filmEcon.map(f => f.gross);

  // ─── CM: Capital Momentum (0–40) ───────────────────────────────
  // Weighted growth rate of gross over last 4 films
  // Weights: most recent delta gets highest weight
  let cm = 0;
  const weights = [0.1, 0.2, 0.3, 0.4]; // oldest → newest delta
  if (grossVals.length >= 2) {
    const deltas: number[] = [];
    for (let i = 1; i < grossVals.length; i++) {
      const prev = grossVals[i - 1];
      const dg   = prev > 0 ? (grossVals[i] - prev) / prev : 0;
      deltas.push(Math.max(Math.min(dg, 2), -1)); // clamp extreme swings
    }
    // align weights to available deltas (last N-1 weights from array)
    const usedWeights = weights.slice(-(deltas.length));
    const wSum = usedWeights.reduce((a, b) => a + b, 0);
    const weightedDelta = deltas.reduce((acc, d, i) => acc + d * usedWeights[i], 0) / Math.max(wSum, 0.01);
    // Map [-1, +1] → [0, 40]; above +1 still capped at 40
    cm = Math.min(Math.max((weightedDelta + 1) * 20, 0), 40);
  } else if (grossVals.length === 1) {
    cm = 20; // insufficient data — neutral
  }
  const cmPts = Math.round(cm);

  // ─── SI: Stability Index (0–30) ────────────────────────────────
  // SI = 30 × (1 − CoV)   CoV = StdDev(G) / Mean(G)
  let siPts = 0;
  if (grossVals.length >= 2) {
    const mean = grossVals.reduce((a, b) => a + b, 0) / grossVals.length;
    const variance = grossVals.reduce((a, v) => a + (v - mean) ** 2, 0) / grossVals.length;
    const stdDev = Math.sqrt(variance);
    const cov    = mean > 0 ? stdDev / mean : 1;
    siPts = Math.round(Math.max(30 * (1 - Math.min(cov, 1)), 0));
  } else {
    siPts = Math.round((profile.stabilityIndex / 100) * 30); // fallback
  }

  // ─── CS: Capital Safety Score (0–30) ───────────────────────────
  // CS = 30 × (films where gross ROI ≥ TRUE_BEP_MULTIPLE) / N
  const bepPassCount = filmEcon.filter(f => f.roi >= TRUE_BEP_MULTIPLE).length;
  const bepSurvivalRate = N > 0 ? bepPassCount / N : 0;
  const csPts = Math.round(30 * bepSurvivalRate);

  // ─── CDP: Capital Destruction Penalty (≤0) ─────────────────────
  // ROI < 1.0 → −10 per film; ROI < 0.8 → −15 per film (severe)
  let cdpTotal = 0;
  filmEcon.forEach(f => {
    if (f.roi < 0.8)      cdpTotal -= 15;
    else if (f.roi < 1.0) cdpTotal -= 10;
  });
  const cdpPts = Math.max(cdpTotal, -30);

  // ─── Capital Penalty from Risk Lab (if linked) ─────────────────
  // ── v5: Capital penalty tied to full capital recovery, not theatrical BEP ──
  let capitalPenaltyApplied = 0;
  if (capitalContext?.budgetResult) {
    const br  = capitalContext.budgetResult;
    const crr = br.revenue.capitalRecoveryRatio; // v5 decision metric
    if (br.breakEvenProb < 65) capitalPenaltyApplied -= 10; // low P(full recovery)
    if (crr < 0.7)             capitalPenaltyApplied -= 15; // severe capital destruction
    else if (crr < 1.0)        capitalPenaltyApplied -= 5;  // partial capital loss
  }

  // ─── Migration Score ───────────────────────────────────────────
  const rawMS   = cmPts + siPts + csPts + cdpPts + capitalPenaltyApplied;
  const ms      = Math.min(Math.max(rawMS, 0), 100);

  // ─── Rolling average gross (last 3 films) ──────────────────────
  const rollingAvgGross = last3.length > 0
    ? Math.round(last3.reduce((a, f) => a + f.grossCr * (f.multiStarrerWeight ?? 1), 0) / last3.length)
    : profile.openingCr;

  // ─── Consecutive ROI fails ─────────────────────────────────────
  let consecutiveFails = 0;
  for (let i = filmEcon.length - 1; i >= 0; i--) {
    if (filmEcon[i].roi < 1.0) consecutiveFails++;
    else break;
  }
  const hasSeveDestruction = filmEcon.some(f => f.roi < 0.8);

  // ─── Explicit upgrade / downgrade conditions ───────────────────
  const tier = profile.tier;

  // Tier 2→1 upgrade conditions (per directive):
  // 1. rollingAvgGross ≥ 60, 2. MS ≥ 70, 3. no ROI < 0.8 in last 3
  const upgradeConditionsMet =
    tier === 2
    ? (rollingAvgGross >= 60 && ms >= 70 && !hasSeveDestruction)
    : tier === 3
    ? (rollingAvgGross >= 30 && ms >= 60)
    : false;

  // Tier 1→2 downgrade: rollingAvg < 60 AND (2 consec BEP fails OR MS < 50)
  // Tier 2→3 downgrade: rollingAvg < 30 OR 2 consec fails OR MS < 40
  const downgradeTriggered =
    tier === 1
    ? (rollingAvgGross < 60 && (consecutiveFails >= 2 || ms < 50))
    : tier === 2
    ? (rollingAvgGross < 30 || consecutiveFails >= 2 || ms < 40)
    : false;

  // ─── Upgrade / Downgrade Probability ───────────────────────────
  const upgradeProbability =
    ms >= 80 ? Math.min(90, 75 + (ms - 80))
    : ms >= 70 ? 40 + (ms - 70) * 3.5
    : ms >= 50 ? 15 + (ms - 50) * 1.25
    : Math.max(5, ms * 0.3);

  // Downgrade risk scales inversely with MS: (60 − MS) / 60 clamped 0–1
  const downgradeRaw  = Math.max(60 - ms, 0) / 60;
  const downgradeProbability = Math.round(downgradeRaw * 100);
  const degradationRisk      = downgradeProbability;
  const degradationSignal    = degradationRisk >= 70 ? "High" : degradationRisk >= 50 ? "Elevated" : degradationRisk >= 30 ? "Moderate" : "Low";

  // ─── Prescriptive: what next 2 films must achieve ──────────────
  const targetGross = tier === 1 ? 60 : tier === 2 ? 60 : 30;
  // Required avg so that rolling 3-film avg reaches target:
  // (Y × 2 + rollingAvgGross × 1) / 3 ≥ target → Y ≥ (3×target − rollingAvgGross) / 2
  const requiredAvgGross  = Math.max(Math.ceil((3 * targetGross - rollingAvgGross) / 2), 0);
  const requiredBEPStreak = csPts < 20 ? 2 : 1;

  // ─── Forecast Readiness ────────────────────────────────────────
  const forecastReadiness = Math.min(Math.max(Math.round(
    (cmPts / 40) * 0.4 + (siPts / 30) * 0.3 + (csPts / 30) * 0.3
  ) * 100, 0), 100);

  // ─── Gap to target tier ────────────────────────────────────────
  const targetThreshold = tier === 1 ? 60 : tier === 2 ? 60 : 30;
  const gap = tier === 1
    ? r1(Math.max(profile.openingCr - 60, 0))
    : r1(Math.max(targetThreshold - profile.openingCr, 0));
  const direction: "upgrade" | "degrade" = tier === 1 ? "degrade" : "upgrade";
  const targetTier = tier === 1 ? 2 : tier - 1;
  const score = tier === 1 ? degradationRisk : Math.round(upgradeProbability);

  // ─── Verdict ───────────────────────────────────────────────────
  const verdict = tier === 1
    ? (degradationRisk >= 70 ? "Critical — capital trajectory declining. Tier 1 position at risk."
      : degradationRisk >= 50 ? "Elevated — consecutive BEP failures signal structural slowdown."
      : degradationRisk >= 30 ? "Moderate — momentum softening but Tier 1 anchor intact."
      : "Stable — Tier 1 capital position well-defended.")
    : (Math.round(upgradeProbability) >= 70 ? "High upgrade probability — conditions near threshold."
      : Math.round(upgradeProbability) >= 50 ? "Moderate — requires consecutive BEP-clearing films."
      : Math.round(upgradeProbability) >= 30 ? "Low — capital safety gap must close first."
      : "Critical — capital destruction events block upgrade path.");

  const openingHistory = films.slice(-6).map(f => f.grossCr * (f.multiStarrerWeight ?? 1));

  return {
    score, direction, targetTier, targetThreshold, gap,
    cmPts, siPts, csPts, cdpPts,
    degradationRisk, degradationSignal,
    momentum: profile.momentum, verdict,
    rollingAvgGross, bepSurvivalRate: r2(bepSurvivalRate),
    consecutiveFails, hasSeveDestruction,
    upgradeConditionsMet, downgradeTriggered,
    upgradeProbability: Math.round(upgradeProbability),
    downgradeProbability,
    requiredAvgGross, requiredBEPStreak,
    capitalPenaltyApplied,
    openingHistory, forecastReadiness,
  };
}

/* ═══════════════════════════════════════════════════════════════
   SIGNAL CSS — unchanged from v3
═══════════════════════════════════════════════════════════════ */

const SIGNAL_CSS = `
/* ── SIGNAL v5 DESIGN SYSTEM ────────────────────────────────────
   Galactic Color Tokens
   --sg-profit:   #22e5a5   Neon Mint
   --sg-loss:     #ff4d5a   Solar Red
   --sg-warn:     #ffb347   Amber
   --sg-accent:   #4f8cff   Aurora Blue
   --sg-gold:     #FFC700   StarsQ Gold
   Depth layers: root → panel (glass) → card → tile
──────────────────────────────────────────────────────────────── */

/* A ── ROOT: Deep-space layered gradient */
.sg-root {
  min-height: 100vh;
  background: radial-gradient(ellipse 120% 100% at 70% 50%, #08101e 0%, #040810 50%, #020508 100%);
  color: #E8EAF0;
  font-family: 'DM Sans','Sora',system-ui,sans-serif;
  position: relative;
}
.sg-root::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  opacity: 0.02;
  z-index: 0;
}

/* Gate */
.sg-gate { position:relative; z-index:1; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:radial-gradient(ellipse 60% 50% at 50% 40%,rgba(255,199,0,0.06) 0%,transparent 70%),radial-gradient(ellipse 80% 60% at 20% 80%,rgba(79,140,255,0.08) 0%,transparent 60%),radial-gradient(circle at 20% 30%,#0f1c3f 0%,#0b1224 40%,#050a16 100%); padding:40px 20px; text-align:center; position:relative; overflow:hidden; }
.sg-gate-noise { position:absolute; inset:0; pointer-events:none; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E"); opacity:0.025; }
.sg-gate-eyebrow { font-size:13px; letter-spacing:0.22em; text-transform:uppercase; color:rgba(255,199,0,0.6); margin-bottom:20px; font-weight:600; }
.sg-gate-lock { width:52px; height:52px; margin:0 auto 24px; opacity:0.5; }
.sg-gate-title { font-size:clamp(56px,9vw,96px); font-weight:900; letter-spacing:-0.04em; line-height:1; background:linear-gradient(135deg,#FFC700 0%,#FFE566 45%,#FF9500 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:12px; }
.sg-gate-sub { font-size:16px; color:#8B95A8; letter-spacing:0.06em; text-transform:uppercase; font-weight:500; margin-bottom:8px; }
.sg-gate-desc { font-size:15px; color:rgba(255,255,255,0.35); margin-bottom:48px; max-width:360px; }
.sg-gate-form { width:100%; max-width:400px; display:flex; flex-direction:column; gap:12px; }
.sg-gate-input { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.10); border-radius:10px; padding:14px 16px; color:#E8EAF0; font-size:16px; font-family:inherit; outline:none; transition:border-color 200ms ease; }
.sg-gate-input:focus { border-color:rgba(255,199,0,0.45); }
.sg-gate-input::placeholder { color:rgba(255,255,255,0.25); }
.sg-gate-btn { background:linear-gradient(90deg,#FFC700,#FF9500); color:#0B0F17; font-weight:800; font-size:14px; letter-spacing:0.12em; text-transform:uppercase; border:none; border-radius:10px; padding:16px 32px; cursor:pointer; margin-top:8px; transition:transform 200ms ease,box-shadow 200ms ease; font-family:inherit; box-shadow:0 0 32px rgba(255,199,0,0.35),0 4px 16px rgba(0,0,0,0.4); }
.sg-gate-btn:hover { transform:translateY(-1px); box-shadow:0 0 48px rgba(255,199,0,0.55),0 6px 24px rgba(0,0,0,0.5); }
.sg-gate-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
.sg-gate-error { font-size:13px; color:#ff4d5a; margin-top:4px; }
.sg-gate-note { font-size:14px; color:rgba(255,255,255,0.2); margin-top:24px; letter-spacing:0.05em; }
.sg-gate-divider { width:1px; height:48px; background:linear-gradient(to bottom,transparent,rgba(255,199,0,0.3),transparent); margin:24px auto; }

/* Nav */
.sg-nav { position:sticky; top:0; z-index:60; background:rgba(5,10,22,0.85); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border-bottom:1px solid rgba(255,199,0,0.07); display:flex; align-items:center; justify-content:space-between; padding:0 32px; height:60px; gap:20px; }
.sg-nav-brand { display:flex; flex-direction:column; gap:1px; }
.sg-nav-brand-eye { font-size:13px; letter-spacing:0.2em; color:rgba(255,199,0,0.5); text-transform:uppercase; font-weight:700; line-height:1; }
.sg-nav-brand-name { font-size:18px; font-weight:900; letter-spacing:0.1em; color:#FFC700; line-height:1; }
.sg-nav-links { display:flex; gap:4px; flex:1; justify-content:center; }
.sg-nav-link { font-size:14px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; padding:8px 16px; border-radius:6px; cursor:pointer; border:none; background:none; color:rgba(232,234,240,0.5); transition:color 200ms,background 200ms; font-family:inherit; }
.sg-nav-link:hover { color:#E8EAF0; background:rgba(255,255,255,0.05); }
.sg-nav-link.sg-nav-active { color:#FFC700; background:rgba(255,199,0,0.08); }
.sg-nav-right { display:flex; align-items:center; gap:12px; }
.sg-nav-session { font-size:13px; color:rgba(255,255,255,0.3); letter-spacing:0.05em; }
.sg-nav-logout { font-size:13px; padding:6px 12px; border-radius:5px; cursor:pointer; font-family:inherit; border:1px solid rgba(255,255,255,0.10); background:none; color:rgba(232,234,240,0.5); transition:all 200ms ease; letter-spacing:0.05em; text-transform:uppercase; font-weight:600; }
.sg-nav-logout:hover { border-color:rgba(255,255,255,0.25); color:#E8EAF0; }

/* Main layout */
.sg-main { max-width:1200px; margin:0 auto; padding:32px 24px 80px; position:relative; z-index:1; }

/* C ── TYPOGRAPHY HIERARCHY ─────────────────────────────────── */
/* L1 Primary capital metrics: full opacity, heavy */
.sg-section-label { font-size:13px; letter-spacing:0.2em; text-transform:uppercase; color:rgba(255,199,0,0.55); font-weight:700; margin-bottom:16px; }
.sg-section-title { font-size:22px; font-weight:800; color:#E8EAF0; margin-bottom:4px; letter-spacing:-0.02em; }
/* L2 Economic metrics: 80% opacity */
.sg-section-sub { font-size:15px; color:rgba(232,234,240,0.55); margin-bottom:32px; }
/* L3 Informational: 50% */
.sg-card-label { font-size:13px; letter-spacing:0.18em; text-transform:uppercase; color:rgba(139,149,168,0.85); font-weight:600; margin-bottom:10px; }

/* Search */
.sg-search-row { display:flex; gap:8px; margin-bottom:32px; }
.sg-search-wrap { flex:1; display:flex; align-items:center; background:rgba(20,35,70,0.5); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:0 16px; gap:10px; transition:border-color 200ms; }
.sg-search-wrap:focus-within { border-color:rgba(79,140,255,0.35); }
.sg-search-q { font-size:14px; font-weight:800; color:#4f8cff; flex-shrink:0; }
.sg-search-input { flex:1; background:none; border:none; outline:none; color:#E8EAF0; font-size:15px; font-family:inherit; padding:13px 0; }
.sg-search-input::placeholder { color:rgba(255,255,255,0.2); }
.sg-search-btn { background:linear-gradient(90deg,#FFC700,#FF9500); color:#050a16; font-weight:800; font-size:14px; letter-spacing:0.1em; text-transform:uppercase; border:none; border-radius:8px; padding:10px 20px; cursor:pointer; font-family:inherit; white-space:nowrap; transition:transform 200ms,box-shadow 200ms; box-shadow:0 0 20px rgba(255,199,0,0.25); }
.sg-search-btn:hover { transform:translateY(-1px); box-shadow:0 0 32px rgba(255,199,0,0.45); }
.sg-search-dropdown { position:absolute; top:calc(100% + 4px); left:0; right:0; background:rgba(11,18,36,0.98); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.08); border-radius:12px; z-index:50; overflow:hidden; box-shadow:0 20px 48px rgba(0,0,0,0.7); }
.sg-search-opt { padding:10px 16px; font-size:15px; cursor:pointer; color:#E8EAF0; transition:background 150ms; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.04); }
.sg-search-opt:last-child { border-bottom:none; }
.sg-search-opt:hover { background:rgba(79,140,255,0.08); }
.sg-search-opt-tier { font-size:13px; color:#FFC700; font-weight:700; letter-spacing:0.08em; }
.sg-search-wrapper { position:relative; flex:1; }

/* B ── GLASS CARD SYSTEM ─────────────────────────────────────
   Depth 1 — Primary panels (glass)
   Depth 2 — Metric cards (deeper glass)
   Depth 3 — Inner tiles (subtle tint)
────────────────────────────────────────────────────────────── */
.sg-metrics-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:14px; }

/* Depth 2 — metric cards */
.sg-card { background:rgba(15,28,58,0.75); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:20px; position:relative; overflow:hidden; transition:border-color 200ms,box-shadow 200ms; }
.sg-card:hover { border-color:rgba(79,140,255,0.18); box-shadow:0 4px 32px rgba(0,0,0,0.3); }
.sg-card-accent { position:absolute; top:0; left:0; right:0; height:1px; }
.sg-card-value { font-size:32px; font-weight:900; letter-spacing:-0.03em; line-height:1; color:#E8EAF0; }
.sg-card-sub { font-size:14px; color:rgba(139,149,168,0.8); margin-top:6px; }
.sg-card-gold .sg-card-value { color:#FFC700; }
.sg-card-tier { font-size:13px; font-weight:700; letter-spacing:0.12em; padding:3px 8px; border-radius:4px; display:inline-block; margin-top:6px; }

.sg-chi-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
/* Depth 1 — primary panels */
.sg-chi-card { background:rgba(20,35,70,0.6); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,0.06); border-radius:18px; padding:24px; }
.sg-chi-score { font-size:56px; font-weight:900; letter-spacing:-0.04em; line-height:1; }
.sg-chi-band { font-size:14px; font-weight:700; letter-spacing:0.1em; padding:4px 10px; border-radius:5px; text-transform:uppercase; margin-top:8px; display:inline-block; }
.sg-chi-factors { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:16px; }
/* Depth 3 — inner tiles */
.sg-factor { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:10px; padding:12px; }
.sg-factor-name { font-size:13px; letter-spacing:0.15em; color:rgba(139,149,168,0.8); text-transform:uppercase; font-weight:600; margin-bottom:6px; }
.sg-factor-val { font-size:22px; font-weight:800; color:#E8EAF0; }
.sg-factor-bar-track { height:2px; background:rgba(255,255,255,0.07); border-radius:2px; margin-top:8px; }
.sg-factor-bar-fill { height:2px; border-radius:2px; transition:width 400ms ease; }

.sg-vol-card { background:rgba(20,35,70,0.6); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,0.06); border-radius:18px; padding:24px; }
.sg-vol-bars { display:flex; flex-direction:column; gap:10px; margin-top:16px; }
.sg-vol-row { display:grid; grid-template-columns:140px 1fr 64px; gap:12px; align-items:center; }
.sg-vol-name { font-size:14px; color:rgba(232,234,240,0.8); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sg-vol-track { height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden; }
.sg-vol-fill { height:4px; border-radius:2px; transition:width 600ms cubic-bezier(0.4,0,0.2,1); }
.sg-vol-num { font-size:13px; color:rgba(139,149,168,0.8); text-align:right; font-weight:600; font-variant-numeric:tabular-nums; }

/* Risk Lab */
.sg-risklab { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
.sg-inputs-card { background:rgba(20,35,70,0.6); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,0.06); border-radius:18px; padding:24px; }
.sg-outputs-card { background:rgba(20,35,70,0.6); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,0.06); border-radius:18px; padding:24px; display:flex; flex-direction:column; gap:18px; }
.sg-field-label { font-size:13px; letter-spacing:0.15em; text-transform:uppercase; color:rgba(139,149,168,0.85); font-weight:600; margin-bottom:8px; }
.sg-field { margin-bottom:20px; }
.sg-slider-wrap { display:flex; flex-direction:column; gap:8px; }
.sg-slider { width:100%; accent-color:#4f8cff; cursor:pointer; height:4px; }
.sg-slider-labels { display:flex; justify-content:space-between; font-size:13px; color:rgba(139,149,168,0.7); }
.sg-slider-val { font-size:22px; font-weight:800; color:#FFC700; }
.sg-dist-btns { display:flex; gap:8px; }
.sg-dist-btn { flex:1; padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:none; color:rgba(139,149,168,0.8); font-size:14px; font-weight:600; font-family:inherit; cursor:pointer; transition:all 200ms; letter-spacing:0.05em; }
.sg-dist-btn.sg-dist-active { border-color:rgba(79,140,255,0.5); background:rgba(79,140,255,0.08); color:#4f8cff; }
.sg-run-btn { width:100%; padding:14px; background:linear-gradient(90deg,#FFC700,#FF9500); color:#050a16; font-weight:800; font-size:13px; letter-spacing:0.12em; text-transform:uppercase; border:none; border-radius:10px; cursor:pointer; font-family:inherit; margin-top:4px; transition:transform 200ms,box-shadow 200ms; box-shadow:0 0 24px rgba(255,199,0,0.25); }
.sg-run-btn:hover { transform:translateY(-1px); box-shadow:0 0 36px rgba(255,199,0,0.45); }

/* Outputs */
.sg-output-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
/* Depth 3 */
.sg-output-metric { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:16px; }
/* C L1 — primary capital metric number */
.sg-output-val { font-size:28px; font-weight:900; color:#FFC700; letter-spacing:-0.02em; }
/* C L2 — economic metrics */
.sg-output-sub { font-size:13px; color:rgba(139,149,168,0.75); margin-top:4px; letter-spacing:0.06em; }
.sg-output-note { font-size:14px; color:rgba(139,149,168,0.75); line-height:1.6; }
.sg-risk-pill { display:inline-block; font-size:13px; font-weight:700; letter-spacing:0.1em; padding:4px 10px; border-radius:5px; text-transform:uppercase; margin-left:8px; }

/* Stress */
.sg-stress-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
.sg-toggle-row { display:flex; flex-direction:column; gap:10px; margin-bottom:24px; }
.sg-toggle { display:flex; align-items:center; gap:12px; padding:13px 16px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); cursor:pointer; transition:all 200ms; background:rgba(255,255,255,0.02); }
.sg-toggle:hover { border-color:rgba(255,255,255,0.12); }
.sg-toggle.sg-tog-on { border-color:rgba(79,140,255,0.3); background:rgba(79,140,255,0.06); }
.sg-toggle-box { width:18px; height:18px; border-radius:4px; border:1px solid rgba(255,255,255,0.2); flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:all 200ms; }
.sg-toggle.sg-tog-on .sg-toggle-box { background:#4f8cff; border-color:#4f8cff; }
.sg-toggle-label { font-size:15px; color:rgba(232,234,240,0.85); font-weight:500; }
.sg-toggle-impact { font-size:14px; color:rgba(139,149,168,0.7); margin-left:auto; }

/* Survival gauge */
.sg-surv-gauge { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:28px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:14px; }
.sg-surv-num { font-size:52px; font-weight:900; letter-spacing:-0.04em; }
.sg-surv-label { font-size:13px; letter-spacing:0.12em; text-transform:uppercase; color:rgba(139,149,168,0.75); margin-top:4px; }

/* Drawdown */
.sg-drawdown-bar { margin-top:16px; }
.sg-drawdown-track { height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden; margin-top:8px; }
.sg-drawdown-fill { height:6px; border-radius:3px; transition:width 400ms ease; }

/* Migration */
.sg-mig-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
.sg-tier-ladder { display:flex; align-items:center; gap:0; margin:24px 0; }
.sg-tier-node { display:flex; flex-direction:column; align-items:center; gap:8px; }
.sg-tier-circle { width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:900; border:2px solid; transition:all 200ms; }
.sg-tier-circle-label { font-size:13px; letter-spacing:0.12em; text-transform:uppercase; color:rgba(139,149,168,0.7); }
.sg-tier-arrow { flex:1; display:flex; align-items:center; padding:0 8px; }
.sg-tier-line { height:1px; flex:1; }
.sg-mig-score-wrap { display:flex; flex-direction:column; align-items:center; padding:28px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:14px; }
.sg-mig-score { font-size:64px; font-weight:900; letter-spacing:-0.04em; color:#FFC700; }
.sg-mig-score-denom { font-size:24px; color:rgba(139,149,168,0.6); font-weight:400; }
.sg-mig-label { font-size:13px; letter-spacing:0.18em; text-transform:uppercase; color:rgba(139,149,168,0.7); margin-top:4px; }
.sg-mig-verdict { font-size:15px; color:rgba(232,234,240,0.8); margin-top:16px; text-align:center; line-height:1.5; max-width:260px; }
.sg-gap-bar { margin-top:20px; }
.sg-gap-track { height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden; margin-top:6px; }
.sg-gap-fill { height:6px; border-radius:3px; background:linear-gradient(90deg,#FFC700,#FF9500); transition:width 500ms ease; }
.sg-time-boundary { background:rgba(255,255,255,0.02); border-radius:12px; padding:16px; margin-top:16px; border-left:3px solid rgba(255,199,0,0.35); }
.sg-time-boundary-text { font-size:14px; color:rgba(139,149,168,0.75); line-height:1.6; }
.sg-forecast-readiness { background:rgba(255,199,0,0.03); border:1px solid rgba(255,199,0,0.12); border-radius:14px; padding:20px; margin-top:16px; }
.sg-readiness-bar-track { height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden; margin:10px 0; }
.sg-readiness-bar-fill { height:6px; border-radius:3px; transition:width 600ms ease; }
.sg-sparkline-wrap { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:16px; margin-top:16px; }

/* Portfolio */
.sg-portfolio-placeholder { min-height:400px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; text-align:center; border:1px dashed rgba(255,255,255,0.07); border-radius:18px; }
.sg-phase-badge { font-size:13px; letter-spacing:0.2em; text-transform:uppercase; color:#FFC700; font-weight:700; background:rgba(255,199,0,0.07); padding:4px 12px; border-radius:20px; border:1px solid rgba(255,199,0,0.18); }
.sg-tabs { display:flex; gap:4px; margin-bottom:24px; background:rgba(255,255,255,0.03); padding:4px; border-radius:10px; width:fit-content; border:1px solid rgba(255,255,255,0.05); }
.sg-tab { padding:8px 20px; border-radius:7px; font-size:14px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; border:none; background:none; color:rgba(139,149,168,0.8); font-family:inherit; transition:all 200ms; }
.sg-tab.sg-tab-active { background:linear-gradient(90deg,#FFC700,#FF9500); color:#050a16; }

/* G ── REVENUE CHAIN: improved metric separation */
.sg-revenue-chain { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:18px; }
.sg-rev-row { display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
.sg-rev-row:last-child { border-bottom:none; }
/* C L2 label, L1 value */
.sg-rev-label { font-size:13px; color:rgba(139,149,168,0.8); letter-spacing:0.06em; }
.sg-rev-val { font-size:15px; font-weight:700; color:#E8EAF0; font-variant-numeric:tabular-nums; }
.sg-bep-flag { padding:9px 12px; border-radius:8px; margin-top:10px; }
.sg-exposure-breakdown { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:8px; }
.sg-exp-box { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:10px; text-align:center; }
.sg-exp-label { font-size:13px; letter-spacing:0.12em; text-transform:uppercase; color:rgba(139,149,168,0.75); margin-bottom:4px; }
.sg-exp-val { font-size:16px; font-weight:800; color:#E8EAF0; }
.sg-strain-indicator { display:flex; flex-direction:column; gap:6px; margin-top:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; }
.sg-strain-track { height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden; }
.sg-strain-fill { height:4px; border-radius:2px; transition:width 400ms ease; }

/* Responsive */
@media(max-width:768px) { .sg-metrics-row{grid-template-columns:1fr 1fr} .sg-chi-row,.sg-risklab,.sg-stress-grid,.sg-mig-grid{grid-template-columns:1fr} .sg-nav{padding:0 16px} .sg-nav-links{display:none} .sg-main{padding:20px 16px 80px} }
.sg-empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:64px 32px; gap:12px; text-align:center; }
.sg-empty-icon { font-size:40px; opacity:0.3; }
.sg-empty-text { font-size:15px; color:rgba(139,149,168,0.75); }
.fade-in { animation:sgFadeIn 280ms ease both; }
@keyframes sgFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }

/* F ── DATA RING SYSTEM ──────────────────────────────────────── */
.sg-ring-wrap { display:flex; flex-direction:column; align-items:center; gap:6px; }
.sg-ring-svg { transform:rotate(-90deg); }
.sg-ring-track { fill:none; }
.sg-ring-fill { fill:none; stroke-linecap:round; transition:stroke-dashoffset 700ms cubic-bezier(0.4,0,0.2,1); }
.sg-ring-label { font-size:13px; letter-spacing:0.1em; text-transform:uppercase; color:rgba(139,149,168,0.75); text-align:center; }
`;

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */

const TIER_COLORS: Record<number, string> = { 1: "#D4AF37", 2: "#4DA3FF", 3: "#2EC4B6" };
const RISK_COLORS: Record<string, string> = { Controlled: "#22e5a5", Moderate: "#ffb347", Balanced: "#ffb347", Elevated: "#ffb347", High: "#ff4d5a" };
const CHI_COLORS = { Healthy: "#22e5a5", Volatile: "#ffb347", Risky: "#ffb347", Unhealthy: "#ff4d5a" };
const DEMO_EMAIL = "producer@starsq.com";
const DEMO_PASS  = "signal2024";

/* ═══════════════════════════════════════════════════════════════
   ACCESS GATE
═══════════════════════════════════════════════════════════════ */

function AccessGate({ onAuth }: { onAuth: (e: string) => void }) {
  const [email, setEmail] = useState(""); const [pass, setPass] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    if (email.trim().toLowerCase() === DEMO_EMAIL && pass.trim() === DEMO_PASS) onAuth(email.trim());
    else setError("Access denied. Producer credentials required.");
    setLoading(false);
  };
  return (
    <div className="sg-gate">
      <div className="sg-gate-noise" />
      <svg className="sg-gate-lock" viewBox="0 0 52 52" fill="none">
        <rect x="10" y="22" width="32" height="22" rx="4" fill="none" stroke="rgba(255,199,0,0.4)" strokeWidth="1.5"/>
        <path d="M16 22v-6a10 10 0 0120 0v6" stroke="rgba(255,199,0,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <circle cx="26" cy="33" r="3" fill="rgba(255,199,0,0.4)"/>
        <line x1="26" y1="36" x2="26" y2="40" stroke="rgba(255,199,0,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <p className="sg-gate-eyebrow">StarsQ · Restricted Access</p>
      <h1 className="sg-gate-title">SIGNAL</h1>
      <p className="sg-gate-sub">Producer Capital Intelligence</p>
      <p className="sg-gate-desc">Private modeling layer. Authorized producers and studio executives only.</p>
      <div className="sg-gate-divider" />
      <form className="sg-gate-form" onSubmit={handleLogin}>
        <input className="sg-gate-input" type="email" placeholder="Producer email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        <input className="sg-gate-input" type="password" placeholder="Access key" value={pass} onChange={e => setPass(e.target.value)} required autoComplete="current-password" />
        {error && <p className="sg-gate-error">{error}</p>}
        <button className="sg-gate-btn" type="submit" disabled={loading}>{loading ? "Verifying..." : "Enter Signal"}</button>
      </form>
      <p className="sg-gate-note">Demo: producer@starsq.com / signal2024</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ACTOR SEARCH
═══════════════════════════════════════════════════════════════ */

function ActorSearch({ onSelect, selected }: { onSelect: (a: Actor) => void; selected: Actor | null }) {
  const [q, setQ] = useState(selected?.name ?? ""); const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => { if (!q.trim()) return actors; const lq = q.toLowerCase(); return actors.filter(a => a.name.toLowerCase().includes(lq) || a.aliases.some(al => al.includes(lq))); }, [q]);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  return (
    <div className="sg-search-wrapper" ref={ref}>
      <div className="sg-search-wrap">
        <span className="sg-search-q">⚙</span>
        <input className="sg-search-input" placeholder="Search actor..." value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      </div>
      {open && filtered.length > 0 && (
        <div className="sg-search-dropdown">
          {filtered.slice(0, 8).map(a => { const t = a.openingCr >= 60 ? 1 : a.openingCr >= 30 ? 2 : 3; return (
            <div key={a.name} className="sg-search-opt" onMouseDown={() => { onSelect(a); setQ(a.name); setOpen(false); }}>
              <span>{a.name}</span><span className="sg-search-opt-tier" style={{ color: TIER_COLORS[t] }}>T{t}</span>
            </div>
          ); })}
        </div>
      )}
      {selected && !open && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 11, color: "rgba(255,199,0,0.45)", letterSpacing: "0.08em" }}>
            📊 {selected.films?.length ?? 0} films analysed
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>·</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em" }}>
            Latest: {selected.films ? Math.max(...selected.films.map(f => f.year)) : "—"}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>·</span>
          <span style={{ fontSize: 11, color: "rgba(255,199,0,0.3)", letterSpacing: "0.05em" }}>
            Expert-assessed inputs
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REVENUE CHAIN PANEL — shows Gross → Nett → Share breakdown
   [DIRECTIVE 2] — transparent numerator/denominator
═══════════════════════════════════════════════════════════════ */

/* ─── RingMetric — minimal Apple-style circular progress ─────── */
// F: Clean data ring for CRR, probability, expected ROI
// No neon glow. Thin strokes. Institutional.
function RingMetric({
  value, max = 1, label, sublabel, color, size = 80
}: {
  value: number; max?: number; label: string; sublabel?: string;
  color: string; size?: number;
}) {
  const r       = (size - 10) / 2;
  const circ    = 2 * Math.PI * r;
  const pct     = Math.min(Math.max(value / max, 0), 1);
  const offset  = circ * (1 - pct);
  return (
    <div className="sg-ring-wrap">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg className="sg-ring-svg" width={size} height={size}>
          <circle className="sg-ring-track" cx={size/2} cy={size/2} r={r}
            stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
          <circle className="sg-ring-fill" cx={size/2} cy={size/2} r={r}
            stroke={color} strokeWidth={5}
            strokeDasharray={circ}
            strokeDashoffset={offset} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: size * 0.22, fontWeight: 900, color, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
            {label}
          </span>
        </div>
      </div>
      {sublabel && <p className="sg-ring-label">{sublabel}</p>}
    </div>
  );
}

function RevenueChainPanel({ rev, budget }: { rev: RevenueBreakdown; budget: number }) {
  const crrColor = rev.capitalRecoveryRatio >= 1.0 ? "#22e5a5"
    : rev.capitalRecoveryRatio >= 0.7 ? "#ffb347" : "#ff4d5a";

  return (
    <div className="sg-revenue-chain">
      <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,199,0,0.6)", fontWeight: 700, marginBottom: 10 }}>
        Full Capital Recovery Chain · v5
      </p>
      {/* Capital deployed */}
      <div className="sg-rev-row">
        <span className="sg-rev-label">Production Budget</span>
        <span className="sg-rev-val">₹{budget}Cr</span>
      </div>
      <div className="sg-rev-row">
        <span className="sg-rev-label">P&A / Marketing ({Math.round(rev.pnaCost / budget * 100)}%)</span>
        <span className="sg-rev-val" style={{ color: "#ffb347" }}>+₹{rev.pnaCost}Cr</span>
      </div>
      <div className="sg-rev-row" style={{ borderBottom: "1px solid rgba(255,199,0,0.2)", paddingBottom: 8, marginBottom: 8 }}>
        <span className="sg-rev-label" style={{ color: "#FFC700", fontWeight: 700 }}>Total Capital Deployed</span>
        <span className="sg-rev-val" style={{ color: "#FFC700", fontSize: 15 }}>₹{rev.totalCapital}Cr</span>
      </div>
      {/* Revenue chain */}
      <div className="sg-rev-row">
        <span className="sg-rev-label">Projected Gross (decay {(rev.decayFactor*100).toFixed(0)}% · regr {(rev.regressionFactor*100).toFixed(0)}%)</span>
        <span className="sg-rev-val">₹{rev.projectedGross}Cr</span>
      </div>
      <div className="sg-rev-row">
        <span className="sg-rev-label">Producer Share ({Math.round(DIST_SHARE * 100)}% of gross)</span>
        <span className="sg-rev-val" style={{ color: rev.fullCapitalRecovered ? "#22e5a5" : "#ff4d5a" }}>₹{rev.producerShare}Cr</span>
      </div>
      {/* v5: CAPITAL RECOVERY — DOMINANT ROW */}
      <div style={{ margin: "8px 0", padding: "10px 14px", borderRadius: 10, background: rev.fullCapitalRecovered ? "linear-gradient(90deg,rgba(34,229,165,0.12),rgba(34,229,165,0.04))" : "linear-gradient(90deg,rgba(255,77,90,0.12),rgba(255,77,90,0.04))", borderLeft: `3px solid ${crrColor}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: crrColor }}>
            {rev.fullCapitalRecovered ? "✓ Full Capital Recovery" : "✗ Capital Deficit"}
          </span>
          <span style={{ fontSize: 18, fontWeight: 900, color: crrColor }}>
            {rev.fullCapitalRecovered ? `+₹${rev.capitalSurplus}Cr` : `-₹${rev.capitalDeficit}Cr`}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Capital Recovery Ratio (needs ≥1.0x)</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: crrColor }}>{rev.capitalRecoveryRatio.toFixed(2)}x</span>
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
          Gross required for full recovery: ₹{rev.fullRecoveryGross}Cr ({rev.fullRecoveryROI.toFixed(2)}x budget)
        </div>
      </div>
      {/* Theatrical BEP — informational only */}
      <div style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginTop: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Theatrical BEP @ {TRUE_BEP_MULTIPLE}x (informational)</span>
          <span style={{ fontSize: 11, color: rev.theatricalBEPGap >= 0 ? "rgba(34,229,165,0.6)" : "rgba(255,77,90,0.6)", fontWeight: 700 }}>
            {rev.theatricalBEPGap >= 0 ? "+" : ""}₹{rev.theatricalBEPGap}Cr vs ₹{rev.breakEvenGross}Cr req.
          </span>
        </div>
      </div>
      {/* Econ ROI summary */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
          <p style={{ fontSize: 9, color: "#8B95A8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>Capital Recovery</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: crrColor }}>{rev.capitalRecoveryRatio.toFixed(2)}x</p>
        </div>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
          <p style={{ fontSize: 9, color: "#8B95A8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>Full Recovery @</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#E8EAF0" }}>{rev.fullRecoveryROI.toFixed(2)}x</p>
        </div>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
          <p style={{ fontSize: 9, color: "#8B95A8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>Deficit / Surplus</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: crrColor }}>
            {rev.fullCapitalRecovered ? `+₹${rev.capitalSurplus}Cr` : `-₹${rev.capitalDeficit}Cr`}
          </p>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   TIER BUFFER SPARKLINE
═══════════════════════════════════════════════════════════════ */

function TierBufferSparkline({ actor, profile }: { actor: Actor; profile: SignalProfile }) {
  const films = actor.films ?? [];
  if (films.length < 2) return null;
  const last6 = films.slice(-6);
  const grossVals = last6.map(f => f.grossCr * (f.multiStarrerWeight ?? 1.0));
  const tierFloor = profile.openingCr >= 60 ? 60 : profile.openingCr >= 30 ? 30 : 0;
  const maxVal = Math.max(...grossVals, tierFloor * 2, 10);
  const W = 240; const H = 72;
  const pts = grossVals.map((v, i) => ({ x: (i / (grossVals.length - 1)) * (W - 16) + 8, y: H - 8 - ((v / maxVal) * (H - 20)), v }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const floorY = H - 8 - ((tierFloor / maxVal) * (H - 20));
  const slope = pts.length >= 2 ? pts[pts.length - 1].y - pts[0].y : 0;
  const trending = slope < -4 ? "up" : slope > 4 ? "down" : "flat";
  const trendColor = trending === "up" ? "#22e5a5" : trending === "down" ? "#ff4d5a" : "#ffb347";
  return (
    <div className="sg-sparkline-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8B95A8", fontWeight: 700 }}>Gross Trajectory · Last {last6.length} Films</p>
        <span style={{ fontSize: 11, color: trendColor, fontWeight: 700 }}>{trending === "up" ? "↑ Rising" : trending === "down" ? "↓ Declining" : "→ Flat"}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {tierFloor > 0 && <><line x1={8} y1={floorY} x2={W - 8} y2={floorY} stroke="rgba(255,199,0,0.25)" strokeWidth="1" strokeDasharray="4,3" /><text x={W - 6} y={floorY - 3} fontSize="8" fill="rgba(255,199,0,0.5)" textAnchor="end">T{profile.tier} floor</text></>}
        <path d={`${pathD} L${pts[pts.length-1].x},${H-8} L${pts[0].x},${H-8} Z`} fill="rgba(255,199,0,0.05)" />
        <path d={pathD} fill="none" stroke={trendColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={trendColor} />)}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: "#8B95A8" }}>{last6[0]?.title?.split(" ").slice(0, 2).join(" ") ?? "Oldest"}</span>
        <span style={{ fontSize: 10, color: "#8B95A8" }}>{last6[last6.length - 1]?.title?.split(" ").slice(0, 2).join(" ") ?? "Latest"}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FORECAST READINESS PANEL
═══════════════════════════════════════════════════════════════ */

function ForecastReadinessPanel({ migration }: { migration: MigrationResult }) {
  const fr = migration.forecastReadiness;
  const frColor = fr >= 70 ? "#22e5a5" : fr >= 45 ? "#ffb347" : "#ff4d5a";
  const frLabel = fr >= 70 ? "Ready for Forecast" : fr >= 45 ? "Partial Readiness" : "Low Signal Quality";
  // Use actual CM/SI/CS from migration engine — no lookup tables
  const components = [
    { label: "Capital Momentum", val: migration.cmPts, max: 40 },
    { label: "Stability Index",  val: migration.siPts,  max: 30 },
    { label: "Capital Safety",   val: migration.csPts,  max: 30 },
  ];
  return (
    <div className="sg-forecast-readiness">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,199,0,0.6)", fontWeight: 700, marginBottom: 4 }}>Forecast Readiness Index</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: frColor, letterSpacing: "-0.03em" }}>{fr}</span>
            <span style={{ fontSize: 16, color: "#8B95A8" }}>/100</span>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 5, background: `${frColor}18`, color: frColor }}>{frLabel}</span>
      </div>
      <div className="sg-readiness-bar-track" style={{ marginTop: 12 }}>
        <div className="sg-readiness-bar-fill" style={{ width: `${fr}%`, background: `linear-gradient(90deg,${frColor}99,${frColor})` }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
        {components.map(c => (
          <div key={c.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "8px 10px" }}>
            <p style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B95A8", marginBottom: 4 }}>{c.label}</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#E8EAF0" }}>{c.val}<span style={{ fontSize: 10, color: "#8B95A8" }}>/{c.max}</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CAPITAL COCKPIT
═══════════════════════════════════════════════════════════════ */

function CapitalCockpit({ onNavigate }: { onNavigate: (m: string) => void }) {
  const [selected, setSelected] = useState<Actor>(actors[0]);
  const profile = useMemo(() => computeProfile(selected), [selected]);
  const heatmapActors = useMemo(() => [...actors].map(a => ({ actor: a, p: computeProfile(a) })).sort((a, b) => b.p.dvolPct - a.p.dvolPct), []);
  const RMF = Math.exp(-(profile.dvolPct / 100) * 1.5);
  const chiFactors = [
    { key: "RMF",  label: "Risk Mitigation",  val: RMF,                           desc: "exp(−dvol×1.5)" },
    { key: "CS",   label: "Capital Safety",    val: (100 - profile.dvolPct) / 100, desc: `1 − DVol (BEP@${TRUE_BEP_MULTIPLE}x)` },
    { key: "SA",   label: "Scale Alignment",   val: profile.scaleIndex / 100,      desc: "Log-normalized scale" },
    { key: "STB",  label: "Stability",         val: profile.stabilityIndex / 100,  desc: "exp(−dvol) decay" },
  ];
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 8 }}>
        <p className="sg-section-label">Capital Cockpit</p>
        <h2 className="sg-section-title">Actor Capital Overview</h2>
        <p className="sg-section-sub">Select an actor to run capital modeling across all SIGNAL modules. Economics basis: TRUE BEP = {TRUE_BEP_MULTIPLE}x · Dist. Share {Math.round(DIST_SHARE * 100)}% · GST {Math.round(GST_RATE * 100)}%</p>
      </div>
      <div className="sg-search-row">
        <ActorSearch onSelect={setSelected} selected={selected} />
        <button className="sg-search-btn" onClick={() => onNavigate("risk")}>Run Risk Lab →</button>
      </div>
      <div className="sg-metrics-row">
        <div className="sg-card">
          <div className="sg-card-accent" style={{ background: TIER_COLORS[profile.tier] }} />
          <p className="sg-card-label">Tier Classification</p>
          <div className="sg-card-value" style={{ color: TIER_COLORS[profile.tier] }}>Tier {profile.tier}</div>
          <div className="sg-card-tier" style={{ background: `${TIER_COLORS[profile.tier]}18`, color: TIER_COLORS[profile.tier] }}>{profile.tier === 1 ? "Mega-Cap Anchor" : profile.tier === 2 ? "Mid-Cap Operator" : "Emerging Capital"}</div>
          <p className="sg-card-sub">Opening ₹{profile.openingCr}Cr</p>
        </div>
        <div className="sg-card">
          <div className="sg-card-accent" style={{ background: "linear-gradient(90deg,#7f00ff,#00c6ff)" }} />
          <p className="sg-card-label">Scale Index</p>
          <div className="sg-card-value sg-card-gold">{profile.scaleIndex}</div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 12 }}><div style={{ width: `${profile.scaleIndex}%`, height: 4, borderRadius: 2, background: "linear-gradient(90deg,#7f00ff,#00c6ff)", transition: "width 400ms ease" }} /></div>
          <p className="sg-card-sub">Base expected: ₹{profile.baseExpectedGross}Cr</p>
        </div>
        <div className="sg-card">
          <div className="sg-card-accent" style={{ background: RISK_COLORS[profile.riskBand] ?? "#8B95A8" }} />
          <p className="sg-card-label">Stability Index</p>
          <div className="sg-card-value" style={{ color: RISK_COLORS[profile.riskBand] ?? "#8B95A8" }}>{profile.stabilityIndex}</div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 12 }}><div style={{ width: `${profile.stabilityIndex}%`, height: 4, borderRadius: 2, background: RISK_COLORS[profile.riskBand] ?? "#8B95A8", transition: "width 400ms ease" }} /></div>
          <p className="sg-card-sub">100 × e^(−dvol×1.5)</p>
        </div>
        <div className="sg-card">
          <div className="sg-card-accent" style={{ background: RISK_COLORS[profile.riskBand] ?? "#8B95A8" }} />
          <p className="sg-card-label">Risk Band</p>
          <div className="sg-card-value" style={{ color: RISK_COLORS[profile.riskBand] ?? "#8B95A8" }}>{profile.riskBand}</div>
          <div className="sg-card-tier" style={{ background: `${RISK_COLORS[profile.riskBand] ?? "#8B95A8"}18`, color: RISK_COLORS[profile.riskBand] ?? "#8B95A8" }}>DVol {profile.dvolPct}% · {profile.lossFilmCount} loss@{TRUE_BEP_MULTIPLE}x</div>
          <p className="sg-card-sub">P&A rate: {Math.round(profile.pnaRate * 100)}% of budget</p>
        </div>
      </div>
      <div className="sg-chi-row">
        <div className="sg-chi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p className="sg-section-label" style={{ marginBottom: 4 }}>Capital Health Index</p>
              <div className="sg-chi-score" style={{ color: CHI_COLORS[profile.chiBand as keyof typeof CHI_COLORS] }}>{profile.chiScore}</div>
              <div className="sg-chi-band" style={{ background: `${CHI_COLORS[profile.chiBand as keyof typeof CHI_COLORS]}18`, color: CHI_COLORS[profile.chiBand as keyof typeof CHI_COLORS] }}>{profile.chiBand}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: "#8B95A8", letterSpacing: "0.12em" }}>FORMULA</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", marginTop: 4 }}>log1p(ROI) × RMF</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>DVol: {profile.dvolPct}%</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{profile.momentum}</p>
            </div>
          </div>
          <div className="sg-chi-factors">
            {chiFactors.map(f => (
              <div key={f.key} className="sg-factor">
                <p className="sg-factor-name">{f.key} — {f.label}</p>
                <p className="sg-factor-val">{(Math.min(f.val, 1) * 100).toFixed(0)}<span style={{ fontSize: 12, color: "#8B95A8" }}>%</span></p>
                <p style={{ fontSize: 10, color: "#8B95A8", marginTop: 2 }}>{f.desc}</p>
                <div className="sg-factor-bar-track"><div className="sg-factor-bar-fill" style={{ width: `${Math.min(f.val * 100, 100)}%`, background: CHI_COLORS[profile.chiBand as keyof typeof CHI_COLORS] }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="sg-vol-card">
          <p className="sg-section-label" style={{ marginBottom: 0 }}>Volatility Heatmap</p>
          <p style={{ fontSize: 12, color: "#8B95A8", marginBottom: 12, marginTop: 4 }}>Capital destruction vs TRUE BEP {TRUE_BEP_MULTIPLE}x · dynamic ceiling</p>
          <div className="sg-vol-bars">
            {heatmapActors.map(({ actor: a, p: ap }) => { const color = RISK_COLORS[ap.riskBand] ?? "#8B95A8"; const isSel = a.name === selected.name; return (
              <div key={a.name} className="sg-vol-row" style={{ opacity: isSel ? 1 : 0.65, cursor: "pointer" }} onClick={() => setSelected(a)}>
                <p className="sg-vol-name" style={{ color: isSel ? "#FFC700" : "#E8EAF0" }}>{a.name}</p>
                <div className="sg-vol-track"><div className="sg-vol-fill" style={{ width: `${ap.dvolPct}%`, background: color }} /></div>
                <p className="sg-vol-num" style={{ color }}>{ap.dvolPct}%</p>
              </div>
            ); })}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
        {[{ label: "Simulate Budget Risk", module: "risk", icon: "◈" }, { label: "Run Capital Stress Test", module: "stress", icon: "⚡" }, { label: "View Migration Analysis", module: "migration", icon: "↑" }].map(cta => (
          <button key={cta.module} onClick={() => onNavigate(cta.module)} style={{ flex: 1, padding: "14px 20px", borderRadius: 8, border: "1px solid rgba(255,199,0,0.25)", background: "rgba(255,199,0,0.06)", color: "#FFC700", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em", transition: "all 200ms" }} onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(255,199,0,0.12)"; }} onMouseLeave={e => { (e.target as HTMLElement).style.background = "rgba(255,199,0,0.06)"; }}>
            {cta.icon} {cta.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RISK LAB v4 — Budget + Stress unified, capital economics
═══════════════════════════════════════════════════════════════ */

function RiskLab({
  capitalContext,
  onContextChange,
}: {
  capitalContext: CapitalContext;
  onContextChange: (ctx: CapitalContext) => void;
}) {
  const [tab, setTab]     = useState<"budget" | "stress">("budget");
  const [selectedActor, setSelectedActor] = useState<Actor>(capitalContext.actor);
  const [budget, setBudget] = useState(capitalContext.budget);
  const [dist, setDist]   = useState("Theatrical");
  const [budgetResult, setBudgetResult] = useState<BudgetResult | null>(capitalContext.budgetResult);
  const [ecvResult, setEcvResult]       = useState<ECVResult | null>(null);
  const [scenarios, setScenarios] = useState({ openingDrop: false, negWOM: false, marketSlowdown: false });
  const [stressResult, setStressResult] = useState<StressResult | null>(capitalContext.stressResult);

  const budgetResultsRef = useRef<HTMLDivElement>(null);
  const stressResultsRef = useRef<HTMLDivElement>(null);

  const profile   = useMemo(() => computeProfile(selectedActor), [selectedActor]);

  // Sync context up whenever actor / budget / results change
  useEffect(() => {
    onContextChange({ actor: selectedActor, budget, budgetResult, stressResult });
  }, [selectedActor, budget, budgetResult, stressResult]); // eslint-disable-line

  const runBudget = () => {
    const r   = computeBudgetRisk(profile, budget, dist);
    const ecv = computeECV(profile, budget);
    setBudgetResult(r);
    setEcvResult(ecv);
    // Scroll to results on mobile — smooth upward reveal
    setTimeout(() => {
      budgetResultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };
  const runStress = () => {
    // STEP 1: Pass Budget Analyzer's exact breakEvenProb for neutral pass-through
    const r = computeStress(profile, budget, scenarios, budgetResult?.breakEvenProb);
    setStressResult(r);
    // Scroll to results on mobile — smooth reveal
    setTimeout(() => {
      stressResultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };
  const toggle    = (k: keyof typeof scenarios) => { setScenarios(s => ({ ...s, [k]: !s[k] })); setStressResult(null); };

  // Live strain preview — TWO distinct strain concepts (documented per audit)
  const liveRev        = useMemo(() => computeRevenueBreakdown(profile, budget), [profile, budget]);
  // v5 Recovery Strain: how far projected gross is from full capital recovery threshold
  // fullRecoveryGross = totalCapital / DIST_SHARE  (not 1.45x budget)
  const liveStrain     = liveRev.fullRecoveryGross / Math.max(liveRev.projectedGross, 1);
  // Ceiling Saturation Strain: budget vs base expected gross — drives marginal decay
  const ceilStrain     = budget / Math.max(profile.baseExpectedGross, 1);
  const ceilStrainColor = ceilStrain < 0.3 ? "#22e5a5" : ceilStrain < 0.7 ? "#ffb347" : ceilStrain < 1.0 ? "#ffb347" : "#ff4d5a";
  const strainColor    = liveStrain < 0.5 ? "#22e5a5" : liveStrain < 0.9 ? "#ffb347" : liveStrain < 1.3 ? "#ffb347" : "#ff4d5a";
  const strainLabel    = liveStrain < 0.5 ? "Comfortable" : liveStrain < 0.9 ? "Moderate" : liveStrain < 1.3 ? "High Strain" : "Overextended";

  return (
    <div className="fade-in">
      <p className="sg-section-label">Risk Lab</p>
      <h2 className="sg-section-title">Capital Risk Modeling</h2>
      <p className="sg-section-sub">Budget and stress unified. TRUE BEP = {TRUE_BEP_MULTIPLE}x gross · Dist. Share {Math.round(DIST_SHARE * 100)}% · GST {Math.round(GST_RATE * 100)}% · P&A rate by tier</p>

      <div className="sg-tabs">
        {[["budget", "Budget Analyzer"], ["stress", "Stress Test"]].map(([k, l]) => (
          <button key={k} className={`sg-tab ${tab === k ? "sg-tab-active" : ""}`} onClick={() => setTab(k as "budget" | "stress")}>{l}</button>
        ))}
      </div>

      {tab === "budget" && (
        <div className="sg-risklab">
          <div className="sg-inputs-card">
            <p style={{ fontSize: 13, fontWeight: 700, color: "#E8EAF0", marginBottom: 20, letterSpacing: "0.05em" }}>MODELING INPUTS</p>
            <div className="sg-field">
              <p className="sg-field-label">Actor</p>
              <ActorSearch onSelect={a => { setSelectedActor(a); setBudgetResult(null); setStressResult(null); }} selected={selectedActor} />
            </div>
            <div className="sg-field">
              <p className="sg-field-label">Production Budget</p>
              <div className="sg-slider-wrap">
                <p className="sg-slider-val">₹{budget}Cr</p>
                <input className="sg-slider" type="range" min={10} max={600} step={5} value={budget} onChange={e => { setBudget(Number(e.target.value)); setBudgetResult(null); setStressResult(null); }} />
                <div className="sg-slider-labels"><span>₹10Cr</span><span style={{ color: strainColor }}>{strainLabel}</span><span>₹600Cr</span></div>
              </div>
            </div>
            {/* [DIRECTIVE 7] Live strain display */}
            {/* Fix 3 — dual strain display: BEP survival strain + ceiling saturation strain */}
            <div className="sg-strain-indicator">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#8B95A8", letterSpacing: "0.08em" }}>CAPITAL RECOVERY STRAIN · ₹{liveRev.fullRecoveryGross}Cr required ÷ ₹{liveRev.projectedGross}Cr projected</span>
                <span style={{ fontSize: 11, color: strainColor, fontWeight: 700 }}>{(liveStrain * 100).toFixed(0)}%</span>
              </div>
              <div className="sg-strain-track"><div className="sg-strain-fill" style={{ width: `${Math.min(liveStrain * 100, 100)}%`, background: strainColor }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em" }}>CEILING SATURATION STRAIN · ₹{budget}Cr ÷ ₹{profile.baseExpectedGross}Cr base (drives marginal decay, secondary)</span>
                <span style={{ fontSize: 10, color: ceilStrainColor, fontWeight: 700 }}>{(ceilStrain * 100).toFixed(0)}%</span>
              </div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: 3, width: `${Math.min(ceilStrain * 100, 100)}%`, background: ceilStrainColor, borderRadius: 2, transition: "width 400ms ease" }} />
              </div>
            </div>
            <div className="sg-field" style={{ marginBottom: 24, marginTop: 20 }}>
              <p className="sg-field-label">Release Distribution</p>
              <div className="sg-dist-btns">
                {["Theatrical", "Pan-India", "Global"].map(d => (
                  <button key={d} className={`sg-dist-btn ${dist === d ? "sg-dist-active" : ""}`} onClick={() => { setDist(d); setBudgetResult(null); }}>{d}</button>
                ))}
              </div>
            </div>
            <button className="sg-run-btn" onClick={runBudget}>Run Budget Analysis →</button>
            <p style={{ fontSize: 11, color: "#8B95A8", marginTop: 12, lineHeight: 1.6 }}>
              v5: Survival = P(ProducerShare ≥ TotalCapital). Strain = fullRecoveryGross ÷ projectedGross where fullRecoveryGross = totalCapital ÷ {Math.round(DIST_SHARE*100)}% = {TRUE_BEP_MULTIPLE}x theatrical BEP is shown separately as industry benchmark only. Full recovery requires ~{liveRev.fullRecoveryROI?.toFixed(2) ?? "3.1"}x gross on budget.
            </p>
          </div>

          <div className="sg-outputs-card" ref={budgetResultsRef}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#E8EAF0", marginBottom: 16, letterSpacing: "0.05em" }}>CAPITAL ANALYSIS OUTPUT</p>
            {!budgetResult ? (
              <div className="sg-empty-state"><p className="sg-empty-icon">◈</p><p className="sg-empty-text">Configure inputs and run analysis.</p></div>
            ) : (
              <div className="fade-in">

                {/* STEP 3B: Expected Capital Profit — PRIMARY metric (probability-weighted) */}
                {ecvResult && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18, padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
                    <div>
                      <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,199,0,0.55)", fontWeight: 700, marginBottom: 4 }}>Expected Capital Profit</p>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Probability-weighted · 5 scenarios</p>
                      <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", color: ecvResult.expectedProfit >= 0 ? "#22e5a5" : "#ff4d5a" }}>
                        {ecvResult.expectedProfit >= 0 ? "+" : ""}₹{ecvResult.expectedProfit}Cr
                      </p>
                      <p style={{ fontSize: 11, color: "rgba(139,149,168,0.75)", marginTop: 3 }}>Expected ROI: {ecvResult.expectedROI.toFixed(2)}x capital</p>
                    </div>
                    <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 14 }}>
                      <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,179,71,0.7)", fontWeight: 700, marginBottom: 4 }}>Capital Loss Probability</p>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Σ prob where share &lt; capital</p>
                      <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", color: ecvResult.probabilityOfLoss <= 0.2 ? "#22e5a5" : ecvResult.probabilityOfLoss <= 0.4 ? "#ffb347" : "#ff4d5a" }}>
                        {Math.round(ecvResult.probabilityOfLoss * 100)}%
                      </p>
                      <p style={{ fontSize: 11, color: "rgba(139,149,168,0.75)", marginTop: 3 }}>VaR 25%: {ecvResult.var25 >= 0 ? "+" : ""}₹{ecvResult.var25}Cr</p>
                    </div>
                  </div>
                )}

                {/* CAPITAL DEPLOYMENT — v5 full capital recovery first */}
                <div className="sg-revenue-chain" style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,199,0,0.6)", fontWeight: 700, marginBottom: 10 }}>CAPITAL DEPLOYMENT</p>
                  <div className="sg-rev-row"><span className="sg-rev-label">Total Capital Deployed (budget + P&A)</span><span className="sg-rev-val" style={{ color: "#FFC700" }}>₹{budgetResult.revenue.totalCapital}Cr</span></div>
                  <div className="sg-rev-row"><span className="sg-rev-label">Projected Producer Share ({Math.round(DIST_SHARE * 100)}% of gross)</span><span className="sg-rev-val" style={{ color: budgetResult.revenue.fullCapitalRecovered ? "#22e5a5" : "#ff4d5a" }}>₹{budgetResult.revenue.producerShare}Cr</span></div>
                  {/* ROW 1: Total Capital Deficit / Surplus — DOMINANT (v5 decision metric) */}
                  {/* D: Subtle gradient + left accent — not heavy block */}
                  <div style={{ marginTop: 6, padding: "10px 14px", borderRadius: 10, background: budgetResult.revenue.fullCapitalRecovered ? "linear-gradient(90deg,rgba(34,229,165,0.12),rgba(34,229,165,0.04))" : "linear-gradient(90deg,rgba(255,77,90,0.12),rgba(255,77,90,0.04))", borderLeft: `3px solid ${budgetResult.revenue.fullCapitalRecovered ? "#22e5a5" : "#ff4d5a"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: budgetResult.revenue.fullCapitalRecovered ? "#22e5a5" : "#ff4d5a" }}>
                        {budgetResult.revenue.fullCapitalRecovered ? "✓ Projected Capital Surplus (Ceiling Scenario)" : "✗ Projected Capital Deficit (Ceiling Scenario)"}
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 900, color: budgetResult.revenue.fullCapitalRecovered ? "#22e5a5" : "#ff4d5a" }}>
                        {budgetResult.revenue.fullCapitalRecovered ? "+" : "-"}₹{budgetResult.revenue.fullCapitalRecovered ? budgetResult.revenue.capitalSurplus : budgetResult.revenue.capitalDeficit}Cr
                      </span>
                    </div>
                  </div>
                  <div className="sg-rev-row"><span className="sg-rev-label" style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Capital Recovery Ratio (share ÷ capital, needs ≥1.0x)</span><span style={{ fontSize: 12, fontWeight: 800, color: budgetResult.revenue.capitalRecoveryRatio >= 1 ? "#22e5a5" : budgetResult.revenue.capitalRecoveryRatio >= 0.7 ? "#ffb347" : "#ff4d5a" }}>{budgetResult.revenue.capitalRecoveryRatio.toFixed(2)}x</span></div>
                  {/* ROW 2: Theatrical BEP — informational only */}
                  <div className="sg-rev-row" style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Theatrical BEP @ {TRUE_BEP_MULTIPLE}x · ₹{budgetResult.revenue.breakEvenGross}Cr (informational)</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: budgetResult.revenue.theatricalBEPGap >= 0 ? "rgba(34,229,165,0.6)" : "rgba(255,77,90,0.6)" }}>
                      {budgetResult.revenue.theatricalBEPGap >= 0 ? "+" : ""}₹{budgetResult.revenue.theatricalBEPGap}Cr
                    </span>
                  </div>
                  <div className="sg-rev-row"><span className="sg-rev-label" style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Full recovery requires ₹{budgetResult.revenue.fullRecoveryGross}Cr gross ({budgetResult.revenue.fullRecoveryROI.toFixed(2)}x budget)</span><span style={{ fontSize: 10, color: "rgba(255,199,0,0.5)" }}>threshold</span></div>
                </div>

                {/* SURVIVAL PROBABILITY — validates capital story */}
                <div style={{ marginBottom: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 16 }}>
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,199,0,0.55)", fontWeight: 700, marginBottom: 3 }}>CAPITAL RECOVERY INTELLIGENCE</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 18 }}>Volatility adjusted · vs {liveRev.fullRecoveryROI?.toFixed(2) ?? "3.13"}x recovery threshold</p>
                    {/* F: Ring Metric Trio */}
                    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-start" }}>
                      <RingMetric
                        value={budgetResult.breakEvenProb} max={100}
                        label={`${budgetResult.breakEvenProb}%`}
                        sublabel="Recovery Probability"
                        color={budgetResult.breakEvenProb >= 75 ? "#22e5a5" : budgetResult.breakEvenProb >= 55 ? "#ffb347" : "#ff4d5a"}
                        size={86}
                      />
                      <RingMetric
                        value={budgetResult.revenue.capitalRecoveryRatio} max={1.5}
                        label={`${budgetResult.revenue.capitalRecoveryRatio.toFixed(2)}x`}
                        sublabel="Capital Recovery"
                        color={budgetResult.revenue.capitalRecoveryRatio >= 1 ? "#22e5a5" : budgetResult.revenue.capitalRecoveryRatio >= 0.7 ? "#ffb347" : "#ff4d5a"}
                        size={86}
                      />
                      <RingMetric
                        value={budgetResult.revenue.economicROI} max={1.5}
                        label={`${budgetResult.revenue.economicROI.toFixed(2)}x`}
                        sublabel="Economic ROI"
                        color={budgetResult.revenue.economicROI >= 1 ? "#22e5a5" : budgetResult.revenue.economicROI >= 0.7 ? "#ffb347" : "#ff4d5a"}
                        size={86}
                      />
                    </div>
                    <div style={{ marginTop: 16, textAlign: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 5, background: `rgba(${budgetResult.riskClass === "Controlled" ? "34,229,165" : budgetResult.riskClass === "Moderate" ? "255,179,71" : "255,77,90"},0.10)`, color: budgetResult.riskClass === "Controlled" ? "#22e5a5" : budgetResult.riskClass === "Moderate" ? "#ffb347" : "#ff4d5a", letterSpacing: "0.1em", textTransform: "uppercase" }}>{budgetResult.riskClass} Risk</span>
                      <span style={{ fontSize: 11, color: "rgba(139,149,168,0.7)", marginLeft: 10 }}>ROI band: {budgetResult.grossROILow}x–{budgetResult.grossROIHigh}x · Econ: {budgetResult.economicROILow}x–{budgetResult.economicROIHigh}x</span>
                    </div>
                  </div>
                </div>

                {/* DOWNSIDE EXPOSURE — three components explicit */}
                <div style={{ marginBottom: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                    <div>
                      <p className="sg-card-label" style={{ marginBottom: 4 }}>Downside Exposure</p>
                      <span style={{ fontSize: 28, fontWeight: 900, color: "#ff4d5a" }}>₹{budgetResult.downsideExposure}Cr</span>
                    </div>
                    <span style={{ fontSize: 11, color: "#8B95A8" }}>of ₹{budgetResult.revenue.totalCapital}Cr at risk</span>
                  </div>
                  <div className="sg-exposure-breakdown">
                    <div className="sg-exp-box"><p className="sg-exp-label">Miss Prob</p><p className="sg-exp-val">{(budgetResult.missProbability * 100).toFixed(0)}%</p></div>
                    <div className="sg-exp-box"><p className="sg-exp-label">Severity</p><p className="sg-exp-val">{(budgetResult.severityFactor * 100).toFixed(0)}%</p></div>
                    <div className="sg-exp-box"><p className="sg-exp-label">Capital</p><p className="sg-exp-val">₹{budgetResult.revenue.totalCapital}Cr</p></div>
                  </div>
                  <p style={{ fontSize: 10, color: "#8B95A8", marginTop: 8, lineHeight: 1.5 }}>
                    Capital × MissProbability × SeverityFactor. Severity = max(1.45x − recentROI, 0) ÷ 1.45x — depth of capital destruction below TRUE BEP. Zero if recent ROI ≥ 1.45x. Recovery floor (25% of miss × capital) applies as minimum — OTT/satellite/music rights baseline.
                  </p>
                </div>

                {/* FULL REVENUE CHAIN — detail layer */}
                <RevenueChainPanel rev={budgetResult.revenue} budget={budget} />
              </div>
            )}
          </div>

          {/* ── E: RISK-ADJUSTED CAPITAL FORECAST (ECV ENGINE) ── */}
          {ecvResult && (
            <div className="sg-outputs-card" style={{ marginTop: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#E8EAF0", marginBottom: 4, letterSpacing: "0.05em" }}>RISK-ADJUSTED CAPITAL FORECAST</p>
              <p style={{ fontSize: 10, color: "#8B95A8", marginBottom: 16 }}>Expected value across 5 scenarios · Base 40% · Opening 20% · WOM 20% · Slowdown 10% · Combined 10%</p>

              {/* Top 4 metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  {
                    label: "Expected Profit",
                    val: `${ecvResult.expectedProfit >= 0 ? "+" : ""}₹${ecvResult.expectedProfit}Cr`,
                    color: ecvResult.expectedProfit >= 0 ? "#22e5a5" : "#ff4d5a",
                    sub: "Σ(prob × profit) across scenarios"
                  },
                  {
                    label: "Expected Capital ROI",
                    val: `${ecvResult.expectedROI.toFixed(2)}x`,
                    color: ecvResult.expectedROI >= 1.0 ? "#22e5a5" : ecvResult.expectedROI >= 0.7 ? "#ffb347" : "#ff4d5a",
                    sub: "Σ(prob × share/capital)"
                  },
                  {
                    label: "Probability of Capital Loss",
                    val: `${Math.round(ecvResult.probabilityOfLoss * 100)}%`,
                    color: ecvResult.probabilityOfLoss <= 0.2 ? "#22e5a5" : ecvResult.probabilityOfLoss <= 0.4 ? "#ffb347" : "#ff4d5a",
                    sub: "Σ prob where share < capital"
                  },
                  {
                    label: "Downside Risk (VaR 25%)",
                    val: `${ecvResult.var25 >= 0 ? "+" : ""}₹${ecvResult.var25}Cr`,
                    color: ecvResult.var25 >= 0 ? "#22e5a5" : "#ff4d5a",
                    sub: "Worst outcome in bottom 25%"
                  },
                ].map(m => (
                  <div key={m.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px 14px" }}>
                    <p style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B95A8", marginBottom: 6 }}>{m.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 900, color: m.color, marginBottom: 3 }}>{m.val}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{m.sub}</p>
                  </div>
                ))}
              </div>

              {/* Scenario breakdown table */}
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Scenario", "Prob", "Gross", "Share", "Profit"].map(h => (
                    <span key={h} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>{h}</span>
                  ))}
                </div>
                {ecvResult.scenarios.map((s, i) => (
                  <div key={s.name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "8px 12px", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span style={{ fontSize: 11, color: s.name === "Base" ? "#FFC700" : "#E8EAF0" }}>{s.name}</span>
                    <span style={{ fontSize: 11, color: "#8B95A8" }}>{Math.round(s.prob * 100)}%</span>
                    <span style={{ fontSize: 11, color: "#E8EAF0" }}>₹{s.stressedGross}Cr</span>
                    <span style={{ fontSize: 11, color: s.isLoss ? "#ff4d5a" : "#22e5a5" }}>₹{s.share}Cr</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.isLoss ? "#ff4d5a" : "#22e5a5" }}>
                      {s.profit >= 0 ? "+" : ""}₹{s.profit}Cr
                    </span>
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "8px 12px", borderTop: "1px solid rgba(255,199,0,0.2)", background: "rgba(255,199,0,0.03)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#FFC700" }}>Expected Value</span>
                  <span style={{ fontSize: 11, color: "#FFC700" }}>100%</span>
                  <span style={{ fontSize: 11, color: "#8B95A8" }}>—</span>
                  <span style={{ fontSize: 11, color: "#8B95A8" }}>—</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: ecvResult.expectedProfit >= 0 ? "#22e5a5" : "#ff4d5a" }}>
                    {ecvResult.expectedProfit >= 0 ? "+" : ""}₹{ecvResult.expectedProfit}Cr
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "stress" && (
        <div className="sg-stress-grid">
          <div className="sg-inputs-card">
            {/* Budget context banner */}
            <div style={{ background: "rgba(255,199,0,0.06)", border: "1px solid rgba(255,199,0,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,199,0,0.6)", marginBottom: 2 }}>Active Budget</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: "#FFC700" }}>₹{budget}Cr + ₹{liveRev.pnaCost}Cr P&A = ₹{liveRev.totalCapital}Cr total</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, color: "#8B95A8" }}>TRUE BEP</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#ffb347" }}>{TRUE_BEP_MULTIPLE}x gross</p>
              </div>
            </div>

            <p style={{ fontSize: 13, fontWeight: 700, color: "#E8EAF0", marginBottom: 8, letterSpacing: "0.05em" }}>ACTOR</p>
            <div style={{ marginBottom: 20 }}><ActorSearch onSelect={a => { setSelectedActor(a); setStressResult(null); }} selected={selectedActor} /></div>

            <p style={{ fontSize: 13, fontWeight: 700, color: "#E8EAF0", marginBottom: 12, letterSpacing: "0.05em" }}>STRESS SCENARIOS</p>
            <div className="sg-toggle-row">
              {([["openingDrop", "−20% Opening Drop", "×(1−0.2×elasticity) gross"], ["negWOM", "Negative Word of Mouth", "×0.78 projected gross"], ["marketSlowdown", "Market Slowdown", "×0.88 projected gross"]] as const).map(([k, label, impact]) => (
                <div key={k} className={`sg-toggle ${scenarios[k] ? "sg-tog-on" : ""}`} onClick={() => toggle(k)}>
                  <div className="sg-toggle-box">{scenarios[k] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#0B0F17" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                  <span className="sg-toggle-label">{label}</span>
                  <span className="sg-toggle-impact">{impact}</span>
                </div>
              ))}
            </div>
            <button className="sg-run-btn" onClick={runStress}>Run Stress Simulation →</button>
            <p style={{ fontSize: 11, color: "#8B95A8", marginTop: 10, lineHeight: 1.6 }}>Loss = ₹{budget}Cr × max({TRUE_BEP_MULTIPLE}x − stressedROI, 0). Survival tied to same {TRUE_BEP_MULTIPLE}x gate.</p>
          </div>

          <div className="sg-outputs-card" ref={stressResultsRef}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#E8EAF0", marginBottom: 16, letterSpacing: "0.05em" }}>STRESS OUTPUT · ₹{budget}Cr @ TRUE BEP {TRUE_BEP_MULTIPLE}x</p>
            {!stressResult ? (
              <div className="sg-empty-state"><p className="sg-empty-icon">⚡</p><p className="sg-empty-text">Select scenarios and run simulation.</p></div>
            ) : (
              <div className="fade-in">

                {/* CAPITAL FLOW FIRST — per audit directive */}
                <div className="sg-revenue-chain" style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,199,0,0.6)", fontWeight: 700, marginBottom: 10 }}>STRESSED CAPITAL FLOW</p>
                  <div className="sg-rev-row"><span className="sg-rev-label">Total Capital Deployed (budget + P&A)</span><span className="sg-rev-val" style={{ color: "#FFC700" }}>₹{liveRev.totalCapital}Cr</span></div>
                  <div className="sg-rev-row"><span className="sg-rev-label">Stressed Gross (budget × {stressResult.stressedGrossROI}x)</span><span className="sg-rev-val">₹{stressResult.stressedGross}Cr</span></div>
                  <div className="sg-rev-row"><span className="sg-rev-label">Producer Share ({Math.round(DIST_SHARE * 100)}% of stressed gross)</span><span className="sg-rev-val" style={{ color: stressResult.stressedShare >= liveRev.totalCapital ? "#22e5a5" : "#ff4d5a" }}>₹{stressResult.stressedShare}Cr</span></div>
                  {/* ROW 1: Total Capital Deficit — DOMINANT (v5 decision metric) */}
                  {/* D: Subtle gradient treatment for stress capital outcome */}
                  <div style={{ margin: "8px 0", padding: "12px 14px", borderRadius: 10, background: stressResult.fullCapitalRecovered ? "linear-gradient(90deg,rgba(34,229,165,0.12),rgba(34,229,165,0.04))" : "linear-gradient(90deg,rgba(255,77,90,0.12),rgba(255,77,90,0.04))", borderLeft: `3px solid ${stressResult.fullCapitalRecovered ? "#22e5a5" : "#ff4d5a"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: stressResult.fullCapitalRecovered ? "#22e5a5" : "#ff4d5a" }}>
                        {stressResult.fullCapitalRecovered ? "✓ Projected Capital Surplus (Ceiling Scenario)" : "✗ Projected Capital Deficit (Ceiling Scenario)"}
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 900, color: stressResult.fullCapitalRecovered ? "#22e5a5" : "#ff4d5a" }}>
                        {stressResult.fullCapitalRecovered ? "+" : "-"}₹{stressResult.fullCapitalRecovered ? stressResult.capitalSurplus : stressResult.capitalDeficit}Cr
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Capital Recovery Ratio (needs ≥1.0x)</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: stressResult.capitalRecoveryRatio >= 1 ? "#22e5a5" : stressResult.capitalRecoveryRatio >= 0.7 ? "#ffb347" : "#ff4d5a" }}>{stressResult.capitalRecoveryRatio.toFixed(2)}x</span>
                    </div>
                  </div>
                  {/* ROW 2: Theatrical BEP gap — informational only */}
                  <div className="sg-rev-row" style={{ paddingTop: 4 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Theatrical BEP @ {TRUE_BEP_MULTIPLE}x (informational)</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: stressResult.theatricalBEPGap >= 0 ? "rgba(34,229,165,0.6)" : "rgba(255,77,90,0.6)" }}>
                      {stressResult.theatricalBEPGap >= 0 ? "+" : ""}₹{stressResult.theatricalBEPGap}Cr
                    </span>
                  </div>
                </div>

                {/* DRAWDOWN BAR */}
                <div className="sg-drawdown-bar" style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "#8B95A8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Capital Drawdown</span>
                    <span style={{ fontSize: 11, color: stressResult.capitalDeficit > 0 ? "#ff4d5a" : "#22e5a5", fontWeight: 700 }}>{Math.round((stressResult.capitalDeficit / Math.max(stressResult.totalCapital, 1)) * 100)}% of total capital</span>
                  </div>
                  <div className="sg-drawdown-track"><div className="sg-drawdown-fill" style={{ width: `${Math.min((stressResult.capitalDeficit / Math.max(stressResult.totalCapital, 1)) * 100, 100)}%`, background: "linear-gradient(90deg,#ffb347,#ff4d5a)" }} /></div>
                </div>

                {/* CAPITAL SURVIVAL — validates capital story */}
                <div className="sg-surv-gauge">
                  <div className="sg-surv-num" style={{ color: stressResult.survivalProb >= 70 ? "#22e5a5" : stressResult.survivalProb >= 45 ? "#ffb347" : "#ff4d5a" }}>
                    {stressResult.survivalProb}%
                  </div>
                  <p className="sg-surv-label">Probability of Sustaining Full Capital Recovery (Volatility Adjusted)</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Based on historical volatility relative to {r2((1 + profile.pnaRate) / DIST_SHARE).toFixed(2)}x recovery threshold.</p>
                  <div style={{ marginTop: 8, padding: "4px 12px", borderRadius: 5, background: stressResult.fullCapitalRecovered ? "rgba(34,229,165,0.12)" : "rgba(255,77,90,0.12)", color: stressResult.fullCapitalRecovered ? "#22e5a5" : "#ff4d5a", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>
                    {stressResult.fullCapitalRecovered
                      ? `✓ Share ₹${stressResult.stressedShare}Cr ≥ Capital ₹${stressResult.totalCapital}Cr — Full recovery`
                      : `✗ Share ₹${stressResult.stressedShare}Cr < Capital ₹${stressResult.totalCapital}Cr — ₹${stressResult.capitalDeficit}Cr deficit`}
                  </div>
                </div>

                {/* OPENING + ECON ROI */}
                <div className="sg-output-row" style={{ marginTop: 12 }}>
                  <div className="sg-output-metric">
                    <p className="sg-card-label">Stressed Opening</p>
                    <div className="sg-output-val" style={{ fontSize: 22 }}>₹{stressResult.stressedOpening}Cr</div>
                    <p className="sg-output-sub">Base: ₹{profile.openingCr}Cr</p>
                    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, marginTop: 6, display: "inline-block", background: stressResult.tierHeld ? "rgba(34,229,165,0.12)" : "rgba(255,77,90,0.12)", color: stressResult.tierHeld ? "#22e5a5" : "#ff4d5a" }}>{stressResult.tierHeld ? `Tier ${profile.tier} held` : "Tier at risk"}</span>
                  </div>
                  <div className="sg-output-metric">
                    <p className="sg-card-label">Capital Recovery Ratio</p>
                    <div className="sg-output-val" style={{ fontSize: 22, color: stressResult.capitalRecoveryRatio >= 1 ? "#22e5a5" : stressResult.capitalRecoveryRatio >= 0.7 ? "#ffb347" : "#ff4d5a" }}>{stressResult.capitalRecoveryRatio.toFixed(2)}x</div>
                    <p className="sg-output-sub">Econ ROI: {stressResult.stressedEconomicROI}x · Gross: {stressResult.stressedGrossROI}x</p>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "#8B95A8", marginTop: 12, lineHeight: 1.6 }}>
                  {stressResult.fullCapitalRecovered
                    ? `Full capital recovery under stress. Share (₹${stressResult.stressedShare}Cr) exceeds deployed capital (₹${stressResult.totalCapital}Cr). Recovery ratio: ${stressResult.capitalRecoveryRatio.toFixed(2)}x.`
                    : `Capital destruction under stress. ₹${stressResult.capitalDeficit}Cr deficit — share (₹${stressResult.stressedShare}Cr) below deployed capital (₹${stressResult.totalCapital}Cr). Full capital recovery requires ${((stressResult.totalCapital / DIST_SHARE) / Math.max(budget, 1)).toFixed(2)}x gross ROI.`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MIGRATION MODULE
═══════════════════════════════════════════════════════════════ */

function MigrationModule({ capitalContext }: { capitalContext: CapitalContext }) {
  const [selected, setSelected] = useState<Actor>(capitalContext.actor);
  const profile   = useMemo(() => computeProfile(selected), [selected]);
  const migration = useMemo(
    () => computeMigration(profile, selected, capitalContext),
    [profile, selected, capitalContext] // eslint-disable-line
  );

  const isDegrade  = migration.direction === "degrade";
  const scoreColor = isDegrade
    ? (migration.score >= 70 ? "#ff4d5a" : migration.score >= 50 ? "#ffb347" : migration.score >= 30 ? "#ffb347" : "#22e5a5")
    : (migration.score >= 70 ? "#22e5a5" : migration.score >= 50 ? "#ffb347" : "#ff4d5a");

  const hasLinkedContext = capitalContext.budgetResult !== null || capitalContext.stressResult !== null;

  return (
    <div className="fade-in">
      <p className="sg-section-label">Capital Mobility Engine</p>
      <h2 className="sg-section-title">Tier Migration Analysis</h2>
      <p className="sg-section-sub">MS = CM + SI + CS + CDP · Film-derived, no lookup tables · Capital-linked via Risk Lab</p>

      {/* Capital context banner — shows when Risk Lab has been used */}
      {hasLinkedContext && (
        <div style={{ background: "rgba(255,199,0,0.05)", border: "1px solid rgba(255,199,0,0.2)", borderRadius: 8, padding: "10px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,199,0,0.6)", marginBottom: 2 }}>Risk Lab Linked · ₹{capitalContext.budget}Cr · {capitalContext.actor.name}</p>
            <p style={{ fontSize: 12, color: "#E8EAF0" }}>Capital penalty applied: <span style={{ color: migration.capitalPenaltyApplied < 0 ? "#ff4d5a" : "#22e5a5", fontWeight: 700 }}>{migration.capitalPenaltyApplied}</span> pts to MS</p>
          </div>
          {capitalContext.budgetResult && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: "#8B95A8" }}>BEP Prob · Econ ROI</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: capitalContext.budgetResult.breakEvenProb >= 65 ? "#22e5a5" : "#ff4d5a" }}>
                {capitalContext.budgetResult.breakEvenProb}% · {capitalContext.budgetResult.revenue.economicROI.toFixed(2)}x
              </p>
            </div>
          )}
        </div>
      )}

      <div className="sg-mig-grid">
        {/* LEFT — Ladder + Actor intel */}
        <div>
          <div className="sg-inputs-card" style={{ marginBottom: 16 }}>
            <p className="sg-field-label" style={{ marginBottom: 10 }}>Actor</p>
            <ActorSearch onSelect={setSelected} selected={selected} />
            <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(255,199,0,0.04)", borderRadius: 6, borderLeft: `3px solid ${TIER_COLORS[profile.tier]}` }}>
              <p style={{ fontSize: 11, color: "#8B95A8" }}>{profile.tier === 1 ? "T1: degradation risk modeled." : profile.tier === 2 ? "T2: upgrade + downgrade both live." : "T3: upgrade probability toward T2."}</p>
            </div>
          </div>

          <div className="sg-chi-card">
            <p className="sg-section-label">Tier Ladder</p>
            <div className="sg-tier-ladder">
              {[3, 2, 1].map((t, i) => {
                const isCurrent = profile.tier === t;
                const isTarget  = migration.targetTier === t;
                const nc = isCurrent ? TIER_COLORS[t] : isTarget ? (isDegrade ? "#ff4d5a" : TIER_COLORS[t]) : "rgba(255,255,255,0.1)";
                return (
                  <div key={t} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : undefined }}>
                    <div className="sg-tier-node">
                      <div className="sg-tier-circle" style={{ borderColor: isCurrent ? TIER_COLORS[t] : `${nc}80`, background: isCurrent ? `${TIER_COLORS[t]}18` : `${nc}10`, color: isCurrent ? TIER_COLORS[t] : `${nc}cc` }}>T{t}</div>
                      <p className="sg-tier-circle-label" style={{ color: isCurrent ? TIER_COLORS[t] : "rgba(255,255,255,0.3)" }}>{t === 1 ? "₹60Cr+" : t === 2 ? "₹30–60Cr" : "<₹30Cr"}</p>
                    </div>
                    {i < 2 && <div className="sg-tier-arrow"><div className="sg-tier-line" style={{ background: "rgba(255,199,0,0.3)" }} /><div style={{ width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: "6px solid rgba(255,199,0,0.4)" }} /></div>}
                  </div>
                );
              })}
            </div>

            {/* Gap bar */}
            <div className="sg-gap-bar">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#8B95A8", textTransform: "uppercase", letterSpacing: "0.1em" }}>{isDegrade ? "T1 Buffer above floor" : `Gap to Tier ${migration.targetTier}`}</span>
                <span style={{ fontSize: 11, color: "#FFC700", fontWeight: 700 }}>₹{migration.gap}Cr</span>
              </div>
              <div className="sg-gap-track"><div className="sg-gap-fill" style={{ width: `${Math.min(((migration.targetThreshold - migration.gap) / migration.targetThreshold) * 100, 100)}%` }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "#8B95A8" }}>Current avg: ₹{migration.rollingAvgGross}Cr</span>
                <span style={{ fontSize: 11, color: "#8B95A8" }}>{isDegrade ? `Floor: ₹${migration.targetThreshold}Cr` : `Target: ₹${migration.targetThreshold}Cr`}</span>
              </div>
            </div>

            {/* Capital condition tiles */}
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "BEP Survival Rate",     val: `${(migration.bepSurvivalRate * 100).toFixed(0)}%`,           color: migration.bepSurvivalRate >= 0.5 ? "#22e5a5" : migration.bepSurvivalRate >= 0.25 ? "#ffb347" : "#ff4d5a" },
                { label: "Consec. BEP Fails",     val: `${migration.consecutiveFails}`,                              color: migration.consecutiveFails >= 2 ? "#ff4d5a" : migration.consecutiveFails === 1 ? "#ffb347" : "#22e5a5" },
                { label: "Severe Destruction",    val: migration.hasSeveDestruction ? "Yes (<0.8x)" : "None",        color: migration.hasSeveDestruction ? "#ff4d5a" : "#22e5a5" },
                { label: "MS Score",              val: `${migration.cmPts + migration.siPts + migration.csPts + migration.cdpPts}`,  color: "#FFC700" },
              ].map(m => (
                <div key={m.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B95A8", marginBottom: 4 }}>{m.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: m.color }}>{m.val}</p>
                </div>
              ))}
            </div>

            <TierBufferSparkline actor={selected} profile={profile} />
          </div>
        </div>

        {/* RIGHT — Score + Conditions + Prescriptive */}
        <div>
          <div className="sg-chi-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* MIGRATION SCORE */}
            <div>
              <p className="sg-section-label">{isDegrade ? "Degradation Risk" : "Upgrade Probability"}</p>
              <div className="sg-mig-score-wrap">
                <div><span className="sg-mig-score" style={{ color: scoreColor }}>{migration.score}</span><span className="sg-mig-score-denom"> / 100</span></div>
                <p className="sg-mig-label">Tier {profile.tier} → Tier {migration.targetTier}{isDegrade ? " (Risk)" : " (Probability)"}</p>
                <p className="sg-mig-verdict">{migration.verdict}</p>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: 8, width: `${migration.score}%`, background: scoreColor, borderRadius: 4, transition: "width 500ms ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: isDegrade ? "#22e5a5" : "#ff4d5a" }}>{isDegrade ? "LOW RISK" : "LOW"}</span>
                  <span style={{ fontSize: 10, color: "#ffb347" }}>MODERATE</span>
                  <span style={{ fontSize: 10, color: isDegrade ? "#ff4d5a" : "#22e5a5" }}>{isDegrade ? "HIGH RISK" : "HIGH"}</span>
                </div>
              </div>
            </div>

            {/* MS COMPOSITION — CM + SI + CS + CDP */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8B95A8", marginBottom: 12 }}>MS = CM + SI + CS + CDP</p>
              {[
                { label: "CM · Capital Momentum (0–40)",      val: migration.cmPts,  max: 40,  desc: "Weighted gross growth rate · last 4 films" },
                { label: "SI · Stability Index (0–30)",        val: migration.siPts,  max: 30,  desc: "30 × (1 − CoV) · lower variance = higher SI" },
                { label: "CS · Capital Safety Score (0–30)",   val: migration.csPts,  max: 30,  desc: `${Math.round(migration.bepSurvivalRate * 100)}% films cleared TRUE BEP ${TRUE_BEP_MULTIPLE}x` },
                { label: "CDP · Destruction Penalty (≤0)",     val: migration.cdpPts, max: 0,   desc: "−10/film ROI<1.0x · −15/film ROI<0.8x (last 4)" },
              ].map(f => {
                const pct = f.max > 0 ? (f.val / f.max) * 100 : Math.abs(f.val / 30) * 100;
                const color = f.label.startsWith("CDP") ? (f.val < 0 ? "#ff4d5a" : "#22e5a5") : (f.val / Math.max(f.max, 1)) >= 0.6 ? "#22e5a5" : (f.val / Math.max(f.max, 1)) >= 0.35 ? "#ffb347" : "#ff4d5a";
                return (
                  <div key={f.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 11, color: "#8B95A8" }}>{f.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color }}>{f.val > 0 ? "+" : ""}{f.val}</span>
                    </div>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>{f.desc}</p>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                      <div style={{ height: 3, width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: "width 400ms" }} />
                    </div>
                  </div>
                );
              })}
              {migration.capitalPenaltyApplied !== 0 && (
                <div style={{ borderTop: "1px solid rgba(255,199,0,0.15)", paddingTop: 10, marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,199,0,0.7)" }}>Risk Lab Capital Penalty</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#ff4d5a" }}>{migration.capitalPenaltyApplied}</span>
                  </div>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>BEP &lt;65% → −10 · Econ ROI &lt;1.0 → −15 · &lt;1.2 → −5</p>
                </div>
              )}
              <div style={{ borderTop: "1px solid rgba(255,199,0,0.2)", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#E8EAF0" }}>Migration Score (MS)</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: scoreColor }}>{migration.score}</span>
              </div>
            </div>

            {/* EXPLICIT UPGRADE/DOWNGRADE CONDITIONS */}
            <div style={{ background: migration.upgradeConditionsMet ? "rgba(34,229,165,0.06)" : "rgba(255,255,255,0.03)", borderRadius: 10, padding: 16, border: `1px solid ${migration.upgradeConditionsMet ? "rgba(34,229,165,0.2)" : "rgba(255,255,255,0.06)"}` }}>
              <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: migration.upgradeConditionsMet ? "#22e5a5" : "#8B95A8", marginBottom: 10 }}>
                {isDegrade ? "Downgrade Triggers" : "Upgrade Conditions"}
              </p>
              {!isDegrade ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { met: migration.rollingAvgGross >= migration.targetThreshold, label: `3-film avg gross ≥ ₹${migration.targetThreshold}Cr`, val: `₹${migration.rollingAvgGross}Cr` },
                    { met: migration.score >= 70,                                   label: "MS ≥ 70",                                             val: `MS = ${migration.score}` },
                    { met: !migration.hasSeveDestruction,                           label: "No ROI < 0.8x in last 3 films",                       val: migration.hasSeveDestruction ? "Violated" : "Clear" },
                  ].map(c => (
                    <div key={c.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 6, background: c.met ? "rgba(34,229,165,0.08)" : "rgba(255,77,90,0.06)" }}>
                      <span style={{ fontSize: 11, color: c.met ? "#22e5a5" : "#ff4d5a" }}>{c.met ? "✓" : "✗"} {c.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.met ? "#22e5a5" : "#ff4d5a" }}>{c.val}</span>
                    </div>
                  ))}
                  {migration.upgradeConditionsMet && (
                    <div style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(34,229,165,0.12)", textAlign: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#22e5a5", letterSpacing: "0.08em" }}>ALL CONDITIONS MET — UPGRADE ELIGIBLE</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { trig: migration.rollingAvgGross < migration.targetThreshold, label: `3-film avg < ₹${migration.targetThreshold}Cr`,           val: `₹${migration.rollingAvgGross}Cr` },
                    { trig: migration.consecutiveFails >= 2,                        label: "2+ consecutive ROI < 1.0x",                               val: `${migration.consecutiveFails} consec.` },
                    { trig: migration.score < 50,                                  label: "MS < 50",                                                  val: `MS = ${migration.score}` },
                  ].map(c => (
                    <div key={c.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 6, background: c.trig ? "rgba(255,77,90,0.10)" : "rgba(34,229,165,0.06)" }}>
                      <span style={{ fontSize: 11, color: c.trig ? "#ff4d5a" : "#22e5a5" }}>{c.trig ? "⚠" : "✓"} {c.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.trig ? "#ff4d5a" : "#22e5a5" }}>{c.val}</span>
                    </div>
                  ))}
                  {migration.downgradeTriggered && (
                    <div style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(255,77,90,0.15)", textAlign: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#ff4d5a", letterSpacing: "0.08em" }}>DOWNGRADE TRIGGERED</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PRESCRIPTIVE UPGRADE REQUIREMENT PANEL */}
            {!isDegrade && (
              <div style={{ background: "rgba(255,199,0,0.04)", border: "1px solid rgba(255,199,0,0.15)", borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,199,0,0.6)", fontWeight: 700, marginBottom: 12 }}>Upgrade Requirements · Next 2 Films</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px" }}>
                    <p style={{ fontSize: 10, color: "#8B95A8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Required Avg Gross</p>
                    <p style={{ fontSize: 22, fontWeight: 900, color: "#FFC700" }}>₹{migration.requiredAvgGross}Cr</p>
                    <p style={{ fontSize: 10, color: "#8B95A8", marginTop: 2 }}>per film (next 2)</p>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px" }}>
                    <p style={{ fontSize: 10, color: "#8B95A8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>BEP Streak Required</p>
                    <p style={{ fontSize: 22, fontWeight: 900, color: migration.requiredBEPStreak >= 2 ? "#ffb347" : "#FFC700" }}>{migration.requiredBEPStreak} film{migration.requiredBEPStreak > 1 ? "s" : ""}</p>
                    <p style={{ fontSize: 10, color: "#8B95A8", marginTop: 2 }}>must clear {TRUE_BEP_MULTIPLE}x BEP</p>
                  </div>
                </div>
                {migration.csPts < 20 && (
                  <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(255,179,71,0.08)", border: "1px solid rgba(255,179,71,0.2)" }}>
                    <p style={{ fontSize: 11, color: "#ffb347" }}>⚠ CS below threshold — at least {migration.requiredBEPStreak} consecutive films must clear {TRUE_BEP_MULTIPLE}x TRUE BEP before upgrade eligibility is restored.</p>
                  </div>
                )}
              </div>
            )}

            {/* FORECAST READINESS */}
            <ForecastReadinessPanel migration={migration} />

            <div className="sg-time-boundary">
              <p style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,199,0,0.5)", fontWeight: 700, marginBottom: 6 }}>SIGNAL Beta Boundary</p>
              <p className="sg-time-boundary-text">Migration is event-driven — gross trajectory, BEP survival rate, capital destruction events. Time horizon not modeled. MS = CM+SI+CS+CDP derived from {(actors.find(a => a.name === selected.name)?.films ?? []).slice(-4).length} recent films.</p>
              <button style={{ marginTop: 12, padding: "8px 16px", borderRadius: 6, border: "1px solid rgba(255,199,0,0.3)", background: "none", color: "#FFC700", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>Request Capital Forecast Model →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   PORTFOLIO
═══════════════════════════════════════════════════════════════ */

function PortfolioModule() {
  return (
    <div className="fade-in">
      <p className="sg-section-label">Portfolio Intelligence</p>
      <h2 className="sg-section-title">Multi-Actor Exposure Analysis</h2>
      <p className="sg-section-sub">Track aggregate capital risk across your development slate.</p>
      <div className="sg-portfolio-placeholder">
        <div className="sg-phase-badge">Phase 2 — Activating Soon</div>
        <p style={{ fontSize: 48, opacity: 0.15, margin: 0 }}>◫</p>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#E8EAF0" }}>Portfolio Intelligence</p>
        <p style={{ fontSize: 14, color: "#8B95A8", maxWidth: 400, lineHeight: 1.6 }}>Track multiple actors across your production slate. Aggregate risk concentration, diversification scoring, overexposure alerts.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          {["Risk Diversification Chart","Overexposure Alerts","Slate-Level CHI","Exportable Reports"].map(f => (
            <span key={f} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", color: "#8B95A8" }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIGNAL DASHBOARD
═══════════════════════════════════════════════════════════════ */

type Module = "cockpit" | "risk" | "migration" | "quadrant" | "portfolio";

function SignalDashboard({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [active, setActive] = useState<Module>("cockpit");
  // CapitalContext lifted here so Risk Lab writes → Migration reads
  const [capitalContext, setCapitalContext] = useState<CapitalContext>({
    actor: actors[0], budget: 150, budgetResult: null, stressResult: null,
  });
  const handleNavigate = (m: string) => { if (m === "stress") { setActive("risk"); return; } setActive(m as Module); };
  return (
    <div className="sg-root">
      <PlasmaBg />
      <nav className="sg-nav">
        <div className="sg-nav-brand"><span className="sg-nav-brand-eye">STARSQ</span><span className="sg-nav-brand-name">SIGNAL</span></div>
        <div className="sg-nav-links">
          {([["cockpit","Capital Cockpit"],["risk","Risk Lab"],["migration","Migration"],["quadrant","Quadrant Map"],["portfolio","Portfolio"]] as const).map(([id, label]) => (
            <button key={id} className={`sg-nav-link ${active === id ? "sg-nav-active" : ""}`} onClick={() => setActive(id)}>{label}</button>
          ))}
        </div>
        <div className="sg-nav-right"><span className="sg-nav-session">{email}</span><button className="sg-nav-logout" onClick={onLogout}>Sign Out</button></div>
      </nav>

      {/* ── MODULE IDENTITY BANNER ────────────────────────────────── */}
      <div style={{
        background: "rgba(255,199,0,0.03)",
        borderBottom: "1px solid rgba(255,199,0,0.07)",
        padding: "10px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#FFC700", boxShadow: "0 0 6px #FFC700", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "rgba(232,234,240,0.75)", letterSpacing: "0.02em" }}>
            <span style={{ color: "#FFC700", fontWeight: 700 }}>StarsQ Signal</span>
            {" "}analyzes actor capital risk.{" "}
            <span style={{ color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>
              It answers: "How safe is this budget for this actor?"
            </span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 11, color: "rgba(255,199,0,0.35)", textTransform: "uppercase", letterSpacing: "1.5px" }}>
            Capital Intelligence · Not a Ranking Tool
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>
            137 films · 21 actors · Data through 2025
          </span>
        </div>
      </div>

      <main className="sg-main">
        {active === "cockpit"   && <CapitalCockpit onNavigate={handleNavigate} />}
        {active === "risk"      && <RiskLab capitalContext={capitalContext} onContextChange={setCapitalContext} />}
        {active === "migration" && <MigrationModule capitalContext={capitalContext} />}
        {active === "quadrant"  && (
          <div className="fade-in">
            <p className="sg-section-label">Capital Risk Intelligence</p>
            <h2 className="sg-section-title">Risk-Reward Quadrant Map</h2>
            <p className="sg-section-sub">Stability vs Scale · All 21 actors · Hover any dot for data lineage</p>
            <div style={{ marginTop: 24 }}>
              <RiskRewardScatterPlot />
            </div>
          </div>
        )}
        {active === "portfolio" && <PortfolioModule />}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */

export default function SignalPage() {
  const [email, setEmail]         = useState<string | null>(null);
  const [cssInjected, setCssInjected] = useState(false);
  useEffect(() => {
    const id = "signal-styles";
    if (document.getElementById(id)) { setCssInjected(true); return; }
    const el = document.createElement("style"); el.id = id; el.textContent = SIGNAL_CSS;
    document.head.appendChild(el); setCssInjected(true);
    return () => { const ex = document.getElementById(id); if (ex) document.head.removeChild(ex); };
  }, []);
  if (!cssInjected) return null;
  if (!email) return <div className="sg-root"><PlasmaBg /><AccessGate onAuth={setEmail} /></div>;
  return <SignalDashboard email={email} onLogout={() => setEmail(null)} />;
}
