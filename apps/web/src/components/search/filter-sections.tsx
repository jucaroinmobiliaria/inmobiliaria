"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { AmenityCategory, Catalog, Condition, Operation } from "@/lib/types";
import { Icon, Check } from "@/components/ui/icon";
import { Switch } from "@/components/ui/form";
import { Minus, ChevronUp } from "./icons";
import { Plus } from "@/components/ui/icon";
import { PriceRange } from "./price-range";
import type { ResultsQuery } from "./query";

export type FilterCtx = {
  q: ResultsQuery;
  operation: Operation;
  set: (patch: Partial<ResultsQuery>) => void;
  catalog: Catalog | null;
  facets?: { slug: string; name: string; count: number }[];
};

export const csv = (s?: string) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
const toCsv = (a: string[]) => (a.length ? a.join(",") : undefined);

export function Pill({ active, onClick, children, className }: { active?: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn("inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-all active:scale-95",
        active ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-white text-ink hover:border-ink", className)}>
      {children}
    </button>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h3 className="text-[15px] font-semibold text-ink">{children}</h3>
      {hint && <span className="text-[13px] text-ink-3">{hint}</span>}
    </div>
  );
}

/* ---------- Tipo ---------- */
export function TypeSection({ ctx, compact }: { ctx: FilterCtx; compact?: boolean }) {
  const sel = csv(ctx.q.type);
  const list = ctx.catalog?.types ?? [];
  const toggle = (slug: string) => ctx.set({ type: toCsv(sel.includes(slug) ? sel.filter((s) => s !== slug) : [...sel, slug]) });
  if (!list.length) return <p className="text-sm text-ink-3">Cargando tipos…</p>;
  return (
    <div>
      {!compact && <SectionTitle>Tipo de inmueble</SectionTitle>}
      <div className="flex flex-wrap gap-2">
        {list.map((t) => {
          const count = ctx.facets?.find((f) => f.slug === t.slug)?.count;
          return (
            <Pill key={t.slug} active={sel.includes(t.slug)} onClick={() => toggle(t.slug)}>
              <Icon name={t.icon} size={16} />{t.name}{count != null && <span className={cn("text-xs font-medium tabular", sel.includes(t.slug) ? "text-white/70" : "text-ink-3")}>{count}</span>}
            </Pill>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Precio ---------- */
export function PriceSection({ ctx, compact }: { ctx: FilterCtx; compact?: boolean }) {
  return (
    <div>
      {!compact && <SectionTitle hint={ctx.operation === "RENT" ? "Canon mensual" : "Precio de venta"}>Precio</SectionTitle>}
      <PriceRange operation={ctx.operation} min={ctx.q.minPrice} max={ctx.q.maxPrice} onChange={ctx.set} />
    </div>
  );
}

/* ---------- Contadores mínimos ---------- */
export function MinStepper({ label, value, onChange, max = 8 }: { label: string; value?: number; onChange: (n: number | undefined) => void; max?: number }) {
  const v = value ?? 0;
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[15px] font-medium text-ink">{label}</span>
      <div className="flex items-center gap-2.5">
        <button type="button" aria-label={`Menos ${label.toLowerCase()}`} disabled={v <= 0} onClick={() => onChange(v - 1 <= 0 ? undefined : v - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-line-strong transition hover:border-ink disabled:opacity-35"><Minus className="h-4 w-4" /></button>
        <span className="w-[74px] text-center text-[15px] font-semibold tabular" aria-live="polite">{v ? `${v}+` : "Cualquiera"}</span>
        <button type="button" aria-label={`Más ${label.toLowerCase()}`} disabled={v >= max} onClick={() => onChange(v + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-line-strong transition hover:border-ink disabled:opacity-35"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export function RoomsSection({ ctx, compact }: { ctx: FilterCtx; compact?: boolean }) {
  return (
    <div>
      {!compact && <SectionTitle hint="Mínimo">Habitaciones y espacios</SectionTitle>}
      <div className="grid gap-4">
        <MinStepper label="Habitaciones" value={ctx.q.bedrooms} onChange={(n) => ctx.set({ bedrooms: n })} />
        <MinStepper label="Baños" value={ctx.q.bathrooms} onChange={(n) => ctx.set({ bathrooms: n })} />
        <MinStepper label="Parqueaderos" value={ctx.q.parking} onChange={(n) => ctx.set({ parking: n })} max={6} />
      </div>
    </div>
  );
}

/* ---------- Área ---------- */
export function AreaSection({ ctx }: { ctx: FilterCtx }) {
  const [a, setA] = useState(ctx.q.minArea ? String(ctx.q.minArea) : "");
  const [b, setB] = useState(ctx.q.maxArea ? String(ctx.q.maxArea) : "");
  const apply = () => {
    const x = a ? Number(a) : undefined, y = b ? Number(b) : undefined;
    ctx.set(x !== undefined && y !== undefined && x > y ? { minArea: y, maxArea: x } : { minArea: x, maxArea: y });
  };
  return (
    <div>
      <SectionTitle hint="m²">Área construida</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {([["Mínima", a, setA], ["Máxima", b, setB]] as const).map(([l, v, s]) => (
          <label key={l} className="grid gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            {l}
            <span className="flex items-center rounded-xl border border-field/60 px-3 transition focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15">
              <input inputMode="numeric" value={v} placeholder="—" onChange={(e) => s(e.target.value.replace(/\D/g, "").slice(0, 5))} onBlur={apply} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
                className="h-11 w-full min-w-0 bg-transparent text-[15px] font-semibold normal-case tracking-normal text-ink focus:outline-none" />
              <span className="text-sm text-ink-3">m²</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ---------- Estrato ---------- */
export function StratumSection({ ctx }: { ctx: FilterCtx }) {
  const sel = csv(ctx.q.stratum);
  const toggle = (n: string) => ctx.set({ stratum: toCsv(sel.includes(n) ? sel.filter((s) => s !== n) : [...sel, n].sort()) });
  return (
    <div>
      <SectionTitle hint="Puedes elegir varios">Estrato</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {["1", "2", "3", "4", "5", "6"].map((n) => <Pill key={n} active={sel.includes(n)} onClick={() => toggle(n)} className="w-12 justify-center px-0">{n}</Pill>)}
      </div>
    </div>
  );
}

/* ---------- Comodidades ---------- */
const CAT_LABEL: Record<AmenityCategory, string> = { INTERIOR: "Interior", BUILDING: "Edificio y conjunto", EXTERIOR: "Exteriores", SURROUNDINGS: "Alrededores" };
export function AmenitiesSection({ ctx }: { ctx: FilterCtx }) {
  const [more, setMore] = useState(false);
  const sel = csv(ctx.q.amenities);
  const all = ctx.catalog?.amenities ?? [];
  if (!all.length) return null;
  const toggle = (slug: string) => ctx.set({ amenities: toCsv(sel.includes(slug) ? sel.filter((s) => s !== slug) : [...sel, slug]) });
  const cats = (Object.keys(CAT_LABEL) as AmenityCategory[]).map((c) => ({ c, items: all.filter((a) => a.category === c) })).filter((g) => g.items.length);
  const shown = more ? cats : cats.slice(0, 2);
  return (
    <div>
      <SectionTitle hint="Deben cumplirse todas">Comodidades</SectionTitle>
      <div className="grid gap-5">
        {shown.map((g) => (
          <fieldset key={g.c}>
            <legend className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-3">{CAT_LABEL[g.c]}</legend>
            <div className="flex flex-wrap gap-2">
              {g.items.map((a) => {
                const on = sel.includes(a.slug);
                return (
                  <button key={a.slug} type="button" aria-pressed={on} onClick={() => toggle(a.slug)}
                    className={cn("inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition active:scale-95", on ? "border-brand-700 bg-brand-50 text-brand-800" : "border-line-strong hover:border-ink")}>
                    {on ? <Check className="h-4 w-4 text-brand-700" strokeWidth={3} /> : <Icon name={a.icon} size={16} className="text-ink-3" />}{a.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      {cats.length > 2 && (
        <button type="button" onClick={() => setMore((m) => !m)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
          {more ? "Ver menos" : "Ver todas las comodidades"}<ChevronUp className={cn("h-4 w-4 transition-transform", !more && "rotate-180")} />
        </button>
      )}
    </div>
  );
}

/* ---------- Estado ---------- */
export function ConditionSection({ ctx }: { ctx: FilterCtx }) {
  const opts: { v: Condition | undefined; l: string }[] = [{ v: undefined, l: "Cualquiera" }, { v: "NEW", l: "Nuevo" }, { v: "USED", l: "Usado" }, { v: "OFF_PLAN", l: "Sobre planos" }];
  return (
    <div>
      <SectionTitle>Estado del inmueble</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {opts.map((o) => <Pill key={o.l} active={ctx.q.condition === o.v} onClick={() => ctx.set({ condition: o.v })}>{o.l}</Pill>)}
      </div>
    </div>
  );
}

/* ---------- Extras ---------- */
export function ExtrasSection({ ctx }: { ctx: FilterCtx }) {
  return (
    <div>
      <SectionTitle>Extras</SectionTitle>
      <div className="grid gap-5">
        <Switch label="Amoblado" description="Con muebles y electrodomésticos" checked={!!ctx.q.furnished} onChange={(v) => ctx.set({ furnished: v || undefined })} />
        <Switch label="Acepta mascotas" description="Pet friendly" checked={!!ctx.q.petFriendly} onChange={(v) => ctx.set({ petFriendly: v || undefined })} />
        <Switch label="Con video" description="Recorrido en video del inmueble" checked={!!ctx.q.withVideo} onChange={(v) => ctx.set({ withVideo: v || undefined })} />
        <Switch label="Con tour virtual 360°" description="Recórrelo desde tu casa" checked={!!ctx.q.withTour} onChange={(v) => ctx.set({ withTour: v || undefined })} />
        <Switch label="Solo destacados" checked={!!ctx.q.featured} onChange={(v) => ctx.set({ featured: v || undefined })} />
      </div>
    </div>
  );
}
