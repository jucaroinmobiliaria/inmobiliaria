import { cuid, nullable, queryInt, text, z } from "../../common/zod.js";

const page = z.object({ page: queryInt(1, 100_000).optional(), pageSize: queryInt(1, 60).optional() });

export const adminPublicationsQuery = page.extend({
  status: z.string().trim().max(120).optional(),
  q: z.string().trim().max(120).optional(),
});
export type AdminPublicationsQuery = z.infer<typeof adminPublicationsQuery>;

export const adminUsersQuery = page.extend({
  q: z.string().trim().max(120).optional(),
  role: z.enum(["USER", "AGENT", "OWNER", "ADMIN"]).optional().catch(undefined),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuery>;

export const adminAuditQuery = page.extend({ action: z.string().trim().max(60).optional(), entity: z.string().trim().max(60).optional() });
export type AdminAuditQuery = z.infer<typeof adminAuditQuery>;

export const adminReportsQuery = z.object({ status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]).optional().catch(undefined) });

export const rejectSchema = z.object({ reason: text("El motivo", 3, 500) });
export type RejectDto = z.infer<typeof rejectSchema>;

export const featureSchema = z.object({
  featured: z.boolean({ error: "Indica si se destaca" }),
  days: z.number().int().min(1, "Mínimo 1 día").max(365, "Máximo 365 días").optional().nullable(),
});
export type FeatureDto = z.infer<typeof featureSchema>;

export const adminUserPatchSchema = z.object({
  role: z.enum(["USER", "AGENT", "OWNER", "ADMIN"], { error: "Rol no válido" }).optional(),
  status: z.enum(["ACTIVE", "BLOCKED"], { error: "Estado no válido" }).optional(),
  verified: z.boolean().optional(),
});
export type AdminUserPatchDto = z.infer<typeof adminUserPatchSchema>;

export const reportPatchSchema = z.object({ status: z.enum(["OPEN", "RESOLVED", "DISMISSED"], { error: "Estado no válido" }) });

const icon = z.string().trim().min(1).max(30).regex(/^[a-z0-9-]+$/, "Icono no válido");
const lat = z.number({ error: "Latitud no válida" }).min(-90).max(90);
const lng = z.number({ error: "Longitud no válida" }).min(-180).max(180);

export const catalogSchemas = {
  types: z.object({ name: text("El nombre", 2, 60), pluralName: text("El plural", 2, 70), icon: icon.optional(), group: text("El grupo", 2, 40).optional(), sortOrder: z.number().int().min(0).max(1000).optional() }),
  amenities: z.object({ name: text("El nombre", 2, 60), icon: icon.optional(), category: z.enum(["INTERIOR", "BUILDING", "EXTERIOR", "SURROUNDINGS"], { error: "Categoría no válida" }), sortOrder: z.number().int().min(0).max(1000).optional() }),
  cities: z.object({ name: text("El nombre", 2, 60), department: text("El departamento", 2, 60), lat, lng, coverUrl: nullable(z.string().trim().max(600).regex(/^https?:\/\/\S+$/, "La portada debe ser una URL https")).optional(), active: z.boolean().optional() }),
  neighborhoods: z.object({ cityId: cuid("Ciudad"), name: text("El nombre", 2, 80), lat, lng }),
} as const;

export type CatalogKind = keyof typeof catalogSchemas;
export const catalogKinds = Object.keys(catalogSchemas) as CatalogKind[];
