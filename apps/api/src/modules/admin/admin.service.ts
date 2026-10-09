import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../common/audit.service.js";
import { myRowInclude } from "../../common/include.js";
import { draftPath, toMyRow } from "../../common/mappers.js";
import { NotifyService } from "../../common/notify.service.js";
import { Prisma, PrismaService } from "../../common/prisma.service.js";
import { slugify } from "../../common/slug.js";
import type { AuthUser } from "../../common/decorators.js";
import type {
  AdminOverview, AdminPublicationRow, AdminReportRow, AdminUserRow, AuditRow, Catalog, Paginated, PublicationStatus,
} from "../../contract.js";
import { CatalogService } from "../catalog/catalog.service.js";
import type { AdminAuditQuery, AdminPublicationsQuery, AdminUserPatchDto, AdminUsersQuery, CatalogKind, FeatureDto, RejectDto } from "./admin.dto.js";
import { catalogSchemas } from "./admin.dto.js";

const DAY = 86_400_000;
const STATUSES: PublicationStatus[] = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "PAUSED", "REJECTED", "SOLD", "RENTED", "EXPIRED"];
const adminRowInclude = () => ({ ...myRowInclude(), property: { include: { ...myRowInclude().property.include, owner: { select: { id: true, name: true, email: true, verified: true } } } }, _count: { select: { favorites: true, inquiries: true, reports: { where: { status: "OPEN" as const } } } } }) satisfies Prisma.PublicationInclude;
type AdminRow = Prisma.PublicationGetPayload<{ include: ReturnType<typeof adminRowInclude> }>;

const paginate = <T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> => ({ items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notify: NotifyService,
    private readonly catalog: CatalogService,
  ) {}

  /* ---------- Resumen ---------- */
  async overview(): Promise<AdminOverview> {
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const from = new Date(today - 29 * DAY);
    const [users, publications, published, pendingReview, openReports, usersRecent, pubsRecent, inqRecent, byCity] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.publication.count(),
      this.prisma.publication.count({ where: { status: "PUBLISHED" } }),
      this.prisma.publication.count({ where: { status: "PENDING_REVIEW" } }),
      this.prisma.report.count({ where: { status: "OPEN" } }),
      this.prisma.user.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }),
      this.prisma.publication.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }),
      this.prisma.inquiry.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }),
      this.prisma.$queryRaw<{ name: string; n: number }[]>(Prisma.sql`
        SELECT c.name, COUNT(*)::int AS n FROM "Publication" p
        JOIN "PropertyLocation" l ON l."propertyId" = p."propertyId" JOIN "City" c ON c.id = l."cityId"
        WHERE p.status = 'PUBLISHED' GROUP BY c.name ORDER BY n DESC, c.name ASC`),
    ]);
    const bucket = (rows: { createdAt: Date }[]) => {
      const m = new Map<string, number>();
      for (const r of rows) {
        const k = r.createdAt.toISOString().slice(0, 10);
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    };
    const u = bucket(usersRecent), p = bucket(pubsRecent), i = bucket(inqRecent);
    const series: AdminOverview["series"] = [];
    for (let t = from.getTime(); t <= today; t += DAY) {
      const k = new Date(t).toISOString().slice(0, 10);
      series.push({ date: k, users: u.get(k) ?? 0, publications: p.get(k) ?? 0, inquiries: i.get(k) ?? 0 });
    }
    return { users, publications, published, pendingReview, openReports, inquiries30d: inqRecent.length, newUsers30d: usersRecent.length, series, byCity: byCity.map((c) => ({ name: c.name, count: c.n })) };
  }

  /* ---------- Publicaciones ---------- */
  private adminRow(r: AdminRow): AdminPublicationRow {
    return { ...toMyRow(r), owner: { id: r.property.owner.id, name: r.property.owner.name, email: r.property.owner.email, verified: r.property.owner.verified }, reportCount: r._count.reports };
  }

  async publications(q: AdminPublicationsQuery): Promise<Paginated<AdminPublicationRow>> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const statuses = (q.status ?? "").split(",").map((s) => s.trim().toUpperCase()).filter((s): s is PublicationStatus => (STATUSES as string[]).includes(s));
    const and: Prisma.PublicationWhereInput[] = [];
    if (statuses.length) and.push({ status: { in: statuses } });
    const text = q.q?.trim();
    if (text) {
      const code = /^\d{1,9}$/.test(text) ? Number(text) : null;
      and.push({
        OR: [
          { title: { contains: text, mode: "insensitive" } },
          { property: { owner: { OR: [{ name: { contains: text, mode: "insensitive" } }, { email: { contains: text, mode: "insensitive" } }] } } },
          ...(code !== null ? [{ code }] : []),
        ],
      });
    }
    const where: Prisma.PublicationWhereInput = and.length ? { AND: and } : {};
    const [total, rows] = await Promise.all([
      this.prisma.publication.count({ where }),
      this.prisma.publication.findMany({
        where, orderBy: statuses.length === 1 && statuses[0] === "PENDING_REVIEW" ? { updatedAt: "asc" } : { updatedAt: "desc" },
        skip: (page - 1) * pageSize, take: pageSize, include: adminRowInclude(),
      }),
    ]);
    return paginate(rows.map((r) => this.adminRow(r)), total, page, pageSize);
  }

  private async loadPub(id: string) {
    const p = await this.prisma.publication.findUnique({ where: { id }, include: adminRowInclude() });
    if (!p) throw new NotFoundException("Publicación no encontrada");
    return p;
  }

  async approve(id: string, admin: AuthUser): Promise<AdminPublicationRow> {
    const p = await this.loadPub(id);
    if (p.status !== "PENDING_REVIEW" && p.status !== "REJECTED") throw new ConflictException("Solo se pueden aprobar publicaciones pendientes de revisión o rechazadas");
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.publication.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: p.publishedAt ?? now, expiresAt: new Date(now.getTime() + 90 * DAY), moderationNote: null } });
      if (p.price && !(await tx.priceHistory.count({ where: { publicationId: id } }))) await tx.priceHistory.create({ data: { publicationId: id, price: p.price } });
    });
    await this.audit.log({ actorId: admin.id, action: "publication.approve", entity: "Publication", entityId: id, meta: { code: p.code, owner: p.property.owner.id } });
    const fresh = await this.loadPub(id);
    await this.notify.notify({
      userId: p.property.owner.id, type: "publication", title: "Tu publicación fue aprobada", body: `“${p.title ?? "Tu publicación"}” ya está visible para todos.`,
      link: draftPath(fresh) ?? "/panel/publicaciones", email: { to: p.property.owner.email, subject: "Tu publicación fue aprobada", cta: "Ver mi publicación" },
    });
    return this.adminRow(fresh);
  }

  async reject(id: string, admin: AuthUser, dto: RejectDto): Promise<AdminPublicationRow> {
    const p = await this.loadPub(id);
    if (!["PENDING_REVIEW", "PUBLISHED", "PAUSED"].includes(p.status)) throw new ConflictException("Esta publicación no se puede rechazar en su estado actual");
    await this.prisma.publication.update({ where: { id }, data: { status: "REJECTED", moderationNote: dto.reason, featured: false, featuredUntil: null } });
    await this.audit.log({ actorId: admin.id, action: "publication.reject", entity: "Publication", entityId: id, meta: { code: p.code, reason: dto.reason, owner: p.property.owner.id } });
    await this.notify.notify({
      userId: p.property.owner.id, type: "moderation", title: "Tu publicación fue rechazada", body: dto.reason, link: `/publicar/${id}`,
      email: { to: p.property.owner.email, subject: "Tu publicación necesita cambios", cta: "Corregir publicación" },
    });
    return this.adminRow(await this.loadPub(id));
  }

  async feature(id: string, admin: AuthUser, dto: FeatureDto): Promise<AdminPublicationRow> {
    const p = await this.loadPub(id);
    const featuredUntil = dto.featured && dto.days ? new Date(Date.now() + dto.days * DAY) : null;
    await this.prisma.publication.update({ where: { id }, data: { featured: dto.featured, featuredUntil: dto.featured ? featuredUntil : null } });
    await this.audit.log({ actorId: admin.id, action: dto.featured ? "publication.feature" : "publication.unfeature", entity: "Publication", entityId: id, meta: { code: p.code, days: dto.days ?? null } });
    return this.adminRow(await this.loadPub(id));
  }

  /* ---------- Usuarios ---------- */
  async users(q: AdminUsersQuery): Promise<Paginated<AdminUserRow>> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const text = q.q?.trim();
    const where: Prisma.UserWhereInput = {
      ...(q.role ? { role: q.role } : {}),
      ...(text ? { OR: [{ name: { contains: text, mode: "insensitive" } }, { email: { contains: text, mode: "insensitive" } }] } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { _count: { select: { properties: true } } } }),
    ]);
    return paginate(rows.map((u) => this.userRow(u)), total, page, pageSize);
  }

  private userRow(u: { id: string; name: string; email: string; phone: string | null; role: AdminUserRow["role"]; status: "ACTIVE" | "BLOCKED"; verified: boolean; createdAt: Date; lastLoginAt: Date | null; _count: { properties: number } }): AdminUserRow {
    return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, status: u.status, verified: u.verified, createdAt: u.createdAt.toISOString(), lastLoginAt: u.lastLoginAt?.toISOString() ?? null, listings: u._count.properties };
  }

  async patchUser(id: string, admin: AuthUser, dto: AdminUserPatchDto): Promise<AdminUserRow> {
    const u = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });
    if (!u) throw new NotFoundException("Usuario no encontrado");
    if (id === admin.id && ((dto.role && dto.role !== "ADMIN") || dto.status === "BLOCKED")) throw new ForbiddenException("No puedes degradarte ni bloquearte a ti mismo");
    const data: Prisma.UserUpdateInput = { ...(dto.role ? { role: dto.role } : {}), ...(dto.status ? { status: dto.status } : {}), ...(dto.verified !== undefined ? { verified: dto.verified } : {}) };
    if (!Object.keys(data).length) throw new BadRequestException("No hay cambios que aplicar");
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      if (dto.role === "AGENT") await tx.agent.upsert({ where: { userId: id }, update: {}, create: { userId: id } });
      if (dto.status === "BLOCKED") await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    await this.audit.log({ actorId: admin.id, action: "user.update", entity: "User", entityId: id, meta: { ...dto, previousRole: u.role, previousStatus: u.status } });
    const fresh = await this.prisma.user.findUniqueOrThrow({ where: { id }, include: { _count: { select: { properties: true } } } });
    return this.userRow(fresh);
  }

  async deleteUser(id: string, admin: AuthUser): Promise<{ ok: true }> {
    if (id === admin.id) throw new ForbiddenException("No puedes eliminar tu propia cuenta");
    const u = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, email: true, name: true } });
    if (!u) throw new NotFoundException("Usuario no encontrado");
    if (u.role === "ADMIN") {
      const others = await this.prisma.user.count({ where: { role: "ADMIN", id: { not: id } } });
      if (others === 0) throw new ConflictException("No puedes eliminar al último administrador");
    }
    await this.prisma.user.delete({ where: { id } });
    await this.audit.log({ actorId: admin.id, action: "user.delete", entity: "User", entityId: id, meta: { email: u.email, name: u.name, role: u.role } });
    return { ok: true };
  }

  /* ---------- Reportes ---------- */
  private reportRow(r: Prisma.ReportGetPayload<{ include: { reporter: { select: { id: true; name: true } }; publication: { include: { property: { include: { type: true; location: { include: { city: true; neighborhood: true } } } } } } } }>): AdminReportRow {
    const pub = r.publication;
    const path = pub.status === "PUBLISHED" && pub.property.type && pub.property.location?.city
      ? `/${pub.operation === "SALE" ? "venta" : "arriendo"}/${pub.property.type.slug}/${pub.property.location.city.slug}${pub.property.location.neighborhood ? `/${pub.property.location.neighborhood.slug}` : ""}/${pub.slug ?? "inmueble"}-${pub.code}`
      : null;
    return {
      id: r.id, reason: r.reason, details: r.details, status: r.status, createdAt: r.createdAt.toISOString(),
      reporter: r.reporter ? { id: r.reporter.id, name: r.reporter.name } : null,
      publication: { id: pub.id, code: pub.code, title: pub.title ?? "", path, status: pub.status },
    };
  }
  private reportInclude = { reporter: { select: { id: true, name: true } }, publication: { include: { property: { include: { type: true, location: { include: { city: true, neighborhood: true } } } } } } } as const;

  async reports(status?: "OPEN" | "RESOLVED" | "DISMISSED"): Promise<AdminReportRow[]> {
    const rows = await this.prisma.report.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 200, include: this.reportInclude });
    return rows.map((r) => this.reportRow(r));
  }

  async patchReport(id: string, admin: AuthUser, status: "OPEN" | "RESOLVED" | "DISMISSED"): Promise<AdminReportRow> {
    const r = await this.prisma.report.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!r) throw new NotFoundException("Reporte no encontrado");
    const u = await this.prisma.report.update({ where: { id }, data: { status }, include: this.reportInclude });
    await this.audit.log({ actorId: admin.id, action: "report.update", entity: "Report", entityId: id, meta: { from: r.status, status } });
    return this.reportRow(u);
  }

  /* ---------- Auditoría ---------- */
  async auditLog(q: AdminAuditQuery): Promise<Paginated<AuditRow>> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 30;
    const where: Prisma.AuditLogWhereInput = { ...(q.action ? { action: { startsWith: q.action } } : {}), ...(q.entity ? { entity: q.entity } : {}) };
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { actor: { select: { name: true, email: true } } } }),
    ]);
    return paginate(rows.map((a): AuditRow => ({ id: a.id, action: a.action, entity: a.entity, entityId: a.entityId, actor: a.actor ? `${a.actor.name} <${a.actor.email}>` : null, createdAt: a.createdAt.toISOString(), meta: a.meta })), total, page, pageSize);
  }

  /* ---------- Catálogos ---------- */
  private async uniqueSlug(kind: CatalogKind, base: string, cityId?: string): Promise<string> {
    const root = base || kind;
    for (let n = 0; n < 50; n++) {
      const slug = n === 0 ? root : `${root}-${n + 1}`;
      const taken =
        kind === "types" ? await this.prisma.propertyType.findUnique({ where: { slug }, select: { id: true } })
        : kind === "amenities" ? await this.prisma.amenity.findUnique({ where: { slug }, select: { id: true } })
        : kind === "cities" ? await this.prisma.city.findUnique({ where: { slug }, select: { id: true } })
        : await this.prisma.neighborhood.findUnique({ where: { cityId_slug: { cityId: cityId!, slug } }, select: { id: true } });
      if (!taken) return slug;
    }
    throw new ConflictException("No se pudo generar un identificador único");
  }

  async catalogCreate(kind: CatalogKind, body: Record<string, unknown>, admin: AuthUser): Promise<unknown> {
    const d = catalogSchemas[kind].parse(body) as Record<string, unknown>;
    let created: { id: string };
    if (kind === "types") {
      const t = d as { name: string; pluralName: string; icon?: string; group?: string; sortOrder?: number };
      const max = await this.prisma.propertyType.aggregate({ _max: { sortOrder: true } });
      created = await this.prisma.propertyType.create({ data: { name: t.name, pluralName: t.pluralName, icon: t.icon ?? "home", group: t.group ?? "residential", slug: await this.uniqueSlug(kind, slugify(t.name)), sortOrder: t.sortOrder ?? (max._max.sortOrder ?? 0) + 1 } });
    } else if (kind === "amenities") {
      const a = d as { name: string; icon?: string; category: "INTERIOR" | "BUILDING" | "EXTERIOR" | "SURROUNDINGS"; sortOrder?: number };
      const max = await this.prisma.amenity.aggregate({ _max: { sortOrder: true } });
      created = await this.prisma.amenity.create({ data: { name: a.name, icon: a.icon ?? "check", category: a.category, slug: await this.uniqueSlug(kind, slugify(a.name)), sortOrder: a.sortOrder ?? (max._max.sortOrder ?? 0) + 1 } });
    } else if (kind === "cities") {
      const c = d as { name: string; department: string; lat: number; lng: number; coverUrl?: string | null; active?: boolean };
      created = await this.prisma.city.create({ data: { name: c.name, department: c.department, lat: c.lat, lng: c.lng, coverUrl: c.coverUrl ?? null, active: c.active ?? true, slug: await this.uniqueSlug(kind, slugify(c.name)) } });
    } else {
      const n = d as { cityId: string; name: string; lat: number; lng: number };
      if (!(await this.prisma.city.findUnique({ where: { id: n.cityId }, select: { id: true } }))) throw new BadRequestException({ message: "La ciudad no existe", errors: { cityId: ["La ciudad no existe"] } });
      created = await this.prisma.neighborhood.create({ data: { cityId: n.cityId, name: n.name, lat: n.lat, lng: n.lng, slug: await this.uniqueSlug(kind, slugify(n.name), n.cityId) } });
    }
    this.catalog.invalidate();
    await this.audit.log({ actorId: admin.id, action: "catalog.create", entity: kind, entityId: created.id, meta: d as Prisma.InputJsonValue });
    return created;
  }

  async catalogUpdate(kind: CatalogKind, id: string, body: Record<string, unknown>, admin: AuthUser): Promise<unknown> {
    const schema = kind === "neighborhoods" ? catalogSchemas.neighborhoods.partial().omit({ cityId: true }) : catalogSchemas[kind].partial();
    const d = schema.parse(body) as Record<string, unknown>;
    if (!Object.keys(d).length) throw new BadRequestException("No hay cambios que aplicar");
    try {
      const updated =
        kind === "types" ? await this.prisma.propertyType.update({ where: { id }, data: d })
        : kind === "amenities" ? await this.prisma.amenity.update({ where: { id }, data: d })
        : kind === "cities" ? await this.prisma.city.update({ where: { id }, data: d })
        : await this.prisma.neighborhood.update({ where: { id }, data: d });
      this.catalog.invalidate();
      await this.audit.log({ actorId: admin.id, action: "catalog.update", entity: kind, entityId: id, meta: d as Prisma.InputJsonValue });
      return updated;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new NotFoundException("Elemento no encontrado");
      throw e;
    }
  }

  async catalogDelete(kind: CatalogKind, id: string, admin: AuthUser): Promise<{ ok: true }> {
    const inUse =
      kind === "types" ? await this.prisma.property.count({ where: { typeId: id } })
      : kind === "amenities" ? await this.prisma.propertyFeature.count({ where: { amenityId: id } })
      : kind === "cities" ? (await this.prisma.propertyLocation.count({ where: { cityId: id } })) + (await this.prisma.neighborhood.count({ where: { cityId: id } }))
      : await this.prisma.propertyLocation.count({ where: { neighborhoodId: id } });
    if (inUse > 0) throw new ConflictException("No se puede eliminar: está en uso por publicaciones u otros elementos del catálogo");
    try {
      if (kind === "types") await this.prisma.propertyType.delete({ where: { id } });
      else if (kind === "amenities") await this.prisma.amenity.delete({ where: { id } });
      else if (kind === "cities") await this.prisma.city.delete({ where: { id } });
      else await this.prisma.neighborhood.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new NotFoundException("Elemento no encontrado");
      throw e;
    }
    this.catalog.invalidate();
    await this.audit.log({ actorId: admin.id, action: "catalog.delete", entity: kind, entityId: id });
    return { ok: true };
  }

  async catalogSnapshot(): Promise<Catalog> {
    return this.catalog.get();
  }
}
