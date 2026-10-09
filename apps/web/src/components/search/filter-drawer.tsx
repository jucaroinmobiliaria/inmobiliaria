"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { X } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useBodyLock, useFocusTrap, useMediaQuery } from "./hooks";
import { AmenitiesSection, AreaSection, ConditionSection, ExtrasSection, PriceSection, RoomsSection, StratumSection, TypeSection, type FilterCtx } from "./filter-sections";

/** Panel de filtros: hoja inferior en móvil, cajón lateral en escritorio. */
export function FilterDrawer({ open, onClose, ctx, total, activeCount, onClear, header }: {
  open: boolean; onClose: () => void; ctx: FilterCtx; total: number | null; activeCount: number; onClear: () => void; header?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const desktop = useMediaQuery("(min-width: 768px)");
  const ref = useRef<HTMLDivElement>(null);
  useBodyLock(open);
  useFocusTrap(ref, open);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <motion.div
        ref={ref} role="dialog" aria-modal="true" aria-label="Más filtros" tabIndex={-1}
        initial={desktop ? { x: "100%" } : { y: "100%" }} animate={{ x: 0, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn("absolute flex flex-col bg-white shadow-[var(--shadow-pop)] focus:outline-none",
          desktop ? "inset-y-0 right-0 w-[520px] max-w-full" : "inset-x-0 bottom-0 max-h-[92dvh] min-h-[70dvh] rounded-t-[28px]")}
      >
        {!desktop && <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong" aria-hidden />}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-[1.9rem] leading-none">Filtros</h2>
          <button type="button" data-autofocus onClick={onClose} aria-label="Cerrar filtros" className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">
          {header}
          <div className="grid gap-9 [&>*+*]:border-t [&>*+*]:border-line [&>*+*]:pt-9">
            <TypeSection ctx={ctx} />
            <PriceSection ctx={ctx} />
            <RoomsSection ctx={ctx} />
            <AreaSection ctx={ctx} />
            <StratumSection ctx={ctx} />
            <AmenitiesSection ctx={ctx} />
            <ConditionSection ctx={ctx} />
            <ExtrasSection ctx={ctx} />
          </div>
        </div>
        <div className="safe-bottom flex items-center justify-between gap-3 border-t border-line bg-white px-6 pt-4">
          <button type="button" onClick={onClear} disabled={!activeCount} className="rounded-full px-3 py-2 text-[15px] font-semibold text-ink underline underline-offset-4 disabled:no-underline disabled:opacity-40">Limpiar todo</button>
          <Button size="lg" onClick={onClose} className="min-w-[200px]">{total == null ? "Ver resultados" : total === 0 ? "Sin resultados" : `Ver ${new Intl.NumberFormat("es-CO").format(total)} ${total === 1 ? "inmueble" : "inmuebles"}`}</Button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
