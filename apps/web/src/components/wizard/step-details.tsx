"use client";

import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/form";
import { Icon, Search, X } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { AmenityCategory } from "@/lib/types";
import { ChipRow, CounterField, FieldBlock, NumberField } from "./fields";
import type { StepProps } from "./types";

/* --------------------------- Área con m² / ha --------------------------- */

function AreaField({ label, hint, value, onChange, hectares, id }: { label: string; hint?: string; value: number | null; onChange: (n: number | null) => void; hectares?: boolean; id: string }) {
  const [unit, setUnit] = useState<"m2" | "ha">(hectares && value && value >= 10000 ? "ha" : "m2");
  const shown = value == null ? null : unit === "ha" ? Math.round((value / 10000) * 10000) / 10000 : value;
  return (
    <FieldBlock label={label} hint={hint} htmlFor={id}>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <NumberField id={id} decimal value={shown} suffix={unit === "ha" ? "ha" : "m²"} placeholder={unit === "ha" ? "Ej: 2,5" : "Ej: 85"} max={unit === "ha" ? 99999 : 999999999}
            onChange={(n) => onChange(n == null ? null : unit === "ha" ? Math.round(n * 10000 * 100) / 100 : n)} />
        </div>
        {hectares && (
          <div role="radiogroup" aria-label="Unidad" className="flex shrink-0 rounded-full bg-surface p-1">
            {(["m2", "ha"] as const).map((u) => (
              <button key={u} type="button" role="radio" aria-checked={unit === u} onClick={() => setUnit(u)}
                className={cn("h-10 rounded-full px-4 text-sm font-semibold transition", unit === u ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink")}>{u === "m2" ? "m²" : "ha"}</button>
            ))}
          </div>
        )}
      </div>
    </FieldBlock>
  );
}

/* -------------------------------- Paso 4 -------------------------------- */

export function StepFeatures({ draft, update, traits }: StepProps) {
  const isLandOrFarm = traits.kind === "land" || traits.kind === "farm";
  const roomsRow = traits.rooms || traits.bathrooms || traits.parking;
  return (
    <div className="grid gap-8">
      {roomsRow && (
        <div className="grid gap-3">
          {traits.rooms && <CounterField label="Habitaciones" icon="bed" value={draft.bedrooms} onChange={(n) => update({ bedrooms: n })} max={30} hint="Cuenta solo alcobas." />}
          {traits.bathrooms && <CounterField label="Baños" icon="bath" value={draft.bathrooms} onChange={(n) => update({ bathrooms: n })} max={20} />}
          {traits.parking && <CounterField label="Parqueaderos" icon="car" value={draft.parking} onChange={(n) => update({ parking: n })} max={20} />}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <AreaField id="f-area" label={traits.areaLabel} hint={traits.areaHint} value={draft.area} onChange={(n) => update({ area: n })} hectares={traits.kind === "land"} />
        {traits.landArea && <AreaField id="f-land" label={traits.landAreaLabel} hint={traits.kind === "farm" ? "Puedes escribirla en m² o hectáreas." : "El terreno total, en m²."} value={draft.landArea} onChange={(n) => update({ landArea: n })} hectares={traits.kind === "farm"} />}
      </div>

      {traits.stratum && (
        <FieldBlock label="Estrato" hint="El estrato que aparece en tu factura de servicios.">
          <ChipRow label="Estrato" allowClear value={draft.stratum} onChange={(v) => update({ stratum: v })} options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))} />
        </FieldBlock>
      )}

      {traits.floors && (
        <div className="grid gap-5 sm:grid-cols-2">
          <FieldBlock label="Piso en el que está" htmlFor="f-floor">
            <NumberField id="f-floor" value={draft.floor} max={120} placeholder="Ej: 5" onChange={(n) => update({ floor: n })} />
          </FieldBlock>
          <FieldBlock label="Pisos del edificio" htmlFor="f-floors">
            <NumberField id="f-floors" value={draft.totalFloors} max={120} placeholder="Ej: 12" onChange={(n) => update({ totalFloors: n })} />
          </FieldBlock>
        </div>
      )}

      {traits.age && (
        <FieldBlock label="Antigüedad" htmlFor="f-age" hint="Años desde que se construyó.">
          <div className="flex items-center gap-3">
            <div className="w-40"><NumberField id="f-age" value={draft.ageYears} suffix="años" max={200} placeholder="Ej: 8" onChange={(n) => update({ ageYears: n })} /></div>
            <button type="button" onClick={() => update({ ageYears: 0 })} aria-pressed={draft.ageYears === 0}
              className={cn("h-11 rounded-full border px-4 text-sm font-semibold transition active:scale-95", draft.ageYears === 0 ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-white text-ink hover:border-ink")}>A estrenar</button>
          </div>
        </FieldBlock>
      )}

      {(traits.furnished || traits.pets) && (
        <div className="grid gap-5 rounded-[20px] border border-line bg-white p-4 sm:p-5">
          {traits.furnished && <Switch checked={draft.furnished} onChange={(v) => update({ furnished: v })} label="Amoblado" description="Incluye muebles y electrodomésticos principales." />}
          {traits.furnished && traits.pets && <div className="h-px bg-line" />}
          {traits.pets && <Switch checked={draft.petFriendly} onChange={(v) => update({ petFriendly: v })} label="Admite mascotas" description="Quienes tienen mascota filtran por esto." />}
        </div>
      )}

      {isLandOrFarm && !roomsRow && <p className="text-[14px] text-ink-3">Para lotes solo necesitamos el área. En el siguiente paso puedes marcar servicios y características del entorno.</p>}
    </div>
  );
}

/* -------------------------------- Paso 5 -------------------------------- */

const CAT: Record<AmenityCategory, { title: string; hint: string }> = {
  INTERIOR: { title: "Dentro del inmueble", hint: "Lo que encuentras al entrar" },
  BUILDING: { title: "Edificio y zonas comunes", hint: "Servicios compartidos" },
  EXTERIOR: { title: "Exteriores", hint: "Balcones, terrazas y zonas verdes" },
  SURROUNDINGS: { title: "Alrededores", hint: "Qué hay cerca" },
};
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function StepAmenities({ draft, catalog, update }: StepProps) {
  const [q, setQ] = useState("");
  const sel = useMemo(() => new Set(draft.amenityIds), [draft.amenityIds]);
  const toggle = (id: string) => update({ amenityIds: sel.has(id) ? draft.amenityIds.filter((x) => x !== id) : [...draft.amenityIds, id] });
  const query = norm(q.trim());
  const cats = (Object.keys(CAT) as AmenityCategory[]).map((c) => ({ c, items: catalog.amenities.filter((a) => a.category === c && (!query || norm(a.name).includes(query))) })).filter((g) => g.items.length);

  return (
    <div className="grid gap-7">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: piscina, ascensor, balcón…" aria-label="Buscar comodidades"
            className="h-12 w-full rounded-full border border-field/60 bg-white pl-11 pr-10 text-[15px] placeholder:text-ink-3 hover:border-ink focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
          />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-surface"><X className="h-4 w-4" /></button>}
        </div>
        <p className="text-[14px] font-semibold text-ink-2 tabular" aria-live="polite">{draft.amenityIds.length} {draft.amenityIds.length === 1 ? "seleccionada" : "seleccionadas"}</p>
        {draft.amenityIds.length > 0 && <button type="button" onClick={() => update({ amenityIds: [] })} className="text-[14px] font-semibold text-ink-3 underline-offset-4 hover:text-ink hover:underline">Quitar todas</button>}
      </div>

      {cats.length === 0 && <p className="rounded-2xl bg-surface px-5 py-8 text-center text-[15px] text-ink-2">No encontramos “{q}”. Prueba con otra palabra.</p>}

      {cats.map(({ c, items }) => {
        const n = items.filter((a) => sel.has(a.id)).length;
        return (
          <section key={c} aria-labelledby={`cat-${c}`}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div>
                <h2 id={`cat-${c}`} className="text-[17px] font-semibold text-ink">{CAT[c].title}</h2>
                <p className="text-[13px] text-ink-3">{CAT[c].hint}</p>
              </div>
              {n > 0 && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">{n}</span>}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {items.map((a) => {
                const on = sel.has(a.id);
                return (
                  <button key={a.id} type="button" aria-pressed={on} onClick={() => toggle(a.id)}
                    className={cn("inline-flex h-12 items-center gap-2.5 rounded-full border pl-3.5 pr-5 text-[15px] font-semibold transition-all active:scale-95", on ? "border-brand-700 bg-brand-700 text-white shadow-[0_6px_16px_-8px_rgb(8_79_64/0.7)]" : "border-line-strong bg-white text-ink hover:border-ink")}>
                    <Icon name={a.icon} size={19} className={on ? "text-white" : "text-brand-600"} />{a.name}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
