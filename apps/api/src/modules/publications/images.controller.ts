import { Body, Controller, Delete, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { type AuthUser, Auth, Me } from "../../common/decorators.js";
import { ZodPipe, z } from "../../common/zod.js";
import type { ImageDTO, PresignedUpload } from "../../contract.js";
import {
  type ConfirmDto, type PatchImageDto, type PresignDto, type ReorderDto, type ReplaceDto,
  confirmSchema, patchImageSchema, presignSchema, reorderSchema, replaceSchema,
} from "./dto.js";
import { ImagesService } from "./images.service.js";

const idParam = new ZodPipe(z.string().min(1).max(60));

@Controller("publications/:id/images")
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  @Auth() @Post("presign") @HttpCode(200)
  presign(@Me() u: AuthUser, @Param("id", idParam) id: string, @Body(new ZodPipe(presignSchema)) dto: PresignDto): Promise<PresignedUpload[]> {
    return this.images.presign(id, u, dto);
  }

  @Auth() @Post("confirm") @HttpCode(200)
  confirm(@Me() u: AuthUser, @Param("id", idParam) id: string, @Body(new ZodPipe(confirmSchema)) dto: ConfirmDto): Promise<ImageDTO[]> {
    return this.images.confirm(id, u, dto);
  }

  @Auth() @Patch("reorder")
  reorder(@Me() u: AuthUser, @Param("id", idParam) id: string, @Body(new ZodPipe(reorderSchema)) dto: ReorderDto): Promise<ImageDTO[]> {
    return this.images.reorder(id, u, dto);
  }

  @Auth() @Patch(":imageId")
  patch(@Me() u: AuthUser, @Param("id", idParam) id: string, @Param("imageId", idParam) imageId: string, @Body(new ZodPipe(patchImageSchema)) dto: PatchImageDto): Promise<ImageDTO> {
    return this.images.patch(id, imageId, u, dto);
  }

  @Auth() @Post(":imageId/replace") @HttpCode(200)
  replace(@Me() u: AuthUser, @Param("id", idParam) id: string, @Param("imageId", idParam) imageId: string, @Body(new ZodPipe(replaceSchema)) dto: ReplaceDto): Promise<PresignedUpload> {
    return this.images.replace(id, imageId, u, dto);
  }

  @Auth() @Delete(":imageId")
  remove(@Me() u: AuthUser, @Param("id", idParam) id: string, @Param("imageId", idParam) imageId: string): Promise<{ ok: true }> {
    return this.images.remove(id, imageId, u);
  }
}
