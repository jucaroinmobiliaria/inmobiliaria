import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiException, qs } from "./api";
import type { Role, SessionUser } from "./types";

const API = () => (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type ServerOpts = { query?: Record<string, unknown>; revalidate?: number | false; tags?: string[]; auth?: boolean };

/** Fetch desde Server Components. Público => cacheable (ISR). `auth: true` => reenvía cookies y no cachea. */
export async function apiServer<T>(path: string, opts: ServerOpts = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } };
  if (opts.auth) {
    const jar = await cookies();
    const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    if (cookie) headers.cookie = cookie;
    init = { headers, cache: "no-store" };
  } else {
    init = { headers, next: { revalidate: opts.revalidate ?? 60, tags: opts.tags } };
  }
  const res = await fetch(`${API()}${path}${qs(opts.query)}`, init);
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
  if (!res.ok) throw new ApiException(res.status, data?.message ?? `Error ${res.status}`, data?.errors);
  return data as T;
}

/** Igual que apiServer pero devuelve null en 404 (para notFound()). */
export async function apiServerOrNull<T>(path: string, opts: ServerOpts = {}): Promise<T | null> {
  try {
    return await apiServer<T>(path, opts);
  } catch (e) {
    if (e instanceof ApiException && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
}

export async function getUser(): Promise<SessionUser | null> {
  try {
    const r = await apiServer<{ user: SessionUser }>("/auth/me", { auth: true });
    return r.user;
  } catch {
    return null;
  }
}

/** Para páginas privadas: redirige a /ingresar si no hay sesión o el rol no alcanza. */
export async function requireUser(next: string, roles?: Role[]): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  if (roles && !roles.includes(user.role)) redirect("/panel?aviso=permiso");
  return user;
}
