import { Global, Injectable, Logger, Module } from "@nestjs/common";
import { Prisma, PrismaService } from "../../common/prisma.service.js";

export type StatField = "views" | "favorites" | "inquiries" | "shares";

export const utcDay = (d = new Date()): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

@Injectable()
export class StatsService {
  private readonly logger = new Logger("Stats");
  /** dedupe de visitas: ip|publicación|día */
  private readonly seen = new Map<string, number>();
  private seenDay = utcDay().getTime();

  constructor(private readonly prisma: PrismaService) {}

  /** Suma `delta` al contador diario (atómico, ON CONFLICT). Nunca lanza. */
  async bump(publicationId: string, field: StatField, delta = 1): Promise<void> {
    const col = Prisma.raw(`"${field}"`);
    try {
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "PublicationStatDaily" ("id", "publicationId", "date", ${col})
        VALUES (gen_random_uuid()::text, ${publicationId}, ${utcDay()}, ${Math.max(0, delta)})
        ON CONFLICT ("publicationId", "date") DO UPDATE SET ${col} = GREATEST(0, "PublicationStatDaily".${col} + ${delta})`);
    } catch (err) {
      this.logger.warn(`No se pudo actualizar la estadística ${field}: ${(err as Error).message}`);
    }
  }

  /** true si es la primera visita (ip + publicación + día). */
  firstViewToday(ip: string, publicationId: string): boolean {
    const today = utcDay().getTime();
    if (today !== this.seenDay || this.seen.size > 100_000) {
      this.seen.clear();
      this.seenDay = today;
    }
    const key = `${ip}|${publicationId}`;
    if (this.seen.has(key)) return false;
    this.seen.set(key, today);
    return true;
  }
}

@Global()
@Module({ providers: [StatsService], exports: [StatsService] })
export class StatsModule {}
