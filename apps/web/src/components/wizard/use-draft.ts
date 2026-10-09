"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiException } from "@/lib/api";
import type { DraftDTO, DraftInput } from "@/lib/types";
import { isHttpUrl } from "./steps";

export type SaveState = "saved" | "dirty" | "saving" | "offline" | "error" | "expired";
export interface SaveInfo { state: SaveState; at: number; message?: string }

const DEBOUNCE_MS = 800;
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30000;

/**
 * Estado del borrador + autoguardado.
 * - Cambios locales inmediatos; PATCH con SOLO los campos cambiados, con debounce de 800 ms.
 * - Un único PATCH a la vez; si falla, el payload se conserva y se reintenta con backoff.
 * - Nunca se pierden datos: lo no guardado vive en `pending` hasta que el servidor responde bien.
 */
export function useDraft(initial: DraftDTO) {
  const id = initial.id;
  const [draft, setDraft] = useState<DraftDTO>(initial);
  const [save, setSave] = useState<SaveInfo>({ state: "saved", at: Date.now() });
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});

  const pending = useRef<DraftInput>({});
  const inflight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempts = useRef(0);
  const alive = useRef(true);

  const hasPending = () => Object.keys(pending.current).length > 0;

  const requeue = (payload: DraftInput) => {
    pending.current = { ...payload, ...pending.current };
  };

  const sendLoop = useCallback((): Promise<boolean> => {
    if (inflight.current) return inflight.current;
    const p = (async () => {
      let ok = true;
      while (hasPending()) {
        const payload = pending.current;
        pending.current = {};
        if (alive.current) setSave((s) => ({ ...s, state: "saving", message: undefined }));
        try {
          const res = await api<DraftDTO>(`/publications/${id}`, { method: "PATCH", body: payload });
          attempts.current = 0;
          if (alive.current) {
            setDraft((d) => ({
              ...d,
              completion: res.completion ?? d.completion,
              status: res.status ?? d.status,
              updatedAt: res.updatedAt ?? d.updatedAt,
              path: res.path ?? d.path,
              moderationNote: res.moderationNote ?? d.moderationNote,
              publishedAt: res.publishedAt ?? d.publishedAt,
            }));
          }
        } catch (e) {
          ok = false;
          if (e instanceof ApiException && e.status === 400 && e.errors) {
            // El servidor rechazó algunos campos: los apartamos para no entrar en bucle y seguimos con el resto.
            const bad = new Set(Object.keys(e.errors));
            const keep: DraftInput = {};
            for (const [k, v] of Object.entries(payload)) if (!bad.has(k)) (keep as Record<string, unknown>)[k] = v;
            if (alive.current) {
              setServerErrors((prev) => ({ ...prev, ...e.errors }));
              setSave({ state: "error", at: Date.now(), message: Object.values(e.errors)[0]?.[0] ?? e.message });
            }
            if (Object.keys(keep).length) { requeue(keep); ok = true; continue; }
            break;
          }
          requeue(payload);
          if (e instanceof ApiException && e.status === 401) {
            if (alive.current) setSave({ state: "expired", at: Date.now(), message: "Tu sesión expiró. Vuelve a ingresar para seguir guardando." });
          } else if (e instanceof ApiException && e.status >= 400 && e.status < 500 && e.status !== 429 && e.status !== 408) {
            if (alive.current) setSave({ state: "error", at: Date.now(), message: e.message });
          } else {
            if (alive.current) setSave({ state: "offline", at: Date.now() });
            scheduleRetry();
          }
          break;
        }
      }
      if (ok && alive.current) setSave((s) => (s.state === "error" ? s : { state: "saved", at: Date.now() }));
      return ok && !hasPending();
    })().finally(() => { inflight.current = null; });
    inflight.current = p;
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function scheduleRetry() {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** attempts.current);
    attempts.current += 1;
    retryTimer.current = setTimeout(() => { void sendLoop(); }, delay);
  }

  const update = useCallback((patch: DraftInput) => {
    setDraft((d) => ({ ...d, ...patch }) as DraftDTO);
    // Un enlace a medio escribir ("htt…") se queda en pantalla pero no se envía: el servidor lo rechazaría.
    const send: DraftInput = { ...patch };
    for (const k of ["videoUrl", "tourUrl"] as const) {
      const v = send[k];
      if (typeof v === "string" && !isHttpUrl(v)) delete send[k];
    }
    pending.current = { ...pending.current, ...send };
    setServerErrors((prev) => {
      const keys = Object.keys(patch);
      if (!keys.some((k) => k in prev)) return prev;
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
    setSave((s) => (s.state === "offline" || s.state === "expired" ? s : { ...s, state: "dirty", message: undefined }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void sendLoop(); }, DEBOUNCE_MS);
  }, [sendLoop]);

  /** Envía ya lo pendiente (cambio de paso, salir, publicar). Resuelve true si no queda nada sin guardar. */
  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (inflight.current) await inflight.current.catch(() => false);
    if (!hasPending()) return true;
    return sendLoop();
  }, [sendLoop]);

  const retryNow = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    attempts.current = 0;
    void sendLoop();
  }, [sendLoop]);

  const isDirty = useCallback(() => hasPending() || inflight.current !== null, []);

  /** Refresca solo metadatos calculados por el servidor (porcentaje, estado). */
  const refreshMeta = useCallback(async () => {
    try {
      const res = await api<DraftDTO>(`/me/publications/${id}`);
      if (!alive.current) return res;
      setDraft((d) => ({ ...d, completion: res.completion, status: res.status, path: res.path, moderationNote: res.moderationNote, updatedAt: res.updatedAt, publishedAt: res.publishedAt }));
      return res;
    } catch { return null; }
  }, [id]);

  useEffect(() => {
    alive.current = true;
    const online = () => { attempts.current = 0; if (hasPending()) void sendLoop(); };
    const hidden = () => { if (document.visibilityState === "hidden" && hasPending()) void sendLoop(); };
    const pagehide = () => {
      if (!hasPending()) return;
      try {
        void fetch(`/backend/publications/${id}`, {
          method: "PATCH", keepalive: true, credentials: "include",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current),
        });
      } catch { /* sin conexión: ya no hay nada que hacer */ }
    };
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pagehide);
    return () => {
      alive.current = false;
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pagehide);
      if (timer.current) clearTimeout(timer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      // Al desmontar (p. ej. navegación interna) intentamos dejar todo guardado.
      if (hasPending()) void sendLoop();
    };
  }, [id, sendLoop]);

  return useMemo(() => ({ draft, save, serverErrors, update, flush, retryNow, isDirty, refreshMeta, setDraft }), [draft, save, serverErrors, update, flush, retryNow, isDirty, refreshMeta]);
}

export type DraftController = ReturnType<typeof useDraft>;
