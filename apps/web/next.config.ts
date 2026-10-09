import type { NextConfig } from "next";

const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Permite compilar (`NEXT_DIST_DIR=.next-build next build`) sin pisar el servidor de desarrollo.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  // Las imágenes ya vienen redimensionadas/comprimidas desde el cliente o el CDN (Unsplash, R2, S3).
  images: { unoptimized: true },
  async rewrites() {
    // El navegador solo habla con el dominio de la web: las cookies httpOnly viajan en el mismo origen.
    return [
      { source: "/backend/:path*", destination: `${API_URL}/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
