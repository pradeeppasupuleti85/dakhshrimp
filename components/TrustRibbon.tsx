const ITEMS = [
  "Andhra Pradesh Origin",
  "FSSAI Compliant",
  "Antibiotic Free",
  "Cold Chain Verified",
  "QR Batch Traced",
  "Lab Certified",
  "Village Pond Farmed",
  "Export Quality",
  "DAKH Traceability System",
  "Every Batch Traceable",
];

export default function TrustRibbon() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="bg-black/40 border-y border-white/[0.05] py-3 overflow-hidden">
      <div className="flex gap-8 animate-ribbon whitespace-nowrap w-max">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="text-white/25 text-[0.65rem] font-medium uppercase tracking-[0.15em] flex items-center gap-2"
          >
            {item}
            <span className="text-cyan-500/40">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
