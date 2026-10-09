import { BadRequestException, Injectable, type OnModuleInit } from "@nestjs/common";
import { fold, slugify } from "../../common/slug.js";
import { Prisma, PrismaService } from "../../common/prisma.service.js";
import { buildPath } from "../../common/seo.js";
import type { Catalog, CatalogAmenity, CatalogCityHit, CatalogNeighborhood, SuggestItem } from "../../contract.js";
import { AMENITIES } from "./amenities.catalog.js";

const TTL_MS = 5 * 60_000;

function rankName(name: string, needle: string): number {
  const f = fold(name);
  return f.startsWith(needle) ? 0 : f.split(/\s+/).some((w) => w.startsWith(needle)) ? 1 : f.includes(needle) ? 2 : 9;
}

function toHood(n: { id: string; slug: string; name: string; lat: number; lng: number }): CatalogNeighborhood {
  return { id: n.id, slug: n.slug, name: n.name, lat: n.lat, lng: n.lng };
}

@Injectable()
export class CatalogService implements OnModuleInit {
  private cache: { at: number; data: Catalog } | null = null;
  private inflight: Promise<Catalog> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureCanonicalAmenities();
  }

  invalidate(): void {
    this.cache = null;
  }

  /** Crea amenidades canónicas que falten (producción no necesita re-seedear). No pisa nombres/iconos ya editados. */
  async ensureCanonicalAmenities(): Promise<void> {
    try {
      const existing = await this.prisma.amenity.findMany({ select: { slug: true } });
      const have = new Set(existing.map((a) => a.slug));
      const missing = AMENITIES.filter((a) => !have.has(a.slug));
      if (!missing.length) return;
      const max = await this.prisma.amenity.aggregate({ _max: { sortOrder: true } });
      await this.prisma.amenity.createMany({
        data: missing.map((a, i) => ({
          id: `amn_${a.slug}`,
          slug: a.slug,
          name: a.name,
          icon: a.icon,
          category: a.category,
          sortOrder: (max._max.sortOrder ?? AMENITIES.length) + 1 + i,
        })),
        skipDuplicates: true,
      });
      this.invalidate();
    } catch (e) {
      console.warn("No se pudieron asegurar amenidades canónicas:", e);
    }
  }

  async get(): Promise<Catalog> {
    if (this.cache && Date.now() - this.cache.at < TTL_MS) return this.cache.data;
    this.inflight ??= this.load().finally(() => {
      this.inflight = null;
    });
    const data = await this.inflight;
    this.cache = { at: Date.now(), data };
    return data;
  }

  /** Conteo de PUBLISHED vigentes por ciudad. */
  async cityCounts(): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<{ id: string; n: number }[]>(Prisma.sql`
      SELECT l."cityId" AS id, COUNT(*)::int AS n
      FROM "Publication" p JOIN "PropertyLocation" l ON l."propertyId" = p."propertyId"
      WHERE p.status = 'PUBLISHED' AND (p."expiresAt" IS NULL OR p."expiresAt" > now()) AND l."cityId" IS NOT NULL
      GROUP BY l."cityId"`);
    return new Map(rows.map((r) => [r.id, r.n]));
  }

  async typeCounts(): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<{ id: string; n: number }[]>(Prisma.sql`
      SELECT pr."typeId" AS id, COUNT(*)::int AS n
      FROM "Publication" p JOIN "Property" pr ON pr.id = p."propertyId"
      WHERE p.status = 'PUBLISHED' AND (p."expiresAt" IS NULL OR p."expiresAt" > now()) AND pr."typeId" IS NOT NULL
      GROUP BY pr."typeId"`);
    return new Map(rows.map((r) => [r.id, r.n]));
  }

  private async load(): Promise<Catalog> {
    const [types, amenities, cities, counts] = await Promise.all([
      this.prisma.propertyType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      this.prisma.amenity.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      this.prisma.city.findMany({ include: { neighborhoods: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
      this.cityCounts(),
    ]);
    return {
      types: types.map((t) => ({ id: t.id, slug: t.slug, name: t.name, pluralName: t.pluralName, icon: t.icon, group: t.group })),
      amenities: amenities.map((a): CatalogAmenity => ({ id: a.id, slug: a.slug, name: a.name, icon: a.icon, category: a.category })),
      cities: cities.map((c) => ({
        id: c.id, slug: c.slug, name: c.name, department: c.department, lat: c.lat, lng: c.lng, coverUrl: c.coverUrl,
        count: counts.get(c.id) ?? 0,
        neighborhoods: c.neighborhoods.map((n) => ({ id: n.id, slug: n.slug, name: n.name, lat: n.lat, lng: n.lng })),
      })),
    };
  }

  async suggest(raw: string): Promise<SuggestItem[]> {
    const q = raw.trim();
    if (!q) return [];
    const out: SuggestItem[] = [];

    const codeMatch = /^(?:c[oó]d(?:igo)?\.?\s*|#)?(\d{1,9})$/i.exec(q);
    if (codeMatch) {
      const p = await this.prisma.publication.findFirst({
        where: { code: Number(codeMatch[1]), status: "PUBLISHED" },
        include: { property: { include: { type: true, location: { include: { city: true, neighborhood: true } } } } },
      });
      if (p) {
        const loc = p.property.location;
        out.push({
          kind: "code",
          label: p.title ?? `Inmueble ${p.code}`,
          sublabel: `Código ${p.code} · ${loc?.city?.name ?? ""}`.replace(/ · $/, ""),
          path: buildPath({ operation: p.operation, typeSlug: p.property.type?.slug ?? "inmueble", citySlug: loc?.city?.slug ?? "colombia", neighborhoodSlug: loc?.neighborhood?.slug ?? null, slug: p.slug, code: p.code }),
        });
      }
    }

    const needle = fold(q);
    if (needle.length >= 1 && !/^\d+$/.test(needle)) {
      const rank = (name: string) => rankName(name, needle);
      const [cat, dbCities, dbHoods] = await Promise.all([
        this.get(),
        this.prisma.city.findMany({ select: { slug: true, name: true, department: true } }),
        this.prisma.neighborhood.findMany({
          select: { slug: true, name: true, city: { select: { slug: true, name: true, department: true } } },
        }),
      ]);
      const cities = dbCities
        .map((c) => ({ c, r: Math.min(rank(c.name), rank(`${c.name} ${c.department}`)) }))
        .filter((x) => x.r < 9)
        .sort((a, b) => a.r - b.r || a.c.name.localeCompare(b.c.name, "es"))
        .slice(0, 25);
      for (const { c } of cities) out.push({ kind: "city", label: c.name, sublabel: c.department, city: c.slug });
      const hoods = dbHoods
        .map((n) => ({ n, r: rank(n.name) }))
        .filter((x) => x.r < 9)
        .sort((a, b) => a.r - b.r || a.n.name.localeCompare(b.n.name, "es"))
        .slice(0, 12);
      for (const { n } of hoods) out.push({ kind: "neighborhood", label: n.name, sublabel: `${n.city.name}, ${n.city.department}`, city: n.city.slug, neighborhood: n.slug });
      const types = cat.types.map((t) => ({ t, r: Math.min(rank(t.name), rank(t.pluralName)) })).filter((x) => x.r < 9).sort((a, b) => a.r - b.r).slice(0, 3);
      for (const { t } of types) out.push({ kind: "type", label: t.pluralName, sublabel: "Tipo de inmueble", type: t.slug });
    }
    return out.slice(0, 30);
  }

  /** Todas las ciudades, o las que coinciden con `q` (sin tope de 8). */
  async searchCities(raw: string): Promise<CatalogCityHit[]> {
    const cities = await this.prisma.city.findMany({
      select: { id: true, slug: true, name: true, department: true, lat: true, lng: true },
      orderBy: { name: "asc" },
    });
    const needle = fold(raw);
    if (!needle) return cities;
    return cities
      .map((c) => ({ c, r: Math.min(rankName(c.name, needle), rankName(`${c.name} ${c.department}`, needle)) }))
      .filter((x) => x.r < 9)
      .sort((a, b) => a.r - b.r || a.c.name.localeCompare(b.c.name, "es"))
      .slice(0, 40)
      .map((x) => x.c);
  }

  async listNeighborhoods(cityId: string, raw = ""): Promise<CatalogNeighborhood[]> {
    const rows = await this.prisma.neighborhood.findMany({
      where: { cityId },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true, lat: true, lng: true },
    });
    const needle = fold(raw);
    if (!needle) return rows.map(toHood);
    return rows.filter((n) => rankName(n.name, needle) < 9).map(toHood);
  }

  /** Crea el barrio si no existe (mismo nombre o slug en esa ciudad). */
  async ensureNeighborhood(cityId: string, rawName: string): Promise<CatalogNeighborhood> {
    const name = rawName.trim().replace(/\s+/g, " ");
    const city = await this.prisma.city.findUnique({ where: { id: cityId }, select: { id: true, lat: true, lng: true } });
    if (!city) throw new BadRequestException({ message: "La ciudad no existe", errors: { cityId: ["La ciudad no existe"] } });
    const existing = await this.prisma.neighborhood.findMany({
      where: { cityId },
      select: { id: true, slug: true, name: true, lat: true, lng: true },
    });
    const same = existing.find((n) => fold(n.name) === fold(name));
    if (same) return toHood(same);
    const slug = slugify(name) || "barrio";
    const bySlug = existing.find((n) => n.slug === slug);
    if (bySlug) return toHood(bySlug);
    try {
      const created = await this.prisma.neighborhood.create({
        data: { cityId, name, slug, lat: city.lat, lng: city.lng },
        select: { id: true, slug: true, name: true, lat: true, lng: true },
      });
      this.invalidate();
      return toHood(created);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const again = await this.prisma.neighborhood.findUnique({
          where: { cityId_slug: { cityId, slug } },
          select: { id: true, slug: true, name: true, lat: true, lng: true },
        });
        if (again) return toHood(again);
      }
      throw e;
    }
  }
}
