"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Check, ChevronDown } from "./icon";

const fieldBase =
  "w-full rounded-[12px] border border-field/60 bg-white px-4 text-[15px] text-ink placeholder:text-ink-3 transition-colors hover:border-ink focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15 disabled:bg-surface disabled:text-ink-3";

export function Field({ label, hint, error, children, className, htmlFor, required }: { label?: string; hint?: string; error?: string; children: ReactNode; className?: string; htmlFor?: string; required?: boolean }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
          {label}{required && <span className="text-danger"> *</span>}
        </label>
      )}
      {children}
      {error ? <p role="alert" className="text-[13px] font-medium text-danger">{error}</p> : hint ? <p className="text-[13px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string; leading?: ReactNode; trailing?: ReactNode };
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, leading, trailing, className, id, required, ...props }, ref) {
  const uid = useId();
  const fid = id ?? uid;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fid} required={required}>
      <div className="relative">
        {leading && <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-ink-3">{leading}</span>}
        <input ref={ref} id={fid} required={required} aria-invalid={!!error} className={cn(fieldBase, "h-12", leading && "pl-11", trailing && "pr-11", error && "border-danger focus:border-danger focus:ring-danger/15", className)} {...props} />
        {trailing && <span className="absolute inset-y-0 right-3 grid place-items-center text-ink-3">{trailing}</span>}
      </div>
    </Field>
  );
});

type TAProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; error?: string };
export const Textarea = forwardRef<HTMLTextAreaElement, TAProps>(function Textarea({ label, hint, error, className, id, required, ...props }, ref) {
  const uid = useId();
  const fid = id ?? uid;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fid} required={required}>
      <textarea ref={ref} id={fid} required={required} aria-invalid={!!error} className={cn(fieldBase, "min-h-28 py-3 leading-relaxed", error && "border-danger", className)} {...props} />
    </Field>
  );
});

type SelProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string; error?: string };
export const Select = forwardRef<HTMLSelectElement, SelProps>(function Select({ label, hint, error, className, id, children, required, ...props }, ref) {
  const uid = useId();
  const fid = id ?? uid;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fid} required={required}>
      <div className="relative">
        <select ref={ref} id={fid} required={required} aria-invalid={!!error} className={cn(fieldBase, "h-12 appearance-none pr-10", error && "border-danger", className)} {...props}>{children}</select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      </div>
    </Field>
  );
});

export function Switch({ checked, onChange, label, description, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; id?: string }) {
  const uid = useId();
  const fid = id ?? uid;
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={fid} className="grid cursor-pointer gap-0.5">
        <span className="text-[15px] font-semibold text-ink">{label}</span>
        {description && <span className="text-[13px] text-ink-3">{description}</span>}
      </label>
      <button id={fid} role="switch" type="button" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-brand-600" : "bg-line-strong")}>
        <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-300 ease-[var(--ease-spring)]", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[15px] text-ink-2">
      <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors", checked ? "border-brand-600 bg-brand-600 text-white" : "border-field bg-white")}>
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/** Contador +/-, útil para habitaciones, baños, parqueaderos. */
export function Stepper({ value, onChange, min = 0, max = 20, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3">
      <span className="text-[15px] font-semibold">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Restar ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="grid h-9 w-9 place-items-center rounded-full border border-line-strong text-lg transition hover:border-ink disabled:opacity-35">−</button>
        <span className="w-6 text-center text-base font-semibold tabular">{value}</span>
        <button type="button" aria-label={`Sumar ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="grid h-9 w-9 place-items-center rounded-full border border-line-strong text-lg transition hover:border-ink disabled:opacity-35">+</button>
      </div>
    </div>
  );
}
