import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { cardInclude } from "../../common/include.js";
import { PrismaService } from "../../common/prisma.service.js";
import type { PublicationCard } from "../../contract.js";
import { PublicationsReadService } from "../publications/publications-read.service.js";
import { StatsService } from "../stats/stats.service.js";

const MAX_FAVORITES = 500;

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly read: PublicationsReadService,
    private readonly stats: StatsService,
  ) {}

  async list(userId: string): Promise<PublicationCard[]> {
    const favs = await this.prisma.favorite.findMany({
      where: { userId, publication: { status: "PUBLISHED" } },
      orderBy: { createdAt: "desc" },
      take: MAX_FAVORITES,
      include: { publication: { include: cardInclude(6) } },
    });
    const now = new Date();
    const rows = favs.map((f) => f.publication).filter((p) => !p.expiresAt || p.expiresAt > now);
    const cards = await this.read.cards(rows, userId);
    return cards.map((c) => ({ ...c, isFavorite: true }));
  }

  async ids(userId: string): Promise<{ ids: string[] }> {
    const rows = await this.prisma.favorite.findMany({ where: { userId, publication: { status: "PUBLISHED" } }, select: { publicationId: true }, orderBy: { createdAt: "desc" }, take: MAX_FAVORITES });
    return { ids: rows.map((r) => r.publicationId) };
  }

  async add(userId: string, publicationId: string): Promise<{ isFavorite: true }> {
    const p = await this.prisma.publication.findFirst({ where: { id: publicationId, status: "PUBLISHED" }, select: { id: true } });
    if (!p) throw new NotFoundException("Publicación no encontrada");
    const exists = await this.prisma.favorite.findUnique({ where: { userId_publicationId: { userId, publicationId } }, select: { userId: true } });
    if (!exists) {
      if ((await this.prisma.favorite.count({ where: { userId } })) >= MAX_FAVORITES) throw new BadRequestException("Llegaste al máximo de favoritos. Quita alguno para guardar otro.");
      await this.prisma.favorite.create({ data: { userId, publicationId } }).catch(() => undefined); // carrera: ya existía
      await this.stats.bump(publicationId, "favorites");
    }
    return { isFavorite: true };
  }

  async remove(userId: string, publicationId: string): Promise<{ isFavorite: false }> {
    await this.prisma.favorite.deleteMany({ where: { userId, publicationId } });
    return { isFavorite: false };
  }
}
