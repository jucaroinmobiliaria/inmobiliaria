import { timingSafeEqual } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { env } from "../../common/config.js";
import { cardInclude } from "../../common/include.js";
import { toCard } from "../../common/mappers.js";
import { MailerService, mailLayout } from "../../common/mailer.service.js";
import { PrismaService, type Prisma } from "../../common/prisma.service.js";
import type { SavedSearchDTO, SearchQuery } from "../../contract.js";
import { PublicationsService } from "../publications/publications.service.js";
import { parseSearchJson, type SearchParams } from "../publications/search.dto.js";
import { SearchEngine } from "../publications/search-engine.service.js";
import type { CreateSavedSearchDto } from "./dto.js";

const MAX_SAVED = 20;
const DAY = 86_400_000;
const FILTER_KEYS = ["operation", "type", "city", "neighborhood", "q", "minPrice", "maxPrice", "bedrooms", "bathrooms", "parking", "minArea", "maxArea", "stratum", "amenities", "condition", "furnished", "petFriendly", "featured", "withVideo", "withTour", "bbox"] as const;

/** Solo conserva filtros reales (sin paginación ni orden) y descarta valores vacíos. */
export function normalizeQuery(raw: unknown): SearchQuery {
  const p: SearchParams = parseSearchJson(raw);
  const out: Record<string, string | number | boolean> = {};
  for (const k of FILTER_KEYS) {
    const v = p[k];
    if (v !== undefined && v !== "" && v !== false) out[k] = v as string | number | boolean;
  }
  return out as SearchQuery;
}

@Injectable()
export class SavedSearchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: SearchEngine,
    private readonly mailer: MailerService,
    private readonly pubs: PublicationsService,
  ) {}

  private since(s: { lastNotifiedAt: Date | null; createdAt: Date }): Date {
    return s.lastNotifiedAt ?? s.createdAt;
  }

  private async newCount(query: unknown, since: Date): Promise<number> {
    const where = await this.engine.where(parseSearchJson(query), [], [{ publishedAt: { gt: since } }]);
    return this.prisma.publication.count({ where });
  }

  private async dto(s: { id: string; name: string; query: Prisma.JsonValue; frequency: SavedSearchDTO["frequency"]; lastNotifiedAt: Date | null; createdAt: Date }): Promise<SavedSearchDTO> {
    return { id: s.id, name: s.name, query: normalizeQuery(s.query), frequency: s.frequency, createdAt: s.createdAt.toISOString(), newCount: await this.newCount(s.query, this.since(s)) };
  }

  async list(userId: string): Promise<SavedSearchDTO[]> {
    const rows = await this.prisma.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: MAX_SAVED });
    return Promise.all(rows.map((r) => this.dto(r)));
  }

  async create(userId: string, dto: CreateSavedSearchDto): Promise<SavedSearchDTO> {
    if ((await this.prisma.savedSearch.count({ where: { userId } })) >= MAX_SAVED) {
      throw new BadRequestException(`Puedes guardar hasta ${MAX_SAVED} búsquedas. Elimina alguna para crear otra.`);
    }
    const query = normalizeQuery(dto.query);
    const row = await this.prisma.savedSearch.create({ data: { userId, name: dto.name, query: query as Prisma.InputJsonValue, frequency: dto.frequency } });
    return this.dto(row);
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    const r = await this.prisma.savedSearch.deleteMany({ where: { id, userId } });
    if (r.count === 0) throw new NotFoundException("Búsqueda no encontrada");
    return { ok: true };
  }

  /* ---------- Cron ---------- */
  assertCron(headerSecret?: string, bearer?: string): void {
    const secret = env.CRON_SECRET;
    if (!secret) throw new ServiceUnavailableException("Las tareas programadas no están habilitadas");
    const given = headerSecret ?? bearer?.replace(/^Bearer\s+/i, "");
    const a = Buffer.from(given ?? "");
    const b = Buffer.from(secret);
    if (!given || a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException("Credencial de tarea no válida");
  }

  async runAlerts(): Promise<{ sent: number; expired: number }> {
    const expired = await this.pubs.expireOverdue();
    const now = Date.now();
    const rows = await this.prisma.savedSearch.findMany({ where: { frequency: { not: "NONE" } }, include: { user: { select: { id: true, email: true, name: true, status: true } } }, take: 2000 });
    let sent = 0;
    for (const s of rows) {
      if (s.user.status !== "ACTIVE") continue;
      const last = s.lastNotifiedAt?.getTime() ?? 0;
      const due = s.frequency === "INSTANT" ? true : s.frequency === "DAILY" ? now - last >= 23 * 3600_000 : now - last >= 6.9 * DAY;
      if (!due) continue;
      const since = this.since(s);
      const where = await this.engine.where(parseSearchJson(s.query), [], [{ publishedAt: { gt: since } }]);
      const [count, top] = await Promise.all([
        this.prisma.publication.count({ where }),
        this.prisma.publication.findMany({ where, orderBy: { publishedAt: "desc" }, take: 5, include: cardInclude(1) }),
      ]);
      if (count === 0) continue;
      const cards = top.map((t) => toCard(t));
      const lines = cards.map((c) => `• ${c.title} — ${new Intl.NumberFormat("es-CO", { style: "currency", currency: c.currency, maximumFractionDigits: 0 }).format(c.price)} — ${env.webUrl}${c.path}`);
      const title = count === 1 ? "1 inmueble nuevo en tu búsqueda" : `${count} inmuebles nuevos en tu búsqueda`;
      await this.mailer.send({
        to: s.user.email,
        subject: `${title}: ${s.name}`,
        text: `Hola ${s.user.name},\n\n${title} “${s.name}”:\n\n${lines.join("\n")}\n\nVer todos: ${env.webUrl}/favoritos`,
        html: mailLayout(title, [`Búsqueda: ${s.name}`, ...lines.map((l) => l.replace(/^• /, ""))], { label: `Ver en ${env.SITE_NAME}`, url: `${env.webUrl}/favoritos` }),
      });
      await this.prisma.notification.create({ data: { userId: s.user.id, type: "saved_search", title, body: s.name, link: "/favoritos" } });
      await this.prisma.savedSearch.update({ where: { id: s.id }, data: { lastNotifiedAt: new Date() } });
      sent++;
    }
    return { sent, expired };
  }
}
