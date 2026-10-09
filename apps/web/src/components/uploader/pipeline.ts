import { hintsFor, type PhotoHint } from "./types";

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                 */
/* -------------------------------------------------------------------------- */

export const MAX_LONG_SIDE = 2400;
export const MAX_BYTES = 12 * 1024 * 1024;
export const THUMB_LONG_SIDE = 800;
export const MAX_INPUT_BYTES = 100 * 1024 * 1024;
export const INPUT_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";

export type PipelineErrorCode = "type" | "decode" | "size";
export class PipelineError extends Error {
  code: PipelineErrorCode;
  constructor(code: PipelineErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const OK_MIMES = new Set(["image/jpeg", "image/pjpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"]);
const OK_EXT = /\.(jpe?g|jfif|png|webp|avif|heic|heif)$/i;
const HEIC = /heic|heif/i;

export function isImageCandidate(f: File): boolean {
  if (OK_MIMES.has(f.type)) return true;
  if ((f.type === "" || f.type === "application/octet-stream") && OK_EXT.test(f.name)) return true;
  return false;
}

/* -------------------------------------------------------------------------- */
/*  Decodificación (con orientación EXIF)                                       */
/* -------------------------------------------------------------------------- */

interface Decoded { source: CanvasImageSource; width: number; height: number; close: () => void }

async function decode(blob: Blob, name = "La imagen"): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch { /* probamos con <img> */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    if (!img.naturalWidth) throw new Error("vacía");
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    const heic = HEIC.test((blob as File).name ?? "") || HEIC.test(blob.type);
    throw new PipelineError(
      "decode",
      heic
        ? `${name} es HEIC y este navegador no puede leerla. Expórtala como JPG desde tu galería o sube otra.`
        : `No pudimos leer ${name.toLowerCase() === "la imagen" ? "la imagen" : name}. Puede estar dañada o no ser una foto.`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  Canvas / codificación                                                      */
/* -------------------------------------------------------------------------- */

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type AnyCtx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function makeCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function ctx2d(c: AnyCanvas): AnyCtx {
  const ctx = c.getContext("2d") as AnyCtx | null;
  if (!ctx) throw new PipelineError("decode", "Tu navegador no pudo preparar la imagen.");
  return ctx;
}

function canvasToBlob(c: AnyCanvas, type: string, quality: number): Promise<Blob> {
  if ("convertToBlob" in c) return c.convertToBlob({ type, quality });
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), type, quality));
}

let webpOK: boolean | null = null;
function supportsWebP(): boolean {
  if (webpOK !== null) return webpOK;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    webpOK = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch { webpOK = false; }
  return webpOK;
}

async function encode(canvas: AnyCanvas, quality: number): Promise<Blob> {
  const prefer = supportsWebP() ? "image/webp" : "image/jpeg";
  const blob = await canvasToBlob(canvas, prefer, quality);
  if (blob.type === prefer) return blob;
  return canvasToBlob(canvas, "image/jpeg", quality);
}

/* -------------------------------------------------------------------------- */
/*  SHA-256                                                                    */
/* -------------------------------------------------------------------------- */

const hex = (u: Uint8Array) => Array.from(u, (b) => b.toString(16).padStart(2, "0")).join("");

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const ror = (x: number, n: number) => (x >>> n) | (x << (32 - n));

/** SHA-256 en JS puro: solo se usa si `crypto.subtle` no existe (p. ej. HTTP en red local). */
export function sha256Fallback(data: Uint8Array): string {
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const l = data.length;
  const padLen = ((l + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(padLen);
  buf.set(data);
  buf[l] = 0x80;
  const dv = new DataView(buf.buffer);
  const bits = l * 8;
  dv.setUint32(padLen - 8, Math.floor(bits / 2 ** 32));
  dv.setUint32(padLen - 4, bits >>> 0);
  const w = new Uint32Array(64);
  for (let off = 0; off < padLen; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = ror(w[i - 15]!, 7) ^ ror(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = ror(w[i - 2]!, 17) ^ ror(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) | 0;
    }
    let a = H[0]!, b = H[1]!, c = H[2]!, d = H[3]!, e = H[4]!, f = H[5]!, g = H[6]!, h = H[7]!;
    for (let i = 0; i < 64; i++) {
      const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i]! + w[i]!) | 0;
      const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0]! + a) | 0; H[1] = (H[1]! + b) | 0; H[2] = (H[2]! + c) | 0; H[3] = (H[3]! + d) | 0;
    H[4] = (H[4]! + e) | 0; H[5] = (H[5]! + f) | 0; H[6] = (H[6]! + g) | 0; H[7] = (H[7]! + h) | 0;
  }
  return Array.from(H, (x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  if (typeof crypto !== "undefined" && crypto.subtle) {
    return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", buf)));
  }
  return sha256Fallback(new Uint8Array(buf));
}

/* -------------------------------------------------------------------------- */
/*  Procesamiento                                                              */
/* -------------------------------------------------------------------------- */

export interface Processed {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  checksum: string;
  thumb: Blob;
  hints: PhotoHint[];
}

export interface RenderOp {
  rotate?: 0 | 90 | 180 | 270;
  /** Recorte en coordenadas de la imagen YA rotada (píxeles). */
  crop?: { x: number; y: number; w: number; h: number };
  quality?: number;
}

function clampRect(r: { x: number; y: number; w: number; h: number }, W: number, H: number) {
  const x = Math.max(0, Math.min(W - 1, Math.round(r.x)));
  const y = Math.max(0, Math.min(H - 1, Math.round(r.y)));
  const w = Math.max(1, Math.min(W - x, Math.round(r.w)));
  const h = Math.max(1, Math.min(H - y, Math.round(r.h)));
  return { x, y, w, h };
}

async function renderFrom(dec: Decoded, op: RenderOp): Promise<Processed> {
  const rot = op.rotate ?? 0;
  const rw = rot % 180 === 0 ? dec.width : dec.height;
  const rh = rot % 180 === 0 ? dec.height : dec.width;
  const crop = op.crop ? clampRect(op.crop, rw, rh) : { x: 0, y: 0, w: rw, h: rh };
  const scale = Math.min(1, MAX_LONG_SIDE / Math.max(crop.w, crop.h));
  const ow = Math.max(1, Math.round(crop.w * scale));
  const oh = Math.max(1, Math.round(crop.h * scale));

  const canvas = makeCanvas(ow, oh);
  const ctx = ctx2d(canvas);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, ow, oh);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.save();
  ctx.scale(ow / crop.w, oh / crop.h);
  ctx.translate(-crop.x, -crop.y);
  if (rot === 90) { ctx.translate(rw, 0); ctx.rotate(Math.PI / 2); }
  else if (rot === 180) { ctx.translate(rw, rh); ctx.rotate(Math.PI); }
  else if (rot === 270) { ctx.translate(0, rh); ctx.rotate(-Math.PI / 2); }
  ctx.drawImage(dec.source, 0, 0);
  ctx.restore();

  let quality = op.quality ?? 0.82;
  let blob = await encode(canvas, quality);
  for (let i = 0; i < 3 && blob.size > MAX_BYTES; i++) {
    quality -= 0.12;
    blob = await encode(canvas, Math.max(0.4, quality));
  }
  if (blob.size > MAX_BYTES) throw new PipelineError("size", "No pudimos reducir esta foto por debajo de 12 MB.");

  // Miniatura liviana para la cuadrícula (evita decodificar 30 imágenes de 2400 px).
  const ts = Math.min(1, THUMB_LONG_SIDE / Math.max(ow, oh));
  const tw = Math.max(1, Math.round(ow * ts));
  const th = Math.max(1, Math.round(oh * ts));
  const tc = makeCanvas(tw, th);
  const tctx = ctx2d(tc);
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(canvas as CanvasImageSource, 0, 0, tw, th);
  const thumb = await encode(tc, 0.72);

  const checksum = await sha256Hex(blob);
  return { blob, mime: blob.type || "image/jpeg", width: ow, height: oh, checksum, thumb, hints: hintsFor(ow, oh) };
}

/** Pipeline completo de una foto nueva: decodifica (EXIF), reduce a 2400 px, comprime, calcula SHA-256. */
export async function processFile(file: File): Promise<Processed> {
  if (file.size > MAX_INPUT_BYTES) throw new PipelineError("size", `${file.name} pesa más de 100 MB.`);
  if (file.size === 0) throw new PipelineError("decode", `${file.name} está vacía.`);
  const dec = await decode(file, file.name);
  try { return await renderFrom(dec, {}); } finally { dec.close(); }
}

/** Re-procesa un blob ya procesado (rotar / recortar). */
export async function renderBlob(source: Blob, op: RenderOp): Promise<Processed> {
  const dec = await decode(source);
  try { return await renderFrom(dec, { quality: 0.88, ...op }); } finally { dec.close(); }
}

/** Decodifica una vez y devuelve un bitmap reutilizable (para el editor de recorte). */
export async function openForEditing(source: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  return decode(source);
}

/* -------------------------------------------------------------------------- */
/*  Archivos arrastrados (incluye carpetas)                                    */
/* -------------------------------------------------------------------------- */

type EntryItem = DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null };

export async function collectDroppedFiles(dt: DataTransfer): Promise<File[]> {
  const items = Array.from(dt.items ?? []) as EntryItem[];
  // Importante: webkitGetAsEntry debe llamarse de forma síncrona dentro del evento.
  const entries = items.filter((i) => i.kind === "file").map((i) => i.webkitGetAsEntry?.() ?? null);
  const fallback = Array.from(dt.files ?? []);
  if (!entries.length || entries.every((e) => !e)) return fallback;

  const out: File[] = [];
  const walk = async (e: FileSystemEntry, depth: number): Promise<void> => {
    if (out.length >= 300) return;
    if (e.isFile) {
      try { out.push(await new Promise<File>((res, rej) => (e as FileSystemFileEntry).file(res, rej))); } catch { /* ignora archivos ilegibles */ }
    } else if (e.isDirectory && depth < 4) {
      const reader = (e as FileSystemDirectoryEntry).createReader();
      let batch: FileSystemEntry[] = [];
      do {
        batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej)).catch(() => []);
        for (const c of batch) await walk(c, depth + 1);
      } while (batch.length);
    }
  };
  for (const e of entries) if (e) await walk(e, 0);
  return out.length ? out : fallback;
}

/* -------------------------------------------------------------------------- */
/*  Subida con progreso real (XMLHttpRequest)                                   */
/* -------------------------------------------------------------------------- */

export class UploadError extends Error {
  status: number;
  network: boolean;
  constructor(message: string, status: number, network = false) {
    super(message);
    this.status = status;
    this.network = network;
  }
}

export function putBlob(
  url: string,
  blob: Blob,
  headers: Record<string, string>,
  opts: { onProgress?: (p: number) => void; signal?: AbortSignal } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.timeout = 120_000;
    for (const [k, v] of Object.entries(headers ?? {})) {
      try { xhr.setRequestHeader(k, v); } catch { /* cabeceras prohibidas */ }
    }
    if (!headers || !Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) xhr.setRequestHeader("Content-Type", blob.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { opts.onProgress?.(1); resolve(); }
      else reject(new UploadError(`El servidor respondió ${xhr.status}`, xhr.status));
    };
    xhr.onerror = () => reject(new UploadError("Sin conexión", 0, true));
    xhr.ontimeout = () => reject(new UploadError("La subida tardó demasiado", 0, true));
    xhr.onabort = () => reject(new DOMException("Cancelado", "AbortError"));
    if (opts.signal) {
      if (opts.signal.aborted) { reject(new DOMException("Cancelado", "AbortError")); return; }
      opts.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(blob);
  });
}
