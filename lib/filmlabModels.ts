// /lib/filmlabModels.ts — FilmLab Pre-Production Simulator
// ─────────────────────────────────────────────────────────────────────────────
// Types, constants, and configuration for the FilmLab module.
// No imports from engine.ts — all engine data enters via EngineResult injection.
// ─────────────────────────────────────────────────────────────────────────────

// ── RE-EXPORT ENGINE TYPES (read-only usage only) ────────────────────────────
// FilmLab consumes EngineResult but never writes back to engine.ts
export type { EngineResult } from "@/lib/engine";

// ── GENRE CONFIGURATION ──────────────────────────────────────────────────────
export type Genre =
  | "Action"
  | "Mythology"
  | "Thriller"
  | "Comedy"
  | "Drama"
  | "Experimental";

export const GENRE_DEMAND: Record<Genre, number> = {
  Action:       85,
  Mythology:    90,
  Thriller:     75,
  Comedy:       70,
  Drama:        60,
  Experimental: 45,
};

export const GENRE_META: Record<Genre, { icon: string; label: string; description: string }> = {
  Action:       { icon: "⚡", label: "Action",       description: "High-octane commercial vehicle" },
  Mythology:    { icon: "🔱", label: "Mythology",    description: "Franchise-grade cultural IP" },
  Thriller:     { icon: "🎭", label: "Thriller",     description: "Audience tension premium" },
  Comedy:       { icon: "🎬", label: "Comedy",       description: "Opening-sensitive word-of-mouth" },
  Drama:        { icon: "🎞️",  label: "Drama",        description: "Long-leg critical performer" },
  Experimental: { icon: "🔬", label: "Experimental", description: "High variance, niche ceiling" },
};

// ── DISTRIBUTION CONFIGURATION ────────────────────────────────────────────────
export type Distribution = "Regional" | "Pan India" | "Global";

export const DISTRIBUTION_STRENGTH: Record<Distribution, number> = {
  Regional:  50,
  "Pan India": 75,
  Global:    90,
};

export const DISTRIBUTION_META: Record<Distribution, { icon: string; pnaMultiplier: number; description: string }> = {
  Regional:    { icon: "📍", pnaMultiplier: 0.15, description: "Single-region theatrical focus" },
  "Pan India": { icon: "🗺️",  pnaMultiplier: 0.18, description: "Multi-language simultaneous release" },
  Global:      { icon: "🌐", pnaMultiplier: 0.22, description: "Worldwide theatrical footprint" },
};

// ── THEATRICAL MULTIPLIERS BY TIER ────────────────────────────────────────────
export const THEATRICAL_MULTIPLIER: Record<1 | 2 | 3, number> = {
  1: 4.5,
  2: 3.2,
  3: 2.2,
};

// ── FILMLAB CONSTANTS ─────────────────────────────────────────────────────────
export const FL = {
  // FilmSuccessScore component weights
  W_STAR_CAPITAL:          0.35,
  W_BUDGET_EFFICIENCY:     0.30,
  W_DISTRIBUTION_STRENGTH: 0.20,
  W_GENRE_DEMAND:          0.15,

  // StarCapital sub-weights
  W_SC_SCALE:    0.4,
  W_SC_STABILITY: 0.3,
  W_SC_CHI:      0.3,

  // Distribution economics — flat fallback only (use getDistShare() in engine)
  // Real Telugu BO: Nizam 45-50% · Andhra 40-45% · Hindi belt 30-35% · Overseas 35-40%
  // Weighted by territory mix per distribution strategy:
  DIST_SHARE:    0.40,   // legacy fallback — do not use directly in new code

  // Score band thresholds
  BAND_STRONG:   80,
  BAND_VIABLE:   65,
  BAND_MODERATE: 50,
  BAND_WEAK:     35,
} as const;

// ── DISTRIBUTION-AWARE PRODUCER SHARE RATIOS ─────────────────────────────────
// Telugu BO territory mix determines effective producer share from gross:
//   Regional (Telugu-only): Nizam 45-50% + AP 40-45% → weighted avg ≈ 42%
//   Pan-India: Telugu avg 43% × ~55% + Hindi belt 30-35% × ~35% + Overseas 37% × ~10% ≈ 38%
//   Global (Overseas-heavy): Above + larger overseas/Hindi volume dilutes to ≈ 36%
export const DIST_SHARE_BY_DISTRIBUTION: Record<Distribution, number> = {
  "Regional":  0.42,   // Telugu-only: Nizam + AP dominate (premium rates)
  "Pan India": 0.38,   // Multi-language: Telugu + Hindi belt (30-35%) mix
  "Global":    0.36,   // Worldwide: overseas (35-40%) + Hindi belt dilutes further
};

// Helper — use this everywhere instead of FL.DIST_SHARE
export function getDistShare(distribution: Distribution): number {
  return DIST_SHARE_BY_DISTRIBUTION[distribution];
}

// Distribution-aware EFFECTIVE_LIFETIME_SHARE
// WEEK_DIST_SHARES = [0.50, 0.425, 0.375, 0.30] are Telugu-calibrated (Regional baseline)
// For Pan-India / Global, scale week rates down proportionally
export function getEffectiveLifetimeShare(distribution: Distribution): number {
  const WEEK_WEIGHTS   = [0.58, 0.22, 0.12, 0.08];
  const WEEK_DIST_BASE = [0.50, 0.425, 0.375, 0.30]; // Regional baseline
  const scaleFactor    = getDistShare(distribution) / 0.42; // relative to Regional
  return WEEK_WEIGHTS.reduce((s, w, i) => s + w * WEEK_DIST_BASE[i] * scaleFactor, 0);
}

export type ScoreBand =
  | "Strong Greenlight"
  | "Viable"
  | "Moderate Risk"
  | "High Risk"
  | "Do Not Proceed";

export function scoreBand(score: number): ScoreBand {
  if (score >= FL.BAND_STRONG)   return "Strong Greenlight";
  if (score >= FL.BAND_VIABLE)   return "Viable";
  if (score >= FL.BAND_MODERATE) return "Moderate Risk";
  if (score >= FL.BAND_WEAK)     return "High Risk";
  return "Do Not Proceed";
}

export const BAND_COLOR: Record<ScoreBand, string> = {
  "Strong Greenlight": "#22d3a5",
  "Viable":            "#a3e635",
  "Moderate Risk":     "#fbbf24",
  "High Risk":         "#f97316",
  "Do Not Proceed":    "#ef4444",
};

// ── INPUT / OUTPUT TYPES ──────────────────────────────────────────────────────

// ── FILM CATEGORY ─────────────────────────────────────────────────────────────
// Applied to the era-normalized openingBase to produce the effective Day-1 opening.
// This is the single most important credibility lever for producers:
//   Normal    → baseline film, no special director/franchise/hype factor
//   Trend     → strong music, trailer buzz, favorable release window
//   Event     → marquee director (Shankar/Rajamouli), franchise, political moment
//
// Game Changer example: RC base=64 × Event 1.8 × Shankar director 1.25 ≈ ₹144Cr
// (actual: ₹150–186Cr — well within the ceiling)
export type FilmCategory = "Normal" | "Trend" | "Event";

export const FILM_CATEGORY_MULTIPLIERS: Record<FilmCategory, number> = {
  Normal: 1.0,
  Trend:  1.3,
  Event:  1.8,
};

export const FILM_CATEGORY_META: Record<FilmCategory, {
  icon: string;
  label: string;
  description: string;
  color: string;
}> = {
  Normal: {
    icon: "🎬",
    label: "Normal Release",
    description: "Standard film — no marquee director or special hype",
    color: "#94A3B8",
  },
  Trend: {
    icon: "📈",
    label: "Strong Trend",
    description: "Strong music / trailer buzz / favorable release window",
    color: "#F59E0B",
  },
  Event: {
    icon: "⚡",
    label: "Event Film",
    description: "Marquee director (Shankar/Rajamouli), franchise, or political moment",
    color: "#7B9FFF",
  },
};

// ── ERA MULTIPLIERS ────────────────────────────────────────────────────────────
// Normalizes historical Day-1 opening data to 2025 ticket-price era.
// Telugu multiplex avg ticket: ₹100–150 (2017–18) → ₹300–500 (2024–25)
// Growth ~2.5–3× in 7 years = ~1.35 for 2017–18 relative to today.
// Applied per-film in computeEraAdjustedOpeningBase() in filmlabEngine.ts.
export const ERA_MULTIPLIER: Record<number, number> = {
  2013: 1.55, 2014: 1.55, 2015: 1.50, 2016: 1.45,
  2017: 1.35, 2018: 1.35,
  2019: 1.20, 2020: 1.20,
  2021: 1.10, 2022: 1.10,
  2023: 1.00, 2024: 1.00, 2025: 1.00, 2026: 1.00,
};

// ── MARKET CONDITIONS — 4-SELECTOR ARCHITECTURE ─────────────────────────────
// Replaces the old single-select ScenarioMode.
// Opening = base × BuzzMult(tier) × TimingMult × FrictionMult
// Decay   = WOMCurve (independent of opening drivers)

// ── 1. PRE-RELEASE BUZZ (affects opening only) ────────────────────────────────
export type PreReleaseBuzz = "Normal" | "StrongBuzz" | "EventFilm";

// Tier-aware: Tier-1 stars amplify buzz far more than Tier-2/3
export const BUZZ_MULTIPLIER: Record<PreReleaseBuzz, Record<1 | 2 | 3, number>> = {
  Normal:     { 1: 1.00, 2: 1.00, 3: 1.00 },
  StrongBuzz: { 1: 1.35, 2: 1.20, 3: 1.10 },
  EventFilm:  { 1: 1.60, 2: 1.35, 3: 1.20 },
};

export const BUZZ_META: Record<PreReleaseBuzz, {
  icon: string; label: string; description: string; color: string;
}> = {
  Normal:     { icon: "🎬", label: "Normal Release",  description: "Standard marketing, no special hype", color: "#94A3B8" },
  StrongBuzz: { icon: "🔥", label: "Strong Buzz",     description: "Viral songs, trailer + market excitement", color: "#F59E0B" },
  EventFilm:  { icon: "⚡", label: "Event Film",      description: "Marquee combo · franchise · cultural moment", color: "#7B9FFF" },
};

// ── 2. RELEASE TIMING (affects opening only) ──────────────────────────────────
export type ReleaseTiming = "Normal" | "Festival";

export const TIMING_MULTIPLIER: Record<ReleaseTiming, number> = {
  Normal:   1.00,
  Festival: 1.20,
};

export const TIMING_META: Record<ReleaseTiming, {
  icon: string; label: string; description: string; color: string;
}> = {
  Normal:   { icon: "📅", label: "Normal Friday",    description: "Standard release window", color: "#94A3B8" },
  Festival: { icon: "🎊", label: "Festival Release", description: "Sankranti · EId · Dussehra · Pongal", color: "#22D3A5" },
};

// ── 3. MARKET FRICTION (affects opening only) ─────────────────────────────────
export type MarketFriction = "Normal" | "HighFriction";

export const FRICTION_MULTIPLIER: Record<MarketFriction, number> = {
  Normal:       1.00,
  HighFriction: 0.85,
};

export const FRICTION_META: Record<MarketFriction, {
  icon: string; label: string; description: string; color: string;
}> = {
  Normal:       { icon: "✅", label: "Normal Market",   description: "No competing releases or disruptions", color: "#94A3B8" },
  HighFriction: { icon: "⚠️", label: "High Friction",   description: "IPL · big clash · elections · bad press", color: "#FF6B6B" },
};

// ── 4. POST-RELEASE WOM (affects decay curve only, not opening) ───────────────
export type WOMScenario = "Weak" | "Average" | "Strong";

export const WOM_META: Record<WOMScenario, {
  icon: string; label: string; description: string; color: string;
  weekdayHold: string;  // qualitative summary for producers
}> = {
  Weak:    { icon: "📉", label: "Weak WOM",    description: "Story disappoints · sharp weekday collapse",  color: "#FF4D4D", weekdayHold: "20–35% of Day-1 on weekdays" },
  Average: { icon: "📊", label: "Average WOM", description: "Normal decay · standard Telugu front-loading", color: "#FFB800", weekdayHold: "30–45% of Day-1 on weekdays" },
  Strong:  { icon: "🚀", label: "Strong WOM",  description: "Blockbuster talk · legs + 2nd weekend jump",  color: "#22C55E", weekdayHold: "40–55% of Day-1 on weekdays" },
};

// ── SCENARIO STRESS ENGINE (legacy — kept for ScenarioPanel P&L stress test) ──
// Scenario multiplies the final Expected Gross projection only.
// All downstream values (ProducerShare, CapitalROI, BEP gap, RiskProfile)
// recompute from the adjusted gross. Base model formulas are unchanged.
export type ScenarioMode =
  | "BASE"
  | "WEAK_WOM"
  | "STRONG_WOM"
  | "FESTIVAL_BOOST";

export const SCENARIO_MULTIPLIERS: Record<ScenarioMode, number> = {
  BASE:          1.00,
  WEAK_WOM:      0.65,
  STRONG_WOM:    1.35,
  FESTIVAL_BOOST: 1.20,
};

export const SCENARIO_META: Record<ScenarioMode, { label: string; description: string; color: string }> = {
  BASE:           { label: "Base Case",      description: "Normal market conditions",           color: "#00E5FF" },
  WEAK_WOM:       { label: "Weak WOM",        description: "Negative word-of-mouth, −35% gross", color: "#FF4D4D" },
  STRONG_WOM:     { label: "Strong WOM",      description: "Exceptional reception, +35% gross",  color: "#22C55E" },
  FESTIVAL_BOOST: { label: "Festival Boost",  description: "Holiday release window, +20% gross", color: "#fbbf24" },
};

// ── ADDITIONAL RECOVERY STREAMS ──────────────────────────────────────────────
// Optional non-theatrical revenue sources. Do NOT affect CVI — CVI is
// theatrical-only. These only affect Total Recovery and True ROI.
export type RecoveryStreams = {
  overseasRights:  number;   // ₹Cr
  ottRights:       number;   // ₹Cr
  satelliteRights: number;   // ₹Cr
  audioRights:     number;   // ₹Cr
};

export const DEFAULT_RECOVERY: RecoveryStreams = {
  overseasRights:  0,
  ottRights:       0,
  satelliteRights: 0,
  audioRights:     0,
};

export type FilmLabInput = {
  // Actor selection
  actorName: string | null;          // null → manual override mode
  useManualOverride: boolean;

  // Manual override values (used when useManualOverride=true)
  manualScaleIndex:    number;       // 0–100
  manualStabilityIndex: number;      // 0–100
  manualChiScore:      number;       // 0–100
  manualTier:          1 | 2 | 3;
  manualOpeningCr:     number;       // ₹Cr

  // Film parameters
  productionBudget:  number;          // ₹Cr — cost of making the film (hero excluded)
  heroRemuneration:  number;          // ₹Cr — actor salary / profit share (0 if not set)
  genre:             Genre;
  distribution:      Distribution;
  filmCategory:      FilmCategory;    // Normal / Trend / Event — scales opening projection

  // ── Market Conditions (4-selector architecture) ───────────────────────────
  // Opening = openingBase × BuzzMult(tier) × TimingMult × FrictionMult
  // Decay   = WOMCurve (independent of opening drivers)
  preReleaseBuzz:    PreReleaseBuzz;  // Normal / StrongBuzz / EventFilm
  releaseTiming:     ReleaseTiming;   // Normal / Festival
  marketFriction:    MarketFriction;  // Normal / HighFriction
  womScenario:       WOMScenario;     // Weak / Average / Strong (decay curve only)

  // Additional recovery streams (optional, non-theatrical)
  recovery:         RecoveryStreams;
};

// ── SCENARIO PANEL RESULT ─────────────────────────────────────────────────────
// Three-scenario profit/loss panel anchored to actor's actual film history.
// Derived from real film comparable ROIs — not assumed distributions.
export type ScenarioCase = {
  label:        string;   // "Stress" | "Base" | "Upside"
  filmAnchor:   string;   // name of comparable film this is anchored to
  roiMultiplier: number;  // gross ROI applied to budget
  gross:        number;   // ₹Cr projected gross
  producerShare: number;  // ₹Cr (gross × 0.40)
  profitLoss:   number;   // ₹Cr (producerShare − totalCapital)
  probability:  number;   // 0–100 derived from actual loss/profit film count
  isProfitable: boolean;
};

export type ScenarioPanelResult = {
  stressSafeBudget:         number;   // ₹Cr — recommended budget for this panel
  totalCapitalAtSSB:        number;   // ₹Cr — stressSafeBudget + P&A at that budget
  stress:                   ScenarioCase;
  base:                     ScenarioCase;
  upside:                   ScenarioCase;
  capitalLossProbability:   number;   // 0–100 (= stress probability)
  fullRecoveryProbability:  number;   // 0–100 (= base + upside probability)
  stabilityCapApplied:      boolean;  // whether stability cap constrained upside gross
  stabilityGrossCap:        number;   // ₹Cr — maxGross × stabilityIndex/100
};

export type FilmLabResult = {
  // Score components (all 0–100)
  starCapital:          number;
  budgetEfficiency:     number;
  distributionStrength: number;
  genreDemand:          number;
  filmSuccessScore:     number;

  // Component breakdown
  scaleIndex:    number;
  stabilityIndex: number;
  chiScore:      number;

  // Gross projections
  expectedGross:    number;          // ₹Cr
  projectedNett:    number;          // ₹Cr
  producerShare:    number;          // ₹Cr

  // Capital metrics
  totalCapital:     number;          // ₹Cr (productionBudget + heroRemuneration + P&A)
  pnaCost:          number;          // ₹Cr
  heroRemuneration: number;          // ₹Cr
  breakEvenGross:   number;          // ₹Cr theatrical-only recovery gate
  effectiveBreakEven: number;        // ₹Cr streams-adjusted recovery gate
  recoveryStreamsTotal: number;       // ₹Cr total booked non-theatrical streams
  profitBudget:     number;          // ₹Cr max budget where base gross returns profit (no streams)
  profitBudgetWithStreams: number;   // ₹Cr max budget where base gross + streams returns profit
  capitalROI:       number;          // producerShare / totalCapital

  // ROI band
  roiBandLow:  number;               // ×
  roiBandHigh: number;               // ×
  roiBandLabel: string;

  // Risk outputs
  capitalExposureRisk: "Safe" | "Watch" | "Exposed" | "Critical";
  downsideProbability: number;       // 0–100%
  capitalAtRisk:       number;       // ₹Cr expected loss if underperform

  // Score classification
  band: ScoreBand;
  bandColor: string;

  // Metadata
  tier: 1 | 2 | 3;
  theatricalMultiplier: number;
  adjustedMultiplier:   number;      // stability-adjusted theatrical multiplier
  // Legacy — kept for backward compat (ScenarioPanel P&L still uses base gross)
  scenario:             string;      // = womScenario mapped to a label
  scenarioMultiplier:   number;      // = 1.0 (WOM only affects decay, not gross total)
  baseExpectedGross:    number;      // gross before any scenario (from actor film history)
  openingCr:            number;      // actor's peak solo Day-1 ceiling (₹Cr)
  openingBase:          number;      // era-normalized non-event median (₹Cr)
  openingCeiling:       number;      // same as openingCr
  openingMedian:        number;      // raw unadjusted median
  filmCategory:         FilmCategory;
  filmCategoryMultiplier: number;
  effectiveOpeningDay1: number;      // final projected opening after ALL multipliers

  // Market Conditions outputs
  preReleaseBuzz:       PreReleaseBuzz;
  releaseTiming:        ReleaseTiming;
  marketFriction:       MarketFriction;
  womScenario:          WOMScenario;
  buzzMultiplier:       number;      // tier-adjusted buzz factor
  timingMultiplier:     number;
  frictionMultiplier:   number;
  marketCondMult:       number;      // = buzzMult × timingMult × frictionMult (upside row driver)
  openingDerivedLifetime: number;    // lifetime implied by effectiveOpeningDay1 + WOM curve

  // Recovery streams & True ROI
  totalRecovery:        number;      // theatricalShare + all non-theatrical streams
  trueROI:              number;      // totalRecovery / totalCapital
  recoveryBreakdown: {
    theatrical:  number;
    overseas:    number;
    ott:         number;
    satellite:   number;
    audio:       number;
  };

  // Scenario Panel — 3-outcome profit/loss view anchored to film history
  scenarioPanel:        ScenarioPanelResult;

  // Theatrical Run Model — week-by-week + day-level recovery timeline (base scenario)
  theatricalRun: {
    totalGross:           number;
    totalCapital:         number;
    netTheatricalRisk:    number;
    recoveryGateCr:       number;
    fullRecoveryGateCr:   number;
    days: Array<{
      day:             number;
      label:           string;
      grossCr:         number;
      shareCr:         number;
      cumulativeShare: number;
      capitalRecovered: boolean;
    }>;
    capitalRecoveryDay:   number | null;
    capitalRecoveryLabel: string;
    openingWeekendGross:  number;
    openingWeekendShare:  number;
    weeks: Array<{
      week:            number;
      label:           string;
      grossCr:         number;
      shareCr:         number;
      cumulativeShare: number;
      capitalRecovered: boolean;
    }>;
    recoveryWeek:         number | null;
    multiplierLabel:      string;
    openingCr:            number;
    openingBase:          number;
    openingDay1Gross:     number;
    openingLifetime:      number;
    openingCeiling:       number;
    openingMedian:        number;
    scenario:             string;    // womScenario label for UI title
  } | null;
};

// ── BUDGET DANGER METER ───────────────────────────────────────────────────────
export type DangerZone =
  | "Safe Zone"
  | "Stretched"
  | "At Risk"
  | "Exposed";

export const DANGER_COLORS: Record<DangerZone, string> = {
  "Safe Zone": "#22d3a5",
  "Stretched": "#a3e635",
  "At Risk":   "#fbbf24",
  "Exposed":   "#ef4444",
};

// Tier-weighted safe budget multipliers
// T1 actors have deeper commercial footprints; T3 have tighter ceilings.
export const SAFE_BUDGET_MULTIPLIER: Record<1 | 2 | 3, number> = {
  1: 4.0,
  2: 3.0,  // matches user's original openingCr × 3 for T2
  3: 2.0,
};

export type BudgetDangerResult = {
  safeBudget:       number;  // ₹Cr — openingCr × tierMultiplier
  dangerRatio:      number;  // productionBudget / safeBudget
  dangerZone:       DangerZone;
  dangerColor:      string;
  dangerPct:        number;  // 0–100 for bar meter
  recommendedMin:   number;  // safeBudget × 0.75
  recommendedMax:   number;  // safeBudget
  tierMultiplier:   number;  // which multiplier was applied
};

// ── STAR-SWAP SIMULATION ──────────────────────────────────────────────────────
export type SwapRow = {
  actorName:     string;
  tier:          1 | 2 | 3;
  openingCr:     number;
  expectedGross: number;   // openingCr × theatricalMultiplier
  grossROI:      number;   // expectedGross / productionBudget (gross on prod budget)
  dangerZone:    DangerZone;
  dangerColor:   string;
  isCurrent:     boolean;  // is this the currently selected actor?
};

export type StarSwapResult = {
  rows:          SwapRow[];  // one per tier (best representative each)
  productionBudget: number; // echoed for display
};

export const DEFAULT_INPUT: FilmLabInput = {
  actorName:            null,
  useManualOverride:    false,
  manualScaleIndex:     60,
  manualStabilityIndex: 60,
  manualChiScore:       50,
  manualTier:           2,
  manualOpeningCr:      35,
  productionBudget:     100,
  heroRemuneration:     0,
  genre:                "Action",
  distribution:         "Pan India",
  filmCategory:         "Normal",
  preReleaseBuzz:       "Normal",
  releaseTiming:        "Normal",
  marketFriction:       "Normal",
  womScenario:          "Average",
  recovery:             DEFAULT_RECOVERY,
};
