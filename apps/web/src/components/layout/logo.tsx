import Link from "next/link";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/cn";

/** Isotipo: júcaro cuyo dosel es un techo, raíces abajo y un fruto de latón. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="currentColor" />
      <path d="M16.2 13.6 20 10.6l3.8 3" fill="none" stroke="#fff" strokeWidth="1.35" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M17.5 13.5h5v2.1h-5z" fill="none" stroke="#fff" strokeWidth="1.15" strokeLinejoin="round" />
      <path d="M9.5 20.8c2.4-5 5.6-7.2 10.5-7.2s8.1 2.2 10.5 7.2" fill="none" stroke="#fff" strokeWidth="1.45" strokeLinecap="round" />
      <path d="M13.2 19.2c1.6 1.5 3.2 2.1 6.8 2.1s5.2-.6 6.8-2.1" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M20 17.6v8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 25.2c-2.6 1.7-5.4 2.2-8.2 1.1M20 25.2c2.6 1.7 5.4 2.2 8.2 1.1M13.6 27.6c-1.8.9-3.4.7-4.8-.1M26.4 27.6c1.8.9 3.4.7 4.8-.1" fill="none" stroke="#fff" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="31" cy="29.4" r="1.55" fill="#C9A15A" />
    </svg>
  );
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label={`${SITE.name} — inicio`} className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-9 text-brand-700 transition-transform duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] group-hover:-rotate-6 group-hover:scale-105" />
      <span className="grid leading-none">
        <span className={cn("font-display text-[1.65rem] tracking-tight", light ? "text-white" : "text-ink")}>{SITE.name}</span>
        <span className={cn("mt-0.5 text-[9px] font-semibold tracking-[0.22em]", light ? "text-sun" : "text-sun-ink")}>INMUEBLES</span>
      </span>
    </Link>
  );
}
