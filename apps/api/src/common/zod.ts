import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import { z } from "zod";
import { toE164 } from "./phone.js";

z.config(z.locales.es());

export { z };

/** Valida con zod y devuelve el valor parseado; en error responde 400 con `errors: { campo: [mensajes] }`. */
@Injectable()
export class ZodPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}
  transform(value: unknown): z.output<T> {
    const r = this.schema.safeParse(value ?? {});
    if (r.success) return r.data;
    throw new BadRequestException({ message: "Revisa los datos enviados", errors: zodErrors(r.error) });
  }
}

export function zodErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/* ---------- Constructores de campos con mensajes en español ---------- */
export const text = (label: string, min = 1, max = 500) =>
  z
    .string({ error: `${label} es obligatorio` })
    .trim()
    .min(min, min <= 1 ? `${label} es obligatorio` : `${label}: mínimo ${min} caracteres`)
    .max(max, `${label}: máximo ${max} caracteres`);

export const optText = (label: string, max = 500) => z.string({ error: `${label} no es válido` }).trim().max(max, `${label}: máximo ${max} caracteres`);

/** Cadena opcional que acepta null y "" (se normaliza a null). */
export const nullableText = (label: string, max = 500) =>
  z
    .union([z.string({ error: `${label} no es válido` }).trim().max(max, `${label}: máximo ${max} caracteres`), z.null()])
    .transform((v) => (v === "" || v === null ? null : v));

export const emailField = z
  .string({ error: "El correo es obligatorio" })
  .trim()
  .toLowerCase()
  .max(160, "El correo es demasiado largo")
  .regex(/^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/, "Correo electrónico inválido");

export const phoneField = z
  .string({ error: "Teléfono no válido" })
  .trim()
  .max(32, "Teléfono: máximo 32 caracteres")
  .regex(/^[0-9+()\-\s.]*$/, "Teléfono no válido")
  .refine((v) => v === "" || toE164(v) !== null, "Revisa el número de teléfono")
  .transform((v) => (v === "" ? v : toE164(v)!));

export const urlField = (label: string) =>
  z
    .string({ error: `${label} no es válido` })
    .trim()
    .max(500, `${label}: máximo 500 caracteres`)
    .refine((v) => /^https?:\/\/[^\s]+$/i.test(v), `${label} debe ser una URL http(s) válida`);

/** URL absoluta http(s) o ruta relativa de este sitio (p. ej. /backend/files/...). */
export const mediaUrlField = (label: string) =>
  z
    .string({ error: `${label} no es válido` })
    .trim()
    .max(600, `${label}: máximo 600 caracteres`)
    .refine((v) => /^https?:\/\/[^\s]+$/i.test(v) || /^\/(?!\/)[^\s]*$/.test(v), `${label} debe ser una URL válida`);

export const nullable = <T extends z.ZodType>(s: T) => z.union([s, z.null()]);

/** Booleano desde query string ("true", "1", "on"). */
export const queryBool = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === "boolean" ? v : ["1", "true", "on", "yes", "si"].includes(v.toLowerCase())));

/** Entero opcional desde query string; valores no numéricos se ignoran. */
export const queryInt = (min = 0, max = Number.MAX_SAFE_INTEGER) =>
  z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "number" ? v : v.trim() === "" ? NaN : Number(v)))
    .pipe(z.number().finite().min(min).max(max))
    .catch(undefined as unknown as number);

export const cuid = (label = "Identificador") => z.string({ error: `${label} no válido` }).trim().min(8, `${label} no válido`).max(40, `${label} no válido`);
