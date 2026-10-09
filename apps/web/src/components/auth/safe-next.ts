/** Solo rutas relativas del mismo origen (evita open-redirect) y que no devuelvan a las pantallas de acceso. */
export function safeNext(raw: string | string[] | null | undefined): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || typeof v !== "string") return null;
  if (v.length > 512) return null;
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(v)) return null;
  if (/^\/(ingresar|registro|recuperar|restablecer|confirmar-correo)(\/|\?|#|$)/.test(v)) return null;
  return v;
}

import type { Role } from "@/lib/types";

/** Destino tras iniciar sesión / registrarse. */
export function landingFor(role: Role, next: string | null): string {
  if (next) return next;
  if (role === "ADMIN") return "/admin";
  if (role === "OWNER" || role === "AGENT") return "/panel";
  return "/";
}
