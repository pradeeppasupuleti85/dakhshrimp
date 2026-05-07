const STEPS = [
  {
    n: "01",
    title: "Harvest at Named Pond",
    desc: "Shrimp harvested from GPS-verified village ponds in Andhra Pradesh. Each pond is FSSAI registered with a unique ID.",
  },
  {
    n: "02",
    title: "Lab Tested on Every Batch",
    desc: "Every batch goes to an accredited lab — antibiotics, heavy metals, microbial limits — before we pack a single gram.",
  },
  {
    n: "03",
    title: "Cold Chain at 0–4°C",
    desc: "Processed and stored at 0–4°C throughout. Temperature logs recorded and tied to every batch ID.",
  },
  {
    n: "04",
    title: "QR Printed on Pack",
    desc: "A unique QR linking to that batch's full data sheet is printed before dispatch. No batch ships without it.",
  },
  {
    n: "05",
    title: "You Scan & Verify",
    desc: "Any phone camera. Harvest date, lab report, pond location, and cold chain status — in seconds.",
  },
];

export default function TraceSteps() {
  return (
    <section className="bg-[#042b33] py-20 px-6" id="traceability">
      <div className="max-w-lg mx-auto">
        <p className="text-cyan-400 text-[0.68rem] font-semibold uppercase tracking-[0.15em] mb-2">
          Full Transparency
        </p>
        <h2 className="text-3xl font-black text-white mb-8">
          How Traceability Works
        </h2>

        <div className="flex flex-col divide-y divide-white/[0.06]">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-4 py-5">
              <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mt-0.5">
                <span className="text-cyan-400 text-[0.7rem] font-bold">{s.n}</span>
              </div>
              <div>
                <div className="text-white font-semibold text-sm mb-1">{s.title}</div>
                <div className="text-white/40 text-xs leading-relaxed font-light">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
