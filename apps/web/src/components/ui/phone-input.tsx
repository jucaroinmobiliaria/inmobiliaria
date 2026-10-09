"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { PHONE_COUNTRIES, countryByIso, formatNational, parsePhone, toE164, type PhoneCountry } from "@/lib/phone";
import { Field } from "./form";
import { ChevronDown } from "./icon";

type Props = {
  label?: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (e164: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  autoComplete?: string;
};

export function PhoneInput({ label, hint, error, value, onChange, name, required, disabled, id, placeholder, autoComplete = "tel" }: Props) {
  const uid = useId();
  const fid = id ?? uid;
  const listId = `${fid}-countries`;
  const wrap = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const parsed = parsePhone(value);
  const [iso, setIso] = useState(parsed.country.iso);
  const [national, setNational] = useState(parsed.national);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const country = countryByIso(iso);

  useEffect(() => {
    const next = parsePhone(value);
    setIso(next.country.iso);
    setNational(next.national);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQ("");
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const emit = (c: PhoneCountry, n: string) => {
    const digits = n.replace(/\D/g, "");
    onChange(digits ? toE164(n, c) : "");
  };

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!s) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter((c) => {
      const name = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return name.includes(s) || c.dial.includes(s.replace(/\D/g, "")) || c.iso.toLowerCase() === s;
    });
  }, [q]);

  const pick = (c: PhoneCountry) => {
    setIso(c.iso);
    setOpen(false);
    emit(c, national);
  };

  const shown = formatNational(national, iso);
  const ph = placeholder ?? (iso === "CO" ? "300 123 4567" : "Número");

  return (
    <Field label={label} hint={hint} error={error} htmlFor={fid} required={required}>
      <div ref={wrap} className="relative">
        <div className={cn(
          "flex h-12 overflow-hidden rounded-[12px] border bg-white transition-colors focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15",
          error ? "border-danger focus-within:border-danger focus-within:ring-danger/15" : "border-field/60 hover:border-ink",
          disabled && "bg-surface",
        )}>
          <button
            type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
            aria-label={`Indicativo: ${country.name} +${country.dial}`}
            onClick={() => setOpen((v) => !v)}
            className="flex shrink-0 items-center gap-1.5 border-r border-line bg-surface/60 px-2.5 text-[14px] font-semibold text-ink hover:bg-surface disabled:opacity-50 sm:px-3"
          >
            <span className="text-[1.15rem] leading-none" aria-hidden>{country.flag}</span>
            <span className="tabular">+{country.dial}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-ink-3 transition", open && "rotate-180")} />
          </button>
          <input
            id={fid} name={name} type="tel" inputMode="tel" autoComplete={autoComplete} disabled={disabled} required={required}
            aria-invalid={!!error} placeholder={ph} value={shown}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw.trim().startsWith("+") || raw.trim().startsWith("00")) {
                const next = parsePhone(raw);
                setIso(next.country.iso);
                setNational(next.national);
                emit(next.country, next.national);
                return;
              }
              const digits = raw.replace(/\D/g, "").slice(0, 15);
              setNational(digits);
              emit(country, digits);
            }}
            className="min-w-0 flex-1 bg-transparent px-3 text-[15px] text-ink placeholder:text-ink-3 outline-none disabled:text-ink-3"
          />
        </div>
        {open && (
          <div id={listId} role="listbox" className="absolute z-30 mt-1.5 w-full min-w-[16rem] overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-lift)]">
            <div className="border-b border-line p-2">
              <input
                ref={searchRef} type="search" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar país o indicativo" aria-label="Buscar país"
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-[14px] outline-none placeholder:text-ink-3 focus:border-brand-600"
              />
            </div>
            <ul className="max-h-64 overflow-y-auto py-1">
              {rows.length === 0 && <li className="px-3 py-3 text-[13px] text-ink-3">Sin resultados</li>}
              {rows.map((c) => {
                const on = c.iso === iso;
                return (
                  <li key={`${c.iso}-${c.dial}`}>
                    <button
                      type="button" role="option" aria-selected={on} onClick={() => pick(c)}
                      className={cn("flex w-full items-center gap-3 px-3 py-2 text-left text-[14px] hover:bg-brand-50", on && "bg-brand-50")}
                    >
                      <span className="text-[1.2rem] leading-none" aria-hidden>{c.flag}</span>
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="tabular text-ink-3">+{c.dial}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Field>
  );
}
