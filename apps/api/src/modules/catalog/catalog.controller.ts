import { BadRequestException, Body, Controller, Get, Header, HttpCode, Post, Query } from "@nestjs/common";
import { Auth, Public } from "../../common/decorators.js";
import { ZodPipe } from "../../common/zod.js";
import type { Catalog, CatalogCityHit, CatalogNeighborhood, SuggestItem } from "../../contract.js";
import { CatalogService } from "./catalog.service.js";
import { type EnsureNeighborhoodDto, ensureNeighborhoodSchema } from "./catalog.dto.js";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public() @Get() @Header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  get(): Promise<Catalog> {
    return this.catalog.get();
  }

  @Public() @Get("suggest") @Header("Cache-Control", "public, max-age=30")
  suggest(@Query("q") q?: string | string[]): Promise<SuggestItem[]> {
    const s = (Array.isArray(q) ? q[0] : q) ?? "";
    return this.catalog.suggest(s.slice(0, 80));
  }

  @Public() @Get("cities") @Header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  cities(@Query("q") q?: string | string[]): Promise<CatalogCityHit[]> {
    const s = (Array.isArray(q) ? q[0] : q) ?? "";
    return this.catalog.searchCities(s.slice(0, 80));
  }

  @Public() @Get("neighborhoods") @Header("Cache-Control", "public, max-age=30, stale-while-revalidate=120")
  neighborhoods(@Query("cityId") cityId?: string | string[], @Query("q") q?: string | string[]): Promise<CatalogNeighborhood[]> {
    const id = (Array.isArray(cityId) ? cityId[0] : cityId) ?? "";
    if (!id) throw new BadRequestException({ message: "Indica la ciudad", errors: { cityId: ["Indica la ciudad"] } });
    const s = (Array.isArray(q) ? q[0] : q) ?? "";
    return this.catalog.listNeighborhoods(id, s.slice(0, 80));
  }

  @Auth() @Post("neighborhoods") @HttpCode(200)
  ensureNeighborhood(@Body(new ZodPipe(ensureNeighborhoodSchema)) dto: EnsureNeighborhoodDto): Promise<CatalogNeighborhood> {
    return this.catalog.ensureNeighborhood(dto.cityId, dto.name);
  }
}
