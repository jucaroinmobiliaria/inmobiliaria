import "reflect-metadata";
import { mkdirSync } from "node:fs";
import path from "node:path";
import "./common/bigint.js";
import { env } from "./common/config.js";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { sanitizeDeep } from "./common/sanitize.js";

/** Sanitiza body y query de toda petición (etiquetas HTML y caracteres de control). */
function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") req.body = sanitizeDeep(req.body);
  // En Express 5 `req.query` es un getter: se redefine como propiedad propia.
  Object.defineProperty(req, "query", { value: sanitizeDeep({ ...req.query }), writable: true, configurable: true, enumerable: true });
  next();
}

export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false, logger: ["error", "warn", "log"] });
  app.set("trust proxy", env.TRUST_PROXY);
  app.disable("x-powered-by");
  app.use(
    helmet({
      // La API sirve JSON y archivos subidos que el sitio web (otro origen) embebe en <img>.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    }),
  );
  app.enableCors({
    origin: (origin, cb) => cb(null, !origin || env.webOrigins.includes(origin.replace(/\/$/, ""))),
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-cron-secret", "x-requested-with"],
    maxAge: 600,
  });
  if (env.STORAGE_DRIVER === "local") {
    const dir = path.resolve(env.UPLOAD_DIR);
    mkdirSync(dir, { recursive: true });
    // Claves únicas por subida: se pueden cachear "para siempre". No hay listado de directorios.
    app.useStaticAssets(dir, { prefix: "/files", index: false, dotfiles: "deny", maxAge: "365d", immutable: true } as Parameters<NestExpressApplication["useStaticAssets"]>[1]);
  }
  // Por defecto las respuestas de la API no se cachean (hay datos de sesión y `isFavorite`); los handlers públicos pueden fijar su propio Cache-Control.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(cookieParser());
  app.useBodyParser("json", { limit: "1mb" });
  app.useBodyParser("urlencoded", { extended: false, limit: "100kb" });
  app.use(sanitizeInput);
  app.enableShutdownHooks();
  return app;
}

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const port = env.PORT;
  await app.listen(port, "0.0.0.0");
  console.log(`${env.SITE_NAME} API escuchando en http://localhost:${port} (${env.NODE_ENV}, almacenamiento: ${env.STORAGE_DRIVER})`);
}

void bootstrap();
