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

/* Alternate aqua / gold for visual rhythm */
const ACCENT = ["#48cae4", "#f0c94a"];

export default function TrustRibbon() {
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div
      style={{
        background: "#011829",
        padding: "0",
        overflow: "hidden",
        borderTop: "2px solid rgba(201,168,76,0.45)",
        borderBottom: "1px solid rgba(0,180,216,0.12)",
      }}
    >
      <div
        className="animate-ribbon"
        style={{
          display: "flex",
          gap: 0,
          whiteSpace: "nowrap",
          width: "max-content",
          padding: "10px 0",
        }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0,
              marginRight: 6,
            }}
          >
            {/* Pill chip */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${ACCENT[i % 2]}33`,
                borderRadius: 999,
                padding: "4px 14px",
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {/* Coloured dot */}
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: ACCENT[i % 2],
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${ACCENT[i % 2]}`,
                }}
              />
              {item}
            </span>

            {/* Separator */}
            <span
              style={{
                display: "inline-block",
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                margin: "0 10px",
                flexShrink: 0,
                verticalAlign: "middle",
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
