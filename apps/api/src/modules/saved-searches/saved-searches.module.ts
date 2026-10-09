import { Module } from "@nestjs/common";
import { PublicationsModule } from "../publications/publications.module.js";
import { SavedSearchesController } from "./saved-searches.controller.js";
import { SavedSearchesService } from "./saved-searches.service.js";

@Module({ imports: [PublicationsModule], controllers: [SavedSearchesController], providers: [SavedSearchesService] })
export class SavedSearchesModule {}
