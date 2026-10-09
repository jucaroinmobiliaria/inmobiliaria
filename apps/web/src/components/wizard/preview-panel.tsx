"use client";

import { motion } from "motion/react";
import { PropertyCard } from "@/components/property/property-card";
import { cn } from "@/lib/cn";
import type { PublicationCard } from "@/lib/types";
import { Check, CircleAlert } from "@/components/uploader/icons";
import type { CheckItem } from "./steps";

export function CompletionRing({ percent, size = 64, className }: { percent: number; size?: number; className?: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} role="img" aria-label={`Tu aviso está al ${percent} por ciento`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="6" />
      <motion.circle
        cx="32" cy="32" r={r} fill="none" stroke={percent >= 100 ? "var(--color-brand-600)" : "var(--color-brand-500)"} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} initial={false} animate={{ strokeDashoffset: c * (1 - percent / 100) }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} transform="rotate(-90 32 32)"
      />
      <text x="32" y="37" textAnchor="middle" fontSize="16" fontWeight="600" fill="var(--color-ink)" fontFamily="var(--font-sans)">{percent}%</text>
    </svg>
  );
}

export function Checklist({ items, onGo, requiredOnly, className }: { items: CheckItem[]; onGo: (step: number) => void; requiredOnly?: boolean; className?: string }) {
  const list = requiredOnly ? items.filter((i) => i.required) : items;
  return (
    <ul className={cn("grid gap-1", className)}>
      {list.map((i) => (
        <li key={i.id}>
          <button type="button" onClick={() => onGo(i.step)} className="group flex min-h-9 w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[14px] transition-colors hover:bg-surface">
            <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors", i.ok ? "border-brand-600 bg-brand-600 text-white" : i.required ? "border-sun bg-sun-soft text-sun-ink" : "border-line-strong text-transparent")}>
              {i.ok ? <Check className="h-3 w-3" strokeWidth={3.5} /> : i.required ? <CircleAlert className="h-3 w-3" /> : null}
            </span>
            <span className={cn("flex-1", i.ok ? "text-ink-3" : "font-medium text-ink")}>{i.label}{!i.required && !i.ok && <span className="ml-1.5 text-[12px] font-normal text-ink-3">recomendado</span>}</span>
            {!i.ok && <span className="text-[12.5px] font-semibold text-brand-700 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Ir</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Columna fija con la tarjeta del aviso y el avance. */
export function PreviewPanel({ card, percent, items, onGo, compact, hideCard }: { card: PublicationCard; percent: number; items: CheckItem[]; onGo: (step: number) => void; compact?: boolean; hideCard?: boolean }) {
  const pending = items.filter((i) => !i.ok);
  const reqPending = pending.filter((i) => i.required);
  return (
    <div className="grid gap-5">
      {!hideCard && (
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="eyebrow">Vista previa</p>
            <p className="text-[12.5px] text-ink-3">Así se verá en los resultados</p>
          </div>
          <PropertyCard item={card} preview className="pointer-events-none select-none" sizes="360px" />
        </div>
      )}
      {!compact && (
        <div className="rounded-[24px] border border-line bg-white p-4">
          <div className="flex items-center gap-4">
            <CompletionRing percent={percent} />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">{reqPending.length === 0 ? "Listo para publicar" : `Tu aviso está al ${percent}%`}</p>
              <p className="text-[13px] leading-snug text-ink-3">{reqPending.length === 0 ? "Revisa la vista previa y publica." : `Falta${reqPending.length === 1 ? "" : "n"} ${reqPending.length} dato${reqPending.length === 1 ? "" : "s"} para poder publicar.`}</p>
            </div>
          </div>
          {pending.length > 0 && (
            <Checklist className="mt-3 border-t border-line pt-3" items={pending.slice(0, 5)} onGo={onGo} />
          )}
        </div>
      )}
    </div>
  );
}
