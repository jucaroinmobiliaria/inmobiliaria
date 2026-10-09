import { Controller, Delete, Get, Param, Put } from "@nestjs/common";
import { type AuthUser, Auth, Me } from "../../common/decorators.js";
import { ZodPipe, z } from "../../common/zod.js";
import type { PublicationCard } from "../../contract.js";
import { FavoritesService } from "./favorites.service.js";

const idParam = new ZodPipe(z.string().min(1).max(40));

@Controller("favorites")
export class FavoritesController {
  constructor(private readonly favs: FavoritesService) {}

  @Auth() @Get()
  list(@Me() u: AuthUser): Promise<PublicationCard[]> {
    return this.favs.list(u.id);
  }

  @Auth() @Get("ids")
  ids(@Me() u: AuthUser): Promise<{ ids: string[] }> {
    return this.favs.ids(u.id);
  }

  @Auth() @Put(":publicationId")
  add(@Me() u: AuthUser, @Param("publicationId", idParam) id: string): Promise<{ isFavorite: true }> {
    return this.favs.add(u.id, id);
  }

  @Auth() @Delete(":publicationId")
  remove(@Me() u: AuthUser, @Param("publicationId", idParam) id: string): Promise<{ isFavorite: false }> {
    return this.favs.remove(u.id, id);
  }
}
