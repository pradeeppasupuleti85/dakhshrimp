import Image from "next/image";
import Link from "next/link";

interface ProductCardProps {
  name: string;
  teluguName?: string;
  description: string;
  price: string;
  unit: string;
  imageSrc: string;
  badge?: string;
  tags?: string[];
  batchId: string;
  waNumber: string;
  waMessage: string;
}

export default function ProductCard({
  name,
  teluguName,
  description,
  price,
  unit,
  imageSrc,
  badge,
  tags = [],
  batchId,
  waNumber,
  waMessage,
}: ProductCardProps) {
  return (
    <div className="group bg-[#063743] border border-cyan-900/30 rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform duration-300 shadow-md hover:shadow-cyan-900/30 hover:shadow-xl">

      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <Image
          src={imageSrc}
          alt={name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#063743]/80 to-transparent" />
        {badge && (
          <span className="absolute top-3 left-3 bg-[#02181d] text-yellow-400 text-[0.62rem] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="font-bold text-lg text-white leading-tight">{name}</div>
        {teluguName && (
          <div className="text-white/35 text-sm italic mt-0.5">{teluguName}</div>
        )}
        <p className="text-white/50 text-xs leading-relaxed mt-2 mb-3 font-light">
          {description}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.map((t) => (
              <span
                key={t}
                className="bg-cyan-900/20 border border-cyan-900/30 text-cyan-400/70 text-[0.62rem] font-medium px-2 py-0.5 rounded-md"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Price + CTA row */}
        <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/[0.06]">
          <div>
            <span className="text-cyan-400 font-black text-xl">{price}</span>
            <span className="text-white/30 text-xs ml-1">/ {unit}</span>
          </div>
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20b858] text-white text-xs font-bold px-3.5 py-2 rounded-lg transition"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Order
          </a>
        </div>

        {/* Trace link */}
        <Link
          href={`/trace/${batchId}`}
          className="mt-3 flex items-center justify-center gap-1.5 text-cyan-400/60 hover:text-cyan-400 text-[0.7rem] font-medium transition"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="5" height="5" /><rect x="16" y="3" width="5" height="5" />
            <rect x="3" y="16" width="5" height="5" /><path d="M21 16h-3v3M15 21v-3h3" />
          </svg>
          View Batch Trace Report
        </Link>
      </div>
    </div>
  );
}
