import { Body, Controller, HttpCode, Injectable, Module, NotFoundException, Param, Post, Req } from "@nestjs/common";
import { type AuthedRequest, FormLimit, Public } from "../../common/decorators.js";
import { NotifyService } from "../../common/notify.service.js";
import { PrismaService } from "../../common/prisma.service.js";
import { ZodPipe, z } from "../../common/zod.js";
import { type ReportDto, reportSchema } from "../inquiries/inquiries.dto.js";

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
  ) {}

  async create(pubId: string, userId: string | undefined, dto: ReportDto): Promise<{ ok: true }> {
    const pub = await this.prisma.publication.findFirst({ where: { id: pubId, status: "PUBLISHED" }, select: { id: true, code: true, title: true } });
    if (!pub) throw new NotFoundException("Publicación no encontrada");
    if (userId) {
      const dup = await this.prisma.report.findFirst({ where: { publicationId: pub.id, reporterId: userId, status: "OPEN" }, select: { id: true } });
      if (dup) return { ok: true };
    }
    await this.prisma.report.create({ data: { publicationId: pub.id, reporterId: userId ?? null, reason: dto.reason, details: dto.details ?? null } });
    const admins = await this.prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true }, take: 20 });
    await Promise.all(admins.map((a) => this.notify.notify({ userId: a.id, type: "report", title: "Nuevo reporte", body: `“${pub.title ?? `Inmueble ${pub.code}`}”: ${dto.reason}`, link: "/admin/reportes" })));
    return { ok: true };
  }
}

@Controller("publications/:id/report")
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Public() @FormLimit() @Post() @HttpCode(200)
  create(@Param("id", new ZodPipe(z.string().min(1).max(40))) id: string, @Body(new ZodPipe(reportSchema)) dto: ReportDto, @Req() req: AuthedRequest): Promise<{ ok: true }> {
    return this.svc.create(id, req.user?.id, dto);
  }
}

@Module({ controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
