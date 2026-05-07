// /data/actors.ts — StarsQ v2 Final
// ─────────────────────────────────────────────────────────────────────────────
// DATA CONTRACT:
//   Every actor MUST have films[] populated.
//   The engine throws on module load for any actor without film-level data.
//   Do not add actors to this registry without their complete film dataset.
//
// FILM DATA GOVERNANCE:
//   grossCr = WW gross basis throughout. If a film's grossCr is nett,
//   annotate that film entry with a comment. Mixing gross and nett corrupts
//   ROI comparability across actors.
//
//   multiStarrerWeight: actor's estimated credit share (0.0–1.0).
//   Applied as: effectiveGross = grossCr × multiStarrerWeight before ROI calc.
//   Omit for solo films — defaults to 1.0.
//
// ── ENSEMBLE FRAMEWORK (v2.1) ─────────────────────────────────────────────
//   Solo films determine scale. Event films influence reach.
//
//   maxGross    = highest solo-lead film gross (never ensemble/shared gross)
//   openingCr   = proven solo opening day ₹Cr (never post-ensemble brand inflation)
//   budgetTolerance = derived from solo maxGross only
//   stabilityIndex  = engine computes from solo film ROI volatility only
//
//   megaEventParticipation = true if actor was part of a high-reach multi-star
//   event (e.g. RRR). These films stay in films[] for CHI/momentum signals
//   but their grossCr is never used as a solo ceiling.
//
//   megaEventYear: used by future engine to apply time-weighted reach decay:
//     ensembleReachBoost = baseBoost × exp(-yearsSinceEvent × 0.35)
//   This prevents a 2022 ensemble from permanently inflating 2026 pan-India scores.
//
// MIGRATION STATUS:
//   Kiran Abbavaram — 10-film dataset (complete)
//   Naveen Polishetty — 4-film dataset (complete)
//   All other 19 actors — film arrays sourced from validated prior-run data.
//   When sourcing raw film arrays, cross-reference the precomputed{} annotation
//   comment on each actor to verify expected dvol and loss film count.
//
// precomputed{} block:
//   NOT read by the production engine. Retained as migration annotation only.
//   Contains validated metrics from the prior model run for cross-reference
//   when populating films[]. Remove precomputed{} once films[] is verified.
// ─────────────────────────────────────────────────────────────────────────────

export type FilmEntry = {
  year: number;
  title: string;
  budgetCr: number;
  grossCr: number;
  multiStarrerWeight?: number;  // defaults to 1.0 — for ensemble films
  franchiseSequel?: boolean;    // true = sequel to prior IP; stays in films[] for CHI/momentum
                                // but excluded from openingCr and maxGross anchoring
};

export type Actor = {
  name: string;
  openingCr: number;          // Peak SOLO standalone opening day ₹Cr (= openingCeiling)
  openingBase: number;        // Era-normalized median of non-event Day-1 openings
                              // Computed dynamically in engine via openingFilms + ERA_MULTIPLIERS
                              // Used as fallback when openingFilms is absent
  openingCeiling: number;     // Highest confirmed standalone Day-1 gross (same as openingCr)
  openingMedian: number;      // Raw (unadjusted) median of all Day-1 data points

  // Per-film Day-1 opening data — source for era-normalized base computation
  // Engine applies ERA_MULTIPLIERS by year, then median of non-events
  // isEvent: true → excluded from base (kept for ceiling only)
  openingFilms?: Array<{
    year:    number;
    grossCr: number;
    title?:  string;
    isEvent?: boolean;       // true = explicitly marked as event/franchise event
  }>;
                              // Excludes: ensemble events, franchise sequels
  maxGross: number;           // Peak SOLO standalone WW gross ₹Cr
                              // Excludes: ensemble grosses, franchise sequel grosses
  panIndiaViability: number;  // 0–100 geographic reach (boosted by ensemble/franchise exposure)
  budgetTolerance: number;    // Safe budget ceiling ₹Cr — derived from solo standalone maxGross

  // ── Ensemble reach flag (time-weighted decay) ────────────────────────────
  megaEventParticipation?: boolean; // true = actor in high-reach multi-star event
  megaEventYear?:          number;  // year of most recent mega event

  // ── Franchise participation flag (time-weighted decay) ───────────────────
  franchiseParticipation?: boolean; // true = actor has a proven franchise
  franchiseYear?:          number;  // year of most recent franchise release
  // Decay formula (future engine pass):
  //   franchiseBoost = baseBoost × exp(-yearsSinceRelease × 0.35)

  aliases: string[];
  films: FilmEntry[];         // REQUIRED — engine throws without this

  // Migration annotation only — not read by engine
  precomputed?: {
    rawDvol: number;
    lossFilmCount: number;
    momentumSignal: string;
    chiScore: number;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTOR REGISTRY — 21 Actors
//
// Tier is engine-derived from openingCr, not stored:
//   Tier 1 — openingCr ≥ 60 | Tier 2 — 30–59 | Tier 3 — < 30
// ─────────────────────────────────────────────────────────────────────────────

export const actors: Actor[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: "Allu Arjun",
    // ── SOLO STANDALONE ANCHOR ────────────────────────────────────────────────
    // openingCr: Pushpa: The Rise (2021) ~₹62Cr worldwide Day 1.
    //   Fresh standalone new IP — zero franchise equity, full creative + capital risk
    //   taken by actor + director. Not a sequel, not a remake. Market responded with
    //   ₹365Cr gross on ₹200Cr budget — the purest proof of his T1 market floor.
    //   Pushpa 1 > AVP (₹55Cr) in Day 1 collections — correct anchor.
    //   Pushpa 2 (₹196Cr Day 1) excluded — franchise sequel momentum, not pure star pull.
    openingCr: 74,
    openingBase: 64.0,      // Day-1: AVK₹54 + P1₹74. P2=franchise excl. Base=median([54,74])=64
    openingCeiling: 74,
    openingMedian: 64.0,
    openingFilms: [
      { year: 2020, grossCr: 54, title: "Ala Vaikunthapurramuloo" },
      { year: 2021, grossCr: 74, title: "Pushpa: The Rise" },
    ],
    // maxGross: Pushpa: The Rise (2021) ₹365Cr — highest standalone new-IP gross.
    //   New IP, no franchise safety net — pure star + content risk. Legitimate anchor.
    //   Pushpa 2 (₹1721Cr) excluded — franchise sequel; IP compounding, not solo pull.
    maxGross: 365,
    panIndiaViability: 98,
    // budgetTolerance: Pushpa 1 budget ₹200Cr → ₹365Cr gross ✓ (ROI 1.82×).
    //   365 × 0.40 / 1.15 ≈ ₹127Cr standalone ceiling.
    budgetTolerance: 127,
    // ── FRANCHISE FLAG ────────────────────────────────────────────────────────
    // Pushpa franchise (2021→2024) boosts brand recall, sequel openings, OTT value.
    // Stays in films[] for CHI/momentum (franchise = proven sustained audience loyalty).
    franchiseParticipation: true,
    franchiseYear: 2024,
    aliases: ["aa", "bunny", "icon star"],
    // precomputed ref: rawDvol=0, lossFilms=0, CHI=78, momentum=Acceleration
    // Na Peru Surya is 1 loss film. Pre-2014 films removed per data governance (2014+ only).
    films: [
      { year: 2014, title: "Race Gurram",            budgetCr: 30,   grossCr: 102   },
      { year: 2015, title: "S/O Satyamurthy",       budgetCr: 40,   grossCr: 86    },
      { year: 2016, title: "Sarrainodu",             budgetCr: 50,   grossCr: 98    },
      { year: 2017, title: "Duvvada Jagannadham",   budgetCr: 65,   grossCr: 80    },
      { year: 2018, title: "Na Peru Surya",         budgetCr: 55,   grossCr: 40    }, // loss
      { year: 2020, title: "Ala Vaikunthapurramuloo",budgetCr: 60,  grossCr: 252   }, // standalone breakout — ₹55Cr Day 1 (openingCr superseded by Pushpa 1)
      { year: 2021, title: "Pushpa: The Rise",       budgetCr: 200,  grossCr: 365   }, // standalone new IP — maxGross anchor
      { year: 2024, title: "Pushpa 2: The Rule",     budgetCr: 500,  grossCr: 1721, franchiseSequel: true }, // franchise sequel — CHI/momentum only
    ],
    precomputed: { rawDvol: 0, lossFilmCount: 1, momentumSignal: "Acceleration", chiScore: 78 },
  },

  {
    name: "Prabhas",
    // ── SOLO STANDALONE ANCHOR ────────────────────────────────────────────────
    // openingCr: Kalki 2898 AD (2024) ~₹95Cr worldwide Day 1 — new IP, standalone.
    //   Baahubali 2 opening (₹200Cr+) excluded — franchise sequel momentum.
    openingCr: 170,
    openingBase: 90.0,      // Day-1: RS₹80+Adi₹126+Sal₹165+Kalki₹170+RajaSaab₹65. Formula=126 but RajaSaab₹65 recency. Adjusted base=90
    openingCeiling: 170,
    openingMedian: 126.0,
    openingFilms: [
      { year: 2019, grossCr: 80, title: "Saaho" },
      { year: 2022, grossCr: 126, title: "Radhe Shyam" },
      { year: 2023, grossCr: 165, title: "Salaar" },
      { year: 2024, grossCr: 170, title: "Kalki 2898 AD" },
      { year: 2026, grossCr: 65, title: "Raja Saab" },
    ],
    // maxGross: Kalki 2898 AD (2024) ₹1000Cr — highest standalone new-IP gross.
    //   Baahubali 2 (₹1810Cr) excluded — franchise sequel to BB1.
    maxGross: 1000,
    panIndiaViability: 100,
    // budgetTolerance: Kalki budget ₹600Cr → ₹1000Cr gross (ROI 1.67×, thin but positive).
    //   1000 × 0.40 / 1.15 ≈ ₹348Cr. Conservative ceiling at ₹300Cr given loss history.
    budgetTolerance: 300,
    // ── FRANCHISE FLAG ────────────────────────────────────────────────────────
    franchiseParticipation: true,
    franchiseYear: 2017, // Baahubali 2 — franchise participation
    aliases: ["darling", "rebel star"],
    // precomputed ref: rawDvol=0.274, lossFilms=2, CHI=40, momentum=Capital Fatigue
    films: [
      { year: 2015, title: "Baahubali: The Beginning", budgetCr: 180, grossCr: 630   }, // new IP — standalone
      { year: 2017, title: "Baahubali 2: The Conclusion", budgetCr:250, grossCr:1810, franchiseSequel: true }, // franchise sequel — CHI/momentum only
      { year: 2019, title: "Saaho",                  budgetCr: 350,  grossCr: 320   }, // loss
      { year: 2022, title: "Radhe Shyam",            budgetCr: 350,  grossCr: 200   }, // loss
      { year: 2023, title: "Adipurush",              budgetCr: 600,  grossCr: 410   }, // loss
      { year: 2024, title: "Kalki 2898 AD",          budgetCr: 600,  grossCr: 1000  }, // standalone new IP — maxGross anchor
    ],
    precomputed: { rawDvol: 0.175, lossFilmCount: 3, momentumSignal: "Capital Fatigue", chiScore: 40 },
  },

  {
    name: "Jr NTR",
    // ── SOLO ANCHOR ──────────────────────────────────────────────────────────
    // openingCr: Devara Part 1 (2024) confirmed ₹98Cr worldwide Day 1.
    openingCr: 98,
    openingBase: 36.5,      // Day-1: JLK₹35 + AS₹38 + Devara₹150. Devara=event(>95). Base=36.5. Ceiling=150
    openingCeiling: 150,
    openingMedian: 38.0,
    openingFilms: [
      { year: 2017, grossCr: 35, title: "Jai Lava Kusa" },
      { year: 2018, grossCr: 38, title: "Aravinda Sametha" },
      { year: 2024, grossCr: 150, title: "Devara", isEvent: true },
    ],
    // maxGross: Devara Part 1 — ₹350Cr credible ceiling (₹401Cr+ reported, ₹292Cr India nett).
    //   ₹350Cr = defensible middle ground. RRR excluded — ensemble.
    maxGross: 350,
    panIndiaViability: 95,
    // budgetTolerance: 250 × 0.40 / 1.15 ≈ ₹87Cr (solo maxGross anchor)
    budgetTolerance: 87,
    // ── ENSEMBLE REACH FLAG ───────────────────────────────────────────────────
    megaEventParticipation: true,
    megaEventYear: 2022,
    aliases: ["tarak", "ntr"],
    // precomputed ref: rawDvol=0, lossFilms=0, CHI=65, momentum=Capital Fatigue
    // Stability computed from solo films only (excludes RRR per framework v2.1)
    films: [
      { year: 2014, title: "Rabhasa",                budgetCr: 35,   grossCr: 38    },
      { year: 2016, title: "Nannaku Prematho",       budgetCr: 40,   grossCr: 78    },
      { year: 2016, title: "Janatha Garage",         budgetCr: 55,   grossCr: 125   },
      { year: 2018, title: "Aravinda Sametha",       budgetCr: 70,   grossCr: 152   },
      { year: 2022, title: "RRR",                    budgetCr: 550,  grossCr: 1200, multiStarrerWeight: 0.5 }, // mega event — reach only
      { year: 2024, title: "Devara Part 1",          budgetCr: 300,  grossCr: 250   }, // ₹300Cr budget, honest gross ₹250Cr
    ],
    precomputed: { rawDvol: 0, lossFilmCount: 0, momentumSignal: "Capital Fatigue", chiScore: 65 },
  },

  {
    name: "Ram Charan",
    // ── SOLO ANCHOR ──────────────────────────────────────────────────────────
    // openingCr: Game Changer (2024) confirmed ₹155.80Cr worldwide Day 1.
    //   (AP/TS ₹94.13Cr + other states ₹21.40Cr + Rest of India ₹40.27Cr)
    //   Content was a disaster — but opening = star pull, which is real and bankable.
    //   This is NOT RRR inflation. This is a solo film number.
    openingCr: 186,
    openingBase: 48.0,      // Day-1: RS₹46 + VVR₹50 + GC₹186. GC=event(>2.5×50=125). Base=median([46,50])=48
    openingCeiling: 186,
    openingMedian: 50.0,
    openingFilms: [
      { year: 2018, grossCr: 46, title: "Rangasthalam" },
      { year: 2022, grossCr: 50, title: "RRR / VVR" },
      { year: 2024, grossCr: 186, title: "Game Changer", isEvent: true },
    ],
    // maxGross: Rangasthalam (2018) ₹216Cr — highest confirmed solo gross.
    //   Made on ₹60-65Cr budget → ROI 3.3× — the cleanest proof of solo capital pull.
    //   RRR (₹1200Cr) excluded — ensemble with Jr NTR at 0.5 weight.
    maxGross: 216,
    panIndiaViability: 95,
    // budgetTolerance: Rangasthalam ₹65Cr → ₹216Cr ✓. 216 × 0.40 / 1.15 ≈ ₹75Cr.
    budgetTolerance: 75,
    // ── ENSEMBLE REACH FLAG ───────────────────────────────────────────────────
    megaEventParticipation: true,
    megaEventYear: 2022,
    aliases: ["charan", "cherry"],
    // precomputed ref: rawDvol=0.137, lossFilms=5, CHI=43, momentum=Capital Fatigue
    // Pre-2014 films (Racha, Naayak) removed per data governance (2014+ only).
    // 5 of 7 solo films are losses — Rangasthalam and RRR are the only profitable solo/event films.
    films: [
      { year: 2014, title: "Govindudu Andarivadele", budgetCr: 40,   grossCr: 35    }, // loss
      { year: 2015, title: "Bruce Lee: The Fighter", budgetCr: 55,   grossCr: 42    }, // loss
      { year: 2016, title: "Dhruva",                 budgetCr: 60,   grossCr: 54    }, // loss
      { year: 2018, title: "Rangasthalam",           budgetCr: 65,   grossCr: 216   }, // solo career-best
      { year: 2019, title: "Vinaya Vidheya Rama",    budgetCr: 90,   grossCr: 65    }, // loss
      { year: 2022, title: "RRR",                    budgetCr: 550,  grossCr: 1200, multiStarrerWeight: 0.5 }, // mega event — reach only, not scale
      { year: 2024, title: "Game Changer",           budgetCr: 350,  grossCr: 200   }, // loss
    ],
    precomputed: { rawDvol: 0.137, lossFilmCount: 5, momentumSignal: "Capital Fatigue", chiScore: 43 },
  },

  {
    name: "Mahesh Babu",
    openingCr: 75,
    openingBase: 55.0,      // Day-1: BAN₹55+Mah₹48+SNK₹54+SVP₹63+GK₹75. No events. Base=55=median
    openingCeiling: 75,
    openingMedian: 55.0,
    openingFilms: [
      { year: 2018, grossCr: 48, title: "Bharat Ane Nenu" },
      { year: 2019, grossCr: 55, title: "Maharshi" },
      { year: 2021, grossCr: 54, title: "Sarkaru Vaari Paata" },
      { year: 2023, grossCr: 63, title: "SVPP" },
      { year: 2024, grossCr: 75, title: "Guntur Kaaram" },
    ],
    maxGross: 225,
    panIndiaViability: 70,
    budgetTolerance: 150,
    aliases: ["mahesh", "superstar"],
    // precomputed ref: rawDvol=0.051, lossFilms=1, CHI=52, momentum=Stable
    films: [
      { year: 2016, title: "Brahmotsavam",           budgetCr: 90,   grossCr: 68    }, // loss
      { year: 2017, title: "Spyder",                 budgetCr: 120,  grossCr: 105   },
      { year: 2018, title: "Bharat Ane Nenu",        budgetCr: 80,   grossCr: 180   },
      { year: 2019, title: "Maharshi",               budgetCr: 70,   grossCr: 125   },
      { year: 2020, title: "Sarileru Neekevvaru",    budgetCr: 80,   grossCr: 225   },
      { year: 2022, title: "Sarkaru Vaari Paata",    budgetCr: 65,   grossCr: 153   },
    ],
    precomputed: { rawDvol: 0.051, lossFilmCount: 1, momentumSignal: "Stable", chiScore: 52 },
  },

  {
    name: "Pawan Kalyan",
    openingCr: 155,
    openingBase: 62.0,      // Day-1: VS₹55+BN₹56.5+HHVM₹68.1+OG₹155. No event(155<155.8). Base=62
    openingCeiling: 155,
    openingMedian: 62.3,
    openingFilms: [
      { year: 2021, grossCr: 55, title: "Vakeel Saab" },
      { year: 2022, grossCr: 56.5, title: "Bheemla Nayak" },
      { year: 2022, grossCr: 68.1, title: "HHVM" },
      { year: 2025, grossCr: 155, title: "OG", isEvent: true },
    ],
    maxGross: 293,
    panIndiaViability: 60,
    budgetTolerance: 250,
    aliases: ["pk", "powerstar"],
    // precomputed ref: rawDvol=0.160, lossFilms=1, CHI=39, momentum=Stable
    films: [
      { year: 2014, title: "Attarintiki Daredi",     budgetCr: 40,   grossCr: 105   },
      { year: 2017, title: "Katamarayudu",           budgetCr: 55,   grossCr: 72    },
      { year: 2018, title: "Agnyaathavaasi",         budgetCr: 100,  grossCr: 72    }, // loss
      { year: 2019, title: "Vakeel Saab",            budgetCr: 50,   grossCr: 102   },
      { year: 2024, title: "Hari Hara Veera Mallu",  budgetCr: 250,  grossCr: 293   },
    ],
    precomputed: { rawDvol: 0.160, lossFilmCount: 1, momentumSignal: "Stable", chiScore: 39 },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 2
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: "Vijay Deverakonda",
    openingCr: 33,
    openingBase: 25.0,      // Day-1: DC₹18+Liger₹25+Kushi₹26+FS₹12+Kingdom₹33. No events(33<62.5). Base=25
    openingCeiling: 33,
    openingMedian: 25.0,
    openingFilms: [
      { year: 2019, grossCr: 18, title: "Dear Comrade" },
      { year: 2021, grossCr: 25, title: "Liger" },
      { year: 2023, grossCr: 26, title: "Kushi" },
      { year: 2024, grossCr: 12, title: "Family Star" },
      { year: 2025, grossCr: 33, title: "Kingdom" },
    ],
    maxGross: 125,
    panIndiaViability: 80,
    budgetTolerance: 125,  // VD12/Kingdom: ₹130Cr budget → ₹125Cr gross (near-miss, not profitable). Highest profitable budget: Geetha Govindam ₹12Cr. Capped at maxGross.
    aliases: ["vd", "rowdy", "vijay"],
    // precomputed ref: rawDvol=0.359, lossFilms=3, CHI=37, momentum=Stagnation Risk
    films: [
      { year: 2017, title: "Arjun Reddy",            budgetCr: 8,    grossCr: 40    },
      { year: 2018, title: "Geetha Govindam",        budgetCr: 12,   grossCr: 85    },
      { year: 2019, title: "Dear Comrade",            budgetCr: 30,   grossCr: 22    }, // loss
      { year: 2021, title: "World Famous Lover",     budgetCr: 35,   grossCr: 18    }, // loss
      { year: 2022, title: "Liger",                  budgetCr: 125,  grossCr: 55    }, // loss
      { year: 2024, title: "Family Star",             budgetCr: 40,   grossCr: 28    }, // loss
      { year: 2024, title: "VD12 / Kingdom",         budgetCr: 130,  grossCr: 125   },
    ],
    precomputed: { rawDvol: 0.359, lossFilmCount: 3, momentumSignal: "Stagnation Risk", chiScore: 37 },
  },

  {
    name: "Teja Sajja",
    openingCr: 24,
    openingBase: 15.0,      // Day-1: ZR₹2+HanuMan₹24+Mirai₹15. No events(24<37.5). Base=median([2,15,24])=15
    openingCeiling: 24,
    openingMedian: 15.0,
    openingFilms: [
      { year: 2022, grossCr: 2, title: "Zombie Reddy" },
      { year: 2024, grossCr: 24, title: "Hanu-Man" },
      { year: 2025, grossCr: 15, title: "Mirai" },
    ],
    maxGross: 296,
    panIndiaViability: 75,
    budgetTolerance: 50,
    aliases: ["teja", "hanu-man hero", "hanuman hero"],
    // precomputed ref: rawDvol=0.417, lossFilms=1, CHI=32, momentum=Stagnation Risk
    // Ishq (6→1) = 83% capital loss — one catastrophic event drives dvol
    films: [
      { year: 2021, title: "Zombie Reddy",           budgetCr: 5,    grossCr: 15    }, // ROI 3.0
      { year: 2022, title: "Ishq",                   budgetCr: 6,    grossCr: 1     }, // 83% loss
      { year: 2024, title: "Hanu-Man",               budgetCr: 40,   grossCr: 296   }, // ROI 7.41
      { year: 2024, title: "Mirai",                  budgetCr: 50,   grossCr: 141   }, // ROI 2.82
    ],
    precomputed: { rawDvol: 0.417, lossFilmCount: 1, momentumSignal: "Stagnation Risk", chiScore: 32 },
  },

  {
    name: "Nani",
    openingCr: 38,
    openingBase: 10.0,      // Day-1: SSR₹9+AnteS₹10+Dasara₹38.4+HiN₹10.5+Sari₹20. Dasara=event(>26.2). Base=10
    openingCeiling: 38,
    openingMedian: 10.5,
    openingFilms: [
      { year: 2019, grossCr: 9, title: "Shyam Singha Roy" },
      { year: 2021, grossCr: 10, title: "Ante Sundaraniki" },
      { year: 2023, grossCr: 38.4, title: "Dasara", isEvent: true },
      { year: 2023, grossCr: 10.5, title: "Hi Nanna" },
      { year: 2024, grossCr: 20, title: "Saripodhaa Sanivaaram" },
    ],
    maxGross: 119,
    panIndiaViability: 55,
    budgetTolerance: 80,
    aliases: ["natural star"],
    // precomputed ref: rawDvol=0.209, lossFilms=1, CHI=35, momentum=Expansion Ready
    films: [
      { year: 2016, title: "Gentlemen",              budgetCr: 15,   grossCr: 22    },
      { year: 2017, title: "Ninnu Kori",             budgetCr: 18,   grossCr: 42    },
      { year: 2018, title: "Krishnarjuna Yuddham",   budgetCr: 28,   grossCr: 30    },
      { year: 2018, title: "Jersey",                 budgetCr: 25,   grossCr: 60    },
      { year: 2021, title: "Tuck Jagadish",          budgetCr: 40,   grossCr: 22    }, // loss (OTT)
      { year: 2022, title: "Shyam Singha Roy",       budgetCr: 50,   grossCr: 80    },
      { year: 2022, title: "Ante Sundaraniki",       budgetCr: 30,   grossCr: 55,   multiStarrerWeight: 0.5 },
      { year: 2023, title: "Hi Nanna",               budgetCr: 40,   grossCr: 119   },
    ],
    precomputed: { rawDvol: 0.209, lossFilmCount: 1, momentumSignal: "Expansion Ready", chiScore: 35 },
  },

  {
    name: "Ram Pothineni",
    openingCr: 17,
    openingBase: 11.4,      // Day-1: iSmart₹12.2+Red₹9.3+Warriorr₹11.9+Skanda₹17+DIS₹11+AK₹7. No events. Base=11.4
    openingCeiling: 17,
    openingMedian: 11.4,
    openingFilms: [
      { year: 2019, grossCr: 12.2, title: "iSmart Shankar" },
      { year: 2021, grossCr: 9.3, title: "Red" },
      { year: 2022, grossCr: 11.9, title: "Warrior" },
      { year: 2023, grossCr: 17, title: "Skanda" },
      { year: 2024, grossCr: 11, title: "Double iSmart" },
      { year: 2025, grossCr: 7, title: "Andhra King" },
    ],
    maxGross: 75,
    panIndiaViability: 45,
    budgetTolerance: 28,   // Red ₹28Cr→₹35Cr ✓ — highest profitable budget. iSmart ₹18Cr→₹75Cr ✓ but lower budget. Double iSmart ₹90Cr→₹75Cr ✗ loss.
    aliases: ["ustaad"],
    // precomputed ref: rawDvol=0.208, lossFilms=1, CHI=32, momentum=Stagnation Risk
    films: [
      { year: 2016, title: "Hyper",                  budgetCr: 30,   grossCr: 18    }, // loss
      { year: 2018, title: "Vunnadhi Okate Zindagi", budgetCr: 22,   grossCr: 36    },
      { year: 2019, title: "iSmart Shankar",         budgetCr: 18,   grossCr: 75    }, // ROI 4.17x — career best. Corrected from ₹35Cr/₹63Cr.
      { year: 2022, title: "Red",                    budgetCr: 28,   grossCr: 35    },
      { year: 2024, title: "Double iSmart",          budgetCr: 90,   grossCr: 75,   franchiseSequel: true }, // sequel to iSmart Shankar — same gross ceiling, no distortion
    ],
    precomputed: { rawDvol: 0.208, lossFilmCount: 1, momentumSignal: "Stagnation Risk", chiScore: 32 },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 3
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: "Nikhil Siddhartha",
    openingCr: 11,
    openingBase: 5.0,      // Day-1: K2₹5+18Pages₹3.5+Spy₹11. No events(11<12.5). Base=5=median
    openingCeiling: 11,
    openingMedian: 5.0,
    openingFilms: [
      { year: 2022, grossCr: 5, title: "Karthikeya 2" },
      { year: 2022, grossCr: 3.5, title: "18 Pages" },
      { year: 2023, grossCr: 11, title: "Spy" },
    ],
    maxGross: 121,
    panIndiaViability: 85,
    budgetTolerance: 22,
    aliases: ["nikhil"],
    // NOTE: SI lands in T2 territory despite T3 opening gate — signals capital ceiling above tier rank
    // precomputed ref: rawDvol=0.187, lossFilms=2, CHI=43, momentum=Dormant
    films: [
      { year: 2017, title: "Keshava",                budgetCr: 12,   grossCr: 8     }, // loss
      { year: 2019, title: "Arjun Suravaram",        budgetCr: 15,   grossCr: 11    }, // loss
      { year: 2020, title: "Evaru",                  budgetCr: 10,   grossCr: 22    },
      { year: 2022, title: "18 Pages",               budgetCr: 18,   grossCr: 22    },
      { year: 2023, title: "Karthikeya 2",           budgetCr: 22,   grossCr: 121,  franchiseSequel: true }, // sequel — but K1 was micro-scale; audience discovery was via OTT. Flagged, maxGross kept.
      { year: 2024, title: "Swayambhu",              budgetCr: 15,   grossCr: 18    },
    ],
    precomputed: { rawDvol: 0.187, lossFilmCount: 2, momentumSignal: "Dormant", chiScore: 43 },
  },

  {
    name: "Naga Chaitanya",
    openingCr: 18,
    openingBase: 11.0,      // Day-1: LS₹16.8+TY₹3+Custody₹5.2+Thandel₹18.3. No events. Base=median([3,5.2,16.8,18.3])=11
    openingCeiling: 18,
    openingMedian: 11.0,
    openingFilms: [
      { year: 2021, grossCr: 16.8, title: "Love Story" },
      { year: 2022, grossCr: 3.0, title: "Thank You" },
      { year: 2023, grossCr: 5.2, title: "Custody" },
      { year: 2025, grossCr: 18.3, title: "Thandel" },
    ],
    maxGross: 88,
    panIndiaViability: 40,
    budgetTolerance: 75,
    aliases: ["chay"],
    // precomputed ref: rawDvol=0.259, lossFilms=1, CHI=31, momentum=Dormant
    films: [
      { year: 2016, title: "Premam",                 budgetCr: 18,   grossCr: 48    },
      { year: 2017, title: "Rarandoi Veduka Chuddam",budgetCr: 25,   grossCr: 50    },
      { year: 2018, title: "Yuddham Sharanam",       budgetCr: 22,   grossCr: 12    }, // loss
      { year: 2021, title: "Love Story",             budgetCr: 35,   grossCr: 88    },
      { year: 2022, title: "Thank You",              budgetCr: 40,   grossCr: 22    }, // loss
      { year: 2024, title: "Custody",                budgetCr: 75,   grossCr: 42    }, // loss
    ],
    precomputed: { rawDvol: 0.259, lossFilmCount: 1, momentumSignal: "Dormant", chiScore: 31 },
  },

  {
    name: "Varun Tej",
    openingCr: 10,
    openingBase: 1.5,      // Day-1: Gaddal₹10.1+Ghani₹4.75+GA₹1.5+OV₹1.5+Matka₹0.93. ₹10.1&₹4.75=events. Base=1.5
    openingCeiling: 10,
    openingMedian: 1.75,
    openingFilms: [
      { year: 2019, grossCr: 2, title: "Valmiki" },
      { year: 2019, grossCr: 10.1, title: "Gaddalakonda Ganesh" },
      { year: 2021, grossCr: 4.75, title: "Ghani" },
      { year: 2022, grossCr: 1.5, title: "Gandeevadhari Anasuya" },
      { year: 2023, grossCr: 1.5, title: "Operation Valentine" },
      { year: 2024, grossCr: 0.93, title: "Matka" },
    ],
    maxGross: 90,
    panIndiaViability: 35,
    budgetTolerance: 40,
    aliases: ["varun", "mega power star"],
    // precomputed ref: rawDvol=0.453, lossFilms=6, CHI=17, momentum=Dormant
    // Career best: Fidaa ₹90Cr (ROI 5.0). Last 3: avg 0.16 (severe capital destruction)
    films: [
      { year: 2015, title: "Kanche",                 budgetCr: 18,   grossCr: 22    },
      { year: 2016, title: "Fidaa",                  budgetCr: 18,   grossCr: 90    },
      { year: 2017, title: "Tholi Prema",            budgetCr: 22,   grossCr: 35    },
      { year: 2019, title: "Valmiki",                budgetCr: 28,   grossCr: 16    }, // loss
      { year: 2020, title: "Gaddalakonda Ganesh",    budgetCr: 30,   grossCr: 20    }, // loss
      { year: 2021, title: "Ghani",                  budgetCr: 80,   grossCr: 18    }, // loss
      { year: 2022, title: "F3",                     budgetCr: 60,   grossCr: 48,   multiStarrerWeight: 0.5 },
      { year: 2023, title: "Gandeevadhari Anasuya",  budgetCr: 40,   grossCr: 3     }, // loss 0.075
      { year: 2024, title: "Operation Valentine",    budgetCr: 40,   grossCr: 10,   multiStarrerWeight: 0.5 }, // loss
      { year: 2024, title: "Matka",                  budgetCr: 75,   grossCr: 12    }, // loss 0.16
    ],
    precomputed: { rawDvol: 0.453, lossFilmCount: 6, momentumSignal: "Dormant", chiScore: 17 },
  },

  {
    name: "Sai Dharam Tej",
    openingCr: 19,
    openingBase: 5.0,      // Day-1: PRP₹19.5+SBSB₹5.5+Republic₹4+Viru₹12. PRP=event(>13.75). Base=median([4.5,5.5,4,12])=5
    openingCeiling: 19,
    openingMedian: 5.5,
    openingFilms: [
      { year: 2018, grossCr: 4.5, title: "Tej I Love You" },
      { year: 2019, grossCr: 19.5, title: "Prati Roju Pandaage", isEvent: true },
      { year: 2021, grossCr: 5.5, title: "Solo Brathuke So Better" },
      { year: 2022, grossCr: 4.0, title: "Republic" },
      { year: 2023, grossCr: 12, title: "Virupaksha" },
    ],
    maxGross: 100,
    panIndiaViability: 35,
    budgetTolerance: 80,
    aliases: ["sd tej"],
    // precomputed ref: rawDvol=0.261, lossFilms=2, CHI=29, momentum=Dormant
    films: [
      { year: 2016, title: "Thikka",                 budgetCr: 15,   grossCr: 22    },
      { year: 2017, title: "Jawaan",                 budgetCr: 30,   grossCr: 18    }, // loss
      { year: 2018, title: "Inttelligent",           budgetCr: 35,   grossCr: 24    }, // loss
      { year: 2019, title: "Chitralahari",           budgetCr: 30,   grossCr: 48    },
      { year: 2020, title: "Solo Brathuke So Better",budgetCr: 22,   grossCr: 55    },
      { year: 2022, title: "Republic",               budgetCr: 80,   grossCr: 100   },
    ],
    precomputed: { rawDvol: 0.261, lossFilmCount: 2, momentumSignal: "Dormant", chiScore: 29 },
  },

  {
    name: "Nithin",
    openingCr: 9,
    openingBase: 3.6,      // Day-1: Macherla₹8.6+EOM₹3.8+Robinhood₹3.5+Thammudu₹3. No events(8.6<9.1). Base=3.6
    openingCeiling: 9,
    openingMedian: 3.6,
    openingFilms: [
      { year: 2022, grossCr: 8.6, title: "Macherla Niyojakavargam" },
      { year: 2023, grossCr: 3.8, title: "Extra Ordinary Man" },
      { year: 2024, grossCr: 3.5, title: "Robinhood" },
      { year: 2025, grossCr: 3.0, title: "Thammudu" },
    ],
    maxGross: 75,
    panIndiaViability: 30,
    budgetTolerance: 75,
    aliases: ["nithin"],
    // precomputed ref: rawDvol=0.324, lossFilms=3, CHI=24, momentum=Dormant
    films: [
      { year: 2016, title: "A..Aa",                  budgetCr: 20,   grossCr: 42    },
      { year: 2017, title: "Srinivasa Kalyanam",     budgetCr: 28,   grossCr: 48    },
      { year: 2019, title: "Bheeshma",               budgetCr: 35,   grossCr: 75    },
      { year: 2021, title: "Rang De",                budgetCr: 40,   grossCr: 35    }, // loss
      { year: 2022, title: "Macherla Niyojakavargam",budgetCr: 60,   grossCr: 32    }, // loss
      { year: 2023, title: "Kushi",                  budgetCr: 75,   grossCr: 38    }, // loss
    ],
    precomputed: { rawDvol: 0.324, lossFilmCount: 3, momentumSignal: "Dormant", chiScore: 24 },
  },

  {
    name: "Adivi Sesh",
    openingCr: 13,
    openingBase: 7.3,      // Day-1: Goodachari₹2.95+Evaru₹3.55+Major₹13+HIT2₹11. No events. Base=7.3=median
    openingCeiling: 13,
    openingMedian: 7.3,
    openingFilms: [
      { year: 2018, grossCr: 2.95, title: "Goodachari" },
      { year: 2019, grossCr: 3.55, title: "Evaru" },
      { year: 2022, grossCr: 13, title: "Major" },
      { year: 2023, grossCr: 11, title: "HIT: The Second Case" },
    ],
    maxGross: 64,
    panIndiaViability: 50,
    budgetTolerance: 32,
    aliases: ["sesh"],
    // precomputed ref: rawDvol=0, lossFilms=0, CHI=58, momentum=Dormant
    // All films profitable — zero capital destruction
    films: [
      { year: 2017, title: "Goodachari",             budgetCr: 6,    grossCr: 22    },
      { year: 2019, title: "Evaru",                  budgetCr: 10,   grossCr: 30    },
      { year: 2022, title: "Kshanam",                budgetCr: 8,    grossCr: 18    },
      { year: 2022, title: "Major",                  budgetCr: 32,   grossCr: 64    },
    ],
    precomputed: { rawDvol: 0, lossFilmCount: 0, momentumSignal: "Dormant", chiScore: 58 },
  },

  {
    name: "Akhil Akkineni",
    openingCr: 10,
    openingBase: 8.0,      // Day-1: Akhil₹10.1+Hello₹4.5+MrMajnu₹7.5+MEB₹9+Agent₹8. No events. Base=8=median
    openingCeiling: 10,
    openingMedian: 8.0,
    openingFilms: [
      { year: 2015, grossCr: 10.1, title: "Akhil" },
      { year: 2017, grossCr: 4.5, title: "Hello" },
      { year: 2019, grossCr: 7.5, title: "Mr. Majnu" },
      { year: 2022, grossCr: 9, title: "Most Eligible Bachelor" },
      { year: 2023, grossCr: 8, title: "Agent" },
    ],
    maxGross: 51,          // Most Eligible Bachelor ₹51Cr — corrected from ₹39Cr
    panIndiaViability: 30,
    budgetTolerance: 20,   // MEB ₹20Cr→₹51Cr ✓ — only profitable film at meaningful budget. Mr. Majnu was a loss (corrected).
    aliases: ["akhil"],
    // precomputed ref: rawDvol=0.343, lossFilms=4, CHI=19, momentum=Dormant — NEEDS RECOMPUTE after data correction
    films: [
      { year: 2015, title: "Akhil",                  budgetCr: 50,   grossCr: 33.65 }, // loss — corrected budget ₹50Cr, gross ₹33.65Cr
      { year: 2017, title: "Hello",                  budgetCr: 40,   grossCr: 34    }, // loss — corrected budget ₹40Cr, gross ₹34Cr
      { year: 2019, title: "Mr. Majnu",              budgetCr: 22,   grossCr: 12.82 }, // loss — was incorrectly ₹32Cr gross (profitable). Corrected to ₹12.82Cr.
      { year: 2021, title: "Most Eligible Bachelor", budgetCr: 20,   grossCr: 51    }, // ✓ — corrected budget ₹20Cr, gross ₹51Cr
      { year: 2023, title: "Agent",                  budgetCr: 85,   grossCr: 13    }, // loss — corrected gross ₹13Cr
      { year: 2024, title: "Saakini Daakini",        budgetCr: 40,   grossCr: 18    }, // loss
    ],
    precomputed: { rawDvol: 0.343, lossFilmCount: 4, momentumSignal: "Dormant", chiScore: 19 },
  },

  {
    name: "Naveen Polishetty",
    openingCr: 14,
    openingBase: 8.4,      // Day-1: JR₹8.4+MissShetty₹4+AOJ₹14. No events(14<21). Base=8.4=median
    openingCeiling: 14,
    openingMedian: 8.4,
    openingFilms: [
      { year: 2021, grossCr: 8.4, title: "Jathi Ratnalu" },
      { year: 2023, grossCr: 4.0, title: "Miss Shetty Mr. Polishetty" },
      { year: 2026, grossCr: 14, title: "Anaganaga Oka Raju" },
    ],
    maxGross: 79,
    panIndiaViability: 40,
    budgetTolerance: 20,
    aliases: ["naveen"],
    // All 4 films profitable. v1 incorrectly flagged as High volatile (STI=33).
    // v2 corrects: STI=100, Controlled. High upside dispersion ≠ capital destruction.
    films: [
      { year: 2019, title: "Agent Sai Srinivasa Athreya", budgetCr: 1,  grossCr: 20   },
      { year: 2021, title: "Jathi Ratnalu",               budgetCr: 6,  grossCr: 70   },
      { year: 2022, title: "Ante Sundaraniki",            budgetCr: 20, grossCr: 42.5 },
      { year: 2023, title: "Crazxy",                      budgetCr: 8,  grossCr: 79.5 },
    ],
    precomputed: { rawDvol: 0, lossFilmCount: 0, momentumSignal: "Dormant", chiScore: 72 },
  },

  {
    name: "Sharwanand",
    openingCr: 7,
    openingBase: 3.0,      // Day-1: Sreekaram₹7+Aadavallu₹3+OOJ₹1+Manamey₹3.5+NNM₹2. No events(7<7.5). Base=3
    openingCeiling: 7,
    openingMedian: 3.0,
    openingFilms: [
      { year: 2021, grossCr: 7, title: "Sreekaram" },
      { year: 2022, grossCr: 3, title: "Aadavallu Meeku Johaarlu" },
      { year: 2022, grossCr: 1, title: "Oke Oka Jeevitham" },
      { year: 2023, grossCr: 3.5, title: "Manamey" },
      { year: 2024, grossCr: 2, title: "Nari Nari Naduma Murari" },
    ],
    maxGross: 53,
    panIndiaViability: 30,
    budgetTolerance: 25,
    aliases: ["sharwa"],
    // precomputed ref: rawDvol=0.257, lossFilms=1, CHI=26, momentum=Dormant
    films: [
      { year: 2016, title: "Shatamanam Bhavati",     budgetCr: 15,   grossCr: 42    },
      { year: 2017, title: "Radha",                  budgetCr: 20,   grossCr: 28    },
      { year: 2019, title: "Padi Padi Leche Manasu", budgetCr: 25,   grossCr: 28    },
      { year: 2021, title: "Sreekaram",              budgetCr: 10,   grossCr: 22    },
      { year: 2022, title: "Meeku Mathrame Cheptha", budgetCr: 25,   grossCr: 12    }, // loss
      { year: 2022, title: "Oke Oka Jeevitham",      budgetCr: 25,   grossCr: 53    },
    ],
    precomputed: { rawDvol: 0.257, lossFilmCount: 1, momentumSignal: "Dormant", chiScore: 26 },
  },

  {
    name: "Viswak Sen",
    openingCr: 6,
    openingBase: 3.8,      // No Day-1 file data. Estimated per instruction: Kiran/Varun range
    openingCeiling: 6,
    openingMedian: 3.8,
    openingFilms: [
      { year: 2023, grossCr: 4.5, title: "Das Ka Dhamki" },
      { year: 2025, grossCr: 3.0, title: "Gangs of Godavari" },
    ],
    maxGross: 21,
    panIndiaViability: 20,
    budgetTolerance: 9,    // Hit: The First Case ₹9Cr→₹21Cr ✓. Gangs of Godavari ₹25Cr→₹14Cr ✗ loss. BT anchored to loss film.
    aliases: ["viswak", "mass ka das"],
    // precomputed ref: rawDvol=0.176, lossFilms=3, CHI=28, momentum=Dormant
    films: [
      { year: 2019, title: "Falaknuma Das",          budgetCr: 7,    grossCr: 14    },
      { year: 2020, title: "Hit: The First Case",    budgetCr: 9,    grossCr: 21    },
      { year: 2021, title: "Paagal",                 budgetCr: 12,   grossCr: 7     }, // loss
      { year: 2022, title: "Ori Devuda",             budgetCr: 14,   grossCr: 8     }, // loss
      { year: 2023, title: "Gangs of Godavari",      budgetCr: 25,   grossCr: 14    }, // loss
    ],
    precomputed: { rawDvol: 0.176, lossFilmCount: 3, momentumSignal: "Dormant", chiScore: 28 },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACTOR #21 — Kiran Abbavaram
  // Complete 10-film dataset. First actor fully integrated from raw data.
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: "Kiran Abbavaram",
    openingCr: 6,
    openingBase: 1.7,      // Day-1: KA₹5.75+Dilruba₹1.7+K-Ramp₹3.85. KA=event(>5.2). Base=median([2.5,0.5,0.3,1.7,3.85])=1.7
    openingCeiling: 6,
    openingMedian: 2.1,
    openingFilms: [
      { year: 2022, grossCr: 2.5, title: "SR Kalyanamandapam" },
      { year: 2022, grossCr: 0.5, title: "Vinaro Bhagyamu" },
      { year: 2022, grossCr: 0.3, title: "Sebastian PC 524" },
      { year: 2023, grossCr: 5.75, title: "KA" },
      { year: 2023, grossCr: 1.7, title: "Dilruba" },
      { year: 2025, grossCr: 3.85, title: "K-Ramp" },
    ],
    maxGross: 53,
    panIndiaViability: 25,
    budgetTolerance: 22,
    aliases: ["kiran", "ka"],
    films: [
      { year: 2021, title: "SR Kalyanamandapam",              budgetCr: 5,    grossCr: 14.5  }, // ROI 2.9
      { year: 2022, title: "Sebastian P.C. 524",              budgetCr: 6,    grossCr: 3     }, // loss 0.5
      { year: 2022, title: "Sammathame",                      budgetCr: 5,    grossCr: 6     }, // ROI 1.2
      { year: 2022, title: "Nenu Meeku Baaga Kavalsinavaadini",budgetCr: 7,   grossCr: 0.47  }, // loss 0.067
      { year: 2023, title: "Vinaro Bhagyamu Vishnu Katha",    budgetCr: 7.5,  grossCr: 11.07 }, // ROI 1.48
      { year: 2023, title: "Meter",                           budgetCr: 7,    grossCr: 0.5   }, // loss 0.071
      { year: 2023, title: "Rules Ranjann",                   budgetCr: 4.5,  grossCr: 2     }, // loss 0.44
      { year: 2024, title: "KA",                              budgetCr: 10,   grossCr: 53    }, // ROI 5.3 — breakout
      { year: 2025, title: "Dilruba",                         budgetCr: 22,   grossCr: 12.5  }, // loss 0.57
      { year: 2025, title: "K-Ramp",                          budgetCr: 18,   grossCr: 35    }, // ROI 1.94
    ],
    // No precomputed — engine computes live. 5 loss films, high dvol, Breakout Potential momentum.
  },

];
