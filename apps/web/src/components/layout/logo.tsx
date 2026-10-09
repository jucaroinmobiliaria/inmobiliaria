import Link from "next/link";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/cn";
import { BRAND_GOLD, BRAND_GREEN, MARK_C, MARK_J } from "@/lib/brand-mark";

function Mark({ ink, gold }: { ink: string; gold: string }) {
  return (
    <>
      <path d={MARK_C} fill="none" stroke={ink} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={MARK_J} fill="none" stroke={ink} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23.6" cy="19.4" r="2.15" fill={gold} />
    </>
  );
}

/** Isotipo: monograma JC que arma una casa — dosel de júcaro (C) y pilar (J), con fruto de latón. */
export function LogoMark({ className, invert = false }: { className?: string; invert?: boolean }) {
  const plate = invert ? "#fff" : "currentColor";
  const ink = invert ? BRAND_GREEN : "#fff";
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="11" fill={plate} />
      <Mark ink={ink} gold={BRAND_GOLD} />
    </svg>
  );
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label={`${SITE.name} — inicio`} className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoMark
        invert={light}
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
