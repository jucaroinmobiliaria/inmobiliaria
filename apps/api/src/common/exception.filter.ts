import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import type { Response } from "express";
import { Prisma } from "../generated/prisma/client.js";

const DEFAULT_MESSAGES: Record<number, string> = {
  400: "Solicitud inválida",
  401: "Debes iniciar sesión para continuar",
  403: "No tienes permisos para realizar esta acción",
  404: "No encontrado",
  405: "Método no permitido",
  409: "Conflicto con el estado actual del recurso",
  413: "El contenido enviado es demasiado grande",
  415: "Tipo de contenido no soportado",
  422: "Los datos enviados no son procesables",
  429: "Demasiadas solicitudes. Intenta de nuevo en un minuto",
  500: "Ocurrió un error inesperado. Intenta de nuevo",
  503: "Servicio no disponible por el momento",
};

const ENGLISH_DEFAULTS = new Set([
  "Bad Request", "Unauthorized", "Forbidden", "Not Found", "Forbidden resource", "Conflict", "Internal Server Error",
  "Payload Too Large", "Unprocessable Entity", "Method Not Allowed", "Service Unavailable", "Unsupported Media Type",
]);

interface ErrorBody {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Http");

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) return;
    const body = this.toBody(exception);
    if (body.statusCode >= 500) this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    res.status(body.statusCode).json(body);
  }

  private toBody(e: unknown): ErrorBody {
    if (e instanceof ThrottlerException) {
      return { statusCode: 429, message: DEFAULT_MESSAGES[429]! };
    }
    if (e instanceof HttpException) {
      const status = e.getStatus();
      const r = e.getResponse();
      let message = DEFAULT_MESSAGES[status] ?? "Error";
      let errors: Record<string, string[]> | undefined;
      if (typeof r === "string") {
        message = ENGLISH_DEFAULTS.has(r) ? message : r;
      } else if (r && typeof r === "object") {
        const o = r as { message?: unknown; errors?: unknown };
        if (typeof o.message === "string") message = ENGLISH_DEFAULTS.has(o.message) ? message : o.message;
        else if (Array.isArray(o.message) && o.message.length) message = String(o.message[0]);
        if (o.errors && typeof o.errors === "object") errors = o.errors as Record<string, string[]>;
      }
      return { statusCode: status, message, ...(errors ? { errors } : {}) };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return { statusCode: 409, message: "Ya existe un registro con esos datos" };
      if (e.code === "P2025") return { statusCode: 404, message: DEFAULT_MESSAGES[404]! };
      if (e.code === "P2003") return { statusCode: 409, message: "El registro está relacionado con otros datos" };
    }
    // Errores de body-parser / express con `status`
    const anyErr = e as { status?: number; statusCode?: number; type?: string } | null;
    const st = anyErr?.status ?? anyErr?.statusCode;
    if (typeof st === "number" && st >= 400 && st < 500) {
      if (anyErr?.type === "entity.parse.failed") return { statusCode: 400, message: "El cuerpo de la solicitud no es un JSON válido" };
      return { statusCode: st, message: DEFAULT_MESSAGES[st] ?? "Solicitud inválida" };
    }
    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: DEFAULT_MESSAGES[500]! };
  }
}
