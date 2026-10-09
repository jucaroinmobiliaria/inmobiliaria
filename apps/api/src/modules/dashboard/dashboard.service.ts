import { Injectable } from "@nestjs/common";
import { MIN_PHOTOS } from "../../common/completion.js";
import { PrismaService } from "../../common/prisma.service.js";
import { buildPath } from "../../common/seo.js";
import type { AuthUser } from "../../common/decorators.js";
import type { DashboardSummary } from "../../contract.js";
import { InquiriesService } from "../inquiries/inquiries.service.js";
import { VisitsService } from "../visits/visits.service.js";

const DAY = 86_400_000;
const utcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0);

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inquiries: InquiriesService,
    private readonly visits: VisitsService,
  ) {}

  async summary(user: AuthUser): Promise<DashboardSummary> {
    const now = new Date();
    const today = utcDay(now);
    const from30 = today - 29 * DAY;
    const from60 = today - 59 * DAY;

    const pubs = await this.prisma.publication.findMany({
      where: { property: { ownerId: user.id } },
      select: {
        id: true, code: true, title: true, slug: true, operation: true, status: true, expiresAt: true, moderationNote: true,
        property: {
          select: {
            type: { select: { slug: true } },
            location: { select: { city: { select: { slug: true } }, neighborhood: { select: { slug: true } } } },
            images: { where: { status: "READY" }, orderBy: [{ isCover: "desc" }, { position: "asc" }], take: 1, select: { url: true } },
            _count: { select: { images: { where: { status: "READY" } } } },
          },
        },
      },
    });
    const ids = pubs.map((p) => p.id);
    const stats = ids.length
      ? await this.prisma.publicationStatDaily.findMany({ where: { publicationId: { in: ids }, date: { gte: new Date(from60) } }, select: { publicationId: true, date: true, views: true, favorites: true, inquiries: true } })
      : [];

    const series = new Map<number, { views: number; favorites: number; inquiries: number }>();
    for (let t = from30; t <= today; t += DAY) series.set(t, { views: 0, favorites: 0, inquiries: 0 });
    const prev = { views: 0, inquiries: 0 };
    const per = new Map<string, { views: number; favorites: number; inquiries: number }>();
    for (const s of stats) {
      const t = s.date.getTime();
      if (t >= from30) {
        const b = series.get(t);
        if (b) { b.views += s.views; b.favorites += s.favorites; b.inquiries += s.inquiries; }
        const p = per.get(s.publicationId) ?? { views: 0, favorites: 0, inquiries: 0 };
        p.views += s.views; p.favorites += s.favorites; p.inquiries += s.inquiries;
        per.set(s.publicationId, p);
      } else {
        prev.views += s.views;
        prev.inquiries += s.inquiries;
      }
    }
    const seriesArr = [...series.entries()].map(([t, v]) => ({ date: iso(t), ...v }));
    const views30d = seriesArr.reduce((a, b) => a + b.views, 0);
    const favorites30d = seriesArr.reduce((a, b) => a + b.favorites, 0);
    const inquiries30d = seriesArr.reduce((a, b) => a + b.inquiries, 0);

    const active = pubs.filter((p) => p.status === "PUBLISHED");
    const pathOf = (p: (typeof pubs)[number]) =>
      p.status === "PUBLISHED" && p.property.type && p.property.location?.city
        ? buildPath({ operation: p.operation, typeSlug: p.property.type.slug, citySlug: p.property.location.city.slug, neighborhoodSlug: p.property.location.neighborhood?.slug ?? null, slug: p.slug, code: p.code })
        : null;

    const [visitsPending, recentInquiries, upcomingVisits, unanswered, account] = await Promise.all([
      this.prisma.visit.count({ where: { publication: { property: { ownerId: user.id } }, status: "REQUESTED", scheduledAt: { gte: new Date(now.getTime() - DAY) } } }),
      this.inquiries.list(user, { scope: "received" }, 5),
      this.visits.upcoming(user.id, 5),
      this.prisma.inquiry.count({ where: { publication: { property: { ownerId: user.id } }, status: "NEW", createdAt: { lt: new Date(now.getTime() - DAY) } } }),
      this.prisma.user.findUnique({ where: { id: user.id }, select: { verified: true, phone: true } }),
    ]);

    const top = [...pubs]
      .filter((p) => p.status === "PUBLISHED" || p.status === "PAUSED")
      .map((p) => ({ p, s: per.get(p.id) ?? { views: 0, favorites: 0, inquiries: 0 } }))
      .sort((a, b) => b.s.views - a.s.views || b.s.inquiries - a.s.inquiries)
      .slice(0, 5)
      .map(({ p, s }) => ({ id: p.id, title: p.title ?? "", path: pathOf(p), coverUrl: p.property.images[0]?.url ?? null, views: s.views, inquiries: s.inquiries, favorites: s.favorites }));

    // Consejos accionables
    const tips: DashboardSummary["tips"] = [];
    for (const p of pubs.filter((x) => x.status === "REJECTED").slice(0, 2)) {
      tips.push({ id: `rejected-${p.id}`, tone: "warn", text: `“${p.title ?? "Tu publicación"}” fue rechazada${p.moderationNote ? `: ${p.moderationNote}` : "."}`, cta: { label: "Corregir y reenviar", href: `/publicar/${p.id}` } });
    }
    if (unanswered > 0) tips.push({ id: "unanswered", tone: "warn", text: `Tienes ${unanswered} ${unanswered === 1 ? "consulta sin responder" : "consultas sin responder"} desde hace más de un día. Responder rápido sube tus probabilidades de cerrar.`, cta: { label: "Ir a mensajes", href: "/panel/mensajes" } });
    for (const p of active.filter((x) => x.property._count.images < 8).slice(0, 2)) {
      tips.push({ id: `photos-${p.id}`, tone: "info", text: `Agrega más fotos a “${p.title ?? "tu publicación"}”: tiene ${p.property._count.images} y las publicaciones con 8 o más reciben más consultas.`, cta: { label: "Agregar fotos", href: `/publicar/${p.id}` } });
    }
    for (const p of active.filter((x) => x.expiresAt && x.expiresAt.getTime() - now.getTime() < 7 * DAY).slice(0, 2)) {
      const days = Math.max(0, Math.ceil((p.expiresAt!.getTime() - now.getTime()) / DAY));
      tips.push({ id: `expiring-${p.id}`, tone: "warn", text: `“${p.title ?? "Tu publicación"}” vence en ${days} ${days === 1 ? "día" : "días"}. Renuévala para mantenerla visible.`, cta: { label: "Renovar", href: "/panel/publicaciones" } });
    }
    const drafts = pubs.filter((p) => p.status === "DRAFT");
    if (drafts.length) tips.push({ id: "drafts", tone: "info", text: `Tienes ${drafts.length} ${drafts.length === 1 ? "borrador" : "borradores"} por terminar.`, cta: { label: "Continuar", href: `/publicar/${drafts[0]!.id}` } });
    if (visitsPending > 0) tips.push({ id: "visits", tone: "info", text: `${visitsPending} ${visitsPending === 1 ? "solicitud de visita espera" : "solicitudes de visita esperan"} tu confirmación.`, cta: { label: "Ver visitas", href: "/panel/visitas" } });
    if (pubs.some((p) => p.status === "PENDING_REVIEW")) tips.push({ id: "review", tone: "info", text: "Un administrador está revisando tus avisos. No aparecen en las búsquedas hasta que los apruebe.", cta: { label: "Ver en revisión", href: "/panel/publicaciones?estado=revision" } });
    if (pubs.length && !account?.verified) tips.push({ id: "verify", tone: "info", text: "Completa tu perfil para que un administrador pueda marcarte como anunciante verificado. Tus avisos igual pasan por revisión.", cta: { label: "Ir a mi cuenta", href: "/panel/cuenta" } });
    if (!pubs.length) tips.push({ id: "first", tone: "info", text: `Publica tu primer inmueble en minutos: sube al menos ${MIN_PHOTOS} fotos y describe lo mejor de tu propiedad.`, cta: { label: "Publicar inmueble", href: "/publicar" } });

    return {
      kpis: {
        activeListings: active.length,
        pendingReview: pubs.filter((p) => p.status === "PENDING_REVIEW").length,
        drafts: drafts.length,
        views30d, favorites30d, inquiries30d, visitsPending,
        viewsDelta: pct(views30d, prev.views),
        inquiriesDelta: pct(inquiries30d, prev.inquiries),
      },
      series: seriesArr,
      top,
      recentInquiries,
      upcomingVisits,
      tips: tips.slice(0, 6),
    };
  }
}
