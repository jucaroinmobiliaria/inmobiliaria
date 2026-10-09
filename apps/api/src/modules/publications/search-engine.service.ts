import { Injectable } from "@nestjs/common";
import { fold } from "../../common/slug.js";
import { blurCoords, parseBbox } from "../../common/geo.js";
import { Prisma, PrismaService } from "../../common/prisma.service.js";
import { csvList, type SearchParams } from "./search.dto.js";

export type WhereOmit = "type" | "price";

const MAX_Q_IDS = 3000;

/** Construye filtros Prisma para todos los campos de SearchQuery (solo PUBLISHED vigentes). */
@Injectable()
export class SearchEngine {
  constructor(private readonly prisma: PrismaService) {}

  /** Ids de publicaciones cuyo texto (título, descripción, dirección si es visible, barrio, ciudad, tipo) contiene todas las palabras. Sin tildes ni mayúsculas. */
  private async textMatchIds(q: string): Promise<string[]> {
    const words = fold(q).split(/\s+/).filter(Boolean).slice(0, 6);
    if (!words.length) return [];
    const conds = words.map((w) => {
      const like = `%${w.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      return Prisma.sql`hay LIKE ${like}`;
    });
    const asCode = /^\d{1,9}$/.test(q.trim()) ? Number(q.trim()) : null;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM (
        SELECT p.id, p.code,
          translate(lower(concat_ws(' ', p.title, p.description, CASE WHEN l."hideAddress" THEN NULL ELSE l.address END, n.name, c.name, t.name)), 'áéíóúüñàèìòù', 'aeiouunaeiou') AS hay
        FROM "Publication" p
        JOIN "Property" pr ON pr.id = p."propertyId"
        LEFT JOIN "PropertyLocation" l ON l."propertyId" = pr.id
        LEFT JOIN "City" c ON c.id = l."cityId"
        LEFT JOIN "Neighborhood" n ON n.id = l."neighborhoodId"
        LEFT JOIN "PropertyType" t ON t.id = pr."typeId"
        WHERE p.status = 'PUBLISHED'
      ) s
      WHERE (${Prisma.join(conds, " AND ")})${asCode !== null ? Prisma.sql` OR code = ${asCode}` : Prisma.empty}
      LIMIT ${MAX_Q_IDS}`);
    return rows.map((r) => r.id);
  }

  /**
   * Ids de publicaciones cuyo punto MOSTRADO cae dentro del rectángulo. Con dirección oculta el punto mostrado está desplazado,
   * así que filtrar por la coordenada exacta permitiría deducirla a base de rectángulos cada vez más pequeños.
   */
  private async bboxIds(box: { west: number; south: number; east: number; north: number }): Promise<string[]> {
    const pad = 0.01; // ≈ 1,1 km: más que el desplazamiento máximo (200 m)
    const west = Math.min(box.west, box.east);
    const east = Math.max(box.west, box.east);
    const rows = await this.prisma.publication.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        property: { location: { lat: { gte: box.south - pad, lte: box.north + pad }, lng: { gte: west - pad, lte: east + pad } } },
      },
      select: { id: true, property: { select: { location: { select: { lat: true, lng: true, hideAddress: true } } } } },
      take: 5000,
    });
    const ids: string[] = [];
    for (const r of rows) {
      const loc = r.property.location;
      if (!loc || loc.lat === null || loc.lng === null) continue;
      const shown = loc.hideAddress ? blurCoords(loc.lat, loc.lng, r.id) : { lat: loc.lat, lng: loc.lng };
      if (shown.lat >= box.south && shown.lat <= box.north && shown.lng >= west && shown.lng <= east) ids.push(r.id);
    }
    return ids;
  }

  /** Calcula una sola vez los ids de texto (`q`) y de mapa (`bbox`) y permite derivar varios `where` (facetas, rango de precio). */
  async prepare(params: SearchParams): Promise<{ where: (omit?: WhereOmit[], extra?: Prisma.PublicationWhereInput[]) => Prisma.PublicationWhereInput }> {
    const q = params.q?.trim();
    const box = parseBbox(params.bbox);
    const [qIds, boxIds] = await Promise.all([q ? this.textMatchIds(q) : null, box ? this.bboxIds(box) : null]);
    return { where: (omit = [], extra = []) => this.build(params, omit, extra, qIds, boxIds) };
  }

  async where(params: SearchParams, omit: WhereOmit[] = [], extra: Prisma.PublicationWhereInput[] = []): Promise<Prisma.PublicationWhereInput> {
    return (await this.prepare(params)).where(omit, extra);
  }

  private build(params: SearchParams, omit: WhereOmit[], extra: Prisma.PublicationWhereInput[], qIds: string[] | null, boxIds: string[] | null): Prisma.PublicationWhereInput {
    const and: Prisma.PublicationWhereInput[] = [
      { status: "PUBLISHED" },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      ...extra,
    ];
    const prop: Prisma.PropertyWhereInput = {};
    const loc: Prisma.PropertyLocationWhereInput = {};

    if (params.operation) and.push({ operation: params.operation });

    const types = csvList(params.type);
    if (types.length && !omit.includes("type")) prop.type = { slug: { in: types } };
    const cities = csvList(params.city);
    if (cities.length) loc.city = { slug: { in: cities } };
    const hoods = csvList(params.neighborhood);
    if (hoods.length) loc.neighborhood = { slug: { in: hoods } };

    if (!omit.includes("price")) {
      const price: Prisma.BigIntNullableFilter = {};
      if (params.minPrice !== undefined) price.gte = BigInt(Math.floor(params.minPrice));
      if (params.maxPrice !== undefined && params.maxPrice > 0) price.lte = BigInt(Math.floor(params.maxPrice));
      if (price.gte !== undefined || price.lte !== undefined) and.push({ price });
    }

    if (params.bedrooms !== undefined && params.bedrooms > 0) prop.bedrooms = { gte: params.bedrooms };
    if (params.bathrooms !== undefined && params.bathrooms > 0) prop.bathrooms = { gte: params.bathrooms };
    if (params.parking !== undefined && params.parking > 0) prop.parking = { gte: params.parking };
    if (params.minArea !== undefined || params.maxArea !== undefined) {
      prop.area = {
        ...(params.minArea !== undefined ? { gte: params.minArea } : {}),
        ...(params.maxArea !== undefined && params.maxArea > 0 ? { lte: params.maxArea } : {}),
      };
    }
    const strata = csvList(params.stratum).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    if (strata.length) prop.stratum = { in: strata };
    if (params.condition) prop.condition = params.condition;
    if (params.furnished) prop.furnished = true;
    if (params.petFriendly) prop.petFriendly = true;

    const amenities = csvList(params.amenities);
    if (amenities.length) {
      prop.AND = amenities.map((slug) => ({ features: { some: { amenity: { slug } } } }));
    }

    if (params.featured) {
      and.push({ featured: true }, { OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }] });
    }
    if (params.withVideo) and.push({ videoUrl: { not: null } });
    if (params.withTour) and.push({ tourUrl: { not: null } });

    if (Object.keys(loc).length) prop.location = loc;
    if (Object.keys(prop).length) and.push({ property: prop });

    if (qIds) and.push({ id: { in: qIds } });
    if (boxIds) and.push({ id: { in: boxIds } });

    return { AND: and };
  }

  orderBy(sort: SearchParams["sort"]): Prisma.PublicationOrderByWithRelationInput[] {
    switch (sort) {
      case "newest":
        return [{ publishedAt: "desc" }, { id: "asc" }];
      case "price_asc":
        return [{ price: { sort: "asc", nulls: "last" } }, { id: "asc" }];
      case "price_desc":
        return [{ price: { sort: "desc", nulls: "last" } }, { id: "asc" }];
      case "area_desc":
        return [{ property: { area: { sort: "desc", nulls: "last" } } }, { id: "asc" }];
      default:
        return [{ featured: "desc" }, { publishedAt: "desc" }, { id: "asc" }];
    }
  }
}
