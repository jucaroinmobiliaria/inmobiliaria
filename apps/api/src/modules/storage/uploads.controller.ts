import { BadRequestException, Controller, ForbiddenException, HttpCode, Param, Put, Query, Req } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { env } from "../../common/config.js";
import { stripImageMetadata } from "../../common/image-metadata.js";
import { Public } from "../../common/decorators.js";
import { KEY_RE, MAX_IMAGE_BYTES, sniffMime, StorageService } from "./storage.service.js";

async function readBody(req: Request, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    total += chunk.length;
    if (total > limit) throw new BadRequestException(`El archivo supera el máximo permitido (${Math.round(limit / 1024 / 1024)} MB)`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Solo driver `local`: recibe el binario con URL firmada (HMAC) y lo guarda en UPLOAD_DIR. */
@Controller("uploads/local")
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Public() @SkipThrottle() @Put("*key") @HttpCode(200)
  async put(@Param("key") rawKey: string | string[], @Query() q: Record<string, string>, @Req() req: Request): Promise<{ ok: true }> {
    if (env.STORAGE_DRIVER !== "local") throw new ForbiddenException("La subida local no está habilitada");
    const key = Array.isArray(rawKey) ? rawKey.join("/") : rawKey;
    if (!KEY_RE.test(key)) throw new BadRequestException("Clave de archivo no válida");
    const signed = this.storage.verifyLocalUpload(key, q);
    if (!signed) throw new ForbiddenException("La URL de subida no es válida o venció");
    const contentType = (req.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();
    if (contentType !== signed.mime) throw new BadRequestException("El tipo de archivo no coincide con el solicitado");
    const declared = Number(req.headers["content-length"] ?? 0);
    if (declared > MAX_IMAGE_BYTES) throw new BadRequestException("El archivo supera el máximo permitido (12 MB)");
    const body = await readBody(req, Math.min(MAX_IMAGE_BYTES, signed.size + 1024));
    if (body.length === 0) throw new BadRequestException("El archivo está vacío");
    if (sniffMime(body) !== signed.mime) throw new BadRequestException("El contenido no es una imagen válida del tipo indicado");
    // Se quitan GPS/EXIF/XMP: una foto con la ubicación exacta delataría una dirección oculta.
    await this.storage.saveLocal(key, stripImageMetadata(body, signed.mime));
    return { ok: true };
  }
}
