"use client";

import { useState } from "react";
import Link from "next/link";

/* ════════════════════════════════════════════════
   FAQ PAGE — StarsQ Capital Intelligence
   Animated accordion. Cinematic, authoritative.
   Formula question: classified treatment.
════════════════════════════════════════════════ */

const FAQS: {
  id: string;
  q: string;
  a: React.ReactNode;
  classified?: boolean;
}[] = [
  {
    id: "what-is",
    q: "What is StarsQ?",
    a: (
      <>
        <p>StarsQ is a capital intelligence platform for the Telugu film industry. It treats actors as financial assets — quantifying opening-day pull, gross ceiling, ROI volatility, and PanIndia reach using deterministic models.</p>
        <p>It is not a popularity chart. Not a review platform. It is a structured risk framework for cinema capital decisions.</p>
      </>
    ),
  },
  {
    id: "accuracy",
    q: "How accurate is StarsQ?",
    a: (
      <>
        <p>StarsQ models structural patterns — it does not predict specific box office numbers for future films. What it does accurately is classify actors by demonstrated capital performance across their careers.</p>
        <p>A Tier 1 classification reflects verified opening-day collections. A High risk band reflects measured ROI volatility. The engine is deterministic — same data in, same output every time. No guesswork.</p>
      </>
    ),
  },
  {
    id: "data",
    q: "What data does StarsQ use?",
    a: (
      <>
        <p>StarsQ uses publicly available box office data — worldwide gross collections, production budgets, opening-day figures, and release history for Telugu cinema. All data is cross-referenced across multiple tracking sources.</p>
        <p>The engine applies governance rules: ensemble films are weighted by credit share, franchise sequels are flagged separately, and pre-2014 data is excluded per recency governance standards.</p>
      </>
    ),
  },
  {
    id: "guarantee",
    q: "Does StarsQ guarantee success?",
    a: (
      <>
        <p>No. StarsQ provides analytical estimates based on historical and structural data. It models the probability of capital recovery — not the certainty of it.</p>
        <p>Cinema involves creative, distribution, and market variables that no quantitative model can fully anticipate. StarsQ reduces uncertainty. It does not eliminate it.</p>
        <p>All production decisions must be independently evaluated by producers and stakeholders.</p>
      </>
    ),
  },
  {
    id: "numbers",
    q: "Why do some numbers differ from box office reports?",
    a: (
      <>
        <p>Box office reporting in India uses multiple accounting bases — worldwide gross, India gross, India nett (after GST deduction), and distributor share. Different trackers report different bases, sometimes inconsistently.</p>
        <p>StarsQ standardizes on worldwide gross as the primary metric throughout the registry, with explicit governance annotations where nett figures are used. This ensures ROI comparability across actors rather than mixing reporting standards.</p>
      </>
    ),
  },
  {
    id: "share-gross",
    q: "What is the difference between share and gross?",
    a: (
      <>
        <p><strong>Gross</strong> is the total box office collection — the full ticket price paid by audiences.</p>
        <p><strong>Nett</strong> is gross after GST deduction (approximately 18% on higher ticket tiers).</p>
        <p><strong>Distributor share</strong> is the portion of gross that flows back to the producer and distributor — typically around 40% of gross after exhibitor margins. This is the number that matters for capital recovery: whether the producer's share exceeds total deployed capital (budget + marketing).</p>
        <p>StarsQ's Signal layer models the full capital chain — gross → nett → share → recovery — for producer-level analysis.</p>
      </>
    ),
  },
  {
    id: "formulas",
    q: "Can I see the formulas?",
    classified: true,
    a: (
      <>
        <p>StarsQ is built on proprietary capital intelligence models. Core formulas, weighting systems, and calculation methodology are not publicly disclosed.</p>
        <p>What is available: definitions of every metric, the data inputs used, and the classification logic (e.g., Tier 1 = ₹60Cr+ opening). The signal, not the source.</p>
      </>
    ),
  },
];

function FAQItem({ item }: { item: typeof FAQS[0] }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`faq-item ${open ? "faq-item--open" : ""} ${item.classified ? "faq-item--classified" : ""}`}
      id={item.id}
    >
      <button
        className="faq-question"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="faq-q-text">{item.q}</span>
        <span className="faq-q-icons">
          {item.classified && <span className="faq-classified-badge">Classified</span>}
          <span className="faq-chevron" aria-hidden="true">{open ? "−" : "+"}</span>
        </span>
      </button>
      <div
        className="faq-answer"
        style={{
          maxHeight: open ? "600px" : "0",
          opacity: open ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 400ms ease, opacity 300ms ease",
        }}
      >
        <div className="faq-answer-inner">
          {item.classified && (
            <div className="faq-classified-note">
              <span className="faq-classified-icon">⬡</span>
              Proprietary model — methodology not disclosed
            </div>
          )}
          {item.a}
        </div>
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="page-shell faq-page">
      {/* Cinematic background */}
      <div className="cinematic-bg" aria-hidden="true">
        <div className="cinematic-bg__image" />
        <div className="cinematic-bg__lavender" />
        <div className="cinematic-bg__scan" />
        <div className="cinematic-bg__grad-a" />
        <div className="cinematic-bg__grad-b" />
        <div className="cinematic-bg__grad-c" />
        <div className="cinematic-bg__grain" />
      </div>

      <div className="faq-shell">
        {/* ── Header ── */}
        <div className="faq-hero">
          <p className="about-eyebrow">Capital Intelligence</p>
          <h1 className="faq-headline">
            Frequently Asked <span className="about-headline-accent">Questions</span>
          </h1>
          <p className="faq-hero-desc">
            Everything you need to know about how StarsQ works,
            what it measures, and what it doesn't promise.
          </p>
        </div>

        {/* ── FAQ Accordion ── */}
        <div className="faq-list" id="methodology">
          {FAQS.map(item => (
            <FAQItem key={item.id} item={item} />
          ))}
        </div>

        {/* ── Still have questions ── */}
        <div className="faq-footer-cta">
          <p className="faq-footer-label">Still have questions?</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/about" className="hero-cta-btn hero-cta-btn--ghost">
              Read the Intel Brief
            </Link>
            <a href="mailto:contact@starsq.com" className="hero-cta-btn hero-cta-btn--ghost">
              Contact →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
