"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Pagination } from "@/components/panel/common";
import { CountUp, Sparkline } from "@/components/panel/charts";
import { ArrowUpRight } from "@/components/ui/icon";

export { TimeSeriesChart as Chart } from "@/components/panel/charts";

/* ---------- StatCard ---------- */
export function StatCard({ label, value, icon, href, hint, tone = "default", spark, color, className }: {
  label: string; value: number; icon?: ReactNode; href?: string; hint?: ReactNode; tone?: "default" | "attention" | "danger"; spark?: number[]; color?: string; className?: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-2">{label}</p>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl", tone === "attention" ? "bg-sun-soft text-sun-ink" : tone === "danger" ? "bg-danger-soft text-danger" : "bg-brand-50 text-brand-600")}>{icon}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-[2rem] font-semibold leading-none tracking-tight tabular"><CountUp value={value} /></p>
        {spark && spark.length > 1 && <Sparkline values={spark} color={color} width={72} height={30} />}
      </div>
      {(hint || href) && (
        <p className="mt-3 flex items-center justify-between gap-2 text-xs text-ink-3">
          <span>{hint}</span>
          {href && <ArrowUpRight className="h-4 w-4 text-ink-3 transition group-hover:text-brand-700" aria-hidden />}
        </p>
      )}
    </>
  );
  const cls = cn("group card flex flex-col p-4 md:p-5", href && "card-lift", tone === "attention" && value > 0 && "border-sun/60", tone === "danger" && value > 0 && "border-danger/30", className);
  return href ? <Link href={href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

/* ---------- Barra de filtros ---------- */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div role="search" className={cn("flex flex-wrap items-center gap-3", className)}>{children}</div>;
}

export function FilterSelect({ label, value, onChange, children, className }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  return (
    <label className={cn("relative inline-flex", className)}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
        className="h-11 w-full appearance-none rounded-full border border-line-strong bg-white pl-4 pr-10 text-sm font-semibold text-ink hover:border-ink focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15">
        {children}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
    </label>
  );
}

/* ---------- DataTable ---------- */
export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  /** breakpoint desde el que se muestra la columna */
  from?: "sm" | "md" | "lg" | "xl" | "wide" | "2xl";
  align?: "right" | "center";
  srHeader?: boolean;
};

const FROM = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell", xl: "hidden xl:table-cell", wide: "hidden min-[1360px]:table-cell", "2xl": "hidden 2xl:table-cell" } as const;

export function DataTable<T>({
  caption, columns, rows, rowKey, loading, fetching, empty, emptyTitle = "Sin resultados", emptyText, pagination, mobileCard, className, maxHeight = "calc(100dvh - 15rem)", rowClassName, expandedRow,
}: {
  caption: string; columns: Column<T>[]; rows: T[] | undefined; rowKey: (r: T) => string; loading?: boolean; fetching?: boolean; empty?: ReactNode;
  emptyTitle?: string; emptyText?: string; pagination?: { page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void };
  /** Si se define, en pantallas < md se muestran tarjetas en lugar de tabla */
  mobileCard?: (r: T) => ReactNode; className?: string; maxHeight?: string; rowClassName?: (r: T) => string | undefined; expandedRow?: (r: T) => ReactNode | null;
}) {
  const showSkeleton = loading && !rows;
  const isEmpty = !showSkeleton && rows && rows.length === 0;

  return (
    <div className={cn("grid gap-4", className)}>
      <div className={cn("card overflow-hidden transition-opacity", fetching && rows && "opacity-70")} aria-busy={fetching || loading}>
        {isEmpty ? (
          <div className="p-6">{empty ?? <EmptyState title={emptyTitle} text={emptyText} />}</div>
        ) : (
          <>
            {mobileCard && (
              <ul className="divide-y divide-line md:hidden">
                {showSkeleton ? Array.from({ length: 5 }).map((_, i) => <li key={i} className="p-4"><Skeleton className="h-16" /></li>) : rows?.map((r) => <li key={rowKey(r)} className="p-4">{mobileCard(r)}</li>)}
              </ul>
            )}
            <div className={cn("overflow-auto", mobileCard && "hidden md:block")} style={{ maxHeight }}>
              <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
                <caption className="sr-only">{caption}</caption>
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key} scope="col" className={cn("sticky top-0 z-10 whitespace-nowrap border-b border-line bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-2", c.from && FROM[c.from], c.align === "right" && "text-right", c.align === "center" && "text-center", c.className)}>
                        {c.srHeader ? <span className="sr-only">{c.header}</span> : c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {showSkeleton ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>{columns.map((c) => <td key={c.key} className={cn("border-b border-line/70 px-4 py-4", c.from && FROM[c.from])}><Skeleton className="h-5 w-full max-w-[160px]" /></td>)}</tr>
                  )) : rows?.map((r) => {
                    const exp = expandedRow?.(r);
                    return (
                      <RowGroup key={rowKey(r)}>
                        <tr className={cn("group transition-colors hover:bg-surface/60", rowClassName?.(r))}>
                          {columns.map((c) => (
                            <td key={c.key} className={cn("border-b border-line/70 px-4 py-3.5 align-middle", c.from && FROM[c.from], c.align === "right" && "text-right", c.align === "center" && "text-center", c.className)}>{c.cell(r)}</td>
                          ))}
                        </tr>
                        {exp && <tr><td colSpan={columns.length} className="border-b border-line/70 bg-surface/50 px-4 py-3">{exp}</td></tr>}
                      </RowGroup>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {pagination && !isEmpty && <Pagination {...pagination} />}
    </div>
  );
}

function RowGroup({ children }: { children: ReactNode }) { return <>{children}</>; }

/* ---------- Lista de barras (por ciudad) ---------- */
export function BarList({ items, color = "#138a71" }: { items: { name: string; count: number }[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="grid gap-3.5">
      {items.map((i, idx) => (
        <li key={i.name} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,11rem)_1fr_auto]">
          <span className="truncate font-medium">{i.name}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.max(3, (i.count / max) * 100)}%`, background: color, opacity: idx === 0 ? 1 : 0.78 }} />
          </div>
          <span className="w-10 text-right font-semibold tabular">{formatNumber(i.count)}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Pestañas con conteo ---------- */
export function SectionCard({ title, description, actions, children, className }: { title: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("card p-5 md:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-semibold">{title}</h2>{description && <p className="text-sm text-ink-3">{description}</p>}</div>
        {actions}
      </div>
      {children}
    </section>
  );
}
