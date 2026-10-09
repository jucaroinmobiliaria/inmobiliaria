import { Injectable, Logger } from "@nestjs/common";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { env } from "./config.js";

export type SupabaseAuthUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  name: string;
  phone: string | null;
  role: string;
};

/** Cliente Supabase Auth: registro, correo de confirmación e inicio de sesión. */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger("Supabase");
  private anon: SupabaseClient | null = null;

  get enabled(): boolean {
    return Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
  }

  private client(): SupabaseClient {
    if (!this.enabled) throw new Error("Supabase Auth no está configurado");
    this.anon ??= createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false, flowType: "pkce" },
    });
    return this.anon;
  }

  redirectTo(): string {
    return `${env.webUrl}/confirmar-correo`;
  }

  private mapUser(user: User): SupabaseAuthUser {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const roleRaw = typeof meta.role === "string" ? meta.role : "USER";
    const role = ["USER", "OWNER", "AGENT"].includes(roleRaw) ? roleRaw : "USER";
    return {
      id: user.id,
      email: (user.email ?? "").toLowerCase(),
      emailConfirmed: Boolean(user.email_confirmed_at),
      name: typeof meta.name === "string" && meta.name.trim() ? meta.name.trim() : (user.email ?? "Usuario"),
      phone: typeof meta.phone === "string" && meta.phone.trim() ? meta.phone.trim() : null,
      role,
    };
  }

  /** Registra en Auth y dispara el correo de confirmación de Supabase. */
  async signUp(input: { email: string; password: string; name: string; phone?: string | null; role: string }): Promise<void> {
    const { data, error } = await this.client().auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: this.redirectTo(),
        data: { name: input.name, phone: input.phone ?? null, role: input.role },
      },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || error.code === "user_already_exists") {
        await this.resendSignup(input.email);
        return;
      }
      this.logger.warn(`signUp falló: ${error.message}`);
      throw error;
    }
    if (data.session) {
      this.logger.warn("Supabase devolvió sesión al registrar: activa «Confirm email» en Authentication → Providers → Email");
    }
  }

  async resendSignup(email: string): Promise<void> {
    const { error } = await this.client().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: this.redirectTo() },
    });
    if (error) {
      this.logger.warn(`resend signup falló: ${error.message}`);
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<SupabaseAuthUser | null> {
    const { data, error } = await this.client().auth.signInWithPassword({ email, password });
    if (error || !data.user?.email) {
      if (error) this.logger.warn(`signIn: ${error.message}`);
      return null;
    }
    return this.mapUser(data.user);
  }

  async userFromAccessToken(accessToken: string): Promise<SupabaseAuthUser> {
    const { data, error } = await this.client().auth.getUser(accessToken);
    if (error || !data.user?.email) throw new Error(error?.message ?? "Token de Supabase inválido");
    return this.mapUser(data.user);
  }

  async userFromCode(code: string): Promise<SupabaseAuthUser> {
    const { data, error } = await this.client().auth.exchangeCodeForSession(code);
    if (error || !data.user?.email) throw new Error(error?.message ?? "Código de Supabase inválido");
    return this.mapUser(data.user);
  }

  async userFromTokenHash(tokenHash: string, type: "signup" | "email" | "invite" | "magiclink" | "recovery" | "email_change"): Promise<SupabaseAuthUser> {
    const { data, error } = await this.client().auth.verifyOtp({ token_hash: tokenHash, type });
    if (error || !data.user?.email) throw new Error(error?.message ?? "Enlace de Supabase inválido");
    return this.mapUser(data.user);
  }
}
