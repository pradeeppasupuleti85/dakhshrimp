// /lib/parser.ts

export type ParsedIntent =
  | { type: "single"; token: string }
  | { type: "comparison"; left: string; right: string }
  | { type: "predict"; token: string; targetTier: number }
  | { type: "tier-check"; token: string; queriedTier?: number }
  | { type: "tier-explain"; token: string; queriedTier: number }
  | { type: "glossary"; term: string }
  | { type: "category"; label: string; route: string }
  | { type: "unknown"; raw: string };

const MOTION_VERBS = ["becoming","become","entering","enter","reaching","reach","falling","fall","dropping","drop","moving","move","crossing","cross","going","go","hitting","hit","joining","join","climbing","climb"];
const GLOSSARY_TERMS = ["scale index","stability index","tier","risk band","migration","pan india","roi","opening","gross","budget tolerance","volatility","starsq","momentum"];

export function parseQuery(input: string): ParsedIntent {
  const q = input.toLowerCase().trim()
    .replace(/,.*$/, "")
    .replace(/\b(if so|and if so|but when|and when|so when)\b.*$/, "")
    .replace(/\?/g,"")
    .replace(/tier(\d)/gi,"tier $1")
    .replace(/\s+/g," ").trim();
  if (!q) return { type: "unknown", raw: q };

  // 0. GLOSSARY
  const gm = q.match(/^(?:what is|what's|what are|explain|define|tell me about|how does|what does)\s+(.+)$/);
  if (gm) {
    const term = gm[1].replace(/\b(a|an|the|mean|means)\b/g,"").trim();
    if (GLOSSARY_TERMS.some(gt => term.includes(gt) || gt.includes(term))) return { type: "glossary", term };
  }

  const stripped = q.replace(/^(compare|comparing|contrast)\s+/,"").trim();

  // 1. COMPARISON
  const vsParts = stripped.split(/ vs | versus /).map(p => p.trim());
  if (vsParts.length === 2 && vsParts[0] && vsParts[1]) return { type: "comparison", left: vsParts[0], right: vsParts[1] };
  for (const sep of [" with "," against "]) {
    if (stripped.includes(sep)) {
      const parts = stripped.split(sep).map(p => p.trim());
      if (parts.length === 2 && parts[0] && parts[1]) return { type: "comparison", left: parts[0], right: parts[1] };
    }
  }

  // 2. TIER-EXPLAIN
  const whyTierA = q.match(/^(?:why|how|reason|explain why|explain how)\s+(?:is\s+)?(.+?)\s+(?:in\s+)?tier\s+(\d)/);
  if (whyTierA) {
    const t = cleanNoise(whyTierA[1].replace(/\b(is|a|an|the)\b/g,"").trim());
    if (t) return { type: "tier-explain", token: t, queriedTier: parseInt(whyTierA[2]) };
  }
  const whyTierB = q.match(/^why\s+is\s+(.+?)\s+(?:a\s+)?(?:in\s+)?tier\s+(\d)/);
  if (whyTierB) {
    const t = cleanNoise(whyTierB[1]);
    if (t) return { type: "tier-explain", token: t, queriedTier: parseInt(whyTierB[2]) };
  }

  // 3. PREDICT (before tier-check)
  const hasTierNumber = /tier\s+\d/.test(q);
  const hasMotionVerb = MOTION_VERBS.some(v => new RegExp("\\b" + v + "\\b").test(q));
  if (hasTierNumber && hasMotionVerb) {
    const tm = q.match(/tier\s+(\d)/);
    if (tm) {
      const targetTier = parseInt(tm[1]);
      const token = q
        .replace(/\b(when|will|can|could|would|should|is|are|does|do)\b/g,"")
        .replace(new RegExp("\\b(" + MOTION_VERBS.join("|") + ")\\b","g"),"")
        .replace(/\b(to|into|toward|tier|a|an|in|the|up|down)\b/g,"")
        .replace(/\d/g,"").replace(/\s+/g," ").trim();
      if (token) return { type: "predict", token, targetTier };
    }
  }

  // 4. TIER-CHECK
  const pA = q.match(/^(?:is|how is|isn't|is not|isnt)\s+(.+?)\s+(?:a\s+)?(?:in\s+)?tier\s+(\d)/);
  if (pA) { const t = cleanNoise(pA[1]); if (t) return { type: "tier-check", token: t, queriedTier: parseInt(pA[2]) }; }
  const pB = q.match(/^(?:which|what)\s+tier\s+(?:is\s+)?(.+?)(?:\s+in)?$/);
  if (pB) { const t = cleanNoise(pB[1]); if (t) return { type: "tier-check", token: t }; }
  const pC = q.match(/^(.+?)\s+is\s+(?:a\s+)?tier\s+(\d)/);
  if (pC) { const t = cleanNoise(pC[1]); if (t) return { type: "tier-check", token: t, queriedTier: parseInt(pC[2]) }; }

  // 5. CATEGORY
  // ── Top N (requires digit) ──
  const topN = q.match(/\b(?:top|best|give me top|who are top|list top)\s+(\d+)\s*(?:actors?|stars?|heroes?|ranked|capital)?/);
  if (topN) {
    const n = parseInt(topN[1]);
    return { type: "category", label: `Top ${n} Capital Assets by Scale`, route: `/starquantum?sort=scale&limit=${n}` };
  }

  // ── Tier N list ──
  const tierListMatch = q.match(/\btier\s+(\d)\b.*\b(actors?|stars?|heroes?|list|who|all)\b|\b(actors?|stars?|heroes?|list|who|all)\b.*\btier\s+(\d)\b/);
  if (tierListMatch) {
    const tier = tierListMatch[1] || tierListMatch[4];
    return { type: "category", label: "Tier " + tier + " Capital Assets", route: "/starquantum?tier=" + tier };
  }

  // ── "give/show/list + actors/stars/heroes" — FIX for "give top actors list" ──
  // Catches: "give top actors list", "show me actors", "list all actors", "give actors"
  if (/\b(give|show|list|display|get)\b/.test(q) && /\b(actors?|stars?|heroes?)\b/.test(q)) {
    if (/\btop\b/.test(q))
      return { type: "category", label: "Top Capital Assets by Scale", route: "/starquantum?sort=scale" };
    return { type: "category", label: "Full Capital Registry", route: "/starquantum" };
  }

  // ── Stability ranking ──
  if (/\b(top|best|most|highest)\b/.test(q) && /\b(stable|stability)\b/.test(q))
    return { type: "category", label: "Most Stable Capital Assets", route: "/starquantum?sort=stability" };

  // ── Top by scale — FIX: actors? stars? heroes? (plural forms) ──
  if (/\b(top|best|most|highest|strongest)\b/.test(q) && /\b(actors?|stars?|heroes?|capital|scale)\b/.test(q))
    return { type: "category", label: "Top Capital Assets by Scale", route: "/starquantum?sort=scale" };

  // ── Full list / leaderboard — FIX: actors? plural ──
  if (/\b(all actors?|full list|leaderboard|rankings?|ranked|registry|full registry)\b/.test(q))
    return { type: "category", label: "Full Capital Leaderboard", route: "/starquantum" };

  // ── "who are the top/best actors" style ──
  if (/\b(who are|which are)\b/.test(q) && /\b(actors?|stars?|heroes?)\b/.test(q))
    return { type: "category", label: "Top Capital Assets by Scale", route: "/starquantum?sort=scale" };

  // ── "why is X" without tier → deep analysis ──
  if (/^why\s+is\s+/.test(q))
    return { type: "category", label: "Deep Actor Analysis", route: "/starquantum" };

  // 6. SINGLE
  const token = stripped.replace(/\b(stats|info|show|give|me|tell|about|profile|data|details)\b/g,"").replace(/\s+/g," ").trim();
  if (token) return { type: "single", token };

  return { type: "unknown", raw: q };
}

function cleanNoise(raw: string): string {
  return raw.replace(/\b(a|an|the|actor|star|hero|film|in|at|this|really|actually|currently)\b/g,"").replace(/\s+/g," ").trim();
} 