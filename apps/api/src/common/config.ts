import { z } from "zod";

// Carga .env (Node >= 22) sin pisar variables ya definidas por la plataforma.
try {
  process.loadEnvFile();
} catch {
  /* sin .env: se usan las variables del entorno */
}

const bool = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === "boolean" ? v : ["1", "true", "yes", "si", "sí"].includes(v.trim().toLowerCase())));

const optStr = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  /** Proyecto Supabase (REST). No sustituye a DATABASE_URL: Prisma habla con Postgres. */
  SUPABASE_URL: optStr,
  SUPABASE_ANON_KEY: optStr,
  /** Solo servidor. Nunca la expongas al navegador. */
  SUPABASE_SERVICE_ROLE_KEY: optStr,
  /** Secreto con el que Supabase firma sus JWT (anon y service role). No es el JWT_SECRET de las sesiones de Jucaro. */
  SUPABASE_JWT_SECRET: optStr,
  DB_POOL_MAX: z.coerce.number().int().positive().default(5),
  JWT_SECRET: z.string().min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  /** Origen público de la web (para enlaces en correos y URLs absolutas). Por defecto, el primer WEB_ORIGIN. */
  WEB_PUBLIC_URL: optStr,
  API_PUBLIC_URL: optStr,
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  UPLOAD_DIR: z.string().default("./uploads"),
  S3_ENDPOINT: optStr,
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: optStr,
  S3_ACCESS_KEY_ID: optStr,
  S3_SECRET_ACCESS_KEY: optStr,
  S3_PUBLIC_URL: optStr,
  S3_FORCE_PATH_STYLE: bool.default(false),
  AUTO_APPROVE: bool.default(false),
  SITE_NAME: z.string().default("Jucaro"),
  CRON_SECRET: optStr,
  RESEND_API_KEY: optStr,
  MAIL_FROM: optStr,
  AI_API_KEY: optStr,
  AI_MODEL: optStr,
  AI_API_URL: z.string().default("https://api.anthropic.com/v1/messages"),
  /** Multiplica los límites de peticiones (útil en desarrollo, donde el SSR y varios equipos comparten IP). */
  RATE_LIMIT_FACTOR: z.coerce.number().positive().optional(),
  /** Ventana (s) tras rotar un refresh token en la que reutilizarlo no se considera robo (carreras legítimas entre pestañas). */
  REFRESH_REUSE_GRACE_SECONDS: z.coerce.number().min(0).default(5),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Configuración de entorno inválida:\n${lines}`);
}

const e = parsed.data;
const origins = e.WEB_ORIGIN.split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);

export const env = {
  ...e,
  isProd: e.NODE_ENV === "production",
  webOrigins: origins,
  webUrl: (e.WEB_PUBLIC_URL ?? origins[0] ?? "http://localhost:3000").replace(/\/$/, ""),
  rateLimitFactor: e.RATE_LIMIT_FACTOR ?? (e.NODE_ENV === "production" ? 1 : 25),
};
export type Env = typeof env;
