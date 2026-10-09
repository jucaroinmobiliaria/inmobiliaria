import { createHmac, timingSafeEqual } from "node:crypto";
import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { env } from "../../common/config.js";
import { PrismaService } from "../../common/prisma.service.js";

interface SignupInput {
  email: string;
  password: string;
  name: string;
  phone: string | null;
  role: string;
}

interface AuthRow {
  id: string;
  confirmed: boolean;
}

interface TokenPayload {
  email?: string;
  aud?: string;
  exp?: number;
}

/**
 * Alta en Supabase Authentication (`auth.users`) y envío del correo de confirmación
 * con el SMTP del proyecto. La sesión de Jucaro sigue siendo la de esta API.
 */
@Injectable()
export class SupabaseAuthService {
  private readonly logger = new Logger("SupabaseAuth");

  constructor(private readonly prisma: PrismaService) {}

  get enabled(): boolean {
    return Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY);
  }

  /** Crea el usuario en Authentication, o actualiza la clave si aún no confirmó. */
  async ensureSignup(input: SignupInput): Promise<void> {
    if (!this.enabled) {
      if (env.isProd) {
        throw new ServiceUnavailableException("Falta configurar Supabase Auth en el servidor: SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY.");
      }
      return;
    }
    const outcome = await this.createUser(input);
    if (outcome === "created") return;
    const row = await this.findByEmail(input.email);
    if (!row) {
      throw new ServiceUnavailableException("No pudimos registrar el correo en Supabase. Inténtalo de nuevo en unos minutos.");
    }
    if (row.confirmed) return;
    await this.patchUser(row.id, {
      password: input.password,
      email_confirm: false,
      user_metadata: this.metadata(input),
    });
  }

  /** Pide a Supabase que envíe el correo de confirmación. Devuelve false si el SMTP no está listo. */
  async sendConfirmation(email: string): Promise<boolean> {
    if (!this.enabled || !env.SUPABASE_ANON_KEY || !env.SUPABASE_URL) return false;
    const redirect = `${env.webUrl}/confirmar-correo`;
    const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/resend`);
    url.searchParams.set("redirect_to", redirect);
    const res = await this.call(url, env.SUPABASE_ANON_KEY, { type: "signup", email });
    if (!res.ok) {
      this.logger.warn(`Supabase no envió la confirmación a ${email}: ${res.status} ${res.detail}`);
      return false;
    }
    return true;
  }

  /** Marca el correo como confirmado en Authentication después de validar nuestro enlace. */
  async confirmEmail(email: string): Promise<void> {
    if (!this.enabled) return;
    try {
      const row = await this.findByEmail(email);
      if (!row || row.confirmed) return;
      await this.patchUser(row.id, { email_confirm: true });
    } catch (err) {
      this.logger.warn(`No se confirmó ${email} en Supabase Auth: ${(err as Error).message}`);
    }
  }

  /** Mantiene la clave de Authentication alineada con la de Jucaro. No interrumpe el cambio local. */
  async setPassword(email: string, password: string): Promise<void> {
    if (!this.enabled) return;
    try {
      const row = await this.findByEmail(email);
      if (!row) return;
      await this.patchUser(row.id, { password });
    } catch (err) {
      this.logger.warn(`No se actualizó la clave de ${email} en Supabase Auth: ${(err as Error).message}`);
    }
  }

  /** Valida el access_token con el que Supabase vuelve a /confirmar-correo. */
  verifyAccessToken(token: string): { email: string } {
    if (!env.SUPABASE_JWT_SECRET) {
      throw new ServiceUnavailableException("Falta SUPABASE_JWT_SECRET en el servidor para confirmar el correo.");
    }
    const parts = token.split(".");
    if (parts.length !== 3) throw new BadRequestException("El enlace de confirmación no es válido.");
    const [header, payload, sig] = parts as [string, string, string];
    let alg = "";
    try {
      alg = String((JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as { alg?: string }).alg ?? "");
    } catch {
      throw new BadRequestException("El enlace de confirmación no es válido.");
    }
    if (alg !== "HS256") throw new BadRequestException("El enlace de confirmación no es válido.");
    const expected = createHmac("sha256", env.SUPABASE_JWT_SECRET).update(`${header}.${payload}`).digest();
    const got = Buffer.from(sig, "base64url");
    if (got.length !== expected.length || !timingSafeEqual(got, expected)) {
      throw new BadRequestException("El enlace de confirmación no es válido.");
    }
    let body: TokenPayload;
    try {
      body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as TokenPayload;
    } catch {
      throw new BadRequestException("El enlace de confirmación no es válido.");
    }
    if (body.aud !== "authenticated" || !body.email || (body.exp ?? 0) * 1000 < Date.now()) {
      throw new BadRequestException("El enlace de confirmación no es válido o ya venció.");
    }
    return { email: body.email.trim().toLowerCase() };
  }

  private metadata(input: SignupInput): Record<string, string> {
    const meta: Record<string, string> = { name: input.name, app_role: input.role };
    if (input.phone) meta.phone = input.phone;
    return meta;
  }

  private async createUser(input: SignupInput): Promise<"created" | "exists"> {
    const res = await this.admin("/admin/users", {
      email: input.email,
      password: input.password,
      email_confirm: false,
      user_metadata: this.metadata(input),
    });
    if (res.ok) return "created";
    if (res.status === 422 && /password/i.test(res.detail)) {
      throw new BadRequestException({
        message: "Supabase no aceptó la contraseña. Usa al menos 8 caracteres, con letras y números.",
        errors: { password: ["Supabase no aceptó la contraseña. Usa al menos 8 caracteres, con letras y números."] },
      });
    }
    if (this.isDuplicate(res)) return "exists";
    this.logger.warn(`No se pudo crear el usuario en Supabase Auth: ${res.status} ${res.detail}`);
    throw new ServiceUnavailableException("No pudimos registrar el correo en Supabase. Inténtalo de nuevo en unos minutos.");
  }

  private async patchUser(id: string, body: Record<string, unknown>): Promise<void> {
    const res = await this.admin(`/admin/users/${id}`, body, "PUT");
    if (!res.ok) {
      this.logger.warn(`No se pudo actualizar ${id} en Supabase Auth: ${res.status} ${res.detail}`);
      throw new ServiceUnavailableException("No pudimos actualizar la cuenta en Supabase. Inténtalo de nuevo en unos minutos.");
    }
  }

  private async findByEmail(email: string): Promise<AuthRow | null> {
    try {
      const rows = await this.prisma.$queryRaw<AuthRow[]>`
        select id::text as id, (email_confirmed_at is not null) as confirmed
        from auth.users
        where lower(email) = lower(${email})
        limit 1
      `;
      return rows[0] ?? null;
    } catch (err) {
      this.logger.warn(`No se pudo leer auth.users: ${(err as Error).message}`);
      return null;
    }
  }

  private isDuplicate(res: { status: number; detail: string }): boolean {
    return res.status === 409 || /already|exists|duplicate/i.test(res.detail);
  }

  private admin(path: string, body: Record<string, unknown>, method = "POST"): Promise<{ ok: boolean; status: number; detail: string }> {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return Promise.resolve({ ok: false, status: 0, detail: "sin service role" });
    }
    const url = `${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1${path}`;
    return this.call(url, env.SUPABASE_SERVICE_ROLE_KEY, body, method);
  }

  private async call(url: string | URL, key: string, body: Record<string, unknown>, method = "POST"): Promise<{ ok: boolean; status: number; detail: string }> {
    try {
      const res = await fetch(url, {
        method,
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      const text = await res.text();
      return { ok: res.ok, status: res.status, detail: text.replace(/\s+/g, " ").slice(0, 240) };
    } catch (err) {
      return { ok: false, status: 0, detail: (err as Error).message };
    }
  }
}
