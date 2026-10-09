"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { formatPriceShort } from "@/lib/format";
import type { Operation, SuggestItem } from "@/lib/types";
import { ChevronDown, Search } from "@/components/ui/icon";
import { Minus } from "@/components/search/icons";
import { Plus } from "@/components/ui/icon";
import { Popover } from "@/components/search/popover";
import { LocationCombobox, type LocationValue } from "@/components/search/location-combobox";
import { PRICE_PRESETS, buildHref } from "@/components/search/query";

type TypeOpt = { slug: string; name: string; pluralName: string };

const OPS: { value: Operation; label: string }[] = [{ value: "SALE", label: "Comprar" }, { value: "RENT", label: "Arrendar" }];

function Cell({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative flex min-w-0 flex-col justify-center rounded-2xl border border-line px-4 py-2.5 transition-colors hover:bg-surface/80 lg:rounded-[20px] lg:border-0 lg:px-5", className)}>
      {label && <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{label}</span>}
      {children}
    </div>
  );
}

export function HeroSearch({ types, popular }: { types: TypeOpt[]; popular: SuggestItem[] }) {
  const router = useRouter();
  const [op, setOp] = useState<Operation>("SALE");
  const [loc, setLoc] = useState<LocationValue | null>(null);
  const [type, setType] = useState("");
  const [beds, setBeds] = useState(0);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [customPrice, setCustomPrice] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildHref(op, { type: type || undefined, city: loc?.city, neighborhood: loc?.neighborhood, bedrooms: beds || undefined, maxPrice }));
  };

  const presets = PRICE_PRESETS[op];
  const setPrice = (n?: number) => { setMaxPrice(n); setCustomPrice(n ? new Intl.NumberFormat("es-CO").format(n) : ""); };

  return (
    <form onSubmit={submit} role="search" aria-label="Buscar inmuebles"
      className="relative z-10 rounded-[28px] border border-white/80 bg-white/95 p-3 shadow-[0_30px_80px_-20px_rgb(6_20_15/0.55)] backdrop-blur-2xl sm:p-4 lg:px-3 lg:pb-3 lg:pt-3">
      {/* Pestañas Comprar / Arrendar */}
      <div role="tablist" aria-label="Operación" className="relative mb-3 flex w-full gap-1 rounded-full bg-surface p-1 lg:mb-1 lg:ml-3 lg:w-auto lg:gap-7 lg:rounded-none lg:bg-transparent lg:p-0">
        {OPS.map((o) => (
          <button key={o.value} type="button" role="tab" aria-selected={op === o.value} onClick={() => { setOp(o.value); setMaxPrice(undefined); setCustomPrice(""); }}
            className={cn("relative flex-1 rounded-full px-5 py-2.5 text-[15px] font-semibold transition-colors lg:flex-none lg:rounded-none lg:px-0 lg:py-2", op === o.value ? "text-ink" : "text-ink-3 hover:text-ink")}>
            {op === o.value && <motion.span layoutId="hero-tab-pill" className="absolute inset-0 rounded-full bg-white shadow-sm lg:hidden" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            {op === o.value && <motion.span layoutId="hero-tab-line" className="absolute inset-x-0 -bottom-0.5 hidden h-[3px] rounded-full bg-brand-600 lg:block" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative">{o.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-[1.55fr_1fr_1fr_1fr_auto] lg:items-stretch lg:gap-0 lg:divide-x lg:divide-line">
        <Cell className="col-span-2 lg:col-span-1">
          <LocationCombobox variant="hero" value={loc} onChange={setLoc} onPickType={setType} popular={popular} placeholder="¿Dónde quieres vivir?" label="Ubicación" />
        </Cell>

        <Cell label="Tipo">
          <label className="relative block">
            <span className="sr-only">Tipo de inmueble</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="h-7 w-full cursor-pointer appearance-none truncate bg-transparent pr-6 text-[16px] font-semibold text-ink focus:outline-none">
              <option value="">Todos</option>
              {types.map((t) => <option key={t.slug} value={t.slug}>{t.pluralName || t.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          </label>
        </Cell>

        <Cell label="Habitaciones">
          <Popover label="Habitaciones" className="static w-full" panelClassName="w-[280px]"
            trigger={(p) => (
              <button type="button" onClick={p.toggle} aria-haspopup={p["aria-haspopup"]} aria-expanded={p["aria-expanded"]} aria-controls={p["aria-controls"]}
                className="flex h-7 w-full items-center justify-between text-left text-[16px] font-semibold text-ink after:absolute after:inset-0 after:content-['']">
                <span className="truncate">{beds ? `${beds}+` : "Cualquiera"}</span><ChevronDown className="h-4 w-4 text-ink-3" />
              </button>
            )}>
            <p className="mb-3 text-sm font-semibold">Habitaciones (mínimo)</p>
            <div className="flex items-center justify-between rounded-2xl border border-line px-3 py-2">
              <button type="button" aria-label="Menos habitaciones" disabled={beds <= 0} onClick={() => setBeds((b) => Math.max(0, b - 1))} className="grid h-9 w-9 place-items-center rounded-full border border-line-strong hover:border-ink disabled:opacity-35"><Minus className="h-4 w-4" /></button>
              <span className="font-display text-3xl tabular" aria-live="polite">{beds ? `${beds}+` : "Todas"}</span>
              <button type="button" aria-label="Más habitaciones" disabled={beds >= 8} onClick={() => setBeds((b) => Math.min(8, b + 1))} className="grid h-9 w-9 place-items-center rounded-full border border-line-strong hover:border-ink disabled:opacity-35"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-pressed={beds === n} onClick={() => setBeds(n)} className={cn("h-9 rounded-full border px-3.5 text-sm font-semibold transition", beds === n ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong hover:border-ink")}>{n === 0 ? "Todas" : `${n}+`}</button>
              ))}
            </div>
          </Popover>
        </Cell>

        <Cell label="Precio máx." className="col-span-2 lg:col-span-1">
          <Popover label="Precio máximo" align="end" className="static w-full" panelClassName="w-[300px] max-w-[calc(100vw-40px)]"
            trigger={(p) => (
              <button type="button" onClick={p.toggle} aria-haspopup={p["aria-haspopup"]} aria-expanded={p["aria-expanded"]} aria-controls={p["aria-controls"]}
                className="flex h-7 w-full items-center justify-between text-left text-[16px] font-semibold text-ink after:absolute after:inset-0 after:content-['']">
                <span className="truncate">{maxPrice ? formatPriceShort(maxPrice) : "Sin límite"}</span><ChevronDown className="h-4 w-4 text-ink-3" />
              </button>
            )}>
            {({ close }) => (
              <>
                <p className="mb-3 text-sm font-semibold">{op === "SALE" ? "Precio máximo de compra" : "Canon máximo mensual"}</p>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" aria-pressed={!maxPrice} onClick={() => { setPrice(undefined); close(); }} className={cn("h-9 rounded-full border px-3.5 text-sm font-semibold transition", !maxPrice ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong hover:border-ink")}>Sin límite</button>
                  {presets.map((v) => (
                    <button key={v} type="button" aria-pressed={maxPrice === v} onClick={() => { setPrice(v); close(); }} className={cn("h-9 rounded-full border px-3.5 text-sm font-semibold tabular transition", maxPrice === v ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong hover:border-ink")}>{formatPriceShort(v)}</button>
                  ))}
                </div>
                <label className="mt-4 grid gap-1.5 text-[13px] font-semibold text-ink-2">
                  O escribe un valor
                  <span className="flex items-center rounded-xl border border-field/60 px-3 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15">
                    <span className="text-ink-3">$</span>
                    <input inputMode="numeric" value={customPrice} placeholder="Ej. 350.000.000"
                      onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 12); setMaxPrice(d ? Number(d) : undefined); setCustomPrice(d ? new Intl.NumberFormat("es-CO").format(Number(d)) : ""); }}
                      className="h-11 w-full bg-transparent pl-2 text-[15px] font-semibold text-ink focus:outline-none" />
                  </span>
                </label>
              </>
            )}
          </Popover>
        </Cell>

        <div className="col-span-2 mt-1 flex lg:col-span-1 lg:mt-0 lg:items-stretch lg:pl-3">
          <button type="submit" className="group inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-brand-600 px-8 text-base font-semibold text-white shadow-[0_12px_28px_-10px_rgb(10_107_80/0.9)] transition-all hover:bg-brand-700 active:scale-[0.97] lg:h-auto lg:min-h-[64px] lg:w-auto">
            <Search className="h-5 w-5 transition-transform group-hover:scale-110" strokeWidth={2.2} />Buscar
          </button>
        </div>
      </div>
    </form>
  );
}
