"use client";

import Link from "next/link";

/* ════════════════════════════════════════════════
   DISCLAIMER PAGE — StarsQ
   Minimal. Professional. One screen.
════════════════════════════════════════════════ */

export default function DisclaimerPage() {
  return (
    <div className="page-shell disclaimer-page">
      <div className="cinematic-bg" aria-hidden="true">
        <div className="cinematic-bg__image" />
        <div className="cinematic-bg__lavender" />
        <div className="cinematic-bg__grad-a" />
        <div className="cinematic-bg__grad-b" />
        <div className="cinematic-bg__grad-c" />
        <div className="cinematic-bg__grain" />
      </div>

      <div className="disclaimer-shell">
        <p className="about-eyebrow">Legal Notice</p>
        <h1 className="disclaimer-headline">Disclaimer</h1>

        <div className="disclaimer-body">

          <div className="disclaimer-block">
            <h2 className="disclaimer-block-title">Analytical Estimates Only</h2>
            <p className="disclaimer-block-text">
              StarsQ provides capital intelligence estimates based on historical box office data
              and proprietary analytical models. All outputs — tier classifications, scale indices,
              risk bands, and revenue projections — are modeled estimates, not guaranteed forecasts.
            </p>
          </div>

          <div className="disclaimer-block">
            <h2 className="disclaimer-block-title">No Financial Guarantee</h2>
            <p className="disclaimer-block-text">
              StarsQ does not guarantee box office outcomes, return on investment, or capital recovery
              for any production. Cinema involves creative, distribution, and market variables that
              no quantitative model can fully anticipate or control.
            </p>
          </div>

          <div className="disclaimer-block">
            <h2 className="disclaimer-block-title">Independent Decision-Making Required</h2>
            <p className="disclaimer-block-text">
              All production, investment, and distribution decisions must be independently evaluated
              by producers, studios, and their advisors. StarsQ intelligence should be used as one
              input among many — not as the sole basis for financial decisions.
            </p>
          </div>

          <div className="disclaimer-block">
            <h2 className="disclaimer-block-title">Data Sources</h2>
            <p className="disclaimer-block-text">
              StarsQ uses publicly available box office data cross-referenced from multiple industry
              tracking sources. While every effort is made to ensure accuracy, StarsQ does not warrant
              the completeness or precision of third-party data.
            </p>
          </div>

        </div>

        <div className="disclaimer-nav">
          <Link href="/faq" className="hero-cta-btn hero-cta-btn--ghost">Read FAQ</Link>
          <Link href="/about" className="hero-cta-btn hero-cta-btn--ghost">About StarsQ</Link>
        </div>

        <p className="disclaimer-date">
          Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long" })}
        </p>
      </div>
    </div>
  );
}
