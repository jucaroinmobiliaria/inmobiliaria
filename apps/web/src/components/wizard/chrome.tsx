"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/cn";
import { ArrowLeft, ArrowRight, Check, CircleAlert, CloudOff, Lock, LoaderCircle, TriangleAlert, X } from "@/components/uploader/icons";
import { CompletionRing } from "./preview-panel";
import { BLOCKS, STEPS, TOTAL_STEPS, stepDef, stepsOfBlock } from "./steps";
import type { SaveInfo } from "./use-draft";

export type RailState = "done" | "current" | "todo" | "locked";

/* ------------------------------ Guardado ------------------------------- */

const ago = (t: number) => {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 45) return "hace un momento";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  return "hace más de una hora";
};

export function SaveStatus({ save, onRetry, className }: { save: SaveInfo; onRetry: () => void; className?: string }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(t); }, []);
  const base = "inline-flex items-center gap-1.5 text-[13.5px] font-medium";
  let node: ReactNode;
  switch (save.state) {
    case "dirty":
    case "saving":
      node = <span className={cn(base, "whitespace-nowrap text-ink-3")}><LoaderCircle className="h-4 w-4 animate-spin" /> Guardando…</span>; break;
    case "offline":
      node = <span className={cn(base, "whitespace-nowrap text-sun-ink")}><CloudOff className="h-4 w-4" /> <span>Sin conexión<span className="hidden sm:inline"> — reintentando…</span></span></span>; break;
    case "error":
      node = <span className={cn(base, "text-danger")}><TriangleAlert className="h-4 w-4" /> <span className="max-w-[220px] truncate">{save.message ?? "No se pudo guardar"}</span> <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-4">Reintentar</button></span>; break;
    case "expired":
      node = <span className={cn(base, "text-danger")}><CircleAlert className="h-4 w-4" /> Sesión expirada · <a href="/ingresar?next=/publicar" className="font-semibold underline underline-offset-4">Ingresar</a></span>; break;
    default:
      node = <span className={cn(base, "whitespace-nowrap text-ink-3")}><Check className="h-4 w-4 text-brand-600" strokeWidth={3} /> <span>Guardado<span className="hidden sm:inline"> {ago(save.at)}</span></span></span>;
  }
  return <div role="status" aria-live="polite" className={className}>{node}</div>;
}

/* ------------------------------ Barra superior -------------------------- */

export function TopBar({ save, onRetry, onExit, onLogo, progress }: { save: SaveInfo; onRetry: () => void; onExit: () => void; onLogo: () => void; progress: number }) {
  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-4 md:px-8">
      <div onClickCapture={(e) => { if ((e.target as HTMLElement).closest("a")) { e.preventDefault(); onLogo(); } }}><Logo /></div>
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <SaveStatus save={save} onRetry={onRetry} className="min-w-0" />
        <Button variant="outline" size="sm" onClick={onExit} className="shrink-0"><span className="hidden sm:inline">Guardar y salir</span><span className="sm:hidden">Salir</span></Button>
      </div>
      <div className="absolute inset-x-0 -bottom-px h-[3px] overflow-hidden" aria-hidden>
        <motion.div className="h-full bg-brand-600" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
      </div>
    </header>
  );
}

/* -------------------------------- Rieles -------------------------------- */

interface RailProps { step: number; states: RailState[]; onGo: (n: number) => void }

/** Riel vertical con los 10 pasos agrupados en 6 bloques (pantallas anchas y hoja móvil). */
export function VerticalRail({ step, states, onGo, onPick }: RailProps & { onPick?: () => void }) {
  return (
    <nav aria-label="Pasos para publicar" className="grid gap-5">
      {BLOCKS.map((b, bi) => (
        <div key={b}>
          <p className="eyebrow mb-2.5 !text-[11px] !text-ink-3">{b}</p>
          <ol className="relative grid gap-0.5">
            {stepsOfBlock(bi).map((s, i, arr) => {
              const st = states[s.n - 1] ?? "todo";
              const last = i === arr.length - 1;
              return (
                <li key={s.n} className="relative">
                  {!last && <span className={cn("absolute left-[13px] top-8 h-[calc(100%-8px)] w-0.5 rounded", st === "done" ? "bg-brand-600" : "bg-line")} aria-hidden />}
                  <button
                    type="button" onClick={() => { onGo(s.n); onPick?.(); }} aria-current={st === "current" ? "step" : undefined}
                    title={st === "locked" ? "Completa los pasos anteriores para llegar aquí" : undefined}
                    className={cn("group flex min-h-10 w-full items-center gap-3 rounded-xl py-1 pr-2 text-left transition-colors", st === "locked" ? "cursor-not-allowed" : "hover:bg-surface")}
                  >
                    <span className={cn(
                      "relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[12px] font-bold transition-all duration-300",
                      st === "done" && "border-brand-600 bg-brand-600 text-white",
                      st === "current" && "border-brand-600 bg-white text-brand-700 ring-4 ring-brand-600/15",
                      st === "todo" && "border-line-strong bg-white text-ink-3 group-hover:border-ink",
                      st === "locked" && "border-line bg-surface text-ink-3/60",
                    )}>
                      {st === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3.5} /> : st === "locked" ? <Lock className="h-3 w-3" /> : s.n}
                    </span>
                    <span className={cn("text-[14.5px] leading-tight", st === "current" ? "font-semibold text-ink" : st === "locked" ? "text-ink-3/70" : "font-medium text-ink-2")}>{s.short}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </nav>
  );
}

/** Riel horizontal en 6 segmentos (debajo de xl). */
export function SegmentRail({ step, states, onGo, onMore }: RailProps & { onMore: () => void }) {
  const cur = stepDef(step);
  return (
    <div className="shrink-0 border-b border-line bg-white px-4 pb-3 pt-3 md:px-8 xl:hidden">
      <div className="mx-auto max-w-[1480px]">
        <ol className="grid grid-cols-6 gap-1.5 md:gap-3">
          {BLOCKS.map((b, bi) => {
            const steps = stepsOfBlock(bi);
            const done = steps.filter((s) => states[s.n - 1] === "done").length;
            const here = steps.some((s) => s.n === step);
            const pct = ((done + (here ? 0.5 : 0)) / steps.length) * 100;
            const first = steps[0]!.n;
            const locked = steps.every((s) => states[s.n - 1] === "locked");
            return (
              <li key={b}>
                <button type="button" onClick={() => onGo(here ? step : first)} aria-label={`${b}${here ? " (bloque actual)" : ""}`} aria-current={here ? "step" : undefined} className="group block w-full text-left">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <motion.span className="block h-full rounded-full bg-brand-600" initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
                  </span>
                  <span className={cn("mt-2 hidden truncate text-[13px] md:block", here ? "font-semibold text-ink" : locked ? "text-ink-3/60" : "text-ink-2 group-hover:text-ink")}>{b}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-2.5 flex items-center justify-between gap-3 md:hidden">
          <p className="min-w-0 truncate text-[13.5px] text-ink-2"><span className="font-semibold text-ink">Paso {step} de {TOTAL_STEPS}</span> · {cur.short}</p>
          <button type="button" onClick={onMore} className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-brand-700 hover:bg-brand-50">Ver pasos</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Barra inferior -------------------------- */

export function BottomBar({
  step, onBack, onNext, nextLabel, nextLoading, nextTone = "primary", message, percent, onPreview, hideBack,
}: {
  step: number; onBack: () => void; onNext: () => void; nextLabel: string; nextLoading?: boolean; nextTone?: "primary" | "sun";
  message?: string | null; percent: number; onPreview: () => void; hideBack?: boolean;
}) {
  return (
    <footer className="relative z-20 shrink-0 border-t border-line bg-white/95 backdrop-blur safe-bottom">
      <AnimatePresence initial={false}>
        {message && (
          <motion.div
            key="msg" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
          >
            <div className="mx-auto max-w-[1480px] px-4 pt-3 md:px-8">
              <div className="mx-auto grid max-w-[1480px] lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-12 xl:grid-cols-[200px_minmax(0,1fr)_360px]">
                <p role="alert" className="flex items-start gap-2 rounded-2xl bg-sun-soft px-4 py-2.5 text-[14px] font-medium leading-snug text-sun-ink lg:col-start-1 xl:col-start-2"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mx-auto max-w-[1480px] px-4 py-3 md:px-8">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-12 xl:grid-cols-[200px_minmax(0,1fr)_360px]">
          <div className="flex items-center justify-between gap-3 lg:col-start-1 xl:col-start-2">
            {hideBack ? <span /> : (
              <Button variant="ghost" size="md" onClick={onBack} aria-label={`Volver al paso ${step - 1}`} className="-ml-2 min-w-11 px-3 sm:px-5"><ArrowLeft className="h-4 w-4" /> <span className="max-[430px]:sr-only">Atrás</span></Button>
            )}
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={onPreview} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line py-1 pl-1 pr-3 text-[13px] font-semibold text-ink-2 transition hover:border-ink lg:hidden" aria-label="Ver vista previa del aviso">
                <CompletionRing percent={percent} size={34} /> Vista previa
              </button>
              <Button size="lg" variant={nextTone} onClick={onNext} loading={nextLoading} className="min-w-[8.5rem] sm:min-w-[11rem]">
                {nextLabel} {nextTone === "primary" && <ArrowRight className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------ Hoja de pasos --------------------------- */

export function StepsSheetHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-5 py-4">
      <h2 className="text-lg font-semibold">Todos los pasos</h2>
      <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface"><X className="h-5 w-5" /></button>
    </div>
  );
}

export { STEPS };
