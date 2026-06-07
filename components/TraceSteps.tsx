const STEPS = [
  {
    n: "01",
    title: "Harvested at Named Pond",
    desc: "GPS-verified village ponds in Andhra Pradesh. Each pond FSSAI registered with a unique ID.",
  },
  {
    n: "02",
    title: "Lab Tested on Every Batch",
    desc: "Antibiotics, heavy metals, microbial limits — tested before we pack a single gram.",
  },
  {
    n: "03",
    title: "Cold Chain at 0–4°C",
    desc: "Continuous temperature monitoring from harvest to packaging. Every log tied to the batch ID.",
  },
  {
    n: "04",
    title: "Unique QR on Every Pack",
    desc: "A QR linking to that batch's complete data is printed before dispatch. No batch ships without it.",
  },
  {
    n: "05",
    title: "You Scan & Verify",
    desc: "Any phone camera. Pond source, harvest date, lab result, cold chain — all in seconds.",
  },
];

export default function TraceSteps() {
  return (
    <section
      id="trace"
      style={{ padding: "60px 18px", background: "#011829" }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <p
          style={{
            color: "#48cae4",
            fontSize: "0.64rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginBottom: 6,
          }}
        >
          The DAKH Difference
        </p>
        <h2
          className="reveal"
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: "clamp(1.7rem, 6vw, 2.5rem)",
            fontWeight: 800,
            color: "white",
            marginBottom: 8,
          }}
        >
          How Traceability Works
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.28)",
            fontSize: "0.8rem",
            marginBottom: 36,
            fontStyle: "italic",
          }}
        >
          &ldquo;Every batch traceable. Every pack trusted.&rdquo;
        </p>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="reveal"
              style={{
                display: "flex",
                gap: 16,
                padding: "20px 0",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(0,180,216,0.08)",
                  border: "1px solid rgba(0,180,216,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    color: "#00b4d8",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                  }}
                >
                  {s.n}
                </span>
              </div>
              <div>
                <div
                  style={{
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.92rem",
                    marginBottom: 4,
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontSize: "0.78rem",
                    lineHeight: 1.6,
                    fontWeight: 300,
                  }}
                >
                  {s.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Microcopy */}
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <p
            style={{
              color: "rgba(255,255,255,0.18)",
              fontSize: "0.65rem",
              letterSpacing: "0.1em",
              fontStyle: "italic",
            }}
          >
            &ldquo;Scan Freshness. Taste Trust.&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}
