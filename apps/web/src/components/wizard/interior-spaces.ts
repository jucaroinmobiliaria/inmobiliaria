import type { Catalog, CatalogAmenity, CatalogType } from "@/lib/types";
import { typeKind, type TypeKind } from "./steps";

const HOME = ["sala", "comedor", "cocina-integral", "estudio", "zona-de-lavanderia", "cuarto-util"] as const;

/** Espacios/atributos del paso «cómo es por dentro», en el orden de la UI. */
const SPACES: Record<TypeKind, readonly string[]> = {
  apartment: [...HOME, "balcon", "terraza", "patio"],
  house: [...HOME, "patio", "jardin", "terraza", "balcon"],
  farm: ["sala", "comedor", "cocina-integral", "estudio", "zona-de-lavanderia", "patio", "jardin", "terraza", "kiosco"],
  land: ["acueducto", "energia-electrica", "alcantarillado", "gas-natural", "lote-cerrado", "esquinero", "via-pavimentada", "lote-plano"],
  commercial: ["vitrina", "recepcion", "sala-de-juntas", "cocineta", "deposito"],
  other: [...HOME, "balcon", "terraza", "patio"],
};

const COMMERCIAL_BY_SLUG: Record<string, readonly string[]> = {
  local: ["vitrina", "cocineta", "deposito", "recepcion"],
  oficina: ["recepcion", "sala-de-juntas", "cocineta", "deposito"],
  bodega: ["deposito", "cocineta"],
  consultorio: ["recepcion", "cocineta", "deposito"],
};

/** Servicios de lote que no deben aparecer en vivienda/comercio. `gas-natural` sí es compartido. */
const LAND_ONLY = new Set(["acueducto", "energia-electrica", "alcantarillado", "lote-cerrado", "esquinero", "via-pavimentada", "lote-plano"]);
const COMMERCIAL_ONLY = new Set(["vitrina", "recepcion", "sala-de-juntas", "cocineta", "deposito"]);
const ALL_SPACES = new Set<string>([...SPACES.apartment, ...SPACES.house, ...SPACES.farm, ...SPACES.commercial]);

const LAND_EXTRAS = new Set(["vista-panoramica", "zonas-verdes", "planta-electrica"]);
const COMMERCIAL_HIDE = new Set(["juegos-infantiles", "chimenea", "mascotas-permitidas"]);

export function spaceSlugsFor(t?: Pick<CatalogType, "slug" | "name"> | null): readonly string[] {
  const kind = typeKind(t);
  if (kind === "commercial" && t) {
    const s = t.slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return COMMERCIAL_BY_SLUG[s] ?? SPACES.commercial;
  }
  return SPACES[kind];
}

export function spaceAmenities(catalog: Catalog, t?: Pick<CatalogType, "slug" | "name"> | null): CatalogAmenity[] {
  const bySlug = new Map(catalog.amenities.map((a) => [a.slug, a]));
  return spaceSlugsFor(t).map((s) => bySlug.get(s)).filter((a): a is CatalogAmenity => !!a);
}

export function spacesSection(kind: TypeKind): { title: string; hint: string } {
  if (kind === "land") return { title: "Servicios y características", hint: "Marca lo que ya tiene el lote." };
  if (kind === "commercial") return { title: "Distribución", hint: "Los ambientes que tiene el inmueble." };
  if (kind === "farm") return { title: "Espacios", hint: "La casa y las zonas del terreno." };
  return { title: "Espacios", hint: "Marca lo que tiene por dentro y en el exterior propio." };
}

export function featuresCopy(kind: TypeKind): { title: string; subtitle: string } {
  switch (kind) {
    case "land":
      return { title: "Cuéntanos cómo es el lote", subtitle: "Área, servicios y lo que define el terreno." };
    case "commercial":
      return { title: "Cuéntanos cómo está distribuido", subtitle: "Los datos clave que todos preguntan primero." };
    case "farm":
      return { title: "Cuéntanos cómo es la finca", subtitle: "La casa, los espacios y el terreno." };
    default:
      return { title: "Cuéntanos cómo es por dentro", subtitle: "Los datos clave que todos preguntan primero." };
  }
}

/** Amenidades del paso 5: excluye las que ya se marcaron como espacios del tipo. */
export function extraAmenities(catalog: Catalog, t?: Pick<CatalogType, "slug" | "name"> | null): CatalogAmenity[] {
  const kind = typeKind(t);
  const here = new Set(spaceSlugsFor(t));
  return catalog.amenities.filter((a) => {
    if (here.has(a.slug) || ALL_SPACES.has(a.slug)) return false;
    if (kind !== "land" && LAND_ONLY.has(a.slug)) return false;
    if (kind !== "commercial" && COMMERCIAL_ONLY.has(a.slug)) return false;
    if (kind === "land") return a.category === "SURROUNDINGS" || LAND_EXTRAS.has(a.slug);
    if (kind === "commercial") return !COMMERCIAL_HIDE.has(a.slug);
    return true;
  });
}

export function pruneAmenityIds(ids: string[], catalog: Catalog, t?: Pick<CatalogType, "slug" | "name"> | null): string[] {
  const keep = new Set([...spaceAmenities(catalog, t), ...extraAmenities(catalog, t)].map((a) => a.id));
  return ids.filter((id) => keep.has(id));
}
