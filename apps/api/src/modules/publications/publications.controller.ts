import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { type AuthUser, Auth, Me } from "../../common/decorators.js";
import { ZodPipe, z } from "../../common/zod.js";
import type { DraftDTO, MyPublicationRow } from "../../contract.js";
import { type CreateDraftDto, type DraftInputDto, createDraftSchema, draftInputSchema } from "./dto.js";
import { PublicationsService } from "./publications.service.js";

const idParam = new ZodPipe(z.string().min(1).max(40));

@Controller()
export class PublicationsController {
  constructor(private readonly svc: PublicationsService) {}

  @Auth() @Post("publications") @HttpCode(201)
  create(@Me() u: AuthUser, @Body(new ZodPipe(createDraftSchema)) dto: CreateDraftDto): Promise<DraftDTO> {
    return this.svc.create(u, dto);
  }

  @Auth() @Get("me/publications")
  listMine(@Me() u: AuthUser, @Query("status") status?: string): Promise<MyPublicationRow[]> {
    return this.svc.listMine(u, Array.isArray(status) ? status.join(",") : status);
  }

  @Auth() @Get("me/publications/:id")
  getMine(@Me() u: AuthUser, @Param("id", idParam) id: string): Promise<DraftDTO> {
    return this.svc.getMine(id, u);
  }

  @Auth() @Patch("publications/:id")
  patch(@Me() u: AuthUser, @Param("id", idParam) id: string, @Body(new ZodPipe(draftInputSchema)) dto: DraftInputDto): Promise<DraftDTO> {
    return this.svc.patch(id, u, dto);
  }

  @Auth() @Post("publications/:id/submit") @HttpCode(200)
  submit(@Me() u: AuthUser, @Param("id", idParam) id: string): Promise<DraftDTO> {
    return this.svc.submit(id, u);
  }

  @Auth() @Post("publications/:id/pause") @HttpCode(200)
  pause(@Me() u: AuthUser, @Param("id", idParam) id: string): Promise<DraftDTO> {
    return this.svc.pause(id, u);
  }

  @Auth() @Post("publications/:id/resume") @HttpCode(200)
  resume(@Me() u: AuthUser, @Param("id", idParam) id: string): Promise<DraftDTO> {
    return this.svc.resume(id, u);
  }

  @Auth() @Post("publications/:id/mark-closed") @HttpCode(200)
  markClosed(@Me() u: AuthUser, @Param("id", idParam) id: string): Promise<DraftDTO> {
    return this.svc.markClosed(id, u);
  }

  @Auth() @Post("publications/:id/duplicate") @HttpCode(201)
  duplicate(@Me() u: AuthUser, @Param("id", idParam) id: string): Promise<DraftDTO> {
    return this.svc.duplicate(id, u);
  }

  @Auth() @Post("publications/:id/renew") @HttpCode(200)
  renew(@Me() u: AuthUser, @Param("id", idParam) id: string): Promise<DraftDTO> {
    return this.svc.renew(id, u);
  }

  @Auth() @Delete("publications/:id")
  remove(@Me() u: AuthUser, @Param("id", idParam) id: string): Promise<{ ok: true }> {
    return this.svc.remove(id, u);
  }
}
