import { createHash, randomBytes } from "node:crypto";
import { ConflictException, ForbiddenException, Injectable, Logger, ServiceUnavailableException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import type { CookieOptions, Response } from "express";
import { AuditService } from "../../common/audit.service.js";
import { env } from "../../common/config.js";
import { MailerService, mailLayout } from "../../common/mailer.service.js";
import { Prisma, PrismaService } from "../../common/prisma.service.js";
import { SupabaseService } from "../../common/supabase.service.js";
import type { Role } from "../../generated/prisma/client.js";
import type { RegisterPendingDTO, SessionUser } from "../../contract.js";
import type { ChangePasswordDto, LoginDto, RegisterDto, ResetDto, UpdateMeDto } from "./dto.js";

const VERIFY_TTL_MS = 24 * 3600_000;
const RESEND_COOLDOWN_MS = 45_000;

export const ACCESS_TTL_S = 30 * 60;
export const REFRESH_TTL_S = 30 * 24 * 3600;
const BCRYPT_COST = 12;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface ReqMeta {
  ip?: string;
  userAgent?: string;
}

interface IssuedTokens {
  access: string;
  refresh: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger("Auth");
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly mailer: MailerService,
    private readonly supabase: SupabaseService,
  ) {}

  /* ---------- Cookies ---------- */
  private cookieBase(): CookieOptions {
    return { httpOnly: true, sameSite: "lax", secure: env.isProd, path: "/" };
  }
  setCookies(res: Response, t: IssuedTokens): void {
    res.cookie("access_token", t.access, { ...this.cookieBase(), maxAge: ACCESS_TTL_S * 1000 });
    res.cookie("refresh_token", t.refresh, { ...this.cookieBase(), maxAge: REFRESH_TTL_S * 1000 });
  }
  clearCookies(res: Response): void {
    res.clearCookie("access_token", this.cookieBase());
    res.clearCookie("refresh_token", this.cookieBase());
  }

  /* ---------- Tokens ---------- */
  private async issue(userId: string, role: string, meta: ReqMeta): Promise<IssuedTokens> {
    const access = await this.jwt.signAsync({ sub: userId, role }, { expiresIn: ACCESS_TTL_S });
    const refresh = randomBytes(48).toString("base64url");
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refresh),
        expiresAt: new Date(Date.now() + REFRESH_TTL_S * 1000),
        userAgent: meta.userAgent?.slice(0, 250) ?? null,
        ip: meta.ip?.slice(0, 64) ?? null,
      },
    });
    return { access, refresh };
  }

  /* ---------- Sesión ---------- */
  async sessionUser(userId: string): Promise<SessionUser> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, _count: { select: { notifications: { where: { readAt: null } } } } },
    });
    if (!u) throw new UnauthorizedException("La sesión ya no es válida");
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      role: u.role,
      verified: u.verified,
      createdAt: u.createdAt.toISOString(),
      profile: {
        displayName: u.profile?.displayName ?? null,
        bio: u.profile?.bio ?? null,
        whatsapp: u.profile?.whatsapp ?? null,
        company: u.profile?.company ?? null,
        website: u.profile?.website ?? null,
        city: u.profile?.city ?? null,
      },
      unreadNotifications: u._count.notifications,
    };
  }

  async register(dto: RegisterDto): Promise<RegisterPendingDTO> {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) throw new ConflictException({ message: "Ya existe una cuenta con este correo", errors: { email: ["Este correo ya está registrado"] } });
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    const role = dto.role ?? "USER";
    const token = randomBytes(32).toString("base64url");
    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerification.deleteMany({ where: { email, usedAt: null } });
      await tx.emailVerification.create({
        data: {
          email,
          name: dto.name,
          passwordHash,
          phone: dto.phone ?? null,
          role,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
        },
      });
    });
    await this.dispatchVerificationEmail({ email, name: dto.name, password: dto.password, phone: dto.phone, role, token });
    const out: RegisterPendingDTO = { ok: true, needsVerification: true, email, name: dto.name };
    if (!env.isProd) out.verifyToken = token;
    return out;
  }

  async verifyEmail(token: string, meta: ReqMeta): Promise<{ user: SessionUser; tokens: IssuedTokens }> {
    const row = await this.prisma.emailVerification.findUnique({ where: { tokenHash: sha256(token) } });
    return this.completePending(row, meta);
  }

  /** Confirma el correo con el token/código que Supabase pone en el enlace y abre sesión en Jucaro. */
  async verifySupabase(
    dto: { accessToken?: string; code?: string; tokenHash?: string; type?: "signup" | "email" | "invite" | "magiclink" | "recovery" | "email_change" },
    meta: ReqMeta,
  ): Promise<{ user: SessionUser; tokens: IssuedTokens }> {
    if (!this.supabase.enabled) {
      throw new ServiceUnavailableException("La confirmación por Supabase no está configurada");
    }
    let sb;
    try {
      if (dto.accessToken) sb = await this.supabase.userFromAccessToken(dto.accessToken);
      else if (dto.code) sb = await this.supabase.userFromCode(dto.code);
      else if (dto.tokenHash) sb = await this.supabase.userFromTokenHash(dto.tokenHash, dto.type ?? "signup");
      else throw new Error("sin credencial");
    } catch {
      throw new BadRequestException({ message: "El enlace no es válido o ya venció. Solicita uno nuevo", errors: { token: ["El enlace no es válido o ya venció"] } });
    }
    if (!sb.email) {
      throw new BadRequestException({ message: "El enlace no es válido o ya venció. Solicita uno nuevo", errors: { token: ["El enlace no es válido o ya venció"] } });
    }
    const existing = await this.prisma.user.findUnique({ where: { email: sb.email }, select: { id: true, status: true } });
    if (existing) {
      if (existing.status === "BLOCKED") throw new ForbiddenException("Tu cuenta está bloqueada. Contacta a soporte");
      await this.prisma.emailVerification.updateMany({ where: { email: sb.email, usedAt: null }, data: { usedAt: new Date() } });
      const tokens = await this.issue(existing.id, (await this.prisma.user.findUniqueOrThrow({ where: { id: existing.id }, select: { role: true } })).role, meta);
      return { user: await this.sessionUser(existing.id), tokens };
    }
    const row = await this.prisma.emailVerification.findFirst({
      where: { email: sb.email, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (row && row.expiresAt >= new Date()) return this.completePending(row, meta);
    // Sin fila pendiente: crea la cuenta con los datos guardados en Supabase user_metadata.
    return this.createFromSupabase(sb, meta);
  }

  async resendVerification(emailRaw: string): Promise<void> {
    const email = emailRaw.trim().toLowerCase();
    const pending = await this.prisma.emailVerification.findFirst({
      where: { email, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!pending) return;
    if (Date.now() - pending.createdAt.getTime() < RESEND_COOLDOWN_MS) return;
    const token = randomBytes(32).toString("base64url");
    await this.prisma.emailVerification.update({
      where: { id: pending.id },
      data: { tokenHash: sha256(token), expiresAt: new Date(Date.now() + VERIFY_TTL_MS) },
    });
    if (this.supabase.enabled) {
      try {
        await this.supabase.resendSignup(email);
        return;
      } catch (e) {
        this.logger.warn(`No se pudo reenviar con Supabase: ${(e as Error).message}`);
        if (env.isProd) {
          throw new ServiceUnavailableException("No pudimos reenviar el correo de confirmación. Inténtalo de nuevo en unos minutos.");
        }
      }
    }
    await this.sendVerifyMail(email, pending.name, token);
  }

  private async dispatchVerificationEmail(input: {
    email: string;
    name: string;
    password: string;
    phone?: string | null;
    role: string;
    token: string;
  }): Promise<void> {
    if (this.supabase.enabled) {
      try {
        await this.supabase.signUp({
          email: input.email,
          password: input.password,
          name: input.name,
          phone: input.phone,
          role: input.role,
        });
        return;
      } catch (e) {
        this.logger.warn(`Supabase Auth no envió el correo: ${(e as Error).message}`);
        if (env.isProd) {
          throw new ServiceUnavailableException(
            "No pudimos enviar el correo de confirmación. Revisa Supabase Auth (Confirm email + Redirect URLs) e inténtalo de nuevo.",
          );
        }
      }
    }
    await this.sendVerifyMail(input.email, input.name, input.token);
  }

  private async completePending(
    row: {
      id: string;
      email: string;
      name: string;
      phone: string | null;
      passwordHash: string;
      role: Role;
      usedAt: Date | null;
      expiresAt: Date;
    } | null,
    meta: ReqMeta,
  ): Promise<{ user: SessionUser; tokens: IssuedTokens }> {
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException({ message: "El enlace no es válido o ya venció. Solicita uno nuevo", errors: { token: ["El enlace no es válido o ya venció"] } });
    }
    const taken = await this.prisma.user.findUnique({ where: { email: row.email }, select: { id: true } });
    if (taken) throw new ConflictException({ message: "Ya existe una cuenta con este correo", errors: { email: ["Este correo ya está registrado"] } });
    const claimed = await this.prisma.emailVerification.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException({ message: "El enlace no es válido o ya venció. Solicita uno nuevo", errors: { token: ["El enlace no es válido o ya venció"] } });
    }
    return this.createLocalUser({
      email: row.email,
      name: row.name,
      phone: row.phone,
      passwordHash: row.passwordHash,
      role: row.role,
    }, meta);
  }

  private async createFromSupabase(
    sb: { email: string; name: string; phone: string | null; role: string },
    meta: ReqMeta,
  ): Promise<{ user: SessionUser; tokens: IssuedTokens }> {
    const role = (["USER", "OWNER", "AGENT"].includes(sb.role) ? sb.role : "USER") as Role;
    // Contraseña real vive en Supabase; aquí un hash aleatorio por si el login local se usa como respaldo.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), BCRYPT_COST);
    const pending = await this.prisma.emailVerification.findFirst({
      where: { email: sb.email, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    const hash = pending?.passwordHash ?? passwordHash;
    if (pending) {
      await this.prisma.emailVerification.update({ where: { id: pending.id }, data: { usedAt: new Date() } });
    }
    return this.createLocalUser({
      email: sb.email,
      name: pending?.name ?? sb.name,
      phone: pending?.phone ?? sb.phone,
      passwordHash: hash,
      role: pending?.role ?? role,
    }, meta);
  }

  private async createLocalUser(
    data: { email: string; name: string; phone: string | null; passwordHash: string; role: Role },
    meta: ReqMeta,
  ): Promise<{ user: SessionUser; tokens: IssuedTokens }> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          phone: data.phone,
          passwordHash: data.passwordHash,
          role: data.role,
          profile: { create: {} },
          ...(data.role === "AGENT" ? { agent: { create: {} } } : {}),
        },
        select: { id: true, role: true },
      });
      await this.audit.log({ actorId: user.id, action: "auth.register", entity: "User", entityId: user.id, meta: { role: user.role } });
      const tokens = await this.issue(user.id, user.role, meta);
      return { user: await this.sessionUser(user.id), tokens };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException({ message: "Ya existe una cuenta con este correo", errors: { email: ["Este correo ya está registrado"] } });
      }
      throw e;
    }
  }

  private async sendVerifyMail(to: string, name: string, token: string): Promise<void> {
    const url = `${env.webUrl}/confirmar-correo?token=${token}`;
    const sent = await this.mailer.send({
      to,
      subject: `Confirma tu correo en ${env.SITE_NAME}`,
      text: `Hola ${name},\n\nPara crear tu cuenta, abre este enlace (vence en 24 horas):\n${url}\n\nSi no pediste esta cuenta, ignora este mensaje. No se creará nada.`,
      html: mailLayout(
        "Confirma tu correo",
        [
          `Hola ${name}, usa el botón para confirmar tu correo y crear tu cuenta. El enlace vence en 24 horas.`,
          "Si no pediste esta cuenta, ignora este mensaje. No se creará nada.",
        ],
        { label: "Confirmar correo", url },
      ),
    });
    if (!sent) {
      throw new ServiceUnavailableException(
        "No pudimos enviar el correo de confirmación. Revisa que el servicio de correo esté configurado e inténtalo de nuevo.",
      );
    }
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= bcrypt.hash("nido-dummy-password", BCRYPT_COST);
    return this.dummyHash;
  }

  async login(dto: LoginDto, meta: ReqMeta): Promise<{ user: SessionUser; tokens: IssuedTokens }> {
    const email = dto.email.trim().toLowerCase();
    // Preferir Supabase Auth cuando está configurado (misma contraseña del registro).
    if (this.supabase.enabled) {
      const sb = await this.supabase.signIn(email, dto.password);
      if (sb) {
        const existing = await this.prisma.user.findUnique({ where: { email: sb.email }, select: { id: true, status: true, role: true } });
        if (existing) {
          if (existing.status === "BLOCKED") {
            await this.audit.log({ actorId: existing.id, action: "auth.login_blocked", entity: "User", entityId: existing.id });
            throw new ForbiddenException("Tu cuenta está bloqueada. Contacta a soporte");
          }
          await this.prisma.user.update({ where: { id: existing.id }, data: { lastLoginAt: new Date() } });
          await this.audit.log({ actorId: existing.id, action: "auth.login", entity: "User", entityId: existing.id, meta: { ip: meta.ip ?? null, via: "supabase" } });
          const tokens = await this.issue(existing.id, existing.role, meta);
          return { user: await this.sessionUser(existing.id), tokens };
        }
        // Confirmó en Supabase pero aún no tiene fila en Jucaro.
        if (sb.emailConfirmed) return this.createFromSupabase(sb, meta);
        throw new BadRequestException("Confirma tu correo antes de ingresar. Revisa la bandeja de entrada.");
      }
    }
    const u = await this.prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true, status: true, role: true } });
    // Se compara siempre contra un hash para no revelar por tiempo si el correo existe.
    const ok = await bcrypt.compare(dto.password, u?.passwordHash ?? (await this.getDummyHash()));
    if (!u || !ok) {
      await this.audit.log({ actorId: u?.id ?? null, action: "auth.login_failed", entity: "User", entityId: u?.id ?? null, meta: { email, ip: meta.ip ?? null } });
      throw new UnauthorizedException("Correo o contraseña incorrectos");
    }
    if (u.status === "BLOCKED") {
      await this.audit.log({ actorId: u.id, action: "auth.login_blocked", entity: "User", entityId: u.id });
      throw new ForbiddenException("Tu cuenta está bloqueada. Contacta a soporte");
    }
    await this.prisma.user.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
    await this.audit.log({ actorId: u.id, action: "auth.login", entity: "User", entityId: u.id, meta: { ip: meta.ip ?? null } });
    const tokens = await this.issue(u.id, u.role, meta);
    return { user: await this.sessionUser(u.id), tokens };
  }

  /** Rota el refresh token. Si un token ya rotado se vuelve a usar fuera de la ventana de gracia, se revocan todas las sesiones. */
  async refresh(raw: string | undefined, meta: ReqMeta): Promise<{ user: SessionUser; tokens: IssuedTokens }> {
    if (!raw) throw new UnauthorizedException("No hay sesión para renovar");
    const select = { id: true, userId: true, expiresAt: true, revokedAt: true, rotatedAt: true, user: { select: { id: true, role: true, status: true } } } as const;
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(raw) }, select });
    if (!row) throw new UnauthorizedException("La sesión expiró. Inicia sesión de nuevo");
    if (row.revokedAt) return this.reusedToken(row, meta);
    if (row.expiresAt < new Date() || row.user.status !== "ACTIVE") throw new UnauthorizedException("La sesión expiró. Inicia sesión de nuevo");
    // Rotación atómica: solo una petición concurrente puede consumir el token.
    const now = new Date();
    const claimed = await this.prisma.refreshToken.updateMany({ where: { id: row.id, revokedAt: null }, data: { revokedAt: now, rotatedAt: now } });
    if (claimed.count !== 1) {
      // Otra petición acaba de rotarlo (p. ej. varias páginas precargadas con la misma cookie): se trata como reutilización dentro de la gracia.
      const fresh = await this.prisma.refreshToken.findUnique({ where: { id: row.id }, select });
      if (!fresh?.revokedAt) throw new UnauthorizedException("La sesión expiró. Inicia sesión de nuevo");
      return this.reusedToken(fresh, meta);
    }
    const tokens = await this.issue(row.userId, row.user.role, meta);
    return { user: await this.sessionUser(row.userId), tokens };
  }

  /**
   * Token ya consumido. Revocado por logout/cambio de clave/bloqueo (sin `rotatedAt`): 401 sin más.
   * Rotado hace pocos segundos: carrera legítima (varias peticiones con la misma cookie) → se emite un par nuevo sin revocar nada.
   * Rotado hace más: posible robo del token → se revocan todas las sesiones del usuario y se audita.
   */
  private async reusedToken(
    row: { userId: string; expiresAt: Date; rotatedAt: Date | null; user: { role: Role; status: string } },
    meta: ReqMeta,
  ): Promise<{ user: SessionUser; tokens: IssuedTokens }> {
    const expired = new UnauthorizedException("La sesión expiró. Inicia sesión de nuevo");
    if (!row.rotatedAt) throw expired;
    if (Date.now() - row.rotatedAt.getTime() <= env.REFRESH_REUSE_GRACE_SECONDS * 1000) {
      if (row.expiresAt < new Date() || row.user.status !== "ACTIVE") throw expired;
      const tokens = await this.issue(row.userId, row.user.role, meta);
      return { user: await this.sessionUser(row.userId), tokens };
    }
    await this.prisma.refreshToken.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit.log({ actorId: row.userId, action: "auth.refresh_reuse_detected", entity: "User", entityId: row.userId, meta: { ip: meta.ip ?? null } });
    this.logger.warn(`Reutilización de refresh token detectada para el usuario ${row.userId}; sesiones revocadas`);
    throw expired;
  }

  async logout(raw: string | undefined): Promise<void> {
    if (!raw) return;
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: sha256(raw), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<SessionUser> {
    const userData: Record<string, unknown> = {};
    if (dto.name !== undefined) userData.name = dto.name;
    if (dto.phone !== undefined) userData.phone = dto.phone;
    if (dto.avatarUrl !== undefined) userData.avatarUrl = dto.avatarUrl;
    const profileData: Record<string, string | null> = {};
    for (const k of ["displayName", "bio", "whatsapp", "company", "website", "city"] as const) {
      if (dto[k] !== undefined) profileData[k] = dto[k] ?? null;
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: userData }),
      this.prisma.profile.upsert({ where: { userId }, update: profileData, create: { userId, ...profileData } }),
    ]);
    return this.sessionUser(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto, meta: ReqMeta): Promise<IssuedTokens> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, role: true } });
    if (!u) throw new UnauthorizedException("La sesión ya no es válida");
    if (!(await bcrypt.compare(dto.current, u.passwordHash))) {
      await this.audit.log({ actorId: userId, action: "auth.change_password_failed", entity: "User", entityId: userId });
      throw new BadRequestException({ message: "La contraseña actual no es correcta", errors: { current: ["La contraseña actual no es correcta"] } });
    }
    const passwordHash = await bcrypt.hash(dto.next, BCRYPT_COST);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit.log({ actorId: userId, action: "auth.change_password", entity: "User", entityId: userId });
    return this.issue(userId, u.role, meta);
  }

  async forgot(email: string): Promise<void> {
    const u = await this.prisma.user.findUnique({ where: { email }, select: { id: true, name: true, status: true } });
    if (!u || u.status !== "ACTIVE") return;
    const token = randomBytes(32).toString("base64url");
    await this.prisma.passwordReset.create({ data: { userId: u.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600_000) } });
    const url = `${env.webUrl}/restablecer?token=${token}`;
    await this.audit.log({ actorId: u.id, action: "auth.forgot_password", entity: "User", entityId: u.id });
    await this.mailer.send({
      to: email,
      subject: `Restablece tu contraseña de ${env.SITE_NAME}`,
      text: `Hola ${u.name},\n\nUsa este enlace para crear una nueva contraseña (vence en 1 hora):\n${url}\n\nSi no fuiste tú, ignora este mensaje.`,
      html: mailLayout("Restablece tu contraseña", [`Hola ${u.name}, usa el botón para crear una nueva contraseña. El enlace vence en 1 hora.`, "Si no fuiste tú, ignora este mensaje."], { label: "Crear nueva contraseña", url }),
    });
  }

  async reset(dto: ResetDto): Promise<void> {
    const row = await this.prisma.passwordReset.findUnique({ where: { tokenHash: sha256(dto.token) } });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException({ message: "El enlace no es válido o ya venció. Solicita uno nuevo", errors: { token: ["El enlace no es válido o ya venció"] } });
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    const claimed = await this.prisma.passwordReset.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw new BadRequestException("El enlace no es válido o ya venció. Solicita uno nuevo");
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit.log({ actorId: row.userId, action: "auth.reset_password", entity: "User", entityId: row.userId });
  }
}
