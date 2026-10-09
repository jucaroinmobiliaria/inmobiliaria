import { Controller, Get, Header, Query, Req } from "@nestjs/common";
import { type AuthedRequest, Public } from "../../common/decorators.js";
import { ZodPipe, z } from "../../common/zod.js";
import type { HomeData, LandingData, SitemapEntry } from "../../contract.js";
import { PublicationsReadService } from "../publications/publications-read.service.js";

const landingSchema = z.object({
  operation: z.enum(["SALE", "RENT"]).catch("SALE"),
  type: z.string().trim().toLowerCase().max(60).optional(),
  city: z.string().trim().toLowerCase().max(60).optional(),
  neighborhood: z.string().trim().toLowerCase().max(80).optional(),
});

@Controller()
export class SeoController {
  constructor(private readonly read: PublicationsReadService) {}

  @Public() @Get("home") @Header("Cache-Control", "private, no-cache")
  home(@Req() req: AuthedRequest): Promise<HomeData> {
    return this.read.home(req.user);
  }

  @Public() @Get("landing") @Header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  landing(@Query(new ZodPipe(landingSchema)) q: z.infer<typeof landingSchema>): Promise<LandingData> {
    return this.read.landing(q);
  }

  @Public() @Get("seo/sitemap") @Header("Cache-Control", "public, max-age=300")
  sitemap(): Promise<SitemapEntry[]> {
    return this.read.sitemap();
  }
}
