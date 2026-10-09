import { Module } from "@nestjs/common";
import { ImagesController } from "./images.controller.js";
import { ImagesService } from "./images.service.js";
import { PublicationsController } from "./publications.controller.js";
import { PublicationsReadController } from "./publications-read.controller.js";
import { PublicationsReadService } from "./publications-read.service.js";
import { PublicationsService } from "./publications.service.js";
import { SearchEngine } from "./search-engine.service.js";

@Module({
  controllers: [PublicationsReadController, PublicationsController, ImagesController],
  providers: [PublicationsReadService, PublicationsService, ImagesService, SearchEngine],
  exports: [PublicationsReadService, PublicationsService, SearchEngine],
})
export class PublicationsModule {}
