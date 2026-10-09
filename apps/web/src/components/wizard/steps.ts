import type { Catalog, CatalogType, DraftDTO, DraftInput, Operation } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/*  Definición de pasos                                                        */
/* -------------------------------------------------------------------------- */

export const BLOCKS = ["Básico", "Ubicación", "Detalles", "Fotos", "Oferta", "Final"] as const;

export interface StepDef {
  n: number;
  slug: string;
  block: number;
  short: string;
  title: (op: Operation) => string;
  subtitle: string;
}

export const STEPS: StepDef[] = [
  { n: 1, slug: "operacion", block: 0, short: "Operación", title: () => "¿Qué quieres hacer con tu inmueble?", subtitle: "Puedes cambiarlo más adelante si te equivocas." },
  { n: 2, slug: "tipo", block: 0, short: "Tipo", title: () => "¿Qué tipo de inmueble es?", subtitle: "Elige la opción que mejor lo describe." },
  { n: 3, slug: "ubicacion", block: 1, short: "Ubicación", title: () => "¿Dónde está ubicado?", subtitle: "Una buena ubicación ayuda a que te encuentren en las búsquedas y en el mapa." },
  { n: 4, slug: "caracteristicas", block: 2, short: "Características", title: () => "Cuéntanos cómo es por dentro", subtitle: "Los datos clave que todos preguntan primero." },
  { n: 5, slug: "comodidades", block: 2, short: "Comodidades", title: () => "¿Qué lo hace especial?", subtitle: "Marca todo lo que tenga tu inmueble o su entorno." },
  { n: 6, slug: "fotos", block: 3, short: "Fotos", title: () => "Agrega las fotos de tu inmueble", subtitle: "Las fotos son lo primero que se ve. Con buena luz y espacios ordenados, el aviso llama más la atención." },
  { n: 7, slug: "precio", block: 4, short: "Precio", title: (op) => (op === "RENT" ? "¿Cuánto cuesta el arriendo?" : "¿Cuál es el precio de venta?"), subtitle: "Un precio claro y realista atrae más contactos." },
  { n: 8, slug: "descripcion", block: 4, short: "Título y descripción", title: () => "Ponle título y cuéntalo bien", subtitle: "Un título claro y una descripción honesta generan confianza." },
  { n: 9, slug: "contacto", block: 5, short: "Contacto", title: () => "¿Cómo te contactan?", subtitle: "Decide qué datos mostrar y agrega video o tour virtual si tienes." },
  { n: 10, slug: "vista-previa", block: 5, short: "Vista previa", title: () => "Así se verá tu aviso", subtitle: "Revisa todo antes de publicar. Puedes volver a cualquier paso." },
];

export const TOTAL_STEPS = STEPS.length;
export const stepDef = (n: number) => STEPS[Math.min(Math.max(n, 1), TOTAL_STEPS) - 1]!;
export const stepsOfBlock = (block: number) => STEPS.filter((s) => s.block === block);

/* -------------------------------------------------------------------------- */
/*  Rasgos según tipo de inmueble                                              */
/* -------------------------------------------------------------------------- */

export type TypeKind = "apartment" | "house" | "farm" | "land" | "commercial" | "other";

export interface TypeTraits {
  kind: TypeKind;
  rooms: boolean;
  bathrooms: boolean;
  parking: boolean;
  landArea: boolean;
  floors: boolean;
  stratum: boolean;
  age: boolean;
  furnished: boolean;
  pets: boolean;
  areaLabel: string;
  areaHint: string;
  landAreaLabel: string;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function typeKind(t?: Pick<CatalogType, "slug" | "name"> | null): TypeKind {
  if (!t) return "other";
  const s = norm(`${t.slug} ${t.name}`);
  if (/lote|terreno|solar/.test(s)) return "land";
  if (/finca|parcela|campestre|hacienda|quinta/.test(s)) return "farm";
  if (/local|oficina|bodega|consultorio|edificio|comercial|industrial|nave/.test(s)) return "commercial";
  if (/apartamento|apartaestudio|apto|penthouse|loft|studio|habitacion/.test(s)) return "apartment";
  if (/casa|cabana|chalet|duplex|townhouse/.test(s)) return "house";
  return "other";
}

export function typeTraits(t?: Pick<CatalogType, "slug" | "name"> | null): TypeTraits {
  const kind = typeKind(t);
  const base: TypeTraits = {
    kind, rooms: true, bathrooms: true, parking: true, landArea: false, floors: false, stratum: true, age: true, furnished: true, pets: true,
    areaLabel: "Área construida", areaHint: "En metros cuadrados (m²).", landAreaLabel: "Área del lote",
  };
  switch (kind) {
    case "apartment": return { ...base, floors: true };
    case "house": return { ...base, landArea: true };
    case "farm": return { ...base, landArea: true, stratum: false };
    case "land": return { ...base, rooms: false, bathrooms: false, parking: false, stratum: false, age: false, furnished: false, pets: false, areaLabel: "Área del lote", areaHint: "Puedes escribirla en m² o en hectáreas." };
    case "commercial": return { ...base, rooms: false, floors: true, stratum: false, furnished: false, pets: false, areaLabel: "Área" };
    default: return base;
  }
}

/** Campos que deben quedar vacíos si el tipo elegido no los admite. */
export function clearedFieldsForTraits(tr: TypeTraits): DraftInput {
  const out: DraftInput = {};
  if (!tr.rooms) out.bedrooms = null;
  if (!tr.bathrooms) out.bathrooms = null;
  if (!tr.parking) out.parking = null;
  if (!tr.landArea) out.landArea = null;
  if (!tr.floors) { out.floor = null; out.totalFloors = null; }
  if (!tr.stratum) out.stratum = null;
  if (!tr.age) out.ageYears = null;
  if (!tr.furnished) out.furnished = false;
  if (!tr.pets) out.petFriendly = false;
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Validación                                                                 */
/* -------------------------------------------------------------------------- */

export interface Issue { field: string; message: string }

export const TITLE_MIN = 10;
export const TITLE_MAX = 100;
export const DESC_MIN = 40;
export const DESC_MAX = 2000;
export const MIN_PHOTOS = 3;
export const IDEAL_PHOTOS = 8;

export interface PhotoState { ready: number; busy: number; hasCover: boolean }

export function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch { return false; }
}

export function validateStep(n: number, d: DraftDTO, photos: PhotoState): Issue[] {
  const out: Issue[] = [];
  switch (n) {
    case 2:
      if (!d.typeId) out.push({ field: "typeId", message: "Elige el tipo de inmueble para continuar." });
      break;
    case 3:
      if (!d.cityId) out.push({ field: "cityId", message: "Selecciona la ciudad donde está el inmueble." });
      break;
    case 6:
      if (photos.busy > 0) out.push({ field: "images", message: "Espera a que terminen de subir las fotos." });
      else if (photos.ready < MIN_PHOTOS) out.push({ field: "images", message: photos.ready === 0 ? `Sube al menos ${MIN_PHOTOS} fotos para continuar.` : `Te faltan ${MIN_PHOTOS - photos.ready} ${MIN_PHOTOS - photos.ready === 1 ? "foto" : "fotos"} (mínimo ${MIN_PHOTOS}).` });
      break;
    case 7:
      if (!d.price || d.price <= 0) out.push({ field: "price", message: d.operation === "RENT" ? "Escribe el valor del arriendo mensual." : "Escribe el precio de venta." });
      break;
    case 8: {
      const t = d.title.trim().length;
      const x = d.description.trim().length;
      if (t < TITLE_MIN) out.push({ field: "title", message: `El título necesita al menos ${TITLE_MIN} caracteres (tienes ${t}).` });
      if (x < DESC_MIN) out.push({ field: "description", message: `La descripción necesita al menos ${DESC_MIN} caracteres (tienes ${x}).` });
      break;
    }
    case 9:
      if (d.videoUrl && !isHttpUrl(d.videoUrl)) out.push({ field: "videoUrl", message: "El enlace del video no es válido. Debe empezar por https://" });
      if (d.tourUrl && !isHttpUrl(d.tourUrl)) out.push({ field: "tourUrl", message: "El enlace del tour no es válido. Debe empezar por https://" });
      break;
    default:
      break;
  }
  return out;
}

/** Primer paso inválido (1..10) o null si todos los previos al 10 son válidos. */
export function firstInvalidStep(d: DraftDTO, photos: PhotoState): number | null {
  for (let n = 1; n < TOTAL_STEPS; n++) if (validateStep(n, d, photos).length) return n;
  return null;
}

/** Pasos a los que se puede llegar: todos hasta el primero inválido (inclusive). */
export function reachableStep(d: DraftDTO, photos: PhotoState): number {
  return firstInvalidStep(d, photos) ?? TOTAL_STEPS;
}

/* -------------------------------------------------------------------------- */
/*  Lista de verificación                                                      */
/* -------------------------------------------------------------------------- */

export interface CheckItem { id: string; label: string; step: number; ok: boolean; required: boolean; hint?: string }

export function buildChecklist(d: DraftDTO, traits: TypeTraits, photos: PhotoState): CheckItem[] {
  const items: CheckItem[] = [
    { id: "type", label: "Tipo de inmueble", step: 2, ok: !!d.typeId, required: true },
    { id: "city", label: "Ciudad", step: 3, ok: !!d.cityId, required: true },
    { id: "photos", label: `Al menos ${MIN_PHOTOS} fotos`, step: 6, ok: photos.ready >= MIN_PHOTOS, required: true, hint: photos.ready ? `${photos.ready} de ${MIN_PHOTOS}` : undefined },
    { id: "cover", label: "Foto principal", step: 6, ok: photos.hasCover, required: true },
    { id: "price", label: d.operation === "RENT" ? "Canon de arriendo" : "Precio de venta", step: 7, ok: d.price > 0, required: true },
    { id: "title", label: `Título (mín. ${TITLE_MIN} caracteres)`, step: 8, ok: d.title.trim().length >= TITLE_MIN, required: true },
    { id: "description", label: `Descripción (mín. ${DESC_MIN} caracteres)`, step: 8, ok: d.description.trim().length >= DESC_MIN, required: true },
    { id: "pin", label: "Punto en el mapa", step: 3, ok: d.lat != null && d.lng != null, required: false },
    { id: "area", label: traits.areaLabel, step: 4, ok: !!d.area, required: false },
  ];
  if (traits.rooms) items.push({ id: "bedrooms", label: "Habitaciones", step: 4, ok: d.bedrooms != null, required: false });
  items.push(
    { id: "amenities", label: "Comodidades", step: 5, ok: d.amenityIds.length > 0, required: false },
    { id: "photos8", label: `${IDEAL_PHOTOS} fotos o más`, step: 6, ok: photos.ready >= IDEAL_PHOTOS, required: false },
    { id: "media", label: "Video o tour virtual", step: 9, ok: !!(d.videoUrl || d.tourUrl), required: false },
  );
  return items;
}

export function completionPercent(items: CheckItem[]): number {
  const req = items.filter((i) => i.required);
  const rec = items.filter((i) => !i.required);
  const total = req.length * 3 + rec.length;
  if (!total) return 0;
  const done = req.filter((i) => i.ok).length * 3 + rec.filter((i) => i.ok).length;
  return Math.round((done / total) * 100);
}

/** Intenta ubicar en un paso un texto/campo que vino del API (`completion.missing` o `errors`). */
export function stepForKey(raw: string): number | null {
  const k = norm(raw);
  if (/operation|operacion/.test(k)) return 1;
  if (/typeid|tipo|^type$/.test(k)) return 2;
  if (/cityid|ciudad|city|neighborhood|barrio|address|direccion|^lat$|^lng$|ubicacion|location|mapa/.test(k)) return 3;
  if (/bedroom|habitacion|bathroom|bano|parking|parqueadero|area|floor|piso|stratum|estrato|age|antiguedad|condition|condicion|furnished|amoblado|pet|mascota/.test(k)) return 4;
  if (/amenit|comodidad/.test(k)) return 5;
  if (/image|imagen|foto|photo|cover|portada/.test(k)) return 6;
  if (/price|precio|currency|moneda|adminfee|administracion|availablefrom|disponible|mincontract|contrato|negotiable/.test(k)) return 7;
  if (/title|titulo|description|descripcion/.test(k)) return 8;
  if (/video|tour|phone|telefono|whatsapp|contact/.test(k)) return 9;
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

export function findType(catalog: Catalog, id: string | null | undefined) {
  return id ? catalog.types.find((t) => t.id === id) : undefined;
}
export function findCity(catalog: Catalog, id: string | null | undefined) {
  return id ? catalog.cities.find((c) => c.id === id) : undefined;
}

export const CONDITION_LABEL = { NEW: "Nuevo", USED: "Usado", OFF_PLAN: "Sobre planos" } as const;
