"use client";

import { useEffect, useState } from "react";

export default function EnergyBar({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDisplay(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const intensity =
    value >= 90
      ? "linear-gradient(90deg, #00f0ff, #7a5cff)"
      : value >= 75
      ? "linear-gradient(90deg, #00ffcc, #00aaff)"
      : "linear-gradient(90deg, #ff9966, #ff3366)";

  return (
    <div
      style={{
        marginTop: 15,
        width: "100%",
        height: 10,
        background: "rgba(255,255,255,0.08)",
        borderRadius: 50,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${display}%`,
          height: "100%",
          background: intensity,
          borderRadius: 50,
          transition: "width 1s ease",
          boxShadow: "0 0 15px rgba(0,200,255,0.6)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "-100%",
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(120deg, transparent, rgba(255,255,255,0.4), transparent)",
            animation: "shine 2s infinite",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes shine {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
    </div>
  );
}
