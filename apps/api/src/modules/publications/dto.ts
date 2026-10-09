import { cuid, mediaUrlField, nullable, text, urlField, z } from "../../common/zod.js";

const intIn = (label: string, min: number, max: number) =>
  z.number({ error: `${label} debe ser un número` }).int(`${label} debe ser un número entero`).min(min, `${label}: mínimo ${min}`).max(max, `${label}: máximo ${max}`);
const numIn = (label: string, min: number, max: number) =>
  z.number({ error: `${label} debe ser un número` }).finite().min(min, `${label}: mínimo ${min}`).max(max, `${label}: máximo ${max}`);

const nullStr = (label: string, max: number) =>
  z.union([z.string({ error: `${label} no es válido` }).max(max, `${label}: máximo ${max} caracteres`), z.null()]).transform((v) => (v === null || v.trim() === "" ? null : v.trim()));

const nullUrl = (label: string) =>
  z.union([urlField(label), z.literal(""), z.null()]).transform((v) => (v === "" || v === null ? null : v));

export const createDraftSchema = z.object({
  operation: z.enum(["SALE", "RENT"], { error: "Elige si es venta o arriendo" }),
  typeId: cuid("Tipo").optional().nullable(),
  cityId: cuid("Ciudad").optional().nullable(),
});
export type CreateDraftDto = z.infer<typeof createDraftSchema>;

export const draftInputSchema = z
  .object({
    operation: z.enum(["SALE", "RENT"], { error: "Operación no válida" }),
    typeId: cuid("Tipo"),
    condition: z.enum(["NEW", "USED", "OFF_PLAN"], { error: "Condición no válida" }),
    title: z.string({ error: "El título no es válido" }).trim().max(120, "El título: máximo 120 caracteres"),
    description: z.string({ error: "La descripción no es válida" }).trim().max(5000, "La descripción: máximo 5000 caracteres"),
    price: intIn("El precio", 0, 9_000_000_000_000),
    currency: z.enum(["COP", "USD"], { error: "Moneda no válida" }),
    negotiable: z.boolean(),
    adminFee: nullable(intIn("La administración", 0, 1_000_000_000_000)),
    area: nullable(numIn("El área", 0, 10_000_000)),
    landArea: nullable(numIn("El área del lote", 0, 100_000_000)),
    bedrooms: nullable(intIn("Las habitaciones", 0, 50)),
    bathrooms: nullable(intIn("Los baños", 0, 50)),
    parking: nullable(intIn("Los parqueaderos", 0, 100)),
    floor: nullable(intIn("El piso", -5, 200)),
    totalFloors: nullable(intIn("El total de pisos", 0, 200)),
    stratum: nullable(intIn("El estrato", 0, 6)),
    ageYears: nullable(intIn("La antigüedad", 0, 300)),
    furnished: z.boolean(),
    petFriendly: z.boolean(),
    amenityIds: z.array(cuid("Comodidad")).max(60, "Máximo 60 comodidades"),
    cityId: cuid("Ciudad"),
    neighborhoodId: nullable(cuid("Barrio")),
    address: nullStr("La dirección", 200),
    hideAddress: z.boolean(),
    lat: nullable(numIn("La latitud", -5, 14)),
    lng: nullable(numIn("La longitud", -82, -66)),
    videoUrl: nullUrl("El video"),
    tourUrl: nullUrl("El tour virtual"),
    availableFrom: z.union([z.string().max(40), z.null()]).transform((v) => (v ? v : null)),
    minContractMonths: nullable(intIn("El contrato mínimo", 0, 120)),
    showPhone: z.boolean(),
    showWhatsapp: z.boolean(),
  })
  .partial()
  .strip();
export type DraftInputDto = z.infer<typeof draftInputSchema>;

export const presignSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string({ error: "Nombre de archivo no válido" }).max(250).default("foto"),
        mime: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"], { error: "Solo se aceptan imágenes JPG, PNG, WebP o AVIF" }),
        size: intIn("El tamaño de la foto", 1, 12 * 1024 * 1024),
        checksum: z.string({ error: "Falta el checksum" }).trim().min(8, "Checksum no válido").max(128, "Checksum no válido").regex(/^[A-Za-z0-9+/=_:.-]+$/, "Checksum no válido"),
        width: z.number().int().min(1).max(40_000).optional().nullable(),
        height: z.number().int().min(1).max(40_000).optional().nullable(),
      }),
    )
    .min(1, "Envía al menos un archivo")
    .max(30, "Máximo 30 archivos por solicitud"),
});
export type PresignDto = z.infer<typeof presignSchema>;

export const confirmSchema = z.object({
  images: z
    .array(z.object({ imageId: cuid("Imagen"), width: z.number().int().min(1).max(40_000).optional().nullable(), height: z.number().int().min(1).max(40_000).optional().nullable() }))
    .min(1, "Indica las imágenes a confirmar")
    .max(40),
});
export type ConfirmDto = z.infer<typeof confirmSchema>;

export const reorderSchema = z.object({ order: z.array(cuid("Imagen")).min(1).max(60), coverId: cuid("Imagen").optional().nullable() });
export type ReorderDto = z.infer<typeof reorderSchema>;

export const patchImageSchema = z.object({
  roomLabel: nullStr("La etiqueta", 60).optional(),
  caption: nullStr("El pie de foto", 200).optional(),
  isCover: z.boolean().optional(),
});
export type PatchImageDto = z.infer<typeof patchImageSchema>;

export const replaceSchema = z.object({
  mime: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"], { error: "Solo se aceptan imágenes JPG, PNG, WebP o AVIF" }),
  size: intIn("El tamaño", 1, 12 * 1024 * 1024),
  checksum: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9+/=_:.-]+$/, "Checksum no válido"),
  width: z.number().int().min(1).max(40_000).optional().nullable(),
  height: z.number().int().min(1).max(40_000).optional().nullable(),
});
export type ReplaceDto = z.infer<typeof replaceSchema>;

export const myListSchema = z.object({ status: z.string().trim().max(200).optional() });

export const interactionIdParam = z.string().min(1).max(40);
export { mediaUrlField, text };
