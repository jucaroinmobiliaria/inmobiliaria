import { cuid, text, z } from "../../common/zod.js";

export const ensureNeighborhoodSchema = z.object({
  cityId: cuid("Ciudad"),
  name: text("El barrio", 2, 80),
});
export type EnsureNeighborhoodDto = z.infer<typeof ensureNeighborhoodSchema>;
