import { createParamDecorator, type ExecutionContext, SetMetadata, applyDecorators } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import type { Role } from "../generated/prisma/client.js";

export const IS_PUBLIC = "nido:public";
export const ROLES_KEY = "nido:roles";
export const IS_AUTH = "nido:auth";

/** Ruta sin sesión obligatoria (si hay sesión válida, se adjunta el usuario). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Requiere cualquier sesión. */
export const Auth = () => SetMetadata(IS_AUTH, true);
/** Requiere uno de los roles indicados. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  verified: boolean;
}

export type AuthedRequest = Request & { user?: AuthUser };

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
  return ctx.switchToHttp().getRequest<AuthedRequest>().user;
});

/** Usuario obligatorio (rutas @Auth/@Roles): el guard garantiza que existe. */
export const Me = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const u = ctx.switchToHttp().getRequest<AuthedRequest>().user;
  if (!u) throw new Error("Me() usado en una ruta sin sesión");
  return u;
});

/** 10 peticiones/min (auth). */
export const AuthLimit = () => applyDecorators(Throttle({ default: { limit: 10, ttl: 60_000 } }));
/** 6 peticiones/min (formularios públicos). */
export const FormLimit = () => applyDecorators(Throttle({ default: { limit: 6, ttl: 60_000 } }));
