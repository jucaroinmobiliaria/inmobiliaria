"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { api, ApiException } from "@/lib/api";
import { formatPriceShort } from "@/lib/format";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { OPERATION_SLUG } from "@/lib/site";
import type { AlertFrequency, Catalog, Operation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Input } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { ChevronLeft, ChevronRight, Search, X } from "@/components/ui/icon";
import { BellRing } from "./icons";
import { Popover } from "./popover";
import { csv } from "./filter-sections";
import { stripEmpty, type ResultsQuery } from "./query";

/* ---------- Chips de filtros activos ---------- */
export type ActiveChip = { key: string; label: string; clear: Partial<ResultsQuery> };

export function buildActiveChips(q: ResultsQuery, catalog: Catalog | null): ActiveChip[] {
  const out: ActiveChip[] = [];
  const types = csv(q.type);
  if (types.length) out.push({ key: "type", label: types.map((t) => catalog?.types.find((x) => x.slug === t)?.pluralName ?? t).join(", "), clear: { type: undefined } });
  if (q.q) out.push({ key: "q", label: `“${q.q}”`, clear: { q: undefined } });
  if (q.minPrice !== undefined || q.maxPrice !== undefined)
    out.push({ key: "price", label: q.minPrice && q.maxPrice ? `${formatPriceShort(q.minPrice)} – ${formatPriceShort(q.maxPrice)}` : q.maxPrice ? `Hasta ${formatPriceShort(q.maxPrice)}` : `Desde ${formatPriceShort(q.minPrice)}`, clear: { minPrice: undefined, maxPrice: undefined } });
  if (q.bedrooms) out.push({ key: "beds", label: `${q.bedrooms}+ habitaciones`, clear: { bedrooms: undefined } });
  if (q.bathrooms) out.push({ key: "baths", label: `${q.bathrooms}+ baños`, clear: { bathrooms: undefined } });
  if (q.parking) out.push({ key: "parking", label: `${q.parking}+ parqueaderos`, clear: { parking: undefined } });
  if (q.minArea !== undefined || q.maxArea !== undefined) out.push({ key: "area", label: `${q.minArea ?? 0}–${q.maxArea ?? "∞"} m²`, clear: { minArea: undefined, maxArea: undefined } });
  if (q.stratum) out.push({ key: "stratum", label: `Estrato ${csv(q.stratum).join(", ")}`, clear: { stratum: undefined } });
  for (const a of csv(q.amenities)) out.push({ key: `am-${a}`, label: catalog?.amenities.find((x) => x.slug === a)?.name ?? a, clear: { amenities: csv(q.amenities).filter((x) => x !== a).join(",") || undefined } });
  if (q.condition) out.push({ key: "cond", label: { NEW: "Nuevo", USED: "Usado", OFF_PLAN: "Sobre planos" }[q.condition], clear: { condition: undefined } });
  if (q.furnished) out.push({ key: "furn", label: "Amoblado", clear: { furnished: undefined } });
  if (q.petFriendly) out.push({ key: "pets", label: "Acepta mascotas", clear: { petFriendly: undefined } });
  if (q.withVideo) out.push({ key: "video", label: "Con video", clear: { withVideo: undefined } });
  if (q.withTour) out.push({ key: "tour", label: "Tour 360°", clear: { withTour: undefined } });
  if (q.featured) out.push({ key: "feat", label: "Destacados", clear: { featured: undefined } });
  if (q.bbox) out.push({ key: "bbox", label: "Zona del mapa", clear: { bbox: undefined } });
  return out;
}

export function ActiveFilters({ chips, onClear, onClearAll }: { chips: ActiveChip[]; onClear: (c: ActiveChip) => void; onClearAll: () => void }) {
  if (!chips.length) return null;
  return (
    <ul className="no-scrollbar -mx-5 flex items-center gap-2 overflow-x-auto px-5 py-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" aria-label="Filtros activos">
      {chips.map((c) => (
        <li key={c.key} className="shrink-0">
          <button type="button" onClick={() => onClear(c)} aria-label={`Quitar filtro: ${c.label}`}
            className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 pl-3.5 pr-2.5 text-[13px] font-semibold text-brand-800 transition hover:border-brand-600">
            {c.label}<span className="grid h-5 w-5 place-items-center rounded-full bg-brand-100 transition group-hover:bg-brand-600 group-hover:text-white"><X className="h-3 w-3" strokeWidth={3} /></span>
          </button>
        </li>
      ))}
      <li className="shrink-0"><button type="button" onClick={onClearAll} className="h-9 rounded-full px-3 text-[13px] font-semibold text-ink underline underline-offset-4 hover:text-brand-700">Limpiar todo</button></li>
    </ul>
  );
}

/* ---------- Guardar búsqueda ---------- */
const FREQ: { v: AlertFrequency; l: string }[] = [
  { v: "INSTANT", l: "Al instante" }, { v: "DAILY", l: "Un resumen diario" }, { v: "WEEKLY", l: "Un resumen semanal" }, { v: "NONE", l: "Sin alertas (solo guardar)" },
];

export function SaveSearch({ query, defaultName }: { query: ResultsQuery; defaultName: string }) {
  const { user } = useSession();
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [freq, setFreq] = useState<AlertFrequency>("DAILY");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (close: () => void) => {
    setBusy(true); setError(null);
    try {
      const body = stripEmpty({ ...query, view: undefined, page: undefined });
      await api("/saved-searches", { body: { name: name.trim() || defaultName, query: body, frequency: freq } });
      toast.success(freq === "NONE" ? "Búsqueda guardada" : "Búsqueda guardada. Te avisaremos cuando haya novedades");
      close();
    } catch (e) {
      setError(e instanceof ApiException ? (e.errors?.name?.[0] ?? e.message) : "No pudimos guardar la búsqueda. Intenta de nuevo.");
    } finally { setBusy(false); }
  };

  return (
    <Popover label="Guardar esta búsqueda" align="end" panelClassName="w-[340px] max-w-[calc(100vw-32px)]"
      trigger={(p) => (
        <button type="button" aria-haspopup={p["aria-haspopup"]} aria-expanded={p["aria-expanded"]} aria-controls={p["aria-controls"]}
          onClick={() => { if (!user) { toast.info("Inicia sesión para guardar tu búsqueda"); router.push(`/ingresar?next=${encodeURIComponent(location.pathname + location.search)}`); return; } setName(defaultName); p.toggle(); }}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-white px-4 text-sm font-semibold transition hover:border-ink active:scale-95">
          <BellRing className="h-[18px] w-[18px] text-brand-700" /><span className="hidden sm:inline">Guardar búsqueda</span><span className="sm:hidden">Guardar</span>
        </button>
      )}>
      {({ close }) => (
        <form onSubmit={(e) => { e.preventDefault(); void save(close); }} className="grid gap-4">
          <div>
            <p className="font-display text-[1.6rem] leading-tight">Guarda esta búsqueda</p>
            <p className="mt-1 text-[13px] text-ink-3">La encontrarás en Favoritos y podemos avisarte cuando aparezcan inmuebles nuevos.</p>
          </div>
          <Input label="Nombre" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} error={error ?? undefined} />
          <Select label="Avisarme" value={freq} onChange={(e) => setFreq(e.target.value as AlertFrequency)}>
            {FREQ.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
          </Select>
          <Button type="submit" loading={busy}>Guardar búsqueda</Button>
        </form>
      )}
    </Popover>
  );
}

/* ---------- Paginación ---------- */
export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const pages = useMemo(() => {
    const set = new Set([1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages));
    const sorted = [...set].sort((a, b) => a - b);
    const out: (number | "…")[] = [];
    sorted.forEach((n, i) => { if (i && n - sorted[i - 1]! > 1) out.push("…"); out.push(n); });
    return out;
  }, [page, totalPages]);
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Paginación de resultados" className="flex items-center justify-center gap-1.5">
      <button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => onPage(page - 1)} className="grid h-11 w-11 place-items-center rounded-full border border-line-strong transition hover:border-ink disabled:pointer-events-none disabled:opacity-35"><ChevronLeft className="h-5 w-5" /></button>
      {pages.map((p, i) => p === "…" ? <span key={`e${i}`} className="px-1 text-ink-3" aria-hidden>…</span> : (
        <button key={p} type="button" aria-current={p === page ? "page" : undefined} aria-label={`Página ${p}`} onClick={() => onPage(p)}
          className={cn("grid h-11 min-w-11 place-items-center rounded-full px-3 text-[15px] font-semibold tabular transition", p === page ? "bg-ink text-white" : "hover:bg-surface")}>{p}</button>
      ))}
      <button type="button" aria-label="Página siguiente" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="grid h-11 w-11 place-items-center rounded-full border border-line-strong transition hover:border-ink disabled:pointer-events-none disabled:opacity-35"><ChevronRight className="h-5 w-5" /></button>
    </nav>
  );
}

/* ---------- Estado vacío ---------- */
export function EmptyResults({ operation, hasFilters, onClear, catalog, error, onRetry }: { operation: Operation; hasFilters: boolean; onClear: () => void; catalog: Catalog | null; error?: boolean; onRetry?: () => void }) {
  const cities = [...(catalog?.cities ?? [])].filter((c) => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 6);
  if (error) {
    return <EmptyState icon={<Search className="h-6 w-6" />} title="No pudimos cargar los resultados" text="Revisa tu conexión e inténtalo de nuevo." action={onRetry && <Button onClick={onRetry}>Reintentar</Button>} />;
  }
  return (
    <div className="col-span-full">
      <EmptyState icon={<Search className="h-6 w-6" />} title="Nada por aquí… todavía" text={hasFilters ? "Ningún inmueble cumple todos los filtros. Prueba quitando alguno o ampliando el precio." : "Aún no hay inmuebles en esta búsqueda. Explora otras ciudades."}
        action={
          <div className="mt-2 grid justify-items-center gap-5">
            {hasFilters && <Button onClick={onClear} variant="dark">Quitar todos los filtros</Button>}
            {cities.length > 0 && (
              <div className="grid justify-items-center gap-3">
                <p className="text-sm font-medium text-ink-3">Ciudades con inmuebles</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {cities.map((c) => <Link key={c.slug} href={`/${OPERATION_SLUG[operation]}?city=${c.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold transition hover:border-ink">{c.name}<span className="text-ink-3">{c.count}</span></Link>)}
                </div>
              </div>
            )}
          </div>
        } />
    </div>
  );
}
