"use client";

import { useState } from "react";

export type SharePayload =
  | { mode: "single"; name: string; scaleIndex: number; tier: number; riskBand: string }
  | { mode: "comparison"; left: string; right: string; winner: string };

export function ShareSignal({ payload }: { payload: SharePayload }) {
  const [copied, setCopied] = useState(false);

  const shareText =
    payload.mode === "single"
      ? `${payload.name} | Scale ${payload.scaleIndex} | Tier ${payload.tier} | ${payload.riskBand} Risk — StarsQ`
      : `${payload.left} vs ${payload.right} — Capital Edge: ${payload.winner} | StarsQ`;

  const pageUrl =
    typeof window !== "undefined" ? window.location.href : "https://www.starsq.com";

  const shareX = () => {
    const text = encodeURIComponent(`${shareText}\n${pageUrl}`);
    window.open(
      `https://x.com/intent/tweet?text=${text}`,
      "_blank",
      "noopener,noreferrer,width=560,height=420"
    );
  };

  const shareLinkedIn = () => {
    const url = encodeURIComponent(pageUrl);
    const summary = encodeURIComponent(shareText);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${summary}`,
      "_blank",
      "noopener,noreferrer,width=600,height=500"
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${pageUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent fail
    }
  };

  return (
    <div className="share-signal fade-in">
      <span className="share-signal-label">Export</span>
      <div className="share-signal-actions">

        {/* X */}
        <button className="share-btn" onClick={shareX} title="Share on X" aria-label="Share on X">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.629 5.905-5.629Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>

        {/* LinkedIn */}
        <button className="share-btn" onClick={shareLinkedIn} title="Share on LinkedIn" aria-label="Share on LinkedIn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </button>

        {/* Copy */}
        <button
          className={`share-btn ${copied ? "share-btn-copied" : ""}`}
          onClick={copyLink}
          title={copied ? "Copied!" : "Copy signal"}
          aria-label="Copy signal"
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
            </svg>
          )}
        </button>

      </div>
    </div>
  );
}
