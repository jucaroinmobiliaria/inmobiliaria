import { randomBytes } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { toImageDTO } from "../../common/mappers.js";
import { Prisma, PrismaService } from "../../common/prisma.service.js";
import type { AuthUser } from "../../common/decorators.js";
import type { ImageDTO, PresignedUpload } from "../../contract.js";
import { ALLOWED_MIME, type AllowedMime, MAX_IMAGE_BYTES, MIME_EXT, sniffMime, StorageService } from "../storage/storage.service.js";
import type { ConfirmDto, PatchImageDto, PresignDto, ReorderDto, ReplaceDto } from "./dto.js";

export const MAX_IMAGES = 40;
const MIN_PHOTOS_ACTIVE = 3;

interface PendingReplace {
  key: string;
  mime: AllowedMime;
  size: number;
  checksum: string;
  width: number | null;
  height: number | null;
}

/** Id tipo cuid (c + tiempo + aleatorio), seguro para claves de archivo. */
const newId = () => `c${Date.now().toString(36)}${randomBytes(9).toString("hex")}`;
const isPending = (v: unknown): v is PendingReplace => !!v && typeof v === "object" && typeof (v as PendingReplace).key === "string";

@Injectable()
export class ImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Publicación del usuario (404 uniforme si es ajena o no existe). */
  private async ownedPub(id: string, user: AuthUser) {
    const p = await this.prisma.publication.findFirst({ where: { id, property: { ownerId: user.id } }, select: { id: true, status: true, propertyId: true } });
    if (!p) throw new NotFoundException("Publicación no encontrada");
    return p;
  }

  async list(propertyId: string): Promise<ImageDTO[]> {
    const rows = await this.prisma.propertyImage.findMany({ where: { propertyId }, orderBy: [{ isCover: "desc" }, { position: "asc" }, { createdAt: "asc" }] });
    return rows.map(toImageDTO);
  }

  private async cleanStale(propertyId: string): Promise<void> {
    const stale = await this.prisma.propertyImage.findMany({ where: { propertyId, status: "PENDING", createdAt: { lt: new Date(Date.now() - 24 * 3600_000) } }, select: { id: true, key: true } });
    if (!stale.length) return;
    await this.prisma.propertyImage.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
    await Promise.all(stale.map((s) => this.storage.remove(s.key)));
  }

  /* ---------- presign ---------- */
  async presign(pubId: string, user: AuthUser, dto: PresignDto): Promise<PresignedUpload[]> {
    const pub = await this.ownedPub(pubId, user);
    await this.cleanStale(pub.propertyId);
    const existing = await this.prisma.propertyImage.findMany({ where: { propertyId: pub.propertyId }, select: { id: true, key: true, url: true, checksum: true, status: true } });

    type Plan = { kind: "dup"; of: { id: string; key: string; url: string } } | { kind: "reuse"; img: { id: string; key: string } } | { kind: "new" };
    const plans: Plan[] = [];
    const seen = new Map<string, { id: string; key: string; url: string }>(); // checksums ya vistos en esta solicitud
    let fresh = 0;
    for (const f of dto.files) {
      const ready = existing.find((e) => e.checksum === f.checksum && e.status === "READY");
      if (ready) { plans.push({ kind: "dup", of: ready }); continue; }
      const prior = seen.get(f.checksum);
      if (prior) { plans.push({ kind: "dup", of: prior }); continue; }
      const pending = existing.find((e) => e.checksum === f.checksum && e.status === "PENDING");
      if (pending) { plans.push({ kind: "reuse", img: pending }); seen.set(f.checksum, pending); continue; }
      plans.push({ kind: "new" });
      fresh++;
      seen.set(f.checksum, { id: "", key: "", url: "" }); // se completa al crear
    }
    if (existing.length + fresh > MAX_IMAGES) {
      throw new BadRequestException({ message: `Cada publicación admite hasta ${MAX_IMAGES} fotos (ya tienes ${existing.length}).`, errors: { files: [`Máximo ${MAX_IMAGES} fotos por publicación`] } });
    }

    const out: PresignedUpload[] = [];
    const createdByChecksum = new Map<string, { id: string; key: string; url: string }>();
    for (const [i, f] of dto.files.entries()) {
      const plan = plans[i]!;
      const mime = f.mime as AllowedMime;
      if (plan.kind === "dup") {
        const of = plan.of.id ? plan.of : (createdByChecksum.get(f.checksum) ?? plan.of);
        out.push({ imageId: of.id, duplicate: true, uploadUrl: null, method: "PUT", headers: {}, key: of.key, publicUrl: of.url });
        continue;
      }
      if (plan.kind === "reuse") {
        const key = plan.img.key;
        const p = await this.storage.presignPut(key, mime, f.size);
        out.push({ imageId: plan.img.id, duplicate: false, uploadUrl: p.uploadUrl, method: "PUT", headers: p.headers, key, publicUrl: this.storage.publicUrl(key) });
        continue;
      }
      const id = newId();
      const key = `properties/${pub.propertyId}/${id}.${MIME_EXT[mime]}`;
      const url = this.storage.publicUrl(key);
      await this.prisma.propertyImage.create({
        data: { id, propertyId: pub.propertyId, key, url, width: f.width ?? null, height: f.height ?? null, sizeBytes: f.size, mime, checksum: f.checksum, status: "PENDING", position: 0 },
      });
      createdByChecksum.set(f.checksum, { id, key, url });
      const p = await this.storage.presignPut(key, mime, f.size);
      out.push({ imageId: id, duplicate: false, uploadUrl: p.uploadUrl, method: "PUT", headers: p.headers, key, publicUrl: url });
    }
    return out;
  }

  /* ---------- confirm ---------- */
  private async verifyObject(key: string, mime: string | null): Promise<{ size: number } | null> {
    const h = await this.storage.head(key);
    if (!h || h.size <= 0 || h.size > MAX_IMAGE_BYTES) return null;
    if (this.storage.driver === "local") {
      const head = await this.storage.readHead(key);
      if (!head || sniffMime(head) === null || (mime && sniffMime(head) !== mime)) return null;
    } else {
      const ct = h.contentType?.split(";")[0]?.trim();
      if (ct && !ALLOWED_MIME.includes(ct as AllowedMime)) return null;
      await this.storage.sanitizeRemote(key, mime ?? ct ?? "");
      const after = await this.storage.head(key);
      return { size: after?.size ?? h.size };
    }
    return { size: h.size };
  }

  async confirm(pubId: string, user: AuthUser, dto: ConfirmDto): Promise<ImageDTO[]> {
    const pub = await this.ownedPub(pubId, user);
    const imgs = await this.prisma.propertyImage.findMany({ where: { propertyId: pub.propertyId } });
    const byId = new Map(imgs.map((i) => [i.id, i]));
    let nextPos = Math.max(-1, ...imgs.filter((i) => i.status === "READY").map((i) => i.position)) + 1;
    let ok = 0;
    for (const item of dto.images) {
      const img = byId.get(item.imageId);
      if (!img) continue;
      if (isPending(img.pending)) {
        const p = img.pending;
        const v = await this.verifyObject(p.key, p.mime);
        if (!v) continue;
        const oldKey = img.key;
        await this.prisma.propertyImage.update({
          where: { id: img.id },
          data: { key: p.key, url: this.storage.publicUrl(p.key), mime: p.mime, sizeBytes: v.size, checksum: p.checksum, width: item.width ?? p.width ?? img.width, height: item.height ?? p.height ?? img.height, pending: Prisma.JsonNull, status: "READY" },
        });
        if (oldKey !== p.key) await this.storage.remove(oldKey);
        ok++;
      } else if (img.status === "PENDING") {
        const v = await this.verifyObject(img.key, img.mime);
        if (!v) continue;
        await this.prisma.propertyImage.update({ where: { id: img.id }, data: { status: "READY", sizeBytes: v.size, position: nextPos++, width: item.width ?? img.width, height: item.height ?? img.height } });
        ok++;
      } else {
        ok++; // ya estaba lista (confirmación repetida)
      }
    }
    if (ok === 0) throw new BadRequestException("No encontramos el archivo subido. Intenta subir la foto de nuevo.");
    await this.ensureCover(pub.propertyId);
    return this.list(pub.propertyId);
  }

  /** Garantiza exactamente una portada entre las imágenes READY. */
  private async ensureCover(propertyId: string): Promise<void> {
    const ready = await this.prisma.propertyImage.findMany({ where: { propertyId, status: "READY" }, orderBy: [{ isCover: "desc" }, { position: "asc" }, { createdAt: "asc" }], select: { id: true, isCover: true } });
    if (!ready.length) return;
    const covers = ready.filter((r) => r.isCover);
    if (covers.length === 1) return;
    const keep = ready[0]!.id;
    await this.prisma.$transaction([
      this.prisma.propertyImage.updateMany({ where: { propertyId, id: { not: keep } }, data: { isCover: false } }),
      this.prisma.propertyImage.update({ where: { id: keep }, data: { isCover: true } }),
    ]);
  }

  /** Reasigna posiciones 0..n respetando el orden dado; la portada va primero. */
  private async renumber(propertyId: string, orderedIds: string[], coverId: string | null): Promise<void> {
    const ids = coverId ? [coverId, ...orderedIds.filter((x) => x !== coverId)] : orderedIds;
    await this.prisma.$transaction(ids.map((id, idx) => this.prisma.propertyImage.update({ where: { id }, data: { position: idx, isCover: coverId ? id === coverId : undefined } })));
  }

  /* ---------- reorder / patch ---------- */
  async reorder(pubId: string, user: AuthUser, dto: ReorderDto): Promise<ImageDTO[]> {
    const pub = await this.ownedPub(pubId, user);
    const imgs = await this.prisma.propertyImage.findMany({ where: { propertyId: pub.propertyId }, orderBy: [{ isCover: "desc" }, { position: "asc" }, { createdAt: "asc" }] });
    const valid = new Set(imgs.map((i) => i.id));
    const requested = dto.order.filter((id) => valid.has(id));
    if (requested.length !== new Set(dto.order).size) throw new BadRequestException({ message: "El orden incluye fotos que no pertenecen a esta publicación", errors: { order: ["Fotos no válidas"] } });
    const rest = imgs.map((i) => i.id).filter((id) => !requested.includes(id));
    const ordered = [...new Set([...requested, ...rest])];
    let cover = dto.coverId ?? null;
    if (cover && !valid.has(cover)) throw new BadRequestException({ message: "La portada no pertenece a esta publicación", errors: { coverId: ["Portada no válida"] } });
    if (!cover) {
      const current = imgs.find((i) => i.isCover && i.status === "READY");
      cover = current?.id ?? ordered.find((id) => imgs.find((i) => i.id === id)?.status === "READY") ?? null;
    }
    if (cover && imgs.find((i) => i.id === cover)?.status !== "READY") throw new BadRequestException({ message: "La portada debe ser una foto ya subida", errors: { coverId: ["Portada no válida"] } });
    await this.renumber(pub.propertyId, ordered, cover);
    return this.list(pub.propertyId);
  }

  async patch(pubId: string, imageId: string, user: AuthUser, dto: PatchImageDto): Promise<ImageDTO> {
    const pub = await this.ownedPub(pubId, user);
    const img = await this.prisma.propertyImage.findFirst({ where: { id: imageId, propertyId: pub.propertyId } });
    if (!img) throw new NotFoundException("Foto no encontrada");
    if (dto.roomLabel !== undefined || dto.caption !== undefined) {
      await this.prisma.propertyImage.update({ where: { id: imageId }, data: { ...(dto.roomLabel !== undefined ? { roomLabel: dto.roomLabel } : {}), ...(dto.caption !== undefined ? { caption: dto.caption } : {}) } });
    }
    if (dto.isCover === true && !img.isCover) {
      if (img.status !== "READY") throw new BadRequestException("Solo una foto ya subida puede ser la portada");
      const all = await this.prisma.propertyImage.findMany({ where: { propertyId: pub.propertyId }, orderBy: [{ isCover: "desc" }, { position: "asc" }, { createdAt: "asc" }], select: { id: true } });
      await this.renumber(pub.propertyId, all.map((a) => a.id), imageId);
    }
    const fresh = await this.prisma.propertyImage.findUniqueOrThrow({ where: { id: imageId } });
    return toImageDTO(fresh);
  }

  /* ---------- replace ---------- */
  async replace(pubId: string, imageId: string, user: AuthUser, dto: ReplaceDto): Promise<PresignedUpload> {
    const pub = await this.ownedPub(pubId, user);
    const img = await this.prisma.propertyImage.findFirst({ where: { id: imageId, propertyId: pub.propertyId } });
    if (!img) throw new NotFoundException("Foto no encontrada");
    const mime = dto.mime as AllowedMime;
    if (img.checksum === dto.checksum && img.status === "READY" && !isPending(img.pending)) {
      return { imageId, duplicate: true, uploadUrl: null, method: "PUT", headers: {}, key: img.key, publicUrl: img.url };
    }
    const other = await this.prisma.propertyImage.findFirst({ where: { propertyId: pub.propertyId, checksum: dto.checksum, status: "READY", id: { not: imageId } }, select: { id: true, key: true, url: true } });
    if (other) return { imageId: other.id, duplicate: true, uploadUrl: null, method: "PUT", headers: {}, key: other.key, publicUrl: other.url };

    const key = `properties/${pub.propertyId}/${newId()}.${MIME_EXT[mime]}`;
    const p = await this.storage.presignPut(key, mime, dto.size);
    if (img.status === "PENDING") {
      // Aún no se había confirmado: se reemplaza directamente la clave.
      await this.prisma.propertyImage.update({ where: { id: imageId }, data: { key, url: this.storage.publicUrl(key), mime, sizeBytes: dto.size, checksum: dto.checksum, width: dto.width ?? img.width, height: dto.height ?? img.height } });
      if (img.key !== key) void this.storage.remove(img.key);
    } else {
      const previous = isPending(img.pending) ? img.pending.key : null;
      const pending: PendingReplace = { key, mime, size: dto.size, checksum: dto.checksum, width: dto.width ?? null, height: dto.height ?? null };
      await this.prisma.propertyImage.update({ where: { id: imageId }, data: { pending: pending as unknown as Prisma.InputJsonValue } });
      if (previous) void this.storage.remove(previous);
    }
    return { imageId, duplicate: false, uploadUrl: p.uploadUrl, method: "PUT", headers: p.headers, key, publicUrl: this.storage.publicUrl(key) };
  }

  /* ---------- delete ---------- */
  async remove(pubId: string, imageId: string, user: AuthUser): Promise<{ ok: true }> {
    const pub = await this.ownedPub(pubId, user);
    const img = await this.prisma.propertyImage.findFirst({ where: { id: imageId, propertyId: pub.propertyId } });
    if (!img) return { ok: true }; // idempotente (el cliente puede reintentar al cerrar la pestaña)
    if (pub.status === "PUBLISHED" && img.status === "READY") {
      const ready = await this.prisma.propertyImage.count({ where: { propertyId: pub.propertyId, status: "READY" } });
      if (ready - 1 < MIN_PHOTOS_ACTIVE) throw new ConflictException(`Una publicación activa necesita al menos ${MIN_PHOTOS_ACTIVE} fotos. Sube otra antes de eliminar esta.`);
    }
    await this.prisma.propertyImage.delete({ where: { id: imageId } });
    await this.storage.remove(img.key);
    if (isPending(img.pending)) await this.storage.remove(img.pending.key);
    if (img.isCover) {
      const next = await this.prisma.propertyImage.findFirst({ where: { propertyId: pub.propertyId, status: "READY" }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
      if (next) await this.prisma.propertyImage.update({ where: { id: next.id }, data: { isCover: true } });
    }
    return { ok: true };
  }
}
