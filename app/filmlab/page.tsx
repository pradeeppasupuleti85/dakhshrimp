"use client";
// /app/filmlab/page.tsx — FilmLab Pre-Production Simulator
// ─────────────────────────────────────────────────────────────────────────────
// Cinematic UI. Reads from Signal engine via getAllActorProfiles().
// Standalone route: /filmlab
// Does not modify engine.ts or Signal logic.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import type { EngineResult } from "@/lib/engine";
import {
  computeFilmLab,
  getActorProfiles,
  computeBudgetDanger,
  computeStarSwap,
  computeGreenlightVerdict,
  computeBudgetOptimizer,
} from "@/lib/filmlabEngine";
import type { FilmLabInput, FilmLabResult, Genre, Distribution, FilmCategory, ScoreBand, BudgetDangerResult, StarSwapResult } from "@/lib/filmlabModels";
import type { GreenlightVerdict, BudgetOptimizerResult, TheatricalRunModel } from "@/lib/filmlabEngine";
import {
  DEFAULT_INPUT,
  DEFAULT_RECOVERY,
  GENRE_META,
  DISTRIBUTION_META,
  FILM_CATEGORY_META,
  BAND_COLOR,
  DANGER_COLORS,
  getDistShare,
} from "@/lib/filmlabModels";

// ── HELPERS ───────────────────────────────────────────────────────────────────
// Guard against Infinity / NaN — these appear when Custom Actor has no film
// history (maxGross = Infinity) and raw arithmetic propagates through ceilings.
const cr = (n: number) => {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n >= 1000 ? `₹${(n / 1000).toFixed(1)}K Cr` : `₹${n.toFixed(0)} Cr`;
};

const pct = (n: number) => `${n.toFixed(1)}%`;
const mul = (n: number) => `${n.toFixed(2)}×`;
const r1  = (n: number) => Math.round(n * 10) / 10;
const WEEK_WEIGHTS = [0.58, 0.22, 0.12, 0.08];

// ── PLEXUS BACKGROUND ─────────────────────────────────────────────────────────
// Bright canvas plexus. Nodes = FilmLab formula terms with slow rotation.
// High-visibility white-lavender-peacock palette matching reference image.
function PlexusBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    // ── FilmLab formula node labels ────────────────────────────────────────
    const LABELS = [
      "CVI", "Scale Index", "CHI Score", "Stability",
      "Opening Cr", "Gross ROI", "True ROI", "BEP",
      "Stress Test", "Hero Fee", "P&A", "Tier",
      "Budget Eff", "Distribution", "Genre Demand",
      "Capital ROI", "Producer Share", "Downside %",
      "Adj Mult", "Star Budget Ceiling", "Recovery",
      "Satellite", "OTT Rights", "Overseas",
      "Star Capital", "Scenario", "Festival", "WOM",
      "Elasticity", "Base Case", "Break-Even", "Weak WOM",
    ];

    // ── Peacock + lavender palette — HIGH VISIBILITY ───────────────────────
    // Reference: bright white-lavender nodes, clearly visible lines on dark bg
    const NODE_COLORS = [
      "rgba(220,200,255,",  // bright lavender
      "rgba(180,220,255,",  // icy blue
      "rgba(160,230,200,",  // peacock teal
      "rgba(255,200,120,",  // gold accent
      "rgba(200,180,255,",  // soft purple
    ];
    const LINE_COLORS = [
      "rgba(180,160,255,",  // lavender line
      "rgba(100,180,255,",  // blue line
      "rgba(80,220,180,",   // teal line
    ];

    type Node = {
      x: number; y: number;
      vx: number; vy: number;
      r: number;
      label: string;
      labelAngle: number;     // current rotation angle of label
      rotSpeed: number;       // how fast label rotates
      phase: number;
      colorIdx: number;
    };

    let W = 0, H = 0;
    const nodes: Node[] = [];
    const MAX_DIST  = 260;   // connection distance
    const NODE_COUNT = 32;

    function resize() {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width  = W;
      canvas.height = H;
    }

    function initNodes() {
      nodes.length = 0;
      for (let i = 0; i < NODE_COUNT; i++) {
        const speed = 0.15 + Math.random() * 0.25;
        nodes.push({
          x:          Math.random() * W,
          y:          Math.random() * H,
          vx:         (Math.random() - 0.5) * speed,
          vy:         (Math.random() - 0.5) * speed,
          r:          3 + Math.random() * 3,
          label:      LABELS[i % LABELS.length],
          labelAngle: Math.random() * Math.PI * 2,
          // Slow rotation: some clockwise, some counter, varied speeds
          rotSpeed:   (Math.random() - 0.5) * 0.008,
          phase:      Math.random() * Math.PI * 2,
          colorIdx:   i % NODE_COLORS.length,
        });
      }
    }

    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      t += 0.007;

      // ── Move nodes ──────────────────────────────────────────────────────
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        // Soft edge wrap
        if (n.x < -100) n.x = W + 80;
        if (n.x > W + 100) n.x = -80;
        if (n.y < -100) n.y = H + 80;
        if (n.y > H + 100) n.y = -80;
        // Rotate the label angle slowly
        n.labelAngle += n.rotSpeed;
      }

      // ── Draw filled triangles between close node triplets ────────────────
      // (the polygon fill you see in the reference image)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dxij = nodes[i].x - nodes[j].x;
          const dyij = nodes[i].y - nodes[j].y;
          if (dxij*dxij + dyij*dyij > MAX_DIST * MAX_DIST) continue;
          for (let k = j + 1; k < nodes.length; k++) {
            const dxjk = nodes[j].x - nodes[k].x;
            const dyjk = nodes[j].y - nodes[k].y;
            if (dxjk*dxjk + dyjk*dyjk > MAX_DIST * MAX_DIST) continue;
            const dxik = nodes[i].x - nodes[k].x;
            const dyik = nodes[i].y - nodes[k].y;
            if (dxik*dxik + dyik*dyik > MAX_DIST * MAX_DIST) continue;
            // Fill triangle with very subtle tint
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.lineTo(nodes[k].x, nodes[k].y);
            ctx.closePath();
            ctx.fillStyle = "rgba(140,100,255,0.01)";
            ctx.fill();
          }
        }
      }

      // ── Draw connection lines ────────────────────────────────────────────
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist2 = dx*dx + dy*dy;
          if (dist2 > MAX_DIST * MAX_DIST) continue;
          const dist = Math.sqrt(dist2);
          const proximity = 1 - dist / MAX_DIST;

          // Line shimmer: oscillate between line colors
          const shimmer  = 0.5 + 0.5 * Math.sin(t * 1.2 + a.phase + b.phase);
          // Dimmed lines: 0.10–0.22 opacity (was 0.35–0.65 — too prominent vs panels)
          const lineAlpha = proximity * (0.10 + 0.12 * shimmer);
          const lcIdx = (a.colorIdx + b.colorIdx) % LINE_COLORS.length;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = LINE_COLORS[lcIdx] + lineAlpha.toFixed(3) + ")";
          ctx.lineWidth = 0.6 + proximity * 1.0; // up to 1.6px — visible
          ctx.stroke();
        }
      }

      // ── Draw nodes + rotating labels ─────────────────────────────────────
      for (const n of nodes) {
        const pulse  = 0.5 + 0.5 * Math.sin(t * 2.0 + n.phase);
        const r      = n.r + pulse * 2.0;           // larger pulse range
        const col    = NODE_COLORS[n.colorIdx];

        // ── Outer halo glow ──────────────────────────────────────────────
        const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 7);
        halo.addColorStop(0,   col + (0.13 + 0.07 * pulse).toFixed(3) + ")");
        halo.addColorStop(0.45, col + (0.03 + 0.02 * pulse).toFixed(3) + ")");
        halo.addColorStop(1,   col + "0)");
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 7, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        // ── Ring: bright circle around node (key visual from reference) ──
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = col + (0.18 + 0.12 * pulse).toFixed(3) + ")";
        ctx.lineWidth   = 0.7;
        ctx.stroke();

        // ── Core dot ────────────────────────────────────────────────────
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        const dotGrad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
        dotGrad.addColorStop(0,   "rgba(255,255,255,0.45)");     // softer white center
        dotGrad.addColorStop(0.5, col + "0.38)");
        dotGrad.addColorStop(1,   col + "0.22)");
        ctx.fillStyle = dotGrad;
        ctx.fill();

        // ── Rotating label ───────────────────────────────────────────────
        // The label orbits slowly around the node at a fixed radius
        const LR = r + 16;                          // orbit radius
        const lx = n.x + Math.cos(n.labelAngle) * LR;
        const ly = n.y + Math.sin(n.labelAngle) * LR;
        const labelAlpha = 0.25 + 0.10 * pulse;     // dim: 0.25–0.35

        // Label background pill for readability
        const label   = n.label;
        const fSize   = 10;
        ctx.font      = `600 ${fSize}px -apple-system, BlinkMacSystemFont, system-ui`;
        const tw      = ctx.measureText(label).width;
        const ph      = 12, pw = tw + 10;

        ctx.save();
        ctx.translate(lx, ly);
        // Tilt text to follow orbit angle (subtle — not full rotation)
        const tiltAngle = Math.sin(n.labelAngle) * 0.25;
        ctx.rotate(tiltAngle);

        // Pill bg
        // Pill background (manual rounded rect — avoids roundRect TS typing issues)
        const rx = 4, x0 = -pw/2, y0 = -ph/2;
        ctx.beginPath();
        ctx.moveTo(x0 + rx, y0);
        ctx.lineTo(x0 + pw - rx, y0);
        ctx.arcTo(x0 + pw, y0, x0 + pw, y0 + ph, rx);
        ctx.lineTo(x0 + pw, y0 + ph - rx);
        ctx.arcTo(x0 + pw, y0 + ph, x0 + pw - rx, y0 + ph, rx);
        ctx.lineTo(x0 + rx, y0 + ph);
        ctx.arcTo(x0, y0 + ph, x0, y0 + ph - rx, rx);
        ctx.lineTo(x0, y0 + rx);
        ctx.arcTo(x0, y0, x0 + rx, y0, rx);
        ctx.closePath();
        ctx.fillStyle = "rgba(10,5,30,0.55)";
        ctx.fill();
        ctx.strokeStyle = col + (labelAlpha * 0.55).toFixed(3) + ")";
        ctx.lineWidth = 0.7;
        ctx.stroke();

        // Label text
        ctx.fillStyle = col + labelAlpha.toFixed(3) + ")";
        ctx.textAlign = "center" as CanvasTextAlign;
        ctx.textBaseline = "middle" as CanvasTextBaseline;
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(() => { resize(); initNodes(); });
    ro.observe(canvas);
    resize();
    initNodes();
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
        opacity: 1,           // FULL opacity — let canvas control its own contrast
      }}
    />
  );
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function scoreToColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 65) return "#3B82F6";
  if (score >= 50) return "#fbbf24";
  if (score >= 35) return "#f97316";
  return "#FF4D4D";
}

function riskColor(risk: string): string {
  const map: Record<string, string> = {
    Safe:     "#22C55E",
    Watch:    "#fbbf24",
    Exposed:  "#f97316",
    Critical: "#FF4D4D",
  };
  return map[risk] ?? "#ffffff";
}

// ── ANIMATED SCORE RING ───────────────────────────────────────────────────────
function ScoreRing({
  score,
  band,
  bandColor,
  animating,
}: {
  score: number;
  band: ScoreBand;
  bandColor: string;
  animating: boolean;
}) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (animating) {
      setDisplayed(0);
      return;
    }
    const target = score;
    const duration = 1200;

    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(lerp(0, target, ease)));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };

    startRef.current = null;
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score, animating]);

  const R = 64;
  const circ = 2 * Math.PI * R;
  const offset = circ * (1 - displayed / 100);

  return (
    <div style={{ position: "relative", width: 176, height: 176 }}>
      <svg width={176} height={176} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={88} cy={88} r={R}
          stroke="rgba(180,150,255,0.07)"
          strokeWidth={10}
          fill="none"
        />
        <circle
          cx={88} cy={88} r={R}
          stroke={bandColor}
          strokeWidth={10}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke 0.4s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 2,
      }}>
        <span style={{
          fontFamily: "var(--font)",
          fontSize: 56,
          fontWeight: 800,
          color: bandColor,
          lineHeight: 1,
          letterSpacing: "-2px",
          transition: "color 0.4s ease",
        }}>
          {displayed}
        </span>
        <span style={{
          fontFamily: "var(--font)",
          fontSize: 14,
          fontWeight: 600,
          color: "rgba(168,184,216,0.60)",
          textTransform: "uppercase",
          letterSpacing: "2.5px",
        }}>
          SCORE
        </span>
      </div>
    </div>
  );
}

// ── METRIC TILE ───────────────────────────────────────────────────────────────
function MetricTile({
  label,
  value,
  sub,
  accent,
  large,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  large?: boolean;
}) {
  return (
    <div style={{
      background: "#191C3A",
      border: "1px solid rgba(180,150,255,0.10)",
      borderRadius: 16,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      boxShadow: "0 8px 32px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.30)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
    }}>
      <span style={{
        fontFamily: "var(--font)",
        fontSize: 13,
        fontWeight: 600,
        color: "rgba(168,184,216,0.65)",
        textTransform: "uppercase",
        letterSpacing: "1.5px",
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "var(--font)",
        fontSize: large ? 30 : 26,
        fontWeight: 700,
        color: accent ?? "#E8F0FF",
        lineHeight: 1.1,
        letterSpacing: "-0.5px",
      }}>
        {value}
      </span>
      {sub && (
        <span style={{
          fontFamily: "var(--font)",
          fontSize: 14,
          fontWeight: 500,
          color: "rgba(168,184,216,0.60)",
          marginTop: 3,
        }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ── COMPONENT BAR ─────────────────────────────────────────────────────────────
function ComponentBar({
  label,
  score,
  weight,
  color,
}: {
  label: string;
  score: number;
  weight: number;
  color?: string;
}) {
  const c = color ?? scoreToColor(score);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          fontFamily: "var(--font)",
          fontSize: 14,
          fontWeight: 600,
          color: "rgba(168,184,216,0.80)",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
        }}>
          {label}
        </span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{
            fontFamily: "var(--font)",
            fontSize: 14,
            fontWeight: 500,
            color: "rgba(168,184,216,0.38)",
            background: "rgba(59,142,255,0.12)",
            borderRadius: 6,
            padding: "2px 6px",
          }}>
            ×{weight}
          </span>
          <span style={{
            fontFamily: "var(--font)",
            fontSize: 22,
            fontWeight: 800,
            color: c,
            letterSpacing: "-0.5px",
          }}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>
      <div style={{
        height: 8,
        background: "rgba(180,150,255,0.06)",
        borderRadius: 8,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${score}%`,
          background: c.startsWith("linear") ? c : c,
          borderRadius: 8,
          transition: "width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
          boxShadow: c.startsWith("linear") ? "0 0 16px rgba(0,102,255,0.30)" : `0 0 12px ${c}55`,
        }} />
      </div>
    </div>
  );
}

// ── SLIDER ────────────────────────────────────────────────────────────────────
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  accent,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  accent?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{
          fontFamily: "var(--font)",
          fontSize: 13,
          fontWeight: 600,
          color: "rgba(168,184,216,0.80)",
          textTransform: "uppercase",
          letterSpacing: "0.8px",
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: "var(--font)",
          fontSize: 18,
          fontWeight: 700,
          color: accent ?? "#3B8EFF",
        }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          WebkitAppearance: "none",
          appearance: "none",
          width: "100%",
          height: 3,
          borderRadius: 2,
          background: `linear-gradient(to right, ${accent ?? "#3B8EFF"} 0%, ${accent ?? "#3B8EFF"} ${((value - min) / (max - min)) * 100}%, rgba(180,150,255,0.12) ${((value - min) / (max - min)) * 100}%, rgba(180,150,255,0.12) 100%)`,
          outline: "none",
          cursor: "pointer",
        }}
      />
    </div>
  );
}

// ── SELECT CHIP GROUP ─────────────────────────────────────────────────────────
function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  renderLabel,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (v: T) => React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              border: active
                ? "1px solid rgba(0,102,255,0.5)"
                : "1px solid rgba(180,150,255,0.12)",
              background: active
                ? "rgba(59,142,255,0.18)"
                : "rgba(59,142,255,0.05)",
              color: active ? "#3B8EFF" : "rgba(168,184,216,0.55)",
              fontFamily: "var(--font)",
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "1px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {renderLabel ? renderLabel(opt) : opt}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FILMLAB ANIMATION — Clapperboard fly-across + Scanner beam sweep
// ══════════════════════════════════════════════════════════════════════════════
function FilmLabAnimation({ clapperActive, scannerActive }: {
  clapperActive: boolean;
  scannerActive: boolean;
}) {
  if (!clapperActive && !scannerActive) return null;
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9999, overflow:"hidden" }}>
      {clapperActive && (
        <div className="fl-clapper-wrap">
          <div className="fl-clapper-body">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="fl-clapper-stripe" style={{ left:`${i*17}%`, background: i%2===0 ? "#00ffe0":"#060d1a" }} />
            ))}
            <div className="fl-clapper-label">FILMLAB</div>
            <div className="fl-clapper-sub">CAPITAL ANALYSIS</div>
          </div>
          <div className="fl-clapper-arm">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="fl-clapper-stripe" style={{ left:`${i*17}%`, background: i%2===0 ? "#00ffe0":"#060d1a" }} />
            ))}
          </div>
          <div className="fl-clap-flash" />
        </div>
      )}
      {scannerActive && (
        <div className="fl-scanner-wrap">
          <div className="fl-scanner-beam" />
          <div className="fl-scanner-trail" />
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function FilmLabPage() {
  // ── Secondary auth guard ──────────────────────────────────────────────────
  // Primary protection: middleware.ts checks starsq_session before the page loads.
  // Secondary protection: client-side fallback in case middleware is bypassed
  // (e.g. direct JS navigation, stale cache). Uses document.cookie — the only
  // cookie API available in a "use client" component.
  // cookies() from next/headers is server-only and cannot be used here.
  useEffect(() => {
    const hasSession = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith("starsq_session="));
    if (!hasSession) {
      window.location.replace("/login?from=/filmlab");
    }
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  const [actors, setActors] = useState<EngineResult[]>([]);
  const [input, setInput] = useState<FilmLabInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<FilmLabResult | null>(null);
  const [danger, setDanger] = useState<BudgetDangerResult | null>(null);
  const [swapResult, setSwapResult] = useState<StarSwapResult | null>(null);
  const [greenlight, setGreenlight] = useState<GreenlightVerdict | null>(null);
  const [optimizer, setOptimizer] = useState<BudgetOptimizerResult | null>(null);
  const [optimizerPhase, setOptimizerPhase] = useState<"idle" | "scanning" | "done">("idle");
  const [optimizerProgress, setOptimizerProgress] = useState(0); // 0–100 for scan bar
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [resultsStale, setResultsStale] = useState(false); // true when inputs changed after last run
  const [clapperActive, setClapperActive] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [panelGlow,     setPanelGlow]     = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [insightQuestion, setInsightQuestion] = useState<string | null>(null);
  const [insightOpen, setInsightOpen] = useState(false);
  // Corrected risk metrics — scenario-weighted, not from engine's flawed downsideProbability
  const [correctedLossProb, setCorrectedLossProb] = useState<number>(0);
  const [correctedCapitalAtRisk, setCorrectedCapitalAtRisk] = useState<number>(0);
  const [correctedExpectedProfit, setCorrectedExpectedProfit] = useState<number>(0);
  const [correctedCapSafeBudget, setCorrectedCapSafeBudget] = useState<number>(0);
  const [stressSafeBudget, setStressSafeBudget] = useState<number>(0);
  const [correctedMaxGross, setCorrectedMaxGross] = useState<number | null>(null);

  // Load actor profiles on mount
  useEffect(() => {
    try {
      const profiles = getActorProfiles();
      setActors(profiles);
    } catch (e) {
      setError("Failed to load actor profiles.");
    }
  }, []);


  // Manual trigger — compute only on Run button click
  const runAnalysis = useCallback(() => {
    if (!input.actorName && !input.useManualOverride) return;
    try {
      setAnimating(true);
      const r = computeFilmLab(input);
      const actorProfile = !input.useManualOverride && input.actorName
        ? actors.find(x => x.name === input.actorName) ?? null
        : null;
      const openingCrForDanger = input.useManualOverride || !input.actorName
        ? input.manualOpeningCr
        : actorProfile ? actorProfile.openingCr : input.manualOpeningCr;

      // ── Compute stressSafe BEFORE dangerR (dangerR depends on it) ─────────
      const pnaRate = r.pnaCost / input.productionBudget;
      const rawActorMaxGross = actorProfile ? actorProfile.maxGross : r.baseExpectedGross;
      // Guard: custom actor has maxGross=Infinity — use 3× base gross as finite proxy
      // so budget ceiling tiles display meaningful numbers instead of ₹InfinityCr.
      const actorMaxGross = isFinite(rawActorMaxGross) && rawActorMaxGross > 0
        ? rawActorMaxGross
        : r.baseExpectedGross * 3;
      const capSafeBudget = Math.round(actorMaxGross * getDistShare(input.distribution) / (1 + pnaRate));
      // Read stressSafeBudget from engine result (scenarioPanel) — single source of truth
      // Previously recomputed here with hardcoded 0.40, causing mismatch vs engine's value
      const stressSafe = r.scenarioPanel.stressSafeBudget;

      const dangerR = computeBudgetDanger(
        input.productionBudget,
        openingCrForDanger,
        r.tier,
        stressSafe,
        input.heroRemuneration ?? 0
      );
      const swapR = (!input.useManualOverride && input.actorName)
        ? computeStarSwap(input.productionBudget, input.actorName)
        : computeStarSwap(input.productionBudget, null);

      // ── Corrected risk metrics now come directly from engine ─────────────────
      // WOM no longer shifts gross — all market conditions affect curve only.
      // Weighted profit calc uses conservative base gross throughout.
      const WEIGHTED_SCENARIOS = [
        { mult: 1.00, prob: 0.40 },
        { mult: 0.85, prob: 0.30 },
        { mult: 1.15, prob: 0.20 },
        { mult: 1.00, prob: 0.10 },
      ];
      let weightedProfit = 0;
      WEIGHTED_SCENARIOS.forEach(({ mult, prob }) => {
        const scenarioGross = r.baseExpectedGross * mult;
        const scenarioShare = scenarioGross * 0.40;
        weightedProfit += prob * (scenarioShare - r.totalCapital);
      });

      // ── Animation sequence: clapper → scanner → reveal ───────────────────
      // Step 1: scroll to results + launch clapperboard immediately
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      setClapperActive(true);

      // Step 2: clapper "claps" at 450ms → scanner beam starts
      setTimeout(() => {
        setScannerActive(true);
      }, 450);

      // Step 3: scanner finishes (~1600ms total) → reveal results + glow
      setTimeout(() => {
        setResult(r);
        setDanger(dangerR);
        setSwapResult(swapR);
        // ── Greenlight Verdict ────────────────────────────────────────────────
        const gl = computeGreenlightVerdict(
          r.filmSuccessScore,
          r.downsideProbability,
          r.capitalExposureRisk,
          r.scenarioPanel.base.isProfitable,
          r.scenarioPanel.upside.isProfitable,
          r.scenarioPanel.stress.isProfitable,
          r.womScenario ?? "Average"
        );
        setGreenlight(gl);
        setOptimizer(null); // reset optimizer when main run fires
        setOptimizerPhase("idle");
        setOptimizerProgress(0);
        setCorrectedLossProb(r.downsideProbability);
        setCorrectedCapitalAtRisk(Math.round(r.capitalAtRisk));
        setCorrectedExpectedProfit(Math.round(weightedProfit));
        setCorrectedCapSafeBudget(capSafeBudget);
        setStressSafeBudget(stressSafe);
        setCorrectedMaxGross(actorProfile ? actorProfile.maxGross : null);
        setAnimating(false);
        setHasRun(true);
        setClapperActive(false);
        setScannerActive(false);
        setPanelGlow(true);
        // Fade glow after 2s
        setTimeout(() => setPanelGlow(false), 2000);
      }, 1800);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Computation error");
      setAnimating(false);
    }
  }, [input, actors]);

  const set = useCallback(<K extends keyof FilmLabInput>(key: K, value: FilmLabInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setStream = useCallback((key: keyof import("@/lib/filmlabModels").RecoveryStreams, value: number) => {
    setInput((prev) => ({ ...prev, recovery: { ...prev.recovery, [key]: value } }));
  }, []);

  // ── Group actors by tier for picker
  const tier1 = actors.filter((a) => a.tier === 1);
  const tier2 = actors.filter((a) => a.tier === 2);
  const tier3 = actors.filter((a) => a.tier === 3);

  const selectedActor = actors.find((a) => a.name === input.actorName) ?? null;

  return (
    <>
      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --font:   -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif;
          --mono:   "SF Mono", ui-monospace, "Fira Code", monospace;

          /* ── Cinema dark palette ─────────────────────────── */
          --bg:        #070010;
          --bg-2:      #0C0820;
          --card:      #10142A;
          --card-2:    #161836;
          --card-border: rgba(180,150,255,0.10);
          --card-border-strong: rgba(180,150,255,0.18);

          /* ── Text ─────────────────────────────────────────── */
          --text:    #F0F4FF;
          --text-2:  #A8B8D8;
          --text-3:  #6B80A0;
          --muted:   rgba(168,184,216,0.55);

          /* ── Peacock accents ──────────────────────────────── */
          --blue:    #3B8EFF;
          --teal:    #00D4A0;
          --purple:  #9B72FF;
          --gold:    #FFB800;
          --indigo:  #4D6AFF;
          --danger:  #FF4560;
          --warning: #FFA724;
          --safe:    #00D4A0;
        }

        html { font-size: 16px; }
        body { background: var(--bg); font-family: var(--font); color: var(--text); }

        /* ── Stars on dark background ─────────────────────── */
        .filmgrain::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            radial-gradient(1.5px 1.5px at  7% 11%, rgba(180,150,255,0.17) 0%, transparent 100%),
            radial-gradient(1px   1px   at 20% 35%, rgba(180,150,255,0.12) 0%, transparent 100%),
            radial-gradient(2px   2px   at 38%  5%, rgba(180,150,255,0.1) 0%, transparent 100%),
            radial-gradient(1px   1px   at 55% 50%, rgba(180,150,255,0.14) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 71% 18%, rgba(180,150,255,0.11) 0%, transparent 100%),
            radial-gradient(1px   1px   at 82% 63%, rgba(180,150,255,0.1) 0%, transparent 100%),
            radial-gradient(2px   2px   at 28% 75%, rgba(180,150,255,0.09) 0%, transparent 100%),
            radial-gradient(1px   1px   at 87% 30%, rgba(180,150,255,0.1) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 48% 86%, rgba(180,150,255,0.07) 0%, transparent 100%),
            radial-gradient(1px   1px   at  4% 58%, rgba(180,150,255,0.12) 0%, transparent 100%),
            radial-gradient(1px   1px   at 63%  8%, rgba(180,150,255,0.09) 0%, transparent 100%),
            radial-gradient(2px   2px   at 14% 50%, rgba(180,150,255,0.07) 0%, transparent 100%),
            radial-gradient(1px   1px   at 91% 72%, rgba(180,150,255,0.1) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 42% 42%, rgba(180,150,255,0.08) 0%, transparent 100%),
            radial-gradient(1px   1px   at 76% 88%, rgba(180,150,255,0.07) 0%, transparent 100%),
            radial-gradient(2px   2px   at 33% 22%, rgba(180,150,255,0.1) 0%, transparent 100%);
          pointer-events: none; z-index: 0;
          animation: star-drift 70s ease-in-out infinite alternate;
        }
        .filmgrain::after { display: none; }

        @keyframes star-drift {
          0%   { transform: translateY(0px) translateX(0px); }
          100% { transform: translateY(-12px) translateX(5px); }
        }

        /* ── Card base ────────────────────────────────────── */
        .card {
          background: var(--card);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 24px;
        }
        .card-elevated {
          background: var(--card-2);
          border: 1px solid var(--card-border-strong);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.55), 0 4px 16px rgba(59,142,255,0.08);
        }

        /* ── Sliders ──────────────────────────────────────── */
        input[type='range'] { accent-color: var(--blue); }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px; height: 20px; border-radius: 50%;
          background: linear-gradient(135deg, #3B8EFF, #4D6AFF);
          cursor: pointer;
          border: 2.5px solid rgba(255,255,255,0.20);
          box-shadow: 0 0 12px rgba(59,142,255,0.60);
        }
        input[type='range']::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%;
          background: linear-gradient(135deg, #3B8EFF, #4D6AFF);
          cursor: pointer; border: 2px solid rgba(180,150,255,0.15);
        }
        input[type='range']::-webkit-slider-runnable-track {
          height: 5px; border-radius: 3px;
          background: rgba(180,150,255,0.10);
        }

        /* ── Select ───────────────────────────────────────── */
        select {
          -webkit-appearance: none; appearance: none;
          background: #141830;
          border: 1.5px solid rgba(180,150,255,0.12);
          color: #F0F4FF;
          padding: 12px 40px 12px 16px;
          border-radius: 12px;
          font-family: var(--font); font-size: 16px;
          cursor: pointer; width: 100%;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%233B8EFF'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 16px center;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.30);
        }
        select:focus {
          border-color: rgba(59,142,255,0.55);
          box-shadow: 0 0 0 3px rgba(59,142,255,0.18);
        }
        select option { background: #111E33; color: #F0F4FF; }

        /* ── Pill toggle ──────────────────────────────────── */
        .pill-toggle {
          display: flex;
          background: rgba(180,150,255,0.06);
          border: 1.5px solid rgba(180,150,255,0.10);
          border-radius: 24px; padding: 3px; gap: 2px;
        }
        .pill-toggle button {
          flex: 1; padding: 8px 18px; border-radius: 20px;
          border: none; background: transparent;
          color: rgba(240,244,255,0.45);
          font-family: var(--font); font-size: 14px; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
        }
        .pill-toggle button.active {
          background: rgba(59,142,255,0.20);
          color: #3B8EFF; font-weight: 700;
        }

        /* ── Scrollbar ────────────────────────────────────── */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(180,150,255,0.12); border-radius: 3px; }

        /* ── Animations ───────────────────────────────────── */
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeSlideUp 0.45s ease forwards; }

        @keyframes pulse-glow {
          0%,100% { box-shadow: 0 24px 64px rgba(0,0,0,0.55), 0 4px 16px rgba(59,142,255,0.08); }
          50%      { box-shadow: 0 28px 80px rgba(0,0,0,0.60), 0 8px 28px rgba(59,142,255,0.22); }
        }
        .score-glow { animation: pulse-glow 3s ease-in-out infinite; }

        @keyframes scanline {
          0%   { top: -2px; }
          100% { top: 100%; }
        }

        /* ── FilmLab Clapperboard ─────────────────────────── */
        .fl-clapper-wrap {
          position: absolute;
          top: 18%;
          left: -220px;
          width: 200px;
          animation: clapperSlide 1.1s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        @keyframes clapperSlide {
          0%   { left: -220px; opacity: 1; }
          55%  { left: 42%;    opacity: 1; }
          70%  { left: 42%;    opacity: 1; }
          90%  { left: 110%;   opacity: 0.4; }
          100% { left: 115%;   opacity: 0; }
        }
        .fl-clapper-body {
          position: relative;
          width: 200px;
          height: 110px;
          background: #060d1a;
          border: 2px solid #00ffe0;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 0 24px rgba(0,255,224,0.55), 0 0 8px rgba(0,255,224,0.3);
        }
        .fl-clapper-stripe {
          position: absolute;
          top: 0; bottom: 0;
          width: 16%;
          opacity: 0.85;
        }
        .fl-clapper-label {
          position: absolute;
          bottom: 28px; left: 0; right: 0;
          text-align: center;
          font-size: 15px;
          font-weight: 800;
          color: #00ffe0;
          letter-spacing: 3px;
          font-family: var(--font);
          text-shadow: 0 0 12px rgba(0,255,224,0.9);
          z-index: 2;
        }
        .fl-clapper-sub {
          position: absolute;
          bottom: 12px; left: 0; right: 0;
          text-align: center;
          font-size: 9px;
          font-weight: 600;
          color: rgba(0,255,224,0.55);
          letter-spacing: 2px;
          font-family: var(--font);
          z-index: 2;
        }
        .fl-clapper-arm {
          position: relative;
          width: 200px;
          height: 32px;
          background: #060d1a;
          border: 2px solid #00ffe0;
          border-radius: 4px 4px 0 0;
          overflow: hidden;
          margin-bottom: -2px;
          transform-origin: left center;
          box-shadow: 0 0 14px rgba(0,255,224,0.4);
          animation: clapperClap 0.18s 0.45s ease-in forwards;
        }
        @keyframes clapperClap {
          0%   { transform: rotate(-28deg); }
          60%  { transform: rotate(2deg); }
          100% { transform: rotate(0deg); }
        }
        .fl-clap-flash {
          position: absolute;
          top: 14%; left: 38%;
          width: 180px; height: 80px;
          background: radial-gradient(ellipse, rgba(0,255,224,0.55) 0%, transparent 70%);
          border-radius: 50%;
          opacity: 0;
          animation: flashPop 0.25s 0.46s ease-out forwards;
        }
        @keyframes flashPop {
          0%   { opacity: 0;   transform: scale(0.4); }
          40%  { opacity: 1;   transform: scale(1.2); }
          100% { opacity: 0;   transform: scale(1.8); }
        }

        /* ── FilmLab Scanner Beam ─────────────────────────── */
        .fl-scanner-wrap {
          position: absolute;
          top: 0; right: 0;
          width: 55%;
          height: 100%;
          pointer-events: none;
        }
        .fl-scanner-beam {
          position: absolute;
          left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent 0%, rgba(0,255,224,0.15) 8%, rgba(0,255,224,0.9) 50%, rgba(0,255,224,0.15) 92%, transparent 100%);
          box-shadow: 0 0 18px 4px rgba(0,255,224,0.55), 0 0 6px 1px rgba(0,255,224,0.8);
          animation: beamSweep 1.2s 0s cubic-bezier(0.4,0,0.6,1) forwards;
        }
        @keyframes beamSweep {
          0%   { top: 8%;   opacity: 0; }
          8%   { opacity: 1; }
          88%  { opacity: 1; }
          100% { top: 92%;  opacity: 0; }
        }
        .fl-scanner-trail {
          position: absolute;
          left: 0; right: 0;
          height: 60px;
          background: linear-gradient(180deg, rgba(0,255,224,0.10) 0%, transparent 100%);
          animation: trailSweep 1.2s 0s cubic-bezier(0.4,0,0.6,1) forwards;
        }
        @keyframes trailSweep {
          0%   { top: 4%;   opacity: 0; }
          8%   { opacity: 1; }
          88%  { opacity: 1; }
          100% { top: 88%;  opacity: 0; }
        }

        /* ── Panel glow on reveal ─────────────────────────── */
        .fl-panel-glow {
          box-shadow: 0 0 0 2px rgba(0,255,224,0.35), 0 0 40px rgba(0,255,224,0.18), 0 24px 64px rgba(0,0,0,0.55) !important;
          transition: box-shadow 2.2s ease !important;
        }
      `}</style>

      <div className="filmgrain" style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #070010 0%, #0C0820 35%, #0A1230 70%, #060D1A 100%)",
        fontFamily: "var(--font)",
        color: "#F0F4FF",
        position: "relative",
      }}>

        {/* ── Plexus animated canvas background ── */}
        <PlexusBg />

        {/* ── FilmLab animation overlay ── */}
        <FilmLabAnimation clapperActive={clapperActive} scannerActive={scannerActive} />

        {/* ── HEADER ── */}
        <header style={{
          borderBottom: "1px solid rgba(180,150,255,0.08)",
          background: "rgba(6,5,16,0.96)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 20px rgba(0,0,0,0.60)",
        }}>
          <div style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Film strip decoration */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                opacity: 0.6,
              }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{
                    width: 8,
                    height: 5,
                    border: "1px solid rgba(0,102,255,0.5)",
                    borderRadius: 1,
                    background: i % 2 === 0 ? "rgba(59,142,255,0.14)" : "transparent",
                  }} />
                ))}
              </div>

              <div>
                <div style={{
                  fontFamily: "var(--font)",
                  fontSize: 22,
                  fontWeight: 800,
                  background: "linear-gradient(90deg, #3B8EFF, #9B72FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px",
                  lineHeight: 1,
                }}>
                  FilmLab
                </div>
                <div style={{
                  fontSize: 13,
                  color: "rgba(168,184,216,0.65)",
                  textTransform: "uppercase",
                  letterSpacing: "3px",
                  marginTop: 2,
                }}>
                  Pre-Production Capital Simulator
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{
                fontSize: 13,
                color: "rgba(168,184,216,0.55)",
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}>
                StarsQ Module
              </div>
              <a href="/" style={{
                fontFamily: "var(--font)",
                fontSize: 13,
                color: "rgba(168,184,216,0.65)",
                textDecoration: "none",
                border: "1px solid rgba(180,150,255,0.12)",
                padding: "4px 10px",
                borderRadius: 4,
                textTransform: "uppercase",
                letterSpacing: "1px",
                transition: "all 0.15s",
              }}>
                ← Signal
              </a>
            </div>
          </div>
        </header>

        {/* ── MODULE IDENTITY BANNER ── */}
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(59,142,255,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#9B72FF",
              boxShadow: "0 0 8px #9B72FF",
            }} />
            <span style={{
              fontFamily: "var(--font)",
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(168,184,216,0.90)",
              letterSpacing: "0.02em",
            }}>
              <span style={{ color: "#9B72FF" }}>FilmLab</span> analyzes film strategy.
              {" "}It answers:{" "}
              <span style={{ color: "rgba(255,255,255,0.75)", fontStyle: "italic" }}>
                "What combination of actor, genre, budget and release window maximizes success probability?"
              </span>
            </span>
          </div>
          <div style={{
            fontSize: 11,
            color: "rgba(168,184,216,0.35)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
          }}>
            Capital Intelligence · Not a Ranking Tool
          </div>
        </div>

        {/* ── MAIN LAYOUT ── */}
        <main style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 24px",
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          gap: 24,
          position: "relative",
          zIndex: 1,
          alignItems: "start",
        }}>

          {/* ══ LEFT PANEL — INPUTS ══════════════════════════════════════════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Actor Source Toggle */}
            <div>
              <div style={{
                fontSize: 14,
                color: "rgba(168,184,216,0.70)",
                textTransform: "uppercase",
                letterSpacing: "2px",
                fontWeight: "600",
                marginBottom: 8,
              }}>
                Actor Data Source
              </div>
              <div className="pill-toggle">
                <button
                  className={!input.useManualOverride ? "active" : ""}
                  onClick={() => set("useManualOverride", false)}
                >
                  StarsQ Actor
                </button>
                <button
                  className={input.useManualOverride ? "active" : ""}
                  onClick={() => set("useManualOverride", true)}
                >
                  Custom Actor
                </button>
              </div>
            </div>

            {/* ── Actor Picker ── */}
            {!input.useManualOverride && (
              <div style={{
                background: "rgba(59,142,255,0.05)",
                border: "1px solid rgba(59,142,255,0.18)",
                borderRadius: 10,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}>
                <div style={{
                  fontSize: 13,
                  color: "rgba(0,102,255,0.7)",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                }}>
                  Select Actor
                </div>

                <select
                  value={input.actorName ?? ""}
                  onChange={(e) => set("actorName", e.target.value || null)}
                >
                  <option value="">— Choose actor —</option>
                  {tier1.length > 0 && (
                    <optgroup label="──── Tier 1  (₹60Cr+ Opening)">
                      {tier1.map((a) => (
                        <option key={a.name} value={a.name}>{a.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {tier2.length > 0 && (
                    <optgroup label="──── Tier 2  (₹30–60Cr Opening)">
                      {tier2.map((a) => (
                        <option key={a.name} value={a.name}>{a.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {tier3.length > 0 && (
                    <optgroup label="──── Tier 3  (< ₹30Cr Opening)">
                      {tier3.map((a) => (
                        <option key={a.name} value={a.name}>{a.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {/* Selected actor profile chips */}
                {selectedActor && (
                  <>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                    marginTop: 4,
                  }}>
                    {[
                      { label: "Scale", value: selectedActor.scaleIndex.toFixed(1) },
                      { label: "Stability", value: selectedActor.stabilityIndex.toFixed(1) },
                      { label: "CHI", value: selectedActor.chiScore.toFixed(1) },
                      { label: "Tier", value: `T${selectedActor.tier}  ₹${selectedActor.openingCr}Cr` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{
                        background: "#0D1929",
                        borderRadius: 6,
                        padding: "6px 8px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <span style={{ fontSize: 13, color: "rgba(168,184,216,0.65)", textTransform: "uppercase", letterSpacing: "1px" }}>
                          {label}
                        </span>
                        <span style={{ fontFamily: "var(--font)", fontSize: 13, color: "#3B8EFF", fontWeight: 700 }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Data freshness label */}
                  {(() => {
                    const filmCount = selectedActor.filmCount ?? 0;
                    const latestYear = selectedActor.latestFilmYear ?? null;
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, padding: "5px 8px", background: "rgba(59,142,255,0.04)", borderRadius: 6, border: "1px solid rgba(59,142,255,0.08)" }}>
                        <span style={{ fontSize: 11, color: "rgba(59,142,255,0.6)", letterSpacing: "0.06em" }}>
                          📊 {filmCount} films analysed
                        </span>
                        {latestYear ? <>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>·</span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>Latest: {latestYear}</span>
                        </> : null}
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>·</span>
                        <span style={{ fontSize: 11, color: "rgba(155,114,255,0.5)" }}>Expert-assessed inputs</span>
                      </div>
                    );
                  })()}
                  </>
                )}
              </div>
            )}

            {/* ── Manual Override ── */}
            {input.useManualOverride && (
              <div style={{
                background: "rgba(59,142,255,0.05)",
                border: "1px solid rgba(59,142,255,0.20)",
                borderRadius: 10,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}>
                <div style={{
                  fontSize: 13,
                  color: "rgba(0,102,255,0.8)",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                }}>
                  Manual Actor Metrics
                </div>

                <Slider
                  label="Scale Index"
                  value={input.manualScaleIndex}
                  min={0} max={100}
                  onChange={(v) => set("manualScaleIndex", v)}
                  accent="#4D6AFF"
                />
                <Slider
                  label="Stability Index"
                  value={input.manualStabilityIndex}
                  min={0} max={100}
                  onChange={(v) => set("manualStabilityIndex", v)}
                  accent="#4D6AFF"
                />
                <Slider
                  label="CHI Score"
                  value={input.manualChiScore}
                  min={0} max={100}
                  onChange={(v) => set("manualChiScore", v)}
                  accent="#4D6AFF"
                />
                <Slider
                  label="Opening Day ₹Cr"
                  value={input.manualOpeningCr}
                  min={5} max={150} step={5}
                  onChange={(v) => set("manualOpeningCr", v)}
                  format={(v) => `₹${v}Cr`}
                  accent="#4D6AFF"
                />

                {/* Tier selector */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "rgba(240,244,255,0.65)", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Tier
                  </span>
                  <ChipGroup
                    options={["1", "2", "3"] as any}
                    value={String(input.manualTier) as any}
                    onChange={(v) => set("manualTier", Number(v) as 1 | 2 | 3)}
                    renderLabel={(v) => `Tier ${v}`}
                  />
                </div>
              </div>
            )}

            {/* ── Film Parameters ── */}
            <div style={{
              background: "#10152C",
              border: "1px solid rgba(180,150,255,0.09)",
              borderRadius: 10,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}>
              <div style={{
                fontSize: 14,
                color: "rgba(168,184,216,0.70)",
                textTransform: "uppercase",
                letterSpacing: "2px",
                fontWeight: "600",
              }}>
                Film Parameters
              </div>

              <Slider
                label="Production Budget"
                value={input.productionBudget}
                min={5} max={1000} step={5}
                onChange={(v) => set("productionBudget", v)}
                format={(v) => `₹${v}Cr`}
                accent="#3B8EFF"
              />

              <Slider
                label="Hero Remuneration"
                value={input.heroRemuneration}
                min={0} max={100} step={5}
                onChange={(v) => set("heroRemuneration", v)}
                format={(v) => v === 0 ? "Not set" : `₹${v}Cr`}
                accent="#4D6AFF"
              />

              {/* Genre */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 13, color: "rgba(240,244,255,0.65)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Genre
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                  {(Object.keys(GENRE_META) as Genre[]).map((g) => {
                    const active = g === input.genre;
                    const meta = GENRE_META[g];
                    return (
                      <button
                        key={g}
                        onClick={() => set("genre", g)}
                        title={meta.description}
                        style={{
                          padding: "8px 4px",
                          borderRadius: 7,
                          border: active
                            ? "2px solid rgba(59,142,255,0.55)"
                            : "1px solid rgba(180,150,255,0.06)",
                          background: active
                            ? "rgba(59,142,255,0.10)"
                            : "rgba(180,150,255,0.04)",
                          color: active ? "#3B8EFF" : "rgba(10,31,68,0.50)",
                          fontFamily: "var(--font)",
                          fontSize: 13,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 3,
                          transition: "all 0.15s",
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{meta.icon}</span>
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Distribution */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 13, color: "rgba(240,244,255,0.65)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Distribution
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {(["Regional", "Pan India", "Global"] as Distribution[]).map((d) => {
                    const active = d === input.distribution;
                    const meta = DISTRIBUTION_META[d];
                    return (
                      <button
                        key={d}
                        onClick={() => set("distribution", d)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 7,
                          border: active
                            ? "1px solid rgba(0,102,255,0.35)"
                            : "1px solid rgba(180,150,255,0.06)",
                          background: active
                            ? "rgba(59,142,255,0.07)"
                            : "rgba(180,150,255,0.04)",
                          color: active ? "#3B8EFF" : "rgba(10,31,68,0.50)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.15s",
                          fontFamily: "var(--font)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span>{meta.icon}</span>
                          <span style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "1px" }}>{d}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, color: active ? "rgba(0,102,255,0.5)" : "rgba(255,255,255,0.2)" }}>
                            P&A {(meta.pnaMultiplier * 100).toFixed(0)}%
                          </span>
                          <span style={{
                            fontFamily: "var(--font)",
                            fontSize: 15,
                            fontWeight: 700,
                          }}>
                            {/* Distribution strength score badge */}
                            <span style={{
                              fontSize: 13,
                              background: active ? "rgba(59,142,255,0.14)" : "rgba(180,150,255,0.05)",
                              padding: "2px 6px",
                              borderRadius: 10,
                            }}>
                              {d === "Regional" ? 50 : d === "Pan India" ? 75 : 90}
                            </span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Film Category */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 13, color: "rgba(240,244,255,0.65)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Film Category
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {(["Normal", "Trend", "Event"] as FilmCategory[]).map((cat) => {
                    const active = cat === (input.filmCategory ?? "Normal");
                    const meta = FILM_CATEGORY_META[cat];
                    const multLabels: Record<FilmCategory, string> = { Normal: "1.0×", Trend: "1.3×", Event: "1.8×" };
                    return (
                      <button
                        key={cat}
                        onClick={() => set("filmCategory", cat)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 7,
                          border: active
                            ? `1px solid ${meta.color}40`
                            : "1px solid rgba(180,150,255,0.06)",
                          background: active
                            ? `${meta.color}12`
                            : "rgba(180,150,255,0.04)",
                          color: active ? meta.color : "rgba(200,210,240,0.35)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.15s",
                          fontFamily: "var(--font)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span>{meta.icon}</span>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
                            <span style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.8px" }}>{meta.label}</span>
                            <span style={{ fontSize: 10, color: active ? `${meta.color}80` : "rgba(255,255,255,0.18)", letterSpacing: "0.3px" }}>{meta.description}</span>
                          </div>
                        </div>
                        <span style={{
                          fontSize: 13,
                          fontWeight: 700,
                          background: active ? `${meta.color}20` : "rgba(180,150,255,0.05)",
                          color: active ? meta.color : "rgba(255,255,255,0.2)",
                          padding: "2px 8px",
                          borderRadius: 10,
                        }}>
                          {multLabels[cat]}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* Context note */}
                {(input.filmCategory === "Event" || input.filmCategory === "Trend") && (
                  <div style={{ fontSize: 10, color: "rgba(240,244,255,0.30)", lineHeight: 1.5 }}>
                    {input.filmCategory === "Event"
                      ? "⚡ Event multiplier applies to opening only. Scenario gross is unchanged — capital math remains conservative."
                      : "📈 Trend multiplier reflects buzz-driven opening lift. Content quality determines whether it holds."}
                  </div>
                )}
              </div>

            </div>

            {/* ── Market Conditions — 4-selector architecture ── */}
            <div style={{
              background: "#10152C",
              border: "1px solid rgba(180,150,255,0.09)",
              borderRadius: 10,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}>
              {/* Header */}
              <div style={{ fontSize: 13, color: "rgba(168,184,216,0.65)", textTransform: "uppercase" as const, letterSpacing: "2px" }}>
                Market Conditions
              </div>

              {/* ── 1. PRE-RELEASE BUZZ ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, color: "rgba(240,244,255,0.35)", textTransform: "uppercase" as const, letterSpacing: "1.5px" }}>
                  Pre-Release Buzz <span style={{ color: "rgba(240,244,255,0.20)" }}>· affects opening day</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {(["Normal", "StrongBuzz", "EventFilm"] as const).map((b) => {
                    const labels: Record<string, string> = { Normal: "Normal Release", StrongBuzz: "Strong Buzz", EventFilm: "Event Film" };
                    const icons:  Record<string, string> = { Normal: "🎬", StrongBuzz: "🔥", EventFilm: "⚡" };
                    const descs:  Record<string, string> = { Normal: "Standard marketing", StrongBuzz: "Viral songs + trailer hype", EventFilm: "Marquee combo · franchise · cultural moment" };
                    const colors: Record<string, string> = { Normal: "#94A3B8", StrongBuzz: "#F59E0B", EventFilm: "#7B9FFF" };
                    const mults:  Record<string, string> = { Normal: "T1 ×1.0", StrongBuzz: "T1 ×1.35  T2 ×1.20", EventFilm: "T1 ×1.60  T2 ×1.35" };
                    const active = (input.preReleaseBuzz ?? "Normal") === b;
                    const col = colors[b];
                    return (
                      <button key={b} onClick={() => set("preReleaseBuzz" as any, b)}
                        style={{ padding: "9px 12px", borderRadius: 7, border: active ? `1px solid ${col}45` : "1px solid rgba(180,150,255,0.06)", background: active ? `${col}0e` : "rgba(180,150,255,0.03)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s", fontFamily: "var(--font)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14 }}>{icons[b]}</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: 1, textAlign: "left" as const }}>
                            <span style={{ fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: active ? col : "rgba(200,210,240,0.50)", fontWeight: active ? 700 : 400 }}>{labels[b]}</span>
                            <span style={{ fontSize: 10, color: active ? `${col}70` : "rgba(255,255,255,0.18)" }}>{descs[b]}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: active ? col : "rgba(255,255,255,0.18)", background: active ? `${col}18` : "rgba(255,255,255,0.03)", padding: "2px 7px", borderRadius: 8, flexShrink: 0, marginLeft: 6 }}>{mults[b]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 2. RELEASE TIMING ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, color: "rgba(240,244,255,0.35)", textTransform: "uppercase" as const, letterSpacing: "1.5px" }}>
                  Release Timing <span style={{ color: "rgba(240,244,255,0.20)" }}>· affects opening day</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["Normal", "Festival"] as const).map((t) => {
                    const labels: Record<string, string> = { Normal: "📅 Normal Friday", Festival: "🎊 Festival Release" };
                    const descs:  Record<string, string> = { Normal: "Standard window", Festival: "Sankranti · Eid · Dussehra" };
                    const colors: Record<string, string> = { Normal: "#94A3B8", Festival: "#22D3A5" };
                    const mults:  Record<string, string> = { Normal: "×1.00", Festival: "×1.20" };
                    const active = (input.releaseTiming ?? "Normal") === t;
                    const col = colors[t];
                    return (
                      <button key={t} onClick={() => set("releaseTiming" as any, t)}
                        style={{ flex: 1, padding: "9px 10px", borderRadius: 7, border: active ? `1px solid ${col}45` : "1px solid rgba(180,150,255,0.06)", background: active ? `${col}0e` : "rgba(180,150,255,0.03)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.15s" }}>
                        <span style={{ fontSize: 12, color: active ? col : "rgba(200,210,240,0.45)", fontWeight: active ? 700 : 400, fontFamily: "var(--font)", textAlign: "center" as const }}>{labels[t]}</span>
                        <span style={{ fontSize: 10, color: active ? `${col}70` : "rgba(255,255,255,0.20)" }}>{descs[t]}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: active ? col : "rgba(255,255,255,0.20)", fontFamily: "var(--font)" }}>{mults[t]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 3. MARKET FRICTION ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, color: "rgba(240,244,255,0.35)", textTransform: "uppercase" as const, letterSpacing: "1.5px" }}>
                  Market Friction <span style={{ color: "rgba(240,244,255,0.20)" }}>· affects opening day</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["Normal", "HighFriction"] as const).map((f) => {
                    const labels: Record<string, string> = { Normal: "✅ Normal Market", HighFriction: "⚠️ High Friction" };
                    const descs:  Record<string, string> = { Normal: "No major competition", HighFriction: "IPL · big clash · bad news" };
                    const colors: Record<string, string> = { Normal: "#94A3B8", HighFriction: "#FF6B6B" };
                    const mults:  Record<string, string> = { Normal: "×1.00", HighFriction: "×0.85" };
                    const active = (input.marketFriction ?? "Normal") === f;
                    const col = colors[f];
                    return (
                      <button key={f} onClick={() => set("marketFriction" as any, f)}
                        style={{ flex: 1, padding: "9px 10px", borderRadius: 7, border: active ? `1px solid ${col}45` : "1px solid rgba(180,150,255,0.06)", background: active ? `${col}0e` : "rgba(180,150,255,0.03)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.15s" }}>
                        <span style={{ fontSize: 12, color: active ? col : "rgba(200,210,240,0.45)", fontWeight: active ? 700 : 400, fontFamily: "var(--font)", textAlign: "center" as const }}>{labels[f]}</span>
                        <span style={{ fontSize: 10, color: active ? `${col}70` : "rgba(255,255,255,0.20)" }}>{descs[f]}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: active ? col : "rgba(255,255,255,0.20)", fontFamily: "var(--font)" }}>{mults[f]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 4. POST-RELEASE WOM ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, color: "rgba(240,244,255,0.35)", textTransform: "uppercase" as const, letterSpacing: "1.5px" }}>
                  Post-Release WOM <span style={{ color: "rgba(240,244,255,0.20)" }}>· affects daily decay curve only</span>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  {(["Weak", "Average", "Strong"] as const).map((w) => {
                    const icons:  Record<string, string> = { Weak: "📉", Average: "📊", Strong: "🚀" };
                    const descs:  Record<string, string> = { Weak: "Story disappoints", Average: "Normal decay", Strong: "Blockbuster talk" };
                    const holds:  Record<string, string> = { Weak: "Mon ~20%", Average: "Mon ~30%", Strong: "Mon ~45%" };
                    const colors: Record<string, string> = { Weak: "#FF4D4D", Average: "#FFB800", Strong: "#22C55E" };
                    const active = (input.womScenario ?? "Average") === w;
                    const col = colors[w];
                    return (
                      <button key={w} onClick={() => set("womScenario" as any, w)}
                        style={{ flex: 1, padding: "9px 8px", borderRadius: 7, border: active ? `1px solid ${col}45` : "1px solid rgba(180,150,255,0.06)", background: active ? `${col}0e` : "rgba(180,150,255,0.03)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.15s" }}>
                        <span style={{ fontSize: 16 }}>{icons[w]}</span>
                        <span style={{ fontSize: 11, color: active ? col : "rgba(200,210,240,0.45)", fontWeight: active ? 700 : 400, fontFamily: "var(--font)" }}>{w} WOM</span>
                        <span style={{ fontSize: 10, color: active ? `${col}70` : "rgba(255,255,255,0.18)" }}>{descs[w]}</span>
                        <span style={{ fontSize: 9, color: active ? `${col}60` : "rgba(255,255,255,0.14)", marginTop: 1 }}>{holds[w]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Opening Drivers formula display ── */}
              {(() => {
                const buzzVal = input.preReleaseBuzz ?? "Normal";
                const timingVal = input.releaseTiming ?? "Normal";
                const frictionVal = input.marketFriction ?? "Normal";
                const anyActive = buzzVal !== "Normal" || timingVal !== "Festival" || frictionVal !== "Normal";
                const buzzColors: Record<string, string> = { Normal: "#94A3B8", StrongBuzz: "#F59E0B", EventFilm: "#7B9FFF" };
                const timingColors: Record<string, string> = { Normal: "#94A3B8", Festival: "#22D3A5" };
                const frictionColors: Record<string, string> = { Normal: "#94A3B8", HighFriction: "#FF6B6B" };
                return (
                  <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "rgba(240,244,255,0.35)", textTransform: "uppercase" as const, letterSpacing: "1.5px", marginBottom: 8 }}>
                      Opening Drivers Formula
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {[
                        { label: "Base Opening", value: "—", sub: "from actor era data", color: "#7B9FFF" },
                        { label: "Pre-Release Buzz", value: buzzVal === "Normal" ? "×1.00" : buzzVal === "StrongBuzz" ? "×1.35 (T1)  ×1.20 (T2)" : "×1.60 (T1)  ×1.35 (T2)", color: buzzColors[buzzVal] },
                        { label: "Release Timing", value: timingVal === "Festival" ? "×1.20" : "×1.00", color: timingColors[timingVal] },
                        { label: "Market Friction", value: frictionVal === "HighFriction" ? "×0.85" : "×1.00", color: frictionColors[frictionVal] },
                      ].map((row, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                          <span style={{ fontSize: 11, color: "rgba(240,244,255,0.45)" }}>{row.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: row.color, fontFamily: "var(--font)" }}>{row.value}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.10)", marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: "rgba(240,244,255,0.65)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.8px" }}>Projected Opening</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: "#38BDF8", fontFamily: "var(--font)" }}>Run FilmLab →</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── Additional Recovery Streams ── */}
            <div style={{
              background: "#10152C",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(180,150,255,0.10)",
              borderRadius: 18,
              boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  fontSize: 14,
                  color: "rgba(168,184,216,0.70)",
                  textTransform: "uppercase" as const,
                  letterSpacing: "2px",
                  fontWeight: "600",
                  fontFamily: "var(--font)",
                }}>
                  Additional Recovery Streams
                </div>
                <span style={{
                  fontSize: 13,
                  color: "rgba(168,184,216,0.55)",
                  fontFamily: "var(--font)",
                  background: "rgba(10,31,68,0.06)",
                  borderRadius: 8,
                  padding: "2px 7px",
                }}>Optional</span>
              </div>

              <div style={{ fontSize: 14, color: "rgba(168,184,216,0.50)", fontFamily: "var(--font)", lineHeight: 1.5 }}>
                Non-theatrical revenue. Affects <strong>True ROI</strong> only — CVI stays theatrical.
              </div>

              {([
                { key: "overseasRights",  label: "Overseas Rights",  placeholder: "₹0 Cr", max: 100 },
                { key: "ottRights",       label: "OTT Rights",       placeholder: "₹0 Cr", max: 150 },
                { key: "satelliteRights", label: "Satellite Rights",  placeholder: "₹0 Cr", max: 100 },
                { key: "audioRights",     label: "Audio Rights",     placeholder: "₹0 Cr", max: 30  },
              ] as const).map(({ key, label, placeholder, max }) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      fontFamily: "var(--font)",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "rgba(240,244,255,0.80)",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.5px",
                    }}>{label}</span>
                    <span style={{
                      fontFamily: "var(--font)",
                      fontSize: 14,
                      fontWeight: 700,
                      color: input.recovery[key] > 0 ? "#3B8EFF" : "rgba(168,184,216,0.32)",
                    }}>
                      {input.recovery[key] > 0 ? `₹${input.recovery[key]}Cr` : placeholder}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0} max={max} step={1}
                    value={input.recovery[key]}
                    onChange={(e) => setStream(key, Number(e.target.value))}
                    style={{ width: "100%", height: 4, accentColor: "#3B8EFF" }}
                  />
                </div>
              ))}

              {/* Recovery total summary */}
              {(input.recovery.overseasRights + input.recovery.ottRights + input.recovery.satelliteRights + input.recovery.audioRights) > 0 && (
                <div style={{
                  background: "rgba(59,142,255,0.07)",
                  border: "1px solid rgba(59,142,255,0.15)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{ fontFamily: "var(--font)", fontSize: 14, color: "rgba(240,244,255,0.65)", fontWeight: 500 }}>
                    Additional Streams Total
                  </span>
                  <span style={{ fontFamily: "var(--font)", fontSize: 16, fontWeight: 700, color: "#3B8EFF" }}>
                    ₹{input.recovery.overseasRights + input.recovery.ottRights + input.recovery.satelliteRights + input.recovery.audioRights}Cr
                  </span>
                </div>
              )}
            </div>

            {/* ── METHODOLOGY PANEL ── */}
            <div style={{ marginBottom: 8 }}>
              <button
                onClick={() => setMethodologyOpen(o => !o)}
                style={{
                  width: "100%", background: "none", border: "1px solid rgba(155,114,255,0.15)",
                  borderRadius: 8, padding: "8px 14px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 12, color: "rgba(155,114,255,0.75)", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>
                  📐 Input Methodology
                </span>
                <span style={{ fontSize: 12, color: "rgba(155,114,255,0.5)" }}>{methodologyOpen ? "▲ Hide" : "▼ How are inputs calculated?"}</span>
              </button>

              {methodologyOpen && (
                <div style={{
                  marginTop: 6, background: "rgba(155,114,255,0.04)",
                  border: "1px solid rgba(155,114,255,0.12)", borderRadius: 8, padding: 16,
                  display: "flex", flexDirection: "column", gap: 16,
                }}>
                  {/* Computed inputs */}
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(34,229,165,0.7)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8, fontWeight: 700 }}>
                      ✓ Computed from film-level data
                    </div>
                    {[
                      { metric: "Scale Index", formula: "log₁ₚ(openingCr) normalized to dataset max. Captures commercial footprint." },
                      { metric: "Stability Index", formula: "Exponential decay on per-film ROI volatility. Low dvol → high stability." },
                      { metric: "CHI Score", formula: "Mean log-adjusted ROI × (1 − normalized dvol). Capital Health = return quality × consistency." },
                      { metric: "dvolPct", formula: "Sortino semi-deviation — sqrt(mean loss-ratio²) across all films. Only downside variance counted." },
                      { metric: "openingCr / maxGross", formula: "Direct from box office records. All 137 films individually sourced." },
                      { metric: "budgetTolerance", formula: "Highest production budget at which actor delivered profitable gross. From film history." },
                    ].map(({ metric, formula }) => (
                      <div key={metric} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 700, marginBottom: 2 }}>{metric}</div>
                        <div style={{ fontSize: 11, color: "rgba(168,184,216,0.5)", lineHeight: 1.5 }}>{formula}</div>
                      </div>
                    ))}
                  </div>

                  {/* Expert-assessed inputs */}
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,184,0,0.7)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8, fontWeight: 700 }}>
                      ◆ Expert-assessed with defined criteria
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 700, marginBottom: 6 }}>Pan-India Viability (0–100)</div>
                      <div style={{ fontSize: 11, color: "rgba(168,184,216,0.5)", lineHeight: 1.6, marginBottom: 8 }}>
                        Measures geographic revenue reach beyond Telugu theatrical. Assessed on: Hindi dub market pull, non-Telugu BO contribution, OTT language penetration, dubbed version streaming performance.
                      </div>
                      {[
                        { range: "90–100", label: "Proven pan-India draw",        color: "#22e5a5",            example: "Allu Arjun, Prabhas" },
                        { range: "75–89",  label: "Strong multi-market appeal",   color: "#3B8EFF",            example: "Jr NTR, Ram Charan, Nikhil" },
                        { range: "60–74",  label: "Moderate cross-market pull",   color: "#9B72FF",            example: "Mahesh Babu, VD" },
                        { range: "45–59",  label: "Regional dominant",            color: "#FFB800",            example: "Pawan Kalyan, Adivi Sesh" },
                        { range: "< 45",   label: "Telugu-primary market",        color: "rgba(255,77,90,0.8)",example: "Ram Pothineni, Nani" },
                      ].map(({ range, label, color, example }) => (
                        <div key={range} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 48, fontVariantNumeric: "tabular-nums" }}>{range}</span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{label}</span>
                          <span style={{ fontSize: 10, color: "rgba(168,184,216,0.3)", marginLeft: "auto" }}>{example}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 700, marginBottom: 4 }}>Dataset Scope</div>
                      <div style={{ fontSize: 11, color: "rgba(168,184,216,0.5)", lineHeight: 1.6 }}>
                        137 films · 21 actors · 2010–2025. Telugu theatrical primary market. Pan-India and multi-market films carry explicit scope notes. Dataset reviewed quarterly.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── RUN STAR LAB BUTTON — bottom of left panel ── */}
            <button
              onClick={runAnalysis}
              disabled={animating || (!input.actorName && !input.useManualOverride)}
              style={{
                width: "100%",
                padding: "16px 24px",
                borderRadius: 14,
                border: "none",
                background: animating
                  ? "rgba(59,142,255,0.25)"
                  : "linear-gradient(135deg, #3B8EFF 0%, #9B72FF 100%)",
                color: "#fff",
                fontFamily: "var(--font)",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "1.5px",
                textTransform: "uppercase" as const,
                cursor: animating || (!input.actorName && !input.useManualOverride) ? "not-allowed" : "pointer",
                opacity: (!input.actorName && !input.useManualOverride) ? 0.4 : 1,
                boxShadow: animating ? "none" : "0 8px 32px rgba(59,142,255,0.35), 0 2px 8px rgba(155,114,255,0.25)",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {animating ? (
                <><span style={{ fontSize: 18 }}>⚙️</span> Computing Capital Model…</>
              ) : (
                <><span style={{ fontSize: 18 }}>🎬</span> Run Star Lab</>
              )}
            </button>
            {(!input.actorName && !input.useManualOverride) && (
              <span style={{ fontSize: 12, color: "rgba(168,184,216,0.45)", fontFamily: "var(--font)", textAlign: "center" as const }}>
                Select an actor or enable custom actor to run
              </span>
            )}
          </div>

          {/* ══ RIGHT PANEL — OUTPUTS ════════════════════════════════════════ */}
          <div ref={resultsRef} className={panelGlow ? "fl-panel-glow" : ""} style={{ display: "flex", flexDirection: "column", gap: 20, borderRadius: 20, transition: "box-shadow 2.2s ease" }}>

            {/* ── Empty state ── */}
            {!result && !error && (
              <div style={{
                background: "linear-gradient(145deg, #0F1428 0%, #141830 60%, #191C3A 100%)",
                border: "1px solid rgba(59,142,255,0.20)",
                borderRadius: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 480,
                gap: 24,
                padding: "48px 40px",
                boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 4px 16px rgba(59,142,255,0.08)",
              }}>
                {/* Animated orbit ring */}
                <div style={{ position: "relative", width: 100, height: 100 }}>
                  <div style={{
                    width: 100, height: 100, borderRadius: "50%",
                    border: "1.5px solid rgba(59,142,255,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative",
                  }}>
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                      <div key={deg} style={{
                        position: "absolute", width: 8, height: 8, borderRadius: "50%",
                        background: deg % 90 === 0
                          ? "rgba(59,142,255,0.60)"
                          : "rgba(155,114,255,0.30)",
                        transform: `rotate(${deg}deg) translateY(-36px)`,
                        boxShadow: deg % 90 === 0 ? "0 0 8px rgba(59,142,255,0.80)" : "none",
                      }} />
                    ))}
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "linear-gradient(135deg, rgba(59,142,255,0.30), rgba(155,114,255,0.20))",
                      border: "1.5px solid rgba(59,142,255,0.50)",
                      boxShadow: "0 0 20px rgba(59,142,255,0.25)",
                    }} />
                  </div>
                </div>

                <div style={{
                  fontFamily: "var(--font)", fontSize: 24, fontWeight: 700,
                  color: "#E0EAFF", textAlign: "center", lineHeight: 1.3,
                }}>
                  FilmLab Capital Simulator
                </div>

                <div style={{
                  fontSize: 17, fontWeight: 400,
                  color: "rgba(168,184,216,0.70)",
                  textAlign: "center", lineHeight: 1.7, maxWidth: 320,
                }}>
                  Select an actor from the StarsQ database to run a full pre-production capital stress test
                </div>

                {/* Step hints */}
                {[
                  { step: "1", text: "Select actor or configure Custom Actor" },
                  { step: "2", text: "Set your production budget & genre" },
                  { step: "3", text: "Click Run Star Lab to see full capital stress analysis" },
                ].map(({ step, text }) => (
                  <div key={step} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "rgba(59,142,255,0.08)",
                    border: "1px solid rgba(59,142,255,0.16)",
                    borderRadius: 12, padding: "12px 18px",
                    width: "100%", maxWidth: 360,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #3B8EFF, #9B72FF)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 800, color: "#fff",
                      boxShadow: "0 0 12px rgba(59,142,255,0.40)",
                    }}>
                      {step}
                    </div>
                    <span style={{ fontSize: 16, color: "rgba(168,184,216,0.80)", fontWeight: 500 }}>
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Error state ── */}
            {error && (
              <div style={{
                background: "rgba(196,30,58,0.1)",
                border: "1px solid rgba(196,30,58,0.3)",
                borderRadius: 10,
                padding: 20,
                color: "#ff6b6b",
                fontFamily: "var(--font)",
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* ── Results ── */}
            {result && !error && (
              <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* ── 0. GREENLIGHT VERDICT BANNER — first thing a producer sees ── */}
                {greenlight && (() => {
                  const statusIcon = greenlight.verdict === "CAPITAL SAFE" ? "▲" : greenlight.verdict === "ON REVIEW" ? "◆" : "▼";
                  const signalIcon = (s: "positive"|"neutral"|"negative") =>
                    s === "positive" ? "✓" : s === "neutral" ? "◎" : "✕";
                  const signalColor = (s: "positive"|"neutral"|"negative") =>
                    s === "positive" ? "#22C55E" : s === "neutral" ? "#FFB800" : "#FF4D4D";
                  return (
                    <div style={{
                      background: greenlight.bgColor,
                      border: `1.5px solid ${greenlight.color}35`,
                      borderRadius: 16,
                      padding: "20px 24px",
                      position: "relative",
                      overflow: "hidden",
                    }}>
                      {/* Glow sweep */}
                      <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: 2,
                        background: `linear-gradient(90deg, transparent, ${greenlight.color}90, transparent)`,
                      }} />

                      {/* Top row: verdict pill + score + headline */}
                      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>

                        {/* Verdict pill */}
                        <div style={{
                          display: "flex", flexDirection: "column", alignItems: "center",
                          background: `${greenlight.color}18`,
                          border: `1.5px solid ${greenlight.color}55`,
                          borderRadius: 10, padding: "10px 18px",
                          minWidth: 80, flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: `${greenlight.color}90`, letterSpacing: "2px", textTransform: "uppercase" }}>
                            Verdict
                          </span>
                          <span style={{
                            fontFamily: "var(--font)",
                            fontSize: greenlight.verdict === "ON REVIEW" ? 16 : greenlight.verdict === "CAPITAL SAFE" ? 13 : 12,
                            fontWeight: 900, color: greenlight.color,
                            lineHeight: 1.2, marginTop: 2, textAlign: "center" as const,
                            letterSpacing: "0.5px", textTransform: "uppercase" as const,
                          }}>
                            {greenlight.verdict}
                          </span>
                          <span style={{ fontSize: 13, color: `${greenlight.color}80`, marginTop: 1 }}>
                            {statusIcon}
                          </span>
                        </div>

                        {/* Score ring (simple) */}
                        <div style={{
                          width: 68, height: 68, borderRadius: "50%", flexShrink: 0,
                          border: `3px solid ${greenlight.color}50`,
                          background: `conic-gradient(${greenlight.color} ${greenlight.score * 3.6}deg, rgba(255,255,255,0.04) 0deg)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          position: "relative",
                        }}>
                          <div style={{
                            width: 52, height: 52, borderRadius: "50%",
                            background: "var(--bg-2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexDirection: "column",
                          }}>
                            <span style={{ fontFamily: "var(--font)", fontSize: 20, fontWeight: 800, color: greenlight.color, lineHeight: 1 }}>
                              {greenlight.score.toFixed(0)}
                            </span>
                            <span style={{ fontSize: 9, color: "rgba(168,184,216,0.55)", letterSpacing: "0.5px", marginTop: 1 }}>/ 100</span>
                          </div>
                        </div>

                        {/* Headline + subline */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "rgba(168,184,216,0.55)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 5 }}>
                            Greenlight Intelligence
                          </div>
                          <div style={{ fontFamily: "var(--font)", fontSize: 16, fontWeight: 700, color: greenlight.color, lineHeight: 1.3, marginBottom: 4 }}>
                            {greenlight.headline}
                          </div>
                          <div style={{ fontSize: 13, color: "rgba(168,184,216,0.65)", lineHeight: 1.5 }}>
                            {greenlight.subline}
                          </div>
                        </div>
                      </div>

                      {/* Signal pillars */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                        {greenlight.signals.map((sig) => (
                          <div key={sig.label} style={{
                            background: "rgba(0,0,0,0.25)",
                            border: `1px solid ${signalColor(sig.status)}20`,
                            borderRadius: 8, padding: "9px 12px",
                            display: "flex", flexDirection: "column", gap: 3,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: signalColor(sig.status) }}>
                                {signalIcon(sig.status)}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(168,184,216,0.70)", textTransform: "uppercase", letterSpacing: "1px" }}>
                                {sig.label}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: "rgba(168,184,216,0.55)", lineHeight: 1.5 }}>
                              {sig.detail}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <div style={{
                  background: "#0D1929",
                  border: "1px solid rgba(180,150,255,0.09)",
                  borderRadius: 12,
                  padding: "20px 24px",
                }}>
                  <div style={{
                    fontSize: 13,
                    color: "rgba(168,184,216,0.50)",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    marginBottom: 16,
                  }}>
                    Capital Risk Profile
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>

                    {/* Capital Exposure Risk — from engine (coverage = expectedGross / breakEvenGross) */}
                    {(() => {
                      const exposure = result.capitalExposureRisk;
                      const atSSB = stressSafeBudget > 0 && input.productionBudget <= stressSafeBudget;
                      // At SSB, theatrical gap is expected — SSB protects against loss via streams.
                      // "Critical" label is correct mathematically but misleading in context.
                      const displayLabel = (exposure === "Critical" && atSSB) ? "Theatrical Gap" : exposure;
                      const displayColor = (exposure === "Critical" && atSSB) ? "#FFB800" : riskColor(exposure);
                      return (
                        <div style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                          padding: "16px 12px",
                          background: `${displayColor}0a`,
                          border: `1px solid ${displayColor}22`,
                          borderRadius: 10,
                        }}>
                          <span style={{ fontSize: 13, color: "rgba(168,184,216,0.65)", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                            Capital Exposure
                          </span>
                          <span style={{ fontFamily: "var(--font)", fontSize: 26, fontWeight: 700, color: displayColor, textAlign: "center" }}>
                            {displayLabel}
                          </span>
                          {atSSB && exposure === "Critical" && (
                            <span style={{ fontSize: 10, color: "rgba(255,184,0,0.65)", textAlign: "center", lineHeight: 1.4 }}>
                              Streams + SSB protection<br/>bridges theatrical gap
                            </span>
                          )}
                          <div style={{ display: "flex", gap: 3 }}>
                            {["Safe", "Watch", "Exposed", "Critical"].map((level) => (
                              <div key={level} style={{
                                width: 20, height: 4, borderRadius: 2,
                                background: level === exposure ? displayColor : "rgba(59,142,255,0.06)",
                              }} />
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Downside Probability */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "16px 12px",
                      background: "#10152C",
                      border: "1px solid rgba(180,150,255,0.09)",
                      borderRadius: 10,
                    }}>
                      <span style={{ fontSize: 13, color: "rgba(168,184,216,0.65)", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                        Downside Risk
                      </span>
                      <span style={{
                        fontFamily: "var(--font)",
                        fontSize: 32,
                        fontWeight: 700,
                        color: scoreToColor(100 - correctedLossProb),
                        lineHeight: 1,
                      }}>
                        {correctedLossProb.toFixed(1)}
                        <span style={{ fontSize: 16 }}>%</span>
                      </span>
                      {/* Context-aware sub-label */}
                      {(() => {
                        const streamsExtra = result && result.totalRecovery > result.producerShare
                          ? Math.round(result.totalRecovery - result.producerShare) : 0;
                        const effectiveShare = result ? result.producerShare + streamsExtra : 0;
                        const baseProfitable = result && effectiveShare > result.totalCapital;
                        return baseProfitable ? (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 11, color: "rgba(34,197,94,0.80)", fontWeight: 600 }}>
                              Base case is profitable ✓
                            </div>
                            <div style={{ fontSize: 10, color: "rgba(168,184,216,0.45)", marginTop: 2 }}>
                              This % = chance film underperforms enough to cause loss
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "rgba(168,184,216,0.55)", textAlign: "center" }}>
                            P(underperformance causes loss)
                          </span>
                        );
                      })()}
                    </div>

                    {/* Expected Capital Deficit */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "16px 12px",
                      background: correctedCapitalAtRisk > 0 ? "rgba(255,77,77,0.05)" : "rgba(34,197,94,0.05)",
                      border: `1px solid ${correctedCapitalAtRisk > 0 ? "rgba(255,77,77,0.18)" : "rgba(34,197,94,0.18)"}`,
                      borderRadius: 10,
                    }}>
                      <span style={{ fontSize: 13, color: "rgba(168,184,216,0.65)", textTransform: "uppercase", letterSpacing: "1.5px", textAlign: "center" }}>
                        Expected Capital Deficit
                      </span>
                      <span style={{
                        fontFamily: "var(--font)",
                        fontSize: 22,
                        fontWeight: 700,
                        color: correctedCapitalAtRisk > 0 ? "#ff6b6b" : "#22C55E",
                        lineHeight: 1,
                      }}>
                        {correctedCapitalAtRisk > 0 ? `₹${correctedCapitalAtRisk}Cr` : "₹0Cr"}
                      </span>
                      <span style={{ fontSize: 11, color: "rgba(168,184,216,0.55)", textAlign: "center" }}>
                        Expected deficit across modeled scenarios
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── 2. CAPITAL RISK METER ── */}
                {danger && (
                  <div style={{
                    background: `${danger.dangerColor}08`,
                    border: `1px solid ${danger.dangerColor}28`,
                    borderRadius: 12,
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{
                          fontSize: 13,
                          color: "rgba(168,184,216,0.50)",
                          textTransform: "uppercase",
                          letterSpacing: "2px",
                          marginBottom: 4,
                        }}>
                          Capital Risk Meter
                        </div>
                        <div style={{
                          fontFamily: "var(--font)",
                          fontSize: 26,
                          fontWeight: 700,
                          color: danger.dangerColor,
                        }}>
                          {danger.dangerZone}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {(() => {
                          const ratio = danger.dangerRatio;
                          const safeTotal = r1(result.totalCapital / Math.max(ratio, 0.01));
                          const diffCr    = Math.abs(Math.round(result.totalCapital - safeTotal));
                          const diffPct   = Math.abs(Math.round((ratio - 1) * 100));
                          const isOver    = ratio > 1.0;
                          return (
                            <>
                              <div style={{
                                fontFamily: "var(--font)",
                                fontSize: 22,
                                fontWeight: 700,
                                color: danger.dangerColor,
                                lineHeight: 1,
                              }}>
                                {isOver ? "+" : "–"}₹{diffCr}Cr
                              </div>
                              <div style={{ fontSize: 12, color: danger.dangerColor, opacity: 0.75, marginTop: 2, fontWeight: 600 }}>
                                {isOver
                                  ? `${diffPct}% over actor's safe ceiling`
                                  : `${diffPct}% below safe ceiling`}
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(168,184,216,0.40)", marginTop: 3 }}>
                                Safe ceiling: ₹{Math.round(safeTotal)}Cr · Your spend: ₹{result.totalCapital}Cr
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Bar meter */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{
                        position: "relative",
                        height: 10,
                        borderRadius: 5,
                        overflow: "hidden",
                        background: "#10152C",
                      }}>
                        <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                          {[
                            { w: "40%", color: "#22d3a520" },
                            { w: "20%", color: "#a3e63520" },
                            { w: "20%", color: "#fbbf2420" },
                            { w: "20%", color: "#FF4D4D20" },
                          ].map((seg, i) => (
                            <div key={i} style={{ width: seg.w, background: seg.color, height: "100%" }} />
                          ))}
                        </div>
                        <div style={{
                          position: "absolute", top: 0, left: 0,
                          height: "100%",
                          width: `${danger.dangerPct}%`,
                          background: `linear-gradient(90deg, #22d3a5 0%, #a3e635 27%, #fbbf24 60%, #FF4D4D 100%)`,
                          borderRadius: 5,
                          transition: "width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }} />
                        <div style={{
                          position: "absolute", top: -2,
                          left: `calc(${danger.dangerPct}% - 1px)`,
                          width: 2, height: 14,
                          background: "#fff", borderRadius: 1,
                          transition: "left 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 0 }}>
                        {[
                          { label: "SAFE",      zone: "Safe Zone", color: "#22C55E" },
                          { label: "STRETCHED", zone: "Stretched", color: "#3B82F6" },
                          { label: "AT RISK",   zone: "At Risk",   color: "#fbbf24" },
                          { label: "EXPOSED",   zone: "Exposed",   color: "#FF4D4D" },
                        ].map(({ label, zone, color }) => (
                          <span key={label} style={{
                            fontSize: 11,
                            color: danger.dangerZone === zone ? color : "rgba(255,255,255,0.2)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            fontFamily: "var(--font)",
                            fontWeight: danger.dangerZone === zone ? 700 : 400,
                          }}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Metrics row — profit budget + project budget + star ceiling + max viable + SSB */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.8fr 1fr 1fr", gap: 10 }}>

                      {/* ── DEAL BREAK-EVEN — 4 dynamic states ── */}
                      {result && (() => {
                        const hero    = input.heroRemuneration ?? 0;
                        const streams = result.recoveryStreamsTotal;
                        const pb      = streams > 0 ? result.profitBudgetWithStreams : result.profitBudget;
                        // What would pb be without hero? (to detect hero-caused overshoot)
                        const pbNoHero = Math.max(Math.round(
                          (result.scenarioPanel.base.gross * 0.40 + streams) /
                          (1 + (result.pnaCost / Math.max(input.productionBudget, 1)))
                        ), 0);
                        const budget  = input.productionBudget;
                        const gap     = budget - pb; // positive = over ceiling

                        // State detection (2Cr tolerance for "matches")
                        const belowCeiling      = gap < -2;
                        const atCeiling         = Math.abs(gap) <= 2;
                        // Hero-caused: budget would be fine without hero fee
                        const heroIsCause       = gap > 2 && budget <= pbNoHero;
                        const productionOvershot= gap > 2 && !heroIsCause;
                        const heroPct           = heroIsCause && hero > 0
                          ? Math.round((hero / (hero + budget)) * 100) : 0;

                        const s = belowCeiling ? {
                          color: "#22C55E", bg: "rgba(34,197,94,0.07)", border: "rgba(34,197,94,0.25)",
                          badge: "✓ Current Parameters Indicate This As Profitable Budget",
                          detail: `₹${Math.abs(gap)}Cr below ceiling — you have headroom`,
                        } : atCeiling ? {
                          color: "#22e5a5", bg: "rgba(34,229,165,0.07)", border: "rgba(34,229,165,0.25)",
                          badge: "◎ Current Parameters Match Profitable Budget",
                          detail: "At the ceiling — any further spend enters risk zone",
                        } : heroIsCause ? {
                          color: "#FFB800", bg: "rgba(255,184,0,0.07)", border: "rgba(255,184,0,0.25)",
                          badge: `⚠ Hero Remuneration Exceeds Profitable Budget by ${heroPct}%`,
                          detail: `Without ₹${hero}Cr hero fee, budget would be within range`,
                        } : {
                          color: "#FF4D4D", bg: "rgba(255,77,77,0.07)", border: "rgba(255,77,77,0.25)",
                          badge: "✕ Current Parameters Exceed Profitable Budget — Risk Zone",
                          detail: `Production ₹${gap}Cr over ceiling · reduce budget or add streams`,
                        };

                        return (
                          <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 7, padding: "12px 14px" }}>
                            <div style={{ fontSize: 11, color: "rgba(168,184,216,0.50)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 5 }}>
                              Theatrical Break-Even
                            </div>
                            <div style={{ fontFamily: "var(--font)", fontSize: 26, fontWeight: 700, color: s.color, marginBottom: 5 }}>
                              {pb > 0 && isFinite(pb) ? `₹${pb}Cr` : pb > 0 ? "Above range" : "—"}
                            </div>
                            {/* Deal drivers — amber pill for hero, teal pill for streams */}
                            {(hero > 0 || streams > 0) && (
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 7 }}>
                                {hero > 0 && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(255,184,0,0.12)", color: "rgba(255,184,0,0.90)", fontWeight: 600 }}>Hero −₹{hero}Cr</span>}
                                {streams > 0 && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(34,229,165,0.12)", color: "rgba(34,229,165,0.90)", fontWeight: 600 }}>Streams +₹{streams}Cr</span>}
                              </div>
                            )}
                            <div style={{ fontSize: 10, fontWeight: 700, color: s.color, marginBottom: 3, lineHeight: 1.4 }}>
                              {s.badge}
                            </div>
                            <div style={{ fontSize: 10, color: "rgba(168,184,216,0.45)", lineHeight: 1.5 }}>
                              {s.detail}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Project Budget */}
                      <div style={{ background: "#0D1929", borderRadius: 7, padding: "12px 14px" }}>
                        <div style={{ fontSize: 11, color: "rgba(168,184,216,0.50)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 5 }}>
                          Project Budget
                        </div>
                        <div style={{ fontFamily: "var(--font)", fontSize: 26, fontWeight: 700, color: "#F0F4FF" }}>
                          {cr(input.productionBudget)}
                        </div>
                        {(input.heroRemuneration ?? 0) > 0 && (
                          <div style={{ fontSize: 10, color: "rgba(168,184,216,0.40)", marginTop: 4 }}>
                            +₹{input.heroRemuneration}Cr hero
                          </div>
                        )}
                      </div>

                      {/* Star Capital Limit */}
                      {result && (() => {
                        const isUncapped = !isFinite(correctedCapSafeBudget) || correctedCapSafeBudget <= 0;
                        const ok = isUncapped || input.productionBudget <= correctedCapSafeBudget;
                        return (
                          <div style={{ background: ok ? "rgba(34,197,94,0.06)" : "rgba(255,77,77,0.06)", border: `1px solid ${ok ? "rgba(34,197,94,0.20)" : "rgba(255,77,77,0.20)"}`, borderRadius: 7, padding: "12px 14px" }}>
                            <div style={{ fontSize: 11, color: "rgba(168,184,216,0.50)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 5 }}>
                              Star Capital Limit
                            </div>
                            <div style={{ fontFamily: "var(--font)", fontSize: isUncapped ? 16 : 22, fontWeight: 700, color: ok ? "#22C55E" : "#FF6B6B" }}>
                              {isUncapped ? "Uncapped" : `₹${correctedCapSafeBudget}Cr`}
                            </div>
                            <div style={{ fontSize: 10, color: "rgba(168,184,216,0.40)", marginTop: 4 }}>
                              {isUncapped ? "No film history ceiling set" : "Highest budget this actor can sustain for capital recovery"}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Stress-Safe Budget */}
                      {result && (() => {
                        const isUncapped = !isFinite(stressSafeBudget) || stressSafeBudget <= 0;
                        const ok = isUncapped || input.productionBudget <= stressSafeBudget;
                        return (
                          <div style={{ background: ok ? "rgba(34,229,165,0.06)" : "rgba(255,184,0,0.06)", border: `1px solid ${ok ? "rgba(34,229,165,0.20)" : "rgba(255,184,0,0.20)"}`, borderRadius: 7, padding: "12px 14px" }}>
                            <div style={{ fontSize: 11, color: "rgba(168,184,216,0.50)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 5 }}>
                              Stress-Safe Budget
                            </div>
                            <div style={{ fontFamily: "var(--font)", fontSize: isUncapped ? 16 : 22, fontWeight: 700, color: ok ? "#22e5a5" : "#FFB800" }}>
                              {isUncapped ? "Uncapped" : `₹${stressSafeBudget}Cr`}
                            </div>
                            <div style={{ fontSize: 10, color: "rgba(168,184,216,0.40)", marginTop: 4 }}>
                              {isUncapped ? "No volatility floor (custom actor)" : "Loss floor · not a profit signal"}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* ── 3. SCENARIO PANEL — 3-outcome profit/loss view ── */}
                {(() => {
                  const sp = result.scenarioPanel;
                  const scenarios = [sp.stress, sp.base, sp.upside];
                  const icons = ["📉", "📊", "📈"];
                  const colors = ["#FF4D4D", "#FFB800", "#22C55E"];
                  const bgColors = ["rgba(255,77,77,0.07)", "rgba(255,184,0,0.07)", "rgba(34,197,94,0.07)"];
                  const borderColors = ["rgba(255,77,77,0.20)", "rgba(255,184,0,0.20)", "rgba(34,197,94,0.20)"];
                  // Producer-facing labels — replaces internal "Stress/Base/Upside" engine names
                  const mcMult = result.marketCondMult ?? 1.0;
                  const hasActiveCond = mcMult !== 1.0 || result.womScenario !== "Average";
                  const upsideLabel = mcMult > 1.05
                    ? `${result.preReleaseBuzz === "EventFilm" ? "Event Film" : "Buzz"} Upside`
                    : mcMult < 0.97
                    ? "Friction-Dampened Upside"
                    : "Positive WOM Breakout";
                  const displayLabels  = ["Underperformance", "Market Average", upsideLabel];
                  const displaySubtags = [
                    "Stress scenario",
                    "Base scenario",
                    mcMult > 1.05
                      ? `Market conditions ×${mcMult.toFixed(2)} applied`
                      : "Upside scenario",
                  ];
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {/* Header */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 10,
                      }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(168,184,216,0.6)", textTransform: "uppercase" }}>
                            Project Outcome Range
                          </div>
                          <div style={{ fontSize: 13, color: "#fff", marginTop: 2 }}>
                            Stress-Safe Budget{" "}
                            <span style={{ color: "#22e5a5", fontWeight: 700 }}>
                              {isFinite(sp.stressSafeBudget) && sp.stressSafeBudget > 0 ? cr(sp.stressSafeBudget) : "Uncapped"}
                            </span>
                            <span style={{ color: "rgba(168,184,216,0.4)", fontSize: 11 }}>{" "}(production only, hero additional)</span>
                            {" · "}Your capital{" "}
                            <span style={{ color: "#FFB800", fontWeight: 700 }}>{cr(result.totalCapital)}</span>
                          </div>
                        </div>
                        {/* Quick-set button */}
                        {isFinite(sp.stressSafeBudget) && sp.stressSafeBudget > 0 ? (
                          <button
                          onClick={() => {
                              set("productionBudget", sp.stressSafeBudget);
                            }}
                            style={{
                              padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(34,229,165,0.35)",
                              background: "rgba(34,229,165,0.08)", color: "#22e5a5",
                              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                            }}
                          >
                            Set ₹{sp.stressSafeBudget}Cr →
                          </button>
                        ) : (
                          <div style={{
                            padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(168,184,216,0.12)",
                            background: "transparent", color: "rgba(168,184,216,0.35)",
                            fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
                          }}>
                            No ceiling set
                          </div>
                        )}
                      </div>

                      {/* ── Project Outcome Table — producer-readable ── */}
                      <div style={{
                        background: "rgba(10,14,40,0.7)",
                        border: "1px solid rgba(255,255,255,0.09)",
                        borderRadius: 12,
                        overflow: "hidden",
                      }}>
                        {/* Table header */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "140px 1fr 1fr 1fr 1fr",
                          padding: "10px 16px",
                          background: "rgba(255,255,255,0.04)",
                          borderBottom: "1px solid rgba(255,255,255,0.07)",
                        }}>
                          {["Scenario", "Film Grosses", "Producer Gets (40%)", "Capital Invested", "Net P&L"].map((h, i) => (
                            <div key={h} style={{
                              fontSize: 12, fontWeight: 700,
                              color: "rgba(168,184,216,0.65)",
                              letterSpacing: "0.06em", textTransform: "uppercase",
                              textAlign: i === 0 ? "left" : "right",
                            }}>{h}</div>
                          ))}
                        </div>
                        {/* Market condition overlay label */}
                        {hasActiveCond && (
                          <div style={{
                            padding: "7px 16px",
                            background: mcMult > 1.0 ? "rgba(123,159,255,0.08)" : mcMult < 1.0 ? "rgba(255,77,77,0.08)" : "rgba(255,184,0,0.06)",
                            borderBottom: mcMult > 1.0 ? "1px solid rgba(123,159,255,0.22)" : mcMult < 1.0 ? "1px solid rgba(255,77,77,0.20)" : "1px solid rgba(255,184,0,0.18)",
                            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const,
                          }}>
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: mcMult > 1.0 ? "#7B9FFF" : mcMult < 1.0 ? "#FF4D4D" : "#FFB800", flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: mcMult > 1.0 ? "#7B9FFF" : mcMult < 1.0 ? "#FF4D4D" : "#FFB800", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>
                              Market Conditions Active
                            </span>
                            <span style={{ fontSize: 11, color: "rgba(168,184,216,0.55)" }}>
                              Stress &amp; Base rows anchored to film history ·{" "}
                              <span style={{ color: mcMult > 1.0 ? "#22C55E" : "#FF6B6B", fontWeight: 600 }}>
                                Upside row scaled ×{mcMult.toFixed(2)} ({result.preReleaseBuzz} · {result.releaseTiming} · {result.marketFriction})
                              </span>
                            </span>
                          </div>
                        )}

                        {/* Rows */}
                        {scenarios.map((s, i) => {
                          const recovered = Math.round((s.producerShare / result.totalCapital) * 100);
                          return (
                            <div key={s.label} style={{
                              display: "grid",
                              gridTemplateColumns: "140px 1fr 1fr 1fr 1fr",
                              padding: "16px 16px",
                              borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                              background: i === 1 ? "rgba(255,255,255,0.015)" : "transparent",
                              alignItems: "center",
                            }}>
                              {/* Scenario */}
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <span style={{ fontSize: 15 }}>{icons[i]}</span>
                                  <span style={{ fontSize: 12, fontWeight: 800, color: colors[i], textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                    {displayLabels[i]}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: "rgba(168,184,216,0.40)", marginTop: 2 }}>
                                  {displaySubtags[i]} · {s.probability}%
                                </div>
                              </div>

                              {/* Film Grosses */}
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: "#E0EAFF" }}>{cr(s.gross)}</div>
                                <div style={{ fontSize: 11, color: "rgba(168,184,216,0.45)", marginTop: 2 }}>
                                  {s.filmAnchor}-like · {s.roiMultiplier.toFixed(2)}×
                                </div>
                              </div>

                              {/* Producer Gets */}
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: "#3B8EFF" }}>{cr(s.producerShare)}</div>
                                <div style={{ fontSize: 11, color: "rgba(168,184,216,0.45)", marginTop: 2 }}>
                                  {recovered}% of capital back
                                </div>
                              </div>

                              {/* Capital Invested */}
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: "rgba(168,184,216,0.70)" }}>{cr(result.totalCapital)}</div>
                                <div style={{ fontSize: 11, color: "rgba(168,184,216,0.45)", marginTop: 2 }}>
                                  budget + hero + P&A
                                </div>
                              </div>

                              {/* Net P&L */}
                              <div style={{ textAlign: "right" }}>
                                <div style={{
                                  fontSize: 22, fontWeight: 800,
                                  color: s.isProfitable ? "#22C55E" : "#FF4D4D",
                                }}>
                                  {!isFinite(s.profitLoss)
                                    ? (s.profitLoss > 0 ? "Above range" : "—")
                                    : s.profitLoss >= 0
                                      ? `+₹${Math.round(Math.abs(s.profitLoss))}Cr`
                                      : `−₹${Math.round(Math.abs(s.profitLoss))}Cr`
                                  }
                                </div>
                                <div style={{
                                  fontSize: 11, fontWeight: 600, marginTop: 2,
                                  color: s.isProfitable ? "rgba(34,197,94,0.65)" : "rgba(255,77,77,0.65)",
                                }}>
                                  {!isFinite(s.profitLoss)
                                    ? "no film history ceiling"
                                    : s.isProfitable
                                      ? "net profit"
                                      : `₹${Math.round(Math.abs(s.profitLoss))}Cr unrecovered`
                                  }
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* ── Streams row — shows when recovery streams are set ── */}
                        {result.totalRecovery > result.producerShare && (() => {
                          const streamsTotal = Math.round(result.totalRecovery - result.producerShare);
                          return (
                            <div style={{
                              borderTop: "2px solid rgba(34,229,165,0.35)",
                              background: "linear-gradient(135deg, rgba(34,229,165,0.08) 0%, rgba(34,229,165,0.04) 100%)",
                            }}>
                              {/* Streams summary row */}
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "100px 1fr 1fr 1fr 1fr",
                                padding: "12px 16px",
                                alignItems: "center",
                              }}>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: "#22e5a5", letterSpacing: "0.07em", textTransform: "uppercase" as const }}>
                                    + Streams
                                  </div>
                                  <div style={{ fontSize: 10, color: "rgba(34,229,165,0.55)", marginTop: 2 }}>all channels</div>
                                </div>
                                <div style={{ textAlign: "right" as const }}>
                                  <div style={{ fontSize: 12, color: "rgba(168,184,216,0.4)" }}>—</div>
                                </div>
                                <div style={{ textAlign: "right" as const }}>
                                  <div style={{ fontSize: 15, fontWeight: 700, color: "#22e5a5" }}>+{cr(streamsTotal)}</div>
                                  <div style={{ fontSize: 10, color: "rgba(34,229,165,0.6)", marginTop: 2 }}>additional recovered</div>
                                </div>
                                <div style={{ textAlign: "right" as const }}>
                                  <div style={{ fontSize: 12, color: "rgba(168,184,216,0.4)" }}>same capital</div>
                                </div>
                                <div style={{ textAlign: "right" as const }}>
                                  <div style={{ fontSize: 15, fontWeight: 800, color: "#22e5a5" }}>+{cr(streamsTotal)} each</div>
                                  <div style={{ fontSize: 10, color: "rgba(34,229,165,0.6)", marginTop: 2 }}>all scenarios improve</div>
                                </div>
                              </div>
                              {/* Stream breakdown chips */}
                              <div style={{
                                display: "flex", gap: 8, padding: "0 16px 12px",
                                flexWrap: "wrap" as const, alignItems: "center",
                              }}>
                                <span style={{ fontSize: 10, color: "rgba(168,184,216,0.4)", marginRight: 4 }}>Breakdown:</span>
                                {[
                                  { label: "Theatrical", value: result.recoveryBreakdown.theatrical },
                                  { label: "Overseas",   value: result.recoveryBreakdown.overseas },
                                  { label: "OTT",        value: result.recoveryBreakdown.ott },
                                  { label: "Satellite",  value: result.recoveryBreakdown.satellite },
                                  { label: "Audio",      value: result.recoveryBreakdown.audio },
                                ].filter(r => r.value > 0).map(r => (
                                  <div key={r.label} style={{
                                    display: "flex", gap: 4, alignItems: "center",
                                    background: "rgba(34,229,165,0.08)",
                                    border: "1px solid rgba(34,229,165,0.18)",
                                    borderRadius: 6, padding: "3px 8px",
                                  }}>
                                    <span style={{ fontSize: 10, color: "rgba(168,184,216,0.55)" }}>{r.label}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: r.label === "Theatrical" ? "#3B8EFF" : "#22e5a5" }}>{cr(r.value)}</span>
                                  </div>
                                ))}
                                <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#22e5a5" }}>
                                  Total: {cr(result.totalRecovery)} · True ROI: {result.trueROI.toFixed(2)}×
                                  <span style={{ marginLeft: 6, fontSize: 10, color: result.trueROI >= 1 ? "rgba(34,197,94,0.7)" : "rgba(255,77,77,0.7)" }}>
                                    ({result.trueROI >= 1 ? "full recovery" : "partial"})
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Footer */}
                        <div style={{
                          padding: "10px 16px",
                          background: "rgba(255,255,255,0.02)",
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
                        }}>
                          <div style={{ fontSize: 11, color: "rgba(168,184,216,0.45)" }}>
                            Break-even needs <span style={{ color: "#FFB800", fontWeight: 600 }}>{cr(result.breakEvenGross)}</span> gross
                            {" · "}producer recovers capital only above this
                          </div>
                          <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
                            <span style={{ color: "#FF4D4D", fontWeight: 600 }}>Downside Risk · {result.downsideProbability.toFixed(1)}%</span>
                            <span style={{ color: "#22C55E", fontWeight: 600 }}>{(100 - result.downsideProbability).toFixed(1)}% · No Underperformance Loss</span>
                          </div>
                        </div>
                      </div>

                      {/* ── Budget Sensitivity Panel ── */}
                      {(() => {
                        const streamsExtra = result.totalRecovery > result.producerShare
                          ? Math.round(result.totalRecovery - result.producerShare) : 0;
                        const effectiveShare = result.producerShare + streamsExtra;
                        const effectiveROI = result.totalCapital > 0
                          ? Math.round((effectiveShare / result.totalCapital) * 100) / 100 : 0;
                        const gate = result.recoveryStreamsTotal > 0 ? result.effectiveBreakEven : result.breakEvenGross;
                        const gateVsGross = result.scenarioPanel.base.gross - gate;
                        const isProfitable = gateVsGross >= 0;
                        return (
                          <div style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 10,
                            padding: "16px 20px",
                            marginTop: 2,
                          }}>
                            {/* Header explaining the key concept */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(168,184,216,0.55)", textTransform: "uppercase", letterSpacing: "1px" }}>
                                  Capital Recovery Analysis
                                </div>
                                <div style={{ fontSize: 12, color: "rgba(168,184,216,0.45)", marginTop: 3 }}>
                                  {input.useManualOverride ? "Actor's" : (input.actorName ? `${input.actorName}'s` : "Actor's")} gross is fixed by market. Your P&amp;L is controlled by your budget.
                                </div>
                              </div>
                              <div style={{
                                padding: "4px 10px", borderRadius: 6,
                                background: isProfitable ? "rgba(34,197,94,0.12)" : "rgba(255,77,77,0.10)",
                                border: `1px solid ${isProfitable ? "rgba(34,197,94,0.30)" : "rgba(255,77,77,0.25)"}`,
                                fontSize: 11, fontWeight: 700,
                                color: isProfitable ? "#22C55E" : "#FF4D4D",
                              }}>
                                {isProfitable ? `₹${Math.round(gateVsGross)}Cr above gate` : `₹${Math.round(Math.abs(gateVsGross))}Cr below gate`}
                              </div>
                            </div>

                            {/* Two-column: Fixed by actor | Controlled by you */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              {/* Left — FIXED */}
                              <div style={{
                                background: "rgba(59,142,255,0.05)",
                                border: "1px solid rgba(59,142,255,0.15)",
                                borderRadius: 8, padding: "12px 14px",
                              }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#3B8EFF", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
                                  🎬 Fixed by the Star
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <span style={{ fontSize: 12, color: "rgba(168,184,216,0.60)" }}>Expected Gross</span>
                                    <span style={{ fontFamily: "var(--font)", fontSize: 16, fontWeight: 700, color: "#E0EAFF" }}>{cr(result.scenarioPanel.base.gross)}</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <span style={{ fontSize: 12, color: "rgba(168,184,216,0.60)" }}>Theatrical Share (40%)</span>
                                    <span style={{ fontFamily: "var(--font)", fontSize: 16, fontWeight: 700, color: "#3B8EFF" }}>{cr(result.producerShare)}</span>
                                  </div>
                                  {streamsExtra > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                      <span style={{ fontSize: 12, color: "rgba(168,184,216,0.60)" }}>+ Streams booked</span>
                                      <span style={{ fontFamily: "var(--font)", fontSize: 16, fontWeight: 700, color: "#22e5a5" }}>+{cr(streamsExtra)}</span>
                                    </div>
                                  )}
                                  <div style={{ borderTop: "1px solid rgba(59,142,255,0.15)", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <span style={{ fontSize: 12, color: "rgba(168,184,216,0.60)" }}>Total you receive</span>
                                    <span style={{ fontFamily: "var(--font)", fontSize: 17, fontWeight: 800, color: "#3B8EFF" }}>{cr(effectiveShare)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right — CONTROLLED BY PRODUCER */}
                              <div style={{
                                background: isProfitable ? "rgba(34,197,94,0.05)" : "rgba(255,77,77,0.05)",
                                border: `1px solid ${isProfitable ? "rgba(34,197,94,0.15)" : "rgba(255,77,77,0.15)"}`,
                                borderRadius: 8, padding: "12px 14px",
                              }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: isProfitable ? "#22C55E" : "#FF4D4D", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
                                  💰 Controlled by You
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <span style={{ fontSize: 12, color: "rgba(168,184,216,0.60)" }}>Capital deployed</span>
                                    <span style={{ fontFamily: "var(--font)", fontSize: 16, fontWeight: 700, color: "#E0EAFF" }}>{cr(result.totalCapital)}</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <span style={{ fontSize: 12, color: "rgba(168,184,216,0.60)" }}>Theatrical break-even gross</span>
                                    <span style={{ fontFamily: "var(--font)", fontSize: 16, fontWeight: 700, color: "#FFB800" }}>{cr(gate)}</span>
                                  </div>
                                  {result.recoveryStreamsTotal > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                      <span style={{ fontSize: 11, color: "rgba(168,184,216,0.38)" }}>Net risk after streams</span>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(168,184,216,0.55)" }}>₹{result.theatricalRun?.netTheatricalRisk ?? Math.round(result.totalCapital - result.recoveryStreamsTotal)}Cr share</span>
                                    </div>
                                  )}
                                  <div style={{ borderTop: `1px solid ${isProfitable ? "rgba(34,197,94,0.15)" : "rgba(255,77,77,0.15)"}`, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <span style={{ fontSize: 12, color: "rgba(168,184,216,0.60)" }}>Net P&L</span>
                                    <span style={{ fontFamily: "var(--font)", fontSize: 17, fontWeight: 800, color: isProfitable ? "#22C55E" : "#FF4D4D" }}>
                                      {(() => {
                                        const pl = effectiveShare - result.totalCapital;
                                        if (!isFinite(pl)) return "Above model range";
                                        return `${pl >= 0 ? "+" : "−"}₹${Math.abs(Math.round(pl))}Cr`;
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Capital ROI footer */}
                            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ fontSize: 11, color: "rgba(168,184,216,0.40)" }}>
                                Capital ROI · {isFinite(effectiveROI) ? `${effectiveROI.toFixed(2)}×` : "—"} · Budget + P&A{result.heroRemuneration > 0 ? ` + ₹${result.heroRemuneration}Cr hero` : ""}
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(168,184,216,0.40)" }}>
                                Deal break-even: ₹{result.recoveryStreamsTotal > 0 ? result.profitBudgetWithStreams : result.profitBudget}Cr
                                {result.recoveryStreamsTotal > 0 ? ` (streams raise this from ₹${result.profitBudget}Cr)` : (input.heroRemuneration ?? 0) > 0 ? ` (hero ₹${input.heroRemuneration}Cr reduces this)` : " · theatrical only"}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* ── 4. CVI SCORE HERO ── */}
                <div
                  className="score-glow"
                  style={{
                    background: "linear-gradient(145deg, #191C3A, #141830)",
                    border: `1px solid ${result.bandColor}33`,
                    borderRadius: 14,
                    padding: "28px 32px",
                    display: "flex",
                    alignItems: "center",
                    gap: 32,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{
                    position: "absolute", top: "50%", left: 0,
                    transform: "translateY(-50%)",
                    width: 300, height: 300, borderRadius: "50%",
                    background: `radial-gradient(circle, ${result.bandColor}08 0%, transparent 70%)`,
                    pointerEvents: "none",
                  }} />

                  <ScoreRing
                    score={result.filmSuccessScore}
                    band={result.band}
                    bandColor={result.bandColor}
                    animating={animating}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "rgba(168,184,216,0.50)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 6 }}>
                      Capital Viability Index (CVI)
                    </div>
                    <div style={{
                      fontFamily: "var(--font)",
                      fontSize: 28,
                      fontWeight: 700,
                      color: result.bandColor,
                      lineHeight: 1.1,
                      marginBottom: 6,
                    }}>
                      {result.band}
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: "rgba(240,244,255,0.60)",
                      marginBottom: 4,
                      lineHeight: 1.5,
                    }}>
                      {result.filmSuccessScore.toFixed(0)}/100 — {
                        result.filmSuccessScore >= 80
                          ? "Strong structural alignment. Star power, budget, distribution and genre all point in the same direction."
                          : result.filmSuccessScore >= 65
                          ? "Acceptable structural fit. Star power is solid — budget efficiency is the risk lever. Lower budget or stronger distribution improves this."
                          : result.filmSuccessScore >= 50
                          ? "Weak structural fit. The budget is stretching beyond what the star's track record supports."
                          : "Poor structural alignment. Capital is overextended relative to the star's proven gross ceiling."
                      }
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(168,184,216,0.35)", marginBottom: 16, fontStyle: "italic" }}>
                      CVI = star draw × 35% + budget fit × 30% + distribution × 20% + genre × 15%
                    </div>

                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 10,
                      background: "#10152C",
                      border: "1px solid rgba(180,150,255,0.12)",
                      borderRadius: 20,
                      padding: "6px 14px",
                    }}>
                      <span style={{ fontSize: 13, color: "rgba(168,184,216,0.65)", textTransform: "uppercase", letterSpacing: "1px" }}>
                        ROI Band
                      </span>
                      <span style={{
                        fontFamily: "var(--font)", fontSize: 16, fontWeight: 700, color: result.bandColor,
                      }}>
                        {mul(result.roiBandLow)} — {mul(result.roiBandHigh)}
                      </span>
                      <span style={{ fontSize: 13, color: "rgba(168,184,216,0.65)" }}>
                        {result.roiBandLabel}
                      </span>
                    </div>

                    {(result.womScenario !== "Average" || result.preReleaseBuzz !== "Normal" || result.releaseTiming !== "Normal" || result.marketFriction !== "Normal") && (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        marginTop: 8,
                        background: "rgba(56,189,248,0.08)",
                        border: "1px solid rgba(56,189,248,0.25)",
                        borderRadius: 20, padding: "5px 12px",
                      }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#38BDF8" }} />
                        <span style={{ fontFamily: "var(--font)", fontSize: 13, color: "#38BDF8", textTransform: "uppercase", letterSpacing: "1px" }}>
                          Market Conditions Active
                        </span>
                        <span style={{ fontSize: 12, color: "rgba(168,184,216,0.50)" }}>
                          {result.womScenario} WOM · {result.preReleaseBuzz} · Opening ₹{result.effectiveOpeningDay1}Cr
                        </span>
                      </div>
                    )}

                    {/* P&L Reality Check — shown when CVI is positive but all scenarios show loss */}
                    {(() => {
                      const sp = result.scenarioPanel;
                      const allNegative = sp.stress.profitLoss < 0 && sp.base.profitLoss < 0 && sp.upside.profitLoss < 0;
                      if (!allNegative) return null;
                      return (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8,
                          marginTop: 10,
                          background: "rgba(255,77,77,0.08)",
                          border: "1px solid rgba(255,77,77,0.30)",
                          borderRadius: 10, padding: "8px 14px",
                        }}>
                          <span style={{ fontSize: 16 }}>⚠</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#FF4D4D" }}>
                              All scenarios show capital loss
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(168,184,216,0.55)", marginTop: 2 }}>
                              CVI measures structural star-budget fit, not P&L outcome.
                              Break-even requires {cr(result.breakEvenGross)} gross — above projected ceiling.
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "12px 16px",
                    background: "#10152C",
                    border: "1px solid rgba(180,150,255,0.08)",
                    borderRadius: 8, minWidth: 72,
                  }}>
                    <span style={{ fontFamily: "var(--font)", fontSize: 30, fontWeight: 700, color: "#3B8EFF", lineHeight: 1 }}>
                      T{result.tier}
                    </span>
                    <span style={{ fontSize: 13, color: "rgba(168,184,216,0.55)", textTransform: "uppercase", letterSpacing: "1px" }}>Tier</span>
                    <span style={{ fontSize: 13, color: "rgba(168,184,216,0.65)" }}>×{result.theatricalMultiplier}</span>
                  </div>
                </div>

                {/* ── REALITY CHECK — Actor Market Benchmarks ── */}
                {result.openingBase && (() => {
                  const base  = result.openingBase;
                  const ceil  = result.openingCeiling ?? result.openingCr;
                  const eff   = result.effectiveOpeningDay1 ?? base;
                  const catMult = result.filmCategoryMultiplier ?? 1.0;
                  const cat   = result.filmCategory ?? "Normal";
                  const typLow  = r1(base * 0.85);
                  const typHigh = r1(base * 1.15);
                  const evtLow  = r1(base * 1.6);
                  const evtHigh = ceil;
                  const catColors: Record<string, string> = { Normal: "#94A3B8", Trend: "#F59E0B", Event: "#7B9FFF" };
                  const catColor = catColors[cat] ?? "#94A3B8";

                  // Determine projection status vs typical range
                  const inTypical = eff >= typLow && eff <= typHigh;
                  const aboveTypical = eff > typHigh && eff < evtLow;
                  const inEvent = eff >= evtLow;
                  const statusText = inTypical
                    ? `Projection within ${input.actorName ?? "actor"}'s normal opening band`
                    : aboveTypical
                    ? `Projection in trend territory — strong buzz assumed`
                    : inEvent
                    ? `Projection in event range — marquee execution required`
                    : `Projection below typical — conservative scenario`;
                  const statusColor = inTypical ? "#22D3A5" : aboveTypical ? "#F59E0B" : inEvent ? "#7B9FFF" : "#94A3B8";

                  return (
                    <div style={{
                      background: "linear-gradient(135deg, #080E1E, #0C1428)",
                      border: "1px solid rgba(123,159,255,0.20)",
                      borderRadius: 12,
                      padding: 20,
                      marginBottom: 2,
                    }}>
                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "rgba(123,159,255,0.70)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 3 }}>
                            Reality Check
                          </div>
                          <div style={{ fontFamily: "var(--font)", fontSize: 15, fontWeight: 700, color: "rgba(240,244,255,0.90)" }}>
                            {input.actorName ?? "Actor"} — Market Benchmarks
                          </div>
                        </div>
                        <div style={{
                          background: `${catColor}18`,
                          border: `1px solid ${catColor}40`,
                          borderRadius: 20, padding: "4px 12px",
                          fontSize: 11, color: catColor, textTransform: "uppercase", letterSpacing: "1px",
                        }}>
                          {cat} {catMult > 1 ? `${catMult}×` : ""}
                        </div>
                      </div>

                      {/* 4-row benchmark table */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                        {[
                          {
                            label: "Highest Opening",
                            value: `₹${ceil}Cr`,
                            sub: "confirmed solo Day-1 ceiling",
                            color: "#7B9FFF",
                          },
                          {
                            label: "Typical Opening Range",
                            value: `₹${typLow}–${typHigh}Cr`,
                            sub: "era-normalized baseline ±15%",
                            color: "#22D3A5",
                          },
                          {
                            label: "Event Opening Range",
                            value: `₹${evtLow}–${evtHigh}Cr`,
                            sub: "marquee director / franchise / political event",
                            color: "#F59E0B",
                          },
                          {
                            label: "FilmLab Projection",
                            value: `₹${eff}Cr`,
                            sub: `${cat} film · ${catMult}× category multiplier`,
                            color: catColor,
                            highlight: true,
                          },
                        ].map(row => (
                          <div key={row.label} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: row.highlight ? "10px 12px" : "8px 12px",
                            borderRadius: 8,
                            background: row.highlight
                              ? `${catColor}10`
                              : "rgba(255,255,255,0.025)",
                            border: row.highlight
                              ? `1px solid ${catColor}30`
                              : "1px solid rgba(255,255,255,0.04)",
                          }}>
                            <div>
                              <div style={{ fontSize: 12, color: "rgba(240,244,255,0.65)" }}>{row.label}</div>
                              <div style={{ fontSize: 10, color: "rgba(240,244,255,0.28)", marginTop: 1 }}>{row.sub}</div>
                            </div>
                            <div style={{
                              fontFamily: "var(--font)", fontSize: row.highlight ? 17 : 15,
                              fontWeight: row.highlight ? 900 : 600,
                              color: row.color,
                            }}>
                              {row.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Status line */}
                      <div style={{
                        display: "flex", alignItems: "flex-start", gap: 8,
                        padding: "9px 12px",
                        borderRadius: 8,
                        background: `${statusColor}08`,
                        border: `1px solid ${statusColor}25`,
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, marginTop: 4, flexShrink: 0 }} />
                        <div style={{ fontSize: 12, color: "rgba(240,244,255,0.55)", lineHeight: 1.5 }}>
                          <span style={{ color: statusColor, fontWeight: 600 }}>{statusText}.</span>
                          {cat === "Event" && ` Game Changer benchmark: ₹186Cr (Shankar director + post-RRR hype). Projection factors in era-normalized base × ${catMult}× event multiplier.`}
                          {cat === "Normal" && ` Opening baseline derived from historical Day-1 data (era-normalized for ticket price inflation). Event films can exceed this range with marquee execution.`}
                          {cat === "Trend" && ` Strong-trend films historically outperform typical range by 20–40%. Buzz must convert to footfalls.`}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── 4a. THEATRICAL RUN MODEL ── */}
                {result.theatricalRun && (() => {
                  const tr = result.theatricalRun;
                  const sp = result.scenarioPanel;
                  const DAY_TAGS = ["Opening Day", "Day 2 (+WOM)", "Day 3 (+WOM)", "First Drop", "Weekday", "Weekday", "Weekday tail"];

                  return (
                    <div style={{
                      background: "linear-gradient(145deg, #0B1828, #0F1A2E)",
                      border: "1px solid rgba(56,189,248,0.18)",
                      borderRadius: 14,
                      padding: "22px 26px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 20,
                    }}>
                      {/* Header */}
                      <div>
                        <div style={{ fontSize: 13, color: "rgba(168,184,216,0.50)", textTransform: "uppercase" as const, letterSpacing: "2px", marginBottom: 5 }}>
                          Theatrical Run Model
                        </div>
                        <div style={{ fontFamily: "var(--font)", fontSize: 18, fontWeight: 700, color: "rgba(240,244,255,0.92)" }}>
                          How does the money come back? Day-by-day recovery.
                        </div>
                        <div style={{ fontSize: 14, color: "rgba(168,184,216,0.52)", marginTop: 4 }}>
                          {tr.multiplierLabel} · Total capital ₹{tr.totalCapital}Cr
                          {tr.netTheatricalRisk < tr.totalCapital && (
                            <span style={{ color: "#22e5a5", fontWeight: 600 }}> · Net theatrical risk ₹{tr.netTheatricalRisk}Cr (pre-release rights offset ₹{r1(tr.totalCapital - tr.netTheatricalRisk)}Cr)</span>
                          )}
                        </div>
                        {/* Opening Power context — explains the Day-1 figure */}
                        <div style={{
                          marginTop: 8,
                          padding: "10px 14px",
                          background: "rgba(56,189,248,0.06)",
                          border: "1px solid rgba(56,189,248,0.18)",
                          borderRadius: 8,
                          display: "flex", alignItems: "center", gap: 16,
                          flexWrap: "wrap" as const,
                        }}>
                          <div>
                            <div style={{ fontSize: 10, color: "rgba(56,189,248,0.55)", textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 2 }}>Actor Opening Power (Day 1)</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                              <span style={{ fontFamily: "var(--font)", fontSize: 22, fontWeight: 900, color: "#38BDF8" }}>₹{tr.openingDay1Gross}Cr</span>
                              <span style={{ fontSize: 11, color: "rgba(168,184,216,0.55)" }}>gross</span>
                              <span style={{ fontSize: 11, color: "rgba(168,184,216,0.40)", marginLeft: 4 }}>→ Share ₹{r1(tr.openingDay1Gross * 0.50)}Cr</span>
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(168,184,216,0.42)", marginTop: 2 }}>
                              Recent-era baseline · Peak ceiling ₹{tr.openingCr}Cr
                            </div>
                          </div>
                          <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)" }} />
                          <div style={{ fontSize: 12, color: "rgba(168,184,216,0.55)", lineHeight: 1.6, flex: 1 }}>
                            <span style={{ color: "#FFB800", fontWeight: 600 }}>Note: </span>
                            Day-by-day grid uses the{" "}
                            <strong style={{ color: "rgba(240,244,255,0.75)" }}>
                              {result.womScenario} WOM scenario (₹{tr.totalGross}Cr lifetime P&L)
                            </strong>{" "}
                            with a{" "}
                            <strong style={{ color: result.womScenario === "Strong" ? "#22C55E" : result.womScenario === "Weak" ? "#FF4D4D" : "#FFB800" }}>
                              {result.womScenario === "Strong" ? "blockbuster hold curve — stronger weekdays + 2nd weekend jump" :
                               result.womScenario === "Weak"   ? "steep decline curve — sharp weekday collapse" :
                               "standard Telugu front-loaded decay curve"}
                            </strong>.
                            Opening at ₹{tr.openingDay1Gross}Cr implies ~₹{tr.openingLifetime}Cr lifetime at current pace.
                          </div>
                        </div>
                      </div>

                      {/* Capital Recovery Day — HERO STAT (most important number) */}
                      <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
                        gap: 12,
                      }}>
                        {/* Capital Recovery Day */}
                        <div style={{
                          background: tr.capitalRecoveryDay ? "rgba(34,197,94,0.08)" : "rgba(255,77,77,0.06)",
                          border: `1px solid ${tr.capitalRecoveryDay ? "rgba(34,197,94,0.30)" : "rgba(255,77,77,0.25)"}`,
                          borderRadius: 10, padding: "16px 18px",
                        }}>
                          <div style={{ fontSize: 11, color: "rgba(168,184,216,0.50)", textTransform: "uppercase" as const, letterSpacing: "1.5px", marginBottom: 6 }}>Theatrical Recovery Day</div>
                          <div style={{ fontFamily: "var(--font)", fontSize: 22, fontWeight: 900, color: tr.capitalRecoveryDay ? "#22C55E" : "#FF6B6B", lineHeight: 1 }}>
                            {tr.capitalRecoveryLabel}
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(168,184,216,0.45)", marginTop: 6 }}>
                            {tr.netTheatricalRisk < tr.totalCapital
                              ? `Theatres cover ₹${tr.netTheatricalRisk}Cr net risk`
                              : `Theatres cover ₹${tr.totalCapital}Cr capital`}
                          </div>
                        </div>
                        {/* Net Theatrical Risk */}
                        <div style={{
                          background: tr.netTheatricalRisk === 0
                            ? "rgba(34,197,94,0.10)"
                            : tr.netTheatricalRisk < tr.totalCapital * 0.4
                            ? "rgba(34,229,165,0.07)"
                            : "rgba(255,184,0,0.06)",
                          border: `1px solid ${tr.netTheatricalRisk === 0 ? "rgba(34,197,94,0.30)" : tr.netTheatricalRisk < tr.totalCapital * 0.4 ? "rgba(34,229,165,0.25)" : "rgba(255,184,0,0.22)"}`,
                          borderRadius: 10, padding: "16px 18px",
                        }}>
                          <div style={{ fontSize: 11, color: "rgba(168,184,216,0.50)", textTransform: "uppercase" as const, letterSpacing: "1.5px", marginBottom: 6 }}>Net Theatrical Risk</div>
                          <div style={{ fontFamily: "var(--font)", fontSize: 22, fontWeight: 900, color: tr.netTheatricalRisk === 0 ? "#22C55E" : tr.netTheatricalRisk < tr.totalCapital * 0.4 ? "#22e5a5" : "#FFB800", lineHeight: 1 }}>
                            ₹{tr.netTheatricalRisk}Cr
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(168,184,216,0.45)", marginTop: 6 }}>
                            After ₹{r1(tr.totalCapital - tr.netTheatricalRisk)}Cr pre-release rights
                          </div>
                        </div>
                        {/* Opening Weekend */}
                        <div style={{
                          background: "rgba(56,189,248,0.06)",
                          border: "1px solid rgba(56,189,248,0.20)",
                          borderRadius: 10, padding: "16px 18px",
                        }}>
                          <div style={{ fontSize: 11, color: "rgba(56,189,248,0.60)", textTransform: "uppercase" as const, letterSpacing: "1.5px", marginBottom: 6 }}>Opening Weekend</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                            <div style={{ fontFamily: "var(--font)", fontSize: 22, fontWeight: 900, color: "#38BDF8", lineHeight: 1 }}>₹{tr.openingWeekendGross}Cr</div>
                            <div style={{ fontSize: 10, color: "rgba(168,184,216,0.45)", fontWeight: 600, textTransform: "uppercase" as const }}>gross</div>
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(168,184,216,0.45)", marginTop: 6 }}>
                            Share: <span style={{ color: "#38BDF8", fontWeight: 700 }}>₹{tr.openingWeekendShare}Cr</span> · Fri+Sat+Sun
                          </div>
                        </div>
                        {/* Week 1 total */}
                        <div style={{
                          background: "rgba(123,159,255,0.06)",
                          border: "1px solid rgba(123,159,255,0.18)",
                          borderRadius: 10, padding: "16px 18px",
                        }}>
                          <div style={{ fontSize: 11, color: "rgba(123,159,255,0.60)", textTransform: "uppercase" as const, letterSpacing: "1.5px", marginBottom: 6 }}>Week 1 Total</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                            <div style={{ fontFamily: "var(--font)", fontSize: 22, fontWeight: 900, color: "#7B9FFF", lineHeight: 1 }}>₹{tr.weeks[0].grossCr}Cr</div>
                            <div style={{ fontSize: 10, color: "rgba(168,184,216,0.45)", fontWeight: 600, textTransform: "uppercase" as const }}>gross</div>
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(168,184,216,0.45)", marginTop: 6 }}>
                            Share: <span style={{ color: "#7B9FFF", fontWeight: 700 }}>₹{tr.weeks[0].shareCr}Cr</span> · {((tr.weeks[0].grossCr / tr.totalGross) * 100).toFixed(0)}% of lifetime
                          </div>
                        </div>
                      </div>

                      {/* Day-by-day breakdown — 7 days */}
                      <div>
                        <div style={{ fontSize: 12, color: "rgba(56,189,248,0.70)", textTransform: "uppercase" as const, letterSpacing: "1.5px", marginBottom: 10, fontWeight: 700 }}>
                          Day-by-Day · Week 1 ({
                            tr.scenario === "Strong"  ? "Strong WoM — Blockbuster Curve" :
                            tr.scenario === "Weak"    ? "Weak WoM — Steep Drop Curve" :
                            "Average WoM — Standard Curve"
                          }) · <span style={{ color: "rgba(168,184,216,0.45)", fontSize: 11, textTransform: "none" as const, letterSpacing: 0, fontWeight: 400 }}>Gross = total tickets · Share = producer's cut (50% wk1)</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                          {tr.days.map((day, i) => {
                            const isOpening   = i === 0;
                            const isWeekend   = i <= 2;
                            const isRecovery  = tr.capitalRecoveryDay === day.day;
                            const cumPct      = Math.min((day.cumulativeShare / Math.max(tr.netTheatricalRisk, 1)) * 100, 100);
                            return (
                              <div key={day.day} style={{
                                background: isRecovery
                                  ? "rgba(34,197,94,0.12)"
                                  : isOpening ? "rgba(56,189,248,0.08)" : isWeekend ? "rgba(56,189,248,0.04)" : "rgba(255,255,255,0.02)",
                                border: `1px solid ${isRecovery ? "rgba(34,197,94,0.40)" : isOpening ? "rgba(56,189,248,0.30)" : "rgba(255,255,255,0.06)"}`,
                                borderRadius: 8, padding: "8px 8px",
                              }}>
                                {/* Day label */}
                                <div style={{ fontSize: 10, color: isOpening ? "#38BDF8" : isWeekend ? "rgba(56,189,248,0.60)" : "rgba(168,184,216,0.45)", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.4px", marginBottom: 4 }}>
                                  {day.label}
                                  {isRecovery && <span style={{ color: "#22C55E", marginLeft: 3 }}>✓</span>}
                                </div>
                                {/* GROSS — what trade papers report */}
                                <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 1 }}>
                                  <div style={{ fontFamily: "var(--font)", fontSize: 14, fontWeight: 800, color: isOpening ? "#38BDF8" : "rgba(240,244,255,0.85)" }}>
                                    ₹{day.grossCr}Cr
                                  </div>
                                  <div style={{ fontSize: 9, color: "rgba(168,184,216,0.38)", fontWeight: 600, textTransform: "uppercase" as const }}>gross</div>
                                </div>
                                {/* SHARE — what pays back capital */}
                                <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 3 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: isRecovery ? "#22C55E" : "rgba(123,159,255,0.80)" }}>
                                    ₹{day.shareCr}Cr
                                  </div>
                                  <div style={{ fontSize: 9, color: "rgba(168,184,216,0.35)", fontWeight: 600, textTransform: "uppercase" as const }}>share</div>
                                </div>
                                <div style={{ fontSize: 9, color: "rgba(168,184,216,0.35)", marginBottom: 3 }}>
                                  {DAY_TAGS[i]}
                                </div>
                                {/* Mini share recovery bar vs net theatrical risk */}
                                <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: 2 }}>
                                  <div style={{ height: "100%", width: `${cumPct}%`, background: day.capitalRecovered ? "#22C55E" : "#4D6AFF", borderRadius: 2 }} />
                                </div>
                                <div style={{ fontSize: 9, color: "rgba(168,184,216,0.28)", marginTop: 2 }}>
                                  {cumPct.toFixed(0)}% recovered
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Week-by-week recovery table */}
                      <div>
                        <div style={{ fontSize: 12, color: "rgba(56,189,248,0.70)", textTransform: "uppercase" as const, letterSpacing: "1.5px", marginBottom: 10, fontWeight: 700 }}>
                          Projected Revenue Curve (if theatrical run sustains)
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 0, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1.5fr 1.2fr", padding: "8px 14px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            {["Period", "Gross (BO)", "Share (declining)", "Cumulative Share", "Status"].map(h => (
                              <div key={h} style={{ fontSize: 11, color: "rgba(168,184,216,0.45)", textTransform: "uppercase" as const, letterSpacing: "0.8px" }}>{h}</div>
                            ))}
                          </div>
                          {tr.weeks.map((w, i) => {
                            const WEEK_SHARE_RATES = ["50%", "42.5%", "37.5%", "30%"];
                            const pct2 = Math.min((w.cumulativeShare / Math.max(tr.netTheatricalRisk, 1)) * 100, 100);
                            const isRecoveryWeek = tr.recoveryWeek === w.week;
                            return (
                              <div key={w.week} style={{
                                display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1.5fr 1.2fr",
                                padding: "10px 14px",
                                background: isRecoveryWeek ? "rgba(34,197,94,0.08)" : i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
                                borderBottom: i < tr.weeks.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                borderLeft: isRecoveryWeek ? "3px solid #22C55E" : "3px solid transparent",
                              }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(240,244,255,0.85)" }}>{w.label}</div>
                                <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "rgba(240,244,255,0.80)" }}>₹{w.grossCr}Cr</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                  <span style={{ fontFamily: "var(--font)", fontSize: 13, color: "#7B9FFF" }}>₹{w.shareCr}Cr</span>
                                  <span style={{ fontSize: 9, color: "rgba(168,184,216,0.35)" }}>{WEEK_SHARE_RATES[i]} of gross</span>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                  <span style={{ fontFamily: "var(--font)", fontSize: 13, fontWeight: 700, color: w.capitalRecovered ? "#22C55E" : "rgba(240,244,255,0.75)" }}>₹{w.cumulativeShare}Cr</span>
                                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${pct2}%`, background: w.capitalRecovered ? "#22C55E" : "#4D6AFF", borderRadius: 2, transition: "width 0.6s" }} />
                                  </div>
                                  <span style={{ fontSize: 10, color: "rgba(168,184,216,0.40)" }}>{pct2.toFixed(0)}% of ₹{tr.netTheatricalRisk}Cr net risk</span>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: isRecoveryWeek ? "#22C55E" : w.capitalRecovered ? "#22C55E" : "rgba(255,77,77,0.80)" }}>
                                  {isRecoveryWeek ? "✓ RECOVERED" : w.capitalRecovered ? "✓ Profit" : "Capital Unrealized"}
                                </div>
                              </div>
                            );
                          })}
                          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1.5fr 1.2fr", padding: "10px 14px", background: "rgba(77,106,255,0.06)", borderTop: "1px solid rgba(77,106,255,0.15)" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#7B9FFF" }}>4-Week Total</div>
                            <div style={{ fontFamily: "var(--font)", fontSize: 13, fontWeight: 800, color: "#7B9FFF" }}>₹{tr.weeks.reduce((s, w) => Math.round((s + w.grossCr) * 10) / 10, 0)}Cr <span style={{ fontSize: 10, color: "rgba(168,184,216,0.40)", fontWeight: 400 }}>gross</span></div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              <span style={{ fontFamily: "var(--font)", fontSize: 13, fontWeight: 800, color: "#7B9FFF" }}>₹{tr.weeks[3].cumulativeShare}Cr</span>
                              <span style={{ fontSize: 9, color: "rgba(168,184,216,0.35)" }}>~44.6% eff. avg</span>
                            </div>
                            <div style={{ fontFamily: "var(--font)", fontSize: 13, fontWeight: 700, color: tr.weeks[3].capitalRecovered ? "#22C55E" : "#FF4D4D" }}>₹{tr.weeks[3].cumulativeShare}Cr cumulative</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: tr.recoveryWeek ? "#22C55E" : "#FF4D4D" }}>
                              {tr.recoveryWeek ? `✓ Wk ${tr.recoveryWeek}` : "Not recovered"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recovery Gate Condition — compact summary strip */}
                      <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 0,
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(56,189,248,0.14)",
                        borderRadius: 10, overflow: "hidden",
                      }}>
                        {[
                          {
                            label: "Break-Even Gross (Net Risk)",
                            value: `₹${tr.recoveryGateCr}Cr`,
                            sub: tr.netTheatricalRisk < tr.totalCapital
                              ? `Net ₹${tr.netTheatricalRisk}Cr after pre-release rights`
                              : "Full capital — no pre-release offset",
                            color: "#38BDF8",
                          },
                          {
                            label: "Base Trajectory Reaches It",
                            value: tr.capitalRecoveryLabel,
                            sub: `At ₹${sp.base.gross}Cr gross (market average)`,
                            color: tr.capitalRecoveryDay ? "#22C55E" : "#FFB800",
                          },
                          {
                            label: "Stress Trajectory",
                            value: (() => {
                              const DAY_W2 = [0.26,0.22,0.22,0.10,0.08,0.06,0.06];
                              let c2 = 0;
                              const sg = sp.stress.gross;
                              for (let d = 0; d < 7; d++) {
                                c2 = r1(c2 + r1(sg * 0.58 * DAY_W2[d]) * 0.50);
                                if (c2 >= tr.totalCapital) return `Day ${d+1}`;
                              }
                              for (let d = 0; d < 7; d++) {
                                c2 = r1(c2 + r1(sg * 0.22 * DAY_W2[d]) * 0.425);
                                if (c2 >= tr.totalCapital) return `Day ${7+d+1}`;
                              }
                              return "Not in 4 wks";
                            })(),
                            sub: `At ₹${sp.stress.gross}Cr gross (underperformance)`,
                            color: "#FF6B6B",
                          },
                        ].map(({ label, value, sub, color }, i, arr) => (
                          <div key={label} style={{
                            padding: "12px 16px",
                            borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                            textAlign: "center" as const,
                          }}>
                            <div style={{ fontSize: 10, color: "rgba(168,184,216,0.42)", textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 5 }}>{label}</div>
                            <div style={{ fontFamily: "var(--font)", fontSize: 16, fontWeight: 800, color, lineHeight: 1.2 }}>{value}</div>
                            <div style={{ fontSize: 11, color: "rgba(168,184,216,0.38)", marginTop: 4 }}>{sub}</div>
                          </div>
                        ))}
                      </div>

                      {/* Three-scenario recovery day comparison */}
                      <div>
                        <div style={{ fontSize: 12, color: "rgba(56,189,248,0.70)", textTransform: "uppercase" as const, letterSpacing: "1.5px", marginBottom: 10, fontWeight: 700 }}>
                          Capital Recovery by Scenario
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                          {[
                            { label: "Underperformance", sublabel: "Stress scenario", gross: sp.stress.gross, color: "#FF4D4D", bg: "rgba(255,77,77,0.06)", border: "rgba(255,77,77,0.20)" },
                            { label: "Market Average", sublabel: "Base scenario", gross: sp.base.gross,   color: "#7B9FFF", bg: "rgba(77,106,255,0.06)", border: "rgba(77,106,255,0.20)" },
                            { label: "Positive WOM Breakout", sublabel: "Upside scenario", gross: sp.upside.gross, color: "#22C55E", bg: "rgba(34,197,94,0.06)",  border: "rgba(34,197,94,0.20)"  },
                          ].map(({ label, sublabel, gross, color, bg, border }) => {
                            // Day-level recovery using declining distributor shares
                            // Week 1: 50%, Week 2: 42.5% (mirrors engine WEEK_DIST_SHARES)
                            const DAY_W  = [0.26, 0.22, 0.22, 0.10, 0.08, 0.06, 0.06];
                            const DAY_L  = ["Friday","Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
                            const W2_L   = ["2nd Fri","2nd Sat","2nd Sun","2nd Mon","2nd Tue","2nd Wed","2nd Thu"];
                            const W1_SHARE = 0.50;   // Week 1 producer share
                            const W2_SHARE = 0.425;  // Week 2 producer share
                            // Effective lifetime share for P&L (weighted avg: 0.58×0.50 + 0.22×0.425 + 0.12×0.375 + 0.08×0.30)
                            const EFF_SHARE = 0.446;
                            let cum = 0;
                            let recovDayLabel = "";
                            // week 1 days
                            const w1g = gross * 0.58;
                            for (let d = 0; d < 7; d++) {
                              cum = r1(cum + r1(w1g * DAY_W[d]) * W1_SHARE);
                              if (cum >= tr.totalCapital && !recovDayLabel) recovDayLabel = `Day ${d + 1} (${DAY_L[d]})`;
                            }
                            // week 2 days
                            if (!recovDayLabel) {
                              const w2g = gross * 0.22;
                              for (let d = 0; d < 7; d++) {
                                cum = r1(cum + r1(w2g * DAY_W[d]) * W2_SHARE);
                                if (cum >= tr.totalCapital && !recovDayLabel) recovDayLabel = `Day ${7 + d + 1} (${W2_L[d]})`;
                              }
                            }
                            if (!recovDayLabel) recovDayLabel = "Beyond 2 weeks";
                            // P&L uses effective lifetime share (more accurate than flat 40%)
                            const finalShare = r1(gross * EFF_SHARE);
                            const pnl = r1(finalShare - tr.totalCapital);
                            return (
                              <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "14px 16px" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 10 }}>
                                  {label}
                                  <div style={{ fontSize: 10, color: "rgba(168,184,216,0.40)", fontWeight: 400, textTransform: "none" as const, letterSpacing: 0, marginTop: 2 }}>{sublabel}</div>
                                </div>
                                <div style={{ fontSize: 12, color: "rgba(168,184,216,0.55)", marginBottom: 3 }}>
                                  Gross: <span style={{ color: "rgba(240,244,255,0.80)", fontWeight: 700 }}>₹{gross}Cr</span>
                                </div>
                                <div style={{ fontSize: 12, color: "rgba(168,184,216,0.55)", marginBottom: 3 }}>
                                  Theatrical share: <span style={{ color, fontWeight: 700 }}>₹{finalShare}Cr</span>
                                  <span style={{ fontSize: 10, color: "rgba(168,184,216,0.35)", marginLeft: 4 }}>~44.6% eff.</span>
                                </div>
                                <div style={{ fontSize: 12, color: "rgba(168,184,216,0.55)", marginBottom: 10 }}>
                                  Net P&L: <span style={{ color: pnl >= 0 ? "#22C55E" : "#FF4D4D", fontWeight: 800 }}>{pnl >= 0 ? "+" : ""}₹{pnl}Cr</span>
                                </div>
                                <div style={{
                                  fontSize: 12, fontWeight: 700, color,
                                  padding: "6px 8px",
                                  background: `${color}15`,
                                  borderRadius: 6, textAlign: "center" as const,
                                  lineHeight: 1.4,
                                }}>
                                  {recovDayLabel === "Beyond 2 weeks" ? "⚠ " : "✓ "}{recovDayLabel}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* How we calculate */}
                      <div style={{
                        background: "rgba(56,189,248,0.04)",
                        border: "1px solid rgba(56,189,248,0.12)",
                        borderRadius: 10, padding: "14px 18px",
                        display: "flex", flexDirection: "column", gap: 6,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(56,189,248,0.70)", textTransform: "uppercase" as const, letterSpacing: "1px" }}>
                          📐 How This Is Calculated
                        </div>
                        <div style={{ fontSize: 13, color: "rgba(168,184,216,0.62)", lineHeight: 1.7 }}>
                          <strong style={{ color: "rgba(240,244,255,0.80)" }}>Opening Power (Day-1)</strong> ₹{tr.openingDay1Gross}Cr = actor's recent-era baseline opening (last 2–3 comparable standalone films). Peak ceiling = ₹{tr.openingCr}Cr.<br/>
                          <strong style={{ color: "rgba(240,244,255,0.80)" }}>Day-by-Day grid</strong> distributes Base Case lifetime (₹{sp.base.gross}Cr) using Telugu BO weights for capital recovery math.<br/>
                          <strong style={{ color: "rgba(240,244,255,0.80)" }}>Daily weights (Week 1):</strong> Fri 34% · Sat 24% · Sun 22% · Mon 9% · Tue 5% · Wed 3% · Thu 3% — Day-1 ≈ 20% of lifetime (18–22% norm).<br/>
                          <strong style={{ color: "rgba(240,244,255,0.80)" }}>Weekly holdover:</strong> Week 1 = 58%, Week 2 = 22%, Week 3 = 12%, Week 4+ = 8% of lifetime gross.<br/>
                          <strong style={{ color: "rgba(240,244,255,0.80)" }}>Distributor share (declining):</strong> Wk 1 = 50% · Wk 2 = 42.5% · Wk 3 = 37.5% · Wk 4+ = 30%. Effective lifetime avg ≈ 44.6%.<br/>
                          <strong style={{ color: "rgba(240,244,255,0.80)" }}>Net Theatrical Risk</strong> = Total Capital − Pre-release rights. Theatres cover only this net amount.<br/>
                          <strong style={{ color: "rgba(240,244,255,0.80)" }}>Theatrical Recovery Day</strong> = first day cumulative producer share ≥ Net Theatrical Risk (₹{tr.netTheatricalRisk}Cr).
                        </div>
                      </div>
                    </div>
                  );
                })()}


                {/* ── 4b. BUDGET OPTIMIZER ── */}
                {(() => {
                  const canOptimize = !!(input.actorName || input.useManualOverride);
                  const isScanning  = optimizerPhase === "scanning";
                  const isDone      = optimizerPhase === "done";

                  // Scan step labels shown during the sweep
                  const SCAN_STEPS = [
                    "Loading actor capital profile…",
                    "Applying Star Market Floor constraint (hero × 2.5)…",
                    "Sweeping budgets with elastic opening model…",
                    "Evaluating risk-adjusted profit at each point…",
                    "Locating capital-efficient budget above market floor…",
                    "Analysis complete.",
                  ];

                  return (
                    <div style={{
                      background: "linear-gradient(145deg, #0D1929, #10162E)",
                      border: `1px solid ${isScanning ? "rgba(77,106,255,0.55)" : isDone ? "rgba(77,106,255,0.30)" : "rgba(77,106,255,0.20)"}`,
                      borderRadius: 14,
                      padding: "24px 28px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 18,
                      transition: "border-color 0.4s",
                      position: "relative" as const,
                      overflow: "hidden" as const,
                    }}>

                      {/* Scan sweep glow — animates across the panel during scanning */}
                      {isScanning && (
                        <div style={{
                          position: "absolute", top: 0, left: 0, right: 0, height: "100%",
                          background: `linear-gradient(90deg, transparent ${optimizerProgress - 18}%, rgba(77,106,255,0.07) ${optimizerProgress}%, transparent ${optimizerProgress + 18}%)`,
                          pointerEvents: "none", transition: "background 0.12s linear",
                          zIndex: 0,
                        }} />
                      )}
                      {/* Top accent line — lights up when scanning */}
                      <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: 2,
                        background: isScanning
                          ? `linear-gradient(90deg, transparent ${optimizerProgress - 30}%, #4D6AFF ${optimizerProgress}%, #9B72FF ${optimizerProgress + 5}%, transparent ${optimizerProgress + 30}%)`
                          : isDone
                            ? "linear-gradient(90deg, #4D6AFF, #9B72FF, #4D6AFF)"
                            : "transparent",
                        transition: isScanning ? "background 0.08s linear" : "background 0.6s",
                        opacity: isScanning ? 1 : isDone ? 0.6 : 0,
                        borderRadius: "14px 14px 0 0",
                      }} />

                      {/* Header */}
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={{ fontSize: 13, color: "rgba(168,184,216,0.50)", textTransform: "uppercase" as const, letterSpacing: "2px", marginBottom: 6 }}>
                          Budget Optimizer
                        </div>

                        {/* Dynamic Capital-Efficient Budget heading */}
                        {(() => {
                          if (!optimizer || !isDone) {
                            return (
                              <>
                                <div style={{ fontFamily: "var(--font)", fontSize: 18, fontWeight: 700, color: "rgba(240,244,255,0.92)", lineHeight: 1.3, marginBottom: 6 }}>
                                  Capital-Efficient Budget
                                </div>
                                <div style={{ fontSize: 13, color: "rgba(168,184,216,0.48)", marginTop: 4, lineHeight: 1.6, maxWidth: 520 }}>
                                  The budget where producer capital efficiency is highest across modeled outcomes — not a profit guarantee.
                                </div>
                              </>
                            );
                          }
                          const currentBudget = input.productionBudget;
                          const heroFee       = input.heroRemuneration ?? 0;
                          const ceiling       = optimizer.optimalBudget;
                          const MATCH_BAND    = 0.05; // ±5% = "matches"

                          // Determine which of the 4 states applies
                          const diffPct = (currentBudget - ceiling) / Math.max(ceiling, 1);
                          const heroOvershoot = heroFee > 0 && (heroFee / Math.max(ceiling, 1)) > 0.40;

                          let dynTitle = "";
                          let dynSub   = "";
                          let dynColor = "#7B9FFF";

                          if (Math.abs(diffPct) <= MATCH_BAND) {
                            // State 1: matches ceiling
                            dynTitle = "Current Parameters Match Capital-Efficient Budget";
                            dynSub   = `₹${currentBudget}Cr production sits at the capital-efficient ceiling — you are exactly at the safe line.`;
                            dynColor = "#22C55E";
                          } else if (heroOvershoot && heroFee > currentBudget * 0.40) {
                            // State 2: hero remuneration is primary driver of overshoot
                            const heroPct = Math.round((heroFee / Math.max(ceiling, 1)) * 100 - 100);
                            dynTitle = `Hero Remuneration Exceeds Capital-Efficient Budget by ${heroPct}%`;
                            dynSub   = `₹${heroFee}Cr hero fee is the primary risk driver — reducing it would bring total capital closer to the ₹${ceiling}Cr efficient ceiling.`;
                            dynColor = "#FF6B6B";
                          } else if (diffPct > MATCH_BAND) {
                            // State 4: production budget overshoots ceiling
                            const overPct = Math.round(diffPct * 100);
                            dynTitle = `Current Parameters Exceed Capital-Efficient Budget Ceiling — Risk Zone`;
                            dynSub   = `₹${currentBudget}Cr is ${overPct}% above the ₹${ceiling}Cr ceiling. Capital exposure increases significantly beyond this point.`;
                            dynColor = "#FF4D4D";
                          } else {
                            // State 3: budget below ceiling (safe)
                            dynTitle = "Current Parameters Indicate Capital-Efficient Budget";
                            dynSub   = `₹${currentBudget}Cr is within the capital-efficient range — ₹${ceiling}Cr ceiling provides headroom.`;
                            dynColor = "#22e5a5";
                          }

                          return (
                            <>
                              <div style={{ fontFamily: "var(--font)", fontSize: 17, fontWeight: 700, color: dynColor, lineHeight: 1.3, marginBottom: 6 }}>
                                {dynTitle}
                              </div>
                              <div style={{ fontSize: 13, color: "rgba(168,184,216,0.60)", marginTop: 4, lineHeight: 1.6, maxWidth: 560 }}>
                                {dynSub}
                              </div>
                            </>
                          );
                        })()}

                        <div style={{ fontSize: 14, color: "rgba(168,184,216,0.55)", marginBottom: 10, marginTop: 6 }}>
                          Sweeps from Star Market Floor → Star Capital Limit · opening scales by budget tier
                        </div>
                        <div style={{
                          fontSize: 13, color: "rgba(168,184,216,0.42)", marginTop: 4,
                          padding: "8px 12px", borderRadius: 7,
                          background: "rgba(77,106,255,0.05)",
                          border: "1px solid rgba(77,106,255,0.11)",
                          lineHeight: 1.6, maxWidth: 560,
                        }}>
                          ℹ️ FilmLab optimizes capital efficiency — not guaranteed profit. Creative upside and word-of-mouth can expand outcomes beyond modeled ranges.
                        </div>
                      </div>

                      {/* ── Button — centered, with active/scanning states ── */}
                      {!isDone && (
                        <div style={{ display: "flex", justifyContent: "center", position: "relative", zIndex: 1 }}>
                          <button
                            onClick={() => {
                              if (!canOptimize || isScanning) return;
                              setOptimizerPhase("scanning");
                              setOptimizerProgress(0);

                              // Animate progress bar over ~1.8s in steps
                              const DURATION = 1800;
                              const TICK = 30;
                              const steps = DURATION / TICK;
                              let step = 0;
                              const iv = setInterval(() => {
                                step++;
                                // Ease-out curve: progress accelerates then slows near end
                                const raw = step / steps;
                                const eased = raw < 0.7
                                  ? raw * (1 / 0.7) * 0.85          // fast first 70%
                                  : 0.85 + (raw - 0.7) * (0.15 / 0.3); // slow last 30%
                                setOptimizerProgress(Math.min(eased * 100, 98));
                                if (step >= steps) {
                                  clearInterval(iv);
                                  // Compute result then snap to 100 + reveal
                                  try {
                                    const opt = computeBudgetOptimizer(input);
                                    setOptimizer(opt);
                                  } catch(e) { /* silent */ }
                                  setOptimizerProgress(100);
                                  setTimeout(() => setOptimizerPhase("done"), 180);
                                }
                              }, TICK);
                            }}
                            disabled={!canOptimize || isScanning}
                            style={{
                              padding: "13px 36px",
                              borderRadius: 12,
                              border: isScanning
                                ? "1px solid rgba(77,106,255,0.80)"
                                : "1px solid rgba(77,106,255,0.55)",
                              background: isScanning
                                ? "linear-gradient(135deg, rgba(77,106,255,0.35), rgba(155,114,255,0.28))"
                                : canOptimize
                                  ? "linear-gradient(135deg, rgba(77,106,255,0.22), rgba(155,114,255,0.18))"
                                  : "rgba(77,106,255,0.05)",
                              color: canOptimize ? (isScanning ? "#A0BFFF" : "#7B9FFF") : "rgba(168,184,216,0.30)",
                              fontFamily: "var(--font)",
                              fontSize: 14, fontWeight: 800,
                              letterSpacing: "1.5px", textTransform: "uppercase" as const,
                              cursor: canOptimize && !isScanning ? "pointer" : "not-allowed",
                              transition: "all 0.25s",
                              boxShadow: isScanning
                                ? "0 0 24px rgba(77,106,255,0.35), 0 0 8px rgba(77,106,255,0.20)"
                                : canOptimize
                                  ? "0 0 12px rgba(77,106,255,0.15)"
                                  : "none",
                              minWidth: 240,
                            }}
                          >
                            {isScanning ? "⚙ Scanning…" : "⚡ Find Optimal Budget"}
                          </button>
                        </div>
                      )}

                      {/* ── Scan progress bar + step label ── */}
                      {isScanning && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative", zIndex: 1 }}>
                          {/* Progress bar */}
                          <div style={{ height: 4, borderRadius: 2, background: "rgba(77,106,255,0.12)", overflow: "hidden" }}>
                            <div style={{
                              height: "100%",
                              width: `${optimizerProgress}%`,
                              background: "linear-gradient(90deg, #4D6AFF, #9B72FF)",
                              borderRadius: 2,
                              transition: "width 0.08s linear",
                              boxShadow: "0 0 8px rgba(77,106,255,0.6)",
                            }} />
                          </div>
                          {/* Step label */}
                          <div style={{ fontSize: 13, color: "rgba(168,184,216,0.55)", textAlign: "center" as const, fontStyle: "italic", letterSpacing: "0.3px" }}>
                            {SCAN_STEPS[Math.min(Math.floor(optimizerProgress / 17), SCAN_STEPS.length - 1)]}
                          </div>
                          {/* Animated dots grid — mimics scanning activity */}
                          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 2 }}>
                            {Array.from({ length: 12 }).map((_, i) => {
                              const active = (optimizerProgress / 100) * 12 > i;
                              return (
                                <div key={i} style={{
                                  width: 5, height: 5, borderRadius: "50%",
                                  background: active ? "#4D6AFF" : "rgba(77,106,255,0.12)",
                                  transition: "background 0.15s",
                                  boxShadow: active ? "0 0 6px rgba(77,106,255,0.7)" : "none",
                                }} />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ── Results (fade in when done) ── */}
                      {isDone && optimizer && (() => {

                        // ── PRE-FLIGHT: Structural incompatibility takes over entire block ──
                        if (optimizer.structurallyIncompatible && optimizer.incompatibilityDetail) {
                          const d = optimizer.incompatibilityDetail;
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp 0.5s ease both" }}>
                              {/* Header row */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#FF6B6B", textTransform: "uppercase" as const, letterSpacing: "1.5px" }}>
                                  ✗ Capital Structure Incompatible
                                </div>
                                <button
                                  onClick={() => { setOptimizerPhase("idle"); setOptimizer(null); setOptimizerProgress(0); }}
                                  style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(255,107,107,0.25)", background: "transparent", color: "rgba(168,184,216,0.50)", fontSize: 12, cursor: "pointer" }}
                                >
                                  ↺ Re-run
                                </button>
                              </div>

                              {/* Math breakdown */}
                              <div style={{ background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,107,107,0.22)", borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#FF6B6B", textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 4 }}>
                                  ⚡ Structural Capital Conflict
                                </div>

                                {/* Capital structure math */}
                                {[
                                  { label: `${d.actorName || "Actor"} gross ceiling (recoverable share)`, value: `₹${d.recoverableShare}Cr`, color: "rgba(168,184,216,0.75)" },
                                  { label: "Hero remuneration claims", value: `−₹${d.heroFee}Cr`, color: "#FF6B6B" },
                                  { label: "Remaining for production + P&A", value: `₹${d.remainingAfterHero}Cr`, color: "#FFB800" },
                                  { label: `Minimum production scale (${d.actorName || "actor"} market expectation)`, value: `₹${d.marketFloor}Cr`, color: "rgba(168,184,216,0.75)" },
                                  { label: "Gap — no budget closes this", value: `₹${d.gap}Cr`, color: "#FF4D4D", bold: true },
                                ].map(({ label, value, color, bold }) => (
                                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 8 }}>
                                    <span style={{ fontSize: 13, color: "rgba(168,184,216,0.55)" }}>{label}</span>
                                    <span style={{ fontSize: 14, fontWeight: bold ? 800 : 600, color, fontFamily: "var(--font)" }}>{value}</span>
                                  </div>
                                ))}

                                <div style={{ fontSize: 13, color: "rgba(168,184,216,0.50)", marginTop: 2, lineHeight: 1.6 }}>
                                  The project's capital structure is broken before production begins. No production budget can bridge this gap — the hero fee alone consumes the actor's recoverable ceiling.
                                </div>
                              </div>

                              {/* Three actionable options */}
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <div style={{ fontSize: 12, color: "rgba(168,184,216,0.40)", textTransform: "uppercase" as const, letterSpacing: "1px" }}>
                                  To make this structure viable
                                </div>
                                {[
                                  {
                                    n: "1",
                                    title: "Reduce hero remuneration",
                                    detail: `Hero fee must drop below ₹${Math.max(Math.round(d.recoverableShare - d.marketFloor - d.marketFloor * (input.distribution === "Global" ? 0.28 : input.distribution === "Pan India" ? 0.22 : 0.18)), 0)}Cr to create a viable production window.`,
                                    color: "#22e5a5",
                                  },
                                  {
                                    n: "2",
                                    title: "Increase OTT / satellite pre-sales",
                                    detail: "Booking additional recovery streams before release directly reduces the capital that theatres must cover, narrowing the gap.",
                                    color: "#7B9FFF",
                                  },
                                  {
                                    n: "3",
                                    title: "Reduce production scale",
                                    detail: `Lower the production budget to reduce total capital deployed. The current structure requires a minimum of ₹${d.marketFloor}Cr — revisit whether that scale is necessary.`,
                                    color: "#FFB800",
                                  },
                                ].map(({ n, title, detail, color }) => (
                                  <div key={n} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#000", flexShrink: 0, marginTop: 1 }}>{n}</div>
                                    <div>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(240,244,255,0.85)", marginBottom: 4 }}>{title}</div>
                                      <div style={{ fontSize: 12, color: "rgba(168,184,216,0.50)", lineHeight: 1.6 }}>{detail}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        // ── NORMAL OPTIMIZER UI ────────────────────────────────────────────
                        const confColor =
                          optimizer.confidence === "High"     ? "#22C55E" :
                          optimizer.confidence === "Moderate" ? "#FFB800" : "#FF4D4D";

                        // Chart dimensions
                        const W = 560, H = 140, PAD = { t: 12, r: 16, b: 28, l: 48 };
                        const chartW = W - PAD.l - PAD.r;
                        const chartH = H - PAD.t - PAD.b;

                        const profits = optimizer.curve.map(p => p.expectedProfit);
                        const minP = Math.min(...profits);
                        const maxP = Math.max(...profits);
                        const pRange = maxP - minP || 1;
                        const budgets = optimizer.curve.map(p => p.budget);
                        const minB = Math.min(...budgets);
                        const maxB = Math.max(...budgets);
                        const bRange = maxB - minB || 1;

                        const toX = (b: number) => PAD.l + ((b - minB) / bRange) * chartW;
                        const toY = (p: number) => PAD.t + chartH - ((p - minP) / pRange) * chartH;

                        const pts = optimizer.curve.map(p => `${toX(p.budget).toFixed(1)},${toY(p.expectedProfit).toFixed(1)}`);
                        const linePath = "M " + pts.join(" L ");
                        const firstX = toX(optimizer.curve[0].budget).toFixed(1);
                        const lastX  = toX(optimizer.curve[optimizer.curve.length - 1].budget).toFixed(1);
                        const baseline = (PAD.t + chartH).toFixed(1);
                        const areaPath = `M ${firstX},${baseline} L ${linePath.slice(2)} L ${lastX},${baseline} Z`;
                        const zeroY = toY(0);
                        const showZero = minP < 0 && maxP > 0;
                        const ssbX = toX(Math.min(optimizer.stressSafeBudget, maxB));

                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp 0.5s ease both" }}>

                            {/* Re-run button top-right */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#7B9FFF", textTransform: "uppercase" as const, letterSpacing: "1.5px" }}>
                                ✓ Analysis Complete
                              </div>
                              <button
                                onClick={() => { setOptimizerPhase("idle"); setOptimizer(null); setOptimizerProgress(0); }}
                                style={{
                                  padding: "5px 12px", borderRadius: 7,
                                  border: "1px solid rgba(77,106,255,0.25)",
                                  background: "transparent", color: "rgba(168,184,216,0.50)",
                                  fontSize: 12, cursor: "pointer",
                                }}
                              >
                                ↺ Re-run
                              </button>
                            </div>

                            {/* Market floor context strip */}
                            <div style={{
                              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                              gap: 0,
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.07)",
                              borderRadius: 10, overflow: "hidden",
                            }}>
                              {[
                                { label: "Star Market Floor", value: `₹${optimizer.marketFloorProduction}Cr`, sub: `Min production (hero × 2.5)`, color: "#FFB800", borderR: true },
                                { label: "Capital-Efficient Budget", value: `₹${optimizer.optimalBudget}Cr`, sub: optimizer.optimalBudget <= optimizer.stressSafeBudget ? "Within safe zone ✓" : "Above stress-safe", color: "#7B9FFF", borderR: true },
                                { label: "Star Capital Limit", value: `₹${optimizer.maxViableBudget}Cr`, sub: "Career-best ceiling", color: "#FF6B6B", borderR: false },
                              ].map(({ label, value, sub, color, borderR }) => (
                                <div key={label} style={{
                                  padding: "12px 16px",
                                  borderRight: borderR ? "1px solid rgba(255,255,255,0.07)" : "none",
                                  textAlign: "center" as const,
                                }}>
                                  <div style={{ fontSize: 11, color: "rgba(168,184,216,0.45)", textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 5 }}>{label}</div>
                                  <div style={{ fontFamily: "var(--font)", fontSize: 22, fontWeight: 800, color }}>{value}</div>
                                  <div style={{ fontSize: 11, color: "rgba(168,184,216,0.38)", marginTop: 4 }}>{sub}</div>
                                </div>
                              ))}
                            </div>
                            {/* Range arrow visual */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 4px" }}>
                              <div style={{ fontSize: 11, color: "#FFB800", fontWeight: 700 }}>₹{optimizer.marketFloorProduction}Cr</div>
                              <div style={{ flex: 1, height: 3, borderRadius: 2, background: "linear-gradient(90deg, #FFB800 0%, #7B9FFF 50%, #FF6B6B 100%)", position: "relative" as const }}>
                                {/* Marker for optimal */}
                                {(() => {
                                  const range = optimizer.maxViableBudget - optimizer.marketFloorProduction;
                                  const pct = range > 0 ? ((optimizer.optimalBudget - optimizer.marketFloorProduction) / range) * 100 : 50;
                                  return (
                                    <div style={{
                                      position: "absolute" as const, top: -4,
                                      left: `${Math.min(Math.max(pct, 2), 98)}%`,
                                      transform: "translateX(-50%)",
                                      width: 10, height: 10, borderRadius: "50%",
                                      background: "#7B9FFF",
                                      border: "2px solid #fff",
                                      boxShadow: "0 0 8px rgba(123,159,255,0.8)",
                                    }} />
                                  );
                                })()}
                              </div>
                              <div style={{ fontSize: 11, color: "#FF6B6B", fontWeight: 700 }}>₹{optimizer.maxViableBudget}Cr</div>
                            </div>

                            {/* Key numbers */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                              {[
                                { label: "Expected Profit", value: optimizer.optimalProfit > 0 ? `+₹${Math.round(optimizer.optimalProfit)}Cr` : `−₹${Math.abs(Math.round(optimizer.optimalProfit))}Cr`, color: optimizer.optimalProfit > 0 ? "#22C55E" : "#FF4D4D", sub: `${optimizer.optimalROI.toFixed(2)}× gross ROI` },
                                { label: "Downside Risk", value: `${optimizer.optimalRisk.toFixed(1)}%`, color: optimizer.optimalRisk <= 30 ? "#22C55E" : optimizer.optimalRisk <= 50 ? "#FFB800" : "#FF4D4D", sub: "at optimal budget" },
                                { label: "Confidence", value: optimizer.confidence, color: confColor, sub: `SSB ₹${optimizer.stressSafeBudget}Cr` },
                              ].map(({ label, value, color, sub }) => (
                                <div key={label} style={{
                                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                                  borderRadius: 8, padding: "12px 14px",
                                }}>
                                  <div style={{ fontSize: 11, color: "rgba(168,184,216,0.50)", textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 5 }}>{label}</div>
                                  <div style={{ fontFamily: "var(--font)", fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                                  <div style={{ fontSize: 12, color: "rgba(168,184,216,0.40)", marginTop: 5 }}>{sub}</div>
                                </div>
                              ))}
                            </div>

                            {/* Structural warning when all budgets are loss-making */}
                            {optimizer.optimalProfit < 0 && (
                              <div style={{
                                background: "rgba(255,77,77,0.07)",
                                border: "1px solid rgba(255,77,77,0.22)",
                                borderRadius: 10, padding: "14px 16px",
                                display: "flex", flexDirection: "column", gap: 6,
                              }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#FF6B6B", textTransform: "uppercase" as const, letterSpacing: "1px" }}>
                                  ⚠ Structural Capital Warning
                                </div>
                                <div style={{ fontSize: 13, color: "rgba(168,184,216,0.65)", lineHeight: 1.7 }}>
                                  No profitable budget found in the modeled range. The optimizer found the <strong style={{ color: "rgba(240,244,255,0.80)" }}>least-loss point</strong> at ₹{optimizer.optimalBudget}Cr — not a profitable recommendation.<br/>
                                  <strong style={{ color: "#FFB800" }}>What this means:</strong> The actor's break-even gross threshold is ₹{result.breakEvenGross}Cr — the expected theatrical share at this cost structure cannot reliably reach it.<br/>
                                  <strong style={{ color: "#22e5a5" }}>Producer options:</strong> Reduce hero remuneration · Increase pre-release rights sales (OTT/Satellite) · Lower production budget below Star Market Floor · Or model a different actor with a higher gross ceiling.
                                </div>
                              </div>
                            )}

                            {/* Profit curve chart */}
                            <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "12px 4px 4px", overflow: "hidden" }}>
                              <div style={{ fontSize: 12, color: "rgba(168,184,216,0.45)", textTransform: "uppercase" as const, letterSpacing: "1px", marginLeft: 12, marginBottom: 6 }}>
                                Profit Curve · Risk-Adjusted Peak Highlighted
                              </div>
                              <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
                                <defs>
                                  <linearGradient id="optGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#4D6AFF" stopOpacity="0.35"/>
                                    <stop offset="100%" stopColor="#4D6AFF" stopOpacity="0.03"/>
                                  </linearGradient>
                                </defs>
                                {[0, 0.25, 0.5, 0.75, 1].map(t => {
                                  const y = PAD.t + chartH * t;
                                  const val = maxP - t * pRange;
                                  return (
                                    <g key={t}>
                                      <line x1={PAD.l} y1={y} x2={PAD.l + chartW} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                                      <text x={PAD.l - 4} y={y + 3} textAnchor="end" fontSize="9" fill="rgba(168,184,216,0.35)">
                                        {Math.round(val) >= 0 ? `+${Math.round(val)}` : `${Math.round(val)}`}
                                      </text>
                                    </g>
                                  );
                                })}
                                {showZero && <line x1={PAD.l} y1={zeroY} x2={PAD.l + chartW} y2={zeroY} stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4 3"/>}
                                {optimizer.stressSafeBudget >= minB && optimizer.stressSafeBudget <= maxB && (
                                  <g>
                                    <line x1={ssbX} y1={PAD.t} x2={ssbX} y2={PAD.t + chartH} stroke="#22e5a5" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"/>
                                    <text x={ssbX + 3} y={PAD.t + 10} fontSize="9" fill="#22e5a5" opacity="0.7">SSB</text>
                                  </g>
                                )}
                                {optimizer.stressSafeBudget >= minB && (
                                  <rect x={PAD.l} y={PAD.t} width={Math.min(ssbX - PAD.l, chartW)} height={chartH} fill="rgba(34,229,165,0.03)"/>
                                )}
                                <path d={areaPath} fill="url(#optGrad)" opacity="0.8"/>
                                <path d={linePath} fill="none" stroke="#4D6AFF" strokeWidth="2" strokeLinejoin="round"/>
                                {[0, 0.25, 0.5, 0.75, 1].map(t => {
                                  const b = minB + t * bRange;
                                  return (
                                    <text key={t} x={toX(b)} y={PAD.t + chartH + 16} textAnchor="middle" fontSize="9" fill="rgba(168,184,216,0.35)">
                                      ₹{Math.round(b)}Cr
                                    </text>
                                  );
                                })}
                                {optimizer.curve.filter(p => p.isOptimal).map((p, i) => {
                                  const ox = toX(p.budget);
                                  const oy = toY(p.expectedProfit);
                                  return (
                                    <g key={i}>
                                      <line x1={ox} y1={PAD.t} x2={ox} y2={PAD.t + chartH} stroke="#FFB800" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7"/>
                                      <circle cx={ox} cy={oy} r="6" fill="#FFB800" opacity="0.9"/>
                                      <circle cx={ox} cy={oy} r="10" fill="none" stroke="#FFB800" strokeWidth="1.5" opacity="0.4"/>
                                      <text x={ox + 9} y={oy - 6} fontSize="10" fill="#FFB800" fontWeight="bold">₹{p.budget}Cr</text>
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>

                            {/* Recommendation */}
                            <div style={{
                              background: "rgba(77,106,255,0.06)",
                              border: "1px solid rgba(77,106,255,0.20)",
                              borderRadius: 10, padding: "14px 18px",
                              display: "flex", flexDirection: "column", gap: 6,
                            }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#7B9FFF", textTransform: "uppercase" as const, letterSpacing: "1px" }}>
                                ⚡ Optimizer Recommendation
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(240,244,255,0.90)", lineHeight: 1.6 }}>
                                {optimizer.recommendation}
                              </div>
                              <div style={{ fontSize: 13, color: "rgba(168,184,216,0.55)", lineHeight: 1.6 }}>
                                {optimizer.recommendationSub}
                              </div>
                              {optimizer.profitPeakBudget !== optimizer.riskAdjPeakBudget && (
                                <div style={{ fontSize: 12, color: "rgba(168,184,216,0.40)", marginTop: 2 }}>
                                  Raw profit peak: ₹{optimizer.profitPeakBudget}Cr (+₹{Math.round(optimizer.profitPeakProfit)}Cr) — higher return but carries more risk · Capital-Efficient Budget is the risk-adjusted recommendation.
                                </div>
                              )}
                            </div>

                            {/* Apply button */}
                            <button
                              onClick={() => set("productionBudget", optimizer.optimalBudget)}
                              style={{
                                alignSelf: "flex-start",
                                padding: "10px 20px", borderRadius: 9,
                                border: "1px solid rgba(77,106,255,0.45)",
                                background: "rgba(77,106,255,0.12)",
                                color: "#7B9FFF", fontFamily: "var(--font)",
                                fontSize: 14, fontWeight: 700, cursor: "pointer",
                                letterSpacing: "0.5px",
                              }}
                            >
                              Apply ₹{optimizer.optimalBudget}Cr Capital-Efficient Budget → Set as Budget
                            </button>
                          </div>
                        );
                      })()}

                      {/* Empty state hint */}
                      {optimizerPhase === "idle" && (
                        <div style={{
                          textAlign: "center" as const, padding: "4px 0 2px",
                          fontSize: 14, color: "rgba(168,184,216,0.30)",
                          position: "relative", zIndex: 1,
                        }}>
                          Click <strong style={{ color: "#7B9FFF" }}>Find Optimal Budget</strong> to calculate the Capital-Efficient Budget for the current actor, genre and distribution.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── 5. SCORE BREAKDOWN ── */}
                <div style={{
                  background: "#10152C",
                  border: "1px solid rgba(180,150,255,0.09)",
                  borderRadius: 12,
                  padding: "20px 24px",
                }}>
                  <div style={{
                    fontSize: 13,
                    color: "rgba(168,184,216,0.50)",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    marginBottom: 16,
                  }}>
                    CVI Score Breakdown
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <ComponentBar
                      label="Star Capital  (Scale × 0.4  + Stability × 0.3  + CHI × 0.3)"
                      score={result.starCapital}
                      weight={0.35}
                      color="linear-gradient(90deg,#3B8EFF,#6BB5FF)"
                    />
                    <ComponentBar
                      label="Budget Efficiency  (ExpectedGross ÷ TotalBudget, normalized)"
                      score={result.budgetEfficiency}
                      weight={0.30}
                      color="linear-gradient(90deg,#00C896,#6BE3B8)"
                    />
                    <ComponentBar
                      label={`Distribution Strength  (${input.distribution})`}
                      score={result.distributionStrength}
                      weight={0.20}
                      color="linear-gradient(90deg,#2D3B8E,#6A7FFF)"
                    />
                    <ComponentBar
                      label={`Genre Demand  (${input.genre})`}
                      score={result.genreDemand}
                      weight={0.15}
                      color="linear-gradient(90deg,#7A5CFF,#B49CFF)"
                    />
                  </div>

                  {/* Star Capital sub-breakdown */}
                  <div style={{
                    marginTop: 16, paddingTop: 14,
                    borderTop: "1px solid rgba(180,150,255,0.06)",
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
                  }}>
                    {[
                      { l: "Scale Index", v: result.scaleIndex, w: "0.4" },
                      { l: "Stability", v: result.stabilityIndex, w: "0.3" },
                      { l: "CHI Score", v: result.chiScore, w: "0.3" },
                    ].map(({ l, v, w }) => (
                      <div key={l} style={{
                        background: "rgba(59,142,255,0.05)",
                        border: "1px solid rgba(59,142,255,0.15)",
                        borderRadius: 6, padding: "8px 10px",
                        display: "flex", flexDirection: "column", gap: 2,
                      }}>
                        <span style={{ fontSize: 13, color: "rgba(168,184,216,0.50)", textTransform: "uppercase", letterSpacing: "1px" }}>{l}</span>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontFamily: "var(--font)", fontSize: 18, fontWeight: 700, color: "#3B8EFF" }}>{v.toFixed(1)}</span>
                          <span style={{ fontSize: 13, color: "rgba(59,142,255,0.55)" }}>×{w}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  background: "rgba(180,150,255,0.01)",
                  border: "1px solid rgba(180,150,255,0.06)",
                  borderRadius: 8,
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}>
                  <div style={{ fontSize: 13, color: "rgba(168,184,216,0.55)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 2 }}>
                    Formula Trace
                  </div>
                  <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "rgba(168,184,216,0.50)", lineHeight: 1.7 }}>
                    Capital Viability Index = StarCapital×0.35 + BudgetEfficiency×0.30 + DistributionStrength×0.20 + GenreDemand×0.15
                  </div>
                  <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "rgba(168,184,216,0.55)", lineHeight: 1.7 }}>
                    StarCapital({result.starCapital.toFixed(1)}) = Scale({result.scaleIndex.toFixed(1)})×0.4 + Stability({result.stabilityIndex.toFixed(1)})×0.3 + CHI({result.chiScore.toFixed(1)})×0.3
                  </div>
                  <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "rgba(168,184,216,0.55)", lineHeight: 1.7 }}>
                    ExpectedGross({cr(result.expectedGross)}) = BaseGross({cr(result.baseExpectedGross)}) × ScenarioMultiplier({result.scenarioMultiplier.toFixed(2)}×)  |  AdjMultiplier: {isFinite(result.adjustedMultiplier) ? result.adjustedMultiplier.toFixed(2) : "—"}× (base {result.theatricalMultiplier}× + stability×0.015, cap 4.5)
                  </div>
                  <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "rgba(168,184,216,0.55)", lineHeight: 1.7 }}>
                    BudgetEfficiency({result.budgetEfficiency.toFixed(1)}) = AdjGross/Capital×60 + (1−ExposureRatio)×25 + Stability×15
                  </div>
                </div>

                {/* ── STAR-SWAP SIMULATION ── */}
                {swapResult && swapResult.rows.length > 0 && (
                  <div style={{
                    background: "#10152C",
                    border: "1px solid rgba(180,150,255,0.09)",
                    borderRadius: 12,
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                      <div>
                        <div style={{
                          fontSize: 13,
                          color: "rgba(168,184,216,0.50)",
                          textTransform: "uppercase",
                          letterSpacing: "2px",
                          marginBottom: 4,
                        }}>
                          Star-Swap Simulation
                        </div>
                        <div style={{
                          fontFamily: "var(--font)",
                          fontSize: 13,
                          color: "rgba(168,184,216,0.65)",
                          fontStyle: "italic",
                        }}>
                          Same budget · same genre · same distribution
                        </div>
                      </div>
                      <div style={{
                        fontFamily: "var(--font)",
                        fontSize: 13,
                        color: "rgba(168,184,216,0.55)",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                      }}>
                        ₹{swapResult.productionBudget}Cr budget
                      </div>
                    </div>

                    {/* Table header */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 24px 1fr 1fr 1fr",
                      gap: 8,
                      paddingBottom: 8,
                      borderBottom: "1px solid rgba(180,150,255,0.06)",
                    }}>
                      {["Actor", "", "Expected Gross", "Gross ROI", "Danger Status"].map((h) => (
                        <div key={h} style={{
                          fontSize: 13,
                          color: "rgba(168,184,216,0.55)",
                          textTransform: "uppercase",
                          letterSpacing: "1.5px",
                          fontFamily: "var(--font)",
                        }}>
                          {h}
                        </div>
                      ))}
                    </div>

                    {/* Table rows */}
                    {swapResult.rows.map((row) => (
                      <div
                        key={row.actorName}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 24px 1fr 1fr 1fr",
                          gap: 8,
                          alignItems: "center",
                          padding: "10px 10px",
                          borderRadius: 8,
                          background: row.isCurrent
                            ? "rgba(59,142,255,0.06)"
                            : "rgba(180,150,255,0.04)",
                          border: row.isCurrent
                            ? "1px solid rgba(59,142,255,0.15)"
                            : "1px solid rgba(180,150,255,0.04)",
                        }}
                      >
                        {/* Actor name + tier */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{
                            fontFamily: "var(--font)",
                            fontSize: 14,
                            fontWeight: 700,
                            color: row.isCurrent ? "#3B8EFF" : "#E2E8F0",
                          }}>
                            {row.actorName}
                          </span>
                          <span style={{
                            fontFamily: "var(--font)",
                            fontSize: 13,
                            color: "rgba(168,184,216,0.50)",
                          }}>
                            T{row.tier} · ₹{row.openingCr}Cr opening
                          </span>
                        </div>

                        {/* Current indicator */}
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          {row.isCurrent && (
                            <div style={{
                              width: 6, height: 6,
                              borderRadius: "50%",
                              background: "#3B8EFF",
                            }} />
                          )}
                        </div>

                        {/* Expected Gross */}
                        <div style={{
                          fontFamily: "var(--font)",
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#F0F4FF",
                        }}>
                          {cr(row.expectedGross)}
                        </div>

                        {/* Gross ROI */}
                        <div style={{
                          fontFamily: "var(--font)",
                          fontSize: 15,
                          fontWeight: 700,
                          color: row.grossROI >= 3.0 ? "#22C55E" : row.grossROI >= 1.5 ? "#fbbf24" : "#FF4D4D",
                        }}>
                          {row.grossROI.toFixed(2)}×
                          <span style={{
                            fontFamily: "var(--font)",
                            fontSize: 13,
                            color: "rgba(168,184,216,0.55)",
                            marginLeft: 3,
                          }}>
                            gross
                          </span>
                        </div>

                        {/* Danger Status */}
                        <div style={{
                          fontFamily: "var(--font)",
                          fontSize: 13,
                          color: row.dangerColor,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}>
                          <div style={{
                            width: 6, height: 6,
                            borderRadius: "50%",
                            background: row.dangerColor,
                            flexShrink: 0,
                          }} />
                          {row.dangerZone}
                        </div>
                      </div>
                    ))}

                    <div style={{
                      fontSize: 13,
                      color: "rgba(10,31,68,0.30)",
                      fontFamily: "var(--font)",
                      paddingTop: 4,
                      borderTop: "1px solid rgba(180,150,255,0.04)",
                    }}>
                      Best scaleIndex representative per tier · Gross ROI = expectedGross ÷ productionBudget
                    </div>
                  </div>
                )}

                {/* ── FILMLAB INSIGHT ASSISTANT ── */}
                {(() => {
                  const INSIGHTS: Record<string, { title: string; body: string; formula?: string }> = {
                    loss_prob: {
                      title: "Why is Capital Loss Probability high?",
                      body: `Capital Loss Probability is the estimated chance that box office producer share won't fully recover the capital deployed (production + P&A).

It is driven by three things: (1) how hard the actor must work to hit break-even — called recovery strain — (2) the actor's historical downside volatility (dvolPct), and (3) a stability floor from their Scale and Stability scores.

A high probability means the break-even gross is close to or above the actor's typical output at this budget level. It does NOT mean the film will fail — it means the margin of safety is thin.

The practical read: if Loss Prob is above 45%, your budget is in the stress zone. Below 25%, you have meaningful headroom.`,
                      formula: "breakEvenProb = exp(−strain × dvol × 1.2) × 0.6 + stabilityFloor × 0.4",
                    },
                    stress_safe: {
                      title: "Why is Stress-Safe Budget lower than Star Capital Limit?",
                      body: `Star Capital Limit answers: "At what budget does the actor's career-best gross JUST cover capital?" It is a theoretical ceiling — it assumes a perfect run.

Stress-Safe Budget answers: "At what budget does the actor still cover capital even if they underperform by their historical volatility margin?"

The gap between the two is the volatility penalty. An actor with zero downside history has no gap — both numbers are identical. An actor with high volatility has a large gap because history shows meaningful underperformance risk.

Rule of thumb: your budget should ideally sit at or below Stress-Safe Budget. Between Stress-Safe and Star Capital Limit is the amber zone — viable only if the actor delivers above their typical output.`,
                      formula: "stressSafe = (maxGross × distShare) / ((1 + pnaRate) × volatilityBuffer)",
                    },
                    max_viable: {
                      title: "How is Star Capital Limit calculated?",
                      body: `Star Capital Limit is the highest production budget where the actor's career-best gross can theoretically return capital to the producer.

The calculation works backwards from the actor's maximum recorded gross: multiply by 40% (the standard distributor share), divide by (1 + P&A rate) to account for print and advertising costs.

This gives you the budget where a career-best performance breaks even. It is not a safe budget — it is the absolute ceiling. Above this number, no performance level can recover capital regardless of the film's quality.

Think of it as the structural limit of the actor's commercial ceiling at current market conditions.`,
                      formula: "starCapitalLimit = (actor.maxGross × 0.40) / (1 + pnaRate)",
                    },
                    capital_exposure: {
                      title: "What does Capital Exposure: Exposed mean?",
                      body: `Capital Exposure classifies how adequately the expected gross covers the break-even requirement.

It is computed as a coverage ratio: expected gross divided by the break-even gross (the gross needed to fully recover capital).

The four bands are:
• Safe (coverage ≥ 3.0×) — projected gross is well above the recovery gate
• Watch (coverage 1.8–3.0×) — adequate coverage with some buffer
• Exposed (coverage 1.0–1.8×) — projected gross covers capital but with limited margin
• Critical (coverage < 1.0×) — projected gross does not reach the recovery gate

"Exposed" means the model expects recovery, but any underperformance closes the gap quickly. It is a yellow flag, not a red one — it signals that execution risk is high.`,
                      formula: "coverage = expectedGross / breakEvenGross",
                    },
                    expected_deficit: {
                      title: "How should I interpret Expected Capital Deficit?",
                      body: `Expected Capital Deficit is the probability-weighted loss estimate across modeled scenarios. It answers: "In the bad outcome, how much capital is at risk of not being recovered?"

It is NOT a prediction that you will lose this amount. It is the expected value of the shortfall — the loss probability multiplied by the estimated deficit in a stress scenario (where the actor underperforms by their volatility margin).

For a producer: this is the number to size your downside reserve against. If Expected Capital Deficit is ₹9Cr on a ₹42Cr investment, you are looking at a ~21% worst-case erosion if the bad outcome materialises.

A deficit of zero means the stress scenario still recovers capital — the film has a built-in safety buffer at this budget.`,
                      formula: "deficit = lossProbability × max(totalCapital − stressShare, 0)",
                    },
                    cvi: {
                      title: "What is the Capital Viability Index (CVI)?",
                      body: `CVI is the composite score that summarises the film's overall capital viability on a 0–100 scale.

It is a weighted combination of four factors:
• Star Capital (35%) — the actor's scale, stability, and capital health index
• Budget Efficiency (30%) — how well the budget is sized relative to the actor's earning power
• Distribution Strength (20%) — the reach and penetration of your distribution strategy
• Genre Demand (15%) — genre-level market demand relative to current trends

Higher CVI does not guarantee profit. It measures how well all the structural inputs align. A film can score 80 CVI and still carry loss risk if the actor's volatility is high — which is why Loss Probability and Capital Exposure are shown separately.

Interpretation: Above 75 = Strong capital alignment. 55–74 = Viable with risk. Below 55 = Structurally challenged.`,
                      formula: "CVI = StarCapital×0.35 + BudgetEfficiency×0.30 + Distribution×0.20 + Genre×0.15",
                    },
                    star_budget_ceiling: {
                      title: "What is Star Budget Ceiling?",
                      body: `Star Budget Ceiling is the maximum production budget at which this actor has historically delivered a profitable return — drawn directly from their film history, not a formula.

For example, if an actor's highest budget profitable film was ₹32Cr, their Star Budget Ceiling is ₹32Cr. Budgets above this have either not been attempted or resulted in capital loss in the historical record.

It is the most conservative of the three budget limits — grounded in what actually happened, not what theoretically could happen.

Above the Star Budget Ceiling, you are entering territory the actor has no profitable precedent for. That doesn't make it impossible, but it removes the historical safety net.`,
                    },
                    producer_use: {
                      title: "How should producers use these numbers?",
                      body: `FilmLab is a capital risk tool, not a box office forecasting tool. The distinction matters.

Start with the budget stack: compare your project budget against Star Capital Limit, Stress-Safe Budget, and Theatrical Break-Even. Where your budget sits in that hierarchy tells you the risk tier immediately.

Then read the probability numbers: Capital Loss Probability tells you the historical likelihood of not recovering capital. Expected Capital Deficit tells you the expected quantum of that shortfall.

Finally, read Capital Exposure: it tells you how much gross headroom you have above the recovery gate.

The key rule: if your budget is above Star Capital Limit, no combination of strategy or execution recovers capital — that is a structural problem. If it is between Stress-Safe and Star Capital Limit, you need above-average performance. If it is below Stress-Safe, you are structurally protected against typical downside scenarios.`,
                    },
                  };

                  const QUESTIONS: { key: string; label: string; category: string }[] = [
                    { key: "loss_prob",          label: "Why is loss probability high?",                    category: "probability" },
                    { key: "stress_safe",         label: "Why is Stress-Safe Budget lower than Star Capital Limit?", category: "budget"      },
                    { key: "max_viable",          label: "How is Star Capital Limit calculated?",                   category: "budget"      },
                    { key: "capital_exposure",    label: "What does Capital Exposure: Exposed mean?",        category: "risk"        },
                    { key: "expected_deficit",    label: "How should I read Expected Capital Deficit?",      category: "risk"        },
                    { key: "cvi",                 label: "What is the CVI score?",                           category: "strategy"    },
                    { key: "star_budget_ceiling", label: "What is Star Budget Ceiling?",                     category: "budget"      },
                    { key: "producer_use",        label: "How should producers use these numbers?",          category: "strategy"    },
                  ];

                  const active = insightQuestion ? INSIGHTS[insightQuestion] : null;

                  return (
                    <div style={{
                      background: "rgba(59,142,255,0.03)",
                      border: "1px solid rgba(59,142,255,0.14)",
                      borderRadius: 14,
                      overflow: "hidden",
                      boxShadow: "0 0 0 1px rgba(0,150,255,0.08), 0 0 28px rgba(0,150,255,0.08), 0 0 60px rgba(0,150,255,0.04)",
                    }}>

                      {/* Gradient accent bar */}
                      <div style={{
                        height: 2,
                        background: "linear-gradient(90deg, #00e0ff, #00ffa6, #ffd84d, #ff9f43)",
                        opacity: 0.55,
                      }} />

                      {/* Header */}
                      <button
                        onClick={() => { setInsightOpen(o => !o); setInsightQuestion(null); }}
                        style={{
                          width: "100%", background: "none", border: "none", cursor: "pointer",
                          padding: "16px 20px",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          borderBottom: insightOpen ? "1px solid rgba(59,142,255,0.10)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(59,142,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                            💡
                          </div>
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(240,244,255,0.90)", letterSpacing: "0.01em" }}>
                              FilmLab Insight Assistant
                            </div>
                            <div style={{ fontSize: 12, color: "rgba(168,184,216,0.50)", marginTop: 2 }}>
                              Interpret the model — instant answers
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: "rgba(59,142,255,0.55)", letterSpacing: "0.05em" }}>
                          {insightOpen ? "▲ Close" : "▼ Ask a question"}
                        </span>
                      </button>

                      {insightOpen && (
                        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

                          {/* Color-coded question chips */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {QUESTIONS.map(({ key, label, category }) => {
                              const CAT_STYLE: Record<string, { bg: string; border: string; color: string; activeBg: string; activeBorder: string }> = {
                                budget:      { bg: "rgba(0,200,255,0.07)",   border: "rgba(0,200,255,0.18)",   color: "#55e0ff",  activeBg: "rgba(0,200,255,0.18)",   activeBorder: "rgba(0,200,255,0.50)"  },
                                risk:        { bg: "rgba(255,140,0,0.07)",   border: "rgba(255,140,0,0.18)",   color: "#ff9a3c",  activeBg: "rgba(255,140,0,0.18)",   activeBorder: "rgba(255,140,0,0.50)"  },
                                probability: { bg: "rgba(255,210,60,0.07)",  border: "rgba(255,210,60,0.18)",  color: "#ffd84d",  activeBg: "rgba(255,210,60,0.18)",  activeBorder: "rgba(255,210,60,0.50)" },
                                strategy:    { bg: "rgba(34,229,165,0.07)",  border: "rgba(34,229,165,0.18)",  color: "#22e5a5",  activeBg: "rgba(34,229,165,0.18)",  activeBorder: "rgba(34,229,165,0.50)" },
                              };
                              const s = CAT_STYLE[category] ?? CAT_STYLE.strategy;
                              const isActive = insightQuestion === key;
                              return (
                                <button
                                  key={key}
                                  onClick={() => setInsightQuestion(insightQuestion === key ? null : key)}
                                  style={{
                                    background: isActive ? s.activeBg : s.bg,
                                    border: `1px solid ${isActive ? s.activeBorder : s.border}`,
                                    borderRadius: 20,
                                    padding: "7px 14px",
                                    fontSize: 13,
                                    color: s.color,
                                    cursor: "pointer",
                                    letterSpacing: "0.01em",
                                    transition: "all 0.15s",
                                    fontFamily: "inherit",
                                    fontWeight: isActive ? 700 : 500,
                                    opacity: isActive ? 1 : 0.85,
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Answer panel */}
                          {active && (
                            <div style={{
                              background: "rgba(0,8,24,0.65)",
                              border: "1px solid rgba(59,142,255,0.15)",
                              borderRadius: 10,
                              padding: "20px 22px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 14,
                            }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: "#3B8EFF", letterSpacing: "0.01em", lineHeight: 1.3 }}>
                                {active.title}
                              </div>
                              <div style={{ fontSize: 14.5, color: "rgba(210,220,245,0.85)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                                {active.body}
                              </div>
                              {active.formula && (
                                <div style={{
                                  background: "rgba(59,142,255,0.06)",
                                  border: "1px solid rgba(59,142,255,0.14)",
                                  borderRadius: 6,
                                  padding: "9px 14px",
                                  fontFamily: "monospace",
                                  fontSize: 12,
                                  color: "rgba(155,114,255,0.90)",
                                  letterSpacing: "0.03em",
                                }}>
                                  {active.formula}
                                </div>
                              )}
                            </div>
                          )}

                          {!active && (
                            <div style={{ fontSize: 13, color: "rgba(168,184,216,0.30)", textAlign: "center", paddingTop: 4 }}>
                              Select a question above to see the explanation
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── SCENARIO COMPARISON — RESERVED ── */}
                <div style={{
                  background: "rgba(255,255,255,0.015)",
                  border: "1px dashed rgba(0,102,255,0.12)",
                  borderRadius: 12,
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  minHeight: 120,
                  position: "relative",
                  overflow: "hidden",
                }}>
                  {/* Corner accents */}
                  {[
                    { top: 0, left: 0, borderTop: "2px solid rgba(0,102,255,0.25)", borderLeft: "2px solid rgba(0,102,255,0.25)" },
                    { top: 0, right: 0, borderTop: "2px solid rgba(0,102,255,0.25)", borderRight: "2px solid rgba(0,102,255,0.25)" },
                    { bottom: 0, left: 0, borderBottom: "2px solid rgba(0,102,255,0.25)", borderLeft: "2px solid rgba(0,102,255,0.25)" },
                    { bottom: 0, right: 0, borderBottom: "2px solid rgba(0,102,255,0.25)", borderRight: "2px solid rgba(0,102,255,0.25)" },
                  ].map((style, i) => (
                    <div key={i} style={{
                      position: "absolute",
                      width: 16, height: 16,
                      borderRadius: 0,
                      ...style,
                    }} />
                  ))}

                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}>
                    {/* Coming-soon icon */}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="1" width="14" height="14" rx="2"
                        stroke="url(#sc-grad)" strokeWidth="1" strokeDasharray="2 2"/>
                      <path d="M8 5v4M8 11v.5" stroke="url(#sc-grad)" strokeWidth="1.5" strokeLinecap="round"/>
                      <defs>
                        <linearGradient id="sc-grad" x1="1" y1="1" x2="15" y2="15" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#3B8EFF" stopOpacity="0.7"/>
                          <stop offset="1" stopColor="#0A3FA8" stopOpacity="0.7"/>
                        </linearGradient>
                      </defs>
                    </svg>
                    <span style={{
                      fontFamily: "var(--font)",
                      fontSize: 13,
                      fontWeight: 700,
                      background: "linear-gradient(90deg, rgba(0,102,255,0.6), rgba(0,102,255,0.6))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      letterSpacing: "0.5px",
                    }}>
                      Scenario Comparison
                    </span>
                  </div>

                  <div style={{
                    fontFamily: "var(--font)",
                    fontSize: 13,
                    color: "rgba(168,184,216,0.55)",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    textAlign: "center",
                    lineHeight: 1.8,
                  }}>
                    Compare multiple film strategies side by side
                    <br />
                    <span style={{ color: "rgba(0,102,255,0.25)" }}>· Coming soon ·</span>
                  </div>
                </div>

              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
