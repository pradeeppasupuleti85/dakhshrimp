"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ════════════════════════════════════════════════
   ABOUT PAGE — StarsQ Capital Intelligence Brief
   Cinematic dossier style. Mystic, not corporate.
   Reuses existing cinematic-bg layer system.
════════════════════════════════════════════════ */

/* Animated counter hook */
function useCountUp(target: number, duration = 1600, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

/* Reveal on scroll */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

function RevealSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 700ms ease ${delay}ms, transform 700ms ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* Stat counter block */
function StatCounter({ value, suffix, label, start }: { value: number; suffix: string; label: string; start: boolean }) {
  const count = useCountUp(value, 1400, start);
  return (
    <div className="about-stat">
      <span className="about-stat-num">
        {count}<span className="about-stat-suffix">{suffix}</span>
      </span>
      <span className="about-stat-label">{label}</span>
    </div>
  );
}

export default function AboutPage() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="page-shell about-page">
      {/* Cinematic background — same layer system as homepage */}
      <div className="cinematic-bg" aria-hidden="true">
        <div className="cinematic-bg__image" />
        <div className="cinematic-bg__lavender" />
        <div className="cinematic-bg__scan" />
        <div className="cinematic-bg__grad-a" />
        <div className="cinematic-bg__grad-b" />
        <div className="cinematic-bg__grad-c" />
        <div className="cinematic-bg__grain" />
      </div>

      <div className="about-shell">

        {/* ── HERO ── */}
        <div className="about-hero">
          <p className="about-eyebrow">Intelligence Dossier</p>
          <h1 className="about-headline">
            What is <span className="about-headline-accent">StarsQ</span>?
          </h1>
          <p className="about-hero-desc">
            A capital intelligence system for the Telugu film industry.
            Not a fan ranking. Not a review platform. A financial framework.
          </p>
        </div>

        {/* ── STATS BAR ── */}
        <RevealSection>
          <div className="about-stats-bar" ref={statsRef}>
            <StatCounter value={21}  suffix="+"  label="Actors tracked"       start={statsVisible} />
            <StatCounter value={137} suffix="+"  label="Films analysed"       start={statsVisible} />
            <StatCounter value={3}   suffix=""   label="Capital tiers"        start={statsVisible} />
            <StatCounter value={100} suffix="%"  label="Data-driven, no bias" start={statsVisible} />
          </div>
        </RevealSection>

        {/* ── SECTIONS ── */}

        <RevealSection className="about-section" delay={0}>
          <div className="about-section-number">01</div>
          <div className="about-section-content">
            <h2 className="about-section-title">The Problem</h2>
            <p className="about-section-body">
              Most films are greenlit on hype — star power measured by Instagram followers,
              not opening-day capital pull. Box office decisions worth hundreds of crores
              are made without a structured risk framework.
            </p>
            <p className="about-section-body">
              Producers need a signal, not sentiment. StarsQ builds that signal.
            </p>
          </div>
        </RevealSection>

        <div className="about-divider" />

        <RevealSection className="about-section" delay={0}>
          <div className="about-section-number">02</div>
          <div className="about-section-content">
            <h2 className="about-section-title">What StarsQ Analyzes</h2>
            <p className="about-section-body">
              Every actor in the registry is evaluated on four capital dimensions:
            </p>
            <div className="about-pillars">
              {[
                {
                  icon: "◈",
                  title: "Scale Index",
                  desc: "Composite measure of gross ceiling, PanIndia reach, and budget tolerance. How far capital can expand.",
                },
                {
                  icon: "◎",
                  title: "Stability Index",
                  desc: "ROI consistency across the career. How predictable the return envelope is film after film.",
                },
                {
                  icon: "⬡",
                  title: "Risk Band",
                  desc: "Capital volatility classification — Controlled, Balanced, or High. Derived from ROI standard deviation.",
                },
                {
                  icon: "↑",
                  title: "Migration Signal",
                  desc: "For Tier 3 actors only — momentum toward Tier 2. Based on last 3-film ROI trajectory.",
                },
              ].map((p, i) => (
                <RevealSection key={p.title} className="about-pillar" delay={i * 80}>
                  <span className="about-pillar-icon">{p.icon}</span>
                  <h3 className="about-pillar-title">{p.title}</h3>
                  <p className="about-pillar-desc">{p.desc}</p>
                </RevealSection>
              ))}
            </div>
          </div>
        </RevealSection>

        <div className="about-divider" />

        <RevealSection className="about-section" delay={0}>
          <div className="about-section-number">03</div>
          <div className="about-section-content">
            <h2 className="about-section-title">The Tier System</h2>
            <p className="about-section-body">
              Actors are classified into three capital tiers based on opening-day performance —
              the cleanest signal of star pull, stripped of content quality noise.
            </p>
            <div className="about-tiers">
              {[
                { tier: "T1", label: "Mega-Cap", threshold: "₹60Cr+ opening", color: "#D4AF37", desc: "National anchors. Can justify ₹300Cr+ budgets." },
                { tier: "T2", label: "Mid-Cap",  threshold: "₹30–60Cr opening", color: "#4DA3FF", desc: "Scalable operators. Strong regional + partial national draw." },
                { tier: "T3", label: "Emerging", threshold: "below ₹30Cr opening", color: "#2EC4B6", desc: "Building capital. High ROI potential at contained budgets." },
              ].map((t, i) => (
                <RevealSection key={t.tier} className="about-tier-card" delay={i * 100}>
                  <span className="about-tier-badge" style={{ color: t.color, borderColor: `${t.color}40` }}>{t.tier}</span>
                  <h3 className="about-tier-label" style={{ color: t.color }}>{t.label}</h3>
                  <p className="about-tier-threshold">{t.threshold}</p>
                  <p className="about-tier-desc">{t.desc}</p>
                </RevealSection>
              ))}
            </div>
          </div>
        </RevealSection>

        <div className="about-divider" />

        <RevealSection className="about-section about-section--note" delay={0}>
          <div className="about-section-number">04</div>
          <div className="about-section-content">
            <h2 className="about-section-title">Important Note</h2>
            <p className="about-section-body">
              StarsQ models risk based on historical performance and structural patterns.
              It does not guarantee box office outcomes.
            </p>
            <p className="about-section-body">
              Capital intelligence reduces uncertainty — it does not eliminate it.
              All production decisions must be independently evaluated.
            </p>
            <Link href="/disclaimer" className="about-disclaimer-link">
              Read full disclaimer →
            </Link>
          </div>
        </RevealSection>

        {/* ── CTA ── */}
        <RevealSection delay={0}>
          <div className="about-cta-block">
            <p className="about-cta-label">Start exploring the capital field</p>
            <div className="hero-cta-row" style={{ justifyContent: "flex-start" }}>
              <Link href="/starquantum" className="hero-cta-btn hero-cta-btn--primary">
                Enter Star Quantum →
              </Link>
              <Link href="/faq" className="hero-cta-btn hero-cta-btn--ghost">
                Read FAQ
              </Link>
            </div>
          </div>
        </RevealSection>

      </div>
    </div>
  );
}
