"use client";

import { useEffect, useId, useState } from "react";
import { formatPriceShort } from "@/lib/format";
import type { Operation } from "@/lib/types";
import { cn } from "@/lib/cn";
import { PRICE_PRESETS, PRICE_SLIDER } from "./query";
import "./filters.css";

const N = 1000;
const nice = (v: number) => {
  const step = v >= 1e9 ? 50e6 : v >= 1e8 ? 10e6 : v >= 1e7 ? 1e6 : v >= 1e6 ? 50_000 : 10_000;
  return Math.round(v / step) * step;
};

function useScale(op: Operation) {
  const { min, max } = PRICE_SLIDER[op];
  const a = Math.log(min), b = Math.log(max);
  return {
    toValue: (pos: number) => nice(Math.exp(a + (pos / N) * (b - a))),
    toPos: (v: number) => Math.max(0, Math.min(N, Math.round(((Math.log(Math.max(v, min)) - a) / (b - a)) * N))),
  };
}

const fmtInput = (n?: number) => (n ? new Intl.NumberFormat("es-CO").format(n) : "");

export function PriceRange({ operation, min, max, onChange }: { operation: Operation; min?: number; max?: number; onChange: (v: { minPrice?: number; maxPrice?: number }) => void }) {
  const uid = useId();
  const { toValue, toPos } = useScale(operation);
  const [lo, setLo] = useState(min ? toPos(min) : 0);
  const [hi, setHi] = useState(max ? toPos(max) : N);
  const [tMin, setTMin] = useState(fmtInput(min));
  const [tMax, setTMax] = useState(fmtInput(max));

  useEffect(() => { setLo(min ? toPos(min) : 0); setHi(max ? toPos(max) : N); setTMin(fmtInput(min)); setTMax(fmtInput(max)); }, [min, max, operation]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (l = lo, h = hi) => {
    const nextMin = l <= 0 ? undefined : toValue(l);
    const nextMax = h >= N ? undefined : toValue(h);
    if (nextMin !== min || nextMax !== max) onChange({ minPrice: nextMin, maxPrice: nextMax });
  };
  const loVal = lo <= 0 ? undefined : toValue(lo);
  const hiVal = hi >= N ? undefined : toValue(hi);
  const parse = (s: string) => { const d = s.replace(/\D/g, ""); return d ? Number(d) : undefined; };
  const commitText = () => {
    let a = parse(tMin), b = parse(tMax);
    if (a !== undefined && b !== undefined && a > b) [a, b] = [b, a];
    onChange({ minPrice: a, maxPrice: b });
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-display text-[1.7rem] leading-none tabular" aria-live="polite">
          {loVal ? formatPriceShort(loVal) : "Cualquiera"}<span className="mx-2 text-ink-3">—</span>{hiVal ? formatPriceShort(hiVal) : "Sin límite"}
        </p>
      </div>
      <div className="dual-range mt-3" onPointerUp={() => commit()} onKeyUp={() => commit()} onTouchEnd={() => commit()}>
        <div className="track"><div className="fill" style={{ left: `${lo / 10}%`, right: `${100 - hi / 10}%` }} /></div>
        <input type="range" min={0} max={N} step={5} value={lo} aria-label="Precio mínimo" aria-valuetext={loVal ? formatPriceShort(loVal) : "Cualquiera"} style={{ zIndex: lo > N * 0.9 ? 5 : 3 }}
          onChange={(e) => { const v = Math.min(Number(e.target.value), hi - 15); setLo(Math.max(0, v)); setTMin(fmtInput(v <= 0 ? undefined : toValue(v))); }} />
        <input type="range" min={0} max={N} step={5} value={hi} aria-label="Precio máximo" aria-valuetext={hiVal ? formatPriceShort(hiVal) : "Sin límite"} style={{ zIndex: 4 }}
          onChange={(e) => { const v = Math.max(Number(e.target.value), lo + 15); setHi(Math.min(N, v)); setTMax(fmtInput(v >= N ? undefined : toValue(v))); }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {([["Mínimo", `${uid}-min`, tMin, setTMin], ["Máximo", `${uid}-max`, tMax, setTMax]] as const).map(([label, id, val, set]) => (
          <label key={id} htmlFor={id} className="grid gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            {label}
            <span className="flex items-center rounded-xl border border-field/60 px-3 transition focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15">
              <span className="text-ink-3">$</span>
              <input id={id} inputMode="numeric" value={val} placeholder={label === "Mínimo" ? "Sin mínimo" : "Sin máximo"}
                onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 12); set(d ? fmtInput(Number(d)) : ""); }}
                onBlur={commitText} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitText(); } }}
                className="h-11 w-full min-w-0 bg-transparent pl-2 text-[15px] font-semibold normal-case tracking-normal text-ink focus:outline-none" />
            </span>
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {PRICE_PRESETS[operation].map((v) => (
          <button key={v} type="button" onClick={() => onChange({ minPrice: undefined, maxPrice: v })}
            className={cn("h-8 rounded-full border px-3 text-[13px] font-semibold tabular transition", max === v && !min ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong text-ink-2 hover:border-ink hover:text-ink")}>
            Hasta {formatPriceShort(v)}
          </button>
        ))}
      </div>
    </div>
  );
}
