import { Module } from "@nestjs/common";
import { PublicationsModule } from "../publications/publications.module.js";
import { FavoritesController } from "./favorites.controller.js";
import { FavoritesService } from "./favorites.service.js";

@Module({ imports: [PublicationsModule], controllers: [FavoritesController], providers: [FavoritesService] })
export class FavoritesModule {}
