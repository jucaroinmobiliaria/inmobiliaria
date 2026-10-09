"use client";

import { Fragment } from "react";
import { Callout, OptionCard, SectionTitle } from "./fields";
import { pruneAmenityIds } from "./interior-spaces";
import { CONDITION_LABEL, clearedFieldsForTraits, typeTraits } from "./steps";
import type { StepProps } from "./types";
import type { Condition, DraftInput, Operation } from "@/lib/types";

/* ------------------------------- Paso 1 -------------------------------- */

export function StepOperation({ draft, update }: StepProps) {
  const op = draft.operation;
  const set = (v: Operation) => update({ operation: v });
  return (
    <div className="grid gap-5">
      <div role="radiogroup" aria-label="Operación" className="grid gap-4 sm:grid-cols-2">
        <OptionCard selected={op === "SALE"} onClick={() => set("SALE")} icon="handshake" title="Venta" text="Publica tu inmueble para venderlo. Recibirás ofertas e interesados directamente." />
        <OptionCard selected={op === "RENT"} onClick={() => set("RENT")} icon="key" title="Arriendo" text="Publícalo para arrendarlo. Define el canon mensual y las condiciones del contrato." />
      </div>
      <Callout>Publicar es gratis. Tú decides qué datos de contacto mostrar y cuándo pausar o cerrar tu aviso.</Callout>
    </div>
  );
}

/* ------------------------------- Paso 2 -------------------------------- */

const GROUPS: Record<string, string> = { residential: "Vivienda", rural: "Campo", land: "Terrenos", commercial: "Comercial" };
const COND_TEXT: Record<Condition, string> = { NEW: "A estrenar", USED: "Ya habitado o usado antes", OFF_PLAN: "En construcción o proyecto" };

export function StepType({ draft, catalog, update, errors }: StepProps) {
  const groups = [...new Set(catalog.types.map((t) => t.group))];
  const pick = (id: string) => {
    if (id === draft.typeId) return;
    const t = catalog.types.find((x) => x.id === id);
    const cleared = clearedFieldsForTraits(typeTraits(t));
    const patch: DraftInput = { typeId: id, amenityIds: pruneAmenityIds(draft.amenityIds, catalog, t) };
    // Solo limpiamos lo que realmente tenía datos y el nuevo tipo no admite.
    for (const [k, v] of Object.entries(cleared)) {
      if (k === "amenityIds") continue;
      const cur = (draft as unknown as Record<string, unknown>)[k];
      if (cur !== v && cur != null && cur !== false) (patch as Record<string, unknown>)[k] = v;
    }
    update(patch);
  };
  return (
    <div className="grid gap-8">
      <div role="radiogroup" aria-label="Tipo de inmueble" aria-invalid={!!errors.typeId} className="grid gap-6">
        {groups.map((g) => (
          <Fragment key={g}>
            <div>
              <p className="eyebrow mb-3">{GROUPS[g] ?? g}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {catalog.types.filter((t) => t.group === g).map((t) => (
                  <OptionCard key={t.id} size="md" selected={draft.typeId === t.id} onClick={() => pick(t.id)} icon={t.icon} title={t.name} />
                ))}
              </div>
            </div>
          </Fragment>
        ))}
        {errors.typeId && <p role="alert" className="text-[13px] font-medium text-danger">{errors.typeId}</p>}
      </div>

      <div>
        <SectionTitle hint="Ayuda a que te encuentren con los filtros correctos.">Condición</SectionTitle>
        <div role="radiogroup" aria-label="Condición del inmueble" className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => (
            <OptionCard key={c} size="md" selected={draft.condition === c} onClick={() => update({ condition: c })} title={CONDITION_LABEL[c]} text={COND_TEXT[c]} className="sm:!flex-col" />
          ))}
        </div>
      </div>
    </div>
  );
}
