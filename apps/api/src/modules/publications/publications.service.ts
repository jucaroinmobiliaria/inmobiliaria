import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../common/audit.service.js";
import { env } from "../../common/config.js";
import { draftInclude, myRowInclude } from "../../common/include.js";
import { draftCompletion, draftPath, toDraft, toMyRow } from "../../common/mappers.js";
import { NotifyService } from "../../common/notify.service.js";
import { Prisma, PrismaService } from "../../common/prisma.service.js";
import { slugify } from "../../common/slug.js";
import type { AuthUser } from "../../common/decorators.js";
import type { DraftDTO, MyPublicationRow } from "../../contract.js";
import type { PublicationStatus } from "../../generated/prisma/client.js";
import { StorageService } from "../storage/storage.service.js";
import type { CreateDraftDto, DraftInputDto } from "./dto.js";
import { CatalogService } from "../catalog/catalog.service.js";

const DAY = 86_400_000;
const EDITABLE = new Set<PublicationStatus>(["DRAFT", "REJECTED", "PENDING_REVIEW", "PUBLISHED", "PAUSED"]);
const MAX_DRAFTS = 30;

const notFound = () => new NotFoundException("Publicación no encontrada");

@Injectable()
export class PublicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notify: NotifyService,
    private readonly audit: AuditService,
    private readonly catalog: CatalogService,
  ) {}

  /** Carga una publicación del usuario (404 uniforme si no existe o es ajena). */
  async owned(id: string, user: AuthUser, opts: { allowAdmin?: boolean } = {}) {
    const d = await this.prisma.publication.findUnique({ where: { id }, include: draftInclude() });
    if (!d) throw notFound();
    const mine = d.property.ownerId === user.id;
    if (!mine && !(opts.allowAdmin && user.role === "ADMIN")) throw notFound();
    return d;
  }

  async draftDto(id: string): Promise<DraftDTO> {
    const d = await this.prisma.publication.findUnique({ where: { id }, include: draftInclude() });
    if (!d) throw notFound();
    return toDraft(d);
  }

  /* ---------- Crear / listar / leer ---------- */
  async create(user: AuthUser, dto: CreateDraftDto): Promise<DraftDTO> {
    const errors: Record<string, string[]> = {};
    if (dto.typeId && !(await this.prisma.propertyType.findUnique({ where: { id: dto.typeId }, select: { id: true } }))) errors.typeId = ["El tipo de inmueble no existe"];
    if (dto.cityId && !(await this.prisma.city.findFirst({ where: { id: dto.cityId, active: true }, select: { id: true } }))) errors.cityId = ["La ciudad no existe"];
    if (Object.keys(errors).length) throw new BadRequestException({ message: "Revisa los datos enviados", errors });

    const drafts = await this.prisma.publication.count({ where: { property: { ownerId: user.id }, status: "DRAFT" } });
    if (drafts >= MAX_DRAFTS) throw new BadRequestException(`Tienes demasiados borradores (${MAX_DRAFTS}). Termina o elimina alguno para crear otro.`);

    const created = await this.prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: { ownerId: user.id, typeId: dto.typeId ?? null, location: { create: { cityId: dto.cityId ?? null } } },
        select: { id: true },
      });
      const pub = await tx.publication.create({ data: { propertyId: property.id, operation: dto.operation }, select: { id: true } });
      if (user.role === "USER") await tx.user.update({ where: { id: user.id }, data: { role: "OWNER" } });
      return pub;
    });
    if (user.role === "USER") await this.audit.log({ actorId: user.id, action: "user.promote_owner", entity: "User", entityId: user.id });
    return this.draftDto(created.id);
  }

  async listMine(user: AuthUser, statusCsv?: string): Promise<MyPublicationRow[]> {
    const valid: PublicationStatus[] = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "PAUSED", "REJECTED", "SOLD", "RENTED", "EXPIRED"];
    const statuses = (statusCsv ?? "").split(",").map((s) => s.trim().toUpperCase()).filter((s): s is PublicationStatus => (valid as string[]).includes(s));
    const rows = await this.prisma.publication.findMany({
      where: { property: { ownerId: user.id }, ...(statuses.length ? { status: { in: statuses } } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: myRowInclude(),
    });
    return rows.map(toMyRow);
  }

  async getMine(id: string, user: AuthUser): Promise<DraftDTO> {
    return toDraft(await this.owned(id, user));
  }

  /* ---------- Edición (auto-guardado) ---------- */
  async patch(id: string, user: AuthUser, dto: DraftInputDto): Promise<DraftDTO> {
    const d = await this.owned(id, user);
    if (!EDITABLE.has(d.status)) throw new ConflictException("Esta publicación ya no se puede editar");
    const errors: Record<string, string[]> = {};
    const loc = d.property.location;

    if (dto.typeId && !(await this.prisma.propertyType.findUnique({ where: { id: dto.typeId }, select: { id: true } }))) errors.typeId = ["El tipo de inmueble no existe"];
    const cityId = dto.cityId ?? loc?.cityId ?? null;
    if (dto.cityId && !(await this.prisma.city.findFirst({ where: { id: dto.cityId, active: true }, select: { id: true } }))) errors.cityId = ["La ciudad no existe"];
    let neighborhoodId: string | null | undefined = dto.neighborhoodId;
    if (neighborhoodId) {
      const n = await this.prisma.neighborhood.findUnique({ where: { id: neighborhoodId }, select: { cityId: true } });
      if (!n || (cityId && n.cityId !== cityId)) errors.neighborhoodId = ["El barrio no pertenece a la ciudad elegida"];
    } else if (neighborhoodId === undefined && dto.cityId && dto.cityId !== loc?.cityId) {
      neighborhoodId = null; // cambió de ciudad: el barrio anterior ya no aplica
    }
    let amenityIds: string[] | undefined;
    if (dto.amenityIds) {
      amenityIds = [...new Set(dto.amenityIds)];
      const found = await this.prisma.amenity.count({ where: { id: { in: amenityIds } } });
      if (found !== amenityIds.length) errors.amenityIds = ["Alguna comodidad no existe"];
    }
    let availableFrom: Date | null | undefined;
    if (dto.availableFrom !== undefined) {
      if (dto.availableFrom === null) availableFrom = null;
      else {
        const dt = new Date(dto.availableFrom);
        if (Number.isNaN(dt.getTime())) errors.availableFrom = ["La fecha no es válida"];
        else availableFrom = dt;
      }
    }
    if (Object.keys(errors).length) throw new BadRequestException({ message: "Revisa los datos enviados", errors });

    const prop = d.property;
    const propertyData: Prisma.PropertyUpdateInput = {
      ...(dto.typeId !== undefined ? { type: { connect: { id: dto.typeId } } } : {}),
      ...(dto.condition !== undefined ? { condition: dto.condition } : {}),
      ...(dto.area !== undefined ? { area: dto.area } : {}),
      ...(dto.landArea !== undefined ? { landArea: dto.landArea } : {}),
      ...(dto.bedrooms !== undefined ? { bedrooms: dto.bedrooms } : {}),
      ...(dto.bathrooms !== undefined ? { bathrooms: dto.bathrooms } : {}),
      ...(dto.parking !== undefined ? { parking: dto.parking } : {}),
      ...(dto.floor !== undefined ? { floor: dto.floor } : {}),
      ...(dto.totalFloors !== undefined ? { totalFloors: dto.totalFloors } : {}),
      ...(dto.stratum !== undefined ? { stratum: dto.stratum } : {}),
      ...(dto.ageYears !== undefined ? { ageYears: dto.ageYears } : {}),
      ...(dto.furnished !== undefined ? { furnished: dto.furnished } : {}),
      ...(dto.petFriendly !== undefined ? { petFriendly: dto.petFriendly } : {}),
      ...(dto.adminFee !== undefined ? { adminFee: dto.adminFee === null ? null : BigInt(dto.adminFee) } : {}),
    };
    const locationData = {
      ...(dto.cityId !== undefined ? { cityId: dto.cityId } : {}),
      ...(neighborhoodId !== undefined ? { neighborhoodId } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.hideAddress !== undefined ? { hideAddress: dto.hideAddress } : {}),
      ...(dto.lat !== undefined ? { lat: dto.lat } : {}),
      ...(dto.lng !== undefined ? { lng: dto.lng } : {}),
    };
    const pubData: Prisma.PublicationUpdateInput = {
      updatedAt: new Date(),
      ...(dto.operation !== undefined ? { operation: dto.operation } : {}),
      ...(dto.title !== undefined ? { title: dto.title || null, slug: dto.title ? slugify(dto.title) || null : null } : {}),
      ...(dto.description !== undefined ? { description: dto.description || null } : {}),
      ...(dto.price !== undefined ? { price: dto.price > 0 ? BigInt(dto.price) : null } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.negotiable !== undefined ? { negotiable: dto.negotiable } : {}),
      ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl } : {}),
      ...(dto.tourUrl !== undefined ? { tourUrl: dto.tourUrl } : {}),
      ...(availableFrom !== undefined ? { availableFrom } : {}),
      ...(dto.minContractMonths !== undefined ? { minContractMonths: dto.minContractMonths } : {}),
      ...(dto.showPhone !== undefined ? { showPhone: dto.showPhone } : {}),
      ...(dto.showWhatsapp !== undefined ? { showWhatsapp: dto.showWhatsapp } : {}),
    };

    const oldPrice = Number(d.price ?? 0);
    const priceChanged = dto.price !== undefined && dto.price > 0 && dto.price !== oldPrice;

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(propertyData).length) await tx.property.update({ where: { id: prop.id }, data: propertyData });
      if (Object.keys(locationData).length) {
        await tx.propertyLocation.upsert({ where: { propertyId: prop.id }, update: locationData, create: { propertyId: prop.id, ...locationData } });
      }
      await tx.publication.update({ where: { id }, data: pubData });
      if (amenityIds) {
        await tx.propertyFeature.deleteMany({ where: { propertyId: prop.id } });
        if (amenityIds.length) await tx.propertyFeature.createMany({ data: amenityIds.map((amenityId) => ({ propertyId: prop.id, amenityId })) });
      }
      if (priceChanged && d.status === "PUBLISHED") await tx.priceHistory.create({ data: { publicationId: id, price: BigInt(dto.price!) } });
    });

    if (priceChanged && d.status === "PUBLISHED" && oldPrice > 0 && dto.price! < oldPrice) void this.notifyPriceDrop(id, user.id).catch(() => undefined);
    return this.draftDto(id);
  }

  private async notifyPriceDrop(publicationId: string, ownerId: string): Promise<void> {
    const p = await this.prisma.publication.findUnique({ where: { id: publicationId }, include: draftInclude() });
    if (!p) return;
    const favs = await this.prisma.favorite.findMany({ where: { publicationId, userId: { not: ownerId } }, select: { userId: true }, take: 200 });
    const path = draftPath(p);
    if (!favs.length || !path) return;
    await this.prisma.notification.createMany({
      data: favs.map((f) => ({ userId: f.userId, type: "price_drop", title: "Bajó de precio un inmueble que guardaste", body: p.title ?? undefined, link: path })),
    });
  }

  /* ---------- Flujo de publicación ---------- */
  async submit(id: string, user: AuthUser): Promise<DraftDTO> {
    const d = await this.owned(id, user);
    if (d.status !== "DRAFT" && d.status !== "REJECTED") throw new ConflictException("Solo se pueden enviar a revisión los borradores y las publicaciones rechazadas");
    const c = draftCompletion(d);
    if (c.missing.length) throw new BadRequestException({ message: "Completa la información antes de enviar a revisión", errors: c.errors });

    // Solo un administrador publica sin cola. Las cuentas verificadas también esperan revisión.
    const auto = env.AUTO_APPROVE || user.role === "ADMIN";
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.publication.update({
        where: { id },
        data: auto
          ? { status: "PUBLISHED", publishedAt: d.publishedAt ?? now, expiresAt: new Date(now.getTime() + 90 * DAY), moderationNote: null }
          : { status: "PENDING_REVIEW", moderationNote: null },
      });
      if (auto && d.price) {
        const hasHistory = await tx.priceHistory.count({ where: { publicationId: id } });
        if (!hasHistory) await tx.priceHistory.create({ data: { publicationId: id, price: d.price } });
      }
    });
    await this.audit.log({ actorId: user.id, action: auto ? "publication.publish" : "publication.submit", entity: "Publication", entityId: id, meta: { code: d.code } });
    if (!auto) {
      const admins = await this.prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true }, take: 20 });
      await Promise.all(admins.map((a) => this.notify.notify({ userId: a.id, type: "moderation", title: "Publicación pendiente de revisión", body: d.title ?? undefined, link: "/admin/moderacion" })));
    }
    return this.draftDto(id);
  }

  async pause(id: string, user: AuthUser): Promise<DraftDTO> {
    const d = await this.owned(id, user, { allowAdmin: true });
    if (d.status !== "PUBLISHED") throw new ConflictException("Solo se puede pausar una publicación activa");
    await this.prisma.publication.update({ where: { id }, data: { status: "PAUSED" } });
    await this.audit.log({ actorId: user.id, action: "publication.pause", entity: "Publication", entityId: id, meta: { code: d.code, byAdmin: d.property.ownerId !== user.id } });
    return this.draftDto(id);
  }

  async resume(id: string, user: AuthUser): Promise<DraftDTO> {
    const d = await this.owned(id, user, { allowAdmin: true });
    if (d.status !== "PAUSED") throw new ConflictException("Solo se puede reanudar una publicación pausada");
    const now = new Date();
    const expiresAt = d.expiresAt && d.expiresAt > now ? d.expiresAt : new Date(now.getTime() + 90 * DAY);
    await this.prisma.publication.update({ where: { id }, data: { status: "PUBLISHED", expiresAt, publishedAt: d.publishedAt ?? now } });
    await this.audit.log({ actorId: user.id, action: "publication.resume", entity: "Publication", entityId: id, meta: { code: d.code, byAdmin: d.property.ownerId !== user.id } });
    return this.draftDto(id);
  }

  async markClosed(id: string, user: AuthUser): Promise<DraftDTO> {
    const d = await this.owned(id, user, { allowAdmin: true });
    if (d.status !== "PUBLISHED" && d.status !== "PAUSED") throw new ConflictException("Solo se puede cerrar una publicación activa o pausada");
    await this.prisma.publication.update({ where: { id }, data: { status: d.operation === "SALE" ? "SOLD" : "RENTED", featured: false, featuredUntil: null } });
    await this.audit.log({ actorId: user.id, action: "publication.close", entity: "Publication", entityId: id, meta: { code: d.code } });
    return this.draftDto(id);
  }

  async duplicate(id: string, user: AuthUser): Promise<DraftDTO> {
    const d = await this.owned(id, user);
    const drafts = await this.prisma.publication.count({ where: { property: { ownerId: user.id }, status: "DRAFT" } });
    if (drafts >= MAX_DRAFTS) throw new BadRequestException(`Tienes demasiados borradores (${MAX_DRAFTS}). Termina o elimina alguno para crear otro.`);
    const p = d.property;
    const loc = p.location;
    const copy = await this.prisma.$transaction(async (tx) => {
      const prop = await tx.property.create({
        data: {
          ownerId: p.ownerId, typeId: p.typeId, condition: p.condition, area: p.area, landArea: p.landArea, bedrooms: p.bedrooms, bathrooms: p.bathrooms, parking: p.parking,
          floor: p.floor, totalFloors: p.totalFloors, stratum: p.stratum, ageYears: p.ageYears, furnished: p.furnished, petFriendly: p.petFriendly, adminFee: p.adminFee,
          location: loc ? { create: { cityId: loc.cityId, neighborhoodId: loc.neighborhoodId, address: loc.address, hideAddress: loc.hideAddress, lat: loc.lat, lng: loc.lng } } : undefined,
          features: p.features.length ? { create: p.features.map((f) => ({ amenityId: f.amenityId })) } : undefined,
        },
        select: { id: true },
      });
      return tx.publication.create({
        data: {
          propertyId: prop.id, operation: d.operation, title: d.title ? `${d.title}`.slice(0, 120) : null, slug: d.slug, description: d.description, price: d.price, currency: d.currency,
          negotiable: d.negotiable, videoUrl: d.videoUrl, tourUrl: d.tourUrl, availableFrom: d.availableFrom, minContractMonths: d.minContractMonths, showPhone: d.showPhone, showWhatsapp: d.showWhatsapp,
        },
        select: { id: true },
      });
    });
    return this.draftDto(copy.id);
  }

  async renew(id: string, user: AuthUser): Promise<DraftDTO> {
    const d = await this.owned(id, user);
    if (!["PUBLISHED", "PAUSED", "EXPIRED"].includes(d.status)) throw new ConflictException("Solo se pueden renovar publicaciones activas, pausadas o vencidas");
    const now = new Date();
    const base = d.expiresAt && d.expiresAt > now ? d.expiresAt : now;
    await this.prisma.publication.update({
      where: { id },
      data: { expiresAt: new Date(base.getTime() + 60 * DAY), ...(d.status === "EXPIRED" ? { status: "PUBLISHED", publishedAt: d.publishedAt ?? now } : {}) },
    });
    await this.audit.log({ actorId: user.id, action: "publication.renew", entity: "Publication", entityId: id, meta: { code: d.code } });
    return this.draftDto(id);
  }

  async remove(id: string, user: AuthUser): Promise<{ ok: true }> {
    const d = await this.owned(id, user);
    if (d.status === "DRAFT" || d.status === "REJECTED") {
      const keys = d.property.images.flatMap((i) => [i.key, ...(i.pending && typeof i.pending === "object" && "key" in i.pending ? [String((i.pending as { key: unknown }).key)] : [])]);
      await this.prisma.property.delete({ where: { id: d.propertyId } });
      await Promise.all(keys.map((k) => this.storage.remove(k)));
      await this.audit.log({ actorId: user.id, action: "publication.delete", entity: "Publication", entityId: id, meta: { code: d.code } });
    } else if (d.status !== "EXPIRED") {
      await this.prisma.publication.update({ where: { id }, data: { status: "EXPIRED", featured: false, featuredUntil: null } });
      await this.audit.log({ actorId: user.id, action: "publication.expire", entity: "Publication", entityId: id, meta: { code: d.code } });
    }
    return { ok: true };
  }

  /** Pasa a EXPIRED las publicaciones vencidas y retira destacados caducados. Devuelve cuántas expiraron. */
  async expireOverdue(): Promise<number> {
    const now = new Date();
    const r = await this.prisma.publication.updateMany({ where: { status: "PUBLISHED", expiresAt: { lt: now } }, data: { status: "EXPIRED", featured: false, featuredUntil: null } });
    await this.prisma.publication.updateMany({ where: { featured: true, featuredUntil: { lt: now } }, data: { featured: false, featuredUntil: null } });
    return r.count;
  }
}
