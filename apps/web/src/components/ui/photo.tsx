"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";

/** Variantes de tamaño para hosts que redimensionan por URL (Unsplash/imgix). */
export function sizedUrl(src: string, width: number) {
  try {
    if (src.includes("images.unsplash.com")) {
      const u = new URL(src);
      u.searchParams.set("w", String(width));
      u.searchParams.set("q", "75");
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      return u.toString();
    }
  } catch { /* noop */ }
  return src;
}

const PALETTES = [
  ["#cfeadb", "#9fd4c0", "#0a6b50"], ["#f8eed8", "#f2cf86", "#7a5610"], ["#e4ebf5", "#b9cbe6", "#27457a"],
  ["#f3e3dc", "#e2b9a5", "#7b3a22"], ["#e3efe0", "#b5d6ac", "#2f5d27"],
];

/** Escena de reemplazo (si la foto falla o aún no hay): dibujo de fachada sobre degradado. */
export function PhotoFallback({ seed = 0, className }: { seed?: number; className?: string }) {
  const [a, b, c] = PALETTES[Math.abs(seed) % PALETTES.length]!;
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)} style={{ background: `linear-gradient(160deg, ${a}, ${b})` } as CSSProperties} aria-hidden>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        <circle cx="318" cy="70" r="30" fill="#fff" opacity=".55" />
        <rect x="70" y="120" width="150" height="150" rx="4" fill={c} opacity=".92" />
        <rect x="190" y="90" width="110" height="180" rx="4" fill={c} opacity=".72" />
        {[0, 1, 2].map((i) => [0, 1].map((j) => <rect key={`${i}${j}`} x={86 + j * 60} y={138 + i * 38} width="30" height="22" rx="2" fill="#fff" opacity=".85" />))}
        {[0, 1, 2, 3].map((i) => <rect key={i} x={206 + (i % 2) * 44} y={108 + Math.floor(i / 2) * 46} width="28" height="30" rx="2" fill="#fff" opacity=".8" />)}
        <rect x="0" y="262" width="400" height="38" fill={c} opacity=".28" />
      </svg>
    </div>
  );
}

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  seed?: number;
  widths?: number[];
};

/** Imagen con srcset (si el host lo permite), carga diferida y escena de reemplazo si falla. */
export function Photo({ src, alt, className, imgClassName, sizes = "(min-width:1024px) 33vw, 100vw", priority, seed = 0, widths = [480, 800, 1200, 1800] }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // Las imágenes del HTML del servidor pueden terminar de cargar (o fallar) antes de la hidratación: onLoad/onError ya no se disparan.
  useEffect(() => {
    const el = ref.current;
    if (el?.complete) { if (el.naturalWidth > 0) setLoaded(true); else if (el.currentSrc || el.src) setFailed(true); }
  }, [src]);
  if (!src || failed) return <div className={cn("overflow-hidden", className)}><PhotoFallback seed={seed} /></div>;
  const canResize = src.includes("images.unsplash.com");
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)}>
      {!loaded && <div className="skeleton absolute inset-0 rounded-none" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={canResize ? sizedUrl(src, widths[1]!) : src}
        srcSet={canResize ? widths.map((w) => `${sizedUrl(src, w)} ${w}w`).join(", ") : undefined}
        sizes={canResize ? sizes : undefined}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn("h-full w-full object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0", imgClassName)}
      />
    </div>
  );
}
