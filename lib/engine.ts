// /lib/engine.ts — StarsQ v2 Final
// ─────────────────────────────────────────────────────────────────────────────
// v2 Formula Architecture:
//
//  [1] DOWNSIDE VOLATILITY
//      lossRatio = max(0, 1 − ROI) if ROI < 1.0 | 0 otherwise
//      rawDvol   = sqrt(mean(lossRatio²))   ← Sortino semi-deviation at break-even
//      No symmetric stdDev. No career-mean deviation. Capital destruction only.
//
//  [2] STABILITY INDEX
//      normalizedDvol = rawDvol / maxDvol_dataset
//      STI = 100 × exp(−normalizedDvol × 1.5)
//      Range: 100 (zero destruction) → ~22 (worst in dataset). Never 0.
//
//  [3] VOLATILITY HEATMAP
//      dvolPct = normalizedDvol × 100
//      Dynamic ceiling — actor with highest capital destruction = 100%.
//
//  [4] RISK BAND
//      Derived from dvolPct only (capital destruction probability).
//      dvolPct < 15 → Controlled | < 30 → Balanced | < 55 → Elevated | ≥ 55 → High
//
//  [5] SCALE INDEX
//      openingPower × 0.35 + ceiling × 0.30 + panIndia × 0.20 + budgetReach × 0.15
//      All components log1p-normalized against live dataset max.
//      Continuous curve — no step-ladder cliffs.
//
//  [6] CHI — Capital Health Index
//      logROI(film) = log1p(grossCr × weight / budgetCr)
//      meanLogROI   = mean of all film logROIs
//      RMF          = exp(−normalizedDvol × 1.5)   ← same decay as STI
//      adjustedLogROI = meanLogROI × RMF
//      CHI = clamp(adjustedLogROI / maxAdjLogROI_dataset × 100, 0, 100)
//      maxAdjLogROI is FULLY DYNAMIC — no hardcoded constants.
//
//  [7] MOMENTUM
//      logROI per film = log1p(ROI)   ← capital growth basis, always positive for ROI > 0
//      n ≥ 6 → delta = mean(last3 logROI) − mean(prev3 logROI)
//      n < 6 → delta = mean(last3 logROI) − career mean logROI
//      Tier-specific signals. All tiers receive momentum signal.
//
// Architecture: Two-pass computation
//   Pass 1 — computeDatasetStats(): rawDvol per actor + all normalization anchors
//   Pass 2 — calculate(): per-actor metrics normalized against Pass 1 anchors
//
// STRICT DATA CONTRACT:
//   Every actor MUST have films[] populated.
//   The engine throws on module load if any actor is missing film data.
//   This makes data gaps visible — they cannot be silently hidden.
//   precomputed{} on Actor type remains as a staging annotation for migration tooling only.
//
// DATA GOVERNANCE — grossCr:
//   grossCr must be consistent across all actors: WW gross OR nett, not mixed.
//   Mixing gross and nett corrupts ROI comparability across actors.
//   Current dataset basis: WW gross. Per-film basis note in films[] if different.
// ─────────────────────────────────────────────────────────────────────────────

import { Actor, actors as actorRegistry } from "@/data/actors";
import { parseQuery } from "./parser";
import { resolveActor } from "./resolver";

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════════════════ */

export type EngineResult = {
  name: string;
  tier: number;

  // Scale
  scaleIndex: number;          // 0–100 log1p-normalized capital scale
  openingCr: number;
  openingBase: number;         // median of non-event Day-1 openings (mathematically derived)
  openingCeiling: number;      // highest confirmed standalone Day-1 gross
  openingMedian: number;       // raw median of all Day-1 data points
  maxGross: number;
  budgetTolerance: number;     // proven max budget from film history
  filmCount: number;           // number of films in dataset
  latestFilmYear: number;      // year of most recent film

  // Stability & Risk
  stabilityIndex: number;      // 0–100 exponential decay
  riskBand: string;            // Controlled | Balanced | Elevated | High
  dvolPct: number;             // 0–100 normalized downside vol (heatmap)
  lossFilmCount: number;       // Films with ROI < 1.0

  // Momentum
  momentum: string;

  // Capital Health
  chiScore: number;            // 0–100
  chiBand: string;             // Healthy | Volatile | Risky | Unhealthy

  // Qualitative
  migration: string;
  overlay: string;
};

export type EngineResponse =
  | { type: "single"; data: EngineResult }
  | { type: "comparison"; left: EngineResult; right: EngineResult; winner: string }
  | { type: "predict"; data: EngineResult; targetTier: number }
  | { type: "tier-check"; data: EngineResult; queriedTier?: number }
  | { type: "glossary"; term: string }
  | { type: "clarify-single"; options: string[] }
  | {
      type: "clarify-comparison";
      leftOptions: string[];
      rightOptions: string[];
      leftRaw: string;
      rightRaw: string;
    }
  | { type: "category"; label: string; route: string }
  | { type: "error"; message: string };

/* ════════════════════════════════════════════════════════════════════════════
   FILM-LEVEL COMPUTATION PRIMITIVES
   All logROI operations use log1p(roi) — capital growth basis.
   log1p(roi) = ln(1 + roi):
     • roi = 0.2  → log1p = 0.182  (positive — capital partially returned)
     • roi = 1.0  → log1p = 0.693  (breakeven)
     • roi = 5.0  → log1p = 1.792  (strong gain)
   Always non-negative for roi ≥ 0. Numerically stable at low ROI values.
   Using log(roi) instead: log(0.2) = −1.61 — negative space distorts mean CHI.
════════════════════════════════════════════════════════════════════════════ */

type FilmEntry = NonNullable<Actor["films"]>[number];

function filmROI(f: FilmEntry): number {
  const weight = f.multiStarrerWeight ?? 1.0;
  return (f.grossCr * weight) / f.budgetCr;
}

function filmLogROI(f: FilmEntry): number {
  return Math.log1p(filmROI(f));
}

function filmLossRatio(f: FilmEntry): number {
  return Math.max(0, 1 - filmROI(f)); // 0 when ROI ≥ 1.0
}

function computeRawDvol(films: FilmEntry[]): number {
  const lrSq = films.map((f) => { const lr = filmLossRatio(f); return lr * lr; });
  const meanLR2 = lrSq.reduce((a, b) => a + b, 0) / lrSq.length;
  return Math.sqrt(meanLR2);
}

function computeMeanLogROI(films: FilmEntry[]): number {
  const lr = films.map(filmLogROI);
  return lr.reduce((a, b) => a + b, 0) / lr.length;
}

/* ════════════════════════════════════════════════════════════════════════════
   PASS 1 — DATASET STATS
   Computed once at module load. All anchors derived from live data.
   No hardcoded constants. Any actor missing films[] throws here — visible, not silent.
════════════════════════════════════════════════════════════════════════════ */

type DatasetStats = {
  maxDvol: number;          // normalizes rawDvol → STI, dvolPct, RiskBand
  maxOpening: number;       // Scale Index — opening power
  maxGross: number;         // Scale Index — ceiling
  maxBudget: number;        // Scale Index — budget reach
  maxAdjLogROI: number;     // CHI normalization anchor — fully dynamic
};

function computeDatasetStats(actors: Actor[]): DatasetStats {
  // Strict contract: all actors must have films[]
  const missing = actors.filter((a) => !a.films || a.films.length === 0);
  if (missing.length > 0) {
    throw new Error(
      `[StarsQ Engine] films[] missing for: ${missing.map((a) => a.name).join(", ")}. ` +
        `All 21 actors must have film-level data. Add films[] before deploying.`
    );
  }

  const rawDvols = actors.map((a) => computeRawDvol(a.films!));
  const maxDvol = Math.max(...rawDvols, 1e-6);

  // CHI anchor — fully dynamic, computed from all 21 actors
  const adjLogROIs = actors.map((a) => {
    const dvol = computeRawDvol(a.films!);
    const nDvol = dvol / maxDvol;
    const RMF = Math.exp(-nDvol * 1.5);
    return computeMeanLogROI(a.films!) * RMF;
  });
  const maxAdjLogROI = Math.max(...adjLogROIs, 1e-6);

  return {
    maxDvol,
    maxOpening: Math.max(...actors.map((a) => a.openingCr)),
    maxGross:   Math.max(...actors.map((a) => a.maxGross)),
    maxBudget:  Math.max(...actors.map((a) => a.budgetTolerance)),
    maxAdjLogROI,
  };
}

let _stats: DatasetStats | null = null;

function getStats(): DatasetStats {
  if (!_stats) _stats = computeDatasetStats(actorRegistry);
  return _stats;
}

// Call when actors.ts is updated at runtime (dev/admin use)
export function invalidateStats(): void {
  _stats = null;
}

/* ════════════════════════════════════════════════════════════════════════════
   ENTRY POINT
════════════════════════════════════════════════════════════════════════════ */

export function runEngine(query: string): EngineResponse {
  const intent = parseQuery(query);
  if (!intent) return { type: "error", message: "Invalid query." };

  if (intent.type === "category") {
    return { type: "category", label: intent.label, route: intent.route };
  }

  if (intent.type === "glossary") {
    return { type: "glossary", term: intent.term };
  }

  if (intent.type === "single") {
    const resolved = resolveActor(intent.token);
    if (resolved.type === "suggest") return { type: "clarify-single", options: [resolved.suggestion] };
    if (resolved.type === "multiple") return { type: "clarify-single", options: resolved.options };
    if (resolved.type === "none") return { type: "error", message: "Actor not found." };
    return { type: "single", data: calculate(resolved.actor) };
  }

  if (intent.type === "comparison") {
    const L = resolveActor(intent.left);
    const R = resolveActor(intent.right);

    if (L.type === "suggest")
      return { type: "clarify-comparison", leftOptions: [L.suggestion], rightOptions: [], leftRaw: intent.left, rightRaw: intent.right };
    if (R.type === "suggest")
      return { type: "clarify-comparison", leftOptions: [], rightOptions: [R.suggestion], leftRaw: intent.left, rightRaw: intent.right };
    if (L.type === "multiple" || R.type === "multiple")
      return {
        type: "clarify-comparison",
        leftOptions:  L.type === "multiple" ? L.options : [],
        rightOptions: R.type === "multiple" ? R.options : [],
        leftRaw: intent.left,
        rightRaw: intent.right,
      };
    if (L.type !== "single" || R.type !== "single")
      return { type: "error", message: "One or both actors could not be found." };

    const left  = calculate(L.actor);
    const right = calculate(R.actor);

    // Deterministic, order-independent winner resolution
    const winner = (() => {
      if (left.tier !== right.tier)            return left.tier < right.tier ? left.name : right.name;
      if (left.scaleIndex !== right.scaleIndex) return left.scaleIndex > right.scaleIndex ? left.name : right.name;
      if (left.stabilityIndex !== right.stabilityIndex) return left.stabilityIndex > right.stabilityIndex ? left.name : right.name;
      if (left.openingCr !== right.openingCr)  return left.openingCr > right.openingCr ? left.name : right.name;
      if (left.maxGross !== right.maxGross)     return left.maxGross > right.maxGross ? left.name : right.name;
      return left.name < right.name ? left.name : right.name; // alphabetical tiebreak
    })();

    return { type: "comparison", left, right, winner };
  }

  if (intent.type === "predict") {
    const resolved = resolveActor(intent.token);
    if (resolved.type === "none") return { type: "error", message: "Actor not found." };
    if (resolved.type === "suggest") return { type: "clarify-single", options: [resolved.suggestion] };
    if (resolved.type === "multiple") return { type: "clarify-single", options: resolved.options };
    return { type: "predict", data: calculate(resolved.actor), targetTier: intent.targetTier };
  }

  if (intent.type === "tier-check") {
    const resolved = resolveActor(intent.token);
    if (resolved.type === "none") return { type: "error", message: "Actor not found." };
    if (resolved.type === "suggest") return { type: "clarify-single", options: [resolved.suggestion] };
    if (resolved.type === "multiple") return { type: "clarify-single", options: resolved.options };
    return { type: "tier-check", data: calculate(resolved.actor), queriedTier: intent.queriedTier };
  }

  return { type: "error", message: "Query not understood." };
}

/* ════════════════════════════════════════════════════════════════════════════
   PASS 2 — PER-ACTOR CALCULATION
════════════════════════════════════════════════════════════════════════════ */

function calculate(actor: Actor): EngineResult {
  const stats = getStats();
  const films = actor.films!; // guaranteed populated by Pass 1 validation

  // Tier — market gate, not formula output
  const tier = tierFromOpening(actor.openingCr);

  // ── [5] Scale Index — log1p continuous curve ──────────────────────────────
  const openingPower = (Math.log1p(actor.openingCr)       / Math.log1p(stats.maxOpening)) * 100;
  const ceiling      = (Math.log1p(actor.maxGross)         / Math.log1p(stats.maxGross))   * 100;
  const budgetReach  = (Math.log1p(actor.budgetTolerance)  / Math.log1p(stats.maxBudget))  * 100;
  const scaleIndex   = round(
    openingPower * 0.35 +
    ceiling      * 0.30 +
    actor.panIndiaViability * 0.20 +
    budgetReach  * 0.15
  );

  // ── [1] Downside Volatility ───────────────────────────────────────────────
  const rawDvol        = computeRawDvol(films);
  const normalizedDvol = rawDvol / stats.maxDvol; // 0.0–1.0

  // ── [3] Heatmap ───────────────────────────────────────────────────────────
  const dvolPct = round(normalizedDvol * 100);

  // ── [2] Stability Index ───────────────────────────────────────────────────
  const stabilityIndex = round(100 * Math.exp(-normalizedDvol * 1.5));

  // ── [4] Risk Band ────────────────────────────────────────────────────────
  const riskBand =
    dvolPct < 15  ? "Controlled"
    : dvolPct < 30 ? "Balanced"
    : dvolPct < 55 ? "Elevated"
    :                "High";

  // ── Loss film count ───────────────────────────────────────────────────────
  const lossFilmCount = films.filter((f) => filmROI(f) < 1.0).length;

  // ── [7] Momentum ──────────────────────────────────────────────────────────
  const momentum = computeMomentum(films, tier);

  // ── [6] CHI ───────────────────────────────────────────────────────────────
  const RMF            = Math.exp(-normalizedDvol * 1.5); // same decay as STI
  const meanLogROI     = computeMeanLogROI(films);
  const adjLogROI      = meanLogROI * RMF;
  const chiRaw         = (adjLogROI / stats.maxAdjLogROI) * 100;
  const chiScore       = Math.round(Math.max(0, Math.min(100, chiRaw)));
  const chiBand        =
    chiScore >= 80 ? "Healthy"
    : chiScore >= 60 ? "Volatile"
    : chiScore >= 40 ? "Risky"
    :                  "Unhealthy";

  // ── Migration (Tier 3 only) ───────────────────────────────────────────────
  const migration =
    tier !== 3       ? "N/A"
    : momentum === "Breakout Potential" ? "High"
    : momentum === "Climbing"           ? "Moderate"
    :                                    "Low";

  // ── Overlay ───────────────────────────────────────────────────────────────
  const overlay =
    tier === 1 ? "Structural Tier 1 capital anchor."
    : tier === 2 ? "Tier 2 scalable mid-cap operator."
    :              "Emerging capital with migration potential.";

  return {
    name: actor.name,
    tier,
    scaleIndex,
    openingCr: actor.openingCr,
    openingBase:    (actor as any).openingBase    ?? Math.round(actor.openingCr * 0.5),
    openingCeiling: (actor as any).openingCeiling ?? actor.openingCr,
    openingMedian:  (actor as any).openingMedian  ?? (actor as any).openingBase ?? Math.round(actor.openingCr * 0.5),
    maxGross: actor.maxGross,
    budgetTolerance: actor.budgetTolerance,
    filmCount: films.length,
    latestFilmYear: films.length > 0 ? Math.max(...films.map(f => f.year)) : 0,
    stabilityIndex,
    riskBand,
    dvolPct,
    lossFilmCount,
    momentum,
    chiScore,
    chiBand,
    migration,
    overlay,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   MOMENTUM — [7]
════════════════════════════════════════════════════════════════════════════ */

function computeMomentum(films: FilmEntry[], tier: number): string {
  if (films.length < 2) return "Insufficient Data";

  const logROIs = films.map(filmLogROI); // log1p(roi), chronological
  const n       = logROIs.length;
  const last3   = logROIs.slice(-Math.min(3, n));
  const meanL3  = last3.reduce((a, b) => a + b, 0) / last3.length;

  let delta: number;
  if (n >= 6) {
    const prev3  = logROIs.slice(-6, -3);
    const meanP3 = prev3.reduce((a, b) => a + b, 0) / prev3.length;
    delta = meanL3 - meanP3;
  } else {
    const career = logROIs.reduce((a, b) => a + b, 0) / n;
    delta = meanL3 - career;
  }

  // ±0.20 threshold — log1p(1.22) − log1p(1.0) ≈ 0.20
  // Requires ~22% ROI shift to register directional signal
  const T = 0.2;

  if (tier === 1) return delta > T ? "Acceleration"     : delta > -T ? "Stable"   : "Capital Fatigue";
  if (tier === 2) return delta > T ? "Expansion Ready"  : delta > -T ? "Stable"   : "Stagnation Risk";
  return              delta > T ? "Breakout Potential"  : delta > -T ? "Climbing" : "Dormant";
}

/* ════════════════════════════════════════════════════════════════════════════
   EXPORTED UTILITIES
   Consumed by Signal page, heatmap, and admin diagnostics.
════════════════════════════════════════════════════════════════════════════ */

// Full 21-actor scan — Signal page heatmap and tier-table rendering
export function getAllActorProfiles(): EngineResult[] {
  return actorRegistry.map(calculate);
}

// Exposed dataset stats — Signal page diagnostic panel
export function getDatasetStats(): DatasetStats {
  return getStats();
}

/* ════════════════════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════════════════════ */

function tierFromOpening(openingCr: number): number {
  if (openingCr >= 60) return 1;
  if (openingCr >= 30) return 2;
  return 3;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}