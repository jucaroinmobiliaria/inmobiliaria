"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useIsoLayoutEffect, useOutside } from "./hooks";

type TriggerProps = { open: boolean; toggle: () => void; "aria-haspopup": "dialog"; "aria-expanded": boolean; "aria-controls": string };

/** Popover accesible, con cierre por clic fuera / Escape y ajuste para no salirse de la pantalla. */
export function Popover({ trigger, children, open: openProp, onOpenChange, align = "start", className, panelClassName, label }: {
  trigger: (p: TriggerProps) => ReactNode;
  children: ReactNode | ((p: { close: () => void }) => ReactNode);
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  align?: "start" | "end";
  className?: string;
  panelClassName?: string;
  label: string;
}) {
  const [inner, setInner] = useState(false);
  const open = openProp ?? inner;
  const set = (o: boolean) => { setInner(o); onOpenChange?.(o); };
  const ref = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  const id = useId();
  useOutside(ref, () => set(false), open);

  useIsoLayoutEffect(() => {
    if (!open) { setShift(0); return; }
    const el = panel.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    let s = 0;
    if (r.right > vw - 12) s = vw - 12 - r.right;
    if (r.left + s < 12) s = 12 - r.left;
    setShift(s);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)} onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); set(false); } }}>
      {trigger({ open, toggle: () => set(!open), "aria-haspopup": "dialog", "aria-expanded": open, "aria-controls": id })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel} id={id} role="dialog" aria-label={label}
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ x: shift }}
            className={cn("absolute top-[calc(100%+10px)] z-[60] min-w-[260px] rounded-[20px] border border-line bg-white p-4 text-ink shadow-[var(--shadow-pop)]",
              align === "start" ? "left-0" : "right-0", panelClassName)}
          >
            {typeof children === "function" ? children({ close: () => set(false) }) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
