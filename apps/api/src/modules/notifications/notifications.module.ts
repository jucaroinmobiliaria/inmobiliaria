import { Controller, Get, HttpCode, Module, Param, Post } from "@nestjs/common";
import { type AuthUser, Auth, Me } from "../../common/decorators.js";
import { PrismaService } from "../../common/prisma.service.js";
import { ZodPipe, z } from "../../common/zod.js";
import type { NotificationDTO } from "../../contract.js";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Auth() @Get()
  async list(@Me() u: AuthUser): Promise<NotificationDTO[]> {
    const rows = await this.prisma.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 30 });
    return rows.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() }));
  }

  @Auth() @Post("read-all") @HttpCode(200)
  async readAll(@Me() u: AuthUser): Promise<{ ok: true }> {
    await this.prisma.notification.updateMany({ where: { userId: u.id, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  /** Adicional: marca una sola notificación como leída. */
  @Auth() @Post(":id/read") @HttpCode(200)
  async readOne(@Me() u: AuthUser, @Param("id", new ZodPipe(z.string().min(1).max(40))) id: string): Promise<{ ok: true }> {
    await this.prisma.notification.updateMany({ where: { id, userId: u.id, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }
}

@Module({ controllers: [NotificationsController] })
export class NotificationsModule {}
