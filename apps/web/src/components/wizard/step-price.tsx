"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { Switch } from "@/components/ui/form";
import { fetcher, qs } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatPrice, formatPriceShort, plural } from "@/lib/format";
import type { SearchResult } from "@/lib/types";
import { Callout, ChipRow, FieldBlock, MoneyInput, NumberField, SectionTitle } from "./fields";
import type { StepProps } from "./types";
import { priceInWords } from "./words";
import { CalendarDays, TrendingUp } from "@/components/uploader/icons";

/* ------------------------- Referencia de mercado ------------------------- */

const quantile = (sorted: number[], q: number) => {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
};

function MarketHint({ draft, type, city }: Pick<StepProps, "draft" | "type" | "city">) {
  const hood = city?.neighborhoods.find((n) => n.id === draft.neighborhoodId);
  const base = type && city ? { operation: draft.operation, type: type.slug, city: city.slug, pageSize: 24 } : null;
  const hoodKey = base && hood ? `/publications${qs({ ...base, neighborhood: hood.slug })}` : null;
  const cityKey = base ? `/publications${qs(base)}` : null;
  const { data: hoodData, isLoading: l1 } = useSWR<SearchResult>(hoodKey, fetcher, { revalidateOnFocus: false, shouldRetryOnError: false, dedupingInterval: 60_000 });
  const { data: cityData, isLoading: l2 } = useSWR<SearchResult>(cityKey, fetcher, { revalidateOnFocus: false, shouldRetryOnError: false, dedupingInterval: 60_000 });

  const stats = useMemo(() => {
    const pick = (d?: SearchResult) => (d?.items ?? []).filter((i) => i.currency === "COP" && i.price > 0);
    let items = pick(hoodData);
    let scope = hood ? hood.name : city?.name ?? "";
    if (items.length < 4) { items = pick(cityData); scope = city?.name ?? ""; }
    if (items.length < 3) return null;
    const prices = items.map((i) => i.price).sort((a, b) => a - b);
    const m2 = items.filter((i) => i.area && i.area > 0).map((i) => i.price / i.area!).sort((a, b) => a - b);
    return { n: items.length, scope, p10: quantile(prices, 0.1), p25: quantile(prices, 0.25), median: quantile(prices, 0.5), p75: quantile(prices, 0.75), p90: quantile(prices, 0.9), m2: m2.length >= 3 ? quantile(m2, 0.5) : null };
  }, [hoodData, cityData, hood, city]);

  if (!type || !city) return null;
  if (l1 || l2) return <div className="skeleton h-32 w-full rounded-[24px]" aria-hidden />;
  if (!stats) return null;

  const price = draft.currency === "COP" ? draft.price : 0;
  const lo = Math.min(stats.p10, price || stats.p10) * 0.92;
  const hi = Math.max(stats.p90, price || stats.p90) * 1.06;
  const at = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
  const perM2 = price && draft.area ? price / draft.area : null;
  const verdict = !price ? null : price < stats.p25 ? "por debajo de lo habitual" : price > stats.p75 ? "por encima de lo habitual" : "dentro del rango habitual";

  return (
    <div className="rounded-[24px] border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-sm"><TrendingUp className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">Referencia de mercado</p>
          <p className="text-[13.5px] leading-snug text-ink-2">
            {plural(stats.n, "aviso similar", "avisos similares")} en {stats.scope}: la mayoría entre <b className="font-semibold text-ink">{formatPriceShort(stats.p25)}</b> y <b className="font-semibold text-ink">{formatPriceShort(stats.p75)}</b>{draft.operation === "RENT" ? " al mes" : ""}.
          </p>
        </div>
      </div>

      <div className="relative mt-6 h-10" aria-hidden>
        <div className="absolute inset-x-0 top-4 h-2 rounded-full bg-surface-2" />
        <div className="absolute top-4 h-2 rounded-full bg-brand-200" style={{ left: at(stats.p25), width: `calc(${at(stats.p75)} - ${at(stats.p25)})` }} />
        <div className="absolute top-2.5 h-5 w-0.5 rounded bg-brand-700" style={{ left: at(stats.median) }} />
        <span className="absolute top-[-4px] -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-brand-700" style={{ left: at(stats.median) }}>mediana {formatPriceShort(stats.median)}</span>
        {price > 0 && (
          <span className="absolute top-3 grid h-4 w-4 -translate-x-1/2 place-items-center rounded-full border-[3px] border-white bg-ink shadow" style={{ left: at(price) }}><span className="sr-only">Tu precio</span></span>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[11.5px] text-ink-3" aria-hidden><span>{formatPriceShort(lo)}</span><span>{formatPriceShort(hi)}</span></div>

      <div className="mt-3 space-y-1 text-[13.5px] text-ink-2" aria-live="polite">
        {verdict && <p>Tu precio está <b className="font-semibold text-ink">{verdict}</b>. Es solo una referencia: tú conoces tu inmueble.</p>}
        {stats.m2 && <p>Por m²: similares ≈ {formatPriceShort(stats.m2)}{perM2 ? <> · el tuyo ≈ <b className="font-semibold text-ink">{formatPriceShort(perM2)}</b></> : null}.</p>}
      </div>
    </div>
  );
}

/* -------------------------------- Paso 7 -------------------------------- */

export function StepPrice({ draft, update, errors, traits, type, city }: StepProps) {
  const rent = draft.operation === "RENT";
  const words = draft.price > 0 ? priceInWords(draft.price, draft.currency) : "";
  const low = draft.currency === "COP" && draft.price > 0 && ((!rent && draft.price < 1_000_000) || (rent && draft.price < 50_000));
  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="price" className="text-[15px] font-semibold text-ink">{rent ? "Canon de arriendo mensual" : "Precio de venta"}</label>
          <div role="radiogroup" aria-label="Moneda" className="flex rounded-full bg-surface p-1">
            {(["COP", "USD"] as const).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={draft.currency === c} onClick={() => update({ currency: c })}
                className={cn("h-10 rounded-full px-5 text-sm font-semibold transition", draft.currency === c ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink")}>
                {c === "COP" ? "Pesos (COP)" : "Dólares (USD)"}
              </button>
            ))}
          </div>
        </div>
        <MoneyInput id="price" large value={draft.price || null} currency={draft.currency} invalid={!!errors.price} ariaDescribedBy="price-words" onChange={(n) => update({ price: n ?? 0 })} />
        <p id="price-words" className="min-h-[1.4rem] text-[15px] font-medium text-brand-700" aria-live="polite">{words || (errors.price ? "" : <span className="font-normal text-ink-3">Escribe el valor y te lo mostramos en letras.</span>)}</p>
        {errors.price && <p role="alert" className="-mt-1 text-[13px] font-medium text-danger">{errors.price}</p>}
        {low && <Callout tone="warn">Ese valor parece muy bajo. Revisa que no falten ceros{draft.currency === "COP" ? ": 1.000.000 = un millón" : ""}.</Callout>}
      </div>

      <div className="grid gap-5 rounded-[20px] border border-line bg-white p-4 sm:p-5">
        <Switch checked={draft.negotiable} onChange={(v) => update({ negotiable: v })} label="Precio negociable" description="Mostraremos la etiqueta “Negociable” en tu aviso." />
        {traits.kind !== "land" && (
          <>
            <div className="h-px bg-line" />
            <FieldBlock label="Administración mensual" optional hint={draft.adminFee ? `Se mostrará como “+ ${formatPrice(draft.adminFee)} administración”.` : "Si el inmueble paga administración, indícala."} htmlFor="admin">
              <MoneyInput id="admin" ariaLabel="Administración mensual en pesos" value={draft.adminFee} currency="COP" onChange={(n) => update({ adminFee: n })} />
            </FieldBlock>
          </>
        )}
      </div>

      {rent && (
        <div className="grid gap-6">
          <SectionTitle hint="Ayuda a quienes buscan a planear su mudanza.">Condiciones del arriendo</SectionTitle>
          <FieldBlock label="Disponible desde" htmlFor="avail" optional>
            <div className="relative max-w-xs">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                id="avail" type="date" value={draft.availableFrom ? draft.availableFrom.slice(0, 10) : ""} min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => update({ availableFrom: e.target.value ? `${e.target.value}T12:00:00.000Z` : null })}
                className="h-12 w-full rounded-[12px] border border-field/60 bg-white pl-11 pr-4 text-[15px] text-ink hover:border-ink focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
              />
            </div>
          </FieldBlock>
          <FieldBlock label="Contrato mínimo" optional htmlFor="months">
            <div className="flex flex-wrap items-center gap-3">
              <ChipRow label="Contrato mínimo" allowClear value={draft.minContractMonths} onChange={(v) => update({ minContractMonths: v })} options={[3, 6, 12, 24].map((n) => ({ value: n, label: `${n} meses` }))} />
              <div className="w-36"><NumberField id="months" value={draft.minContractMonths} max={120} suffix="meses" placeholder="Otro" onChange={(n) => update({ minContractMonths: n })} /></div>
            </div>
          </FieldBlock>
        </div>
      )}

      <MarketHint draft={draft} type={type} city={city} />
    </div>
  );
}
