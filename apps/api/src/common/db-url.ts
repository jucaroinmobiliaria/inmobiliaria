import type { PoolConfig } from "pg";

/**
 * Convierte DATABASE_URL en la configuración del pool de `pg`.
 * node-postgres trata `sslmode=require` como `verify-full` (exige una CA pública), lo que falla con los
 * pooler de Supabase/Neon. Aquí replicamos la semántica de libpq:
 *   disable                -> sin SSL
 *   require / prefer / …   -> SSL cifrado sin verificar el certificado
 *   verify-ca / verify-full-> SSL verificando el certificado (debe confiar en la CA del servidor)
 */
export function pgPoolConfig(databaseUrl: string, extra: PoolConfig = {}): PoolConfig {
  let connectionString = databaseUrl;
  let ssl: PoolConfig["ssl"];
  try {
    const u = new URL(databaseUrl);
    const mode = u.searchParams.get("sslmode");
    if (mode) {
      u.searchParams.delete("sslmode");
      u.searchParams.delete("sslrootcert");
      u.searchParams.delete("uselibpqcompat");
      connectionString = u.toString();
      if (mode === "disable") ssl = false;
      else ssl = { rejectUnauthorized: mode === "verify-ca" || mode === "verify-full" };
    }
  } catch {
    /* URL no estándar: se pasa tal cual */
  }
  return { connectionString, ...(ssl !== undefined ? { ssl } : {}), ...extra };
}
