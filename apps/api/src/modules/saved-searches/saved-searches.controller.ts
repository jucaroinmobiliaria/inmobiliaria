import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { type AuthUser, Auth, Me, Public } from "../../common/decorators.js";
import { ZodPipe, z } from "../../common/zod.js";
import type { SavedSearchDTO } from "../../contract.js";
import { type CreateSavedSearchDto, createSavedSearchSchema } from "./dto.js";
import { SavedSearchesService } from "./saved-searches.service.js";

@Controller()
export class SavedSearchesController {
  constructor(private readonly svc: SavedSearchesService) {}

  @Auth() @Get("saved-searches")
  list(@Me() u: AuthUser): Promise<SavedSearchDTO[]> {
    return this.svc.list(u.id);
  }

  @Auth() @Post("saved-searches") @HttpCode(201)
  create(@Me() u: AuthUser, @Body(new ZodPipe(createSavedSearchSchema)) dto: CreateSavedSearchDto): Promise<SavedSearchDTO> {
    return this.svc.create(u.id, dto);
  }

  @Auth() @Delete("saved-searches/:id")
  remove(@Me() u: AuthUser, @Param("id", new ZodPipe(z.string().min(1).max(40))) id: string): Promise<{ ok: true }> {
    return this.svc.remove(u.id, id);
  }

  /** Cron: header `x-cron-secret` = CRON_SECRET (o `Authorization: Bearer <CRON_SECRET>`). */
  @Public() @SkipThrottle() @Post("cron/saved-searches") @HttpCode(200)
  async cron(@Headers("x-cron-secret") secret?: string, @Headers("authorization") auth?: string): Promise<{ sent: number; expired: number }> {
    this.svc.assertCron(secret, auth);
    return this.svc.runAlerts();
  }

  @Public() @SkipThrottle() @Get("cron/saved-searches")
  async cronGet(@Headers("x-cron-secret") secret?: string, @Headers("authorization") auth?: string): Promise<{ sent: number; expired: number }> {
    this.svc.assertCron(secret, auth);
    return this.svc.runAlerts();
  }
}
