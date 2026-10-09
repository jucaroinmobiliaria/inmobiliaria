"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Field } from "@/components/ui/form";
import { Check, MapPin, Plus, Search, X } from "@/components/ui/icon";
import { slugify } from "@/lib/format";

export type PlaceOption = { id: string; label: string; sublabel?: string };

type Props = {
  label: string;
  hint?: string;
  error?: string;
  value: PlaceOption | null;
  placeholder: string;
  disabled?: boolean;
  options: PlaceOption[];
  loading?: boolean;
  query: string;
  onQuery: (q: string) => void;
  onPick: (opt: PlaceOption) => void;
  onClear: () => void;
  empty: string;
  allowCreate?: boolean;
  createHint?: string;
};

const fold = (s: string) => slugify(s).replace(/-/g, " ");

export function PlaceField({
  label, hint, error, value, placeholder, disabled, options, loading, query, onQuery, onPick, onClear, empty, allowCreate, createHint,
}: Props) {
  const uid = useId();
  const listId = `${uid}-list`;
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const text = open ? query : (value?.label ?? query);

  useEffect(() => {
    const h = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, []);
  const needle = fold(query);
  const createLabel = query.trim().replace(/\s+/g, " ");
  const hasExact = options.some((o) => fold(o.label) === needle);
  const browsingSelected = !!(value && needle && fold(value.label) === needle);
  const showCreate = !!(allowCreate && createLabel.length >= 2 && !hasExact && !browsingSelected);

  const rows = useMemo(() => {
    let list: PlaceOption[];
    if (!needle || browsingSelected) {
      const rest = options.filter((o) => o.id !== value?.id).slice(0, 11);
      list = value ? [value, ...rest] : options.slice(0, 12);
    } else {
      list = options.filter((o) => fold(o.label).includes(needle) || fold(o.sublabel ?? "").includes(needle)).slice(0, 50);
    }
    return showCreate ? [{ id: "__create__", label: createLabel, sublabel: createHint ?? "Agregar este barrio" }, ...list] : list;
  }, [options, needle, browsingSelected, value, showCreate, createLabel, createHint]);

  useEffect(() => setCursor(0), [rows.length, query]);

  const pick = (opt: PlaceOption) => {
    setOpen(false);
    onPick(opt);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); setOpen(true); setCursor((c) => Math.min(c + 1, Math.max(rows.length - 1, 0))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter" && open) {
      e.preventDefault();
      e.stopPropagation();
      if (rows[cursor]) pick(rows[cursor]!);
    } else if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
  };

  return (
    <Field label={label} hint={error ? undefined : hint} error={error} htmlFor={uid} required={false}>
      <div ref={wrap} className="relative">
        <div className={cn(
          "flex h-12 items-center rounded-[12px] border bg-white px-3 transition-colors",
          error ? "border-danger focus-within:border-danger focus-within:ring-4 focus-within:ring-danger/15" : "border-field/60 hover:border-ink focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15",
          disabled && "bg-surface",
        )}>
          <Search className="mr-2 h-[18px] w-[18px] shrink-0 text-ink-3" aria-hidden />
          <input
            ref={input} id={uid} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
            autoComplete="off" spellCheck={false} disabled={disabled} value={text} placeholder={placeholder}
            aria-invalid={!!error} aria-activedescendant={open && rows[cursor] ? `${uid}-o-${cursor}` : undefined}
            onFocus={() => {
              if (disabled) return;
              setOpen(true);
              if (!query && value) onQuery(value.label);
              requestAnimationFrame(() => input.current?.select());
            }}
            onChange={(e) => { onQuery(e.target.value); setOpen(true); if (!e.target.value && value) onClear(); }}
            onKeyDown={onKey}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 focus:outline-none disabled:text-ink-3"
          />
          {(text || value) && !disabled && (
            <button type="button" aria-label="Borrar" onClick={() => { onClear(); onQuery(""); input.current?.focus(); setOpen(true); }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {open && !disabled && (
          <ul id={listId} role="listbox" aria-label={label} className="mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-[12px] border border-line bg-white p-1 shadow-[var(--shadow-card)]">
            {rows.map((r, i) => {
              const create = r.id === "__create__";
              const selected = value?.id === r.id;
              return (
                <li key={r.id === "__create__" ? `c-${r.label}` : r.id} role="presentation">
                  <div
                    id={`${uid}-o-${i}`} role="option" aria-selected={i === cursor}
                    onMouseEnter={() => setCursor(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(r)}
                    className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5", i === cursor ? "bg-brand-50" : "")}
                  >
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", create ? "bg-sun-soft text-sun-ink" : "bg-surface text-brand-700")}>
                      {create ? <Plus className="h-[18px] w-[18px]" /> : selected ? <Check className="h-[18px] w-[18px]" /> : <MapPin className="h-[18px] w-[18px]" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold text-ink">{create ? `Usar «${r.label}»` : r.label}</span>
                      {(r.sublabel || value?.id === r.id) && (
                        <span className="block truncate text-[13px] text-ink-3">{r.sublabel}{selected && r.sublabel ? "" : selected ? "Seleccionado" : ""}</span>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
            {!rows.length && (
              <li role="presentation" className="px-3 py-6 text-center text-sm text-ink-3">
                {loading ? "Buscando…" : empty}
              </li>
            )}
          </ul>
        )}
      </div>
    </Field>
  );
}
