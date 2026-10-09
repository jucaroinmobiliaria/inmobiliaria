import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MailerService, mailLayout } from "../../common/mailer.service.js";
import { NotifyService } from "../../common/notify.service.js";
import { PrismaService } from "../../common/prisma.service.js";
import type { AuthUser } from "../../common/decorators.js";
import type { VisitRow } from "../../contract.js";
import type { VisitStatus } from "../../generated/prisma/client.js";
import { type CreateVisitDto, type VisitStatusDto } from "../inquiries/inquiries.dto.js";
import { pubMiniSelect, toPubMini } from "../inquiries/inquiries.service.js";

const OWNER_TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  REQUESTED: ["CONFIRMED", "CANCELLED", "DONE"],
  CONFIRMED: ["DONE", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
};

const fmt = (d: Date) => new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeStyle: "short", timeZone: "America/Bogota" }).format(d);

@Injectable()
export class VisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
    private readonly mailer: MailerService,
  ) {}

  async create(pubId: string, user: AuthUser | undefined, dto: CreateVisitDto): Promise<{ id: string }> {
    const when = new Date(dto.scheduledAt);
    if (Number.isNaN(when.getTime())) throw new BadRequestException({ message: "La fecha de la visita no es válida", errors: { scheduledAt: ["La fecha de la visita no es válida"] } });
    const now = Date.now();
    if (when.getTime() < now + 30 * 60_000) throw new BadRequestException({ message: "Elige una fecha futura para la visita", errors: { scheduledAt: ["Elige una fecha futura"] } });
    if (when.getTime() > now + 180 * 86_400_000) throw new BadRequestException({ message: "La visita debe ser en los próximos 6 meses", errors: { scheduledAt: ["Máximo 6 meses a futuro"] } });

    const pub = await this.prisma.publication.findFirst({
      where: { id: pubId, status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { id: true, title: true, property: { select: { ownerId: true, owner: { select: { id: true, email: true } } } } },
    });
    if (!pub) throw new NotFoundException("Publicación no encontrada");
    if (user && user.id === pub.property.ownerId) throw new BadRequestException("No puedes agendar una visita a tu propia publicación");

    const dup = await this.prisma.visit.findFirst({ where: { publicationId: pub.id, email: dto.email, scheduledAt: when, status: { in: ["REQUESTED", "CONFIRMED"] } }, select: { id: true } });
    if (dup) return { id: dup.id };

    const v = await this.prisma.visit.create({
      data: { publicationId: pub.id, requesterId: user?.id ?? null, name: dto.name, email: dto.email, phone: dto.phone ?? null, scheduledAt: when, note: dto.note ?? null },
      select: { id: true },
    });
    await this.notify.notify({
      userId: pub.property.owner.id, type: "visit", title: "Nueva solicitud de visita", body: `${dto.name} quiere visitar “${pub.title ?? "tu publicación"}” el ${fmt(when)}.`,
      link: "/panel/visitas", email: { to: pub.property.owner.email, subject: "Nueva solicitud de visita", cta: "Ver solicitud" },
    });
    return { id: v.id };
  }

  /** Próximas visitas (solicitadas o confirmadas) a inmuebles del usuario. */
  async upcoming(userId: string, take = 5): Promise<VisitRow[]> {
    const rows = await this.prisma.visit.findMany({
      where: { publication: { property: { ownerId: userId } }, status: { in: ["REQUESTED", "CONFIRMED"] }, scheduledAt: { gte: new Date(Date.now() - 3600_000) } },
      orderBy: { scheduledAt: "asc" }, take, include: { publication: { select: pubMiniSelect } },
    });
    return rows.map((v) => this.toRow(v));
  }

  async list(user: AuthUser, scope: "received" | "sent"): Promise<VisitRow[]> {
    const rows = await this.prisma.visit.findMany({
      where: scope === "received" ? { publication: { property: { ownerId: user.id } } } : { requesterId: user.id },
      orderBy: { scheduledAt: "desc" },
      take: 200,
      include: { publication: { select: pubMiniSelect } },
    });
    return rows.map((v) => ({
      id: v.id, status: v.status, name: v.name, email: v.email, phone: v.phone, note: v.note, scheduledAt: v.scheduledAt.toISOString(), createdAt: v.createdAt.toISOString(),
      publication: toPubMini(v.publication),
    }));
  }

  async setStatus(id: string, user: AuthUser, dto: VisitStatusDto): Promise<VisitRow> {
    const v = await this.prisma.visit.findUnique({ where: { id }, include: { publication: { select: { ...pubMiniSelect, property: { select: { ...pubMiniSelect.property.select, owner: { select: { email: true } } } } } } } });
    if (!v) throw new NotFoundException("Visita no encontrada");
    const isOwner = v.publication.property.ownerId === user.id;
    const isRequester = v.requesterId === user.id;
    if (!isOwner && !isRequester) throw new NotFoundException("Visita no encontrada");
    if (!isOwner && dto.status !== "CANCELLED") throw new ForbiddenException("Solo puedes cancelar tu visita");
    if (v.status === dto.status) return this.toRow(v);
    if (isOwner && !OWNER_TRANSITIONS[v.status].includes(dto.status)) throw new BadRequestException("Ese cambio de estado no es posible");
    if (!isOwner && !["REQUESTED", "CONFIRMED"].includes(v.status)) throw new BadRequestException("Esta visita ya no se puede cancelar");
    const u = await this.prisma.visit.update({ where: { id }, data: { status: dto.status }, include: { publication: { select: { ...pubMiniSelect, property: { select: { ...pubMiniSelect.property.select, owner: { select: { email: true } } } } } } } });
    const title = v.publication.title ?? "la publicación";
    if (isOwner && dto.status === "CONFIRMED") {
      await this.notifyRequester(v, "Tu visita fue confirmada", `Te esperamos el ${fmt(v.scheduledAt)} en “${title}”.`);
    } else if (isOwner && dto.status === "CANCELLED") {
      await this.notifyRequester(v, "Tu visita fue cancelada", `El anunciante canceló la visita a “${title}”. Puedes solicitar otra fecha.`);
    } else if (!isOwner && dto.status === "CANCELLED") {
      await this.notify.notify({ userId: v.publication.property.ownerId, type: "visit", title: "Visita cancelada", body: `${v.name} canceló su visita a “${title}”.`, link: "/panel/visitas" });
    }
    return this.toRow(u);
  }

  private toRow(v: { id: string; status: VisitStatus; name: string; email: string; phone: string | null; note: string | null; scheduledAt: Date; createdAt: Date; publication: Parameters<typeof toPubMini>[0] }): VisitRow {
    return { id: v.id, status: v.status, name: v.name, email: v.email, phone: v.phone, note: v.note, scheduledAt: v.scheduledAt.toISOString(), createdAt: v.createdAt.toISOString(), publication: toPubMini(v.publication) };
  }

  private async notifyRequester(v: { requesterId: string | null; email: string; name: string }, title: string, body: string): Promise<void> {
    if (v.requesterId) {
      await this.notify.notify({ userId: v.requesterId, type: "visit", title, body, link: "/panel/visitas", email: { to: v.email, subject: title, cta: "Ver mis visitas" } });
    } else {
      // Solicitante sin cuenta: solo correo.
      await this.mailer.send({ to: v.email, subject: title, text: `Hola ${v.name},\n\n${body}`, html: mailLayout(title, [`Hola ${v.name},`, body]) });
    }
  }
}
