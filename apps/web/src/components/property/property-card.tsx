"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatPrice, formatNumber } from "@/lib/format";
import type { PublicationCard } from "@/lib/types";
import { Photo } from "@/components/ui/photo";
import { Bath, Bed, Camera, ChevronLeft, ChevronRight, Car, MapPin, Maximize2, Video, Compass } from "@/components/ui/icon";
import { FavoriteButton } from "./favorite-button";

type Props = {
  item: PublicationCard;
  priority?: boolean;
  className?: string;
  /** Resalta la tarjeta (sincronía con el mapa) */
  active?: boolean;
  onHover?: (id: string | null) => void;
  /** "wide" = horizontal en lista (desktop). */
  layout?: "stack" | "wide";
  sizes?: string;
  /** Para vistas previas dentro del panel: sin enlace ni favorito */
  preview?: boolean;
};

export function PropertyCard({ item, priority, className, active, onHover, layout = "stack", sizes, preview }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const imgs = item.images.length ? item.images.slice(0, 6) : [];
  const total = Math.max(imgs.length, 1);
  const seed = item.code;

  const go = (dir: -1 | 1, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const el = scroller.current; if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = scroller.current; if (!el) return;
    setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  const perMonth = item.operation === "RENT";
  const where = [item.neighborhood?.name, item.city.name].filter(Boolean).join(", ");

  return (
    <article
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "group relative flex flex-col gap-3.5 rounded-[24px] transition-all duration-500 ease-[var(--ease-out-expo)]",
        layout === "wide" && "md:flex-row md:gap-5 md:rounded-[24px] md:border md:border-line md:bg-white md:p-3 md:hover:shadow-[var(--shadow-lift)]",
        active && "md:ring-2 md:ring-brand-600 md:ring-offset-4",
        className,
      )}
    >
      {/* Imagen */}
      <div className={cn("relative aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-surface-2", layout === "wide" && "md:aspect-[4/3] md:w-[44%] md:shrink-0")}>
        <div ref={scroller} onScroll={onScroll} className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth">
          {(imgs.length ? imgs : [null]).map((im, i) => (
            <div key={im?.id ?? "x"} className="h-full w-full shrink-0 snap-center overflow-hidden">
              <Photo
                src={im?.url ?? item.coverUrl} alt={i === 0 ? item.title : `${item.title} — foto ${i + 1}`} seed={seed}
                priority={priority && i === 0} sizes={sizes ?? "(min-width:1280px) 28vw, (min-width:768px) 45vw, 92vw"}
                className="h-full w-full" imgClassName="transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
              />
            </div>
          ))}
        </div>
        <div className="scrim-bottom pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-70" />

        {/* Etiquetas */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {item.featured && <span className="rounded-full bg-sun px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink shadow">Destacado</span>}
          {item.isNew && !item.featured && <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700 shadow">Nuevo</span>}
          {item.hasVideo && <span className="grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-white backdrop-blur" title="Con video"><Video className="h-3.5 w-3.5" /></span>}
          {item.hasTour && <span className="grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-white backdrop-blur" title="Tour virtual"><Compass className="h-3.5 w-3.5" /></span>}
        </div>
        {!preview && <FavoriteButton id={item.id} className="absolute right-3 top-3" />}

        {/* Navegación del carrusel (escritorio) */}
        {total > 1 && (
          <>
            <button aria-label="Foto anterior" onClick={(e) => go(-1, e)} className={cn("absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow transition hover:scale-105 md:grid", idx === 0 ? "pointer-events-none opacity-0" : "opacity-0 group-hover:opacity-100")}><ChevronLeft className="h-5 w-5" /></button>
            <button aria-label="Foto siguiente" onClick={(e) => go(1, e)} className={cn("absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow transition hover:scale-105 md:grid", idx >= total - 1 ? "pointer-events-none opacity-0" : "opacity-0 group-hover:opacity-100")}><ChevronRight className="h-5 w-5" /></button>
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {imgs.map((im, i) => <span key={im.id} className={cn("h-1.5 rounded-full bg-white transition-all duration-300", i === idx ? "w-4 opacity-100" : "w-1.5 opacity-60")} />)}
            </div>
          </>
        )}
        {item.imageCount > 0 && (
          <span className="pointer-events-none absolute bottom-3 left-3 hidden items-center gap-1 rounded-full bg-ink/70 px-2 py-1 text-xs font-semibold text-white backdrop-blur md:inline-flex">
            <Camera className="h-3.5 w-3.5" />{item.imageCount}
          </span>
        )}
      </div>

      {/* Texto */}
      <div className={cn("flex min-w-0 flex-1 flex-col gap-2 px-1", layout === "wide" && "md:py-2 md:pr-3")}>
        <div className="flex items-baseline gap-1.5">
          <p className="font-display text-[1.9rem] leading-none tracking-tight text-ink tabular">{formatPrice(item.price, item.currency)}</p>
          {perMonth && <span className="text-sm font-medium text-ink-3">/ mes</span>}
          {item.negotiable && <span className="ml-1 rounded-full bg-sun-soft px-2 py-0.5 text-[11px] font-bold text-sun-ink">Negociable</span>}
        </div>
        {item.adminFee ? <p className="-mt-1 text-[13px] text-ink-3">+ {formatPrice(item.adminFee)} administración</p> : null}
        <h3 className="line-clamp-1 text-[16px] font-semibold text-ink">
          {preview ? item.title : (
            <Link href={item.path} className="after:absolute after:inset-0 after:z-10 after:rounded-[24px] focus-visible:after:ring-2 focus-visible:after:ring-brand-600" prefetch={false}>{item.title}</Link>
          )}
        </h3>
        <p className="flex items-center gap-1.5 text-[14px] text-ink-2"><MapPin className="h-4 w-4 shrink-0 text-brand-600" /><span className="truncate">{where}</span></p>
        <ul className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink-2">
          {item.bedrooms != null && <li className="flex items-center gap-1.5"><Bed className="h-4 w-4" />{item.bedrooms}<span className="sr-only"> habitaciones</span></li>}
          {item.bathrooms != null && <li className="flex items-center gap-1.5"><Bath className="h-4 w-4" />{item.bathrooms}<span className="sr-only"> baños</span></li>}
          {item.parking ? <li className="flex items-center gap-1.5"><Car className="h-4 w-4" />{item.parking}<span className="sr-only"> parqueaderos</span></li> : null}
          {item.area != null && <li className="flex items-center gap-1.5"><Maximize2 className="h-4 w-4" />{formatNumber(item.area)} m²</li>}
        </ul>
      </div>
    </article>
  );
}

export function PropertyCardSkeleton({ layout = "stack" }: { layout?: "stack" | "wide" }) {
  return (
    <div className={cn("flex flex-col gap-3.5", layout === "wide" && "md:flex-row md:gap-5")}>
      <div className={cn("skeleton aspect-[4/3] w-full rounded-[20px]", layout === "wide" && "md:w-[44%]")} />
      <div className="grid flex-1 content-start gap-2.5 px-1">
        <div className="skeleton h-8 w-2/3" /><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-1/2" /><div className="skeleton h-4 w-3/4" />
      </div>
    </div>
  );
}
