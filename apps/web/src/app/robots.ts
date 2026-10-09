import type { MetadataRoute } from "next";
import { SITE, absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/panel", "/publicar", "/admin", "/backend", "/favoritos"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
