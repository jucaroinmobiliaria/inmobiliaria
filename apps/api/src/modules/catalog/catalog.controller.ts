import { Controller, Get, Header, Query } from "@nestjs/common";
import { Public } from "../../common/decorators.js";
import type { Catalog, SuggestItem } from "../../contract.js";
import { CatalogService } from "./catalog.service.js";

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
}
