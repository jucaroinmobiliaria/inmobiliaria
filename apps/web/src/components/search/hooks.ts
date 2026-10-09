"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import type { Catalog } from "@/lib/types";

export function useDebounced<T>(value: T, ms = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** `null` hasta montar (SSR/primer render), luego true/false. */
export function useMediaQuery(query: string) {
  const [m, setM] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return m;
}

export function useOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, active = true) {
  const cb = useRef(onOutside);
  useEffect(() => { cb.current = onOutside; });
  useEffect(() => {
    if (!active) return;
    const h = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb.current(); };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [ref, active]);
}

export function useIsoLayoutEffect(...args: Parameters<typeof useEffect>) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return (typeof window === "undefined" ? useEffect : useLayoutEffect)(...args);
}

/** Catálogo (tipos, comodidades, ciudades con barrios). Cacheado 5 min; acepta datos iniciales del servidor. */
export function useCatalog(initial?: Catalog | null) {
  const { data } = useSWR<Catalog>("/catalog", fetcher, { fallbackData: initial ?? undefined, revalidateOnFocus: false, dedupingInterval: 300_000, shouldRetryOnError: false });
  return data ?? null;
}

/** Bloquea el scroll del body mientras `active`. */
export function useBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Trampa de foco simple + restauración del foco al cerrar. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () => (el ? Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === document.activeElement) : []);
    const t = setTimeout(() => { (el?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0] ?? el)?.focus(); }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !el) return;
      const f = focusables();
      if (!f.length) { e.preventDefault(); return; }
      const first = f[0]!, last = f[f.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [ref, active]);
}

export function useRecent<T>(key: string, max = 5) {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setItems(JSON.parse(raw) as T[]); } catch { /* noop */ }
  }, [key]);
  const push = useCallback((item: T, same: (a: T, b: T) => boolean) => {
    setItems((prev) => {
      const next = [item, ...prev.filter((p) => !same(p, item))].slice(0, max);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, [key, max]);
  const clear = useCallback(() => { setItems([]); try { localStorage.removeItem(key); } catch { /* noop */ } }, [key]);
  return { items, push, clear };
}
