import { emailField, mediaUrlField, nullableText, phoneField, text, urlField, z } from "../../common/zod.js";

const password = z
  .string({ error: "La contraseña es obligatoria" })
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña no puede superar los 72 caracteres");

const nullPhone = z
  .union([phoneField, z.null()])
  .transform((v) => (v === "" || v === null ? null : v));

const nullUrl = (label: string) =>
  z.union([urlField(label), z.literal(""), z.null()]).transform((v) => (v === "" || v === null ? null : v));

export const registerSchema = z.object({
  name: text("El nombre", 2, 80),
  email: emailField,
  password,
  phone: nullPhone.optional(),
  role: z.enum(["USER", "OWNER", "AGENT"], { error: "Rol no válido" }).optional(),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailField,
  password: z.string({ error: "La contraseña es obligatoria" }).min(1, "La contraseña es obligatoria").max(200),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const updateMeSchema = z.object({
  name: text("El nombre", 2, 80).optional(),
  phone: nullPhone.optional(),
  avatarUrl: z.union([mediaUrlField("La foto"), z.literal(""), z.null()]).transform((v) => (v === "" || v === null ? null : v)).optional(),
  displayName: nullableText("El nombre público", 80).optional(),
  bio: nullableText("La biografía", 1200).optional(),
  whatsapp: nullPhone.optional(),
  company: nullableText("La empresa", 120).optional(),
  website: nullUrl("El sitio web").optional(),
  city: nullableText("La ciudad", 80).optional(),
});
export type UpdateMeDto = z.infer<typeof updateMeSchema>;

export const changePasswordSchema = z.object({
  current: z.string({ error: "Indica tu contraseña actual" }).min(1, "Indica tu contraseña actual").max(200),
  next: password,
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const forgotSchema = z.object({ email: emailField });
export type ForgotDto = z.infer<typeof forgotSchema>;

export const resetSchema = z.object({
  token: z.string({ error: "El enlace no es válido" }).min(20, "El enlace no es válido").max(200, "El enlace no es válido"),
  password,
});
export type ResetDto = z.infer<typeof resetSchema>;

export const verifyEmailSchema = z.object({
  token: z.string({ error: "El enlace no es válido" }).min(20, "El enlace no es válido").max(200, "El enlace no es válido"),
});
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;

export const verifySupabaseSchema = z.object({
  accessToken: z.string({ error: "El enlace no es válido" }).min(20, "El enlace no es válido").max(8000, "El enlace no es válido"),
});
export type VerifySupabaseDto = z.infer<typeof verifySupabaseSchema>;

export const resendVerificationSchema = forgotSchema;
export type ResendVerificationDto = ForgotDto;
