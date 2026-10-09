import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { type AuthedRequest, IS_PUBLIC, ROLES_KEY } from "./decorators.js";
import { PrismaService } from "./prisma.service.js";
import type { Role } from "../generated/prisma/client.js";

export interface AccessPayload {
  sub: string;
  role?: Role;
}

export function extractToken(req: Request): string | null {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const fromCookie = cookies?.access_token;
  if (fromCookie) return fromCookie;
  const h = req.headers.authorization;
  if (h && /^Bearer\s+/i.test(h)) return h.replace(/^Bearer\s+/i, "").trim() || null;
  return null;
}

/**
 * Guard global. Por defecto toda ruta exige sesión; con @Public() la sesión es opcional pero,
 * si el token es válido, el usuario se adjunta igualmente (para `isFavorite`, vista de dueño, etc.).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== "http") return true;
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);

    const token = extractToken(req);
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<AccessPayload>(token);
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, name: true, role: true, verified: true, status: true },
        });
        if (user && user.status === "ACTIVE") {
          req.user = { id: user.id, email: user.email, name: user.name, role: user.role, verified: user.verified };
        }
      } catch {
        /* token inválido o vencido: se trata como anónimo */
      }
    }

    if (isPublic && !roles) return true;
    if (!req.user) throw new UnauthorizedException("Debes iniciar sesión para continuar");
    if (roles?.length && !roles.includes(req.user.role)) {
      throw new ForbiddenException("No tienes permisos para realizar esta acción");
    }
    return true;
  }
}
