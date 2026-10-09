"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import type { PublicationCard as Card } from "@/lib/types";
import { PropertyCard } from "@/components/property/property-card";
import { ArrowRight } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/misc";
import { SectionHeader } from "./section-header";

const TABS = [{ id: "sale", label: "Venta", href: "/venta" }, { id: "rent", label: "Arriendo", href: "/arriendo" }] as const;

export function LatestTabs({ sale, rent }: { sale: Card[]; rent: Card[] }) {
  const [tab, setTab] = useState<"sale" | "rent">(sale.length || !rent.length ? "sale" : "rent");
  if (!sale.length && !rent.length) return null;
  const items = (tab === "sale" ? sale : rent).slice(0, 6);
  const t = TABS.find((x) => x.id === tab)!;
  return (
    <section className="container-x pt-24 md:pt-32" aria-labelledby="recientes-titulo">
      <Reveal>
        <SectionHeader eyebrow="Recién publicados" title={<span id="recientes-titulo">Lo más <em className="italic">nuevo</em></span>} text="Anuncios que acaban de llegar. Sé el primero en escribir."
          action={
            <div role="tablist" aria-label="Operación" className="relative inline-flex self-start rounded-full bg-surface p-1 md:self-auto">
              {TABS.map((x) => (
                <button key={x.id} type="button" role="tab" id={`tab-${x.id}`} aria-selected={tab === x.id} aria-controls="recientes-panel" onClick={() => setTab(x.id)}
                  className={cn("relative rounded-full px-6 py-2.5 text-[15px] font-semibold transition-colors", tab === x.id ? "text-white" : "text-ink-2 hover:text-ink")}>
                  {tab === x.id && <motion.span layoutId="latest-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <span className="relative">{x.label}</span>
                </button>
              ))}
            </div>
          } />
      </Reveal>
      <div id="recientes-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-12 min-h-[300px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => <li key={it.id}><PropertyCard item={it} /></li>)}
            {!items.length && <li className="col-span-full rounded-[20px] border border-dashed border-line-strong p-10 text-center text-ink-2">Todavía no hay anuncios nuevos aquí. Vuelve pronto.</li>}
          </motion.ul>
        </AnimatePresence>
      </div>
      <div className="mt-12 flex justify-center">
        <Link href={t.href} className="group inline-flex h-12 items-center gap-2 rounded-full border border-line-strong bg-white px-6 text-[15px] font-semibold transition hover:border-ink hover:shadow-[var(--shadow-card)]">
          Ver todos en {t.label.toLowerCase()}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
