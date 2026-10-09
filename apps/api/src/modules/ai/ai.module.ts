import { Body, Controller, HttpCode, Module, Post } from "@nestjs/common";
import { Auth, AuthLimit } from "../../common/decorators.js";
import { ZodPipe } from "../../common/zod.js";
import type { AiDescriptionResponse } from "../../contract.js";
import { AiService, type AiDto, aiSchema } from "./ai.service.js";

@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Auth() @AuthLimit() @Post("description") @HttpCode(200)
  description(@Body(new ZodPipe(aiSchema)) dto: AiDto): Promise<AiDescriptionResponse> {
    return this.ai.generate(dto);
  }
}

@Module({ controllers: [AiController], providers: [AiService] })
export class AiModule {}
