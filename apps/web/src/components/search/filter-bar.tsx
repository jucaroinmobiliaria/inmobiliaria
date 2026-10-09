"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { formatPriceShort } from "@/lib/format";
import { OPERATION_SLUG } from "@/lib/site";
import type { Operation } from "@/lib/types";
import { ChevronDown, SlidersHorizontal } from "@/components/ui/icon";
import { Popover } from "./popover";
import { LocationCombobox, type LocationValue } from "./location-combobox";
import { AreaSection, PriceSection, RoomsSection, TypeSection, csv, type FilterCtx } from "./filter-sections";
import { buildHref, countFilters, type ResultsQuery } from "./query";

function FilterChip({ active, label, p }: { active: boolean; label: ReactNode; p: { toggle: () => void; open: boolean; "aria-haspopup": "dialog"; "aria-expanded": boolean; "aria-controls": string } }) {
  return (
    <button type="button" onClick={p.toggle} aria-haspopup={p["aria-haspopup"]} aria-expanded={p["aria-expanded"]} aria-controls={p["aria-controls"]}
      className={cn("inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-all active:scale-95",
        active ? "border-brand-700 bg-brand-50 text-brand-800" : "border-line-strong bg-white text-ink hover:border-ink", p.open && "border-ink shadow-[var(--shadow-card)]")}>
      <span className="max-w-[170px] truncate">{label}</span><ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", p.open && "rotate-180")} />
    </button>
  );
}

export function OperationToggle({ operation, query, className }: { operation: Operation; query: ResultsQuery; className?: string }) {
  const router = useRouter();
  const go = (op: Operation) => {
    if (op === operation) return;
    router.push(buildHref(op, { ...query, minPrice: undefined, maxPrice: undefined, page: undefined, bbox: query.bbox, sort: query.sort }));
  };
  return (
    <div role="tablist" aria-label="Operación" className={cn("inline-flex rounded-full bg-surface p-1", className)}>
      {(["SALE", "RENT"] as const).map((op) => (
        <button key={op} type="button" role="tab" aria-selected={operation === op} onClick={() => go(op)}
          className={cn("h-9 rounded-full px-4 text-sm font-semibold transition-colors duration-200", operation === op ? "bg-ink text-white" : "text-ink-2 hover:text-ink")}>
          {op === "SALE" ? "Comprar" : "Arrendar"}
        </button>
      ))}
      <span className="sr-only">{OPERATION_SLUG[operation]}</span>
    </div>
  );
}

export function FilterBar({ ctx, location, onLocation, onPickType, onOpenDrawer }: {
  ctx: FilterCtx; location: LocationValue | null; onLocation: (v: LocationValue | null) => void; onPickType: (slug: string) => void; onOpenDrawer: () => void;
}) {
  const { q, operation, catalog } = ctx;
  const types = csv(q.type);
  const typeLabel = types.length === 1 ? (catalog?.types.find((t) => t.slug === types[0])?.name ?? "Tipo") : types.length > 1 ? `Tipo · ${types.length}` : "Tipo";
  const priceActive = q.minPrice !== undefined || q.maxPrice !== undefined;
  const priceLabel = !priceActive ? "Precio" : q.minPrice && q.maxPrice ? `${formatPriceShort(q.minPrice)} – ${formatPriceShort(q.maxPrice)}` : q.maxPrice ? `Hasta ${formatPriceShort(q.maxPrice)}` : `Desde ${formatPriceShort(q.minPrice)}`;
  const rooms = [q.bedrooms ? `${q.bedrooms}+ hab.` : "", q.bathrooms ? `${q.bathrooms}+ baños` : "", q.parking ? `${q.parking}+ parq.` : ""].filter(Boolean);
  const roomsLabel = rooms.length ? rooms.join(" · ") : "Habitaciones";
  const moreCount = countFilters({ ...q, bbox: undefined });

  return (
    <div className="sticky top-[68px] z-40 border-b border-line bg-white/90 backdrop-blur-xl">
      <div className="container-x flex h-[72px] items-center gap-3">
        <OperationToggle operation={operation} query={q} className="hidden md:inline-flex" />
        <LocationCombobox className="min-w-0 flex-1 lg:w-[240px] lg:flex-none xl:w-[300px]" value={location} onChange={onLocation} onPickType={onPickType} placeholder="Ciudad, barrio o código" />
        <div className="hidden items-center gap-2 lg:flex">
          <Popover label="Filtrar por tipo" panelClassName="w-[360px]" trigger={(p) => <FilterChip p={p} active={types.length > 0} label={typeLabel} />}>
            <TypeSection ctx={ctx} compact />
          </Popover>
          <Popover label="Filtrar por precio" panelClassName="w-[380px]" trigger={(p) => <FilterChip p={p} active={priceActive} label={priceLabel} />}>
            <PriceSection ctx={ctx} compact />
          </Popover>
          <Popover label="Habitaciones, baños y parqueaderos" panelClassName="w-[360px]" className="hidden xl:block" trigger={(p) => <FilterChip p={p} active={rooms.length > 0} label={roomsLabel} />}>
            <RoomsSection ctx={ctx} compact />
          </Popover>
          <Popover label="Área" panelClassName="w-[340px]" className="hidden 2xl:block" trigger={(p) => <FilterChip p={p} active={q.minArea !== undefined || q.maxArea !== undefined} label={q.minArea || q.maxArea ? `${q.minArea ?? 0}–${q.maxArea ?? "∞"} m²` : "Área"} />}>
            <AreaSection ctx={ctx} />
          </Popover>
        </div>
        <button type="button" onClick={onOpenDrawer}
          className={cn("relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all active:scale-95", moreCount > 0 ? "border-ink bg-ink text-white" : "border-line-strong bg-white hover:border-ink")}>
          <SlidersHorizontal className="h-[18px] w-[18px]" /><span className="hidden sm:inline">Más filtros</span><span className="sm:hidden">Filtros</span>
          {moreCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-ink">{moreCount}</span>}
        </button>
      </div>
    </div>
  );
}
