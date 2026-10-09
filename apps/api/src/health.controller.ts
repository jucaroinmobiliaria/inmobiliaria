import { Controller, Get, Header } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "./common/decorators.js";
import { PrismaService } from "./common/prisma.service.js";

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public() @SkipThrottle() @Get("health") @Header("Cache-Control", "no-store")
  async health(): Promise<{ ok: boolean; db: boolean; uptime: number; time: string }> {
    let db = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    return { ok: db, db, uptime: Math.round(process.uptime()), time: new Date().toISOString() };
  }
}
