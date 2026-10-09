"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { formatDate, formatNumber } from "@/lib/format";

/* Paleta categórica validada (verde marca · ámbar · azul), pasa CVD y contraste ≥ 3:1 */
export const SERIES_COLORS = { green: "#145c4c", amber: "#c9a15a", blue: "#2a78d6" } as const;

/* =====================================================================
 * Conteo animado
 * ===================================================================== */
export function useCountUp(target: number, duration = 900) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce) { setV(target); from.current = target; return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 4);
      const val = a + (target - a) * e;
      setV(val);
      from.current = val;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);
  return v;
}

export function CountUp({ value, format = formatNumber, className }: { value: number; format?: (n: number) => string; className?: string }) {
  const v = useCountUp(value);
  return <span className={className} aria-label={format(value)}><span aria-hidden>{format(Math.round(v))}</span></span>;
}

/* =====================================================================
 * Sparkline
 * ===================================================================== */
export function Sparkline({ values, color = SERIES_COLORS.green, width = 96, height = 32, className }: { values: number[]; color?: string; width?: number; height?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const pts = useMemo(() => {
    if (values.length < 2) return null;
    const max = Math.max(...values), min = Math.min(...values);
    const span = max - min || 1;
    const px = 3, py = 4;
    return values.map((v, i) => [px + (i / (values.length - 1)) * (width - px * 2), py + (1 - (v - min) / span) * (height - py * 2)] as const);
  }, [values, width, height]);
  if (!pts) return <span className={className} style={{ width, height }} aria-hidden />;
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1]![0].toFixed(1)} ${height} L${pts[0]![0].toFixed(1)} ${height} Z`;
  const last = pts[pts.length - 1]!;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("shrink-0 overflow-visible", className)} aria-hidden>
      <defs><linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".22" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#sg-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

/* =====================================================================
 * Gráfico de series de tiempo (SVG a mano)
 * ===================================================================== */
export type ChartSeries<T> = { key: keyof T & string; label: string; color: string };

/** Escala con ticks enteros: devuelve el paso y el número de intervalos (3–5) con el menor máximo que cubre `v`. */
function niceScale(v: number) {
  let best = { max: Infinity, n: 4, step: 1 };
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1))));
  for (const k of [pow / 10, pow, pow * 10]) {
    for (const m of [1, 2, 5]) {
      const step = m * k;
      if (step < 1 || !Number.isInteger(step)) continue;
      for (const n of [4, 5, 3]) {
        const max = step * n;
        if (max >= v && max < best.max) best = { max, n, step };
      }
    }
  }
  return Number.isFinite(best.max) ? best : { max: 4, n: 4, step: 1 };
}

function useWidth<E extends HTMLElement>() {
  const ref = useRef<E>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => e && setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function TimeSeriesChart<T extends { date: string }>({
  data, series, defaultActive, height = 280, title, unit = "", loading, className,
}: {
  data: T[]; series: ChartSeries<T>[]; defaultActive?: (keyof T & string)[]; height?: number; title: string; unit?: string; loading?: boolean; className?: string;
}) {
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<string[]>(defaultActive ?? series.map((s) => s.key));
  const [hover, setHover] = useState<number | null>(null);

  const shown = series.filter((s) => active.includes(s.key));
  const n = data.length;
  const pad = { l: 40, r: 14, t: 14, b: 28 };
  const W = Math.max(width, 240);
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;

  const val = useCallback((d: T, k: string) => Number((d as Record<string, unknown>)[k]) || 0, []);
  const maxVal = useMemo(() => Math.max(0, ...data.flatMap((d) => shown.map((s) => val(d, s.key)))), [data, shown, val]);
  const scale = niceScale(maxVal);
  const top = scale.max;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + (1 - v / top) * ih;
  const ticks = Array.from({ length: scale.n + 1 }, (_, i) => scale.step * i);

  const paths = useMemo(() => shown.map((s) => {
    const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(val(d, s.key)).toFixed(1)}`).join(" ");
    const area = data.length ? `${line} L${x(n - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z` : "";
    return { s, line, area };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data, shown, W, top, height]);

  const xLabelIdx = useMemo(() => {
    const count = W < 420 ? 4 : W < 720 ? 6 : 8;
    if (n <= count) return data.map((_, i) => i);
    return Array.from({ length: count }, (_, i) => Math.round((i / (count - 1)) * (n - 1)));
  }, [W, n, data]);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * iw;
    setHover(Math.max(0, Math.min(n - 1, Math.round((px / iw) * (n - 1)))));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); setHover((h) => Math.min(n - 1, (h ?? -1) + 1)); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); setHover((h) => Math.max(0, (h ?? n) - 1)); }
    else if (e.key === "Escape") setHover(null);
  };

  const toggle = (k: string) => setActive((a) => (a.includes(k) ? (a.length > 1 ? a.filter((x2) => x2 !== k) : a) : [...a, k]));
  const totals = useMemo(() => Object.fromEntries(series.map((s) => [s.key, data.reduce((acc, d) => acc + val(d, s.key), 0)])), [series, data, val]);

  const hd = hover != null ? data[hover] : null;
  const tipLeft = hover != null ? Math.min(Math.max(x(hover), 90), W - 90) : 0;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Series de ${title}`}>
        {series.map((s) => {
          const on = active.includes(s.key);
          return (
            <button key={s.key} type="button" aria-pressed={on} onClick={() => toggle(s.key)}
              className={cn("inline-flex h-10 items-center gap-2.5 rounded-full border px-3.5 text-sm font-semibold transition-all active:scale-95", on ? "border-line-strong bg-white text-ink shadow-[0_1px_2px_rgb(14_21_18/0.06)]" : "border-line bg-surface text-ink-3 hover:border-line-strong")}>
              <span className="h-[3px] w-4 rounded-full transition-opacity" style={{ background: s.color, opacity: on ? 1 : 0.35 }} aria-hidden />
              {s.label}
              <span className="text-xs font-medium text-ink-3 tabular">{formatNumber(totals[s.key] ?? 0)}</span>
            </button>
          );
        })}
      </div>

      <div ref={wrap} className={cn("relative mt-3 select-none transition-opacity", loading && "opacity-60")} style={{ height }}>
        {width > 0 && (
          <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} role="img" tabIndex={0} onKeyDown={onKey} onBlur={() => setHover(null)}
            aria-label={`${title}: ${shown.map((s) => `${s.label} ${formatNumber(totals[s.key] ?? 0)}`).join(", ")} en ${n} días. Usa las flechas para explorar día por día.`}
            className="block overflow-visible rounded-lg">
            <defs>
              {shown.map((s) => (
                <linearGradient key={s.key} id={`${gid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={s.color} stopOpacity=".16" /><stop offset="1" stopColor={s.color} stopOpacity="0.01" />
                </linearGradient>
              ))}
            </defs>
            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e6e9e7" strokeWidth="1" />
                <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#67716b" className="tabular">{formatNumber(t)}</text>
              </g>
            ))}
            {xLabelIdx.map((i) => (
              <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="11" fill="#67716b">
                {formatDate(data[i]!.date, { day: "numeric", month: "short" })}
              </text>
            ))}
            {paths.map(({ s, line, area }) => (
              <g key={s.key}>
                <motion.path d={area} fill={`url(#${gid}-${s.key})`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
                <motion.path d={line} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
              </g>
            ))}
            {hover != null && hd && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#0e1512" strokeOpacity=".28" strokeWidth="1" />
                {shown.map((s) => <circle key={s.key} cx={x(hover)} cy={y(val(hd, s.key))} r="4.5" fill={s.color} stroke="#fff" strokeWidth="2" />)}
              </g>
            )}
            <rect x={pad.l} y={pad.t} width={iw} height={ih} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: "pan-y" }} />
          </svg>
        )}
        {hd && (
          <div className="pointer-events-none absolute top-1 z-10 w-44 -translate-x-1/2 rounded-2xl border border-line bg-white/95 px-3.5 py-3 shadow-[var(--shadow-card)] backdrop-blur" style={{ left: tipLeft }}>
            <p className="text-xs font-medium text-ink-3 first-letter:uppercase">{formatDate(hd.date, { weekday: "short", day: "numeric", month: "long" })}</p>
            <ul className="mt-1.5 grid gap-1">
              {shown.map((s) => (
                <li key={s.key} className="flex items-center gap-2 text-[13px]">
                  <span className="h-[3px] w-3.5 rounded-full" style={{ background: s.color }} aria-hidden />
                  <span className="font-semibold text-ink tabular">{formatNumber(val(hd, s.key))}{unit}</span>
                  <span className="text-ink-3">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="sr-only"><table>
        <caption>{title}: datos diarios</caption>
        <thead><tr><th scope="col">Fecha</th>{series.map((s) => <th key={s.key} scope="col">{s.label}</th>)}</tr></thead>
        <tbody>{data.map((d) => <tr key={d.date}><th scope="row">{formatDate(d.date)}</th>{series.map((s) => <td key={s.key}>{val(d, s.key)}</td>)}</tr>)}</tbody>
      </table></div>
      <p className="sr-only" aria-live="polite">{hd ? `${formatDate(hd.date)}: ${shown.map((s) => `${s.label} ${val(hd, s.key)}`).join(", ")}` : ""}</p>
    </div>
  );
}
