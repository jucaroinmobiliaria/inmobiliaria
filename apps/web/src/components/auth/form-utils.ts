import { ApiException } from "@/lib/api";

export type FieldErrors = Record<string, string>;

/** Convierte un error de la API en `{ campo: mensaje }` y un mensaje general. */
export function readError(e: unknown, fallback = "No pudimos completar la acción. Inténtalo de nuevo."): { fields: FieldErrors; form: string | null } {
  if (e instanceof ApiException) {
    const fields: FieldErrors = {};
    for (const [k, v] of Object.entries(e.errors ?? {})) if (v?.length) fields[k] = v[0]!;
    const hasFields = Object.keys(fields).length > 0;
    if (e.status === 429) return { fields, form: "Demasiados intentos. Espera un minuto e inténtalo otra vez." };
    return { fields, form: hasFields ? null : (e.message || fallback) };
  }
  return { fields: {}, form: "Sin conexión con el servidor. Revisa tu internet e inténtalo otra vez." };
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
