import type { TypeKind } from "@/components/wizard/steps";
import { IDEAL_PHOTOS, MIN_PHOTOS } from "@/components/wizard/steps";
import type { PhotoItem } from "./types";

export type SuggestionIcon = "camera" | "tag" | "star" | "phone" | "res" | "sun" | "ok" | "home";
export interface Suggestion {
  id: string;
  tone: "must" | "tip" | "ok";
  icon: SuggestionIcon;
  text: string;
  action?: { kind: "add" | "cover" | "select"; label: string; key?: string };
}

interface Ctx { kind: TypeKind; bedrooms: number | null }

const FRONT = new Set(["Fachada", "Sala", "Exterior", "Balcón/Terraza"]);

/** Heurísticas deterministas a partir de etiquetas, orientación y cantidad. No hay análisis de imagen. */
export function buildSuggestions(items: PhotoItem[], ctx: Ctx): Suggestion[] {
  const ready = items.filter((i) => i.status === "ready");
  const n = ready.length;
  const out: Suggestion[] = [];
  const labeled = ready.filter((i) => i.roomLabel);
  const has = (l: string) => ready.some((i) => i.roomLabel === l);

  if (n < MIN_PHOTOS) {
    const miss = MIN_PHOTOS - n;
    out.push({ id: "min", tone: "must", icon: "camera", text: n === 0 ? `Sube al menos ${MIN_PHOTOS} fotos para poder publicar.` : `Te ${miss === 1 ? "falta 1 foto" : `faltan ${miss} fotos`} para llegar al mínimo de ${MIN_PHOTOS}.`, action: { kind: "add", label: "Agregar fotos" } });
  } else if (n < IDEAL_PHOTOS) {
    const miss = IDEAL_PHOTOS - n;
    out.push({ id: "ideal", tone: "tip", icon: "camera", text: `Con ${IDEAL_PHOTOS} o más fotos tu aviso se ve más completo. ${miss === 1 ? "Te falta 1" : `Te faltan ${miss}`}.`, action: { kind: "add", label: "Agregar más" } });
  }

  if (n >= MIN_PHOTOS) {
    if (labeled.length === 0) {
      out.push({ id: "label", tone: "tip", icon: "tag", text: "Etiqueta tus fotos (Sala, Cocina, Baño…) para que quien mira se ubique más rápido.", action: { kind: "select", label: "Etiquetar" } });
    } else if (ctx.kind !== "land" && (labeled.length >= 2 || labeled.length / n >= 0.5)) {
      if (ctx.kind === "house" || ctx.kind === "farm" || ctx.kind === "commercial") {
        if (!has("Fachada")) out.push({ id: "m-fachada", tone: "tip", icon: "home", text: "Agrega una foto de la fachada: es la primera impresión." });
      }
      if (ctx.kind !== "farm") {
        if (!has("Cocina") && ctx.kind !== "commercial") out.push({ id: "m-cocina", tone: "tip", icon: "camera", text: "Agrega una foto de la cocina." });
        if (!has("Baño")) out.push({ id: "m-bano", tone: "tip", icon: "camera", text: "Falta el baño." });
        if (ctx.kind !== "commercial" && (ctx.bedrooms ?? 1) > 0 && !has("Habitación")) out.push({ id: "m-hab", tone: "tip", icon: "camera", text: "Falta una foto de la habitación principal." });
      }
      if (ctx.kind === "farm" && !has("Exterior")) out.push({ id: "m-ext", tone: "tip", icon: "camera", text: "Agrega fotos del exterior y los alrededores." });
    }
    if (ctx.kind === "land" && !has("Exterior") && labeled.length > 0) out.push({ id: "m-ext", tone: "tip", icon: "camera", text: "Agrega una foto del lote desde la entrada y otra desde adentro." });

    const cover = ready.find((i) => i.isCover);
    if (cover && !(cover.roomLabel && FRONT.has(cover.roomLabel))) {
      const better = ready.find((i) => i.roomLabel === "Fachada") ?? ready.find((i) => i.roomLabel === "Sala");
      if (better && better.key !== cover.key) {
        out.push({ id: "cover", tone: "tip", icon: "star", text: `Pon la ${better.roomLabel === "Fachada" ? "fachada" : "sala"} como principal: es lo primero que se ve.`, action: { kind: "cover", label: "Hacer principal", key: better.key } });
      }
    }
  }

  const portrait = ready.filter((i) => i.hints.includes("portrait")).length;
  if (n >= MIN_PHOTOS && portrait / n >= 0.3) {
    out.push({ id: "portrait", tone: "tip", icon: "phone", text: `${portrait} ${portrait === 1 ? "foto es vertical" : "fotos son verticales"}. Las horizontales se ven mejor en tarjetas y galería: toma las fotos con el celular acostado.` });
  }
  const low = ready.filter((i) => i.hints.includes("lowres")).length;
  if (low) {
    out.push({ id: "lowres", tone: "tip", icon: "res", text: `${low} ${low === 1 ? "foto tiene" : "fotos tienen"} baja resolución. Si puedes, vuelve a subir la original: se verá más nítida.` });
  }

  if (out.length < 3 && n > 0) {
    out.push({ id: "light", tone: "tip", icon: "sun", text: "Fotografía de día, con las cortinas abiertas y las luces encendidas: la luz natural hace ver todo más grande." });
  }
  if (n >= IDEAL_PHOTOS && !out.some((s) => s.tone === "tip" && s.id !== "light")) {
    out.unshift({ id: "ok", tone: "ok", icon: "ok", text: "Tu galería se ve completa. ¡Buen trabajo!" });
  }
  const rank = { must: 0, tip: 1, ok: 2 } as const;
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 4);
}
