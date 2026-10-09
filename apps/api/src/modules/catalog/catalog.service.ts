import { Injectable } from "@nestjs/common";
import { fold } from "../../common/slug.js";
import { Prisma, PrismaService } from "../../common/prisma.service.js";
import { buildPath } from "../../common/seo.js";
import type { Catalog, CatalogAmenity, SuggestItem } from "../../contract.js";

const TTL_MS = 5 * 60_000;

@Injectable()
export class CatalogService {
  private cache: { at: number; data: Catalog } | null = null;
  private inflight: Promise<Catalog> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  invalidate(): void {
    this.cache = null;
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
      const rank = (name: string) => {
        const f = fold(name);
        return f.startsWith(needle) ? 0 : f.split(/\s+/).some((w) => w.startsWith(needle)) ? 1 : f.includes(needle) ? 2 : 9;
      };
      const [cat, dbCities] = await Promise.all([
        this.get(),
        this.prisma.city.findMany({ select: { slug: true, name: true, department: true } }),
      ]);
      const cities = dbCities
        .map((c) => ({ c, r: Math.min(rank(c.name), rank(`${c.name} ${c.department}`)) }))
        .filter((x) => x.r < 9)
        .sort((a, b) => a.r - b.r || a.c.name.localeCompare(b.c.name, "es"))
        .slice(0, 8);
      for (const { c } of cities) out.push({ kind: "city", label: c.name, sublabel: c.department, city: c.slug });
      const hoods = cat.cities
        .flatMap((c) => c.neighborhoods.map((n) => ({ n, c, r: rank(n.name) })))
        .filter((x) => x.r < 9)
        .sort((a, b) => a.r - b.r || b.c.count - a.c.count)
        .slice(0, 5);
      for (const { n, c } of hoods) out.push({ kind: "neighborhood", label: n.name, sublabel: `${c.name}, ${c.department}`, city: c.slug, neighborhood: n.slug });
      const types = cat.types.map((t) => ({ t, r: Math.min(rank(t.name), rank(t.pluralName)) })).filter((x) => x.r < 9).sort((a, b) => a.r - b.r).slice(0, 3);
      for (const { t } of types) out.push({ kind: "type", label: t.pluralName, sublabel: "Tipo de inmueble", type: t.slug });
    }
    return out.slice(0, 16);
  }
}
