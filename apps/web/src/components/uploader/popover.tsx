"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Dialog } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

/** Media query reactiva sin parpadeo de hidratación (false en el servidor). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

interface Props {
  open: boolean;
  anchor: HTMLElement | null;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: number;
  className?: string;
}

/** Menú anclado en escritorio; hoja inferior en móvil. */
export function AnchoredMenu({ open, anchor, onClose, title, children, width = 272, className }: Props) {
  const narrow = useMediaQuery("(max-width: 639px)");
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; origin: string } | null>(null);

  useLayoutEffect(() => {
    if (!open || narrow || !anchor || !ref.current) return;
    const a = anchor.getBoundingClientRect();
    const h = ref.current.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const below = vh - a.bottom - 12;
    const up = below < h && a.top > below;
    const top = up ? Math.max(8, a.top - h - 8) : Math.min(vh - h - 8, a.bottom + 8);
    const left = Math.max(8, Math.min(vw - width - 8, a.right - width));
    setPos({ top, left, origin: up ? "bottom right" : "top right" });
  }, [open, narrow, anchor, width, children]);

  useEffect(() => {
    if (!open || narrow) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); anchor?.focus(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
        if (!items.length) return;
        e.preventDefault();
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    };
    const close = () => onClose();
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("resize", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [open, narrow, anchor, onClose]);

  useEffect(() => {
    if (!open || narrow || !pos) return;
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus({ preventScroll: true });
  }, [open, narrow, pos]);

  if (!open) return null;
  if (narrow) {
    return <Dialog open onClose={onClose} title={title} sheet size="md">{children}</Dialog>;
  }
  if (typeof document === "undefined") return null;
  return createPortal(
    <motion.div
      ref={ref} role="menu" aria-label={title}
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: pos ? 1 : 0, scale: pos ? 1 : 0.96 }} transition={{ duration: 0.16 }}
      style={{ position: "fixed", top: pos?.top ?? 0, left: pos?.left ?? 0, width, transformOrigin: pos?.origin, zIndex: 120 }}
      className={cn("rounded-[20px] border border-line bg-white p-2 shadow-[var(--shadow-pop)]", className)}
    >
      {children}
    </motion.div>,
    document.body,
  );
}

export function MenuItem({ icon, children, onClick, danger, disabled, hint, ariaLabel }: { icon?: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean; hint?: string; ariaLabel?: string }) {
  return (
    <button
      type="button" role="menuitem" aria-label={ariaLabel} disabled={disabled} onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left text-[15px] font-medium transition-colors focus-visible:bg-surface focus-visible:outline-none enabled:hover:bg-surface disabled:opacity-40",
        danger ? "text-danger enabled:hover:bg-danger-soft focus-visible:bg-danger-soft" : "text-ink",
      )}
    >
      {icon && <span className="grid h-5 w-5 shrink-0 place-items-center text-ink-2">{icon}</span>}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs text-ink-3">{hint}</span>}
    </button>
  );
}
