export default function TraceLoading() {
  return (
    <div className="min-h-screen bg-[#02181d] flex flex-col items-center justify-center gap-5">
      <div className="text-white font-black text-xl tracking-wide">
        DAKH<span className="text-yellow-400">.</span>
      </div>
      <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
      <p className="text-white/30 text-xs uppercase tracking-[0.12em]">
        Fetching batch data…
      </p>
    </div>
  );
}
    