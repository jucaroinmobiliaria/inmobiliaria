import type { ApiError } from "./types";

export class ApiException extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export function qs(query?: Record<string, unknown>) {
  if (!query) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

type Opts = { method?: string; body?: unknown; query?: Record<string, unknown>; signal?: AbortSignal; headers?: Record<string, string> };

let refreshing: Promise<boolean> | null = null;
async function tryRefresh() {
  refreshing ??= fetch("/backend/auth/refresh", { method: "POST", credentials: "include" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const e = (data ?? {}) as Partial<ApiError>;
    throw new ApiException(res.status, e.message ?? `Error ${res.status}`, e.errors);
  }
  return data as T;
}
const safeJson = (t: string) => { try { return JSON.parse(t); } catch { return null; } };

/** Cliente para el navegador (cookies del mismo origen vía /backend). Reintenta una vez tras refrescar el token. */
export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const run = () =>
    fetch(`/backend${path}${qs(opts.query)}`, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      credentials: "include",
      signal: opts.signal,
      headers: { ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}), ...opts.headers },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  let res = await run();
  if (res.status === 401 && !path.startsWith("/auth/")) {
    if (await tryRefresh()) res = await run();
  }
  return parse<T>(res);
}

export const fetcher = <T = unknown>(path: string) => api<T>(path);
