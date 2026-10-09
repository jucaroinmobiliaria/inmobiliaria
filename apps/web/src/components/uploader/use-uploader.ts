"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { ImageDTO } from "@/lib/types";
import { UploadEngine, type EngineHandlers } from "./engine";
import { isBusyItem, type PhotoItem, type UploaderState } from "./types";

export interface UploaderController {
  engine: UploadEngine;
  state: UploaderState;
  items: PhotoItem[];
  readyCount: number;
  /** Fotos que todavía se están procesando o subiendo. */
  busyCount: number;
  failedCount: number;
  hasCover: boolean;
  total: number;
}

/** Crea el motor una sola vez y expone su estado a React. */
export function useUploader(publicationId: string, initialImages: ImageDTO[], handlers: EngineHandlers): UploaderController {
  const ref = useRef<UploadEngine | null>(null);
  if (!ref.current) ref.current = new UploadEngine(publicationId, initialImages);
  const engine = ref.current;

  const latest = useRef(handlers);
  latest.current = handlers;
  useEffect(() => {
    engine.setHandlers({
      onNotice: (n) => latest.current.onNotice?.(n),
      onServerChange: () => latest.current.onServerChange?.(),
    });
  }, [engine]);

  useEffect(() => {
    engine.attach();
    const hide = () => engine.flushOnHide();
    window.addEventListener("pagehide", hide);
    return () => { window.removeEventListener("pagehide", hide); engine.detach(); };
  }, [engine]);

  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

  return useMemo<UploaderController>(() => {
    const items = state.items;
    return {
      engine, state, items,
      readyCount: items.filter((i) => i.status === "ready").length,
      busyCount: items.filter(isBusyItem).length,
      failedCount: items.filter((i) => i.status === "error" || i.status === "stale").length,
      hasCover: items.some((i) => i.status === "ready" && i.isCover),
      total: items.filter((i) => i.status !== "duplicate").length,
    };
  }, [engine, state]);
}
