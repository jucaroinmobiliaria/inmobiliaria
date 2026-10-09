import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: {
    // DIRECT_URL (conexión directa, sin pooler) se usa para migraciones; DATABASE_URL para la app.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/inmobiliaria",
  },
});
