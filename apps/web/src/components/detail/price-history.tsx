import { formatDate, formatPrice, formatPriceShort } from "@/lib/format";
import { TrendingDown, TrendingUp } from "@/components/ui/icon";

/** Mini gráfico de área SVG del historial de precio. */
export function PriceHistory({ points, currency = "COP" }: { points: { date: string; price: number }[]; currency?: "COP" | "USD" }) {
  const pts = [...points].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  if (pts.length < 2) return null;
  const W = 640, H = 170, padX = 18, padT = 24, padB = 30;
  const t0 = +new Date(pts[0]!.date), t1 = +new Date(pts[pts.length - 1]!.date) || t0 + 1;
  const prices = pts.map((p) => p.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const span = hi - lo || hi * 0.1 || 1;
  const x = (t: number) => padX + ((t - t0) / (t1 - t0 || 1)) * (W - padX * 2);
  const y = (p: number) => padT + (1 - (p - lo + span * 0.15) / (span * 1.3)) * (H - padT - padB);
  // Escalonado: el precio se mantiene hasta el siguiente cambio
  const path = pts.map((p, i) => `${i ? `L${x(+new Date(p.date))},${y(pts[i - 1]!.price)} ` : "M"}${x(+new Date(p.date))},${y(p.price)}`).join(" ");
  const area = `${path} L${x(t1)},${H - padB} L${x(t0)},${H - padB} Z`;
  const first = pts[0]!.price, last = pts[pts.length - 1]!.price;
  const delta = ((last - first) / first) * 100;
  const down = delta < 0;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${down ? "bg-success-soft text-success" : "bg-sun-soft text-sun-ink"}`}>
          {down ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}{down ? "Bajó" : "Subió"} {Math.abs(delta).toFixed(1).replace(".", ",")}% desde {formatDate(pts[0]!.date, { month: "short", year: "numeric" })}
        </span>
        <span className="text-sm text-ink-3">Antes {formatPrice(first, currency)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Historial de precio: de ${formatPrice(first, currency)} a ${formatPrice(last, currency)}`}>
        <defs><linearGradient id="ph" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a6b50" stopOpacity="0.28" /><stop offset="1" stopColor="#0a6b50" stopOpacity="0" /></linearGradient></defs>
        <path d={area} fill="url(#ph)" />
        <path d={path} fill="none" stroke="#0a6b50" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={p.date + i}>
            <circle cx={x(+new Date(p.date))} cy={y(p.price)} r="5" fill="#fff" stroke="#0a6b50" strokeWidth="2.5" />
            {(i === 0 || i === pts.length - 1) && <text x={x(+new Date(p.date))} y={y(p.price) - 12} textAnchor={i === 0 ? "start" : "end"} className="fill-ink" style={{ font: "600 13px var(--font-sans)" }}>{formatPriceShort(p.price, currency)}</text>}
            {(i === 0 || i === pts.length - 1) && <text x={x(+new Date(p.date))} y={H - 8} textAnchor={i === 0 ? "start" : "end"} className="fill-ink-3" style={{ font: "500 12px var(--font-sans)" }}>{formatDate(p.date, { day: "numeric", month: "short" })}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}
