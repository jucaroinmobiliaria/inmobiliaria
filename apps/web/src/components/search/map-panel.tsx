"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { api, qs } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Catalog, PublicationCard } from "@/lib/types";
import { Photo } from "@/components/ui/photo";
import { Bath, Bed, ChevronLeft, Maximize2 } from "@/components/ui/icon";
import { ResultsMap } from "@/components/map/results-map";
import { stripEmpty, type ResultsQuery } from "./query";

/** Query que viaja a /publications/map (sin paginación ni orden). */
export function toMapQuery(q: ResultsQuery) {
  return stripEmpty({ ...q, view: undefined, page: undefined, sort: undefined, pageSize: undefined });
}

export function usePins(query: ResultsQuery, enabled: boolean) {
  const key = enabled ? `/publications/map${qs(toMapQuery(query))}` : null;
  const { data, isLoading, isValidating } = useSWR<{ items: PublicationCard[] }>(key, (k: string) => api(k), { keepPreviousData: true, revalidateOnFocus: false, shouldRetryOnError: false });
  return { pins: data?.items ?? [], loading: isLoading || isValidating };
}

function centerFor(query: ResultsQuery, catalog: Catalog | null): [number, number] | undefined {
  const c = catalog?.cities.find((x) => x.slug === query.city);
  if (!c) return undefined;
  const h = query.neighborhood ? c.neighborhoods.find((n) => n.slug === query.neighborhood) : undefined;
  return h ? [h.lng, h.lat] : [c.lng, c.lat];
}

export function MapPanel({ query, catalog, pins, loading, activeId, onActive, onApplyBbox, onClearBbox, className, overlay, selectedId, onSelect, onClose, total }: {
  query: ResultsQuery; catalog: Catalog | null; pins: PublicationCard[]; loading: boolean; activeId: string | null; onActive: (id: string | null) => void;
  onApplyBbox: (bbox: string) => void; onClearBbox: () => void; className?: string;
  overlay?: boolean; selectedId?: string | null; onSelect?: (id: string | null) => void; onClose?: () => void; total?: number | null;
}) {
  const center = useMemo(() => centerFor(query, catalog), [query, catalog]);
  return (
    <div className={cn("relative", overlay && "map-overlay", className)}>
      <ResultsMap
        className="h-full w-full" items={pins} loading={loading} activeId={activeId} onActive={onActive} bbox={query.bbox} onSearchArea={onApplyBbox} onClearArea={onClearBbox}
        center={center} zoom={center ? 11.5 : 5} onSelect={overlay ? onSelect : undefined} selectedId={overlay ? selectedId : undefined} padding={overlay ? { bottom: 150, top: 40 } : undefined}
      />
      {overlay && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 pt-[max(12px,env(safe-area-inset-top))]">
            <button type="button" onClick={onClose} className="pointer-events-auto inline-flex h-11 items-center gap-1.5 rounded-full bg-white pl-3 pr-4 text-sm font-semibold shadow-[var(--shadow-pop)] active:scale-95"><ChevronLeft className="h-5 w-5" />Lista</button>
            <span className="pointer-events-auto rounded-full bg-white px-4 py-2.5 text-sm font-semibold shadow-[var(--shadow-pop)]">{loading && !pins.length ? "Cargando…" : `${new Intl.NumberFormat("es-CO").format(pins.length)} en el mapa`}</span>
          </div>
          <OverlayCards items={pins} selectedId={selectedId ?? null} onSelect={(id) => onSelect?.(id)} />
        </>
      )}
    </div>
  );
}

function OverlayCards({ items, selectedId, onSelect }: { items: PublicationCard[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const list = useMemo(() => items.filter((i) => i.lat != null && i.lng != null).slice(0, 60), [items]);

  useEffect(() => {
    if (!selectedId || !box.current) return;
    const el = box.current.querySelector<HTMLElement>(`[data-id="${selectedId}"]`);
    if (!el) return;
    programmatic.current = true;
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    const t = setTimeout(() => { programmatic.current = false; }, 700);
    return () => clearTimeout(t);
  }, [selectedId]);

  const onScroll = () => {
    if (programmatic.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const c = box.current; if (!c) return;
      const mid = c.getBoundingClientRect().left + c.clientWidth / 2;
      let best: { id: string; d: number } | null = null;
      c.querySelectorAll<HTMLElement>("[data-id]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (!best || d < best.d) best = { id: el.dataset.id!, d };
      });
      const b = best as { id: string } | null;
      if (b && b.id !== selectedId) onSelect(b.id);
    }, 140);
  };

  if (!list.length) return null;
  return (
    <div ref={box} onScroll={onScroll} className="no-scrollbar absolute inset-x-0 bottom-0 z-20 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2" aria-label="Inmuebles en el mapa">
      {list.map((it, i) => (
        <motion.div key={it.id} data-id={it.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 5) * 0.04 }}
          className={cn("w-[84vw] max-w-[360px] shrink-0 snap-center overflow-hidden rounded-[22px] bg-white shadow-[var(--shadow-pop)] transition-all", selectedId === it.id ? "ring-2 ring-brand-600" : "")}>
          <Link href={it.path} className="flex gap-3 p-2.5">
            <Photo src={it.coverUrl ?? it.images[0]?.url} alt={it.title} seed={it.code} sizes="120px" widths={[240, 400]} className="h-[104px] w-[112px] shrink-0 rounded-[16px]" />
            <span className="grid min-w-0 flex-1 content-center gap-0.5">
              <span className="font-display text-[1.55rem] leading-none tabular">{formatPrice(it.price, it.currency)}{it.operation === "RENT" && <span className="ml-1 font-sans text-xs text-ink-3">/ mes</span>}</span>
              <span className="line-clamp-1 text-[14px] font-semibold">{it.title}</span>
              <span className="line-clamp-1 text-[13px] text-ink-3">{[it.neighborhood?.name, it.city.name].filter(Boolean).join(", ")}</span>
              <span className="mt-1 flex items-center gap-3 text-[13px] text-ink-2">
                {it.bedrooms != null && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{it.bedrooms}</span>}
                {it.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{it.bathrooms}</span>}
                {it.area != null && <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{Math.round(it.area)} m²</span>}
              </span>
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
