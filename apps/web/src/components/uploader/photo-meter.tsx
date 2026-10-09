import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { Check } from "./icons";
import { IDEAL_PHOTOS, MIN_PHOTOS } from "@/components/wizard/steps";
import { MAX_PHOTOS } from "./types";

/** Contador "7 de 40" + medidor de recomendación (mínimo 3, ideal 8 o más). */
export function PhotoMeter({ ready, total, uploading }: { ready: number; total: number; uploading: number }) {
  const pct = Math.min(1, ready / IDEAL_PHOTOS) * 100;
  const level = ready >= IDEAL_PHOTOS ? "great" : ready >= MIN_PHOTOS ? "ok" : "low";
  const label = level === "great" ? "Excelente cantidad" : level === "ok" ? `Bien: con ${IDEAL_PHOTOS} o más es ideal` : `Mínimo ${MIN_PHOTOS} para publicar`;
  return (
    <div className="min-w-0 flex-1 basis-[280px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-[15px] font-semibold tabular text-ink" aria-live="polite">
          {total} de {MAX_PHOTOS} <span className="font-normal text-ink-2">fotos</span>
          {uploading > 0 && <span className="ml-2 font-normal text-ink-3">· subiendo {uploading}…</span>}
        </p>
        <Badge tone={level === "great" ? "success" : level === "ok" ? "brand" : "warn"}>
          {level === "great" && <Check className="h-3 w-3" strokeWidth={3} />}{label}
        </Badge>
      </div>
      <div className="mt-2.5" role="meter" aria-label="Cantidad de fotos recomendada" aria-valuemin={0} aria-valuemax={IDEAL_PHOTOS} aria-valuenow={Math.min(ready, IDEAL_PHOTOS)} aria-valuetext={`${ready} fotos listas. ${label}`}>
        <div className="relative h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn("h-full rounded-full transition-[width,background-color] duration-500 ease-[var(--ease-out-expo)]", level === "great" ? "bg-brand-600" : level === "ok" ? "bg-brand-400" : "bg-sun")}
            style={{ width: `${pct}%` }}
          />
          <span className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${(MIN_PHOTOS / IDEAL_PHOTOS) * 100}%` }} aria-hidden />
        </div>
        <div className="relative mt-1 h-4 text-[11px] font-medium text-ink-3" aria-hidden>
          <span className="absolute -translate-x-1/2" style={{ left: `${(MIN_PHOTOS / IDEAL_PHOTOS) * 100}%` }}>mín. {MIN_PHOTOS}</span>
          <span className="absolute right-0">ideal {IDEAL_PHOTOS}+</span>
        </div>
      </div>
    </div>
  );
}
