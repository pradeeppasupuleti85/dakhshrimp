"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

const WA_NUMBER = "919999999999";

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Particles
    const particles: {
      x: number; y: number; r: number;
      speedX: number; speedY: number; opacity: number; life: number; maxLife: number;
    }[] = [];

    const spawnParticle = () => {
      const maxLife = 180 + Math.random() * 120;
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height * 0.6 + Math.random() * canvas.height * 0.4,
        r: 0.8 + Math.random() * 1.6,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: -(0.3 + Math.random() * 0.5),
        opacity: 0,
        life: 0,
        maxLife,
      });
    };

    for (let i = 0; i < 28; i++) spawnParticle();

    let frame = 0;
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      if (frame % 8 === 0 && particles.length < 40) spawnParticle();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.speedX;
        p.y += p.speedY;
        const lifeRatio = p.life / p.maxLife;
        p.opacity = lifeRatio < 0.15
          ? lifeRatio / 0.15
          : lifeRatio > 0.75
          ? 1 - (lifeRatio - 0.75) / 0.25
          : 1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,211,238,${p.opacity * 0.45})`;
        ctx.fill();

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          spawnParticle();
        }
      }

      // Ripple rings from bottom
      const rippleCount = 3;
      for (let r = 0; r < rippleCount; r++) {
        const progress = ((frame * 0.004 + r * 0.33) % 1);
        const maxR = canvas.width * 0.55;
        const currentR = progress * maxR;
        const alpha = (1 - progress) * 0.06;
        ctx.beginPath();
        ctx.ellipse(
          canvas.width / 2,
          canvas.height * 0.88,
          currentR,
          currentR * 0.22,
          0, 0, Math.PI * 2
        );
        ctx.strokeStyle = `rgba(34,211,238,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-end overflow-hidden bg-[#020f12] pb-16 px-6 pt-28">

      {/* Hero background image */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero/tigerpraws-hero.jpg"
          alt=""
          fill
          className="object-cover object-center opacity-[0.12] scale-105"
          priority
          aria-hidden
        />
      </div>

      {/* Deep atmospheric gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020f12] via-[#020f12]/85 to-[#020f12]/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#020f12]/80 via-transparent to-[#020f12]/60 pointer-events-none" />

      {/* Aqua radial glow — bottom left */}
      <div
        className="absolute bottom-0 left-[-10%] w-[70%] h-[60%] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at bottom left, rgba(34,211,238,0.07) 0%, transparent 65%)" }}
      />
      {/* Gold radial glow — top right */}
      <div
        className="absolute top-0 right-0 w-[50%] h-[40%] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top right, rgba(200,148,58,0.05) 0%, transparent 60%)" }}
      />

      {/* Fine grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Canvas — particles + ripples */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden
      />

      {/* Shrimp silhouettes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {/* Large silhouette right */}
        <svg
          className="absolute right-[-2%] bottom-[18%] w-48 opacity-[0.04]"
          viewBox="0 0 200 80"
          fill="white"
        >
          <path d="M10 40 Q30 10 80 20 Q130 30 160 15 Q185 5 195 20 Q185 35 160 30 Q130 45 80 38 Q30 50 10 40Z" />
          <ellipse cx="8" cy="40" rx="8" ry="5" />
          <path d="M160 15 L175 2 M165 18 L182 8" stroke="white" strokeWidth="2" fill="none" />
        </svg>
        {/* Small silhouette left */}
        <svg
          className="absolute left-[5%] top-[35%] w-20 opacity-[0.035] rotate-12"
          viewBox="0 0 200 80"
          fill="white"
        >
          <path d="M10 40 Q30 10 80 20 Q130 30 160 15 Q185 5 195 20 Q185 35 160 30 Q130 45 80 38 Q30 50 10 40Z" />
          <ellipse cx="8" cy="40" rx="8" ry="5" />
        </svg>
      </div>

      {/* Horizontal wave shimmer lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {[28, 45, 62, 76].map((pct, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-px wave-shimmer"
            style={{ top: `${pct}%`, animationDelay: `${i * 1.4}s`, opacity: 0.6 }}
          />
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-lg">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-yellow-500/25 bg-yellow-500/[0.08] text-yellow-400/90 text-[0.65rem] font-semibold uppercase tracking-[0.16em] px-3.5 py-1.5 rounded-full mb-7">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Farm to Fork · QR Verified · Est. 2026
        </div>

        {/* Headline */}
        <h1
          className="font-black text-white leading-[1.02] mb-6 tracking-tight"
          style={{ fontSize: "clamp(2.6rem, 10vw, 5rem)", fontFamily: "'Georgia', serif" }}
        >
          India's premium<br />
          <span
            className="text-transparent bg-clip-text"
            style={{ backgroundImage: "linear-gradient(90deg, #22d3ee 0%, #67e8f9 50%, #22d3ee 100%)" }}
          >
            transparent
          </span>
          <br />
          seafood brand.
        </h1>

        <p className="text-white/40 text-[0.92rem] leading-[1.75] max-w-sm mb-8 font-light tracking-wide">
          Every pack of DAKH Shrimps carries a QR code — linked to its harvest pond,
          lab certificate, and cold chain record. From Andhra's coast to your kitchen.
        </p>

        {/* Trust microcopy */}
        <p className="text-cyan-400/50 text-[0.7rem] uppercase tracking-[0.18em] mb-6 font-medium">
          "Scan Freshness. Taste Trust."
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            href="#products"
            className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-sm px-6 py-3.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-400/20"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            Shop Fresh
          </Link>
          <Link
            href="#trace"
            className="flex items-center gap-2 border border-white/15 text-white/65 hover:border-cyan-400/40 hover:text-cyan-400 text-sm font-medium px-6 py-3.5 rounded-xl transition-all"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="5" height="5" /><rect x="16" y="3" width="5" height="5" />
              <rect x="3" y="16" width="5" height="5" />
              <path d="M21 16h-3v3M15 21v-3h3M15 12h3v3M12 15v3" />
            </svg>
            Trace a Batch
          </Link>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=Hi%20DAKH%20Shrimps!%20I%27d%20like%20to%20order.`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366] hover:bg-[#25D366]/20 text-sm font-medium px-6 py-3.5 rounded-xl transition-all"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp Order
          </a>
        </div>

        {/* Stats */}
        <div className="flex gap-8 pt-7 border-t border-white/[0.06]">
          {[
            { n: "3", l: "Shrimp Varieties" },
            { n: "100%", l: "QR Verified" },
            { n: "0–4°C", l: "Cold Chain" },
            { n: "AP", l: "Andhra Origin" },
          ].map((s) => (
            <div key={s.l}>
              <div
                className="text-white font-black leading-none"
                style={{ fontFamily: "'Georgia', serif", fontSize: "1.5rem" }}
              >
                {s.n}
              </div>
              <div className="text-white/25 text-[0.6rem] uppercase tracking-[0.1em] mt-1.5 leading-tight">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logo — desktop right float */}
      <div className="absolute right-6 bottom-20 hidden lg:block z-10 slow-bob">
        <Image
          src="/images/logos/Dakhsrimp-logo.png"
          alt="DAKH Shrimps & Co."
          width={200}
          height={200}
          className="object-contain opacity-80"
          style={{ filter: "drop-shadow(0 0 40px rgba(34,211,238,0.15))" }}
        />
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-6 right-6 flex flex-col items-center gap-1.5 z-10" aria-hidden>
        <span className="text-white/15 text-[0.6rem] tracking-[0.12em] uppercase">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-cyan-400/30 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
