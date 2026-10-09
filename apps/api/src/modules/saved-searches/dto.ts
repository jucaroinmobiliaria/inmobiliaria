import { text, z } from "../../common/zod.js";

export const createSavedSearchSchema = z.object({
  name: text("El nombre", 2, 80),
  query: z.record(z.string(), z.union([z.string().max(500), z.number(), z.boolean()])).default({}),
  frequency: z.enum(["NONE", "INSTANT", "DAILY", "WEEKLY"], { error: "Frecuencia no válida" }).default("DAILY"),
});
export type CreateSavedSearchDto = z.infer<typeof createSavedSearchSchema>;
