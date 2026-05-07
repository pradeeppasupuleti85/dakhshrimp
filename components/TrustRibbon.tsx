const ITEMS = [
  "Andhra Pradesh Certified",
  "FSSAI Compliant",
  "Antibiotic Residue Free",
  "Cold Chain Verified",
  "Farm Pond Traced",
  "Lab Report on Every Pack",
  "Traditional Village Ponds",
  "Export Quality",
];

export default function TrustRibbon() {
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div className="bg-black/60 border-y border-cyan-900/20 py-3 overflow-hidden">
      <div className="flex gap-8 animate-ribbon whitespace-nowrap w-max">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="text-white/30 text-[0.68rem] font-medium uppercase tracking-[0.14em] flex items-center gap-2"
          >
            {item}
            <span className="text-cyan-500/60 text-xs">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
