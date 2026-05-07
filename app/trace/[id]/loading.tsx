export default function TraceLoading() {
  return (
    <div className="min-h-screen bg-[#020f12] flex flex-col items-center justify-center gap-5">
      <div className="text-white font-black text-xl tracking-widest" style={{ fontFamily: "'Georgia', serif" }}>
        DAKSH<span className="text-yellow-400">.</span>
      </div>
      <div className="w-10 h-10 rounded-full border-2 border-cyan-500/15 border-t-cyan-400 animate-spin" />
      <p className="text-white/20 text-[0.65rem] uppercase tracking-[0.15em]">
        Fetching batch data…
      </p>
    </div>
  );
}
