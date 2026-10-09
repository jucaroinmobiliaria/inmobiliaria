"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, ApiException } from "@/lib/api";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import type { AiDescriptionRequest, AiDescriptionResponse } from "@/lib/types";
import { Check, Lightbulb, RefreshCw, Sparkles, Undo2 } from "@/components/uploader/icons";
import { FieldBlock } from "./fields";
import { DESC_MAX, DESC_MIN, TITLE_MAX, TITLE_MIN } from "./steps";
import type { StepProps } from "./types";

type Tone = NonNullable<AiDescriptionRequest["tone"]>;
const TONES: { id: Tone; label: string; hint: string }[] = [
  { id: "cercano", label: "Cercano", hint: "Cálido y directo" },
  { id: "formal", label: "Formal", hint: "Sobrio y claro" },
  { id: "premium", label: "Premium", hint: "Elegante y aspiracional" },
];

function Counter({ n, min, max }: { n: number; min: number; max: number }) {
  const ok = n >= min;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[12.5px] font-medium tabular", ok ? "text-success" : "text-ink-3")}>
      {ok && <Check className="h-3.5 w-3.5" strokeWidth={3} />}{n}/{max}{!ok && <span className="text-ink-3"> · mín. {min}</span>}
    </span>
  );
}

export function StepText({ draft, catalog, update, errors, type, city }: StepProps) {
  const [tone, setTone] = useState<Tone>("cercano");
  const [extras, setExtras] = useState("");
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<{ title: string; description: string } | null>(null);
  const [generated, setGenerated] = useState<AiDescriptionResponse | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(520, Math.max(180, el.scrollHeight + 2))}px`;
  }, [draft.description]);

  const generate = async () => {
    if (!type || !city) { toast.error("Primero elige el tipo de inmueble y la ciudad."); return; }
    const hood = city.neighborhoods.find((n) => n.id === draft.neighborhoodId);
    const amen = catalog.amenities.filter((a) => draft.amenityIds.includes(a.id)).map((a) => a.name);
    const body: AiDescriptionRequest = {
      operation: draft.operation, type: type.name, city: city.name, neighborhood: hood?.name,
      bedrooms: draft.bedrooms ?? undefined, bathrooms: draft.bathrooms ?? undefined, area: draft.area ?? undefined, parking: draft.parking ?? undefined,
      stratum: draft.stratum ?? undefined, condition: draft.condition, amenities: amen.length ? amen : undefined, extras: extras.trim() || undefined, tone,
    };
    setBusy(true);
    try {
      const res = await api<AiDescriptionResponse>("/ai/description", { body });
      setUndo({ title: draft.title, description: draft.description });
      setGenerated(res);
      // Si ya escribiste tu propio título, lo respetamos: solo reemplazamos el que generamos antes o uno vacío/corto.
      const keepTitle = draft.title.trim().length >= TITLE_MIN && draft.title !== generated?.title.slice(0, TITLE_MAX);
      update({ ...(keepTitle ? {} : { title: (res.title ?? "").slice(0, TITLE_MAX) }), description: (res.description ?? "").slice(0, DESC_MAX) });
      toast.success(keepTitle ? "Listo. Escribimos la descripción y dejamos tu título." : "Listo. Léelo y ajústalo a tu gusto.");
    } catch (e) {
      toast.error(e instanceof ApiException ? e.message : "No pudimos generar el texto. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const addHighlight = (h: string) => {
    const line = `• ${h}`;
    if (draft.description.includes(line)) return;
    const sep = draft.description.trim() ? "\n" : "";
    update({ description: `${draft.description.trimEnd()}${sep}${line}`.slice(0, DESC_MAX) });
  };

  const hasText = draft.title.trim().length > 0 || draft.description.trim().length > 0;

  return (
    <div className="grid gap-8">
      {/* Asistente */}
      <div className="rounded-[24px] border border-brand-200 bg-brand-50/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-sm"><Sparkles className="h-5 w-5" /></span>
            <div>
              <p className="text-[15px] font-semibold text-ink">¿Prefieres que lo escribamos por ti?</p>
              <p className="text-[13.5px] leading-snug text-ink-2">Usamos los datos que ya llenaste. Después puedes editar todo.</p>
            </div>
          </div>
          <Button onClick={generate} loading={busy} size="md" className="shrink-0">
            {generated || hasText ? <><RefreshCw className="h-4 w-4" /> {generated ? "Regenerar" : "Escribir con IA"}</> : <><Sparkles className="h-4 w-4" /> Escribir con IA</>}
          </Button>
        </div>
        <div className="mt-4 grid gap-3">
          <div role="radiogroup" aria-label="Tono del texto" className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={tone === t.id} onClick={() => setTone(t.id)} title={t.hint}
                className={cn("h-10 rounded-full border px-4 text-sm font-semibold transition active:scale-95", tone === t.id ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-white text-ink hover:border-ink")}>{t.label}</button>
            ))}
          </div>
          <input
            value={extras} onChange={(e) => setExtras(e.target.value.slice(0, 200))} aria-label="Algo que quieras destacar" placeholder="¿Algo que quieras destacar? Ej: vista a la montaña, recién remodelado"
            className="h-11 w-full rounded-full border border-field/50 bg-white px-4 text-[14px] placeholder:text-ink-3 hover:border-ink focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
          />
        </div>
        {undo && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-ink-2">
            {generated?.source && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-2">{generated.source === "llm" ? "Redactado con IA" : "Redactado con plantilla"}</span>}
            <button type="button" onClick={() => { update({ title: undo.title, description: undo.description }); setUndo(null); setGenerated(null); }} className="inline-flex items-center gap-1.5 font-semibold text-brand-700 underline-offset-4 hover:underline"><Undo2 className="h-4 w-4" /> Deshacer y volver a lo anterior</button>
          </div>
        )}
      </div>

      <FieldBlock label="Título" htmlFor="title" error={errors.title} hint="Ej: Apartamento remodelado con balcón en El Poblado">
        <input
          id="title" value={draft.title} maxLength={TITLE_MAX} onChange={(e) => update({ title: e.target.value })} aria-invalid={!!errors.title} placeholder="Resume lo mejor de tu inmueble"
          className={cn("h-14 w-full rounded-[14px] border bg-white px-4 text-[17px] font-medium text-ink placeholder:font-normal placeholder:text-ink-3 hover:border-ink focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15", errors.title ? "border-danger" : "border-field/60")}
        />
        <div className="flex justify-end"><Counter n={draft.title.length} min={TITLE_MIN} max={TITLE_MAX} /></div>
      </FieldBlock>

      <FieldBlock label="Descripción" htmlFor="description" error={errors.description}>
        <textarea
          id="description" ref={ta} value={draft.description} maxLength={DESC_MAX} onChange={(e) => update({ description: e.target.value })} aria-invalid={!!errors.description}
          placeholder="Cuenta cómo es vivir ahí: distribución, luz, estado, cercanías y todo lo que un interesado querría saber."
          className={cn("min-h-[180px] w-full resize-none rounded-[14px] border bg-white px-4 py-3.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-3 hover:border-ink focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15", errors.description ? "border-danger" : "border-field/60")}
        />
        <div className="flex justify-end"><Counter n={draft.description.length} min={DESC_MIN} max={DESC_MAX} /></div>
        {generated && generated.highlights?.length > 0 && (
          <div className="mt-1">
            <p className="mb-2 text-[13px] font-semibold text-ink-2">Puntos destacados (toca para agregarlos a la descripción)</p>
            <div className="flex flex-wrap gap-2">
              {generated.highlights.map((h) => {
                const used = draft.description.includes(`• ${h}`);
                return (
                  <button key={h} type="button" disabled={used} onClick={() => addHighlight(h)} aria-pressed={used}
                    className={cn("rounded-full border px-3.5 py-2 text-[13px] font-medium transition active:scale-95", used ? "border-brand-200 bg-brand-50 text-brand-700" : "border-line-strong bg-white text-ink hover:border-ink")}>
                    {used && <Check className="mr-1 inline h-3.5 w-3.5" strokeWidth={3} />}{h}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </FieldBlock>

      <details className="group rounded-[20px] border border-line bg-surface px-5 py-4 text-[14px] text-ink-2 open:bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 font-semibold text-ink [&::-webkit-details-marker]:hidden"><Lightbulb className="h-[18px] w-[18px] text-sun-ink" /> Consejos para escribir mejor</summary>
        <ul className="mt-3 grid gap-2 pl-1 leading-snug">
          <li>• Empieza por lo mejor: ubicación, vista, luz o vecindario.</li>
          <li>• Sé honesto con el estado: la confianza vende más que la exageración.</li>
          <li>• Menciona lo cercano: transporte, colegios, comercio y parques.</li>
          <li>• Usa frases cortas y evita MAYÚSCULAS o signos repetidos.</li>
          <li>• No incluyas teléfonos ni correos en el texto: ya tienes un espacio de contacto.</li>
        </ul>
      </details>
    </div>
  );
}
