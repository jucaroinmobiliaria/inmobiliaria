import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { env } from "../../common/config.js";
import { MailerService, mailLayout } from "../../common/mailer.service.js";
import { NotifyService } from "../../common/notify.service.js";
import { Prisma, PrismaService } from "../../common/prisma.service.js";
import { buildPath } from "../../common/seo.js";
import type { AuthUser } from "../../common/decorators.js";
import type { InquiryMessageDTO, InquiryRow, InquiryStatus, InquiryThread } from "../../contract.js";
import { StatsService } from "../stats/stats.service.js";
import type { CreateInquiryDto, InquiryStatusDto, ListInquiriesDto, MessageDto } from "./inquiries.dto.js";

export const pubMiniSelect = {
  id: true, code: true, title: true, slug: true, operation: true, status: true,
  property: {
    select: {
      ownerId: true,
      type: { select: { slug: true } },
      location: { select: { city: { select: { slug: true } }, neighborhood: { select: { slug: true } } } },
      images: { where: { status: "READY" }, orderBy: [{ isCover: "desc" }, { position: "asc" }], take: 1, select: { url: true } },
    },
  },
} satisfies Prisma.PublicationSelect;
export type PubMini = Prisma.PublicationGetPayload<{ select: typeof pubMiniSelect }>;

export function toPubMini(p: PubMini) {
  const loc = p.property.location;
  return {
    id: p.id,
    code: p.code,
    title: p.title ?? "",
    path: p.status === "PUBLISHED" && p.property.type && loc?.city
      ? buildPath({ operation: p.operation, typeSlug: p.property.type.slug, citySlug: loc.city.slug, neighborhoodSlug: loc.neighborhood?.slug ?? null, slug: p.slug, code: p.code })
      : null,
    coverUrl: p.property.images[0]?.url ?? null,
  };
}

const inquiryInclude = {
  publication: { select: pubMiniSelect },
  messages: { orderBy: { createdAt: "desc" }, take: 1 },
} satisfies Prisma.InquiryInclude;

const threadInclude = {
  publication: { select: { ...pubMiniSelect, property: { select: { ...pubMiniSelect.property.select, owner: { select: { id: true, name: true, email: true, profile: { select: { displayName: true } } } } } } } },
  messages: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.InquiryInclude;

@Injectable()
export class InquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
    private readonly mailer: MailerService,
    private readonly stats: StatsService,
  ) {}

  /* ---------- Público: crear consulta ---------- */
  async create(pubId: string, user: AuthUser | undefined, dto: CreateInquiryDto): Promise<{ id: string }> {
    const pub = await this.prisma.publication.findFirst({
      where: { id: pubId, status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { id: true, title: true, property: { select: { ownerId: true, owner: { select: { id: true, email: true } } } } },
    });
    if (!pub) throw new NotFoundException("Publicación no encontrada");
    if (user && user.id === pub.property.ownerId) throw new BadRequestException("No puedes enviar una consulta a tu propia publicación");

    // Anti doble envío: mismo correo + mismo mensaje en los últimos 10 minutos.
    const dup = await this.prisma.inquiry.findFirst({
      where: { publicationId: pub.id, email: dto.email, createdAt: { gt: new Date(Date.now() - 10 * 60_000) }, messages: { some: { body: dto.message, fromOwner: false } } },
      select: { id: true },
    });
    if (dup) return { id: dup.id };

    const inquiry = await this.prisma.inquiry.create({
      data: {
        publicationId: pub.id, senderId: user?.id ?? null, name: dto.name, email: dto.email, phone: dto.phone ?? null,
        messages: { create: { senderId: user?.id ?? null, fromOwner: false, body: dto.message } },
      },
      select: { id: true },
    });
    await this.stats.bump(pub.id, "inquiries");
    await this.notify.notify({
      userId: pub.property.owner.id, type: "inquiry", title: "Nueva consulta", body: `${dto.name} escribió sobre “${pub.title ?? "tu publicación"}”: ${dto.message.slice(0, 140)}`,
      link: `/panel/mensajes?id=${inquiry.id}`, email: { to: pub.property.owner.email, subject: `Nueva consulta sobre “${pub.title ?? "tu publicación"}”`, cta: `Responder en ${env.SITE_NAME}` },
    });
    return { id: inquiry.id };
  }

  /* ---------- Panel ---------- */
  private row(i: Prisma.InquiryGetPayload<{ include: typeof inquiryInclude }>, scope: "received" | "sent"): InquiryRow {
    const last = i.messages[0];
    return {
      id: i.id, status: i.status, name: i.name, email: i.email, phone: i.phone, lastMessageAt: i.lastMessageAt.toISOString(), createdAt: i.createdAt.toISOString(),
      unread: scope === "received" ? !i.readByOwner : !i.readBySender,
      lastMessage: last?.body.slice(0, 160) ?? "",
      publication: toPubMini(i.publication),
    };
  }

  async list(user: AuthUser, q: ListInquiriesDto, take = 200): Promise<InquiryRow[]> {
    const rows = await this.prisma.inquiry.findMany({
      where: { ...(q.scope === "received" ? { publication: { property: { ownerId: user.id } } } : { senderId: user.id }), ...(q.status ? { status: q.status } : {}) },
      orderBy: { lastMessageAt: "desc" },
      take,
      include: inquiryInclude,
    });
    return rows.map((r) => this.row(r, q.scope));
  }

  private async loadThread(id: string, user: AuthUser) {
    const i = await this.prisma.inquiry.findUnique({ where: { id }, include: threadInclude });
    if (!i) throw new NotFoundException("Consulta no encontrada");
    const isOwner = i.publication.property.ownerId === user.id;
    const isSender = i.senderId === user.id;
    if (!isOwner && !isSender) throw new NotFoundException("Consulta no encontrada");
    return { i, isOwner, isSender };
  }

  async thread(id: string, user: AuthUser): Promise<InquiryThread> {
    const { i, isOwner } = await this.loadThread(id, user);
    if (isOwner && !i.readByOwner) await this.prisma.inquiry.update({ where: { id }, data: { readByOwner: true } });
    else if (!isOwner && !i.readBySender) await this.prisma.inquiry.update({ where: { id }, data: { readBySender: true } });
    const owner = i.publication.property.owner;
    const ownerName = owner.profile?.displayName?.trim() || owner.name;
    const last = i.messages[i.messages.length - 1];
    return {
      id: i.id, status: i.status, name: i.name, email: i.email, phone: i.phone, lastMessageAt: i.lastMessageAt.toISOString(), createdAt: i.createdAt.toISOString(),
      unread: false, lastMessage: last?.body.slice(0, 160) ?? "", publication: toPubMini(i.publication),
      messages: i.messages.map((m): InquiryMessageDTO => ({ id: m.id, body: m.body, fromOwner: m.fromOwner, createdAt: m.createdAt.toISOString(), senderName: m.fromOwner ? ownerName : i.name })),
    };
  }

  async reply(id: string, user: AuthUser, dto: MessageDto): Promise<InquiryMessageDTO> {
    const { i, isOwner } = await this.loadThread(id, user);
    const owner = i.publication.property.owner;
    const ownerName = owner.profile?.displayName?.trim() || owner.name;
    const msg = await this.prisma.inquiryMessage.create({ data: { inquiryId: id, senderId: user.id, fromOwner: isOwner, body: dto.body } });
    await this.prisma.inquiry.update({
      where: { id },
      data: isOwner ? { status: "REPLIED", lastMessageAt: msg.createdAt, readByOwner: true, readBySender: false } : { status: "NEW", lastMessageAt: msg.createdAt, readByOwner: false, readBySender: true },
    });
    const title = i.publication.title ?? "la publicación";
    if (isOwner) {
      const subject = `${ownerName} respondió tu consulta sobre “${title}”`;
      if (i.senderId) {
        await this.notify.notify({ userId: i.senderId, type: "message", title: "Respuesta a tu consulta", body: dto.body.slice(0, 160), link: `/panel/mensajes?id=${id}`, email: { to: i.email, subject, cta: "Ver conversación" } });
      } else {
        await this.mailer.send({ to: i.email, subject, text: `${ownerName} te respondió:\n\n${dto.body}\n\nSi quieres seguir la conversación, escribe de nuevo desde la publicación en ${env.webUrl}.`, html: mailLayout(subject, [dto.body], { label: "Ver la publicación", url: env.webUrl }) });
      }
    } else {
      await this.notify.notify({ userId: owner.id, type: "message", title: "Nuevo mensaje", body: `${i.name}: ${dto.body.slice(0, 140)}`, link: `/panel/mensajes?id=${id}`, email: { to: owner.email, subject: `Nuevo mensaje sobre “${title}”`, cta: `Responder en ${env.SITE_NAME}` } });
    }
    return { id: msg.id, body: msg.body, fromOwner: msg.fromOwner, createdAt: msg.createdAt.toISOString(), senderName: isOwner ? ownerName : i.name };
  }

  async setStatus(id: string, user: AuthUser, dto: InquiryStatusDto): Promise<{ id: string; status: InquiryStatus }> {
    const { isOwner } = await this.loadThread(id, user);
    if (!isOwner && dto.status !== "CLOSED") throw new ForbiddenException("Solo puedes cerrar tu consulta");
    const u = await this.prisma.inquiry.update({ where: { id }, data: { status: dto.status, ...(isOwner ? { readByOwner: true } : {}) }, select: { id: true, status: true } });
    return u;
  }
}
