import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { type AuthUser, Me, Roles } from "../../common/decorators.js";
import { ZodPipe, z } from "../../common/zod.js";
import type { AdminOverview, AdminPublicationRow, AdminReportRow, AdminUserRow, AuditRow, Paginated } from "../../contract.js";
import {
  type AdminAuditQuery, type AdminPublicationsQuery, type AdminUserPatchDto, type AdminUsersQuery, type CatalogKind, type FeatureDto, type RejectDto,
  adminAuditQuery, adminPublicationsQuery, adminReportsQuery, adminUserPatchSchema, adminUsersQuery, catalogKinds, featureSchema, reportPatchSchema, rejectSchema,
} from "./admin.dto.js";
import { AdminService } from "./admin.service.js";

const idParam = new ZodPipe(z.string().min(1).max(40));
const kindPipe = new ZodPipe(z.enum(catalogKinds as [CatalogKind, ...CatalogKind[]], { error: "Catálogo no válido" }));

@Controller("admin")
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("overview")
  overview(): Promise<AdminOverview> {
    return this.admin.overview();
  }

  @Get("publications")
  publications(@Query(new ZodPipe(adminPublicationsQuery)) q: AdminPublicationsQuery): Promise<Paginated<AdminPublicationRow>> {
    return this.admin.publications(q);
  }

  @Post("publications/:id/approve") @HttpCode(200)
  approve(@Me() u: AuthUser, @Param("id", idParam) id: string): Promise<AdminPublicationRow> {
    return this.admin.approve(id, u);
  }

  @Post("publications/:id/reject") @HttpCode(200)
  reject(@Me() u: AuthUser, @Param("id", idParam) id: string, @Body(new ZodPipe(rejectSchema)) dto: RejectDto): Promise<AdminPublicationRow> {
    return this.admin.reject(id, u, dto);
  }

  @Patch("publications/:id/feature")
  feature(@Me() u: AuthUser, @Param("id", idParam) id: string, @Body(new ZodPipe(featureSchema)) dto: FeatureDto): Promise<AdminPublicationRow> {
    return this.admin.feature(id, u, dto);
  }

  @Get("users")
  users(@Query(new ZodPipe(adminUsersQuery)) q: AdminUsersQuery): Promise<Paginated<AdminUserRow>> {
    return this.admin.users(q);
  }

  @Patch("users/:id")
  patchUser(@Me() u: AuthUser, @Param("id", idParam) id: string, @Body(new ZodPipe(adminUserPatchSchema)) dto: AdminUserPatchDto): Promise<AdminUserRow> {
    return this.admin.patchUser(id, u, dto);
  }

  @Get("reports")
  reports(@Query(new ZodPipe(adminReportsQuery)) q: z.infer<typeof adminReportsQuery>): Promise<AdminReportRow[]> {
    return this.admin.reports(q.status);
  }

  @Patch("reports/:id")
  patchReport(@Me() u: AuthUser, @Param("id", idParam) id: string, @Body(new ZodPipe(reportPatchSchema)) dto: z.infer<typeof reportPatchSchema>): Promise<AdminReportRow> {
    return this.admin.patchReport(id, u, dto.status);
  }

  @Get("audit")
  audit(@Query(new ZodPipe(adminAuditQuery)) q: AdminAuditQuery): Promise<Paginated<AuditRow>> {
    return this.admin.auditLog(q);
  }

  /* ---- Catálogos ---- */
  @Post("catalog/:kind") @HttpCode(201)
  catalogCreate(@Me() u: AuthUser, @Param("kind", kindPipe) kind: CatalogKind, @Body() body: Record<string, unknown>): Promise<unknown> {
    return this.catalogCall(() => this.admin.catalogCreate(kind, body ?? {}, u));
  }

  @Patch("catalog/:kind/:id")
  catalogUpdate(@Me() u: AuthUser, @Param("kind", kindPipe) kind: CatalogKind, @Param("id", idParam) id: string, @Body() body: Record<string, unknown>): Promise<unknown> {
    return this.catalogCall(() => this.admin.catalogUpdate(kind, id, body ?? {}, u));
  }

  @Delete("catalog/:kind/:id")
  catalogDelete(@Me() u: AuthUser, @Param("kind", kindPipe) kind: CatalogKind, @Param("id", idParam) id: string): Promise<{ ok: true }> {
    return this.admin.catalogDelete(kind, id, u);
  }

  /** Convierte errores de zod lanzados dentro del servicio en 400 con `errors`. */
  private async catalogCall<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof z.ZodError) {
        const errors: Record<string, string[]> = {};
        for (const i of e.issues) (errors[i.path.join(".") || "_"] ??= []).push(i.message);
        throw new BadRequestException({ message: "Revisa los datos enviados", errors });
      }
      throw e;
    }
  }
}
