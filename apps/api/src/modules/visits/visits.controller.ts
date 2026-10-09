import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { type AuthedRequest, type AuthUser, Auth, FormLimit, Me, Public } from "../../common/decorators.js";
import { ZodPipe, z } from "../../common/zod.js";
import type { VisitRow } from "../../contract.js";
import { type CreateVisitDto, type VisitStatusDto, createVisitSchema, listVisitsSchema, visitStatusSchema } from "../inquiries/inquiries.dto.js";
import { VisitsService } from "./visits.service.js";

const idParam = new ZodPipe(z.string().min(1).max(40));

@Controller()
export class VisitsController {
  constructor(private readonly svc: VisitsService) {}

  @Public() @FormLimit() @Post("publications/:id/visits") @HttpCode(201)
  create(@Param("id", idParam) id: string, @Body(new ZodPipe(createVisitSchema)) dto: CreateVisitDto, @Req() req: AuthedRequest): Promise<{ id: string }> {
    return this.svc.create(id, req.user, dto);
  }

  @Auth() @Get("visits")
  list(@Me() u: AuthUser, @Query(new ZodPipe(listVisitsSchema)) q: z.infer<typeof listVisitsSchema>): Promise<VisitRow[]> {
    return this.svc.list(u, q.scope);
  }

  @Auth() @Patch("visits/:id")
  status(@Me() u: AuthUser, @Param("id", idParam) id: string, @Body(new ZodPipe(visitStatusSchema)) dto: VisitStatusDto): Promise<VisitRow> {
    return this.svc.setStatus(id, u, dto);
  }
}
