"use client";

import { useState } from "react";
import { api, ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Dialog } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Flag } from "@/components/ui/icon";

const REASONS = ["Información falsa o engañosa", "Posible estafa o fraude", "El inmueble ya no está disponible", "El precio no corresponde", "Las fotos no corresponden al inmueble", "Contenido inapropiado", "Otro motivo"];

export function ReportButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!reason) { setError("Elige un motivo"); return; }
    setBusy(true); setError(null);
    try {
      await api(`/publications/${id}/report`, { body: { reason, details: details.trim() || undefined } });
      toast.success("Gracias. Revisaremos este anuncio");
      setOpen(false); setReason(""); setDetails("");
    } catch (e) { setError(e instanceof ApiException ? (e.errors?.reason?.[0] ?? e.message) : "No pudimos enviar el reporte"); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-sm font-medium text-ink-3 underline-offset-4 transition hover:text-danger hover:underline"><Flag className="h-4 w-4" />Reportar este anuncio</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Reportar este anuncio" size="sm" sheet>
        <div className="grid gap-5 p-6">
          <p className="text-[15px] text-ink-2">Cuéntanos qué pasa. Nuestro equipo revisa cada reporte.</p>
          <fieldset className="grid gap-2">
            <legend className="sr-only">Motivo</legend>
            {REASONS.map((r) => (
              <label key={r} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-[15px] transition", reason === r ? "border-brand-700 bg-brand-50 font-semibold" : "border-line hover:border-ink")}>
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => { setReason(r); setError(null); }} className="h-4 w-4 accent-[var(--color-brand-700)]" />{r}
              </label>
            ))}
          </fieldset>
          <Textarea label="Detalles (opcional)" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} />
          {error && <p role="alert" className="text-[13px] font-medium text-danger">{error}</p>}
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button variant="dark" onClick={() => void send()} loading={busy}>Enviar reporte</Button></div>
        </div>
      </Dialog>
    </>
  );
}
