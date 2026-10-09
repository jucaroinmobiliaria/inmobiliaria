import Link from "next/link";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/cn";
import { BRAND_GOLD, BRAND_GREEN, MARK_C, MARK_J, MARK_PLATE_RX, MARK_STROKE, MARK_WINDOW } from "@/lib/brand-mark";

function Stroke({ d }: { d: string }) {
  return <path d={d} fill="none" stroke="currentColor" strokeWidth={MARK_STROKE} strokeLinecap="round" strokeLinejoin="round" />;
}

function Mark({ gold, assemble }: { gold: string; assemble?: boolean }) {
  return (
    <>
      {assemble && (
        <g className="mark-letters" aria-hidden>
          <text
            className="mark-glyph mark-glyph-j"
            x="12.2"
            y="27.2"
            textAnchor="middle"
            fill="currentColor"
            fontFamily='"Instrument Serif", Georgia, "Times New Roman", serif'
            fontSize="20"
            fontWeight="400"
          >
            J
          </text>
          <text
            className="mark-glyph mark-glyph-c"
            x="27.8"
            y="27.2"
            textAnchor="middle"
            fill="currentColor"
            fontFamily='"Instrument Serif", Georgia, "Times New Roman", serif'
            fontSize="20"
            fontWeight="400"
          >
            C
          </text>
        </g>
      )}
      <g className={assemble ? "mark-house" : undefined}>
        <g className={assemble ? "mark-c" : undefined}>
          <Stroke d={MARK_C} />
        </g>
        <g className={assemble ? "mark-j" : undefined}>
          <Stroke d={MARK_J} />
        </g>
        <g className={assemble ? "mark-window" : undefined}>
          <rect x={MARK_WINDOW.x} y={MARK_WINDOW.y} width={MARK_WINDOW.size} height={MARK_WINDOW.size} rx={MARK_WINDOW.rx} fill={gold} />
        </g>
      </g>
    </>
  );
}

/** Isotipo: monograma JC que arma una casa — dosel (C) y jamba (J), con ventana de latón. */
export function LogoMark({ className, invert = false, animate = false }: { className?: string; invert?: boolean; animate?: boolean }) {
  const plate = invert ? "#fff" : "currentColor";
  const ink = invert ? BRAND_GREEN : "#fff";
  return (
    <svg viewBox="0 0 40 40" className={cn(animate && "mark-assemble", className)} aria-hidden overflow="visible">
      {animate && (
        <defs>
          <clipPath id="mark-plate-clip">
            <rect width="40" height="40" rx={MARK_PLATE_RX} />
          </clipPath>
        </defs>
      )}
      <rect width="40" height="40" rx={MARK_PLATE_RX} fill={plate} />
      <g style={{ color: ink }} clipPath={animate ? "url(#mark-plate-clip)" : undefined}>
        <Mark gold={BRAND_GOLD} assemble={animate} />
      </g>
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
          "h-10 w-10 transition-transform duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] group-hover:-rotate-6 group-hover:scale-105",
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
