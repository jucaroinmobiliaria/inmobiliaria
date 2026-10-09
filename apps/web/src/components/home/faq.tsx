"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { Plus } from "@/components/ui/icon";
import { FAQ } from "./faq-data";

export function FaqAccordion({ items = FAQ, className, defaultOpen = 0 }: { items?: { q: string; a: string }[]; className?: string; defaultOpen?: number | null }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const uid = useId();
  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q}>
            <h3>
              <button type="button" id={`${uid}-h-${i}`} aria-expanded={isOpen} aria-controls={`${uid}-p-${i}`} onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full items-center justify-between gap-6 py-6 text-left">
                <span className={cn("font-display text-[1.45rem] leading-snug tracking-tight transition-colors sm:text-[1.7rem]", isOpen ? "text-brand-700" : "text-ink group-hover:text-brand-700")}>{it.q}</span>
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-all duration-300", isOpen ? "rotate-45 border-brand-700 bg-brand-700 text-white" : "border-line-strong group-hover:border-ink")}><Plus className="h-5 w-5" /></span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div id={`${uid}-p-${i}`} role="region" aria-labelledby={`${uid}-h-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                  <p className="max-w-3xl pb-7 text-[17px] leading-relaxed text-ink-2">{it.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
