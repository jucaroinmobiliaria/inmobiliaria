import { Injectable, NotFoundException } from "@nestjs/common";
import { num0 } from "../../common/bigint.js";
import { cardInclude, detailInclude, type CardRow } from "../../common/include.js";
import { toCard, toDetail } from "../../common/mappers.js";
import { Prisma, PrismaService } from "../../common/prisma.service.js";
import { buildPath, landingPath } from "../../common/seo.js";
import type { AuthUser } from "../../common/decorators.js";
import type { HomeData, LandingData, PublicationCard, PublicationDetail, SearchResult, SitemapEntry } from "../../contract.js";
import { CatalogService } from "../catalog/catalog.service.js";
import { env } from "../../common/config.js";
import { type SearchParams } from "./search.dto.js";
import { SearchEngine } from "./search-engine.service.js";
import { StatsService } from "../stats/stats.service.js";

const isCode = (s: string) => /^\d{1,9}$/.test(s);

@Injectable()
export class PublicationsReadService {
  private sitemapCache: { at: number; version: string; data: SitemapEntry[] } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: SearchEngine,
    private readonly catalog: CatalogService,
    private readonly stats: StatsService,
  ) {}

  async favoriteIds(userId: string | undefined, publicationIds: string[]): Promise<Set<string>> {
    if (!userId || publicationIds.length === 0) return new Set();
    const rows = await this.prisma.favorite.findMany({ where: { userId, publicationId: { in: publicationIds } }, select: { publicationId: true } });
    return new Set(rows.map((r) => r.publicationId));
  }

  async cards(rows: CardRow[], userId?: string): Promise<PublicationCard[]> {
    const fav = await this.favoriteIds(userId, rows.map((r) => r.id));
    const now = new Date();
    return rows.map((r) => toCard(r, fav, now));
  }

  /* ---------- Búsqueda ---------- */
  async search(params: SearchParams, user?: AuthUser): Promise<SearchResult> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 12;
    const prep = await this.engine.prepare(params);
    const where = prep.where();
    const whereNoType = prep.where(["type"]);
    const whereNoPrice = prep.where(["price"]);

    const [total, rows, typeGroups, priceAgg, cat] = await Promise.all([
      this.prisma.publication.count({ where }),
      this.prisma.publication.findMany({
        where,
        orderBy: this.engine.orderBy(params.sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: cardInclude(6),
      }),
      this.prisma.property.groupBy({ by: ["typeId"], where: { publications: { some: whereNoType } }, _count: { _all: true } }),
      this.prisma.publication.aggregate({ where: whereNoPrice, _min: { price: true }, _max: { price: true } }),
      this.catalog.get(),
    ]);

    const typeById = new Map(cat.types.map((t) => [t.id, t]));
    const facets = typeGroups
      .flatMap((g) => {
        const t = g.typeId ? typeById.get(g.typeId) : undefined;
        return t ? [{ slug: t.slug, name: t.name, count: g._count._all }] : [];
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));

    return {
      items: await this.cards(rows, user?.id),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      facets: { types: facets },
      priceRange: { min: num0(priceAgg._min.price), max: num0(priceAgg._max.price) },
    };
  }

  async map(params: SearchParams, user?: AuthUser): Promise<{ items: PublicationCard[] }> {
    const where = await this.engine.where(params, [], [{ property: { location: { lat: { not: null }, lng: { not: null } } } }]);
    const rows = await this.prisma.publication.findMany({ where, orderBy: this.engine.orderBy(params.sort), take: 150, include: cardInclude(6) });
    return { items: await this.cards(rows, user?.id) };
  }

  /* ---------- Detalle ---------- */
  async detail(idOrCode: string, user?: AuthUser): Promise<PublicationDetail> {
    const where: Prisma.PublicationWhereUniqueInput = isCode(idOrCode) ? { code: Number(idOrCode) } : { id: idOrCode };
    const p = await this.prisma.publication.findUnique({ where, include: detailInclude() });
    if (!p) throw new NotFoundException("Publicación no encontrada");
    const isOwner = !!user && (p.property.ownerId === user.id || user.role === "ADMIN");
    const live = p.status === "PUBLISHED" && (!p.expiresAt || p.expiresAt > new Date());
    if (!live && !isOwner) throw new NotFoundException("Publicación no encontrada");

    const [activeListings, similar, fav] = await Promise.all([
      this.prisma.publication.count({ where: { status: "PUBLISHED", property: { ownerId: p.property.ownerId } } }),
      this.similar(p, user?.id),
      this.favoriteIds(user?.id, [p.id]),
    ]);
    return toDetail(p, { favIds: fav, activeListings, similar });
  }

  private async similar(p: { id: string; operation: "SALE" | "RENT"; price: bigint | null; property: { typeId: string | null; location: { cityId: string | null; neighborhoodId: string | null } | null } }, userId?: string): Promise<PublicationCard[]> {
    const cityId = p.property.location?.cityId;
    const where: Prisma.PublicationWhereInput = {
      status: "PUBLISHED",
      id: { not: p.id },
      operation: p.operation,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      ...(cityId ? { property: { location: { cityId } } } : {}),
    };
    const cands = await this.prisma.publication.findMany({ where, orderBy: { publishedAt: "desc" }, take: 40, include: cardInclude(3) });
    const price = Number(p.price ?? 0);
    const scored = cands
      .map((c) => {
        let s = 0;
        if (c.property.typeId && c.property.typeId === p.property.typeId) s += 3;
        if (c.property.location?.neighborhoodId && c.property.location.neighborhoodId === p.property.location?.neighborhoodId) s += 2;
        if (price > 0 && c.price) {
          const ratio = Number(c.price) / price;
          if (ratio > 0.7 && ratio < 1.4) s += 2;
          else if (ratio > 0.5 && ratio < 2) s += 1;
        }
        return { c, s };
      })
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map((x) => x.c);
    return this.cards(scored, userId);
  }

  /* ---------- Home ---------- */
  async home(user?: AuthUser): Promise<HomeData> {
    const live: Prisma.PublicationWhereInput = { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
    const [published, advertisersRow, cat, cityCounts, typeCounts, featured, sale, rent] = await Promise.all([
      this.prisma.publication.count({ where: live }),
      this.prisma.$queryRaw<{ n: number }[]>(Prisma.sql`SELECT COUNT(DISTINCT pr."ownerId")::int AS n FROM "Publication" p JOIN "Property" pr ON pr.id = p."propertyId" WHERE p.status = 'PUBLISHED'`),
      this.catalog.get(),
      this.catalog.cityCounts(),
      this.catalog.typeCounts(),
      this.prisma.publication.findMany({
        where: { AND: [live, { featured: true }, { OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }] }] },
        orderBy: { publishedAt: "desc" }, take: 8, include: cardInclude(6),
      }),
      this.prisma.publication.findMany({ where: { ...live, operation: "SALE" }, orderBy: { publishedAt: "desc" }, take: 8, include: cardInclude(6) }),
      this.prisma.publication.findMany({ where: { ...live, operation: "RENT" }, orderBy: { publishedAt: "desc" }, take: 8, include: cardInclude(6) }),
    ]);
    const [fCards, sCards, rCards] = await Promise.all([this.cards(featured, user?.id), this.cards(sale, user?.id), this.cards(rent, user?.id)]);
    return {
      totals: { published, cities: cat.cities.filter((c) => (cityCounts.get(c.id) ?? 0) > 0).length, advertisers: advertisersRow[0]?.n ?? 0 },
      featured: fCards,
      latestSale: sCards,
      latestRent: rCards,
      cities: cat.cities.map((c) => ({ slug: c.slug, name: c.name, department: c.department, coverUrl: c.coverUrl, count: cityCounts.get(c.id) ?? 0 })),
      types: cat.types.map((t) => ({ slug: t.slug, name: t.name, pluralName: t.pluralName, icon: t.icon, count: typeCounts.get(t.id) ?? 0 })),
    };
  }

  /* ---------- Landing SEO ---------- */
  async landing(q: { operation: "SALE" | "RENT"; type?: string; city?: string; neighborhood?: string }): Promise<LandingData> {
    const cat = await this.catalog.get();
    const type = q.type ? cat.types.find((t) => t.slug === q.type) : undefined;
    if (q.type && !type) throw new NotFoundException("Tipo de inmueble no encontrado");
    const city = q.city ? cat.cities.find((c) => c.slug === q.city) : undefined;
    if (q.city && !city) throw new NotFoundException("Ciudad no encontrada");
    const hood = q.neighborhood && city ? city.neighborhoods.find((n) => n.slug === q.neighborhood) : undefined;
    if (q.neighborhood && !hood) throw new NotFoundException("Barrio no encontrado");

    const rows = await this.prisma.publication.findMany({
      where: {
        status: "PUBLISHED", operation: q.operation, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        ...(city ? { property: { location: { cityId: city.id } } } : {}),
      },
      select: { price: true, property: { select: { area: true, typeId: true, location: { select: { neighborhoodId: true, cityId: true } } } } },
    });
    const inScope = rows.filter((r) => (!type || r.property.typeId === type.id) && (!hood || r.property.location?.neighborhoodId === hood.id));
    const prices = inScope.map((r) => Number(r.price ?? 0)).filter((n) => n > 0);
    const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
    const m2 = inScope.filter((r) => r.price && r.property.area && r.property.area > 0).map((r) => Number(r.price) / (r.property.area as number));
    const avgM2 = m2.length ? Math.round(m2.reduce((a, b) => a + b, 0) / m2.length) : null;

    const opName = q.operation === "SALE" ? "en venta" : "en arriendo";
    const what = type ? type.pluralName : "Inmuebles";
    const where = hood && city ? `${hood.name}, ${city.name}` : city ? city.name : "Colombia";
    const title = `${what} ${opName} en ${where}`;
    const fmt = (n: number) => `$${new Intl.NumberFormat("es-CO").format(n)}`;
    const intro =
      inScope.length === 0
        ? `Aún no hay ${what.toLowerCase()} ${opName} en ${where}. Activa una alerta y te avisamos cuando se publique uno que encaje con lo que buscas.`
        : `Explora ${inScope.length} ${inScope.length === 1 ? what.toLowerCase().replace(/s$/, "") : what.toLowerCase()} ${opName} en ${where}${avg ? `, con un precio promedio de ${fmt(avg)}${q.operation === "RENT" ? " al mes" : ""}` : ""}${avgM2 ? ` (≈ ${fmt(avgM2)} por m²)` : ""}. Compara fotos, ubicación aproximada y características, y contacta directamente al anunciante sin intermediarios innecesarios.`;

    // Enlaces relacionados
    const related: LandingData["related"] = [];
    const countBy = <K>(keyFn: (r: (typeof rows)[number]) => K | null | undefined, filter: (r: (typeof rows)[number]) => boolean) => {
      const m = new Map<K, number>();
      for (const r of rows) {
        if (!filter(r)) continue;
        const k = keyFn(r);
        if (k !== null && k !== undefined) m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    };
    if (city) {
      const byHood = countBy((r) => r.property.location?.neighborhoodId, (r) => !type || r.property.typeId === type.id);
      for (const n of city.neighborhoods) {
        const c = byHood.get(n.id) ?? 0;
        if (c > 0 && n.id !== hood?.id) related.push({ label: `${what} ${opName} en ${n.name}`, path: landingPath(q.operation, type?.slug, city.slug, n.slug), count: c });
      }
      const byType = countBy((r) => r.property.typeId, (r) => !hood || r.property.location?.neighborhoodId === hood.id);
      for (const t of cat.types) {
        const c = byType.get(t.id) ?? 0;
        if (c > 0 && t.id !== type?.id) related.push({ label: `${t.pluralName} ${opName} en ${where}`, path: landingPath(q.operation, t.slug, city.slug, hood?.slug), count: c });
      }
    } else {
      const byCity = countBy((r) => r.property.location?.cityId, (r) => !type || r.property.typeId === type.id);
      for (const c of cat.cities) {
        const n = byCity.get(c.id) ?? 0;
        if (n > 0) related.push({ label: `${what} ${opName} en ${c.name}`, path: landingPath(q.operation, type?.slug, c.slug), count: n });
      }
    }
    const otherOp = q.operation === "SALE" ? "RENT" : "SALE";
    related.push({ label: `${what} ${otherOp === "SALE" ? "en venta" : "en arriendo"} en ${where}`, path: landingPath(otherOp, type?.slug, city?.slug, hood?.slug), count: 0 });

    return {
      title, intro,
      ...(city ? { city: { slug: city.slug, name: city.name } } : {}),
      ...(hood ? { neighborhood: { slug: hood.slug, name: hood.name } } : {}),
      ...(type ? { type: { slug: type.slug, name: type.name, pluralName: type.pluralName } } : {}),
      operation: q.operation,
      total: inScope.length,
      averagePrice: avg,
      averagePricePerM2: avgM2,
      related: related.slice(0, 16),
    };
  }

  /* ---------- Sitemap ---------- */
  async sitemap(): Promise<SitemapEntry[]> {
    // La caché se valida con una huella barata (cuántas hay publicadas y la última modificación): así un aviso aprobado,
    // pausado o cerrado se refleja de inmediato sin recalcular todo el sitemap en cada petición.
    const liveWhere: Prisma.PublicationWhereInput = { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
    const fp = await this.prisma.publication.aggregate({ where: liveWhere, _count: { _all: true }, _max: { updatedAt: true } });
    const version = `${fp._count._all}:${fp._max.updatedAt?.getTime() ?? 0}`;
    if (this.sitemapCache && this.sitemapCache.version === version && Date.now() - this.sitemapCache.at < 10 * 60_000) return this.sitemapCache.data;
    const rows = await this.prisma.publication.findMany({
      where: liveWhere,
      orderBy: { publishedAt: "desc" },
      take: 10_000,
      select: {
        code: true, slug: true, operation: true, updatedAt: true,
        property: { select: { type: { select: { slug: true } }, location: { select: { city: { select: { slug: true } }, neighborhood: { select: { slug: true } } } }, images: { where: { status: "READY" }, orderBy: [{ isCover: "desc" }, { position: "asc" }], take: 4, select: { url: true } } } },
      },
    });
    const abs = (u: string) => (u.startsWith("/") ? `${env.webUrl}${u}` : u);
    const data = rows.map((r): SitemapEntry => ({
      path: buildPath({ operation: r.operation, typeSlug: r.property.type?.slug ?? "inmueble", citySlug: r.property.location?.city?.slug ?? "colombia", neighborhoodSlug: r.property.location?.neighborhood?.slug ?? null, slug: r.slug, code: r.code }),
      lastmod: r.updatedAt.toISOString(),
      images: r.property.images.map((i) => abs(i.url)),
    }));
    this.sitemapCache = { at: Date.now(), version, data };
    return data;
  }

  /* ---------- Vistas ---------- */
  async registerView(id: string, ip: string, user?: AuthUser, userAgent?: string): Promise<void> {
    if (userAgent && /bot|crawl|spider|slurp|headless|preview/i.test(userAgent)) return;
    const where: Prisma.PublicationWhereUniqueInput = isCode(id) ? { code: Number(id) } : { id };
    const p = await this.prisma.publication.findUnique({ where, select: { id: true, status: true, property: { select: { ownerId: true } } } });
    if (!p || p.status !== "PUBLISHED") return;
    if (user && user.id === p.property.ownerId) return;
    if (!this.stats.firstViewToday(ip, p.id)) return;
    await this.prisma.publication.update({ where: { id: p.id }, data: { viewCount: { increment: 1 } } });
    await this.stats.bump(p.id, "views");
  }
}
