import { createHmac, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Global, Injectable, Logger, Module } from "@nestjs/common";
import { env } from "../../common/config.js";
import { stripImageMetadata } from "../../common/image-metadata.js";

export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];
export const MIME_EXT: Record<AllowedMime, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const KEY_RE = /^properties\/[A-Za-z0-9_-]{6,40}\/[A-Za-z0-9_-]{6,60}\.(jpg|png|webp|avif)$/;
const URL_TTL_S = 15 * 60;

export interface PresignResult {
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
}

/** Firma el PUT del driver local. */
function sign(key: string, exp: number, mime: string, size: number): string {
  return createHmac("sha256", env.JWT_SECRET).update(`upload|${key}|${exp}|${mime}|${size}`).digest("hex");
}

/** Detecta el tipo real por los primeros bytes del archivo. */
export function sniffMime(b: Buffer): AllowedMime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (b.length >= 12 && b.subarray(4, 8).toString("ascii") === "ftyp" && /^(avif|avis)$/.test(b.subarray(8, 12).toString("ascii"))) return "image/avif";
  return null;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger("Storage");
  private s3: S3Client | null = null;

  get driver(): "local" | "s3" {
    return env.STORAGE_DRIVER;
  }

  get uploadDir(): string {
    return path.resolve(env.UPLOAD_DIR);
  }

  localPath(key: string): string {
    if (!KEY_RE.test(key)) throw new Error("Clave de archivo no válida");
    const full = path.resolve(this.uploadDir, key);
    if (!full.startsWith(this.uploadDir + path.sep)) throw new Error("Clave de archivo no válida");
    return full;
  }

  /** Base pública del API para URLs de subida/descarga del driver local. */
  private apiBase(): string {
    return env.API_PUBLIC_URL ? env.API_PUBLIC_URL.replace(/\/$/, "") : "";
  }

  publicUrl(key: string): string {
    if (this.driver === "s3") {
      if (env.S3_PUBLIC_URL) return `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
      if (env.S3_ENDPOINT && env.S3_BUCKET) return `${env.S3_ENDPOINT.replace(/\/$/, "")}/${env.S3_BUCKET}/${key}`;
      return `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
    }
    if (env.API_PUBLIC_URL) return `${this.apiBase()}/files/${key}`;
    return `${env.WEB_PUBLIC_URL ? env.webUrl : ""}/backend/files/${key}`;
  }

  private client(): S3Client {
    if (!this.s3) {
      if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) throw new Error("Faltan variables S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY");
      this.s3 = new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        forcePathStyle: Boolean(env.S3_ENDPOINT) || env.S3_FORCE_PATH_STYLE,
        credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
        // Evita sumas de verificación automáticas que los navegadores no calculan en URLs prefirmadas.
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      });
    }
    return this.s3;
  }

  async presignPut(key: string, mime: AllowedMime, size: number): Promise<PresignResult> {
    if (this.driver === "s3") {
      const url = await getSignedUrl(this.client(), new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: mime }), { expiresIn: URL_TTL_S });
      return { uploadUrl: url, method: "PUT", headers: { "Content-Type": mime } };
    }
    const exp = Math.floor(Date.now() / 1000) + URL_TTL_S;
    const sig = sign(key, exp, mime, size);
    return { uploadUrl: `${this.apiBase()}/uploads/local/${key}?exp=${exp}&size=${size}&mime=${encodeURIComponent(mime)}&sig=${sig}`, method: "PUT", headers: { "Content-Type": mime } };
  }

  /** Verifica la firma del PUT local. Devuelve el límite de tamaño y el mime firmados. */
  verifyLocalUpload(key: string, q: { exp?: string; size?: string; mime?: string; sig?: string }): { size: number; mime: AllowedMime } | null {
    const exp = Number(q.exp);
    const size = Number(q.size);
    const mime = q.mime ?? "";
    if (!Number.isFinite(exp) || !Number.isFinite(size) || !q.sig || !ALLOWED_MIME.includes(mime as AllowedMime)) return null;
    if (exp < Math.floor(Date.now() / 1000)) return null;
    const expected = Buffer.from(sign(key, exp, mime, size), "hex");
    let given: Buffer;
    try {
      given = Buffer.from(q.sig, "hex");
    } catch {
      return null;
    }
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    return { size, mime: mime as AllowedMime };
  }

  async saveLocal(key: string, data: Buffer): Promise<void> {
    const file = this.localPath(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  }

  async head(key: string): Promise<{ size: number; contentType?: string } | null> {
    try {
      if (this.driver === "s3") {
        const r = await this.client().send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
        return { size: Number(r.ContentLength ?? 0), contentType: r.ContentType };
      }
      const st = await fs.stat(this.localPath(key));
      return st.isFile() ? { size: st.size } : null;
    } catch {
      return null;
    }
  }

  /**
   * Driver s3: el navegador sube directo al bucket, así que al confirmar se descarga la foto, se le quitan los metadatos
   * (GPS/EXIF/XMP) y se vuelve a subir si cambió. Si algo falla se deja la foto como está (y se avisa en el log).
   */
  async sanitizeRemote(key: string, mime: string): Promise<void> {
    if (this.driver !== "s3" || !ALLOWED_MIME.includes(mime as AllowedMime)) return;
    try {
      const got = await this.client().send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
      if (!got.Body) return;
      const original = Buffer.from(await got.Body.transformToByteArray());
      const clean = stripImageMetadata(original, mime);
      if (clean.length !== original.length) {
        await this.client().send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: clean, ContentType: mime }));
      }
    } catch (err) {
      this.logger.warn(`No se pudieron limpiar los metadatos de ${key}: ${(err as Error).message}`);
    }
  }

  /** Lee los primeros bytes (solo driver local) para validar el tipo real del archivo. */
  async readHead(key: string, bytes = 16): Promise<Buffer | null> {
    if (this.driver !== "local") return null;
    try {
      const fh = await fs.open(this.localPath(key), "r");
      try {
        const buf = Buffer.alloc(bytes);
        const { bytesRead } = await fh.read(buf, 0, bytes, 0);
        return buf.subarray(0, bytesRead);
      } finally {
        await fh.close();
      }
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    if (!key.startsWith("properties/")) return; // nunca se borran fotos de ejemplo (seed/…) ni claves ajenas
    try {
      if (this.driver === "s3") await this.client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
      else await fs.rm(this.localPath(key), { force: true });
    } catch (err) {
      this.logger.warn(`No se pudo borrar ${key}: ${(err as Error).message}`);
    }
  }
}

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
