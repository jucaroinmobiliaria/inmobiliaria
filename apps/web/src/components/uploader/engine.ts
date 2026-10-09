import { api, ApiException } from "@/lib/api";
import type { ImageDTO, PresignedUpload, PresignRequestFile } from "@/lib/types";
import {
  isImageCandidate, openForEditing, PipelineError, processFile, putBlob, renderBlob, UploadError, type Processed, type RenderOp,
} from "./pipeline";
import {
  imageToItem, MAX_PHOTOS,
  type PhotoItem, type PhotoStage, type UndoEntry, type UploaderNotice, type UploaderState,
} from "./types";

type Listener = () => void;

/** Limita la concurrencia de tareas asíncronas. */
class Pool {
  private active = 0;
  private queue: Array<() => void> = [];
  constructor(private limit: number) {}
  run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        this.active++;
        fn().then(resolve, reject).finally(() => {
          this.active--;
          this.queue.shift()?.();
        });
      };
      if (this.active < this.limit) start();
      else this.queue.push(start);
    });
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
const messageOf = (e: unknown, fallback: string) => (e instanceof ApiException || e instanceof UploadError || e instanceof PipelineError ? e.message : fallback);
const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

export interface EngineHandlers {
  onNotice?: (n: UploaderNotice) => void;
  /** El servidor cambió algo que afecta a `completion` (fotos listas, portada…). */
  onServerChange?: () => void;
}

const blank = (key: string, name: string): PhotoItem => ({
  key, imageId: null, status: "processing", progress: 0, name, thumb: null, url: null, width: null, height: null,
  isCover: false, roomLabel: null, caption: null, checksum: null, error: null, stage: null, hints: [], busy: null,
});

/**
 * Motor de subida de fotos. Imperativo (cola, reintentos, orden, deshacer) y expuesto a React con
 * useSyncExternalStore: cada cambio genera un estado inmutable nuevo, y solo cambian los ítems tocados.
 */
export class UploadEngine {
  private state: UploaderState;
  private listeners = new Set<Listener>();
  private handlers: EngineHandlers = {};
  private pid: string;

  private files = new Map<string, File>();
  private blobs = new Map<string, Blob>();
  private thumbUrls = new Map<string, string>();
  private presigned = new Map<string, PresignedUpload>();
  private aborts = new Map<string, AbortController>();
  private processPool = new Pool(2);
  private uploadPool = new Pool(3);

  private presignQ: string[] = [];
  private presignTimer: ReturnType<typeof setTimeout> | null = null;
  private confirmQ: string[] = [];
  private confirmTimer: ReturnType<typeof setTimeout> | null = null;

  private serverOrder: string[];
  private serverCover: string | null;
  private orderTimer: ReturnType<typeof setTimeout> | null = null;
  private orderInFlight = false;
  private orderDirty = false;

  private undoSeq = 0;
  private undoGroups = new Map<number, { items: PhotoItem[]; indices: number[]; timer: ReturnType<typeof setTimeout> }>();
  private replacing = new Set<string>();
  private replaceDirty = new Set<string>();
  private dupCount = 0;
  private dupTimer: ReturnType<typeof setTimeout> | null = null;
  private liveToggle = false;
  private teardown: ReturnType<typeof setTimeout> | null = null;
  private recovered = false;

  constructor(publicationId: string, initialImages: ImageDTO[]) {
    this.pid = publicationId;
    const items = [...initialImages].sort((a, b) => a.position - b.position).map(imageToItem);
    this.state = { items, announcement: "", undo: null, working: 0 };
    this.normalizeCover(false);
    this.serverOrder = items.filter((i) => i.status === "ready" && i.imageId).map((i) => i.imageId!);
    this.serverCover = initialImages.find((i) => i.isCover && i.status === "READY")?.id ?? null;
  }

  /* ----------------------------- store ---------------------------------- */

  subscribe = (l: Listener) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  getSnapshot = () => this.state;
  setHandlers(h: EngineHandlers) { this.handlers = h; }

  private emit() { this.listeners.forEach((l) => l()); }
  private set(next: Partial<UploaderState>) { this.state = { ...this.state, ...next }; this.emit(); }
  private find(key: string) { return this.state.items.find((i) => i.key === key); }
  private update(key: string, patch: Partial<PhotoItem>) {
    let changed = false;
    const items = this.state.items.map((i) => {
      if (i.key !== key) return i;
      changed = true;
      return { ...i, ...patch };
    });
    if (changed) this.set({ items });
  }
  private begin() { this.state = { ...this.state, working: this.state.working + 1 }; this.emit(); }
  private end() { this.state = { ...this.state, working: Math.max(0, this.state.working - 1) }; this.emit(); }
  private notice(tone: UploaderNotice["tone"], text: string) { this.handlers.onNotice?.({ tone, text }); }
  private changed() { this.handlers.onServerChange?.(); }
  announce(text: string) {
    this.liveToggle = !this.liveToggle;
    this.set({ announcement: text + (this.liveToggle ? "​" : "") });
  }

  /* --------------------------- ciclo de vida ----------------------------- */

  attach() {
    if (this.teardown) { clearTimeout(this.teardown); this.teardown = null; }
    if (!this.recovered) {
      this.recovered = true;
      void this.recoverStale();
    }
  }

  detach() {
    // Al salir de la pantalla confirmamos los borrados pendientes (no se pierde el "deshacer" si vuelve de inmediato).
    this.commitAllUndo();
    this.teardown = setTimeout(() => {
      this.thumbUrls.forEach((u) => URL.revokeObjectURL(u));
      this.thumbUrls.clear();
    }, 1500);
  }

  /** Para `pagehide`: manda los borrados pendientes con keepalive. */
  flushOnHide() {
    this.undoGroups.forEach((g, id) => {
      clearTimeout(g.timer);
      for (const it of g.items) {
        if (!it.imageId) continue;
        try { void fetch(`/backend/publications/${this.pid}/images/${it.imageId}`, { method: "DELETE", keepalive: true, credentials: "include" }); } catch { /* noop */ }
      }
      this.undoGroups.delete(id);
    });
  }

  /** Fotos que todavía no terminan de llegar al servidor (si el usuario sale, se perderían). */
  hasUploadsInFlight() {
    return this.state.items.some((i) => i.status === "processing" || i.status === "queued" || i.status === "uploading" || i.status === "confirming" || i.busy !== null);
  }

  /** Hay algo subiéndose o confirmándose (para avisar antes de cerrar la pestaña). */
  hasActiveWork() {
    return this.state.items.some((i) => i.status === "processing" || i.status === "queued" || i.status === "uploading" || i.status === "confirming" || i.busy !== null)
      || this.undoGroups.size > 0 || this.orderTimer !== null || this.orderInFlight;
  }

  /* ----------------------------- agregar -------------------------------- */

  addFiles(input: File[]) {
    if (!input.length) return;
    const cands = input.filter(isImageCandidate);
    const skipped = input.length - cands.length;
    if (skipped) {
      const first = input.find((f) => !isImageCandidate(f));
      this.notice("error", skipped === 1 ? `“${first?.name}” no es una imagen compatible. Usa JPG, PNG, WEBP, AVIF o HEIC.` : `${skipped} archivos no son imágenes compatibles (usa JPG, PNG, WEBP, AVIF o HEIC).`);
    }
    if (!cands.length) return;

    const used = this.state.items.filter((i) => i.status !== "duplicate").length;
    const room = MAX_PHOTOS - used;
    if (room <= 0) { this.notice("error", `Llegaste al máximo de ${MAX_PHOTOS} fotos por aviso.`); return; }
    const take = cands.slice(0, room);
    if (cands.length > room) this.notice("info", `Solo había espacio para ${room} más (máximo ${MAX_PHOTOS}). Agregamos las primeras ${room}.`);

    const items = take.map((f) => blank(uid(), f.name));
    take.forEach((f, i) => this.files.set(items[i]!.key, f));
    this.set({ items: [...this.state.items, ...items] });
    this.announce(`${items.length} ${items.length === 1 ? "foto agregada" : "fotos agregadas"}, preparándolas para subir.`);
    for (const it of items) void this.processPool.run(() => this.process(it.key));
  }

  private async process(key: string) {
    const file = this.files.get(key);
    if (!file || !this.find(key)) { this.files.delete(key); return; }
    this.begin();
    try {
      const out = await processFile(file);
      this.files.delete(key);
      if (!this.find(key)) return;
      const dup = this.state.items.find((i) => i.key !== key && i.checksum === out.checksum && i.status !== "duplicate" && i.status !== "error");
      this.adoptProcessed(key, out);
      if (dup) { this.markDuplicate(key); return; }
      this.update(key, { status: "queued", stage: "presign", progress: 0, error: null });
      this.presignQ.push(key);
      this.schedulePresign();
    } catch (e) {
      this.files.delete(key);
      this.update(key, { status: "error", stage: "process", error: e instanceof PipelineError ? e.message : `No pudimos preparar “${file.name}”.` });
    } finally {
      this.end();
    }
  }

  private adoptProcessed(key: string, out: Processed) {
    const old = this.thumbUrls.get(key);
    const thumb = URL.createObjectURL(out.thumb);
    this.thumbUrls.set(key, thumb);
    this.blobs.set(key, out.blob);
    this.update(key, { thumb, width: out.width, height: out.height, checksum: out.checksum, hints: out.hints });
    if (old) URL.revokeObjectURL(old);
  }

  private markDuplicate(key: string) {
    this.discardLocal(key, false);
    this.update(key, { status: "duplicate", error: "Ya la habías subido", progress: 1 });
    this.dupCount++;
    if (this.dupTimer) clearTimeout(this.dupTimer);
    this.dupTimer = setTimeout(() => {
      this.notice("info", this.dupCount === 1 ? "Esa foto ya estaba en tu aviso, la omitimos." : `${this.dupCount} fotos ya estaban en tu aviso, las omitimos.`);
      this.dupCount = 0;
    }, 350);
    setTimeout(() => this.dropFromState([key]), 4200);
  }

  /* ----------------------------- presign -------------------------------- */

  private schedulePresign() {
    if (this.presignTimer) return;
    this.presignTimer = setTimeout(() => { this.presignTimer = null; void this.flushPresign(); }, 140);
  }

  private async flushPresign() {
    while (this.presignQ.length) {
      const keys = this.presignQ.splice(0, 30).filter((k) => this.find(k) && this.blobs.has(k));
      if (!keys.length) continue;
      const files: PresignRequestFile[] = keys.map((k) => {
        const it = this.find(k)!;
        const blob = this.blobs.get(k)!;
        return { name: this.safeName(it.name), mime: blob.type, size: blob.size, checksum: it.checksum!, width: it.width ?? undefined, height: it.height ?? undefined };
      });
      this.begin();
      try {
        const raw = await api<PresignedUpload[] | { items?: PresignedUpload[] }>(`/publications/${this.pid}/images/presign`, { body: { files } });
        const res = Array.isArray(raw) ? raw : raw.items ?? [];
        keys.forEach((k, i) => {
          const r = res[i];
          if (!this.find(k)) {
            if (r && !r.duplicate) void this.deleteRemote(r.imageId);
            return;
          }
          if (!r) { this.fail(k, "presign", "El servidor no preparó la subida de esta foto."); return; }
          if (r.duplicate) { this.markDuplicate(k); return; }
          this.presigned.set(k, r);
          this.update(k, { imageId: r.imageId, stage: "upload" });
          void this.uploadPool.run(() => this.upload(k));
        });
      } catch (e) {
        keys.forEach((k) => this.fail(k, "presign", messageOf(e, "No pudimos preparar la subida. Revisa tu conexión.")));
      } finally {
        this.end();
      }
    }
  }

  private safeName(n: string) { return n.replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]/g, "_").slice(0, 120) || "foto"; }

  private fail(key: string, stage: PhotoStage, message: string) {
    if (!this.find(key)) return;
    this.update(key, { status: "error", stage, error: message, busy: null });
  }

  /* ------------------------------ subida -------------------------------- */

  private resolveUploadUrl(u: string) {
    return u.startsWith("/uploads/") ? `/backend${u}` : u;
  }

  private async upload(key: string) {
    const it = this.find(key);
    const pre = this.presigned.get(key);
    const blob = this.blobs.get(key);
    if (!it || !pre?.uploadUrl || !blob) return;
    const ac = new AbortController();
    this.aborts.set(key, ac);
    this.begin();
    this.update(key, { status: "uploading", progress: 0, error: null, stage: "upload" });
    try {
      await this.putWithRetry(key, pre, blob, ac.signal, this.progressSink(key));
      if (!this.find(key)) return;
      this.update(key, { status: "confirming", progress: 1, stage: "confirm" });
      this.confirmQ.push(key);
      this.scheduleConfirm();
    } catch (e) {
      if (isAbort(e)) return;
      this.fail(key, "upload", messageOf(e, "No pudimos subir la foto. Revisa tu conexión."));
    } finally {
      this.aborts.delete(key);
      this.end();
    }
  }

  private progressSink(key: string) {
    let lastP = 0;
    let lastT = 0;
    return (p: number) => {
      const now = performance.now();
      if (p >= 1 || p - lastP >= 0.04 || now - lastT > 120) {
        lastP = p;
        lastT = now;
        this.update(key, { progress: p });
      }
    };
  }

  private async putWithRetry(key: string, pre: PresignedUpload, blob: Blob, signal: AbortSignal, onProgress: (p: number) => void) {
    let current = pre;
    let refreshed = false;
    for (let attempt = 0; ; attempt++) {
      try {
        await putBlob(this.resolveUploadUrl(current.uploadUrl!), blob, current.headers, { onProgress, signal });
        return;
      } catch (e) {
        if (isAbort(e)) throw e;
        const ue = e instanceof UploadError ? e : null;
        if (ue && ue.status === 403 && !refreshed && this.find(key)?.imageId) {
          // Firma vencida: pedimos una nueva para el mismo imageId.
          refreshed = true;
          const fresh = await this.replacePresign(key, blob);
          if (!fresh.uploadUrl) return;
          current = fresh;
          this.presigned.set(key, fresh);
          continue;
        }
        const retryable = !ue || ue.network || ue.status >= 500 || ue.status === 429 || ue.status === 408;
        if (!retryable || attempt >= 3) throw e;
        await sleep(900 * 2 ** attempt + Math.random() * 300);
        if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
      }
    }
  }

  private replacePresign(key: string, blob: Blob) {
    const it = this.find(key)!;
    return api<PresignedUpload>(`/publications/${this.pid}/images/${it.imageId}/replace`, {
      body: { mime: blob.type, size: blob.size, checksum: it.checksum, width: it.width ?? undefined, height: it.height ?? undefined },
    });
  }

  /* ----------------------------- confirmar ------------------------------ */

  private scheduleConfirm() {
    if (this.confirmTimer) return;
    this.confirmTimer = setTimeout(() => { this.confirmTimer = null; void this.flushConfirm(); }, 160);
  }

  private async flushConfirm() {
    while (this.confirmQ.length) {
      const order = new Map(this.state.items.map((it, i) => [it.key, i] as const));
      const keys = this.confirmQ.splice(0, 30).filter((k) => this.find(k)?.imageId).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
      if (!keys.length) continue;
      const images = keys.map((k) => { const it = this.find(k)!; return { imageId: it.imageId!, width: it.width ?? undefined, height: it.height ?? undefined }; });
      this.begin();
      try {
        const dtos = await api<ImageDTO[]>(`/publications/${this.pid}/images/confirm`, { body: { images } });
        const missing = this.applyConfirmed(dtos, keys);
        missing.forEach((k) => this.fail(k, "confirm", "No pudimos confirmar esta foto en el servidor."));
        keys.filter((k) => !missing.includes(k)).forEach((k) => { this.blobs.delete(k); this.presigned.delete(k); });
      } catch (e) {
        keys.forEach((k) => this.fail(k, "confirm", messageOf(e, "No pudimos confirmar la foto. Reintenta.")));
      } finally {
        this.end();
      }
    }
    this.normalizeCover(true);
    this.scheduleOrderSync(200);
    this.changed();
  }

  /** Aplica la respuesta de /confirm. Devuelve las claves que no aparecieron confirmadas. */
  private applyConfirmed(dtos: ImageDTO[], keys: string[]): string[] {
    const list = Array.isArray(dtos) ? dtos : [];
    const byId = new Map(list.map((d) => [d.id, d] as const));
    const missing: string[] = [];
    const newIds: string[] = [];
    const items = this.state.items.map((it) => {
      if (!it.imageId || !keys.includes(it.key)) return it;
      const dto = byId.get(it.imageId);
      if (!dto || dto.status === "PENDING") { missing.push(it.key); return it; }
      newIds.push(dto.id);
      return {
        ...it, status: "ready" as const, progress: 1, error: null, stage: null, busy: null,
        url: dto.url, thumb: it.thumb ?? dto.url, width: dto.width ?? it.width, height: dto.height ?? it.height,
        roomLabel: dto.roomLabel ?? it.roomLabel, caption: dto.caption ?? it.caption,
      };
    });
    this.set({ items });
    newIds.sort((a, b) => (byId.get(a)?.position ?? 0) - (byId.get(b)?.position ?? 0));
    this.serverOrder = [...this.serverOrder.filter((id) => !newIds.includes(id)), ...newIds];
    const cover = list.find((d) => d.isCover)?.id;
    if (cover) this.serverCover = cover;
    return missing;
  }

  /* ------------------------------ portada ------------------------------- */

  /** Invariante: la portada es la primera foto lista de la cuadrícula. */
  private normalizeCover(emit: boolean) {
    const firstReady = this.state.items.find((i) => i.status === "ready");
    let changed = false;
    const items = this.state.items.map((i) => {
      const should = !!firstReady && i.key === firstReady.key;
      if (i.isCover === should) return i;
      changed = true;
      return { ...i, isCover: should };
    });
    if (changed) { if (emit) this.set({ items }); else this.state = { ...this.state, items }; }
  }

  /* ------------------------------- orden -------------------------------- */

  private scheduleOrderSync(delay = 450) {
    if (this.orderTimer) clearTimeout(this.orderTimer);
    this.orderTimer = setTimeout(() => { this.orderTimer = null; void this.syncOrder(); }, delay);
  }

  private async syncOrder() {
    if (this.orderInFlight) { this.orderDirty = true; return; }
    const ready = this.state.items.filter((i) => i.status === "ready" && i.imageId);
    const order = ready.map((i) => i.imageId!);
    if (!order.length) return;
    const coverId = order[0]!;
    const known = this.serverOrder.filter((id) => order.includes(id));
    if (sameOrder(order, known) && this.serverCover === coverId) return;
    this.orderInFlight = true;
    this.begin();
    try {
      await api<ImageDTO[]>(`/publications/${this.pid}/images/reorder`, { method: "PATCH", body: { order, coverId } });
      this.serverOrder = order;
      this.serverCover = coverId;
      this.changed();
    } catch (e) {
      this.notice("error", messageOf(e, "No pudimos guardar el orden de las fotos. Reintentando…"));
      this.orderDirty = true;
    } finally {
      this.orderInFlight = false;
      this.end();
      if (this.orderDirty) { this.orderDirty = false; this.scheduleOrderSync(2500); }
    }
  }

  /** Reordena localmente (arrastre en vivo o teclado). `commit` programa el guardado. */
  setOrder(keys: string[], commit = true) {
    const byKey = new Map(this.state.items.map((i) => [i.key, i] as const));
    const next: PhotoItem[] = [];
    for (const k of keys) { const it = byKey.get(k); if (it) { next.push(it); byKey.delete(k); } }
    byKey.forEach((it) => next.push(it));
    if (next.every((it, i) => it === this.state.items[i])) return;
    this.set({ items: next });
    this.normalizeCover(true);
    if (commit) this.scheduleOrderSync(350);
  }

  commitOrder() { this.scheduleOrderSync(250); }

  move(key: string, delta: number) {
    const keys = this.state.items.map((i) => i.key);
    const from = keys.indexOf(key);
    if (from < 0) return;
    const to = Math.max(0, Math.min(keys.length - 1, from + delta));
    if (to === from) return;
    keys.splice(to, 0, keys.splice(from, 1)[0]!);
    this.setOrder(keys, true);
    this.announce(`Foto movida a la posición ${to + 1} de ${keys.length}.`);
  }

  moveTo(key: string, index: number) {
    const keys = this.state.items.map((i) => i.key);
    const from = keys.indexOf(key);
    if (from < 0) return;
    const to = Math.max(0, Math.min(keys.length - 1, index));
    keys.splice(to, 0, keys.splice(from, 1)[0]!);
    this.setOrder(keys, true);
  }

  setCover(key: string) {
    const it = this.find(key);
    if (!it || it.status !== "ready") return;
    if (it.isCover) return;
    const keys = this.state.items.map((i) => i.key).filter((k) => k !== key);
    this.setOrder([key, ...keys], true);
    this.announce("Esta es ahora tu foto principal.");
  }

  /* ----------------------------- etiquetas ------------------------------ */

  async setLabel(keys: string[], label: string | null) {
    const targets = keys.map((k) => this.find(k)).filter((i): i is PhotoItem => !!i && !!i.imageId && (i.status === "ready" || i.status === "stale"));
    if (!targets.length) return;
    const prev = new Map(targets.map((t) => [t.key, t.roomLabel] as const));
    targets.forEach((t) => this.update(t.key, { roomLabel: label }));
    this.announce(label ? `Etiqueta “${label}” aplicada a ${targets.length} ${targets.length === 1 ? "foto" : "fotos"}.` : "Etiqueta quitada.");
    let failed = 0;
    const pool = new Pool(3);
    await Promise.all(targets.map((t) => pool.run(async () => {
      try {
        await api<ImageDTO>(`/publications/${this.pid}/images/${t.imageId}`, { method: "PATCH", body: { roomLabel: label } });
      } catch {
        failed++;
        this.update(t.key, { roomLabel: prev.get(t.key) ?? null });
      }
    })));
    if (failed) this.notice("error", failed === 1 ? "No pudimos guardar la etiqueta de una foto." : `No pudimos guardar ${failed} etiquetas.`);
  }

  /* ----------------------------- eliminar ------------------------------- */

  remove(keys: string[]) {
    const targets = this.state.items.filter((i) => keys.includes(i.key));
    if (!targets.length) return;
    const undoable = targets.filter((i) => !!i.imageId && (i.status === "ready" || i.status === "stale" || i.status === "error") && !this.aborts.has(i.key));
    const instant = targets.filter((i) => !undoable.includes(i));

    for (const it of instant) {
      const imageId = it.imageId;
      this.discardLocal(it.key, true);
      if (imageId && it.status !== "duplicate") void this.deleteRemote(imageId);
    }
    this.dropFromState(instant.map((i) => i.key), false);

    if (undoable.length) {
      // Una sola barra de "Deshacer" a la vez: lo anterior se confirma ya.
      this.commitAllUndo();
      const indices = undoable.map((u) => this.state.items.findIndex((i) => i.key === u.key));
      const id = ++this.undoSeq;
      const timer = setTimeout(() => void this.commitUndo(id), 6000);
      this.undoGroups.set(id, { items: undoable, indices, timer });
      this.set({
        items: this.state.items.filter((i) => !undoable.some((u) => u.key === i.key)),
        undo: { id, keys: undoable.map((u) => u.key), label: undoable.length === 1 ? "Foto eliminada" : `${undoable.length} fotos eliminadas` } satisfies UndoEntry,
      });
    }
    this.normalizeCover(true);
    this.announce(targets.length === 1 ? "Foto eliminada." : `${targets.length} fotos eliminadas.`);
  }

  undoRemove(id?: number) {
    const gid = id ?? this.state.undo?.id;
    if (gid == null) return;
    const g = this.undoGroups.get(gid);
    if (!g) return;
    clearTimeout(g.timer);
    this.undoGroups.delete(gid);
    const items = [...this.state.items];
    const order = g.items.map((it, i) => ({ it, at: g.indices[i] ?? items.length })).sort((a, b) => a.at - b.at);
    for (const { it, at } of order) items.splice(Math.min(at, items.length), 0, it);
    this.set({ items, undo: this.state.undo?.id === gid ? null : this.state.undo });
    this.normalizeCover(true);
    this.scheduleOrderSync(600);
    this.announce("Foto restaurada.");
  }

  private commitAllUndo() {
    for (const id of [...this.undoGroups.keys()]) void this.commitUndo(id);
  }

  private async commitUndo(id: number) {
    const g = this.undoGroups.get(id);
    if (!g) return;
    clearTimeout(g.timer);
    this.undoGroups.delete(id);
    if (this.state.undo?.id === id) this.set({ undo: null });
    this.begin();
    const pool = new Pool(3);
    const failed: PhotoItem[] = [];
    await Promise.all(g.items.map((it) => pool.run(async () => {
      try {
        await api(`/publications/${this.pid}/images/${it.imageId}`, { method: "DELETE" });
        this.serverOrder = this.serverOrder.filter((x) => x !== it.imageId);
        if (this.serverCover === it.imageId) this.serverCover = null;
        this.discardLocal(it.key, true);
      } catch (e) {
        if (e instanceof ApiException && e.status === 404) { this.discardLocal(it.key, true); return; } // ya no existe
        failed.push(it);
      }
    })));
    this.end();
    if (failed.length) {
      this.notice("error", failed.length === 1 ? "No pudimos eliminar una foto. La restauramos." : `No pudimos eliminar ${failed.length} fotos. Las restauramos.`);
      const items = [...this.state.items];
      g.items.forEach((it, i) => { if (failed.includes(it)) items.splice(Math.min(g.indices[i] ?? items.length, items.length), 0, it); });
      this.set({ items });
      this.normalizeCover(true);
    }
    this.normalizeCover(true);
    this.changed();
  }

  private async deleteRemote(imageId: string) {
    try { await api(`/publications/${this.pid}/images/${imageId}`, { method: "DELETE" }); this.serverOrder = this.serverOrder.filter((x) => x !== imageId); } catch { /* huérfana: se limpia en el servidor */ }
  }

  /** Cancela trabajo en curso y libera memoria de un ítem. */
  private discardLocal(key: string, revokeThumb: boolean) {
    this.aborts.get(key)?.abort();
    this.aborts.delete(key);
    this.files.delete(key);
    this.blobs.delete(key);
    this.presigned.delete(key);
    this.replaceDirty.delete(key);
    this.presignQ = this.presignQ.filter((k) => k !== key);
    this.confirmQ = this.confirmQ.filter((k) => k !== key);
    if (revokeThumb) {
      const u = this.thumbUrls.get(key);
      if (u) { URL.revokeObjectURL(u); this.thumbUrls.delete(key); }
    }
  }

  private dropFromState(keys: string[], emit = true) {
    if (!keys.length) return;
    const items = this.state.items.filter((i) => !keys.includes(i.key));
    if (items.length === this.state.items.length) return;
    keys.forEach((k) => { const u = this.thumbUrls.get(k); if (u) { URL.revokeObjectURL(u); this.thumbUrls.delete(k); } });
    if (emit) this.set({ items }); else this.state = { ...this.state, items };
  }

  /* ------------------------- reintentar / recuperar --------------------- */

  retry(key: string) {
    const it = this.find(key);
    if (!it) return;
    if (it.status === "stale") { void this.recoverStale([key], true); return; }
    switch (it.stage) {
      case "presign":
        this.update(key, { status: "queued", error: null, progress: 0 });
        this.presignQ.push(key);
        this.schedulePresign();
        break;
      case "upload":
        if (this.presigned.has(key)) {
          void this.uploadPool.run(() => this.upload(key));
        } else if (this.blobs.has(key) && it.imageId) {
          this.update(key, { status: "queued", error: null });
          void this.uploadPool.run(async () => {
            try {
              const pre = await this.replacePresign(key, this.blobs.get(key)!);
              this.presigned.set(key, pre);
              await this.upload(key);
            } catch (e) { this.fail(key, "upload", messageOf(e, "No pudimos subir la foto.")); }
          });
        } else {
          this.update(key, { status: "queued", error: null });
          this.presignQ.push(key);
          this.schedulePresign();
        }
        break;
      case "confirm":
        this.update(key, { status: "confirming", error: null });
        this.confirmQ.push(key);
        this.scheduleConfirm();
        break;
      case "replace":
        this.update(key, { error: null, status: it.url ? "ready" : "queued" });
        void this.replaceRemote(key);
        break;
      default:
        this.remove([key]);
    }
  }

  /** Fotos que quedaron PENDING de una sesión anterior: si el archivo llegó a subirse, /confirm las rescata. */
  private async recoverStale(only?: string[], loud = false) {
    const stale = this.state.items.filter((i) => i.status === "stale" && i.imageId && (!only || only.includes(i.key)));
    for (const it of stale) {
      try {
        const dtos = await api<ImageDTO[]>(`/publications/${this.pid}/images/confirm`, { body: { images: [{ imageId: it.imageId!, width: it.width ?? undefined, height: it.height ?? undefined }] } });
        const miss = this.applyConfirmed(dtos, [it.key]);
        if (!miss.length) {
          this.normalizeCover(true);
          this.scheduleOrderSync(300);
          this.changed();
          continue;
        }
      } catch { /* sigue incompleta */ }
      if (loud) this.notice("info", "Esta foto no llegó a subirse. Elige el archivo de nuevo para completarla.");
      if (loud) this.update(it.key, { error: "Elige el archivo de nuevo" });
    }
  }

  /** Completa una foto "incompleta" subiendo de nuevo el archivo para el mismo imageId. */
  async reuploadFile(key: string, file: File) {
    const it = this.find(key);
    if (!it || !it.imageId) return;
    if (!isImageCandidate(file)) { this.notice("error", "Ese archivo no es una imagen compatible."); return; }
    this.update(key, { status: "queued", error: null, busy: "replace", progress: 0 });
    try {
      const out = await processFile(file);
      if (!this.find(key)) return;
      this.adoptProcessed(key, out);
      void this.replaceRemote(key);
    } catch (e) {
      this.update(key, { status: "stale", busy: null, error: e instanceof PipelineError ? e.message : "No pudimos preparar la foto." });
    }
  }

  /* ----------------------- editar: rotar / recortar --------------------- */

  /** Blob procesado de una foto (para editarla). Usa la copia local o la descarga. */
  async sourceBlob(key: string): Promise<Blob> {
    const local = this.blobs.get(key);
    if (local) return local;
    const it = this.find(key);
    if (!it?.url) throw new Error("La foto todavía no está disponible.");
    const candidates: string[] = [];
    try {
      const u = new URL(it.url, window.location.href);
      if (u.pathname.startsWith("/files/")) candidates.push(`/backend${u.pathname}${u.search}`);
    } catch { /* url inválida */ }
    candidates.push(it.url);
    for (const c of candidates) {
      try {
        const r = await fetch(c, { cache: "no-store" });
        if (r.ok) { const b = await r.blob(); this.blobs.set(key, b); return b; }
      } catch { /* siguiente */ }
    }
    throw new Error("No pudimos abrir la foto original para editarla.");
  }

  async openEditor(key: string) {
    const blob = await this.sourceBlob(key);
    return openForEditing(blob);
  }

  async rotate(key: string, dir: 1 | -1) {
    const it = this.find(key);
    if (!it || it.status !== "ready" || it.busy === "rotate" || it.busy === "crop") return;
    const prevBusy = it.busy;
    this.update(key, { busy: "rotate" });
    try {
      const src = await this.sourceBlob(key);
      const out = await renderBlob(src, { rotate: dir === 1 ? 90 : 270 });
      if (!this.find(key)) return;
      this.applyEdit(key, out);
      this.announce("Foto rotada.");
    } catch (e) {
      this.update(key, { busy: prevBusy });
      this.notice("error", messageOf(e, e instanceof Error ? e.message : "No pudimos rotar la foto."));
    }
  }

  async applyCrop(key: string, op: RenderOp) {
    const it = this.find(key);
    if (!it || it.status !== "ready") return;
    this.update(key, { busy: "crop" });
    try {
      const src = await this.sourceBlob(key);
      const out = await renderBlob(src, op);
      if (!this.find(key)) return;
      this.applyEdit(key, out);
      this.announce("Foto recortada.");
    } catch (e) {
      this.update(key, { busy: null });
      this.notice("error", messageOf(e, e instanceof Error ? e.message : "No pudimos recortar la foto."));
    }
  }

  private applyEdit(key: string, out: Processed) {
    this.adoptProcessed(key, out);
    this.update(key, { busy: "replace", progress: 0, error: null });
    void this.replaceRemote(key);
  }

  /** Sube la versión editada de una foto guardada (mismo imageId). Une ediciones seguidas en una sola subida. */
  private async replaceRemote(key: string) {
    if (this.replacing.has(key)) { this.replaceDirty.add(key); return; }
    this.replacing.add(key);
    this.begin();
    let ok = true;
    try {
      do {
        this.replaceDirty.delete(key);
        const it = this.find(key);
        const blob = this.blobs.get(key);
        if (!it || !blob || !it.imageId) break;
        this.update(key, { busy: "replace", progress: 0 });
        const pre = await this.replacePresign(key, blob);
        if (pre.uploadUrl && !pre.duplicate) {
          await this.putWithRetry(key, pre, blob, new AbortController().signal, this.progressSink(key));
          const dtos = await api<ImageDTO[]>(`/publications/${this.pid}/images/confirm`, { body: { images: [{ imageId: it.imageId, width: it.width ?? undefined, height: it.height ?? undefined }] } });
          const dto = (Array.isArray(dtos) ? dtos : []).find((d) => d.id === it.imageId);
          if (dto) this.update(key, { url: dto.url, width: dto.width ?? it.width, height: dto.height ?? it.height });
        }
      } while (this.replaceDirty.has(key));
    } catch (e) {
      ok = false;
      this.update(key, { busy: null, status: "error", stage: "replace", error: messageOf(e, "No pudimos guardar los cambios de la foto.") });
    } finally {
      this.replacing.delete(key);
      this.end();
    }
    if (ok && this.find(key)) {
      this.update(key, { busy: null, status: "ready", progress: 1, error: null, stage: null });
      this.normalizeCover(true);
      this.scheduleOrderSync(300);
      this.changed();
    }
  }
}
