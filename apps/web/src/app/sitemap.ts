import type { MetadataRoute } from "next";
import { apiServer } from "@/lib/server";
import { absoluteUrl } from "@/lib/site";
import type { SitemapEntry } from "@/lib/types";

export const revalidate = 3600;

/** Rutas de listado (venta/tipo/ciudad/barrio) derivadas de las rutas de ficha: /op/tipo/ciudad/[barrio]/slug-code. */
function ancestors(path: string): string[] {
  const segs = path.split("/").filter(Boolean);
  if (segs.length < 3) return [];
  const parents = segs.slice(0, -1);
  const out: string[] = [];
  for (let n = 2; n <= parents.length; n++) out.push("/" + parents.slice(0, n).join("/"));
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/venta"), lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: absoluteUrl("/arriendo"), lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: absoluteUrl("/ayuda"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/legal/terminos"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/legal/privacidad"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  let entries: SitemapEntry[] = [];
  try {
    const r = await apiServer<SitemapEntry[]>("/seo/sitemap", { revalidate: 3600 });
    entries = Array.isArray(r) ? r.filter((e) => e && typeof e.path === "string") : [];
  } catch {
    return base; // si el API no responde, al menos las páginas estáticas
  }

  const landing = new Map<string, number>();
  for (const e of entries) {
    const t = Date.parse(e.lastmod);
    const ts = Number.isFinite(t) ? t : now.getTime();
    for (const a of ancestors(e.path)) landing.set(a, Math.max(landing.get(a) ?? 0, ts));
  }

  const landings: MetadataRoute.Sitemap = [...landing.entries()]
    .sort(([a], [b]) => a.length - b.length || a.localeCompare(b))
    .map(([path, ts]) => ({ url: absoluteUrl(path), lastModified: new Date(ts), changeFrequency: "daily" as const, priority: path.split("/").length <= 3 ? 0.8 : 0.7 }));

  const listings: MetadataRoute.Sitemap = entries.map((e) => {
    const t = Date.parse(e.lastmod);
    return {
      url: absoluteUrl(e.path),
      lastModified: Number.isFinite(t) ? new Date(t) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      ...(e.images?.length ? { images: e.images.slice(0, 10) } : {}),
    };
  });

  return [...base, ...landings, ...listings];
}
