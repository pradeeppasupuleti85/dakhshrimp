import Link from "next/link";

const BATCHES = [
  { id: "DAKH-2024-AP-001", label: "Tiger Prawns", sub: "Nellore Pond #7" },
  { id: "DAKH-2024-AP-002", label: "Chitti Royyalu", sub: "Guntur Pond #3" },
  { id: "DAKH-2024-AP-003", label: "Frozen Peeled Shrimp", sub: "Vijayawada Batch" },
];

export default function QRDemo() {
  return (
    <section id="scan" className="bg-[#02181d] py-20 px-6 relative overflow-hidden">

      {/* Glow */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-72 h-72 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-md mx-auto">
        <p className="text-yellow-400 text-[0.68rem] font-semibold uppercase tracking-[0.15em] mb-2">
          Powered by Transparency
        </p>
        <h2 className="text-3xl font-black text-white mb-2">
          Scan. Know Everything.
        </h2>
        <p className="text-white/40 text-sm leading-relaxed mb-8 font-light">
          Every DAKH pack has a unique QR. Tap a batch below to see the
          full traceability report — exactly what your customer sees.
        </p>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">

          {/* QR Visual */}
          <Link href="/trace/DAKH-2024-AP-001">
            <div className="relative w-40 h-40 mx-auto mb-4 bg-white rounded-2xl p-2.5 cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_0_50px_rgba(34,211,238,0.15)] group">
              {/* Pulse ring */}
              <div className="absolute inset-[-5px] rounded-[22px] border-2 border-cyan-400 opacity-0 group-hover:opacity-40 animate-ping" />
              <svg viewBox="0 0 37 37" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="37" height="37" fill="white" />
                {/* Finder patterns */}
                <rect x="1" y="1" width="9" height="9" fill="#02181d" />
                <rect x="2" y="2" width="7" height="7" fill="white" />
                <rect x="3" y="3" width="5" height="5" fill="#02181d" />
                <rect x="27" y="1" width="9" height="9" fill="#02181d" />
                <rect x="28" y="2" width="7" height="7" fill="white" />
                <rect x="29" y="3" width="5" height="5" fill="#02181d" />
                <rect x="1" y="27" width="9" height="9" fill="#02181d" />
                <rect x="2" y="28" width="7" height="7" fill="white" />
                <rect x="3" y="29" width="5" height="5" fill="#02181d" />
                {/* Accent cells */}
                <rect x="11" y="11" width="2" height="2" fill="#22d3ee" />
                <rect x="24" y="11" width="2" height="2" fill="#22d3ee" />
                <rect x="11" y="24" width="2" height="2" fill="#22d3ee" />
                <rect x="17" y="17" width="3" height="3" fill="#22d3ee" />
                {/* Data modules */}
                <rect x="11" y="1" width="1" height="1" fill="#02181d" /><rect x="13" y="1" width="2" height="1" fill="#02181d" />
                <rect x="17" y="1" width="1" height="1" fill="#02181d" /><rect x="19" y="1" width="3" height="1" fill="#02181d" />
                <rect x="24" y="1" width="2" height="1" fill="#02181d" />
                <rect x="11" y="3" width="2" height="1" fill="#02181d" /><rect x="15" y="3" width="1" height="1" fill="#02181d" />
                <rect x="18" y="3" width="2" height="1" fill="#02181d" /><rect x="22" y="3" width="1" height="1" fill="#02181d" />
                <rect x="11" y="5" width="1" height="1" fill="#02181d" /><rect x="14" y="5" width="3" height="1" fill="#02181d" />
                <rect x="19" y="5" width="2" height="1" fill="#02181d" /><rect x="23" y="5" width="1" height="1" fill="#02181d" />
                <rect x="12" y="7" width="3" height="1" fill="#02181d" /><rect x="17" y="7" width="1" height="1" fill="#02181d" />
                <rect x="20" y="7" width="3" height="1" fill="#02181d" />
                <rect x="1" y="11" width="2" height="1" fill="#02181d" /><rect x="5" y="11" width="1" height="1" fill="#02181d" />
                <rect x="7" y="11" width="3" height="1" fill="#02181d" /><rect x="14" y="11" width="2" height="1" fill="#02181d" />
                <rect x="18" y="11" width="3" height="1" fill="#02181d" /><rect x="22" y="11" width="2" height="1" fill="#02181d" />
                <rect x="30" y="11" width="2" height="1" fill="#02181d" /><rect x="34" y="11" width="2" height="1" fill="#02181d" />
                <rect x="2" y="13" width="1" height="1" fill="#02181d" /><rect x="5" y="13" width="2" height="1" fill="#02181d" />
                <rect x="9" y="13" width="1" height="1" fill="#02181d" /><rect x="14" y="13" width="3" height="1" fill="#02181d" />
                <rect x="20" y="13" width="1" height="1" fill="#02181d" /><rect x="29" y="13" width="1" height="1" fill="#02181d" />
                <rect x="1" y="15" width="3" height="1" fill="#02181d" /><rect x="6" y="15" width="2" height="1" fill="#02181d" />
                <rect x="12" y="15" width="2" height="1" fill="#02181d" /><rect x="19" y="15" width="3" height="1" fill="#02181d" />
                <rect x="25" y="15" width="2" height="1" fill="#02181d" /><rect x="30" y="15" width="1" height="1" fill="#02181d" />
                <rect x="4" y="17" width="2" height="1" fill="#02181d" /><rect x="8" y="17" width="1" height="1" fill="#02181d" />
                <rect x="13" y="17" width="2" height="1" fill="#02181d" /><rect x="21" y="17" width="1" height="1" fill="#02181d" />
                <rect x="29" y="17" width="2" height="1" fill="#02181d" /><rect x="34" y="17" width="2" height="1" fill="#02181d" />
                <rect x="1" y="19" width="4" height="1" fill="#02181d" /><rect x="8" y="19" width="3" height="1" fill="#02181d" />
                <rect x="13" y="19" width="1" height="1" fill="#02181d" /><rect x="28" y="19" width="3" height="1" fill="#02181d" />
              </svg>
            </div>
          </Link>

          <p className="text-center text-white/30 text-xs mb-5 flex items-center justify-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
            </svg>
            Tap QR to open live trace page
          </p>

          <p className="text-white/30 text-[0.65rem] font-semibold uppercase tracking-[0.12em] mb-3">
            Or pick a batch:
          </p>

          <div className="flex flex-col gap-2.5">
            {BATCHES.map((b) => (
              <Link
                key={b.id}
                href={`/trace/${b.id}`}
                className="flex items-center justify-between bg-white/[0.05] hover:bg-cyan-500/10 border border-white/[0.08] hover:border-cyan-500/30 rounded-xl px-4 py-3 transition group"
              >
                <div>
                  <div className="font-mono text-cyan-400 text-xs font-semibold">
                    {b.id}
                  </div>
                  <div className="text-white/40 text-xs mt-0.5 font-light">
                    {b.label} · {b.sub}
                  </div>
                </div>
                <span className="text-white/20 group-hover:text-cyan-400 transition text-sm">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
