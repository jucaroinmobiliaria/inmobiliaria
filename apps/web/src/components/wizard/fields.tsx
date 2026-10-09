"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Check, Icon, Info } from "@/components/ui/icon";
import { Minus, Plus } from "@/components/uploader/icons";

/* ----------------------------- utilidades ------------------------------ */

/** Tope que acepta la API para cualquier monto. */
export const MAX_MONEY = 9_000_000_000_000;

export const groupThousands = (n: number) => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function parseDecimal(s: string): number | null {
  const t = s.trim().replace(/\./g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------ tarjetas ------------------------------- */

export function OptionCard({ selected, onClick, icon, title, text, className, size = "lg", role = "radio" }: {
  selected: boolean; onClick: () => void; icon?: string; title: string; text?: string; className?: string; size?: "lg" | "md"; role?: "radio" | "checkbox";
}) {
  return (
    <button
      type="button" role={role} aria-checked={selected} onClick={onClick}
      className={cn(
        "group relative flex w-full text-left transition-all duration-300 ease-[var(--ease-out-expo)] active:scale-[0.985]",
        size === "lg" ? "flex-col gap-4 rounded-[24px] border-2 p-5 sm:p-6" : "items-center gap-3.5 rounded-[18px] border-2 p-3.5 sm:flex-col sm:items-start sm:gap-3 sm:p-4",
        selected ? "border-brand-600 bg-brand-50 shadow-[0_8px_24px_-12px_rgb(11_107_87/0.5)]" : "border-line bg-white hover:border-line-strong hover:shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {icon && (
        <span className={cn("grid shrink-0 place-items-center rounded-full transition-colors", size === "lg" ? "h-14 w-14" : "h-11 w-11", selected ? "bg-brand-600 text-white" : "bg-surface text-ink-2 group-hover:bg-brand-50 group-hover:text-brand-600")}>
          <Icon name={icon} size={size === "lg" ? 26 : 22} />
        </span>
      )}
      <span className="grid gap-0.5">
        <span className={cn("font-semibold text-ink", size === "lg" ? "font-display text-[1.7rem] font-normal leading-none" : "text-[15px]")}>{title}</span>
        {text && <span className={cn("text-ink-2", size === "lg" ? "mt-1.5 text-[15px] leading-snug" : "text-[13px] leading-snug")}>{text}</span>}
      </span>
      <span className={cn("absolute right-3.5 top-3.5 grid h-6 w-6 place-items-center rounded-full border-2 transition-all", selected ? "scale-100 border-brand-600 bg-brand-600 text-white" : "scale-90 border-line-strong text-transparent")} aria-hidden>
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </button>
  );
}

export function ChipRow<T extends string | number>({ value, options, onChange, label, allowClear, className }: {
  value: T | null | undefined; options: { value: T; label: string; title?: string }[]; onChange: (v: T | null) => void; label: string; allowClear?: boolean; className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={String(o.value)} type="button" role="radio" aria-checked={on} title={o.title}
            onClick={() => onChange(on && allowClear ? null : o.value)}
            className={cn("inline-flex h-11 min-w-11 items-center justify-center rounded-full border px-4 text-[15px] font-semibold transition-all active:scale-95", on ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-white text-ink hover:border-ink")}
          >{o.label}</button>
        );
      })}
    </div>
  );
}

/* ------------------------------- campos -------------------------------- */

export function FieldBlock({ label, hint, error, children, htmlFor, className, optional }: { label?: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string; className?: string; optional?: boolean }) {
  return (
    <div className={cn("grid gap-2", className)}>
      {label && (
        <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-[15px] font-semibold text-ink">
          {label}{optional && <span className="text-[13px] font-normal text-ink-3">opcional</span>}
        </label>
      )}
      {children}
      {error ? <p role="alert" className="text-[13px] font-medium text-danger">{error}</p> : hint ? <p className="text-[13px] leading-snug text-ink-3">{hint}</p> : null}
    </div>
  );
}

const inputCls = "h-12 w-full rounded-[12px] border border-field/60 bg-white px-4 text-[15px] text-ink placeholder:text-ink-3 transition-colors hover:border-ink focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15";

export function NumberField({ id, value, onChange, suffix, placeholder, decimal, max, min = 0, ariaLabel, invalid }: {
  id?: string; value: number | null | undefined; onChange: (n: number | null) => void; suffix?: string; placeholder?: string; decimal?: boolean; max?: number; min?: number; ariaLabel?: string; invalid?: boolean;
}) {
  const uid = useId();
  const [text, setText] = useState(value != null ? String(value).replace(".", ",") : "");
  useEffect(() => {
    const cur = parseDecimal(text);
    if ((cur ?? null) !== (value ?? null)) setText(value != null ? String(value).replace(".", ",") : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="relative">
      <input
        id={id ?? uid} inputMode={decimal ? "decimal" : "numeric"} autoComplete="off" aria-label={ariaLabel} aria-invalid={invalid || undefined}
        value={text} placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value.replace(decimal ? /[^\d,.]/g : /\D/g, "");
          setText(raw);
          let n = parseDecimal(raw);
          if (n != null) { if (!decimal) n = Math.trunc(n); if (max != null) n = Math.min(max, n); n = Math.max(min, n); }
          onChange(n);
        }}
        className={cn(inputCls, suffix && "pr-14", invalid && "border-danger")}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-[14px] font-medium text-ink-3">{suffix}</span>}
    </div>
  );
}

/** Dinero con separadores de miles en vivo; siempre envía enteros. */
export function MoneyInput({ id, value, onChange, currency, placeholder, large, invalid, ariaDescribedBy, ariaLabel }: {
  id?: string; value: number | null | undefined; onChange: (n: number | null) => void; currency: "COP" | "USD"; placeholder?: string; large?: boolean; invalid?: boolean; ariaDescribedBy?: string; ariaLabel?: string;
}) {
  const uid = useId();
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  const [text, setText] = useState(value ? groupThousands(value) : "");
  useEffect(() => {
    const cur = parseInt(text.replace(/\D/g, "") || "0", 10);
    if (cur !== (value ?? 0)) setText(value ? groupThousands(value) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  useLayoutEffect(() => {
    if (caret.current != null && ref.current && document.activeElement === ref.current) {
      ref.current.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  }, [text]);
  return (
    <div className={cn("relative flex items-center rounded-[20px] border bg-white transition-colors focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15 hover:border-ink", invalid ? "border-danger" : "border-field/60")}>
      <span className={cn("select-none pl-5 font-display text-ink-3", large ? "text-[2.4rem]" : "text-2xl")} aria-hidden>{currency === "USD" ? "US$" : "$"}</span>
      <input
        ref={ref} id={id ?? uid} inputMode="numeric" autoComplete="off" value={text} placeholder={placeholder ?? "0"} aria-invalid={invalid || undefined} aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel ?? `Valor en ${currency === "USD" ? "dólares" : "pesos colombianos"}`}
        onChange={(e) => {
          const el = e.target;
          const pos = el.selectionStart ?? el.value.length;
          const before = el.value.slice(0, pos).replace(/\D/g, "").length;
          const digits = el.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 15);
          const n = digits ? Math.min(MAX_MONEY, parseInt(digits, 10)) : null;
          const formatted = n ? groupThousands(n) : "";
          let c = 0, p = 0;
          while (p < formatted.length && c < before) { if (/\d/.test(formatted[p]!)) c++; p++; }
          caret.current = p;
          setText(formatted);
          onChange(n);
        }}
        className={cn("w-full min-w-0 bg-transparent px-3 py-3 font-display tracking-tight text-ink outline-none placeholder:text-ink-3/60", large ? "h-[84px] text-[2.8rem] sm:text-[3.4rem]" : "h-14 text-3xl")}
      />
    </div>
  );
}

/** Contador +/− con "—" cuando no hay valor. */
export function CounterField({ label, icon, value, onChange, min = 0, max = 20, hint }: {
  label: string; icon?: string; value: number | null | undefined; onChange: (n: number | null) => void; min?: number; max?: number; hint?: string;
}) {
  const v = value ?? null;
  const set = (n: number) => onChange(Math.max(min, Math.min(max, n)));
  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-line bg-white px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-ink-2"><Icon name={icon} size={20} /></span>}
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight text-ink">{label}</p>
          {hint && <p className="text-[12.5px] text-ink-3">{hint}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label={label}>
        <button type="button" aria-label={`Restar ${label.toLowerCase()}`} disabled={v == null || v <= min} onClick={() => (v != null && v <= min ? onChange(null) : set((v ?? min) - 1))}
          className="grid h-11 w-11 place-items-center rounded-full border border-line-strong transition hover:border-ink active:scale-90 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
        <output className={cn("w-9 text-center text-[17px] tabular", v == null ? "font-normal text-ink-3/50" : "font-semibold")} aria-live="polite">{v ?? "–"}</output>
        <button type="button" aria-label={`Sumar ${label.toLowerCase()}`} disabled={v != null && v >= max} onClick={() => set(v == null ? Math.max(min, 1) : v + 1)}
          className="grid h-11 w-11 place-items-center rounded-full border border-line-strong transition hover:border-ink active:scale-90 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export function Callout({ tone = "info", children, icon, className }: { tone?: "info" | "warn" | "success" | "danger"; children: ReactNode; icon?: ReactNode; className?: string }) {
  const tones = { info: "bg-info-soft text-info", warn: "bg-sun-soft text-sun-ink", success: "bg-success-soft text-success", danger: "bg-danger-soft text-danger" } as const;
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl px-4 py-3 text-[14px] leading-snug", tones[tone], className)}>
      <span className="mt-0.5 shrink-0">{icon ?? <Info className="h-[18px] w-[18px]" />}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[17px] font-semibold text-ink">{children}</h2>
      {hint && <p className="mt-0.5 text-[13.5px] text-ink-3">{hint}</p>}
    </div>
  );
}
