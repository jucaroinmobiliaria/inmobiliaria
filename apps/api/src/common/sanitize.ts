const TAG_BLOCK = /<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const TAG = /<\/?[a-zA-Z!][^>]*>/g;
// Caracteres de control salvo \t \n \r
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;

/** Elimina etiquetas HTML y caracteres de control, normaliza saltos de línea y recorta. */
export function cleanString(s: string): string {
  let out = s.normalize("NFC");
  out = out.replace(TAG_BLOCK, "").replace(TAG, "").replace(CONTROL, "");
  out = out.replace(/\r\n?/g, "\n");
  return out.trim();
}

/** Claves cuyo valor se deja intacto (secretos: no se debe alterar una contraseña o un token). */
const RAW_KEYS = new Set(["password", "current", "next", "token", "passwordHash"]);

export function sanitizeDeep<T>(value: T, key?: string, depth = 0): T {
  if (depth > 12) return value;
  if (typeof value === "string") return (key && RAW_KEYS.has(key) ? value : cleanString(value)) as T;
  if (Array.isArray(value)) return value.map((v) => sanitizeDeep(v, key, depth + 1)) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      out[k] = sanitizeDeep(v, k, depth + 1);
    }
    return out as T;
  }
  return value;
}
