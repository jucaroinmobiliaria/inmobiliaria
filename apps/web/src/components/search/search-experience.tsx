"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { api, qs } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { OPERATION_LABEL } from "@/lib/site";
import type { Catalog, LandingData, PublicationCard, SearchResult } from "@/lib/types";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { MapIcon } from "@/components/ui/icon";
import { Columns2, LayoutGrid, List } from "./icons";
import { useCatalog, useMediaQuery } from "./hooks";
import { FilterBar, OperationToggle } from "./filter-bar";
import { FilterDrawer } from "./filter-drawer";
import type { FilterCtx } from "./filter-sections";
import type { LocationValue } from "./location-combobox";
import { MapPanel, usePins } from "./map-panel";
import { ActiveFilters, EmptyResults, Pagination, SaveSearch, buildActiveChips, type ActiveChip } from "./results-parts";
import { PAGE_SIZE, SORTS, buildHref, countFilters, queryFromUrl, stripEmpty, toApiQuery, type ResultsQuery, type View } from "./query";

type Props = {
  initial: SearchResult | null;
  initialKey: string;
  catalog: Catalog | null;
  landing: LandingData | null;
  /** H1 + texto SEO renderizados en el servidor */
  intro: ReactNode;
  /** Búsquedas relacionadas (servidor) */
  outro?: ReactNode;
};

const unslug = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const searchFetcher = (k: string) => api<SearchResult>(k);

export function SearchExperience({ initial, initialKey, catalog, landing, intro, outro }: Props) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const cat = useCatalog(catalog);

  const segs = useMemo(() => pathname.split("/").filter(Boolean), [pathname]);
  const query = useMemo(() => queryFromUrl(segs[0] ?? "venta", segs.slice(1), sp), [segs, sp]);
  const operation = query.operation ?? "SALE";
  const queryRef = useRef(query);
  useEffect(() => { queryRef.current = query; });

  /* ---------- URL como fuente de verdad ---------- */
  const set = useCallback((patch: Partial<ResultsQuery>, opts?: { push?: boolean }) => {
    const next = stripEmpty({ ...queryRef.current, ...patch });
    if (!("page" in patch)) delete next.page;
    const href = buildHref(next.operation ?? "SALE", next);
    const current = window.location.pathname + window.location.search;
    if (href === current) return;
    queryRef.current = next;
    if (href.split("?")[0] !== window.location.pathname) startTransition(() => router.push(href, { scroll: false }));
    else window.history[opts?.push ? "pushState" : "replaceState"](null, "", href);
  }, [router]);

  const clearAll = useCallback(() => {
    set({ q: undefined, minPrice: undefined, maxPrice: undefined, bedrooms: undefined, bathrooms: undefined, parking: undefined, minArea: undefined, maxArea: undefined, stratum: undefined, amenities: undefined, condition: undefined, furnished: undefined, petFriendly: undefined, withVideo: undefined, withTour: undefined, featured: undefined, bbox: undefined, type: undefined }, { push: true });
  }, [set]);

  /* ---------- Datos (SWR) ---------- */
  const key = `/publications${qs(toApiQuery(query))}`;
  const isInitial = key === initialKey;
  const { data, error, isLoading, isValidating, mutate } = useSWR<SearchResult>(key, searchFetcher, {
    fallbackData: isInitial ? (initial ?? undefined) : undefined, keepPreviousData: true, revalidateOnFocus: false, revalidateOnMount: isInitial && initial ? false : undefined, shouldRetryOnError: false,
  });
  const stale = isValidating && !isLoading;

  // "Mostrar más": páginas adicionales acumuladas (se reinician con cualquier cambio de consulta)
  const [more, setMore] = useState<{ key: string; pages: PublicationCard[][]; loading: boolean }>({ key, pages: [], loading: false });
  const extra = more.key === key ? more.pages : [];
  const currentPage = (query.page ?? 1) + extra.length;
  const loadMore = async () => {
    if (!data) return;
    setMore((m) => ({ key, pages: m.key === key ? m.pages : [], loading: true }));
    try {
      const r = await api<SearchResult>(`/publications${qs(toApiQuery(query, { page: currentPage + 1 }))}`);
      setMore((m) => ({ key, pages: [...(m.key === key ? m.pages : []), r.items], loading: false }));
    } catch { setMore((m) => ({ ...m, loading: false })); }
  };

  const items = useMemo(() => {
    const seen = new Set<string>();
    return [...(data?.items ?? []), ...extra.flat()].filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  }, [data, extra]);
  const total = data?.total ?? null;

  /* ---------- Vista / mapa ---------- */
  const desktop = useMediaQuery("(min-width: 1024px)");
  const view: View = query.view ?? "mixto";
  const showMapCol = view !== "lista";
  const [mapOpen, setMapOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapEnabled = (desktop === true && showMapCol) || mapOpen;
  const { pins, loading: pinsLoading } = usePins(query, mapEnabled);
  const applyBbox = (bbox: string) => set({ bbox, city: undefined, neighborhood: undefined }, { push: true });

  useEffect(() => { if (desktop) setMapOpen(false); }, [desktop]);
  useEffect(() => {
    if (!mapOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mapOpen]);
  useEffect(() => { if (mapOpen && pins.length && !selectedId) setSelectedId(pins.find((p) => p.lat != null)?.id ?? null); }, [mapOpen, pins, selectedId]);

  /* ---------- Ubicación ---------- */
  const location = useMemo<LocationValue | null>(() => {
    const c = cat?.cities.find((x) => x.slug === query.city);
    if (query.neighborhood) {
      const h = c?.neighborhoods.find((x) => x.slug === query.neighborhood);
      return { city: query.city, neighborhood: query.neighborhood, label: h?.name ?? unslug(query.neighborhood), sublabel: c?.name };
    }
    if (query.city) return { city: query.city, label: c?.name ?? unslug(query.city), sublabel: c?.department };
    return null;
  }, [cat, query.city, query.neighborhood]);

  /* ---------- Filtros ---------- */
  const [drawer, setDrawer] = useState(false);
  const ctx: FilterCtx = useMemo(() => ({ q: query, operation, set: (p) => set(p), catalog: cat, facets: data?.facets?.types }), [query, operation, set, cat, data?.facets]);
  const chips = useMemo(() => buildActiveChips(query, cat), [query, cat]);
  const activeCount = countFilters(query);
  const onClearChip = (c: ActiveChip) => set(c.clear);

  const saveName = landing?.title ?? `${OPERATION_LABEL[operation]} en ${location?.label ?? "Colombia"}`;

  const goPage = (p: number) => {
    set({ page: p > 1 ? p : undefined }, { push: true });
    requestAnimationFrame(() => document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const showSkeleton = isLoading && !data;
  const remaining = total != null ? Math.max(0, total - items.length) : 0;
  const wide = view === "lista";
  const gridCols = showMapCol ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div>
      <FilterBar ctx={ctx} location={location} onLocation={(v) => set({ city: v?.city, neighborhood: v?.neighborhood, bbox: undefined }, { push: true })} onPickType={(slug) => set({ type: slug }, { push: true })} onOpenDrawer={() => setDrawer(true)} />

      <div className="container-x">
        {intro}

        {/* Barra de resultados */}
        <div id="resultados" className="scroll-mt-[150px] border-t border-line pt-5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="flex items-center gap-3">
              <OperationToggle operation={operation} query={query} className="md:hidden" />
              <p className="text-[15px] text-ink-2" aria-live="polite">
                {total == null ? (isLoading ? <span className="skeleton inline-block h-5 w-32 align-middle" /> : "—") : (
                  <><span className="font-display text-[1.9rem] leading-none text-ink tabular">{formatNumber(total)}</span> <span className="ml-0.5">{total === 1 ? "inmueble" : "inmuebles"}</span></>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <SaveSearch query={query} defaultName={saveName} />
              <label className="relative">
                <span className="sr-only">Ordenar por</span>
                <select value={query.sort ?? "relevance"} onChange={(e) => set({ sort: e.target.value === "relevance" ? undefined : (e.target.value as ResultsQuery["sort"]) }, { push: true })}
                  className="h-11 cursor-pointer appearance-none rounded-full border border-line-strong bg-white pl-4 pr-9 text-sm font-semibold text-ink transition hover:border-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/15">
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
              </label>
              <div role="group" aria-label="Vista" className="hidden items-center rounded-full bg-surface p-1 lg:flex">
                {([["lista", "Lista", List], ["mixto", "Mixto", Columns2], ["mapa", "Mapa", MapIcon]] as const).map(([v, l, Ico]) => (
                  <button key={v} type="button" aria-pressed={view === v} onClick={() => set({ view: v === "mixto" ? undefined : v })}
                    className={cn("relative inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors", view === v ? "text-white" : "text-ink-2 hover:text-ink")}>
                    {view === v && <motion.span layoutId="view-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    <Ico className="relative h-4 w-4" /><span className="relative">{l}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {chips.length > 0 && <div className="mt-4"><ActiveFilters chips={chips} onClear={onClearChip} onClearAll={clearAll} /></div>}
        </div>

        {/* Lista + mapa */}
        <div className={cn("mt-6 lg:grid lg:gap-8", view === "mixto" && "lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)]", view === "mapa" && "lg:grid-cols-1", view === "lista" && "lg:grid-cols-1")}>
          <div className={cn("min-w-0", view === "mapa" && "lg:hidden")}>
            <div className="relative">
              {(stale || pending) && <div className="absolute inset-x-0 -top-2 z-10 h-1 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-label="Actualizando resultados"><div className="h-full w-1/3 animate-[shimmer_1.1s_linear_infinite] rounded-full bg-brand-600" style={{ backgroundImage: "none" }} /></div>}
              <div className={cn("grid gap-x-6 gap-y-10 transition-opacity duration-300", gridCols, wide && "lg:grid-cols-3", (stale || pending) && "pointer-events-none opacity-60")}>
                {showSkeleton && Array.from({ length: 6 }).map((_, i) => <PropertyCardSkeleton key={i} />)}
                {!showSkeleton && items.map((it, i) => (
                  <PropertyCard key={it.id} item={it} priority={i < 2} active={activeId === it.id} onHover={setActiveId} sizes={showMapCol ? "(min-width:1024px) 26vw, 92vw" : "(min-width:1280px) 30vw, 45vw"} />
                ))}
                {!showSkeleton && !items.length && <EmptyResults operation={operation} hasFilters={activeCount > 0} onClear={clearAll} catalog={cat} error={!!error && !data} onRetry={() => void mutate()} />}
              </div>
            </div>

            {items.length > 0 && data && (
              <div className="mt-14 grid justify-items-center gap-6">
                {remaining > 0 && (
                  <Button variant="outline" size="lg" onClick={() => void loadMore()} loading={more.loading}>
                    Mostrar más <span className="font-normal text-ink-3">({formatNumber(Math.min(remaining, PAGE_SIZE))} de {formatNumber(remaining)} restantes)</span>
                  </Button>
                )}
                <Pagination page={currentPage} totalPages={data.totalPages} onPage={goPage} />
                <p className="text-sm text-ink-3">Mostrando {formatNumber(items.length)} de {formatNumber(data.total)}</p>
              </div>
            )}
          </div>

          {/* Mapa (escritorio) */}
          {showMapCol && (
            <div className={cn("hidden lg:block", view === "mapa" && "lg:col-span-1")}>
              <div className="sticky top-[156px] h-[calc(100dvh-156px-16px)] min-h-[420px] overflow-hidden rounded-[24px] border border-line bg-surface">
                {desktop && (
                  <MapPanel className="h-full" query={query} catalog={cat} pins={pins} loading={pinsLoading} activeId={activeId} onActive={setActiveId} onApplyBbox={applyBbox} onClearBbox={() => set({ bbox: undefined }, { push: true })} />
                )}
              </div>
            </div>
          )}
        </div>

        {outro}
      </div>

      {/* Botón flotante "Mapa" (móvil) */}
      <AnimatePresence>
        {!mapOpen && (
          <motion.button type="button" onClick={() => setMapOpen(true)} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            className="fixed bottom-[88px] left-1/2 z-40 inline-flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-white shadow-[var(--shadow-pop)] active:scale-95 lg:hidden">
            <MapIcon className="h-[18px] w-[18px]" />Mapa
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mapOpen && (
          <motion.div key="map-overlay" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="fixed inset-0 z-[90] bg-white lg:hidden">
            <MapPanel className="h-full" overlay query={query} catalog={cat} pins={pins} loading={pinsLoading} activeId={activeId} onActive={setActiveId} selectedId={selectedId} onSelect={setSelectedId}
              onApplyBbox={applyBbox} onClearBbox={() => set({ bbox: undefined }, { push: true })} onClose={() => setMapOpen(false)} total={total} />
          </motion.div>
        )}
      </AnimatePresence>

      <FilterDrawer open={drawer} onClose={() => setDrawer(false)} ctx={ctx} total={total} activeCount={activeCount} onClear={clearAll} />
    </div>
  );
}
