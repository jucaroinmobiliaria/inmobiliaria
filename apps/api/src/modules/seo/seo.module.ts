import { Module } from "@nestjs/common";
import { PublicationsModule } from "../publications/publications.module.js";
import { SeoController } from "./seo.controller.js";

@Module({ imports: [PublicationsModule], controllers: [SeoController] })
export class SeoModule {}
