"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { PublicationCard as Card } from "@/lib/types";
import { PropertyCard } from "@/components/property/property-card";
import { ArrowRight, ChevronLeft, ChevronRight } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/misc";
import { SectionHeader } from "./section-header";

export function FeaturedCarousel({ items, title = "Destacados", eyebrow = "Selección Jucaro", text = "Inmuebles con las mejores fotos y la información más completa.", viewAllHref = "/venta?featured=1", viewAllLabel = "Ver todos los destacados", className = "pt-24 md:pt-32", label = "Inmuebles destacados", idBase = "destacados-titulo" }: { items: Card[]; title?: string; eyebrow?: string; text?: string; viewAllHref?: string; viewAllLabel?: string; className?: string; label?: string; idBase?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });

  const measure = useCallback(() => {
    const el = scroller.current; if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, items.length]);

  const by = (dir: -1 | 1) => {
    const el = scroller.current; if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.8), behavior: "smooth" });
  };

  if (!items.length) return null;
  return (
    <section className={className} aria-labelledby={idBase}>
      <div className="container-x">
        <Reveal>
          <SectionHeader eyebrow={eyebrow} title={<span id={idBase}>{title}</span>} text={text}
            action={
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Anteriores" disabled={edge.start} onClick={() => by(-1)} className="grid h-12 w-12 place-items-center rounded-full border border-line-strong bg-white transition hover:border-ink hover:shadow-[var(--shadow-card)] disabled:pointer-events-none disabled:opacity-35"><ChevronLeft className="h-5 w-5" /></button>
                <button type="button" aria-label="Siguientes" disabled={edge.end} onClick={() => by(1)} className="grid h-12 w-12 place-items-center rounded-full border border-line-strong bg-white transition hover:border-ink hover:shadow-[var(--shadow-card)] disabled:pointer-events-none disabled:opacity-35"><ChevronRight className="h-5 w-5" /></button>
              </div>
            } />
        </Reveal>
      </div>
      <div
        ref={scroller} onScroll={measure} tabIndex={0} role="region" aria-label={label}
        onPointerDown={(e) => { if (e.pointerType !== "mouse" || e.button !== 0) return; const el = scroller.current!; drag.current = { down: true, x: e.clientX, left: el.scrollLeft, moved: false }; }}
        onPointerMove={(e) => {
          const d = drag.current; if (!d.down) return;
          const dx = e.clientX - d.x;
          if (Math.abs(dx) > 6 && !d.moved) { d.moved = true; scroller.current!.style.scrollSnapType = "none"; scroller.current!.style.scrollBehavior = "auto"; scroller.current!.style.cursor = "grabbing"; }
          if (d.moved) scroller.current!.scrollLeft = d.left - dx;
        }}
        onPointerUp={() => { const el = scroller.current!; drag.current.down = false; el.style.scrollSnapType = ""; el.style.scrollBehavior = ""; el.style.cursor = ""; }}
        onPointerLeave={() => { if (drag.current.down) { const el = scroller.current!; drag.current.down = false; el.style.scrollSnapType = ""; el.style.scrollBehavior = ""; el.style.cursor = ""; } }}
        onClickCapture={(e) => { if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); drag.current.moved = false; } }}
        onDragStart={(e) => e.preventDefault()}
        className={cn("no-scrollbar mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-5 pb-10 pt-2 md:px-[max(32px,calc((100%_-_1320px)_/_2_+_32px))] lg:cursor-grab", "[scroll-padding-inline:20px] md:[scroll-padding-inline:max(32px,calc((100%_-_1320px)_/_2_+_32px))]")}
      >
        {items.slice(0, 10).map((it, i) => (
          <div key={it.id} className="w-[82vw] max-w-[360px] shrink-0 snap-start sm:w-[360px]">
            <PropertyCard item={it} priority={i < 2} sizes="360px" />
          </div>
        ))}
        <div className="grid w-[240px] shrink-0 snap-start place-items-center">
          <Link href={viewAllHref} className="group grid place-items-center gap-3 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-white transition-transform duration-500 group-hover:translate-x-1"><ArrowRight className="h-6 w-6" /></span>
            <span className="font-display text-2xl">{viewAllLabel}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
