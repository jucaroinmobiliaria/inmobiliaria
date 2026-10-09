import type { ImageDTO } from "@/lib/types";

export type PhotoStatus =
  | "processing"  // leyendo, corrigiendo orientación, reduciendo y comprimiendo
  | "queued"      // lista, esperando turno de subida
  | "uploading"   // PUT con progreso real
  | "confirming"  // confirmando con el servidor
  | "ready"       // guardada
  | "error"       // falló un paso: se puede reintentar o quitar
  | "stale"       // quedó PENDING de una sesión anterior
  | "duplicate";  // ya existía (mismo checksum)

export type PhotoStage = "process" | "presign" | "upload" | "confirm" | "replace";
export type PhotoHint = "lowres" | "portrait";

export interface PhotoItem {
  /** Clave estable del cliente (React key, drag & drop). */
  key: string;
  imageId: string | null;
  status: PhotoStatus;
  /** 0..1, progreso de la subida actual (también de reemplazos). */
  progress: number;
  name: string;
  /** Miniatura (blob local o URL del servidor). */
  thumb: string | null;
  /** URL pública guardada en el servidor. */
  url: string | null;
  width: number | null;
  height: number | null;
  isCover: boolean;
  roomLabel: string | null;
  caption: string | null;
  checksum: string | null;
  error: string | null;
  stage: PhotoStage | null;
  hints: PhotoHint[];
  /** Edición en curso sobre una foto ya guardada. */
  busy: "rotate" | "crop" | "replace" | null;
}

export interface UndoEntry { id: number; keys: string[]; label: string }

export interface UploaderState {
  items: PhotoItem[];
  announcement: string;
  undo: UndoEntry | null;
  /** Operaciones de red activas (subidas, confirmaciones, borrados, orden…). */
  working: number;
}

export interface UploaderNotice { tone: "success" | "error" | "info"; text: string }

export const ROOM_LABELS = [
  "Fachada", "Sala", "Cocina", "Habitación", "Baño", "Balcón/Terraza", "Zonas comunes", "Exterior", "Otro",
] as const;
export type RoomLabel = (typeof ROOM_LABELS)[number];

export const MAX_PHOTOS = 40;

export function imageToItem(img: ImageDTO): PhotoItem {
  const pending = img.status === "PENDING";
  return {
    key: img.id,
    imageId: img.id,
    status: pending ? "stale" : "ready",
    progress: pending ? 0 : 1,
    name: img.roomLabel ?? "Foto",
    thumb: pending ? null : img.url,
    url: img.url,
    width: img.width,
    height: img.height,
    isCover: img.isCover,
    roomLabel: img.roomLabel,
    caption: img.caption,
    checksum: null,
    error: pending ? "Subida incompleta" : null,
    stage: pending ? "upload" : null,
    hints: hintsFor(img.width, img.height),
    busy: null,
  };
}

export function hintsFor(w: number | null, h: number | null): PhotoHint[] {
  const out: PhotoHint[] = [];
  if (w && h) {
    if (Math.max(w, h) < 1200 || w < 1000) out.push("lowres");
    if (h > w * 1.15) out.push("portrait");
  }
  return out;
}

export const isReady = (i: PhotoItem) => i.status === "ready";
export const isBusyItem = (i: PhotoItem) => i.status === "processing" || i.status === "queued" || i.status === "uploading" || i.status === "confirming" || i.busy !== null;
