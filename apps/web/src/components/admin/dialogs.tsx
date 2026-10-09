"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Chip } from "@/components/ui/misc";
import { Check, Sparkles } from "@/components/ui/icon";
import { Modal } from "@/components/panel/common";
import { burst } from "@/components/motion/gestures";

export const QUICK_REASONS = [
  "Fotos de baja calidad",
  "Información incompleta",
  "Precio inconsistente",
  "Contenido no permitido",
  "Datos de contacto en la descripción",
  "Inmueble duplicado",
] as const;

export function RejectDialog({ open, title, onClose, onSubmit, loading }: {
  open: boolean; title: string; onClose: () => void; onSubmit: (reason: string) => void; loading?: boolean;
}) {
  const [chips, setChips] = useState<string[]>([]);
  const [free, setFree] = useState("");
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (open) { setChips([]); setFree(""); setTouched(false); } }, [open]);

  const reason = [...chips, free.trim()].filter(Boolean).map((s) => s.replace(/[.\s]+$/, "")).join(". ");
  const valid = reason.length >= 10;
  const submit = () => { setTouched(true); if (valid && !loading) onSubmit(`${reason}.`); };

  return (
    <Modal open={open} onClose={loading ? () => undefined : onClose} title="Rechazar publicación" size="md" sheet>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-5 p-6">
        <p className="text-sm text-ink-2">Le enviaremos este motivo a quien publicó «<strong className="text-ink">{title}</strong>» para que pueda corregirlo y volver a enviarlo.</p>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Motivos frecuentes</legend>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <Chip key={r} active={chips.includes(r)} onClick={() => setChips((c) => (c.includes(r) ? c.filter((x) => x !== r) : [...c, r]))} className="h-9 px-3.5">
                {chips.includes(r) && <Check className="h-3.5 w-3.5" />}{r}
              </Chip>
            ))}
          </div>
        </fieldset>
        <Textarea label="Detalle para el anunciante" data-autofocus="" value={free} onChange={(e) => setFree(e.target.value)} maxLength={600} placeholder="Ej. La foto de la sala está borrosa y falta el baño principal."
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
          error={touched && !valid ? "Elige al menos un motivo o escribe un detalle (mínimo 10 caracteres)." : undefined} hint="Ctrl + Enter para enviar" />
        {reason && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-ink"><span className="font-semibold text-danger">Vista previa: </span>{reason}.</p>}
        <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex gap-2 border-t border-line bg-white px-6 py-4 sm:justify-end [&>*]:flex-1 sm:[&>*]:flex-none">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" variant="danger" loading={loading} onClick={(e) => { if (valid && !loading) burst("reject", e.currentTarget); }}>Rechazar y notificar</Button>
        </div>
      </form>
    </Modal>
  );
}

const DAYS = [7, 15, 30, 60, 90];

export function FeatureDialog({ open, title, featured, onClose, onSubmit, loading }: {
  open: boolean; title: string; featured: boolean; onClose: () => void; onSubmit: (v: { featured: boolean; days?: number }) => void; loading?: boolean;
}) {
  const [days, setDays] = useState(30);
  useEffect(() => { if (open) setDays(30); }, [open]);
  return (
    <Modal open={open} onClose={loading ? () => undefined : onClose} title={featured ? "Gestionar destacado" : "Destacar publicación"} size="sm" sheet>
      <div className="grid gap-5 p-6">
        <p className="text-sm text-ink-2">«<strong className="text-ink">{title}</strong>» {featured ? "ya está destacada. Puedes extender el periodo o quitarla de destacados." : "aparecerá primero en búsquedas y en la portada durante el periodo elegido."}</p>
        <div role="radiogroup" aria-label="Días destacada" className="grid grid-cols-5 gap-2">
          {DAYS.map((d) => (
            <button key={d} type="button" role="radio" aria-checked={days === d} onClick={() => setDays(d)} data-autofocus={d === 30 ? "" : undefined}
              className={cn("grid h-16 place-items-center rounded-2xl border text-center transition", days === d ? "border-brand-700 bg-brand-50 text-brand-800" : "border-line-strong hover:border-ink")}>
              <span className="text-lg font-semibold leading-none tabular">{d}</span><span className="text-[11px] text-ink-3">días</span>
            </button>
          ))}
        </div>
        <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-wrap gap-2 border-t border-line bg-white px-6 py-4 sm:justify-end [&>*]:flex-1 sm:[&>*]:flex-none">
          {featured && <Button variant="outline" onClick={() => onSubmit({ featured: false })} disabled={loading} className="sm:mr-auto hover:!border-danger hover:!text-danger">Quitar destacado</Button>}
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="sun" loading={loading} onClick={() => onSubmit({ featured: true, days })}><Sparkles className="h-4 w-4" />{featured ? "Actualizar" : "Destacar"} {days} días</Button>
        </div>
      </div>
    </Modal>
  );
}
