import { Controller, Get, Header, HttpCode, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { type AuthedRequest, Public } from "../../common/decorators.js";
import { ZodPipe, z } from "../../common/zod.js";
import type { PublicationCard, PublicationDetail, SearchResult } from "../../contract.js";
import { PublicationsReadService } from "./publications-read.service.js";
import { mapSchema, searchSchema, type SearchParams } from "./search.dto.js";

@Controller("publications")
export class PublicationsReadController {
  constructor(private readonly read: PublicationsReadService) {}

  @Public() @Get()
  search(@Query(new ZodPipe(searchSchema)) q: SearchParams, @Req() req: AuthedRequest): Promise<SearchResult> {
    return this.read.search(q, req.user);
  }

  @Public() @Get("map")
  map(@Query(new ZodPipe(mapSchema)) q: SearchParams, @Req() req: AuthedRequest): Promise<{ items: PublicationCard[] }> {
    return this.read.map(q, req.user);
  }

  @Public() @Get("by-code/:code")
  byCode(@Param("code", new ZodPipe(z.string().regex(/^\d{1,9}$/, "Código no válido"))) code: string, @Req() req: AuthedRequest): Promise<PublicationDetail> {
    return this.read.detail(code, req.user);
  }

  @Public() @Get(":id") @Header("Cache-Control", "private, no-cache")
  detail(@Param("id", new ZodPipe(z.string().min(1).max(40))) id: string, @Req() req: AuthedRequest): Promise<PublicationDetail> {
    return this.read.detail(id, req.user);
  }

  @Public() @Post(":id/view") @HttpCode(200)
  async view(@Param("id", new ZodPipe(z.string().min(1).max(40))) id: string, @Req() req: Request & AuthedRequest): Promise<{ ok: true }> {
    await this.read.registerView(id, req.ip ?? "unknown", req.user, req.headers["user-agent"]);
    return { ok: true };
  }
}
