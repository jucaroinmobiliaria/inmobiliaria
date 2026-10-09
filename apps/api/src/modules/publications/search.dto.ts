import { queryBool, queryInt, z } from "../../common/zod.js";

const strOrArr = z.union([z.string(), z.array(z.string())]).transform((v) => (Array.isArray(v) ? v.join(",") : v));
const csv = strOrArr.pipe(z.string().trim().max(500)).optional();
const opt = <T extends z.ZodType>(s: T) => s.optional().catch(undefined);

/** Todos los campos de `SearchQuery`. Los valores mal formados se ignoran (no rompen la búsqueda). */
export const searchSchema = z.object({
  operation: opt(z.enum(["SALE", "RENT"])),
  type: opt(csv),
  city: opt(csv),
  neighborhood: opt(csv),
  q: opt(strOrArr.pipe(z.string().trim().max(120))),
  minPrice: opt(queryInt(0, 1e13)),
  maxPrice: opt(queryInt(0, 1e13)),
  bedrooms: opt(queryInt(0, 50)),
  bathrooms: opt(queryInt(0, 50)),
  parking: opt(queryInt(0, 50)),
  minArea: opt(queryInt(0, 1e7)),
  maxArea: opt(queryInt(0, 1e7)),
  stratum: opt(csv),
  amenities: opt(csv),
  condition: opt(z.enum(["NEW", "USED", "OFF_PLAN"])),
  furnished: opt(queryBool),
  petFriendly: opt(queryBool),
  featured: opt(queryBool),
  withVideo: opt(queryBool),
  withTour: opt(queryBool),
  bbox: opt(csv),
  sort: opt(z.enum(["relevance", "newest", "price_asc", "price_desc", "area_desc"])),
  page: opt(queryInt(1, 100_000)),
  pageSize: opt(queryInt(1, 60)),
});
export type SearchParams = z.infer<typeof searchSchema>;

/** Convierte un `SearchQuery` guardado (JSON arbitrario) en parámetros validados. */
export function parseSearchJson(raw: unknown): SearchParams {
  const flat: Record<string, string | number | boolean> = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") flat[k] = v;
    }
  }
  return searchSchema.parse(flat);
}

export const mapSchema = searchSchema.omit({ page: true, pageSize: true, sort: true });

export const csvList = (v?: string): string[] =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
