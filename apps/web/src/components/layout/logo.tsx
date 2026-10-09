import Link from "next/link";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/cn";
import { BRAND_GOLD, BRAND_GREEN, MARK_C, MARK_J, MARK_PLATE_RX, MARK_STROKE, MARK_WINDOW } from "@/lib/brand-mark";

function Mark({ ink, gold, assemble }: { ink: string; gold: string; assemble?: boolean }) {
  return (
    <g className={assemble ? "mark-scene" : undefined}>
      {assemble && (
        <circle className="mark-halo" cx="20" cy="21" r="15.5" fill="none" stroke={gold} strokeWidth="1.15" opacity="0" />
      )}
      <g className={assemble ? "mark-c" : undefined}>
        <path d={MARK_C} fill="none" stroke={ink} strokeWidth={MARK_STROKE} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className={assemble ? "mark-j" : undefined}>
        <path d={MARK_J} fill="none" stroke={ink} strokeWidth={MARK_STROKE} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className={assemble ? "mark-window" : undefined}>
        <rect x={MARK_WINDOW.x} y={MARK_WINDOW.y} width={MARK_WINDOW.size} height={MARK_WINDOW.size} rx={MARK_WINDOW.rx} fill={gold} />
      </g>
    </g>
  );
}

/** Isotipo: monograma JC que arma una casa — dosel (C) y jamba (J), con ventana de latón. */
export function LogoMark({ className, invert = false, animate = false }: { className?: string; invert?: boolean; animate?: boolean }) {
  const plate = invert ? "#fff" : "currentColor";
  const ink = invert ? BRAND_GREEN : "#fff";
  return (
    <svg viewBox="0 0 40 40" className={cn(animate && "mark-assemble", className)} aria-hidden overflow="visible">
      <rect width="40" height="40" rx={MARK_PLATE_RX} fill={plate} />
      <Mark ink={ink} gold={BRAND_GOLD} assemble={animate} />
    </svg>
  );
}

export function Logo({ light = false, animate = false, className }: { light?: boolean; animate?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label={`${SITE.name} — inicio`} className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoMark
        invert={light}
        animate={animate}
        className={cn(
          "h-10 w-10 origin-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] group-hover:scale-105",
          !light && "text-brand-600",
        )}
      />
      <span className="grid leading-none">
        <span className={cn("font-display text-[1.7rem] tracking-tight", light ? "text-white" : "text-ink")}>{SITE.name}</span>
        <span className={cn("mt-1 text-[9px] font-semibold tracking-[0.26em]", light ? "text-sun" : "text-sun-ink")}>INMUEBLES</span>
      </span>
    </Link>
  );
}
