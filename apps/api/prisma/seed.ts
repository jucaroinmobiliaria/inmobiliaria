/**
 * Semilla de demostración de Nido. Idempotente: vacía todas las tablas y vuelve a insertar con ids fijos.
 *   npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { pgPoolConfig } from "../src/common/db-url.ts";
import { PrismaClient, Prisma } from "../src/generated/prisma/client.ts";
import { slugify } from "../src/common/slug.ts";
import { POOL, CITY_COVERS } from "./seed-images.ts";
import { AGENCIES, AMENITIES, CITIES, PLAN, TYPES, USERS, type CitySeed, type HoodSeed, type PlanRow, type TypeSlug, type UserKey } from "./seed-data.ts";
import { inquiryFollowUp, inquiryOpening, makeDescription, makeRng, makeTitle, ownerReply, type Rng, type TextCtx } from "./seed-text.ts";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const NOW = new Date();
const daysAgo = (d: number, extraHours = 0) => new Date(NOW.getTime() - d * DAY - extraHours * HOUR);
const daysAhead = (d: number) => new Date(NOW.getTime() + d * DAY);
const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const prisma = new PrismaClient({
  adapter: new PrismaPg(pgPoolConfig(process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/inmobiliaria", { max: 3 })),
});

const rng = makeRng(20_261_005);
const pid = (n: number) => `pub_${String(n).padStart(3, "0")}`;
const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const salePrice = (n: number) => (n < 1_000_000_000 ? roundTo(n, 5_000_000) : roundTo(n, 10_000_000));

/* ---------- Tipos de datos locales ---------- */
interface Dims {
  area: number | null; landArea: number | null; beds: number | null; baths: number | null; parking: number | null;
  floor: number | null; totalFloors: number | null; stratum: number | null; ageYears: number | null;
}

function dimsFor(type: TypeSlug, r: Rng, hood: HoodSeed | null, op: "SALE" | "RENT"): Dims {
  const stratum = hood ? r.int(hood.stratum[0], hood.stratum[1]) : null;
  const d: Dims = { area: null, landArea: null, beds: null, baths: null, parking: null, floor: null, totalFloors: null, stratum: null, ageYears: null };
  switch (type) {
    case "apartamento": {
      const area = r.pick([48, 54, 58, 62, 68, 72, 78, 85, 92, 104, 118, 135, 160]) + r.int(0, 4);
      const beds = area < 56 ? 1 : area < 75 ? 2 : area < 112 ? 3 : 4;
      Object.assign(d, { area, beds, baths: Math.min(beds + (r.chance(0.4) ? 1 : 0), 4), parking: r.pick([1, 1, 2, 2, 0]), floor: r.int(2, 16), totalFloors: 0, stratum });
      d.totalFloors = (d.floor ?? 2) + r.int(1, 8);
      break;
    }
    case "apartaestudio":
      Object.assign(d, { area: r.int(27, 46), beds: 1, baths: 1, parking: r.pick([0, 0, 1]), floor: r.int(2, 14), stratum });
      d.totalFloors = (d.floor ?? 2) + r.int(1, 6);
      break;
    case "penthouse":
      Object.assign(d, { area: r.int(165, 340), beds: r.int(3, 4), baths: r.int(4, 5), parking: r.int(2, 3), floor: r.int(14, 24), stratum });
      d.totalFloors = (d.floor ?? 14) + 1;
      break;
    case "casa": {
      const area = r.int(110, op === "RENT" ? 260 : 430);
      Object.assign(d, { area, landArea: Math.round(area * r.pick([1.1, 1.3, 1.6])), beds: area < 140 ? 3 : area < 250 ? 4 : 5, baths: r.int(2, 5), parking: r.int(1, 3), floor: null, totalFloors: r.int(1, 3), stratum });
      break;
    }
    case "finca":
      Object.assign(d, { area: r.int(180, 560), landArea: r.pick([6_500, 9_000, 12_000, 15_000, 22_000, 32_000, 45_000]), beds: r.int(4, 6), baths: r.int(3, 6), parking: r.int(4, 8), totalFloors: r.int(1, 2) });
      break;
    case "lote": {
      const area = r.pick([180, 240, 320, 450, 600, 850, 1_200, 2_000]);
      Object.assign(d, { area, landArea: area });
      break;
    }
    case "local":
      Object.assign(d, { area: r.int(28, 180), baths: r.int(1, 2), parking: r.int(0, 2), floor: 1, totalFloors: r.int(1, 3) });
      break;
    case "oficina":
      Object.assign(d, { area: r.int(36, 230), baths: r.int(1, 3), parking: r.int(1, 4), floor: r.int(3, 15), totalFloors: 18 });
      break;
    case "bodega":
      Object.assign(d, { area: r.pick([280, 420, 600, 850, 1_100, 1_600]), baths: 2, parking: r.int(3, 10), floor: 1, totalFloors: 1 });
      break;
    case "consultorio":
      Object.assign(d, { area: r.int(22, 62), baths: 1, parking: r.int(0, 1), floor: r.int(2, 8), totalFloors: 10 });
      break;
  }
  return d;
}

function priceFor(row: PlanRow, hood: HoodSeed | null, d: Dims, cond: "NEW" | "USED" | "OFF_PLAN", furnished: boolean, r: Rng): number {
  const ppm2 = hood?.ppm2 ?? 6_000_000;
  const area = d.area ?? 100;
  const jitter = 0.92 + r.next() * 0.2;
  if (row.op === "SALE") {
    const condF = cond === "NEW" ? 1.12 : cond === "OFF_PLAN" ? 0.95 : Math.max(0.86, 1 - (d.ageYears ?? 8) * 0.004);
    let p: number;
    switch (row.type) {
      case "apartamento": p = area * ppm2 * condF; break;
      case "apartaestudio": p = area * ppm2 * 1.12 * condF; break;
      case "penthouse": p = area * ppm2 * 1.35 * condF; break;
      case "casa": p = area * ppm2 * 0.8 * condF; break;
      case "finca": p = Math.min(4_000_000_000, Math.max(900_000_000, area * ppm2 * 0.35 + (d.landArea ?? 10_000) * r.int(30_000, 90_000))); break;
      case "lote": p = Math.min(2_000_000_000, Math.max(150_000_000, area * ppm2 * r.pick([0.25, 0.3, 0.4]))); break;
      case "local": p = area * ppm2 * 1.1; break;
      case "oficina": p = area * ppm2 * 0.95; break;
      case "consultorio": p = area * ppm2 * 1.05; break;
      default: p = area * ppm2 * 0.45; // bodega
    }
    return salePrice(p * jitter);
  }
  let p: number;
  switch (row.type) {
    case "apartamento": p = area * ppm2 * 0.0046; break;
    case "apartaestudio": p = area * ppm2 * 0.0056; break;
    case "penthouse": p = area * ppm2 * 0.0042; break;
    case "casa": p = area * ppm2 * 0.0038; break;
    case "local": p = Math.min(18_000_000, Math.max(4_000_000, area * ppm2 * 0.0065)); break;
    case "oficina": p = area * ppm2 * 0.0055; break;
    case "consultorio": p = area * ppm2 * 0.006; break;
    case "bodega": p = area * r.int(14_000, 22_000); break;
    default: p = area * ppm2 * 0.0046;
  }
  if (furnished) p *= 1.15;
  return Math.max(900_000, roundTo(p * jitter, 50_000));
}

type GroupKey = "unit" | "house" | "finca" | "land" | "commercial";
const groupOf = (t: TypeSlug): GroupKey => (t === "apartamento" || t === "apartaestudio" || t === "penthouse" ? "unit" : t === "casa" ? "house" : t === "finca" ? "finca" : t === "lote" ? "land" : "commercial");

const AMENITY_PROB: Record<GroupKey, Record<string, number>> = {
  unit: { sala: 0.95, comedor: 0.85, "cocina-integral": 0.8, balcon: 0.6, patio: 0.15, "zona-de-lavanderia": 0.7, ascensor: 0.75, "porteria-24h": 0.85, gimnasio: 0.5, piscina: 0.4, "salon-comunal": 0.5, "juegos-infantiles": 0.3, "zona-bbq": 0.3, "parqueadero-de-visitantes": 0.6, "circuito-de-camaras": 0.6, "conjunto-cerrado": 0.7, "vista-panoramica": 0.25, terraza: 0.2, "gas-natural": 0.7, "planta-electrica": 0.4, estudio: 0.2, "cuarto-util": 0.4, "cerca-de-transporte": 0.6, "cerca-de-colegios": 0.4, "cerca-de-centros-comerciales": 0.55, "cerca-de-parques": 0.5, "cerca-de-hospitales": 0.25, "barrio-caminable": 0.35, jacuzzi: 0.06 },
  house: { sala: 0.98, comedor: 0.9, patio: 0.75, jardin: 0.55, "cocina-integral": 0.9, "zona-de-lavanderia": 0.9, "zonas-verdes": 0.6, "zona-bbq": 0.5, terraza: 0.5, "conjunto-cerrado": 0.55, "porteria-24h": 0.4, "circuito-de-camaras": 0.5, estudio: 0.4, "cuarto-util": 0.5, chimenea: 0.15, "gas-natural": 0.7, piscina: 0.2, "juegos-infantiles": 0.15, balcon: 0.3, "cerca-de-colegios": 0.5, "cerca-de-parques": 0.5, "cerca-de-transporte": 0.5, "cerca-de-centros-comerciales": 0.45 },
  finca: { sala: 0.95, comedor: 0.85, patio: 0.7, jardin: 0.8, kiosco: 0.45, piscina: 0.8, "zona-bbq": 0.8, "zonas-verdes": 1, "vista-panoramica": 0.8, jacuzzi: 0.35, chimenea: 0.6, "planta-electrica": 0.6, terraza: 0.7, "cocina-integral": 0.9, "gas-natural": 0.2, "cerca-de-parques": 0.4, "cuarto-util": 0.5, "zona-de-lavanderia": 0.7, estudio: 0.35 },
  land: { acueducto: 0.75, "energia-electrica": 0.8, alcantarillado: 0.55, "gas-natural": 0.25, "lote-cerrado": 0.4, esquinero: 0.25, "via-pavimentada": 0.6, "lote-plano": 0.55, "cerca-de-transporte": 0.6, "cerca-de-colegios": 0.45, "cerca-de-centros-comerciales": 0.45, "cerca-de-parques": 0.4, "vista-panoramica": 0.5, "zonas-verdes": 0.5, "cerca-de-hospitales": 0.3 },
  commercial: { vitrina: 0.45, recepcion: 0.5, "sala-de-juntas": 0.35, cocineta: 0.55, deposito: 0.5, ascensor: 0.6, "porteria-24h": 0.6, "circuito-de-camaras": 0.7, "planta-electrica": 0.6, "parqueadero-de-visitantes": 0.5, "cerca-de-transporte": 0.8, "cerca-de-centros-comerciales": 0.5, "barrio-caminable": 0.4, "gas-natural": 0.15 },
};

function pickAmenities(type: TypeSlug, city: CitySeed, petFriendly: boolean, r: Rng): string[] {
  const g = groupOf(type);
  const probs: Record<string, number> = { ...AMENITY_PROB[g] };
  if (g !== "land") probs["aire-acondicionado"] = city.hot ? (g === "commercial" ? 0.9 : 0.8) : g === "commercial" ? 0.4 : 0.05;
  if (city.slug === "bogota" && (g === "unit" || g === "house")) probs.chimenea = 0.25;
  if (type === "penthouse") { probs.terraza = 1; probs.jacuzzi = 0.6; probs["vista-panoramica"] = 0.9; probs.ascensor = 1; }
  if (type === "consultorio") probs["cerca-de-hospitales"] = 0.95;
  const out = Object.entries(probs).filter(([, p]) => r.next() < p).map(([s]) => s);
  const base = Object.keys(AMENITY_PROB[g]);
  // mínimo 6 para vivienda
  while (g !== "land" && out.length < (g === "commercial" ? 4 : 6)) {
    const s = r.pick(base);
    if (!out.includes(s)) out.push(s);
  }
  if (petFriendly && g !== "commercial" && g !== "land" && !out.includes("mascotas-permitidas")) out.push("mascotas-permitidas");
  return [...new Set(out)];
}

/* ---------- Imágenes ---------- */
type PoolKey = keyof typeof POOL;
const SEQ: Record<GroupKey, PoolKey[]> = {
  unit: ["living", "buildingExterior", "living", "kitchen", "bedroom", "bathroom", "bedroom", "living", "outdoor", "bathroom"],
  house: ["houseExterior", "living", "kitchen", "bedroom", "houseExterior", "bathroom", "outdoor", "bedroom", "living", "houseExterior"],
  finca: ["finca", "houseExterior", "finca", "outdoor", "living", "bedroom", "finca", "outdoor", "kitchen", "bathroom"],
  land: ["outdoor", "finca", "outdoor", "finca", "outdoor", "finca", "outdoor", "finca"],
  commercial: ["office", "buildingExterior", "office", "shop", "living", "bathroom", "office", "buildingExterior"],
};
const COMMERCIAL_SEQ: Partial<Record<TypeSlug, PoolKey[]>> = {
  local: ["shop", "buildingExterior", "shop", "office", "buildingExterior", "office"],
  bodega: ["buildingExterior", "office", "buildingExterior", "office", "outdoor", "buildingExterior"],
  consultorio: ["office", "office", "bathroom", "living", "buildingExterior", "office"],
  oficina: ["office", "buildingExterior", "office", "office", "living", "bathroom", "office", "buildingExterior"],
};
const LABELS: Record<PoolKey, string[]> = {
  houseExterior: ["Fachada"], buildingExterior: ["Fachada del edificio"], living: ["Sala", "Sala y comedor", "Zona social"], kitchen: ["Cocina"],
  bedroom: ["Habitación principal", "Habitación 2", "Habitación 3"], bathroom: ["Baño", "Baño principal"], outdoor: ["Zona exterior", "Jardín"],
  finca: ["Vista de la finca", "Zonas verdes"], office: ["Espacio interior", "Zona de trabajo"], shop: ["Local"],
};
const FALLBACK: PoolKey[] = ["living", "buildingExterior", "office", "outdoor", "houseExterior"];

function pickImages(type: TypeSlug, count: number, r: Rng): { url: string; label: string }[] {
  const seq = COMMERCIAL_SEQ[type] ?? SEQ[groupOf(type)];
  const used = new Set<string>();
  const counters = new Map<PoolKey, number>();
  const offsets = new Map<PoolKey, number>();
  const take = (k: PoolKey): { url: string; label: string } | null => {
    const arr = POOL[k];
    if (!offsets.has(k)) offsets.set(k, r.int(0, arr.length - 1));
    for (let i = 0; i < arr.length; i++) {
      const url = arr[(offsets.get(k)! + (counters.get(k) ?? 0) + i) % arr.length]!;
      if (!used.has(url)) {
        used.add(url);
        counters.set(k, (counters.get(k) ?? 0) + i + 1);
        const labels = LABELS[k];
        return { url, label: labels[(counters.get(k) ?? 1) % labels.length]! };
      }
    }
    return null;
  };
  const out: { url: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const k = seq[i % seq.length]!;
    let img = take(k);
    for (const fb of FALLBACK) { if (img) break; img = take(fb); }
    if (img) out.push(img);
  }
  return out;
}

/* ---------- Nombres para consultas ---------- */
const PEOPLE = [
  ["Carolina Mejía", "carolina.mejia"], ["Sebastián Arango", "sebastian.arango"], ["Luisa Fernanda Herrera", "luisafernanda.herrera"], ["Mateo Zapata", "mateo.zapata"],
  ["Juliana Cardona", "juliana.cardona"], ["Camilo Henao", "camilo.henao"], ["Paula Andrea Giraldo", "paula.giraldo"], ["Esteban Marín", "esteban.marin"],
  ["Natalia Quintero", "natalia.quintero"], ["Felipe Osorio", "felipe.osorio"], ["Mariana Pérez", "mariana.perez"], ["Daniel Betancur", "daniel.betancur"],
  ["Alejandra Vélez", "alejandra.velez"], ["Santiago Pineda", "santiago.pineda"], ["Manuela Duque", "manuela.duque"], ["Nicolás Rojas", "nicolas.rojas"],
  ["Isabella Torres", "isabella.torres"], ["Jhon Edison Muñoz", "jhon.munoz"], ["Katherine Ruiz", "katherine.ruiz"], ["Tomás Villegas", "tomas.villegas"],
] as const;

/* ---------------------------------------------------------------------------------------- */

async function main() {
  const t0 = Date.now();
  console.log("→ Limpiando tablas…");
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);

  /* ----- Catálogos ----- */
  await prisma.propertyType.createMany({ data: TYPES.map((t, i) => ({ id: `type_${t.slug}`, ...t, sortOrder: i })) });
  await prisma.amenity.createMany({ data: AMENITIES.map((a, i) => ({ id: `amn_${a.slug}`, ...a, sortOrder: i })) });
  await prisma.city.createMany({
    data: CITIES.map((c) => ({ id: `city_${c.slug}`, slug: c.slug, name: c.name, department: c.department, lat: c.lat, lng: c.lng, coverUrl: CITY_COVERS[c.slug] ?? null })),
  });
  await prisma.neighborhood.createMany({
    data: CITIES.flatMap((c) => c.hoods.map((h) => ({ id: `nb_${c.slug}_${h.slug}`, cityId: `city_${c.slug}`, slug: h.slug, name: h.name, lat: h.lat, lng: h.lng }))),
  });

  /* ----- Usuarios ----- */
  console.log("→ Usuarios…");
  const [demoHash, adminHash] = await Promise.all([bcrypt.hash("Demo1234!", 10), bcrypt.hash("Admin1234!", 10)]);
  const createdAgo: Record<UserKey, number> = { admin: 220, prop: 150, ag: 320, usr: 45, and: 180, mar: 260, san: 240, val: 120, car: 300, dan: 90 };
  await prisma.user.createMany({
    data: USERS.map((u) => ({
      id: `usr_${u.key}`, email: u.email, passwordHash: u.role === "ADMIN" ? adminHash : demoHash, name: u.name, phone: u.phone, role: u.role, verified: u.verified,
      createdAt: daysAgo(createdAgo[u.key]), updatedAt: daysAgo(2), lastLoginAt: daysAgo(rng.int(0, 3), rng.int(0, 12)),
    })),
  });
  await prisma.profile.createMany({
    data: USERS.map((u) => ({
      id: `prf_${u.key}`, userId: `usr_${u.key}`, displayName: u.role === "AGENT" ? u.name : null, slug: slugify(u.name), bio: u.bio ?? null, whatsapp: u.whatsapp ?? null,
      company: u.company ?? null, website: u.website ?? null, city: u.city ?? null,
    })),
  });
  await prisma.agency.createMany({ data: AGENCIES.map((a) => ({ id: `agy_${a.slug}`, ...a, createdAt: daysAgo(400) })) });
  await prisma.agent.createMany({
    data: USERS.filter((u) => u.role === "AGENT").map((u, i) => ({
      id: `agt_${u.key}`, userId: `usr_${u.key}`, agencyId: `agy_${slugify(u.agency ?? "")}`, license: `RNA-${4_100 + i * 137}`, verified: u.verified,
    })),
  });

  /* ----- Publicaciones ----- */
  console.log("→ Publicaciones e imágenes…");
  const typeId = (s: TypeSlug) => `type_${s}`;
  const props: Prisma.PropertyCreateManyInput[] = [];
  const locs: Prisma.PropertyLocationCreateManyInput[] = [];
  const feats: Prisma.PropertyFeatureCreateManyInput[] = [];
  const imgs: Prisma.PropertyImageCreateManyInput[] = [];
  const pubs: Prisma.PublicationCreateManyInput[] = [];
  const hist: Prisma.PriceHistoryCreateManyInput[] = [];
  const meta: { id: string; code: number; row: PlanRow; owner: UserKey; publishedAt: Date | null; title: string | null; slug: string | null; city: CitySeed; hood: HoodSeed | null; views: number; path: string }[] = [];

  PLAN.forEach((row, idx) => {
    const n = idx + 1;
    const r = makeRng(9_000 + n * 31);
    const city = CITIES.find((c) => c.slug === row.city)!;
    const hood = row.hood ? (city.hoods.find((h) => h.slug === row.hood) ?? null) : null;
    const status = row.status ?? "PUBLISHED";
    const minimal = row.note === "minimo";
    const nearly = row.note === "casi-completo";
    const id = pid(n);
    const propId = `prop_${String(n).padStart(3, "0")}`;
    const code = 1000 + n;

    const d = dimsFor(row.type, r, hood, row.op);
    if (minimal) Object.assign(d, { area: null, landArea: null, beds: null, baths: null, parking: null, floor: null, totalFloors: null, stratum: null });
    const cond: "NEW" | "USED" | "OFF_PLAN" = (row.type === "apartamento" || row.type === "penthouse") && row.op === "SALE" && r.chance(0.1) ? "OFF_PLAN" : row.op === "SALE" && r.chance(0.15) ? "NEW" : "USED";
    d.ageYears = cond === "NEW" || cond === "OFF_PLAN" ? 0 : row.type === "lote" ? null : r.int(1, 26);
    const furnished = row.op === "RENT" && r.chance(row.type === "apartaestudio" ? 0.7 : row.type === "apartamento" ? 0.3 : 0.1);
    const petFriendly = groupOf(row.type) !== "commercial" && r.chance(0.5);
    const negotiable = row.op === "SALE" ? r.chance(0.55) : r.chance(0.15);
    const price = minimal ? 0 : priceFor(row, hood, d, cond, furnished, r);
    const adminFee = groupOf(row.type) === "unit" ? roundTo((d.area ?? 60) * r.int(2_800, 6_500), 5_000) : row.type === "oficina" || row.type === "consultorio" || row.type === "local" ? roundTo((d.area ?? 40) * r.int(3_000, 6_000), 5_000) : row.type === "casa" && r.chance(0.25) ? roundTo(r.int(180_000, 450_000), 10_000) : null;
    const minMonths = row.op === "RENT" ? (row.type === "apartaestudio" ? 6 : 12) : null;
    const amenSlugs = minimal ? [] : pickAmenities(row.type, city, petFriendly, r);
    const amenNames = amenSlugs.map((s) => AMENITIES.find((a) => a.slug === s)!.name);

    // Ubicación
    const isFinca = row.type === "finca";
    const spread = hood ? (isFinca ? 0.04 : 0.0035) : 0.01;
    const baseLat = hood?.lat ?? (row.type === "finca" && city.slug === "medellin" ? 6.215 : city.lat);
    const baseLng = hood?.lng ?? (row.type === "finca" && city.slug === "medellin" ? -75.495 : city.lng);
    const lat = Math.round((baseLat + (r.next() - 0.5) * 2 * spread) * 1e6) / 1e6;
    const lng = Math.round((baseLng + (r.next() - 0.5) * 2 * spread) * 1e6) / 1e6;
    const road = r.pick(["Carrera", "Calle", "Transversal", "Diagonal", "Avenida", "Circular"]);
    const address = isFinca ? `Vereda ${r.pick(["Mazo", "El Placer", "La Aldea", "Piedras Blancas", "Chorrillos"])}, km ${r.int(2, 14)}` : `${road} ${r.int(1, 90)}${r.chance(0.3) ? r.pick(["A", "B", "C"]) : ""} # ${r.int(1, 99)}-${r.int(1, 99)}`;
    const hideAddress = r.chance(0.6);

    // Textos
    const ctx: TextCtx = {
      rng: r, type: row.type, op: row.op, city: city.name, hood: hood?.name ?? null, place: hood?.name ?? (isFinca ? "Santa Elena" : city.name),
      vibe: hood?.vibe ?? (isFinca ? "campestre, rodeado de naturaleza" : "tranquilo y de fácil acceso"),
      landmarks: hood?.landmarks ?? (isFinca ? ["el Parque Arví", "el corregimiento de Santa Elena"] : [`el casco urbano de ${city.name}`]), area: d.area, landArea: d.landArea, beds: d.beds, baths: d.baths, parking: d.parking,
      stratum: d.stratum, floor: d.floor, ageYears: d.ageYears, condition: cond, furnished, petFriendly, negotiable, adminFee, price, minContractMonths: minMonths,
      hot: city.hot, amenityNames: amenNames, amenitySlugs: amenSlugs,
    };
    let title: string | null = makeTitle(ctx);
    let description: string | null = makeDescription(ctx);
    if (minimal) { title = null; description = null; }

    // Estados y fechas
    const owner = row.owner;
    let publishedAt: Date | null = null;
    let createdAt = daysAgo((row.ago ?? 0) + 2 + r.int(0, 2));
    let updatedAt = daysAgo(Math.max(0, (row.ago ?? 0) - r.int(0, 3)), r.int(0, 8));
    let expiresAt: Date | null = null;
    let moderationNote: string | null = null;
    if (status === "PUBLISHED" || status === "PAUSED" || status === "SOLD") {
      publishedAt = daysAgo(row.ago ?? 10, r.int(0, 18));
      expiresAt = status === "PUBLISHED" ? new Date(Math.max(publishedAt.getTime() + 90 * DAY, NOW.getTime() + 30 * DAY)) : null;
    }
    if (status === "PAUSED") updatedAt = daysAgo(12);
    if (status === "SOLD") updatedAt = daysAgo(15);
    if (status === "PENDING_REVIEW") { createdAt = daysAgo(3); updatedAt = daysAgo(1, 5); }
    if (status === "REJECTED") { createdAt = daysAgo(9); updatedAt = daysAgo(6); moderationNote = "Las fotografías no corresponden al inmueble publicado. Sube imágenes propias del inmueble y vuelve a enviarlo a revisión."; }
    if (status === "DRAFT") { createdAt = daysAgo(minimal ? 1 : 4); updatedAt = daysAgo(minimal ? 0 : 1, 3); }

    const featured = !!row.featured && status === "PUBLISHED";

    props.push({
      id: propId, ownerId: `usr_${owner}`, typeId: typeId(row.type), condition: cond, area: d.area, landArea: d.landArea, bedrooms: d.beds, bathrooms: d.baths,
      parking: d.parking, floor: d.floor, totalFloors: d.totalFloors, stratum: groupOf(row.type) === "unit" || row.type === "casa" ? d.stratum : null,
      ageYears: d.ageYears, furnished, petFriendly, adminFee: adminFee ? BigInt(adminFee) : null, createdAt, updatedAt,
    });
    locs.push({
      id: `loc_${String(n).padStart(3, "0")}`, propertyId: propId, cityId: `city_${city.slug}`, neighborhoodId: hood ? `nb_${city.slug}_${hood.slug}` : null,
      address: minimal ? null : address, hideAddress: minimal ? true : hideAddress, lat: minimal ? null : lat, lng: minimal ? null : lng,
    });
    for (const s of amenSlugs) feats.push({ propertyId: propId, amenityId: `amn_${s}` });

    // Imágenes
    const imgCount = minimal ? 0 : nearly ? 2 : status === "REJECTED" ? 5 : status === "PENDING_REVIEW" ? 6 : r.int(6, 10);
    const images = pickImages(row.type, imgCount, r);
    images.forEach((im, i) => {
      imgs.push({
        id: `img_${String(n).padStart(3, "0")}_${String(i + 1).padStart(2, "0")}`, propertyId: propId, key: `seed/${propId}/${i + 1}.jpg`, url: im.url, width: 1600, height: 1067,
        sizeBytes: r.int(180_000, 420_000), mime: "image/jpeg", checksum: `seed-${propId}-${i + 1}`, position: i, isCover: i === 0, roomLabel: im.label, caption: null,
        status: "READY", createdAt,
      });
    });

    const slug = title ? slugify(title) : null;
    pubs.push({
      id, code, propertyId: propId, operation: row.op, status, title, slug, description, price: minimal ? null : BigInt(price), currency: "COP", negotiable, videoUrl: null, tourUrl: null,
      availableFrom: row.op === "RENT" && status === "PUBLISHED" ? daysAhead(r.int(0, 30)) : null, minContractMonths: minMonths, showPhone: true, showWhatsapp: true,
      featured, featuredUntil: featured ? daysAhead(r.int(15, 45)) : null, moderationNote, viewCount: 0, publishedAt, expiresAt, createdAt, updatedAt,
    });
    if (r.chance(0.2) && status === "PUBLISHED") pubs[pubs.length - 1]!.tourUrl = "https://my.matterport.com/show/?m=demo";
    if (r.chance(0.15) && status === "PUBLISHED") pubs[pubs.length - 1]!.videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

    // Historial de precios
    if (publishedAt && !minimal) {
      const drops = row.drop ?? 0;
      const total = (publishedAt && row.ago) || 0;
      if (drops === 0) hist.push({ id: `ph_${n}_0`, publicationId: id, price: BigInt(price), createdAt: publishedAt });
      else {
        const first = salePrice(price / (drops === 2 ? 0.9 : 0.94));
        const mid = salePrice(price / 0.95);
        hist.push({ id: `ph_${n}_0`, publicationId: id, price: BigInt(first), createdAt: publishedAt });
        if (drops === 2) hist.push({ id: `ph_${n}_1`, publicationId: id, price: BigInt(mid), createdAt: new Date(publishedAt.getTime() + Math.floor(total * 0.4) * DAY) });
        hist.push({ id: `ph_${n}_${drops}`, publicationId: id, price: BigInt(price), createdAt: new Date(publishedAt.getTime() + Math.floor(total * (drops === 2 ? 0.75 : 0.5)) * DAY) });
      }
    }

    const path = `/${row.op === "SALE" ? "venta" : "arriendo"}/${row.type}/${city.slug}${hood ? `/${hood.slug}` : ""}/${slug ?? "inmueble"}-${code}`;
    meta.push({ id, code, row: { ...row, status }, owner, publishedAt, title, slug, city, hood, views: 0, path });
  });

  await prisma.property.createMany({ data: props });
  await prisma.propertyLocation.createMany({ data: locs });
  await prisma.propertyFeature.createMany({ data: feats });
  await prisma.propertyImage.createMany({ data: imgs });
  await prisma.publication.createMany({ data: pubs });
  await prisma.priceHistory.createMany({ data: hist });
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Publication"','code'), (SELECT MAX(code) FROM "Publication"))`);

  /* ----- Consultas y mensajes ----- */
  console.log("→ Consultas, visitas, favoritos…");
  const inquiries: Prisma.InquiryCreateManyInput[] = [];
  const messages: Prisma.InquiryMessageCreateManyInput[] = [];
  const inquiryDay = new Map<string, number>(); // `${pubId}|${yyyy-mm-dd}` → n
  const notifications: Prisma.NotificationCreateManyInput[] = [];

  // propietario: 3 en cada publicada, 1 en pausada/vendida; agente: 2 en cada una
  const targets: { pubIdx: number; count: number }[] = [];
  meta.forEach((m, i) => {
    if (m.owner === "prop" && m.row.status === "PUBLISHED") targets.push({ pubIdx: i, count: 3 });
    else if (m.owner === "prop" && (m.row.status === "PAUSED" || m.row.status === "SOLD")) targets.push({ pubIdx: i, count: 1 });
    else if (m.owner === "ag" && m.row.status === "PUBLISHED") targets.push({ pubIdx: i, count: 2 });
  });
  let inqN = 0;
  const ir = makeRng(4242);
  for (const t of targets) {
    const m = meta[t.pubIdx]!;
    for (let k = 0; k < t.count; k++) {
      inqN++;
      const fromUser = inqN % 8 === 1;
      const [fullName, emailBase] = PEOPLE[(inqN * 7 + k) % PEOPLE.length]!;
      const name = fromUser ? "Laura Gómez" : fullName;
      const email = fromUser ? "usuario@nido.co" : `${emailBase}@${ir.pick(["gmail.com", "hotmail.com", "outlook.com", "yahoo.com"])}`;
      const pubAge = m.row.ago ?? 20;
      const age = Math.min(ir.int(0, 27), Math.max(0, pubAge - 1));
      const createdAt = daysAgo(age, ir.int(0, 20));
      const id = `inq_${String(inqN).padStart(3, "0")}`;
      const kind = inqN % 5 === 0 ? "NEW" : inqN % 7 === 3 ? "CLOSED" : inqN % 4 === 2 ? "NEW" : "REPLIED";
      const msgs: { fromOwner: boolean; body: string; at: Date }[] = [{ fromOwner: false, body: inquiryOpening(ir, m.title ?? "tu publicación", m.row.op), at: createdAt }];
      if (kind !== "NEW") {
        msgs.push({ fromOwner: true, body: ownerReply(ir, name.split(" ")[0]!), at: new Date(createdAt.getTime() + ir.int(1, 9) * HOUR) });
        if (inqN % 2 === 0) msgs.push({ fromOwner: false, body: inquiryFollowUp(ir), at: new Date(msgs[1]!.at.getTime() + ir.int(1, 5) * HOUR) });
      }
      const last = msgs[msgs.length - 1]!.at;
      const status = last.getTime() > NOW.getTime() ? "NEW" : kind;
      inquiries.push({
        id, publicationId: m.id, senderId: fromUser ? "usr_usr" : null, name, email, phone: ir.chance(0.6) ? `+57 3${ir.int(0, 2)}${ir.int(0, 9)} ${ir.int(100, 999)} ${ir.int(1000, 9999)}` : null,
        status, lastMessageAt: last, readByOwner: status !== "NEW", createdAt,
      });
      msgs.forEach((x, i) => messages.push({
        id: `msg_${String(inqN).padStart(3, "0")}_${i + 1}`, inquiryId: id, senderId: x.fromOwner ? `usr_${m.owner}` : fromUser ? "usr_usr" : null, fromOwner: x.fromOwner, body: x.body, createdAt: x.at,
      }));
      const key = `${m.id}|${utcDay(createdAt).toISOString().slice(0, 10)}`;
      inquiryDay.set(key, (inquiryDay.get(key) ?? 0) + 1);
      if (status === "NEW") notifications.push({ id: `ntf_inq_${inqN}`, userId: `usr_${m.owner}`, type: "inquiry", title: "Nueva consulta", body: `${name} escribió sobre “${m.title}”.`, link: `/panel/mensajes?id=${id}`, readAt: null, createdAt });
    }
  }
  await prisma.inquiry.createMany({ data: inquiries });
  await prisma.inquiryMessage.createMany({ data: messages });

  /* ----- Estadísticas diarias (60 días) para propietario y agente ----- */
  const stats: Prisma.PublicationStatDailyCreateManyInput[] = [];
  const viewTotals = new Map<string, number>();
  for (const [i, m] of meta.entries()) {
    const st = m.row.status;
    if (!(m.owner === "prop" || m.owner === "ag") || !m.publishedAt || st === "DRAFT" || st === "PENDING_REVIEW" || st === "REJECTED") continue;
    const sr = makeRng(70_000 + i * 17);
    const base = sr.int(12, 46);
    const pubDay = utcDay(m.publishedAt).getTime();
    const endDay = utcDay(st === "PAUSED" ? daysAgo(12) : st === "SOLD" ? daysAgo(15) : NOW).getTime();
    let total = 0;
    for (let off = 59; off >= 0; off--) {
      const day = utcDay(daysAgo(off)).getTime();
      if (day < pubDay || day > endDay) continue;
      const since = (day - pubDay) / DAY;
      const weekday = new Date(day).getUTCDay();
      const wf = weekday === 0 || weekday === 6 ? 1.25 : weekday === 3 ? 1.1 : 0.95;
      const curve = 0.55 + 1.5 * Math.exp(-since / 22);
      const views = Math.max(0, Math.round(base * curve * wf * (0.75 + sr.next() * 0.5)));
      const favorites = Math.round(views * (0.03 + sr.next() * 0.05));
      const key = `${m.id}|${new Date(day).toISOString().slice(0, 10)}`;
      stats.push({ id: `st_${m.code}_${off}`, publicationId: m.id, date: new Date(day), views, favorites, inquiries: inquiryDay.get(key) ?? 0, shares: sr.chance(0.15) ? 1 : 0 });
      total += views;
    }
    viewTotals.set(m.id, total + sr.int(20, 140));
  }
  await prisma.publicationStatDaily.createMany({ data: stats });
  for (const m of meta) {
    if (m.row.status === "DRAFT" || m.row.status === "PENDING_REVIEW" || m.row.status === "REJECTED") continue;
    const v = viewTotals.get(m.id) ?? Math.round((m.row.ago ?? 10) * makeRng(m.code).int(5, 24));
    await prisma.publication.update({ where: { id: m.id }, data: { viewCount: v } });
  }

  /* ----- Visitas ----- */
  const slot = (dayOffset: number, hour: number, min = 0) => { const d = new Date(daysAhead(dayOffset)); d.setUTCHours(hour + 5, min, 0, 0); return d; }; // hora Colombia (UTC-5)
  const byTitle = (n: number) => meta[n - 1]!;
  const visits: Prisma.VisitCreateManyInput[] = [
    { id: "vis_001", publicationId: byTitle(1).id, requesterId: "usr_usr", name: "Laura Gómez", email: "usuario@nido.co", phone: "+57 315 880 2231", scheduledAt: slot(3, 10), status: "REQUESTED", note: "Prefiero en la mañana. Vamos dos personas.", createdAt: daysAgo(1) },
    { id: "vis_002", publicationId: byTitle(2).id, requesterId: null, name: "Sebastián Arango", email: "sebastian.arango@gmail.com", phone: "+57 301 445 7712", scheduledAt: slot(2, 15, 30), status: "CONFIRMED", note: null, createdAt: daysAgo(3) },
    { id: "vis_003", publicationId: byTitle(3).id, requesterId: null, name: "Natalia Quintero", email: "natalia.quintero@outlook.com", phone: null, scheduledAt: slot(6, 11), status: "REQUESTED", note: "¿Se puede ver también el parqueadero?", createdAt: daysAgo(0, 6) },
    { id: "vis_004", publicationId: byTitle(1).id, requesterId: null, name: "Felipe Osorio", email: "felipe.osorio@gmail.com", phone: "+57 312 220 9981", scheduledAt: slot(-5, 16), status: "DONE", note: null, createdAt: daysAgo(9) },
    { id: "vis_005", publicationId: byTitle(11).id, requesterId: null, name: "Mariana Pérez", email: "mariana.perez@hotmail.com", phone: "+57 318 774 0012", scheduledAt: slot(1, 9, 30), status: "REQUESTED", note: null, createdAt: daysAgo(0, 3) },
    { id: "vis_006", publicationId: byTitle(12).id, requesterId: null, name: "Daniel Betancur", email: "daniel.betancur@yahoo.com", phone: "+57 300 118 4429", scheduledAt: slot(4, 14), status: "CONFIRMED", note: "Llegamos en moto.", createdAt: daysAgo(2) },
    { id: "vis_007", publicationId: byTitle(13).id, requesterId: null, name: "Isabella Torres", email: "isabella.torres@gmail.com", phone: null, scheduledAt: slot(-2, 17), status: "CANCELLED", note: "Surgió un imprevisto.", createdAt: daysAgo(6) },
    { id: "vis_008", publicationId: byTitle(15).id, requesterId: "usr_usr", name: "Laura Gómez", email: "usuario@nido.co", phone: "+57 315 880 2231", scheduledAt: slot(9, 10), status: "REQUESTED", note: "Nos interesa conocer el terreno completo.", createdAt: daysAgo(1, 4) },
  ];
  await prisma.visit.createMany({ data: visits });
  for (const v of visits.filter((x) => x.status === "REQUESTED")) {
    const m = meta.find((x) => x.id === v.publicationId)!;
    notifications.push({ id: `ntf_${v.id}`, userId: `usr_${m.owner}`, type: "visit", title: "Nueva solicitud de visita", body: `${v.name} quiere visitar “${m.title}”.`, link: "/panel/visitas", readAt: null, createdAt: v.createdAt as Date });
  }

  /* ----- Favoritos ----- */
  const pubIdsPublished = meta.filter((m) => m.row.status === "PUBLISHED");
  const favIdx = [0, 16, 27, 37, 46, 55];
  const favorites: Prisma.FavoriteCreateManyInput[] = favIdx.map((i, k) => ({ userId: "usr_usr", publicationId: meta[i]!.id, createdAt: daysAgo(20 - k * 3) }));
  const fr = makeRng(555);
  const others: UserKey[] = ["and", "mar", "san", "val", "car", "dan", "prop", "ag"];
  const seen = new Set(favorites.map((f) => `${f.userId}|${f.publicationId}`));
  for (let k = 0; k < 40; k++) {
    const m = fr.pick(pubIdsPublished);
    const u = `usr_${fr.pick(others)}`;
    if (seen.has(`${u}|${m.id}`) || u === `usr_${m.owner}`) continue;
    seen.add(`${u}|${m.id}`);
    favorites.push({ userId: u, publicationId: m.id, createdAt: daysAgo(fr.int(1, 40)) });
  }
  await prisma.favorite.createMany({ data: favorites });

  /* ----- Búsquedas guardadas ----- */
  await prisma.savedSearch.createMany({
    data: [
      { id: "ss_001", userId: "usr_usr", name: "Apartamentos en El Poblado hasta 900 M", query: { operation: "SALE", type: "apartamento", city: "medellin", neighborhood: "el-poblado", maxPrice: 900_000_000, bedrooms: 2 }, frequency: "DAILY", lastNotifiedAt: daysAgo(4), createdAt: daysAgo(21) },
      { id: "ss_002", userId: "usr_usr", name: "Arriendos en Bogotá con parqueadero", query: { operation: "RENT", city: "bogota", parking: 1, maxPrice: 4_500_000 }, frequency: "WEEKLY", lastNotifiedAt: null, createdAt: daysAgo(14) },
    ],
  });

  /* ----- Reportes ----- */
  await prisma.report.createMany({
    data: [
      { id: "rep_001", publicationId: byTitle(19).id, reporterId: "usr_usr", reason: "Precio engañoso", details: "El valor publicado no coincide con lo que dicen por teléfono.", status: "OPEN", createdAt: daysAgo(2) },
      { id: "rep_002", publicationId: byTitle(45).id, reporterId: null, reason: "Fotos que no corresponden", details: "Las imágenes parecen de otro inmueble.", status: "OPEN", createdAt: daysAgo(1, 8) },
      { id: "rep_003", publicationId: byTitle(60).id, reporterId: "usr_and", reason: "Posible estafa", details: "Piden un anticipo antes de mostrar el inmueble.", status: "OPEN", createdAt: daysAgo(0, 10) },
    ],
  });

  /* ----- Notificaciones restantes ----- */
  const own = (n: number) => byTitle(n);
  notifications.push(
    { id: "ntf_a1", userId: "usr_prop", type: "publication", title: "Tu publicación fue aprobada", body: `“${own(1).title}” ya está visible para todos.`, link: own(1).path, readAt: daysAgo(2), createdAt: daysAgo(3) },
    { id: "ntf_a2", userId: "usr_prop", type: "moderation", title: "Publicación rechazada", body: "Las fotografías no corresponden al inmueble publicado.", link: `/publicar/${own(9).id}`, readAt: null, createdAt: daysAgo(6) },
    { id: "ntf_a3", userId: "usr_prop", type: "publication", title: "Tu publicación está en revisión", body: "Te avisaremos cuando un moderador la apruebe.", link: "/panel/publicaciones", readAt: null, createdAt: daysAgo(1, 5) },
    { id: "ntf_b1", userId: "usr_ag", type: "publication", title: "Tu publicación destacada vence pronto", body: `“${own(11).title}” dejará de estar destacada en unos días.`, link: "/panel/publicaciones", readAt: null, createdAt: daysAgo(1) },
    { id: "ntf_c1", userId: "usr_admin", type: "moderation", title: "Publicación pendiente de revisión", body: `“${own(5).title}” espera aprobación.`, link: "/admin/moderacion", readAt: null, createdAt: daysAgo(1, 5) },
    { id: "ntf_c2", userId: "usr_admin", type: "report", title: "Nuevo reporte", body: "Posible estafa en una publicación de Santa Marta.", link: "/admin/reportes", readAt: null, createdAt: daysAgo(0, 10) },
    { id: "ntf_d1", userId: "usr_usr", type: "saved_search", title: "3 inmuebles nuevos en tu búsqueda", body: "Apartamentos en El Poblado hasta 900 M", link: "/favoritos", readAt: null, createdAt: daysAgo(1) },
    { id: "ntf_d2", userId: "usr_usr", type: "price_drop", title: "Bajó de precio un inmueble que guardaste", body: `“${own(40).title}” tiene un nuevo precio.`, link: own(40).path, readAt: daysAgo(5), createdAt: daysAgo(6) },
  );
  await prisma.notification.createMany({ data: notifications });

  /* ----- Auditoría ----- */
  const audit: Prisma.AuditLogCreateManyInput[] = [
    { id: "aud_01", actorId: "usr_admin", action: "publication.approve", entity: "Publication", entityId: own(1).id, meta: { code: own(1).code }, createdAt: daysAgo(3) },
    { id: "aud_02", actorId: "usr_admin", action: "publication.approve", entity: "Publication", entityId: own(2).id, meta: { code: own(2).code }, createdAt: daysAgo(21) },
    { id: "aud_03", actorId: "usr_admin", action: "publication.reject", entity: "Publication", entityId: own(9).id, meta: { code: own(9).code, reason: "Fotos no corresponden" }, createdAt: daysAgo(6) },
    { id: "aud_04", actorId: "usr_admin", action: "publication.feature", entity: "Publication", entityId: own(11).id, meta: { featured: true, days: 30 }, createdAt: daysAgo(12) },
    { id: "aud_05", actorId: "usr_admin", action: "user.update", entity: "User", entityId: "usr_ag", meta: { verified: true }, createdAt: daysAgo(60) },
    { id: "aud_06", actorId: "usr_admin", action: "user.update", entity: "User", entityId: "usr_san", meta: { verified: true }, createdAt: daysAgo(48) },
    { id: "aud_07", actorId: "usr_admin", action: "catalog.create", entity: "Amenity", entityId: "amn_barrio-caminable", meta: { name: "Barrio caminable" }, createdAt: daysAgo(30) },
    { id: "aud_08", actorId: "usr_prop", action: "auth.login", entity: "User", entityId: "usr_prop", meta: { ip: "190.85.12.40" }, createdAt: daysAgo(1, 4) },
    { id: "aud_09", actorId: "usr_ag", action: "auth.login", entity: "User", entityId: "usr_ag", meta: { ip: "181.51.33.8" }, createdAt: daysAgo(0, 7) },
    { id: "aud_10", actorId: null, action: "auth.login_failed", entity: "User", entityId: null, meta: { email: "desconocido@example.com", ip: "45.12.99.3" }, createdAt: daysAgo(2, 3) },
    { id: "aud_11", actorId: "usr_usr", action: "auth.register", entity: "User", entityId: "usr_usr", meta: { role: "USER" }, createdAt: daysAgo(45) },
    { id: "aud_12", actorId: "usr_admin", action: "report.update", entity: "Report", entityId: "rep_001", meta: { status: "OPEN" }, createdAt: daysAgo(1) },
    { id: "aud_13", actorId: "usr_admin", action: "auth.login", entity: "User", entityId: "usr_admin", meta: { ip: "200.31.4.77" }, createdAt: daysAgo(0, 2) },
    { id: "aud_14", actorId: "usr_val", action: "auth.login", entity: "User", entityId: "usr_val", meta: { ip: "186.84.20.9" }, createdAt: daysAgo(2) },
  ];
  await prisma.auditLog.createMany({ data: audit });

  /* ----- Resumen ----- */
  const statusCounts = await prisma.publication.groupBy({ by: ["status"], _count: { _all: true } });
  const cityCounts = await prisma.$queryRaw<{ name: string; n: number }[]>`SELECT c.name, COUNT(*)::int AS n FROM "Publication" p JOIN "PropertyLocation" l ON l."propertyId" = p."propertyId" JOIN "City" c ON c.id = l."cityId" WHERE p.status = 'PUBLISHED' GROUP BY c.name ORDER BY n DESC`;
  const words = (s: string | null) => (s ? s.trim().split(/\s+/).length : 0);
  const wcs = pubs.filter((p) => p.description).map((p) => words(p.description as string));
  const feat = pubs.filter((p) => p.featured).length;
  const propStatus = await prisma.publication.groupBy({ by: ["status"], where: { property: { ownerId: "usr_prop" } }, _count: { _all: true } });
  console.log("\n══════════════ Semilla Nido lista ══════════════");
  console.log(`Tipos ${TYPES.length} · Amenidades ${AMENITIES.length} · Ciudades ${CITIES.length} · Barrios ${CITIES.reduce((a, c) => a + c.hoods.length, 0)}`);
  console.log(`Usuarios ${USERS.length} · Agencias ${AGENCIES.length}`);
  console.log(`Publicaciones ${pubs.length} (destacadas ${feat}) · imágenes ${imgs.length} · historial de precios ${hist.length}`);
  console.log(`  por estado: ${statusCounts.map((s) => `${s.status}=${s._count._all}`).join(", ")}`);
  console.log(`  PUBLISHED por ciudad: ${cityCounts.map((c) => `${c.name}=${c.n}`).join(", ")}`);
  console.log(`  propietario@nido.co: ${propStatus.map((s) => `${s.status}=${s._count._all}`).join(", ")}`);
  console.log(`  descripción: ${Math.min(...wcs)}–${Math.max(...wcs)} palabras (media ${Math.round(wcs.reduce((a, b) => a + b, 0) / wcs.length)})`);
  console.log(`Consultas ${inquiries.length} (${messages.length} mensajes) · visitas ${visits.length} · favoritos ${favorites.length} · búsquedas guardadas 2 · reportes 3 · notificaciones ${notifications.length} · auditoría ${audit.length} · estadísticas diarias ${stats.length}`);
  console.log("\nCuentas de demostración (contraseña Demo1234!, admin: Admin1234!):");
  for (const u of USERS) console.log(`  ${u.role.padEnd(5)} ${u.email.padEnd(36)} ${u.name}`);
  console.log(`\nListo en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
