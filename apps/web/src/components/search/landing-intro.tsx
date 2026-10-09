import Link from "next/link";
import { OPERATION_LABEL, OPERATION_SLUG } from "@/lib/site";
import { formatPriceShort } from "@/lib/format";
import type { LandingData, Operation } from "@/lib/types";
import { ArrowRight, ChevronRight, TrendingUp, Ruler } from "@/components/ui/icon";
import { buildHref } from "./query";

export function Breadcrumbs({ items, className }: { items: { label: string; href?: string }[]; className?: string }) {
  return (
    <nav aria-label="Ruta de navegación" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-ink-3">
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`} className="flex items-center gap-1.5">
            {it.href && i < items.length - 1 ? <Link href={it.href} className="transition-colors hover:text-brand-700 hover:underline">{it.label}</Link> : <span aria-current={i === items.length - 1 ? "page" : undefined} className={i === items.length - 1 ? "font-medium text-ink-2" : ""}>{it.label}</span>}
            {i < items.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-ink-3/70" aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function landingCrumbs(operation: Operation, landing: LandingData | null, segments: { type?: string; city?: string; neighborhood?: string }) {
  const crumbs: { label: string; href?: string }[] = [{ label: "Inicio", href: "/" }, { label: OPERATION_LABEL[operation], href: `/${OPERATION_SLUG[operation]}` }];
  if (segments.type) crumbs.push({ label: landing?.type?.pluralName ?? segments.type, href: buildHref(operation, { type: segments.type }) });
  if (segments.type && segments.city) crumbs.push({ label: landing?.city?.name ?? segments.city, href: buildHref(operation, { type: segments.type, city: segments.city }) });
  if (segments.type && segments.city && segments.neighborhood) crumbs.push({ label: landing?.neighborhood?.name ?? segments.neighborhood });
  return crumbs;
}

export function LandingIntro({ landing, operation, fallbackTitle, crumbs }: { landing: LandingData | null; operation: Operation; fallbackTitle: string; crumbs: { label: string; href?: string }[] }) {
  const title = landing?.title ?? fallbackTitle;
  return (
    <header className="pb-7 pt-8 md:pb-9 md:pt-12">
      <Breadcrumbs items={crumbs} />
      <h1 className="display-md mt-4 max-w-4xl text-balance md:!text-[3rem]">{title}</h1>
      {landing?.intro && (
        <details className="group mt-4 max-w-3xl">
          <summary className="list-none text-[16px] leading-relaxed text-ink-2 [&::-webkit-details-marker]:hidden">
            <span className="line-clamp-2 group-open:line-clamp-none">{landing.intro}</span>
            <span className="mt-1 inline-block cursor-pointer text-sm font-semibold text-brand-700 hover:underline group-open:hidden">Leer más</span>
          </summary>
        </details>
      )}
      {landing && (landing.averagePrice || landing.averagePricePerM2) && (
        <dl className="mt-5 flex flex-wrap gap-3">
          {landing.averagePrice ? <div className="inline-flex items-center gap-2.5 rounded-full bg-surface px-4 py-2"><TrendingUp className="h-4 w-4 text-brand-700" aria-hidden /><dt className="text-[13px] text-ink-3">Precio promedio</dt><dd className="text-[14px] font-semibold tabular">{formatPriceShort(landing.averagePrice)}{operation === "RENT" ? " / mes" : ""}</dd></div> : null}
          {landing.averagePricePerM2 ? <div className="inline-flex items-center gap-2.5 rounded-full bg-surface px-4 py-2"><Ruler className="h-4 w-4 text-brand-700" aria-hidden /><dt className="text-[13px] text-ink-3">Promedio por m²</dt><dd className="text-[14px] font-semibold tabular">{formatPriceShort(landing.averagePricePerM2)}</dd></div> : null}
        </dl>
      )}
    </header>
  );
}

export function RelatedSearches({ landing }: { landing: LandingData | null }) {
  if (!landing?.related?.length) return null;
  return (
    <section className="mt-20 border-t border-line pt-12" aria-labelledby="relacionadas">
      <h2 id="relacionadas" className="display-md">Búsquedas relacionadas</h2>
      <ul className="mt-6 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {landing.related.map((r) => (
          <li key={r.path}>
            <Link href={r.path} className="group flex items-center justify-between gap-3 border-b border-line py-3.5 text-[15px] font-medium transition-colors hover:text-brand-700">
              <span>{r.label}</span>
              <span className="flex items-center gap-2 text-ink-3"><span className="text-[13px] tabular">{r.count}</span><ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
