const ITEMS = [
  "Andhra Pradesh Origin",
  "FSSAI Compliant",
  "Antibiotic Free",
  "Cold Chain Verified",
  "QR Batch Traced",
  "Lab Certified",
  "Village Pond Farmed",
  "Export Quality",
  "DAKH Traceability",
  "Every Batch Traceable",
];

export default function TrustRibbon() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div
      style={{
        background: "#011829",
        padding: "11px 0",
        overflow: "hidden",
        borderTop: "2px solid rgba(201,168,76,0.4)",
        borderBottom: "1px solid rgba(0,180,216,0.08)",
      }}
    >
      <div
        className="animate-ribbon"
        style={{ display: "flex", gap: 28, whiteSpace: "nowrap", width: "max-content" }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            style={{
              color: "rgba(255,255,255,0.28)",
              fontSize: "0.64rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {item}
            <span style={{ color: "#c9a84c" }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
