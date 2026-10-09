"use client";

import Link from "next/link";
import {
  type ComponentProps, type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState,
} from "react";
import { createPortal } from "react-dom";
import useSWR, { type SWRConfiguration } from "swr";
import { api, ApiException } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Dialog, Skeleton } from "@/components/ui/misc";
import { ChevronLeft, ChevronRight, CircleAlert, RefreshCw, Search, X } from "@/components/ui/icon";
import { burst, confirmBurst, menuBurst } from "@/components/motion/gestures";

/* =====================================================================
 * Datos: SWR + manejo de 401/403
 * ===================================================================== */

export function loginRedirect() {
  if (typeof window === "undefined") return;
  const next = window.location.pathname + window.location.search;
  window.location.assign(`/ingresar?next=${encodeURIComponent(next)}`);
}

async function authFetcher<T>(path: string): Promise<T> {
  try {
    return await api<T>(path);
  } catch (e) {
    if (e instanceof ApiException && e.status === 401) loginRedirect();
    throw e;
  }
}

/** useSWR sobre `api()` con keepPreviousData y redirección al login si la sesión caducó. */
export function useData<T>(path: string | null, config?: SWRConfiguration<T, ApiException>) {
  return useSWR<T, ApiException>(path, authFetcher<T>, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    ...config,
  });
}

/** Mensaje legible para un error de la API (o genérico). Redirige al login en 401. */
export function errText(e: unknown, fallback = "No se pudo completar la acción. Inténtalo de nuevo."): string {
  if (e instanceof ApiException) {
    if (e.status === 401) { loginRedirect(); return "Tu sesión expiró. Vuelve a ingresar."; }
    if (e.status === 403) return e.message && !/^Error \d+/.test(e.message) ? e.message : "No tienes permiso para hacer esto.";
    if (e.status === 429) return "Demasiadas solicitudes seguidas. Espera un momento.";
    if (e.errors) {
      const first = Object.values(e.errors).flat()[0];
      if (first) return first;
    }
    return e.message || fallback;
  }
  return fallback;
}

/** Primer mensaje por campo de ApiException.errors. */
export function fieldErrors(e: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (e instanceof ApiException && e.errors) {
    for (const [k, v] of Object.entries(e.errors)) if (v?.[0]) out[k] = v[0];
  }
  return out;
}

/** Evita el doble envío: ignora llamadas mientras haya una en curso. */
export function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lock.current) return undefined;
    lock.current = true;
    setBusy(true);
    try { return await fn(); } finally { lock.current = false; setBusy(false); }
  }, []);
  return { busy, run };
}

export function useDebounced<T>(value: T, ms = 320): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* =====================================================================
 * Presentación básica
 * ===================================================================== */

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display-md mt-1 text-balance">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function ErrorState({ error, onRetry, compact }: { error?: unknown; onRetry?: () => void; compact?: boolean }) {
  const forbidden = error instanceof ApiException && error.status === 403;
  const msg = forbidden
    ? "No tienes permiso para ver esta sección."
    : error instanceof ApiException && error.status >= 400 && error.status < 500 && error.message ? error.message : "No pudimos cargar la información. Revisa tu conexión e inténtalo otra vez.";
  return (
    <div role="alert" className={cn("grid place-items-center gap-3 rounded-[20px] border border-danger/25 bg-danger-soft/60 px-6 text-center", compact ? "py-8" : "py-14")}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-danger"><CircleAlert className="h-6 w-6" /></span>
      <div>
        <p className="font-semibold text-ink">{forbidden ? "Acceso restringido" : "Algo salió mal"}</p>
        <p className="mt-1 max-w-md text-sm text-ink-2">{msg}</p>
      </div>
      {onRetry && !forbidden && <Button size="sm" variant="outline" onClick={onRetry}><RefreshCw className="h-4 w-4" />Reintentar</Button>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6" aria-busy="true" aria-label="Cargando">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3"><Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-72 max-w-full" /></div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-[20px]" />)}</div>
      <Skeleton className="h-72 rounded-[20px]" />
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Buscar…", label = "Buscar", className }: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Input aria-label={label} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        leading={<Search className="h-[18px] w-[18px]" />} className="h-11 [&::-webkit-search-cancel-button]:hidden" trailing={value ? (
          <button type="button" aria-label="Limpiar búsqueda" onClick={() => onChange("")} className="pointer-events-auto grid h-7 w-7 place-items-center rounded-full hover:bg-surface"><X className="h-4 w-4" /></button>
        ) : undefined} />
    </div>
  );
}

/** Selector segmentado (píldoras) accesible. */
export function Segmented<T extends string>({ value, onChange, items, label, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[]; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex max-w-full justify-self-start overflow-x-auto rounded-full bg-surface p-1 no-scrollbar", className)}>
      {items.map((i) => (
        <button key={i.value} type="button" role="radio" aria-checked={value === i.value} onClick={() => onChange(i.value)}
          className={cn("h-9 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all", value === i.value ? "bg-white text-ink shadow-[0_1px_3px_rgb(14_21_18/0.14)]" : "text-ink-2 hover:text-ink")}>
          {i.label}{i.count != null && <span className="ml-1.5 text-xs text-ink-3 tabular">{i.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, totalPages, total, pageSize, onPage, className }: { page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void; className?: string }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Paginación" className={cn("flex flex-wrap items-center justify-between gap-3 text-sm text-ink-2", className)}>
      <p className="tabular">Mostrando <strong className="text-ink">{from}–{to}</strong> de <strong className="text-ink">{total.toLocaleString("es-CO")}</strong></p>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" />Anterior</Button>
        <span className="px-2 tabular">Página {page} de {Math.max(1, totalPages)}</span>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Página siguiente">Siguiente<ChevronRight className="h-4 w-4" /></Button>
      </div>
    </nav>
  );
}

/** Texto con división tonal de números (p. ej. "+12 %" / "−3 %"). */
export function Delta({ value, className }: { value: number; className?: string }) {
  const up = value > 0, down = value < 0;
  const text = `${up ? "+" : down ? "−" : ""}${Math.abs(Math.round(value)).toLocaleString("es-CO")} %`;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular", up ? "bg-success-soft text-success" : down ? "bg-danger-soft text-danger" : "bg-surface-2 text-ink-2", className)}>
      <span aria-hidden>{up ? "↑" : down ? "↓" : "→"}</span>
      <span className="sr-only">{up ? "Subió" : down ? "Bajó" : "Sin cambio"}</span>
      {text}
    </span>
  );
}

/* =====================================================================
 * Diálogos con foco administrado
 * ===================================================================== */

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function FocusScope({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const root = ref.current?.closest<HTMLElement>('[role="dialog"]') ?? ref.current;
    const raf = requestAnimationFrame(() => {
      const target = ref.current?.querySelector<HTMLElement>("[data-autofocus]") ?? ref.current?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus({ preventScroll: true });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !root) return;
      const els = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!els.length) return;
      const first = els[0]!, last = els[els.length - 1]!;
      const active = document.activeElement;
      if (!root.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, []);
  return <div ref={ref}>{children}</div>;
}

/** Dialog con trampa de foco, foco inicial (`data-autofocus`) y restauración del foco al cerrar. */
export function Modal({ children, ...props }: ComponentProps<typeof Dialog>) {
  return <Dialog {...props}><FocusScope>{children}</FocusScope></Dialog>;
}

export function ConfirmDialog({
  open, title, description, confirmLabel = "Confirmar", cancelLabel = "Cancelar", tone = "danger", loading, onConfirm, onClose, children,
}: {
  open: boolean; title: string; description?: ReactNode; confirmLabel?: string; cancelLabel?: string; tone?: "danger" | "primary";
  loading?: boolean; onConfirm: () => void; onClose: () => void; children?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={loading ? () => undefined : onClose} title={title} size="sm" sheet>
      <div className="grid gap-5 p-6">
        {description && <div className="text-[15px] leading-relaxed text-ink-2">{description}</div>}
        {children}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading} data-autofocus={tone === "danger" ? "" : undefined}>{cancelLabel}</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={loading} onClick={(e) => { burst(confirmBurst(confirmLabel), e.currentTarget); onConfirm(); }} data-autofocus={tone === "danger" ? undefined : ""}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* =====================================================================
 * Menú de acciones (portal, teclado, volteo vertical)
 * ===================================================================== */

export type MenuItem = {
  label: string; icon?: ReactNode; onSelect?: () => void; href?: string; external?: boolean;
  tone?: "danger"; disabled?: boolean; hidden?: boolean; separatorBefore?: boolean; hint?: string;
};

export function ActionMenu({ items, label = "Más acciones", trigger, align = "end", className }: { items: MenuItem[]; label?: string; trigger?: ReactNode; align?: "start" | "end"; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number }>({});
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const visible = items.filter((i) => !i.hidden);

  const close = useCallback((restore = true) => {
    setOpen(false);
    if (restore) btn.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const h = visible.length * 42 + 16;
    const flip = r.bottom + h + 12 > window.innerHeight && r.top > h;
    const p: typeof pos = flip ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 };
    const w = Math.min(240, window.innerWidth - 16);
    p.left = Math.min(Math.max(8, align === "end" ? r.right - w : r.left), window.innerWidth - w - 8);
    setPos(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align, visible.length]);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus());
    const down = (e: MouseEvent) => {
      const n = e.target as Node;
      if (!menu.current?.contains(n) && !btn.current?.contains(n)) close(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    // En móvil la barra del navegador dispara scroll/resize mínimos: solo cerramos ante un cambio real.
    const y0 = window.scrollY, w0 = window.innerWidth;
    const onScroll = (e: Event) => { if (e.target === document && Math.abs(window.scrollY - y0) < 8) return; close(false); };
    const onResize = () => { if (window.innerWidth !== w0) close(false); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, close]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const els = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])];
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); els[(i + 1) % els.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); els[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); els[els.length - 1]?.focus(); }
    else if (e.key === "Tab") { close(false); }
  };

  const itemCls = (it: MenuItem) => cn(
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium outline-none transition-colors",
    it.disabled ? "cursor-not-allowed opacity-45" : it.tone === "danger" ? "text-danger hover:bg-danger-soft focus-visible:bg-danger-soft" : "text-ink hover:bg-surface focus-visible:bg-surface",
  );

  return (
    <>
      <button ref={btn} type="button" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((v) => !v)}
        className={cn(trigger ? "" : "grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-white text-ink transition hover:border-ink", className)}>
        {trigger ?? <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={menu} role="menu" aria-label={label} onKeyDown={onMenuKey} style={{ position: "fixed", zIndex: 120, ...pos }}
          className="w-60 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[var(--shadow-pop)] animate-[fade-in_0.12s_ease-out]">
          {visible.map((it, idx) => {
            const inner = (<>{it.icon && <span className="grid h-5 w-5 shrink-0 place-items-center text-ink-3 [&>svg]:h-[18px] [&>svg]:w-[18px]">{it.icon}</span>}<span className="flex-1">{it.label}</span>{it.hint && <span className="text-xs text-ink-3">{it.hint}</span>}</>);
            return (
              <div key={`${it.label}-${idx}`}>
                {it.separatorBefore && <div className="my-1 h-px bg-line" role="separator" />}
                {it.href ? (
                  <Link role="menuitem" href={it.href} target={it.external ? "_blank" : undefined} rel={it.external ? "noopener" : undefined} className={itemCls(it)} onClick={() => close(false)}>{inner}</Link>
                ) : (
                  <button type="button" role="menuitem" aria-disabled={it.disabled || undefined} className={itemCls(it)}
                    onClick={(e) => { if (it.disabled) return; const g = menuBurst(it.label); if (g) burst(g, e.currentTarget); close(false); it.onSelect?.(); }}>{inner}</button>
                )}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}

/* =====================================================================
 * Utilidades de formato
 * ===================================================================== */

export const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const k = dayKey(iso);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const pretty = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(d);
  if (k === dayKey(today.toISOString())) return `Hoy · ${pretty}`;
  if (k === dayKey(tomorrow.toISOString())) return `Mañana · ${pretty}`;
  if (k === dayKey(yesterday.toISOString())) return `Ayer · ${pretty}`;
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

export const formatTime = (iso: string) => new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

/** Normaliza completitud: acepta 0–1 o 0–100. */
export const pct = (n: number | null | undefined) => {
  if (n == null || Number.isNaN(n)) return 0;
  const v = n > 0 && n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(v)));
};

export function CompletionBar({ value, className }: { value: number; className?: string }) {
  const v = pct(value);
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label="Completitud del aviso">
        <div className={cn("h-full rounded-full transition-all duration-700", v >= 100 ? "bg-brand-600" : "bg-sun")} style={{ width: `${v}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-semibold text-ink-2 tabular">{v}%</span>
    </div>
  );
}
