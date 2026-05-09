export default function TraceLoading() {
  return (
    <div className="min-h-screen bg-[#020f12] flex flex-col items-center justify-center gap-5">
      {/* Brand mark */}
      <div
        className="text-white font-black text-2xl tracking-widest"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        DAKSH<span className="text-yellow-400">.</span>
      </div>

      {/* Spinner */}
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/10" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
      </div>

      {/* Microcopy */}
      <p className="text-white/25 text-[0.65rem] uppercase tracking-[0.18em]">
        Fetching batch data…
      </p>
      <p className="text-white/12 text-[0.58rem] tracking-wide">
        Verified through DAKH Traceability System
      </p>
    </div>
  );
}
