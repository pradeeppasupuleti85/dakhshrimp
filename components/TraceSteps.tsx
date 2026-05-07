const STEPS = [
  {
    n: "01",
    title: "Harvested at Named Pond",
    desc: "GPS-verified village ponds in Andhra Pradesh. Each pond FSSAI registered with a unique ID.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.8">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    n: "02",
    title: "Lab Tested on Every Batch",
    desc: "Antibiotics, heavy metals, microbial limits — tested before we pack a single gram.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.8">
        <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/><path d="M9 13h6M9 17h4"/>
      </svg>
    ),
  },
  {
    n: "03",
    title: "Cold Chain at 0–4°C",
    desc: "Continuous temperature monitoring from harvest to packaging. Every log attached to the batch ID.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.8">
        <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>
      </svg>
    ),
  },
  {
    n: "04",
    title: "Unique QR on Every Pack",
    desc: "A QR linking to that batch's complete data sheet is printed before dispatch. No batch ships without it.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.8">
        <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/>
        <rect x="3" y="16" width="5" height="5"/>
        <path d="M21 16h-3v3M15 21v-3h3M15 12h3v3M12 15v3"/>
      </svg>
    ),
  },
  {
    n: "05",
    title: "You Scan & Verify",
    desc: "Any phone camera. Pond source, harvest date, lab result, cold chain — all in seconds.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.8">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
];

export default function TraceSteps() {
  return (
    <section id="trace" className="bg-[#020f12] py-20 px-6 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(34,211,238,0.04) 0%, transparent 70%)" }} />

      <div className="max-w-lg mx-auto relative z-10">
        <p className="text-cyan-400 text-[0.65rem] font-semibold uppercase tracking-[0.18em] mb-2">
          The DAKH Difference
        </p>
        <h2
          className="text-white font-black mb-2 tracking-tight"
          style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}
        >
          How Traceability Works
        </h2>
        <p className="text-white/30 text-sm font-light mb-10 leading-relaxed">
          "Verified through DAKH Traceability System"
        </p>

        <div className="flex flex-col divide-y divide-white/[0.05]">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-4 py-5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                {s.icon}
              </div>
              <div>
                <div className="text-white font-semibold text-sm mb-1 tracking-wide">{s.title}</div>
                <div className="text-white/35 text-xs leading-relaxed font-light">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Microcopy */}
        <div className="mt-8 pt-8 border-t border-white/[0.05] text-center">
          <p className="text-white/20 text-xs tracking-[0.1em] italic">
            "Every batch traceable. Every pack trusted."
          </p>
        </div>
      </div>
    </section>
  );
}
