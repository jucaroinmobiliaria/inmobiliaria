import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Sirve el worker de MapLibre (y su módulo compartido) desde node_modules.
 * Los bundlers no copian `maplibre-gl-worker.mjs`, así que el mapa lo pide a esta ruta (ver components/map/maplibre.ts).
 */
const ALLOWED = new Set(["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]);

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!ALLOWED.has(file)) return new Response("Not found", { status: 404 });
  // En monorepo con hoisting el paquete puede vivir en la raíz del repo.
  for (const base of [process.cwd(), path.join(process.cwd(), "..", "..")]) {
    try {
      const body = await readFile(path.join(base, "node_modules", "maplibre-gl", "dist", file));
      return new Response(new Uint8Array(body), { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=86400" } });
    } catch { /* probar la siguiente ruta */ }
  }
  return new Response("Not found", { status: 404 });
}
