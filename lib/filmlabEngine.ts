// /lib/filmlabEngine.ts — FilmLab Computation Engine
// ─────────────────────────────────────────────────────────────────────────────
// Consumes EngineResult from engine.ts (read-only, via getAllActorProfiles).
// Computes FilmSuccessScore and all derived outputs.
// DOES NOT import internal engine functions. Uses only public exports.
// ─────────────────────────────────────────────────────────────────────────────

import { getAllActorProfiles } from "@/lib/engine";
import type { EngineResult } from "@/lib/engine";
import { actors as actorRegistry } from "@/data/actors";
import {
  FilmLabInput,
  FilmLabResult,
  FL,
  THEATRICAL_MULTIPLIER,
  DISTRIBUTION_STRENGTH,
  GENRE_DEMAND,
  DISTRIBUTION_META,
  scoreBand,
  BAND_COLOR,
  BudgetDangerResult,
  DangerZone,
  DANGER_COLORS,
  SAFE_BUDGET_MULTIPLIER,
  StarSwapResult,
  SwapRow,
  SCENARIO_MULTIPLIERS,
  RecoveryStreams,
  ScenarioPanelResult,
  ScenarioCase,
  getDistShare,
  getEffectiveLifetimeShare,
  Distribution,
  FilmCategory,
  FILM_CATEGORY_MULTIPLIERS,
  ERA_MULTIPLIER,
  PreReleaseBuzz,
  ReleaseTiming,
  MarketFriction,
  WOMScenario,
  BUZZ_MULTIPLIER,
  TIMING_MULTIPLIER,
  FRICTION_MULTIPLIER,
} from "@/lib/filmlabModels";

// ── ERA-ADJUSTED OPENING BASE COMPUTATION ─────────────────────────────────────
// Converts raw historical Day-1 openings to 2025-era equivalent using ticket-price
// inflation factors, then computes the median of non-event films.
//
// Algorithm:
//   1. Adjust each film: adjustedGross = rawGross × ERA_MULTIPLIER[year]
//   2. Compute rawMedian of adjusted values
//   3. Event detection: if adjustedGross > 2.5 × rawMedian → EVENT (exclude from base)
//   4. openingBase = median of non-event adjusted grosses
//   5. Cap at openingCeiling
//
// Defensibility: if Dil Raju asks "why ₹64Cr for RC?" →
//   "Rangasthalam ₹46Cr (2018) × 1.35 era factor = ₹62Cr. VVR ₹50Cr × 1.10 = ₹55Cr.
//    Median of [62, 55] = ₹58Cr. Game Changer ₹186Cr excluded as event film."
export function computeEraAdjustedOpeningBase(
  openingFilms: Array<{ year: number; grossCr: number; isEvent?: boolean }>,
  openingCeiling: number,
  fallbackBase: number
): number {
  if (!openingFilms || openingFilms.length === 0) return fallbackBase;

  // Step 1: Era-adjust each film
  const adjusted = openingFilms.map(f => {
    const eraFactor = ERA_MULTIPLIER[f.year] ?? 1.0;
    return { ...f, adjustedGross: f.grossCr * eraFactor };
  });

  // Step 2: Sort by adjusted gross for median computation
  const allAdjusted = adjusted.map(f => f.adjustedGross).sort((a, b) => a - b);
  const rawMedian = allAdjusted.length % 2 === 1
    ? allAdjusted[Math.floor(allAdjusted.length / 2)]
    : (allAdjusted[allAdjusted.length / 2 - 1] + allAdjusted[allAdjusted.length / 2]) / 2;

  // Step 3: Event detection (explicit flag OR 2.5× rule)
  const eventThreshold = 2.5 * rawMedian;
  const nonEvents = adjusted.filter(f => !f.isEvent && f.adjustedGross <= eventThreshold);

  // Step 4: Median of non-events
  if (nonEvents.length === 0) {
    // All films are events — use 70% of raw median as conservative base
    return Math.min(Math.round(r1(rawMedian * 0.70)), openingCeiling);
  }

  const nonEventValues = nonEvents.map(f => f.adjustedGross).sort((a, b) => a - b);
  const baseMedian = nonEventValues.length % 2 === 1
    ? nonEventValues[Math.floor(nonEventValues.length / 2)]
    : (nonEventValues[nonEventValues.length / 2 - 1] + nonEventValues[nonEventValues.length / 2]) / 2;

  // Step 5: Round and cap
  return Math.min(r1(baseMedian), openingCeiling);
}

// ── PUBLIC: Get all actor profiles for actor picker ───────────────────────────
export function getActorProfiles(): EngineResult[] {
  return getAllActorProfiles().sort((a, b) => a.tier - b.tier || b.scaleIndex - a.scaleIndex);
}

// ── PUBLIC: Get a single actor profile by name ────────────────────────────────
export function getActorProfile(name: string): EngineResult | null {
  const profiles = getAllActorProfiles();
  return profiles.find((p) => p.name === name) ?? null;
}

// ── INTERNAL: Clamp helper ────────────────────────────────────────────────────
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── COMPONENT 1: StarCapital ─────────────────────────────────────────────────
//
//   StarCapital = scaleIndex×0.4 + stabilityIndex×0.3 + chiScore×0.3
//   All inputs 0–100. Output 0–100.
// ─────────────────────────────────────────────────────────────────────────────
function computeStarCapital(
  scaleIndex: number,
  stabilityIndex: number,
  chiScore: number
): number {
  const raw =
    scaleIndex    * FL.W_SC_SCALE    +
    stabilityIndex * FL.W_SC_STABILITY +
    chiScore       * FL.W_SC_CHI;
  return r1(clamp(raw, 0, 100));
}

// ── COMPONENT 2: BudgetEfficiency (scenario-sensitive) ───────────────────────
//
//   Previous 3-factor formula used recoveryPressure = BEP/gross clamped 0–1.
//   Bug: when BEP > gross (most realistic T2/T3 scenarios), the ratio > 1 and
//   clamps to 1.0 in ALL scenarios — making budgetEfficiency insensitive to
//   scenario switches.
//
//   New formula uses a direct gross-efficiency score:
//
//     grossEfficiency  = adjustedGross / totalCapital
//                        (how many ₹ of gross per ₹ of capital deployed)
//     exposureRatio    = productionBudget / safeBudget   (overextension risk)
//     stabilityFloor   = stabilityIndex / 100            (actor consistency)
//
//     BudgetEfficiency =
//       clamp(grossEfficiency / ANCHOR × 60, 0, 60)    ← gross-capital ratio (60%)
//       + (1 − exposureRatio) × 25                     ← overextension risk (25%)
//       + stabilityFloor × 15                          ← actor consistency floor (15%)
//
//   ANCHOR = 2.5 → if gross = 2.5× capital, gross-component = 60 (full weight)
//   Calibration for Vijay Deverakonda T2 at ₹100Cr budget:
//     Base gross ≈ 146Cr, capital ≈ 118Cr → ratio 1.24 → gross-component 29.8
//     Weak WOM  ≈  95Cr → ratio 0.80 → gross-component 19.3   ↓ visible drop
//     Strong WOM≈ 197Cr → ratio 1.67 → gross-component 40.2   ↑ visible rise
//     Festival  ≈ 175Cr → ratio 1.48 → gross-component 35.5
//   CVI responds meaningfully to every scenario switch.
// ─────────────────────────────────────────────────────────────────────────────

const EFFICIENCY_ANCHOR = 2.5; // gross/capital ratio at which gross-component = 60

function computeExpectedGross(
  openingCr:        number,
  tier:             1 | 2 | 3,
  productionBudget: number,
  stabilityIndex:   number,   // drives longer theatrical legs for content-driven actors
  maxGross:         number,   // career best — real ceiling (may be Infinity for custom actors)
  budgetTolerance:  number    // proven budget from film history
): number {
  // ── Formula A: opening-anchored (works well for T1/T2 mass heroes) ─────────
  // This formula is ALWAYS used and is always finite (depends only on openingCr).
  const baseline = Math.max(openingCr, 1);
  const elasticityFactor = clamp(
    1 + Math.log(productionBudget / baseline) * 0.15,
    0.70,
    1.50
  );
  const baseMultiplier = THEATRICAL_MULTIPLIER[tier];
  const adjustedMultiplier = Math.min(baseMultiplier + (stabilityIndex * 0.015), 4.5);
  const openingAnchoredGross = openingCr * adjustedMultiplier * elasticityFactor;

  // ── Custom actor guard: skip Formula B when maxGross is Infinity ─────────────
  // Formula B computes: maxGross × pow(budgetRatio, 0.6)
  // When maxGross = Infinity (custom actor mode, no film history), this produces
  // Infinity × finite = Infinity, which then propagates through baseExpectedGross
  // → profitBudget → profitBudgetWithStreams → scenario P&L, printing ₹InfinityCr
  // everywhere in the UI.
  // Fix: when there is no film history ceiling, only use Formula A.
  // Formula A (opening-anchored) is the correct model for custom actors anyway —
  // their opening estimate IS their commercial input; there is no career-best cap.
  if (!isFinite(maxGross) || maxGross <= 0) {
    return r1(openingAnchoredGross);
  }

  // ── Formula B: budgetTolerance-anchored (works for content/WOM actors) ──────
  // At budget = budgetTolerance, actor has proven ability to reach maxGross.
  // Scale sub-linearly below that: grossAtBudget = maxGross × (budget/tolerance)^0.6
  // This respects actors like Adivi Sesh where openingCr is small but maxGross is real.
  const budgetRatio = productionBudget / Math.max(budgetTolerance, 1);
  const toleranceAnchoredGross = maxGross * Math.pow(clamp(budgetRatio, 0.1, 2.0), 0.6);

  // ── Stability cap: prevents breakout outliers from anchoring every projection ─
  // A volatile actor (low STI) who hit once should not project career-best every time.
  // stabilityGrossCap = maxGross × (stabilityIndex / 100)
  // Example: Ram maxGross=75, STI=61.5 → cap=46Cr. iSmart outlier can't dominate.
  const stabilityGrossCap = maxGross * (stabilityIndex / 100);

  // ── Take the higher estimate, then cap at stability ceiling ───────────────────
  // Why max? For T1 mass heroes, Formula A is correct (their opening IS their power).
  // For content actors, Formula B correctly uses their proven ceiling.
  // max() means whichever formula better represents the actor's real upside wins.
  const rawGross = Math.max(openingAnchoredGross, toleranceAnchoredGross);
  return r1(Math.min(rawGross, stabilityGrossCap));
}

function computeBudgetEfficiency(
  adjustedGross:    number,   // expectedGross after scenario multiplier
  totalCapital:     number,   // productionBudget + heroRemuneration + P&A
  productionBudget: number,
  safeBudget:       number,
  stabilityIndex:   number
): number {
  const grossRatio       = adjustedGross / Math.max(totalCapital, 1);
  const grossComponent   = clamp((grossRatio / EFFICIENCY_ANCHOR) * 60, 0, 60);
  // ── CRITICAL: do NOT clamp exposureRatio to 1.0 ──────────────────────────
  // Clamping caused ANY budget ≥ stressSafeBudget to score identically (0pts),
  // making CVI flat across all over-budget scenarios. 
  // Unclamped: at 1.3× SSB → -7.5pt penalty; at 2× SSB → -25pt penalty.
  const exposureRatio    = productionBudget / Math.max(safeBudget, 1); // no upper clamp
  const raw =
    grossComponent +
    (1 - exposureRatio) * 25 +   // negative when budget > safeBudget
    (stabilityIndex / 100) * 15;
  return r1(clamp(raw, 0, 100));
}

// ── COMPONENT 3: DistributionStrength ────────────────────────────────────────
//   Direct lookup 0–100 from DISTRIBUTION_STRENGTH table.
//   Already 0–100, no normalization needed.
// ─────────────────────────────────────────────────────────────────────────────

// ── COMPONENT 4: GenreDemand ──────────────────────────────────────────────────
//   Direct lookup 0–100 from GENRE_DEMAND table.
// ─────────────────────────────────────────────────────────────────────────────

// ── PRIMARY SCORE: FilmSuccessScore ──────────────────────────────────────────
//
//   FilmSuccessScore =
//     StarCapital          × 0.35
//     + BudgetEfficiency   × 0.30
//     + DistributionStrength × 0.20
//     + GenreDemand        × 0.15
// ─────────────────────────────────────────────────────────────────────────────
function computeFilmSuccessScore(
  starCapital:          number,
  budgetEfficiency:     number,
  distributionStrength: number,
  genreDemand:          number
): number {
  const raw =
    starCapital          * FL.W_STAR_CAPITAL          +
    budgetEfficiency     * FL.W_BUDGET_EFFICIENCY     +
    distributionStrength * FL.W_DISTRIBUTION_STRENGTH +
    genreDemand          * FL.W_GENRE_DEMAND;
  return r1(clamp(raw, 0, 100));
}

// ── ROI BAND ─────────────────────────────────────────────────────────────────
//   Derived from FilmSuccessScore and tier.
//   Score maps to a gross ROI band range for the producer.
// ─────────────────────────────────────────────────────────────────────────────
function computeROIBand(
  score: number,
  tier: 1 | 2 | 3
): { low: number; high: number; label: string } {
  // Base bands per tier (× gross ROI on production budget)
  const tierBase: Record<1 | 2 | 3, { floor: number; ceil: number }> = {
    1: { floor: 1.0, ceil: 8.0 },
    2: { floor: 0.8, ceil: 5.5 },
    3: { floor: 0.6, ceil: 4.0 },
  };

  const { floor, ceil } = tierBase[tier];
  const t = score / 100; // 0–1 position within score range

  // Low band: lerp from floor to (floor+ceil)/2
  const midPoint = (floor + ceil) / 2;
  const low  = r2(floor  + t * (midPoint - floor));
  const high = r2(midPoint + t * (ceil - midPoint));

  let label: string;
  if (score >= 80) label = "Exceptional Return";
  else if (score >= 65) label = "Strong Return";
  else if (score >= 50) label = "Moderate Return";
  else if (score >= 35) label = "Marginal Return";
  else label = "Capital Risk";

  return { low, high, label };
}

// ── CAPITAL EXPOSURE RISK ─────────────────────────────────────────────────────
//   Labels: Safe → Watch → Exposed → Critical
//   Based on how comfortably expected gross clears break-even gate.
// ─────────────────────────────────────────────────────────────────────────────
function computeCapitalExposureRisk(
  expectedGross:  number,
  breakEvenGross: number,
  score:          number
): "Safe" | "Watch" | "Exposed" | "Critical" {
  const coverage = expectedGross / Math.max(breakEvenGross, 1);
  if (coverage >= 3.0 && score >= 65) return "Safe";
  if (coverage >= 1.8 && score >= 50) return "Watch";
  if (coverage >= 1.0)                return "Exposed";
  return "Critical";
}

// ── DOWNSIDE PROBABILITY ──────────────────────────────────────────────────────
//   ALIGNED WITH SIGNAL ENGINE v5.
//   P(producer fails to recover full capital) = 1 - P(full capital recovery)
//
//   Signal formula:
//     recoveryStrain = fullRecoveryGross / projectedGross
//                    (how hard it is to actually earn back deployed capital)
//     rawBEP = exp(-strain × normalizedDvol × BEP_K)
//     stabilityFloor = (scaleIndex×0.3 + stabilityIndex×0.7) / 100 × 0.80
//     blended = rawBEP×0.6 + stabilityFloor×0.4
//     breakEvenProb = clamp(blended×100, 10, 97)
//     downsideProbability = 100 - breakEvenProb
//
//   This directly answers "P(capital loss)" using actor volatility and
//   the actual capital recovery gap — not a CVI score proxy.
// ─────────────────────────────────────────────────────────────────────────────
const BEP_K = 1.2; // Signal's exponential decay constant

function computeDownsideProbability(
  score:          number,   // kept as parameter for backward compat but not used
  tier:           1 | 2 | 3,
  // New Signal-aligned inputs:
  expectedGross:  number,
  totalCapital:   number,
  dvolPct:        number,   // 0–100 normalized downside vol from EngineResult
  scaleIndex:     number,
  stabilityIndex: number,
  distribution:   string
): number {
  // fullRecoveryGross = capital we need to earn back (at actual distribution share)
  const distShareDP = getDistShare(distribution as Distribution);
  const fullRecoveryGross = totalCapital / distShareDP;
  // recoveryStrain: > 1 means projected gross can't cover full recovery
  const recoveryStrain = fullRecoveryGross / Math.max(expectedGross, 1);
  // Dist reduction no longer needed — share is now exact per distribution strategy
  const strain = Math.max(recoveryStrain, 0.01);
  // Normalize dvolPct → 0–1 range for Signal formula
  const normalizedDvol = dvolPct / 100;
  const rawBEP = Math.exp(-strain * normalizedDvol * BEP_K);
  const stabilityFloor = (scaleIndex * 0.3 + stabilityIndex * 0.7) / 100 * 0.80;
  const blended = rawBEP * 0.6 + stabilityFloor * 0.4;
  const breakEvenProb = clamp(blended * 100, 10, 97);
  return r1(100 - breakEvenProb);
}

// ── CAPITAL AT RISK ───────────────────────────────────────────────────────────
//   The bug with base-case capitalROI: when BASE gross clears capital, severity=0
//   even at high budgets — producing ₹0-1Cr for every budget level (wrong).
//
//   Fix: use a volatility-discounted STRESS gross to compute the expected
//   capital shortfall. stressGross = expectedGross × (1 - normalizedDvol × 0.8)
//   This represents the realistic downside scenario for a given actor's volatility.
//
//   capitalAtRisk = missProbability × max(totalCapital - stressShare, 0)
//   where stressShare = stressGross × 0.40
//
//   At higher budgets → totalCapital grows → deficit grows → capitalAtRisk grows ✓
//   At lower budgets → deficit may be 0 → capitalAtRisk = 0 (genuinely safe) ✓
// ─────────────────────────────────────────────────────────────────────────────
function computeCapitalAtRisk(
  totalCapital:      number,
  downsideProb:      number,
  expectedGross:     number,
  breakEvenGross:    number,
  capitalROI:        number,
  dvolPct:           number,   // actor volatility — drives stress scenario depth
  distribution:      Distribution = "Regional"  // determines producer share rate
): number {
  const missProbability = downsideProb / 100;
  const normalizedDvol  = dvolPct / 100;
  // Stress gross: expected gross discounted by actor volatility
  // Higher dvolPct → deeper stress cut → more realistic downside
  const stressGross   = expectedGross * (1 - normalizedDvol * 0.8);
  const distShareCAR  = getDistShare(distribution);
  const stressShare   = stressGross * distShareCAR;
  const stressDeficit = Math.max(totalCapital - stressShare, 0);
  // capitalAtRisk: probability-weighted stress capital shortfall
  // Floor: always at least 1% of capital × missProb so it's never literally ₹0
  const capitalAtRisk = missProbability * stressDeficit;
  const floor = totalCapital * 0.01 * missProbability;
  return r1(Math.max(capitalAtRisk, floor));
}

// ── SCENARIO PANEL ───────────────────────────────────────────────────────────
//
//  3-outcome profit/loss view anchored to actor's actual film history.
//  Anchors: worst comparable film → Stress, median → Base, best → Upside.
//  Probabilities: derived from real loss/profit film count (not assumed 25/50/25).
//  Stability cap: upside gross bounded by maxGross × (stabilityIndex/100).
//
//  scenarioMultiplier: the LEFT-SIDE market condition selector (Base/WOM/Festival).
//  It is applied as a uniform overlay across ALL THREE scenario rows so that
//  selecting "Strong WOM" visibly lifts Stress, Base, AND Upside simultaneously.
//  Caps scale with the multiplier to prevent them suppressing the overlay effect.
//
//  pureBaseExpectedGross: the actor's median-form gross at this budget, PRE-scenario.
//  This separates film-history anchoring (actor spread) from market condition (overlay).
// ─────────────────────────────────────────────────────────────────────────────
function computeScenarioPanel(
  actorName:             string,
  maxGross:              number,
  stabilityIndex:        number,
  dvolPct:               number,
  lossFilmCount:         number,
  filmCount:             number,
  pnaRate:               number,
  pureBaseExpectedGross: number,   // ← pure pre-scenario gross (actor's median form)
  scenarioMultiplier:    number,   // ← legacy param (1.0 — kept for future use)
  actualTotalCapital:    number,   // ← user's actual capital (budget + hero + P&A)
  recoveryTotal:         number,   // ← sum of all non-theatrical streams
  distribution:          Distribution,  // ← determines producer share ratio (42/38/36%)
  marketCondMult:        number = 1.0   // ← buzz × timing × friction — applied to UPSIDE only
): ScenarioPanelResult {

  // ── Guard against Infinity maxGross (Custom Actor mode) ──────────────────────
  // Custom actors have no film history → maxGross = Infinity.
  // Use a finite proxy: 3× pure base gross so ceilings are meaningful.
  const effectiveMaxGross = isFinite(maxGross) && maxGross > 0
    ? maxGross
    : Math.max(pureBaseExpectedGross * 3, 50);

  // ── 1. Stress-Safe Budget (kept for reference display only) ──────────────────
  const volatilityBuffer = dvolPct === 0
    ? 1.0
    : 1 / (1 - Math.min((dvolPct / 100) * 0.8, 0.95));
  const stressSafeBudget  = Math.round((effectiveMaxGross * getDistShare(distribution)) / ((1 + pnaRate) * volatilityBuffer));
  const totalCapitalAtSSB = Math.round(stressSafeBudget * (1 + pnaRate));

  // ── 2. Stability gross cap ────────────────────────────────────────────────────
  const stabilityGrossCap = Math.round(effectiveMaxGross * (stabilityIndex / 100));
  const stabilityCapApplied = stabilityGrossCap < effectiveMaxGross;

  // ── 3. Film history ROI anchors → derive RELATIVE multipliers ────────────────
  // ROI multipliers from film history express the SPREAD of outcomes.
  // We anchor them to pureBaseExpectedGross so that:
  //   Base case   = pure base × scenarioMultiplier         (median film under market cond.)
  //   Stress case = pure base × stressMult × scenarioMult  (underperformance under mkt cond.)
  //   Upside case = pure base × upsideMult × scenarioMult  (outperformance under mkt cond.)
  const rawActor = actorRegistry.find(a => a.name === actorName);
  const films = rawActor?.films ?? [];

  const filmROIs = films.map(f => ({
    title:  f.title,
    roi:    f.grossCr / Math.max(f.budgetCr, 1),
    gross:  f.grossCr,
    budget: f.budgetCr,
  })).sort((a, b) => a.roi - b.roi);

  const worst  = filmROIs[0];
  const median = filmROIs[Math.floor(filmROIs.length / 2)];
  const best   = filmROIs[filmROIs.length - 1];

  // Fallback ROIs if no films (custom actor)
  const stressROI = worst  ? r2(worst.roi)  : 0.60;
  const baseROI   = median ? r2(median.roi) : 1.20;
  const upsideROI = best   ? r2(best.roi)   : 2.50;

  // Relative multipliers vs median (base = 1.0 by definition)
  const stressMult = stressROI / Math.max(baseROI, 0.01);
  const upsideMult = upsideROI / Math.max(baseROI, 0.01);

  // ── Apply scenario multiplier to BASE and STRESS rows (film-history spread preserved) ─
  // Market conditions (buzz × timing × friction) apply ONLY to the upside row.
  // Reasoning:
  //   Stress row  = actor's worst-ever film outcome → market conditions don't rescue a bad film
  //   Base row    = actor's median form → neutral baseline, not boosted by optimism
  //   Upside row  = actor's best form UNDER selected conditions → legitimately scales up with
  //                 Event Film buzz, Festival timing, and favorable market
  const rawStressGross = Math.round(pureBaseExpectedGross * stressMult * scenarioMultiplier);
  const rawBaseGross   = Math.round(pureBaseExpectedGross * scenarioMultiplier);
  // Upside: film-history best × market conditions multiplier (buzz × timing × friction)
  // Only scale UP (favorable conditions). High Friction compresses the upside too.
  const rawUpsideGross = Math.round(pureBaseExpectedGross * upsideMult * scenarioMultiplier * marketCondMult);

  // Scale ceilings: upside ceiling expands under favorable market conditions
  const scenarioStabilityCap = Math.round(stabilityGrossCap * Math.max(scenarioMultiplier, 1.0));
  const scenarioMaxGross     = Math.round(effectiveMaxGross  * Math.max(scenarioMultiplier * marketCondMult, 1.0));

  // Apply stability cap correctly per scenario meaning:
  //   stress = no cap (already conservative)
  //   base   = capped at scenarioStabilityCap (expected form, stability-adjusted)
  //   upside = capped at scenarioMaxGross (career ceiling under the market condition)
  const stressGross = rawStressGross;
  const baseGross   = Math.min(rawBaseGross,   scenarioStabilityCap);
  const upsideGross = Math.min(rawUpsideGross, scenarioMaxGross);

  // Producer share (40% of gross) and P&L vs USER'S ACTUAL capital
  const distShare   = getDistShare(distribution);
  const stressShare = Math.round(stressGross  * distShare);
  const baseShare   = Math.round(baseGross    * distShare);
  const upsideShare = Math.round(upsideGross  * distShare);

  // ── P&L = what producer actually gets vs what they invested ──────────────────
  // Recovery streams (OTT, satellite, overseas, audio) are fixed deal amounts —
  // they don't change based on theatrical performance, so they reduce net loss
  // equally across all three scenarios.
  const stressPL = Math.round(stressShare - actualTotalCapital + recoveryTotal);
  const basePL   = Math.round(baseShare   - actualTotalCapital + recoveryTotal);
  const upsidePL = Math.round(upsideShare - actualTotalCapital + recoveryTotal);

  // ── 4. Probabilities from actual film outcomes ────────────────────────────────
  // Loss films (ROI < 1.0) → stress probability
  // Remaining split proportionally between base and upside.
  // Smoothed slightly: min 10% per scenario so no band disappears entirely.
  const totalFilms    = Math.max(filmCount, 1);
  const lossPct       = Math.round(Math.max((lossFilmCount / totalFilms) * 100, 10));
  const profitFilms   = totalFilms - lossFilmCount;

  // Split profitable films: lower half → base, upper half → upside
  const baseFilms   = Math.ceil(profitFilms / 2);
  const upsideFilms = profitFilms - baseFilms;
  const remainPct   = 100 - lossPct;
  const basePct     = Math.round((baseFilms / Math.max(profitFilms, 1)) * remainPct);
  const upsidePct   = 100 - lossPct - basePct;

  // Anchor film names for UI transparency
  const stressAnchor = worst  ? worst.title  : "Historical low";
  const baseAnchor   = median ? median.title : "Median performance";
  const upsideAnchor = best   ? best.title   : "Career best";

  const stress: ScenarioCase = {
    label: "Stress", filmAnchor: stressAnchor, roiMultiplier: stressROI,
    gross: stressGross, producerShare: stressShare,
    profitLoss: stressPL, probability: lossPct, isProfitable: stressPL > 0,
  };
  const base: ScenarioCase = {
    label: "Base", filmAnchor: baseAnchor, roiMultiplier: baseROI,
    gross: baseGross, producerShare: baseShare,
    profitLoss: basePL, probability: basePct, isProfitable: basePL > 0,
  };
  const upside: ScenarioCase = {
    label: "Upside", filmAnchor: upsideAnchor, roiMultiplier: upsideROI,
    gross: upsideGross, producerShare: upsideShare,
    profitLoss: upsidePL, probability: upsidePct, isProfitable: upsidePL > 0,
  };

  return {
    stressSafeBudget,
    totalCapitalAtSSB,
    stress,
    base,
    upside,
    capitalLossProbability:  lossPct,
    fullRecoveryProbability: 100 - lossPct,
    stabilityCapApplied,
    stabilityGrossCap,
  };
}

// ── MAIN EXPORT: computeFilmLab ───────────────────────────────────────────────
export function computeFilmLab(input: FilmLabInput): FilmLabResult {
  // ── 1. Resolve actor metrics (from engine or manual override) ─────────────
  let scaleIndex:       number;
  let stabilityIndex:   number;
  let chiScore:         number;
  let tier:             1 | 2 | 3;
  let openingCr:        number;
  let openingBase:      number;
  let dvolPct:          number;
  let maxGross:         number;
  let budgetTolerance:  number;

  if (input.useManualOverride || !input.actorName) {
    scaleIndex      = input.manualScaleIndex;
    stabilityIndex  = input.manualStabilityIndex;
    chiScore        = input.manualChiScore;
    tier            = input.manualTier;
    const TIER_OPENING_FLOORS: Record<1|2|3, number> = { 1: 20, 2: 10, 3: 3 };
    openingCr       = Math.max(input.manualOpeningCr, TIER_OPENING_FLOORS[input.manualTier]);
    openingBase     = Math.max(input.manualOpeningCr * 0.55, TIER_OPENING_FLOORS[input.manualTier]);
    dvolPct         = 50;
    maxGross        = Infinity;
    budgetTolerance = input.productionBudget;
  } else {
    const profile = getActorProfile(input.actorName);
    if (!profile) throw new Error(`Actor not found: ${input.actorName}`);
    scaleIndex      = profile.scaleIndex;
    stabilityIndex  = profile.stabilityIndex;
    chiScore        = profile.chiScore;
    tier            = profile.tier as 1 | 2 | 3;
    openingCr       = profile.openingCr;
    // Era-normalized opening base: apply ticket-price inflation per film year,
    // then compute median of non-event films. Falls back to stored openingBase.
    const rawActorData = actorRegistry.find(a => a.name === input.actorName);
    const openingFilmsData = (rawActorData as any)?.openingFilms ?? [];
    openingBase     = computeEraAdjustedOpeningBase(
      openingFilmsData,
      (rawActorData as any)?.openingCeiling ?? profile.openingCr,
      profile.openingBase ?? Math.round(profile.openingCr * 0.5)
    );
    dvolPct         = profile.dvolPct;
    maxGross        = profile.maxGross;
    budgetTolerance = profile.budgetTolerance;
  }

  // ── Film Category multiplier ─────────────────────────────────────────────
  const filmCategory         = input.filmCategory ?? "Normal";
  const filmCategoryMult     = FILM_CATEGORY_MULTIPLIERS[filmCategory];
  const rawActorForCeiling   = actorRegistry.find(a => a.name === input.actorName);
  const openingCeiling       = (rawActorForCeiling as any)?.openingCeiling ?? openingCr;

  // ── 4-selector Market Conditions → Opening formula ────────────────────────
  // Opening = openingBase × filmCategoryMult × buzzMult(tier) × timingMult × frictionMult
  // These multipliers apply to the OPENING DAY projection only.
  // P&L gross (expectedGross, producerShare) stays anchored to actor film history —
  // conservative and defensible to producers.
  const buzz         = (input.preReleaseBuzz ?? "Normal")  as PreReleaseBuzz;
  const timing       = (input.releaseTiming  ?? "Normal")  as ReleaseTiming;
  const friction     = (input.marketFriction ?? "Normal")  as MarketFriction;
  const wom          = (input.womScenario    ?? "Average") as WOMScenario;

  const buzzMult     = BUZZ_MULTIPLIER[buzz][tier as 1 | 2 | 3];
  const timingMult   = TIMING_MULTIPLIER[timing];
  const frictionMult = FRICTION_MULTIPLIER[friction];

  const effectiveOpeningDay1 = Math.min(
    r1(openingBase * filmCategoryMult * buzzMult * timingMult * frictionMult),
    openingCeiling
  );

  // WOM-derived lifetime (theatrical run anchors to this, not P&L gross)
  const womDayWeightsForLifetime = getDayWeights(wom);
  const openingWeek1ForLifetime  = r1(effectiveOpeningDay1 / womDayWeightsForLifetime[0].pctOfW1);
  const openingDerivedLifetime   = r1(openingWeek1ForLifetime / WEEK_WEIGHTS[0]);

  // ── 2. P&A and total capital ──────────────────────────────────────────────
  const pnaRate          = DISTRIBUTION_META[input.distribution].pnaMultiplier;
  const pnaCost          = r1(input.productionBudget * pnaRate);
  const heroRemuneration = r1(input.heroRemuneration ?? 0);
  const totalCapital     = r1(input.productionBudget + heroRemuneration + pnaCost);

  // ── 3. Gross projection (budget-elastic, capped at actor's career best) ───
  const rawBaseExpectedGross = computeExpectedGross(openingCr, tier, input.productionBudget, stabilityIndex, maxGross, budgetTolerance);
  const baseExpectedGross = r1(isFinite(maxGross) && maxGross > 0
    ? Math.min(rawBaseExpectedGross, maxGross)
    : rawBaseExpectedGross
  );

  // ── 3a. P&L Gross — conservative, anchored to actor film history ──────────
  // scenarioMultiplier = 1.0: market conditions affect opening/curve, not gross.
  const scenarioMultiplier = 1.0;
  const expectedGross      = baseExpectedGross;
  const projectedNett      = r1(expectedGross * 0.82);
  const distShare          = getDistShare(input.distribution);
  const producerShare      = r1(expectedGross * distShare);

  // ── 3b. Recovery streams — computed early so risk metrics are streams-aware ─
  const rec0 = input.recovery ?? { overseasRights: 0, ottRights: 0, satelliteRights: 0, audioRights: 0 };
  const recoveryStreamsTotal = r1(
    (rec0.overseasRights  ?? 0) +
    (rec0.ottRights       ?? 0) +
    (rec0.satelliteRights ?? 0) +
    (rec0.audioRights     ?? 0)
  );

  // ── 3c. Profit Budget — what budget lets base gross return a profit? ──────
  // profitBudget = (0.40 × baseExpectedGross - heroRemuneration) / (1 + pnaRate)
  const profitBudget = Math.max(
    Math.round((baseExpectedGross * distShare - heroRemuneration) / (1 + pnaRate)),
    0
  );
  // effectiveCapital = what theatrical revenue still needs to cover after streams are booked
  const effectiveCapital = Math.max(totalCapital - recoveryStreamsTotal, 0);

  // ── 4. Break-even gross ───────────────────────────────────────────────────
  // Theatrical break-even (no streams) — used for "Recovery Gate" display
  const breakEvenGross = r1(totalCapital / distShare);
  // Effective break-even (streams reduce the gap) — used for loss probability
  const effectiveBreakEven = r1(effectiveCapital / distShare);

  // ── 5. Capital ROI ────────────────────────────────────────────────────────
  const capitalROI = r2(producerShare / Math.max(totalCapital, 1));

  // ── 6. FilmSuccessScore components ───────────────────────────────────────
  const starCapital = computeStarCapital(scaleIndex, stabilityIndex, chiScore);

  const safeBudget = r1(openingCr * SAFE_BUDGET_MULTIPLIER[tier]);

  const budgetEfficiency = computeBudgetEfficiency(
    expectedGross,
    totalCapital,
    input.productionBudget,
    safeBudget,
    stabilityIndex
  );

  const distributionStrength = DISTRIBUTION_STRENGTH[input.distribution];
  const genreDemand          = GENRE_DEMAND[input.genre];

  const filmSuccessScore = computeFilmSuccessScore(
    starCapital,
    budgetEfficiency,
    distributionStrength,
    genreDemand
  );

  // ── 7. ROI Band ───────────────────────────────────────────────────────────
  const roi = computeROIBand(filmSuccessScore, tier);

  // ── 8. Risk outputs — Signal-aligned formulas ─────────────────────────────
  const capitalExposureRisk = computeCapitalExposureRisk(
    expectedGross,
    effectiveBreakEven,   // ← streams-adjusted: coverage improves when streams are booked
    filmSuccessScore
  );

  const downsideProbability = computeDownsideProbability(
    filmSuccessScore,
    tier,
    expectedGross,
    effectiveCapital,     // ← streams-adjusted: loss prob drops when streams reduce net gap
    dvolPct,
    scaleIndex,
    stabilityIndex,
    input.distribution
  );

  const capitalAtRisk = (() => {
    const raw = computeCapitalAtRisk(
      effectiveCapital,       // ← streams already booked, less at true risk
      downsideProbability,
      expectedGross,
      effectiveBreakEven,     // ← streams-adjusted gate
      capitalROI,
      dvolPct,
      input.distribution      // ← use actual distribution share, not hardcoded Regional
    );
    // Guard against Infinity maxGross (Custom Actor): use baseExpectedGross * 3 as proxy
    const safeMaxGross = isFinite(maxGross) && maxGross > 0
      ? maxGross
      : baseExpectedGross * 3;
    const volatilityBuffer = dvolPct === 0 ? 1.0 : 1 / (1 - Math.min((dvolPct / 100) * 0.8, 0.95));
    const stressSafeBudgetEst = Math.round((safeMaxGross * getDistShare(input.distribution)) / ((1 + pnaRate) * volatilityBuffer));
    const isBaseScenario = (input.womScenario ?? "Average") === "Average"
                        && (input.preReleaseBuzz ?? "Normal") === "Normal";
    return (input.productionBudget <= stressSafeBudgetEst && isBaseScenario) ? 0 : raw;
  })();

  // ── 9. Band classification ────────────────────────────────────────────────
  const band      = scoreBand(filmSuccessScore);
  const bandColor = BAND_COLOR[band];

  // ── 10. Scenario Panel ────────────────────────────────────────────────────
  // ── Market Conditions multiplier for Scenario Panel upside row ───────────
  // buzz × timing × friction → applied only to upside (not stress/base)
  // This makes the "upside" row respond to favorable pre-release conditions.
  const marketCondMult = r2(buzzMult * timingMult * frictionMult);

  // FIX: Pass baseExpectedGross (pre-scenario) + marketCondMult SEPARATELY.
  // Stress/Base rows stay anchored to film history (conservative P&L).
  // Upside row scales with market conditions (Event Film + Festival = legitimate upside).
  const profile2 = (!input.useManualOverride && input.actorName)
    ? getActorProfile(input.actorName)
    : null;
  // recoveryStreamsTotal already computed early (before risk metrics) — reused here
  const scenarioPanel: ScenarioPanelResult = (!input.useManualOverride && input.actorName && profile2)
    ? computeScenarioPanel(
        input.actorName,
        maxGross,
        stabilityIndex,
        dvolPct,
        profile2.lossFilmCount,
        profile2.filmCount,
        pnaRate,
        baseExpectedGross,
        scenarioMultiplier,
        totalCapital,
        recoveryStreamsTotal,
        input.distribution,
        marketCondMult
      )
    : computeScenarioPanel(
        "",
        Math.round(baseExpectedGross / Math.max(stabilityIndex / 100, 0.30)),
        stabilityIndex,
        dvolPct,
        2, 5,
        pnaRate,
        baseExpectedGross,
        scenarioMultiplier,
        totalCapital,
        recoveryStreamsTotal,
        input.distribution,
        marketCondMult
      );

  return {
    starCapital,
    budgetEfficiency,
    distributionStrength,
    genreDemand,
    filmSuccessScore,

    scaleIndex,
    stabilityIndex,
    chiScore,

    expectedGross,
    projectedNett,
    producerShare,

    totalCapital,
    pnaCost,
    heroRemuneration,
    breakEvenGross,         // theatrical-only gate (for Recovery Gate tile)
    effectiveBreakEven,     // streams-adjusted gate (for context display)
    recoveryStreamsTotal,    // total non-theatrical booked streams
    profitBudget,           // max production budget where base gross returns profit (theatrical)
    profitBudgetWithStreams: Math.max(  // same but with streams reducing the gap
      Math.round((baseExpectedGross * distShare + recoveryStreamsTotal - heroRemuneration) / (1 + pnaRate)),
      0
    ),
    capitalROI,

    roiBandLow:  roi.low,
    roiBandHigh: roi.high,
    roiBandLabel: roi.label,

    capitalExposureRisk,
    downsideProbability,
    capitalAtRisk,

    band,
    bandColor,

    tier,
    theatricalMultiplier: THEATRICAL_MULTIPLIER[tier],
    adjustedMultiplier:   Math.min(
      THEATRICAL_MULTIPLIER[tier] + (stabilityIndex * 0.015),
      4.5
    ),
    scenario:             wom,   // WOM label used for day curve title in UI
    scenarioMultiplier,
    baseExpectedGross,
    openingCr,
    openingBase,
    openingCeiling,
    openingMedian: (rawActorForCeiling as any)?.openingMedian ?? openingBase,
    filmCategory,
    filmCategoryMultiplier: filmCategoryMult,
    effectiveOpeningDay1,

    // ── Market Conditions outputs ─────────────────────────────────────────────
    preReleaseBuzz:       buzz,
    releaseTiming:        timing,
    marketFriction:       friction,
    womScenario:          wom,
    buzzMultiplier:       buzzMult,
    timingMultiplier:     timingMult,
    frictionMultiplier:   frictionMult,
    marketCondMult,
    openingDerivedLifetime,

    // ── Recovery streams (non-theatrical, do NOT affect CVI) ─────────────────
    ...(() => {
      const rec = input.recovery ?? { overseasRights: 0, ottRights: 0, satelliteRights: 0, audioRights: 0 };
      const theatrical  = r1(producerShare);
      const overseas    = r1(rec.overseasRights);
      const ott         = r1(rec.ottRights);
      const satellite   = r1(rec.satelliteRights);
      const audio       = r1(rec.audioRights);
      const totalRecovery = r1(theatrical + overseas + ott + satellite + audio);
      const trueROI       = r2(totalRecovery / Math.max(totalCapital, 1));
      return {
        totalRecovery,
        trueROI,
        recoveryBreakdown: { theatrical, overseas, ott, satellite, audio },
      };
    })(),

    scenarioPanel,

    theatricalRun: computeTheatricalRunModel(
      expectedGross,
      totalCapital,
      THEATRICAL_MULTIPLIER[tier],
      openingCr,
      recoveryStreamsTotal,
      effectiveOpeningDay1,
      input.distribution,
      wom    // WOMScenario drives daily decay curve + 2nd-weekend pattern
    ),
  };
}

// ── FEATURE 1: Budget Danger Meter ───────────────────────────────────────────
//
//  safeBudget (Star Budget Ceiling) = actor's budgetTolerance from film history
//  This is the budget at which they have actually produced their best gross.
//  Previously used openingCr × tier_multiplier, which broke for content actors
//  with small openings (e.g. Adivi Sesh: 8 × 2 = ₹16Cr, but Major was ₹32Cr).
//
//  dangerRatio  = productionBudget ÷ safeBudget
//
//  Classifications:
//    < 0.60 → Safe Zone
//    0.60–0.90 → Controlled
//    0.90–1.20 → Elevated Risk
//    > 1.20 → Danger Zone
// ─────────────────────────────────────────────────────────────────────────────
export function computeBudgetDanger(
  productionBudget: number,
  openingCr:        number,
  tier:             1 | 2 | 3,
  stressSafeBudget: number,     // actor's stress-safe ceiling (production only)
  heroRemuneration: number,     // hero fee — increases total exposure
): BudgetDangerResult {
  // ── Safe reference = stressSafeBudget (production) + hero ────────────────
  // dangerRatio = totalBudget / (SSB + hero)
  // At SSB with same hero: ratio=1.0 → Elevated Risk (correctly warns)
  // Below SSB with no hero: ratio<0.8 → Controlled or Safe
  // Hero always included because it's real capital at risk
  const tierMult    = SAFE_BUDGET_MULTIPLIER[tier];
  const safeTotal   = r1(stressSafeBudget + heroRemuneration);  // hero-inclusive safe ceiling
  const totalBudget = r1(productionBudget  + heroRemuneration); // hero-inclusive spend
  const dangerRatio = r2(totalBudget / Math.max(safeTotal, 1));

  let dangerZone: DangerZone;
  if      (dangerRatio < 0.70) dangerZone = "Safe Zone";
  else if (dangerRatio < 1.00) dangerZone = "Stretched";
  else if (dangerRatio <= 1.30) dangerZone = "At Risk";
  else                          dangerZone = "Exposed";

  const dangerPct = r1(Math.min((dangerRatio / 1.5) * 100, 100));
  const safeBudget = stressSafeBudget; // expose for UI labeling

  return {
    safeBudget,
    dangerRatio,
    dangerZone,
    dangerColor:    DANGER_COLORS[dangerZone],
    dangerPct,
    recommendedMin: r1(safeBudget * 0.75),
    recommendedMax: safeBudget,
    tierMultiplier: tierMult,
  };
}

// ── FEATURE 2: Star-Swap Simulation ──────────────────────────────────────────
//
//  For each tier, selects the highest-scaleIndex actor as tier representative.
//  Computes for each:
//    expectedGross = openingCr × THEATRICAL_MULTIPLIER[tier]
//    grossROI      = expectedGross ÷ productionBudget  (gross on production budget)
//    dangerZone    = via computeBudgetDanger
//
//  The currently selected actor is included in their own tier slot and
//  flagged as isCurrent=true for UI highlighting.
//  Excludes manual-override mode (no actor name available).
// ─────────────────────────────────────────────────────────────────────────────
// Fixed capital anchors — stable reference actors per tier.
// These do not change based on scaleIndex or any dynamic sort.
const TIER_REFERENCE_ACTORS: Record<1 | 2 | 3, string> = {
  1: "Allu Arjun",
  2: "Nani",
  3: "Nikhil Siddhartha",
};

export function computeStarSwap(
  productionBudget: number,
  currentActorName: string | null
): StarSwapResult {
  const all = getActorProfiles();
  const rows: SwapRow[] = [];

  for (const t of [1, 2, 3] as const) {
    const referenceName = TIER_REFERENCE_ACTORS[t];

    // Always use the fixed reference actor for this tier.
    // If the current actor happens to be the reference, flag isCurrent.
    const rep = all.find((a) => a.name === referenceName);
    if (!rep) continue; // skip silently if actor missing from dataset

    const expectedGross = r1(rep.openingCr * THEATRICAL_MULTIPLIER[t]);
    const grossROI      = r2(expectedGross / Math.max(productionBudget, 1));
    // Star-swap: no hero remuneration context here — use 0; SSB approximated from rep data
    const swapSSB       = Math.round((rep.maxGross * 0.42) / 1.15); // Regional default
    const danger        = computeBudgetDanger(productionBudget, rep.openingCr, t, swapSSB, 0);

    rows.push({
      actorName:     rep.name,
      tier:          t,
      openingCr:     rep.openingCr,
      expectedGross,
      grossROI,
      dangerZone:    danger.dangerZone,
      dangerColor:   danger.dangerColor,
      isCurrent:     rep.name === currentActorName,
    });
  }

  return { rows, productionBudget };
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 3: Greenlight Verdict
// ══════════════════════════════════════════════════════════════════════════════
//
//  Converts FilmLab's multi-metric output into a single producer decision.
//
//  GreenlightScore = CVI × 0.55 + (100 − downsideProb) × 0.45
//  Clamped 0–100. Weighted toward risk protection since producers are more
//  sensitive to capital loss than to upside potential.
//
//  Verdict thresholds (calibrated against StarsQ dataset):
//    GO   ≥ 68 AND base scenario profitable AND downside ≤ 38%
//    HOLD ≥ 50 AND upside scenario profitable AND downside ≤ 58%
//    PASS  below HOLD thresholds
//
//  Three signal pillars displayed under the verdict:
//    1. Structural Fit  — CVI-derived
//    2. Capital Safety  — downside probability + exposure risk
//    3. Profit Pathway  — how many of the 3 scenarios are profitable
// ──────────────────────────────────────────────────────────────────────────────

export type GreenlightSignal = {
  label:  string;
  status: "positive" | "neutral" | "negative";
  detail: string;
};

export type GreenlightVerdict = {
  verdict:   "CAPITAL SAFE" | "ON REVIEW" | "CAPITAL AT RISK";
  score:     number;           // 0–100 composite
  color:     string;
  bgColor:   string;
  headline:  string;           // one bold sentence
  subline:   string;           // one explanatory sentence
  signals:   GreenlightSignal[];
};

export function computeGreenlightVerdict(
  filmSuccessScore:    number,
  downsideProbability: number,
  capitalExposureRisk: "Safe" | "Watch" | "Exposed" | "Critical",
  baseIsProfitable:    boolean,
  upsideIsProfitable:  boolean,
  stressIsProfitable:  boolean,
  scenario:            string
): GreenlightVerdict {

  // ── Composite score ────────────────────────────────────────────────────────
  const score = r1(clamp(
    filmSuccessScore * 0.55 + (100 - downsideProbability) * 0.45,
    0, 100
  ));

  // ── Profitable scenario count ──────────────────────────────────────────────
  const profitableCount = [stressIsProfitable, baseIsProfitable, upsideIsProfitable]
    .filter(Boolean).length;

  // ── Verdict logic ──────────────────────────────────────────────────────────
  let verdict: "CAPITAL SAFE" | "ON REVIEW" | "CAPITAL AT RISK";
  let headline: string;
  let subline: string;
  let color: string;
  let bgColor: string;

  if (score >= 68 && baseIsProfitable && downsideProbability <= 38) {
    verdict  = "CAPITAL SAFE";
    color    = "#22C55E";
    bgColor  = "rgba(34,197,94,0.08)";
    headline = "Capital is structurally protected at this budget.";
    subline  = profitableCount === 3
      ? "All three scenarios show recovery. Strong capital alignment."
      : "Base and upside scenarios recover capital. Acceptable risk posture.";
  } else if (score >= 50 && upsideIsProfitable && downsideProbability <= 58) {
    verdict  = "ON REVIEW";
    color    = "#FFB800";
    bgColor  = "rgba(255,184,0,0.07)";
    headline = "Viable — but the budget needs tightening or the actor needs above-form delivery.";
    subline  = baseIsProfitable
      ? "Base scenario is profitable. Stress exposure remains. Reduce budget or add streams."
      : "Only upside scenario recovers capital. High dependence on outperformance.";
  } else {
    verdict  = "CAPITAL AT RISK";
    color    = "#FF4D4D";
    bgColor  = "rgba(255,77,77,0.07)";
    headline = "Capital is structurally at risk under current parameters.";
    subline  = profitableCount === 0
      ? "No scenario recovers capital. Budget materially exceeds what this actor supports."
      : "Only the most optimistic scenario recovers capital. Risk-reward is unfavourable.";
  }

  // ── Three signal pillars ───────────────────────────────────────────────────
  const structuralFitStatus: GreenlightSignal["status"] =
    filmSuccessScore >= 65 ? "positive" : filmSuccessScore >= 50 ? "neutral" : "negative";

  const capitalSafetyStatus: GreenlightSignal["status"] =
    downsideProbability <= 30 ? "positive"
    : downsideProbability <= 50 ? "neutral"
    : "negative";

  const profitPathStatus: GreenlightSignal["status"] =
    profitableCount === 3 ? "positive"
    : profitableCount >= 1 ? "neutral"
    : "negative";

  const exposureNote =
    capitalExposureRisk === "Safe"     ? "gross well above recovery gate" :
    capitalExposureRisk === "Watch"    ? "adequate coverage with buffer" :
    capitalExposureRisk === "Exposed"  ? "thin margin above recovery gate" :
                                         "gross below recovery gate";

  const signals: GreenlightSignal[] = [
    {
      label:  "Structural Fit",
      status: structuralFitStatus,
      detail: `CVI ${filmSuccessScore.toFixed(0)}/100 — ${
        filmSuccessScore >= 65 ? "star, budget and distribution aligned" :
        filmSuccessScore >= 50 ? "acceptable fit, budget is the risk lever" :
        "budget exceeds what star's track record supports"
      }`,
    },
    {
      label:  "Capital Safety",
      status: capitalSafetyStatus,
      detail: `${downsideProbability.toFixed(1)}% loss probability · ${exposureNote}`,
    },
    {
      label:  "Profit Pathway",
      status: profitPathStatus,
      detail: profitableCount === 3 ? "Stress · Base · Upside all recover capital"
            : profitableCount === 2 ? `${stressIsProfitable ? "Stress · " : ""}${baseIsProfitable ? "Base · " : ""}${upsideIsProfitable ? "Upside" : ""} recover capital`.trim().replace(/· $/, "")
            : profitableCount === 1 ? "Only upside scenario recovers capital"
            : "No scenario recovers capital at this budget",
    },
  ];

  // Note if result is scenario-adjusted (Average = neutral base; only note non-average WOM)
  if (scenario !== "Average") {
    signals.push({
      label:  "Scenario Note",
      status: "neutral",
      detail: `Result reflects ${scenario.toLowerCase()} WOM conditions.`,
    });
  }

  return { verdict, score, color, bgColor, headline, subline, signals };
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 4: Budget Optimizer
// ══════════════════════════════════════════════════════════════════════════════
//
//  Answers: "What budget maximizes expected profit for this actor at acceptable risk?"
//
//  Algorithm:
//    1. Determine search range: from ₹10Cr floor to actor's maxViableBudget
//       (capped at MODEL_MAX_BUDGET = ₹500Cr)
//    2. Sweep in 20 steps, compute expectedProfit and risk at each point
//       expectedProfit = (baseGross × 0.40) − totalCapital
//       where baseGross = baseExpectedGross at each budget level
//    3. Find the budget with the highest RISK-ADJUSTED profit:
//       score = expectedProfit × (1 − downsideRisk/100)
//       This prevents the optimizer from recommending high-profit but
//       high-risk budgets that a conservative producer would reject.
//    4. Also find the "safe peak" — highest profit below SSB — and the
//       "max peak" — highest profit anywhere in the range.
//    5. Recommend whichever produces the best risk-adjusted score.
//
//  Outputs a profit curve (for chart rendering) + optimal point metadata.
// ──────────────────────────────────────────────────────────────────────────────

const MODEL_MAX_BUDGET = 500; // ₹Cr — absolute modeling ceiling

export type OptimizerPoint = {
  budget:       number;
  expectedProfit: number;
  risk:         number;  // downside probability %
  roi:          number;  // gross ROI on production budget
  isSafe:       boolean; // budget ≤ stressSafeBudget
  isOptimal:    boolean;
};

export type BudgetOptimizerResult = {
  optimalBudget:      number;
  optimalProfit:      number;
  optimalROI:         number;
  optimalRisk:        number;
  confidence:         "High" | "Moderate" | "Low";
  curve:              OptimizerPoint[];
  stressSafeBudget:   number;
  maxViableBudget:    number;
  marketFloorProduction:   number;   // heroRemuneration × 2.5  — min realistic production budget
  marketFloorTotalCapital: number;   // marketFloorProduction + heroRemuneration
  recommendation:     string;
  recommendationSub:  string;
  profitPeakBudget:   number;
  profitPeakProfit:   number;
  riskAdjPeakBudget:  number;
  // Pre-flight: set when marketFloorProduction > maxViableBudget
  structurallyIncompatible?: boolean;
  incompatibilityDetail?: {
    recoverableShare:    number;  // actor gross ceiling × dist share
    heroFee:             number;
    remainingAfterHero:  number;  // recoverableShare − heroFee (can be 0)
    marketFloor:         number;  // minimum viable production scale
    gap:                 number;  // marketFloor − remainingAfterHero
    actorName:           string;
  };
};

export function computeBudgetOptimizer(input: FilmLabInput): BudgetOptimizerResult {
  // ── 1. Resolve actor fundamentals ─────────────────────────────────────────
  let openingCr:       number;
  let tier:            1 | 2 | 3;
  let stabilityIndex:  number;
  let scaleIndex:      number;
  let dvolPct:         number;
  let maxGross:        number;
  let budgetTolerance: number;
  let actorName:       string;

  if (input.useManualOverride || !input.actorName) {
    const TIER_OPENING_FLOORS: Record<1|2|3, number> = { 1: 20, 2: 10, 3: 3 };
    openingCr      = Math.max(input.manualOpeningCr, TIER_OPENING_FLOORS[input.manualTier]);
    tier           = input.manualTier;
    stabilityIndex = input.manualStabilityIndex;
    scaleIndex     = input.manualScaleIndex;
    dvolPct        = 50;
    maxGross       = Infinity;
    budgetTolerance = 50;
    actorName      = "";
  } else {
    const profile = getActorProfile(input.actorName);
    if (!profile) throw new Error(`Actor not found: ${input.actorName}`);
    openingCr      = profile.openingCr;
    tier           = profile.tier as 1 | 2 | 3;
    stabilityIndex = profile.stabilityIndex;
    scaleIndex     = profile.scaleIndex;
    dvolPct        = profile.dvolPct;
    maxGross       = profile.maxGross;
    budgetTolerance = profile.budgetTolerance;
    actorName      = profile.name;
  }

  const pnaRate = DISTRIBUTION_META[input.distribution].pnaMultiplier;
  const heroFee = input.heroRemuneration ?? 0;
  const baseBudget = input.productionBudget;   // anchor for elastic opening
  const recTotal = (input.recovery?.overseasRights ?? 0)
    + (input.recovery?.ottRights ?? 0)
    + (input.recovery?.satelliteRights ?? 0)
    + (input.recovery?.audioRights ?? 0);

  // ── 2. Market floor (Tollywood negotiation reality) ───────────────────────
  // Primary:  heroFee × 1.8  (audited: 2.5 was too aggressive — inflated floor by 39%)
  //           Industry norm: hero fee ≤ ~55% of production budget, not 40%
  //           e.g. ₹10Cr fee → ₹18Cr production floor (achievable mid-tier range)
  // Fallback: baseBudget × 0.60  when heroFee is not set (budget-anchored floor)
  //           Previous formula used openingCr × 1.6 which caused a critical bug:
  //           VD openingCr=40 (Kingdom ₹130Cr peak) → fallback=₹64Cr, higher than
  //           Star Capital Limit ₹34Cr → optimizer had no valid search range → crash.
  //           Budget-anchored fallback scales correctly with the input film's scale.
  //           e.g. ₹45Cr film → floor ₹27Cr (sensible for mid-tier production)
  // Final floor = max(primary, fallback, 10) — always takes the higher of the two.
  const primaryFloor  = heroFee > 0 ? Math.round(heroFee * 1.8) : 0;
  const fallbackFloor = Math.round(baseBudget * 0.60);
  const marketFloorProduction   = Math.max(primaryFloor, fallbackFloor, 10);
  const marketFloorTotalCapital = marketFloorProduction + heroFee;

  // ── 3. Compute budget range bounds ────────────────────────────────────────
  const safeMaxGross = isFinite(maxGross) && maxGross > 0 ? maxGross : openingCr * 8;

  const volatilityBuffer = dvolPct === 0
    ? 1.0
    : 1 / (1 - Math.min((dvolPct / 100) * 0.8, 0.95));
  const stressSafeBudget = Math.round((safeMaxGross * getDistShare(input.distribution)) / ((1 + pnaRate) * volatilityBuffer));
  const maxViableBudget  = Math.min(
    Math.round((safeMaxGross * getDistShare(input.distribution) - heroFee) / (1 + pnaRate)),
    MODEL_MAX_BUDGET
  );

  // ── PRE-FLIGHT: Capital structure compatibility check ────────────────────
  // When the market floor (minimum viable production scale for this actor)
  // exceeds the maximum recoverable budget, the optimizer has no valid search
  // range. Running it anyway produces a misleading "optimal" at the floor.
  // Stop here and surface the structural conflict directly.
  if (marketFloorProduction > maxViableBudget && maxViableBudget > 0) {
    const recoverableShare   = r1(safeMaxGross * getDistShare(input.distribution));
    const remainingAfterHero = r1(Math.max(recoverableShare - heroFee, 0));
    const gap                = r1(marketFloorProduction - remainingAfterHero);
    return {
      optimalBudget:      marketFloorProduction,
      optimalProfit:      r1(remainingAfterHero - marketFloorProduction - marketFloorProduction * pnaRate),
      optimalROI:         0,
      optimalRisk:        95,
      confidence:         "Low",
      curve:              [],
      stressSafeBudget,
      maxViableBudget,
      marketFloorProduction,
      marketFloorTotalCapital,
      recommendation:     "",
      recommendationSub:  "",
      profitPeakBudget:   marketFloorProduction,
      profitPeakProfit:   0,
      riskAdjPeakBudget:  marketFloorProduction,
      structurallyIncompatible: true,
      incompatibilityDetail: {
        recoverableShare,
        heroFee,
        remainingAfterHero,
        marketFloor: marketFloorProduction,
        gap,
        actorName,
      },
    };
  }

  // Sweep starts at market floor (never below it), ends at Star Capital Limit
  const searchMin = Math.max(marketFloorProduction, 10);
  // Guard: if market floor exceeds Star Capital Limit (e.g. Tier-2 with high opening),
  // fall back to a range centred on the floor so we always produce a valid curve.
  const rawSearchMax = Math.min(maxViableBudget > 0 ? maxViableBudget : stressSafeBudget * 2, MODEL_MAX_BUDGET);
  const searchMax = rawSearchMax > searchMin
    ? rawSearchMax
    : Math.min(searchMin * 2, MODEL_MAX_BUDGET);   // fallback: 2× floor, capped at model max

  // ── 4. Sweep budget in 25 steps ───────────────────────────────────────────
  const STEPS = 25;
  const stepSize = Math.max(Math.round((searchMax - searchMin) / STEPS), 5);
  const curve: OptimizerPoint[] = [];

  for (let b = searchMin; b <= searchMax + stepSize; b += stepSize) {
    const budget = Math.min(b, searchMax);

    // ── Tiered opening uplift: budget can only LIFT opening, never suppress it ──
    // Tollywood openings are fanbase-driven. Budget adds marketing scale and
    // theatre saturation in step-jumps, not smooth curves.
    // Floor = actor's baseline openingCr (real film data or manual input).
    // Uplift tiers match real industry thresholds:
    //   1.00× budget ≤ base       — no change (same scale film)
    //   1.10× budget ≤ 1.5× base  — extra marketing push
    //   1.20× budget ≤ 2× base    — full Pan-India campaign
    //   1.30× budget > 2× base    — mass saturation release
    // Hard cap: openingCr × 1.35 (franchise-level ceiling)
    const budgetRatio = budget / Math.max(baseBudget, 1);
    const upliftFactor =
      budgetRatio <= 1.0  ? 1.00 :
      budgetRatio <= 1.5  ? 1.10 :
      budgetRatio <= 2.0  ? 1.20 : 1.30;
    const elasticOpening = Math.min(
      Math.max(openingCr, openingCr * upliftFactor),   // floor = baseline
      openingCr * 1.35                                  // hard cap
    );

    // Compute gross at this budget level using elastic opening
    const rawGross = computeExpectedGrossForOptimizer(
      elasticOpening, tier, budget, stabilityIndex, maxGross, budgetTolerance
    );
    const baseGross = isFinite(maxGross) && maxGross > 0
      ? Math.min(rawGross, maxGross)
      : rawGross;

    const totalCapitalHere = r1(budget + heroFee + budget * pnaRate);
    const optDistShare      = getDistShare(input.distribution);
      const producerShareHere = r1(baseGross * optDistShare);
    const effectiveCapital  = Math.max(totalCapitalHere - recTotal, 0);
    const expectedProfit    = r1(producerShareHere - totalCapitalHere + recTotal);

    // Risk at this budget (Signal-aligned)
    const fullRecoveryGross = totalCapitalHere / optDistShare;
    const recoveryStrain    = fullRecoveryGross / Math.max(baseGross, 1);
    const normalizedDvol    = dvolPct / 100;
    const rawBEP = Math.exp(-recoveryStrain * normalizedDvol * 1.2);
    const stabilityFloor = (scaleIndex * 0.3 + stabilityIndex * 0.7) / 100 * 0.80;
    const breakEvenProb  = clamp((rawBEP * 0.6 + stabilityFloor * 0.4) * 100, 10, 97);
    const risk = r1(100 - breakEvenProb);

    const grossROI = r2(baseGross / Math.max(budget, 1));

    curve.push({
      budget,
      expectedProfit,
      risk,
      roi: grossROI,
      isSafe: budget <= stressSafeBudget,
      isOptimal: false,
    });

    if (budget >= searchMax) break;
  }

  // ── 5. Guard: if curve is empty (edge case), return a safe fallback ─────────
  if (curve.length === 0) {
    const fallbackBudget = searchMin;
    return {
      optimalBudget: fallbackBudget, optimalProfit: 0, optimalROI: 1, optimalRisk: 80,
      confidence: "Low", curve: [],
      stressSafeBudget, maxViableBudget: Math.max(maxViableBudget, searchMin),
      marketFloorProduction, marketFloorTotalCapital,
      recommendation: `No profitable budget found above the ₹${marketFloorProduction}Cr market floor. The actor's gross ceiling may not support capital recovery at this cost structure.`,
      recommendationSub: `Try reducing hero remuneration or switching to a wider distribution strategy.`,
      profitPeakBudget: fallbackBudget, profitPeakProfit: 0, riskAdjPeakBudget: fallbackBudget,
    };
  }

  // ── 6. Find optimal point (risk-adjusted profit peak) ────────────────────
  // riskAdjustedScore = expectedProfit × (1 − risk/100)
  // This rewards profitable budgets while penalizing high-risk ones.
  let bestRiskAdj = -Infinity;
  let bestRawProfit = -Infinity;
  let riskAdjPeakIdx = 0;
  let profitPeakIdx  = 0;

  curve.forEach((pt, i) => {
    const riskAdjScore = pt.expectedProfit * (1 - pt.risk / 100);
    if (riskAdjScore > bestRiskAdj) {
      bestRiskAdj    = riskAdjScore;
      riskAdjPeakIdx = i;
    }
    if (pt.expectedProfit > bestRawProfit) {
      bestRawProfit = pt.expectedProfit;
      profitPeakIdx = i;
    }
  });

  // Mark optimal
  curve[riskAdjPeakIdx] = { ...curve[riskAdjPeakIdx], isOptimal: true };

  const optimal     = curve[riskAdjPeakIdx];
  const profitPeak  = curve[profitPeakIdx];

  // ── 5. Confidence: how clean is the peak? ────────────────────────────────
  // High: optimal profit > 0 and risk < 35%
  // Moderate: optimal profit > 0 or risk < 50%
  // Low: everything else
  const confidence: "High" | "Moderate" | "Low" =
    optimal.expectedProfit > 0 && optimal.risk < 35 ? "High"
    : optimal.expectedProfit > 0 || optimal.risk < 50 ? "Moderate"
    : "Low";

  // ── 6. Recommendation text ────────────────────────────────────────────────
  const isSafeZone = optimal.budget <= stressSafeBudget;
  const recommendation =
    confidence === "High"     ? `₹${optimal.budget}Cr maximises risk-adjusted profit for this actor at this distribution strategy.`
    : confidence === "Moderate" ? `₹${optimal.budget}Cr is the best available budget, though margin is thin — consider tightening to ₹${Math.max(optimal.budget - 10, searchMin)}Cr for a safer position.`
    : `No clearly profitable budget found in the modeled range. The actor's gross ceiling may be too close to break-even at this P&A level.`;

  const recommendationSub = isSafeZone
    ? `Within stress-safe zone (≤ ₹${stressSafeBudget}Cr) — capital protected against typical downside volatility.`
    : `Above stress-safe budget (₹${stressSafeBudget}Cr) — above-average performance required to protect capital.`;

  return {
    optimalBudget:     optimal.budget,
    optimalProfit:     optimal.expectedProfit,
    optimalROI:        optimal.roi,
    optimalRisk:       optimal.risk,
    confidence,
    curve,
    stressSafeBudget,
    maxViableBudget,
    marketFloorProduction,
    marketFloorTotalCapital,
    recommendation,
    recommendationSub,
    profitPeakBudget:  profitPeak.budget,
    profitPeakProfit:  profitPeak.expectedProfit,
    riskAdjPeakBudget: optimal.budget,
  };
}

// ── Internal helper: gross projection for optimizer (mirrors computeExpectedGross) ─
// Kept separate so the sweep loop is clean and doesn't depend on private closure.
function computeExpectedGrossForOptimizer(
  openingCr:       number,
  tier:            1 | 2 | 3,
  budget:          number,
  stabilityIndex:  number,
  maxGross:        number,
  budgetTolerance: number
): number {
  const baseline = Math.max(openingCr, 1);
  const elasticityFactor = clamp(
    1 + Math.log(budget / baseline) * 0.15,
    0.70, 1.50
  );
  const adjustedMultiplier = Math.min(
    THEATRICAL_MULTIPLIER[tier] + (stabilityIndex * 0.015),
    4.5
  );
  const openingAnchored = openingCr * adjustedMultiplier * elasticityFactor;

  if (!isFinite(maxGross) || maxGross <= 0) return r1(openingAnchored);

  const budgetRatio = budget / Math.max(budgetTolerance, 1);
  const toleranceAnchored = maxGross * Math.pow(clamp(budgetRatio, 0.1, 2.0), 0.6);
  const stabilityCap = maxGross * (stabilityIndex / 100);

  return r1(Math.min(Math.max(openingAnchored, toleranceAnchored), stabilityCap));
}

// ══════════════════════════════════════════════════════════════════════════════
// THEATRICAL RUN MODEL
// ══════════════════════════════════════════════════════════════════════════════
//
//  Translates a total gross projection into a week-by-week theatrical
//  recovery timeline — giving producers the familiar release-window lens
//  to verify the engine's math.
//
//  Distribution of total gross across weeks (Telugu/Hindi industry norms):
//    Week 1 (Fri–Thu):  58% of lifetime   — opening surge + first weekend
//    Week 2:            22%               — strong hold or drop depending on WOM
//    Week 3:            12%               — long-legs content or quick fade
//    Week 4+:            8%               — awards/niche/OTT-window tail
//
//  These percentages are calibrated against the StarsQ dataset's film history
//  (gross by week data from T1–T3 Telugu films 2014–2024).
//  Weak-WOM films are front-loaded: Week 1 can be 70%+ with fast decay.
//  Strong-WOM films stretch: Week 1 may be only 48%, with Week 2-3 holding well.
//
//  For each week, we show: gross, producer share, cumulative share vs capital,
//  and whether capital has been recovered at that point.
// ──────────────────────────────────────────────────────────────────────────────

export type TheatricalDay = {
  day:             number;      // 1 = Friday of opening week
  label:           string;      // "Friday", "Saturday", etc.
  grossCr:         number;
  shareCr:         number;
  cumulativeShare: number;
  capitalRecovered: boolean;
};

export type TheatricalWeek = {
  week:            number;
  label:           string;
  grossCr:         number;
  shareCr:         number;
  cumulativeShare: number;
  capitalRecovered: boolean;
};

export type TheatricalRunModel = {
  totalGross:         number;
  totalCapital:       number;
  netTheatricalRisk:  number;    // totalCapital − pre-release recoveries (what theatres must cover)
  recoveryGateCr:     number;    // gross needed for net theatrical risk only (more producer-realistic)
  fullRecoveryGateCr: number;    // gross needed for full capital (legacy — includes all costs)
  // Day-level (first 7 days)
  days:               TheatricalDay[];
  capitalRecoveryDay: number | null;   // 1-indexed day number; null = not in first 7 days
  capitalRecoveryLabel: string;        // "Day 9 (Second Saturday)" — human readable
  // Weekend metrics
  openingWeekendGross: number;         // Fri + Sat + Sun gross
  openingWeekendShare: number;         // producer share of opening weekend gross
  // Week-level (4 weeks)
  weeks:              TheatricalWeek[];
  recoveryWeek:       number | null;
  // Metadata
  multiplierLabel:    string;
  openingCr:          number;
  openingBase:        number;          // median of non-event Day-1 openings (mathematically derived)
  openingDay1Gross:   number;          // = openingBase (what headlines will report on release day)
  openingLifetime:    number;          // implied lifetime if film opens at baseline opening power
  openingCeiling:     number;          // actor's highest confirmed standalone Day-1 gross
  openingMedian:      number;          // raw median of all Day-1 data points
  scenario:           string;          // ScenarioMode used — drives curve label in UI
};

// ── SCENARIO-AWARE DAY DISTRIBUTION CURVES ───────────────────────────────────
// Source: auditor-specified daily collection as % of Opening Day (Day-1 = 100%).
// pctOfW1 values are derived by dividing each day's Day-1% by the row-sum,
// so the relative daily pattern is exact and fully auditor-traceable.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ Base Case (standard Telugu front-loaded run)                            │
// │  Fri 100% │ Sat 70% │ Sun 80% │ Mon 30% │ Tue 25% │ Wed 22% │ Thu 20% │
// │  Sum = 347  → pctOfW1 = day% / 347                                     │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ Strong WoM (blockbuster "legs" — stronger weekend + weekday hold)       │
// │  Fri 100% │ Sat 85% │ Sun 90% │ Mon 40% │ Tue 38% │ Wed 35% │ Thu 35% │
// │  Sum = 423  → pctOfW1 = day% / 423                                     │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ Weak WoM (front-heavy collapse — drops sharply after Day-1)             │
// │  Fri 100% │ Sat 58% │ Sun 62% │ Mon 20% │ Tue 16% │ Wed 12% │ Thu 10% │
// │  Sum = 278  → pctOfW1 = day% / 278                                     │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ Festival Boost (holiday opening — Sat/Sun hold well; stronger weekdays) │
// │  Fri 100% │ Sat 90% │ Sun 95% │ Mon 35% │ Tue 30% │ Wed 22% │ Thu 20% │
// │  Sum = 392  → pctOfW1 = day% / 392                                     │
// └─────────────────────────────────────────────────────────────────────────┘

type DayWeight = { label: string; pctOfW1: number; pctOfDay1: number };

function buildCurve(pctOfDay1: number[]): DayWeight[] {
  const labels = ["Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const sum = pctOfDay1.reduce((a, b) => a + b, 0);
  return pctOfDay1.map((p, i) => ({
    label: labels[i],
    pctOfDay1: p,
    pctOfW1: p / sum,
  }));
}

const DAY_WEIGHTS_BASE       = buildCurve([100, 70, 80, 30, 25, 22, 20]); // sum=347
const DAY_WEIGHTS_STRONG_WOM = buildCurve([100, 85, 90, 40, 38, 35, 35]); // sum=423
const DAY_WEIGHTS_WEAK_WOM   = buildCurve([100, 58, 62, 20, 16, 12, 10]); // sum=278
const DAY_WEIGHTS_FESTIVAL   = buildCurve([100, 90, 95, 35, 30, 22, 20]); // sum=392

// Second-weekend pattern — expressed as % of openingDay1Gross (per auditor spec)
// Strong WoM: characteristic Tollywood blockbuster jump:
//   2nd Fri ≈ 25%, 2nd Sat ≈ 45%, 2nd Sun ≈ 50% (80–110% jump from 2nd Fri)
// Base: normal taper with modest recovery weekend
// Weak WoM: no meaningful 2nd weekend; minimal recovery
type Week2Pattern = {
  fri: number;   // as fraction of openingDay1Gross
  sat: number;
  sun: number;
  monPctOf1stMon: number;  // weekday taper factor (Mon2 / Mon1)
};
const WEEK2_PATTERN: Record<string, Week2Pattern> = {
  Average:        { fri: 0.18, sat: 0.28, sun: 0.30, monPctOf1stMon: 0.45 },
  Strong:         { fri: 0.25, sat: 0.45, sun: 0.50, monPctOf1stMon: 0.55 },
  Weak:           { fri: 0.10, sat: 0.13, sun: 0.12, monPctOf1stMon: 0.35 },
  // Legacy mapping
  BASE:           { fri: 0.18, sat: 0.28, sun: 0.30, monPctOf1stMon: 0.45 },
  STRONG_WOM:     { fri: 0.25, sat: 0.45, sun: 0.50, monPctOf1stMon: 0.55 },
  WEAK_WOM:       { fri: 0.10, sat: 0.13, sun: 0.12, monPctOf1stMon: 0.35 },
  FESTIVAL_BOOST: { fri: 0.22, sat: 0.38, sun: 0.42, monPctOf1stMon: 0.50 },
};

function getDayWeights(wom: WOMScenario | string): DayWeight[] {
  if (wom === "Strong")  return DAY_WEIGHTS_STRONG_WOM;
  if (wom === "Weak")    return DAY_WEIGHTS_WEAK_WOM;
  // Average or any legacy string → base curve
  // Also map legacy ScenarioMode strings for backward compat
  if (wom === "STRONG_WOM" || wom === "FESTIVAL_BOOST") return DAY_WEIGHTS_STRONG_WOM;
  if (wom === "WEAK_WOM")                               return DAY_WEIGHTS_WEAK_WOM;
  return DAY_WEIGHTS_BASE;
}

// Backward-compat alias
const DAY_WEIGHTS = DAY_WEIGHTS_BASE;

// Week 2 day labels (for capital recovery day labelling beyond day 7)
const WEEK2_DAY_LABELS = ["Second Friday", "Second Saturday", "Second Sunday",
  "Second Monday", "Second Tuesday", "Second Wednesday", "Second Thursday"];

// Week distribution weights (sum = 1.0)
const WEEK_WEIGHTS = [0.58, 0.22, 0.12, 0.08];
const WEEK_LABELS  = ["Week 1 (Fri–Thu)", "Week 2", "Week 3", "Week 4+"];

// ── Declining distributor share by week (Tollywood industry reality) ─────────
// Week 1: ~50% of gross (opening surge; distributors command higher share)
// Week 2: 42.5% (theatre owners start increasing their cut)
// Week 3: 37.5% (further exhibitor renegotiation)
// Week 4+: 30% (long-tail; exhibitor takes majority)
// Weighted average across lifetime ≈ 44.6% — higher than the flat 40% used in
// scenario P&L (which is a conservative distributor-net estimate for planning).
// The TheatricalRunModel uses per-week rates for day-accurate capital recovery.
const WEEK_DIST_SHARES = [0.50, 0.425, 0.375, 0.30];

// Effective lifetime share (used for recoveryGateCr calculation)
// = Σ(WEEK_WEIGHTS[i] × WEEK_DIST_SHARES[i])
const EFFECTIVE_LIFETIME_SHARE = WEEK_WEIGHTS.reduce((s, w, i) => s + w * WEEK_DIST_SHARES[i], 0);
// ≈ 0.446 — more accurate than flat 0.40 for the theatrical window

export function computeTheatricalRunModel(
  totalGross:           number,    // scenario-selected lifetime gross — P&L + weekly table
  totalCapital:         number,
  theatricalMultiplier: number,
  openingCr:            number,    // actor peak opening (ceiling, used for display)
  preReleaseRecoveries: number,    // OTT + Satellite + Audio + Overseas already sold
  openingBase:          number,    // actor's era-normalized baseline Day-1 gross
  distribution:         Distribution,   // determines effective producer share ratio
  scenario:             string          // ScenarioMode — drives daily curve selection
): TheatricalRunModel {
  // Net theatrical risk = what theatres actually need to cover
  const effLifetimeShare   = getEffectiveLifetimeShare(distribution);
  const netTheatricalRisk  = Math.max(r1(totalCapital - preReleaseRecoveries), 0);
  const fullRecoveryGateCr = r1(totalCapital / effLifetimeShare);
  const recoveryGateCr     = r1(netTheatricalRisk / effLifetimeShare);

  // ── Select scenario-specific day curve ───────────────────────────────────
  const scenarioDayWeights = getDayWeights(scenario);

  // ── Opening-anchored basis — drives BOTH the day table AND the week table ────
  //
  // openingBase = effectiveOpeningDay1 from call site (already includes buzzMult ×
  // timingMult × frictionMult × filmCategoryMult). This is what headlines report.
  //
  // Why opening-anchored for both tables:
  //   Day table  — shows how money flows given the actual Day-1 opening (obvious)
  //   Week table — must tell the SAME story. If opening = ₹102.8Cr (Strong Buzz),
  //                the week table MUST reflect that lifetime, not the conservative
  //                P&L gross (₹124Cr). Showing Day 4 recovery in day table while
  //                week table shows "Capital Unrealized" is contradictory and
  //                confuses every producer who looks at it.
  //
  // totalGross (P&L conservative gross) is preserved in the return object for
  // reference but does NOT drive the recovery timeline tables.
  //
  // Capital recovery gate uses netTheatricalRisk = totalCapital - preReleaseRecoveries
  // (streams already booked reduce what theatres must cover — consistent with engine).
  const openingDay1Gross  = r1(openingBase);  // openingBase = effectiveOpeningDay1
  const openingWeek1Gross = r1(openingDay1Gross / scenarioDayWeights[0].pctOfW1);
  const openingLifetime   = r1(openingWeek1Gross / WEEK_WEIGHTS[0]);

  // Both tables derive from the same opening week gross
  const week1Gross = openingWeek1Gross;
  const week1Share = WEEK_DIST_SHARES[0];   // 50%
  let cumShareDay     = 0;
  let capitalRecoveryDay: number | null = null;

  const days: TheatricalDay[] = scenarioDayWeights.map(({ label, pctOfW1 }, i) => {
    const grossCr  = r1(week1Gross * pctOfW1);
    const shareCr  = r1(grossCr * week1Share);
    cumShareDay    = r1(cumShareDay + shareCr);
    const capitalRecovered = cumShareDay >= netTheatricalRisk;
    if (capitalRecovered && capitalRecoveryDay === null) capitalRecoveryDay = i + 1;
    return { day: i + 1, label, grossCr, shareCr, cumulativeShare: cumShareDay, capitalRecovered };
  });

  // If not recovered in Week 1, walk Week 2 days using scenario's Week2 pattern.
  // Weekdays taper from 2nd Mon using monPctOf1stMon × 1st-Mon gross.
  let capitalRecoveryLabel = "";
  const w2Pattern  = WEEK2_PATTERN[scenario] ?? WEEK2_PATTERN["Average"];
  const week2Share = WEEK_DIST_SHARES[1];   // 42.5%
  const mon1Gross  = days[3].grossCr;        // Monday of Week 1 (from opening-derived day table)

  // Build Week 2 day grosses anchored to opening Day-1 (consistent with day table)
  const week2DayGross = [
    r1(openingDay1Gross * w2Pattern.fri),                        // 2nd Fri
    r1(openingDay1Gross * w2Pattern.sat),                        // 2nd Sat — blockbuster jump
    r1(openingDay1Gross * w2Pattern.sun),                        // 2nd Sun
    r1(mon1Gross * w2Pattern.monPctOf1stMon),                    // 2nd Mon
    r1(mon1Gross * w2Pattern.monPctOf1stMon * 0.88),             // 2nd Tue
    r1(mon1Gross * w2Pattern.monPctOf1stMon * 0.80),             // 2nd Wed
    r1(mon1Gross * w2Pattern.monPctOf1stMon * 0.72),             // 2nd Thu
  ];

  if (capitalRecoveryDay !== null) {
    capitalRecoveryLabel = `Day ${capitalRecoveryDay} (${scenarioDayWeights[capitalRecoveryDay - 1].label})`;
  } else {
    let cumW2 = cumShareDay;
    let w2RecovDay: number | null = null;
    for (let d = 0; d < 7; d++) {
      cumW2 = r1(cumW2 + r1(week2DayGross[d] * week2Share));
      if (cumW2 >= netTheatricalRisk && w2RecovDay === null) {
        w2RecovDay = 7 + d + 1;
        capitalRecoveryLabel = `Day ${w2RecovDay} (${WEEK2_DAY_LABELS[d]})`;
      }
    }
    if (!capitalRecoveryLabel) capitalRecoveryLabel = "Beyond 2 weeks";
  }

  // ── Weekend (Week 1 share applies) ───────────────────────────────────────
  const openingWeekendGross = r1(days[0].grossCr + days[1].grossCr + days[2].grossCr);
  const openingWeekendShare = r1(openingWeekendGross * week1Share);

  // ── Week-level (each week uses its own declining share) ──────────────────
  // Uses openingLifetime (derived from effectiveOpeningDay1) — same basis as
  // the day table. This ensures day and week recovery timelines agree.
  // totalGross (conservative P&L) is preserved in return object but does NOT
  // drive the recovery timeline — that would contradict the day table.
  let cumShare = 0;
  let recoveryWeek: number | null = null;

  const weeks: TheatricalWeek[] = WEEK_WEIGHTS.map((w, i) => {
    const grossCr = r1(openingLifetime * w);
    const shareCr = r1(grossCr * WEEK_DIST_SHARES[i]);
    cumShare = r1(cumShare + shareCr);
    const capitalRecovered = cumShare >= netTheatricalRisk;
    if (capitalRecovered && recoveryWeek === null) recoveryWeek = i + 1;
    return { week: i + 1, label: WEEK_LABELS[i], grossCr, shareCr, cumulativeShare: cumShare, capitalRecovered };
  });

  return {
    totalGross,
    totalCapital,
    netTheatricalRisk,
    recoveryGateCr,
    fullRecoveryGateCr,
    days,
    capitalRecoveryDay,
    capitalRecoveryLabel,
    openingWeekendGross,
    openingWeekendShare,
    weeks,
    recoveryWeek,
    multiplierLabel: `${theatricalMultiplier.toFixed(2)}× theatrical multiplier`,
    openingCr,
    openingBase,
    openingDay1Gross,
    openingLifetime,
    openingCeiling: openingCr,
    openingMedian:  openingBase,
    scenario,
  };
}
