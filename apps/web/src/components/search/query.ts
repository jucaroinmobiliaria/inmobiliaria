import type { Operation, SearchQuery } from "@/lib/types";
import { OPERATION_SLUG, slugToOperation } from "@/lib/site";

export type View = "lista" | "mapa" | "mixto";
export type ResultsQuery = SearchQuery & { view?: View };
type SP = URLSearchParams | Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 18;
export const SORTS: { value: NonNullable<SearchQuery["sort"]>; label: string }[] = [
  { value: "relevance", label: "Más relevantes" },
  { value: "newest", label: "Más recientes" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "area_desc", label: "Área: mayor a menor" },
];

const getter = (sp: SP) => (k: string): string | undefined => {
  if (sp instanceof URLSearchParams) return sp.get(k) ?? undefined;
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v;
};
const num = (v?: string) => {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const pageNum = (v?: string) => { const n = num(v); return n && n > 1 ? Math.floor(n) : undefined; };
const flag = (v?: string) => (v === "1" || v === "true" ? true : undefined);
const text = (v?: string, max = 200) => (v ? v.trim().slice(0, max) || undefined : undefined);

/** Interpreta la query string (sin la operación ni los segmentos de ruta). */
export function parseSearchParams(sp: SP): ResultsQuery {
  const g = getter(sp);
  const sort = g("sort");
  const cond = g("condition");
  const view = g("vista");
  const q: ResultsQuery = {
    type: text(g("type")), city: text(g("city")), neighborhood: text(g("neighborhood")), q: text(g("q")),
    minPrice: num(g("minPrice")), maxPrice: num(g("maxPrice")),
    bedrooms: num(g("bedrooms")), bathrooms: num(g("bathrooms")), parking: num(g("parking")),
    minArea: num(g("minArea")), maxArea: num(g("maxArea")),
    stratum: text(g("stratum")), amenities: text(g("amenities"), 600),
    condition: cond === "NEW" || cond === "USED" || cond === "OFF_PLAN" ? cond : undefined,
    furnished: flag(g("furnished")), petFriendly: flag(g("petFriendly")), withVideo: flag(g("withVideo")), withTour: flag(g("withTour")),
    featured: flag(g("featured")),
    bbox: g("bbox") && /^-?[\d.]+(,-?[\d.]+){3}$/.test(g("bbox")!) ? g("bbox") : undefined,
    sort: sort === "newest" || sort === "price_asc" || sort === "price_desc" || sort === "area_desc" ? sort : undefined,
    page: pageNum(g("page")),
    view: view === "lista" || view === "mapa" || view === "mixto" ? view : undefined,
  };
  return stripEmpty(q);
}

export function stripEmpty<T extends object>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== "" && v !== false) out[k] = v;
  return out as T;
}

/** Los segmentos de ruta [tipo, ciudad, barrio] se convierten en filtros. "-" = vacío. */
export function segmentsToFilters(segments: string[]): Pick<SearchQuery, "type" | "city" | "neighborhood"> {
  const [type, city, neighborhood] = segments.map((s) => (s && s !== "-" ? decodeURIComponent(s) : undefined));
  return stripEmpty({ type, city, neighborhood });
}

export function queryFromUrl(operationSlug: string, segments: string[], sp: SP): ResultsQuery {
  const op = slugToOperation(operationSlug) ?? "SALE";
  const fromQuery = parseSearchParams(sp);
  const fromPath = segmentsToFilters(segments);
  return { ...fromQuery, ...fromPath, operation: op };
}

const SINGLE = /^[a-z0-9-]+$/;
const KEYS_IN_QUERY: (keyof ResultsQuery)[] = [
  "q", "minPrice", "maxPrice", "bedrooms", "bathrooms", "parking", "minArea", "maxArea", "stratum", "amenities", "condition",
  "furnished", "petFriendly", "withVideo", "withTour", "featured", "bbox", "sort", "page", "view",
];

/** Ruta + query canónica: tipo/ciudad/barrio van en la ruta cuando es posible (landing SEO); el resto en la query. */
export function buildHref(op: Operation, q: ResultsQuery): string {
  const base = `/${OPERATION_SLUG[op]}`;
  const params = new URLSearchParams();
  const segs: string[] = [];
  const typeOk = q.type && SINGLE.test(q.type);
  const cityOk = q.city && SINGLE.test(q.city);
  const hoodOk = q.neighborhood && SINGLE.test(q.neighborhood);
  if (typeOk && (!q.city || cityOk) && (!q.neighborhood || (cityOk && hoodOk))) {
    segs.push(q.type!);
    if (q.city) { segs.push(q.city); if (q.neighborhood) segs.push(q.neighborhood); }
  } else {
    if (q.type) params.set("type", q.type);
    if (q.city) params.set("city", q.city);
    if (q.neighborhood) params.set("neighborhood", q.neighborhood);
  }
  for (const k of KEYS_IN_QUERY) {
    const v = q[k];
    if (v === undefined || v === null || v === "" || v === false) continue;
    if (k === "page" && v === 1) continue;
    if (k === "sort" && v === "relevance") continue;
    params.set(k, v === true ? "1" : String(v));
  }
  const s = params.toString();
  return `${base}${segs.length ? "/" + segs.join("/") : ""}${s ? `?${s}` : ""}`;
}

/** Query que viaja al API (/publications, /publications/map). */
export function toApiQuery(q: ResultsQuery, extra: Partial<SearchQuery> = {}): Record<string, unknown> {
  const { view: _view, ...rest } = q;
  void _view;
  return stripEmpty({ ...rest, pageSize: PAGE_SIZE, ...extra });
}

/** Cantidad de filtros activos (sin contar operación, orden, página ni vista). */
export function countFilters(q: ResultsQuery) {
  let n = 0;
  for (const k of ["type", "q", "minPrice", "maxPrice", "bedrooms", "bathrooms", "parking", "minArea", "maxArea", "stratum", "amenities", "condition", "furnished", "petFriendly", "withVideo", "withTour", "featured", "bbox"] as const) {
    if (q[k] !== undefined) n += k === "amenities" ? q.amenities!.split(",").filter(Boolean).length : 1;
  }
  return n;
}

export function priceRangeKey(min?: number, max?: number) { return `${min ?? ""}-${max ?? ""}`; }

export const PRICE_PRESETS = {
  SALE: [150_000_000, 250_000_000, 400_000_000, 600_000_000, 900_000_000, 1_500_000_000, 3_000_000_000],
  RENT: [800_000, 1_200_000, 1_800_000, 2_500_000, 3_500_000, 5_000_000, 8_000_000],
} as const;

export const PRICE_SLIDER = {
  SALE: { min: 50_000_000, max: 5_000_000_000, step: 10_000_000 },
  RENT: { min: 300_000, max: 15_000_000, step: 50_000 },
} as const;

export const popularQuickLinks = [
  { label: "Apartamentos en Medellín", href: "/venta/apartamento/medellin" },
  { label: "Casas en Bogotá", href: "/venta/casa/bogota" },
  { label: "Arriendos en Cali", href: "/arriendo/apartamento/cali" },
  { label: "Fincas en Antioquia", href: "/venta/finca" },
  { label: "Apartamentos en Cartagena", href: "/venta/apartamento/cartagena" },
  { label: "Oficinas en Bogotá", href: "/arriendo/oficina/bogota" },
];
