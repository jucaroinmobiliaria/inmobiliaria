import { emailField, optText, phoneField, text, z } from "../../common/zod.js";

export const createInquirySchema = z.object({
  name: text("El nombre", 2, 80),
  email: emailField,
  phone: z.union([phoneField, z.null()]).transform((v) => (v === "" || v === null ? null : v)).optional(),
  message: text("El mensaje", 5, 2000),
});
export type CreateInquiryDto = z.infer<typeof createInquirySchema>;

export const listInquiriesSchema = z.object({
  scope: z.enum(["received", "sent"]).catch("received"),
  status: z.enum(["NEW", "REPLIED", "CLOSED"]).optional().catch(undefined),
});
export type ListInquiriesDto = z.infer<typeof listInquiriesSchema>;

export const messageSchema = z.object({ body: text("El mensaje", 1, 2000) });
export type MessageDto = z.infer<typeof messageSchema>;

export const inquiryStatusSchema = z.object({ status: z.enum(["NEW", "REPLIED", "CLOSED"], { error: "Estado no válido" }) });
export type InquiryStatusDto = z.infer<typeof inquiryStatusSchema>;

export const createVisitSchema = z.object({
  name: text("El nombre", 2, 80),
  email: emailField,
  phone: z.union([phoneField, z.null()]).transform((v) => (v === "" || v === null ? null : v)).optional(),
  scheduledAt: z.string({ error: "Elige la fecha y hora de la visita" }).max(40),
  note: z.union([optText("La nota", 500), z.null()]).transform((v) => (v ? v : null)).optional(),
});
export type CreateVisitDto = z.infer<typeof createVisitSchema>;

export const listVisitsSchema = z.object({ scope: z.enum(["received", "sent"]).catch("received") });
export const visitStatusSchema = z.object({ status: z.enum(["REQUESTED", "CONFIRMED", "DONE", "CANCELLED"], { error: "Estado no válido" }) });
export type VisitStatusDto = z.infer<typeof visitStatusSchema>;

export const reportSchema = z.object({
  reason: text("El motivo", 3, 100),
  details: z.union([optText("Los detalles", 1000), z.null()]).transform((v) => (v ? v : null)).optional(),
});
export type ReportDto = z.infer<typeof reportSchema>;
