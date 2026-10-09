"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { slugify } from "@/lib/format";
import type { SuggestItem } from "@/lib/types";
import { Building2, House, MapPin, Search, X, Tag } from "@/components/ui/icon";
import { History } from "./icons";
import { useCatalog, useDebounced, useOutside, useRecent } from "./hooks";

export type LocationValue = { city?: string; neighborhood?: string; label: string; sublabel?: string };

type Row = { key: string; item: SuggestItem; section: string; recent?: boolean };

const KIND_ICON = { city: Building2, neighborhood: MapPin, type: House, code: Tag } as const;
const KIND_SECTION = { city: "Ciudades", neighborhood: "Barrios", type: "Tipos de inmueble", code: "Código de anuncio" } as const;
const same = (a: SuggestItem, b: SuggestItem) => a.kind === b.kind && a.label === b.label && a.sublabel === b.sublabel;

type Props = {
  value: LocationValue | null;
  onChange: (v: LocationValue | null) => void;
  onPickType?: (slug: string) => void;
  popular?: SuggestItem[];
  variant?: "hero" | "bar";
  placeholder?: string;
  label?: string;
  className?: string;
  autoFocus?: boolean;
};

export function LocationCombobox({ value, onChange, onPickType, popular, variant = "bar", placeholder = "Ciudad, barrio o código", label = "Ubicación", className, autoFocus }: Props) {
  const router = useRouter();
  const uid = useId();
  const listId = `${uid}-list`;
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [remote, setRemote] = useState<SuggestItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const catalog = useCatalog();
  const recent = useRecent<SuggestItem>("nido:recent-places", 5);
  const q = useDebounced(text.trim(), 180);

  useEffect(() => { if (!typing) setText(value?.label ?? ""); }, [value?.label, typing]);
  useOutside(wrap, () => { setOpen(false); setTyping(false); });

  // Sugerencias remotas (con respaldo local desde el catálogo)
  useEffect(() => {
    if (!typing || q.length < 2) { setRemote(null); setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(true);
    api<SuggestItem[]>("/catalog/suggest", { query: { q }, signal: ctrl.signal })
      .then((r) => { setRemote(Array.isArray(r) ? r : []); })
      .catch((e: unknown) => {
        if ((e as Error)?.name === "AbortError") return;
        setRemote(localSuggest(q, catalog));
      })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [q, typing, catalog]);

  const rows = useMemo<Row[]>(() => {
    if (typing && q.length >= 2) {
      const list = remote ?? [];
      const order = ["city", "neighborhood", "type", "code"] as const;
      return order.flatMap((k) => list.filter((i) => i.kind === k).slice(0, k === "city" ? 20 : 8).map((item, i) => ({ key: `${k}-${i}-${item.label}`, item, section: KIND_SECTION[k] })));
    }
    const out: Row[] = recent.items.map((item, i) => ({ key: `r-${i}`, item, section: "Búsquedas recientes", recent: true }));
    const pop = (popular && popular.length ? popular : localPopular(catalog)).filter((p) => !recent.items.some((r) => same(r, p))).slice(0, 6);
    pop.forEach((item, i) => out.push({ key: `p-${i}`, item, section: "Ciudades populares" }));
    return out;
  }, [typing, q, remote, recent.items, popular, catalog]);

  useEffect(() => setCursor(0), [rows.length, q]);

  const pick = (item: SuggestItem) => {
    setOpen(false); setTyping(false);
    if (item.kind === "code" && item.path) { router.push(item.path); return; }
    recent.push(item, same);
    if (item.kind === "type") { onPickType?.(item.type ?? slugify(item.label)); setText(value?.label ?? ""); return; }
    const v: LocationValue = { city: item.city, neighborhood: item.kind === "neighborhood" ? item.neighborhood : undefined, label: item.label, sublabel: item.sublabel };
    setText(item.label);
    onChange(v);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setCursor((c) => Math.min(c + 1, rows.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter" && open && rows[cursor]) { e.preventDefault(); pick(rows[cursor]!.item); }
    else if (e.key === "Escape") { setOpen(false); setTyping(false); }
  };

  const hero = variant === "hero";
  let lastSection = "";
  return (
    <div ref={wrap} className={cn("relative", className)}>
      <div className={cn(hero ? "flex min-w-0 flex-col justify-center gap-0.5" : "relative")}>
        {hero && <label htmlFor={`${uid}-in`} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{label}</label>}
        <div className={cn("relative flex items-center", !hero && "h-11 rounded-full border border-line-strong bg-white pl-4 pr-2 transition focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15 hover:border-ink")}>
          {!hero && <Search className="mr-2 h-[18px] w-[18px] shrink-0 text-ink-3" aria-hidden />}
          <input
            ref={input} id={`${uid}-in`} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" autoComplete="off" spellCheck={false}
            aria-activedescendant={open && rows[cursor] ? `${uid}-o-${cursor}` : undefined} autoFocus={autoFocus}
            value={text} placeholder={placeholder} aria-label={hero ? undefined : label}
            onFocus={() => setOpen(true)}
            onChange={(e) => { setText(e.target.value); setTyping(true); setOpen(true); if (!e.target.value && value) onChange(null); }}
            onKeyDown={onKey}
            className={cn("min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-3 focus:outline-none", hero ? "h-7 truncate text-[16px] font-semibold" : "h-full truncate text-[15px] font-medium")}
          />
          {(text || value) && (
            <button type="button" aria-label="Borrar ubicación" onClick={() => { setText(""); setTyping(false); onChange(null); input.current?.focus(); }}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface hover:text-ink"><X className="h-4 w-4" /></button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}
            className="absolute left-0 top-[calc(100%+12px)] z-[70] w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-[20px] border border-line bg-white p-2 shadow-[var(--shadow-pop)]"
          >
            <ul id={listId} role="listbox" aria-label="Sugerencias de ubicación" className="max-h-[360px] overflow-y-auto overscroll-contain">
              {rows.map((r, i) => {
                const head = r.section !== lastSection;
                lastSection = r.section;
                const Ico = r.recent ? History : KIND_ICON[r.item.kind];
                return (
                  <li key={r.key} role="presentation">
                    {head && <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{r.section}</p>}
                    <div
                      id={`${uid}-o-${i}`} role="option" aria-selected={i === cursor} onMouseEnter={() => setCursor(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(r.item)}
                      className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5", i === cursor ? "bg-brand-50" : "")}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-brand-700"><Ico className="h-[18px] w-[18px]" /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold text-ink">{r.item.label}</span>
                        <span className="block truncate text-[13px] text-ink-3">{r.item.sublabel}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
              {!rows.length && (
                <li role="presentation" className="px-3 py-6 text-center text-sm text-ink-3">
                  {loading ? "Buscando…" : typing && q.length >= 2 ? `Sin resultados para “${q}”. Prueba con otra ciudad o barrio.` : "Escribe una ciudad, un barrio o el código de un anuncio."}
                </li>
              )}
            </ul>
            {recent.items.length > 0 && !typing && (
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={recent.clear} className="mt-1 w-full rounded-xl px-3 py-2 text-left text-[13px] font-medium text-ink-3 hover:bg-surface hover:text-ink">Borrar historial</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function norm(s: string) { return slugify(s).replace(/-/g, " "); }

function localSuggest(q: string, catalog: ReturnType<typeof useCatalog>): SuggestItem[] {
  if (!catalog) return [];
  const n = norm(q);
  const out: SuggestItem[] = [];
  for (const c of catalog.cities) {
    if (norm(c.name).includes(n)) out.push({ kind: "city", label: c.name, sublabel: c.department, city: c.slug });
    for (const h of c.neighborhoods) if (norm(h.name).includes(n)) out.push({ kind: "neighborhood", label: h.name, sublabel: `${c.name}, ${c.department}`, city: c.slug, neighborhood: h.slug });
  }
  for (const t of catalog.types) if (norm(t.name).includes(n) || norm(t.pluralName).includes(n)) out.push({ kind: "type", label: t.pluralName, sublabel: "Tipo de inmueble", type: t.slug });
  return out.slice(0, 12);
}

function localPopular(catalog: ReturnType<typeof useCatalog>): SuggestItem[] {
  if (!catalog) return [];
  return [...catalog.cities].sort((a, b) => b.count - a.count).slice(0, 6).map((c) => ({ kind: "city" as const, label: c.name, sublabel: c.department, city: c.slug }));
}
