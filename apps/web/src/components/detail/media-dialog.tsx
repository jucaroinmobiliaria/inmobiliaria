"use client";

import { Dialog } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/search/icons";
import { parseMedia } from "./media";

export function MediaDialog({ open, onClose, url, title, kind }: { open: boolean; onClose: () => void; url: string | null; title: string; kind: "video" | "tour" }) {
  const m = parseMedia(url);
  const label = kind === "video" ? "Video del inmueble" : "Tour virtual";
  return (
    <Dialog open={open && m.kind === "embed"} onClose={onClose} title={label} size="xl">
      {m.kind === "embed" && (
        <div className="p-3 sm:p-5">
          <div className="aspect-video w-full overflow-hidden rounded-[20px] bg-ink">
            <iframe src={m.src} title={`${label}: ${title}`} className="h-full w-full" loading="lazy" allow="autoplay; fullscreen; picture-in-picture; xr-spatial-tracking; gyroscope; accelerometer" allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox" />
          </div>
          <p className="mt-3 text-[13px] text-ink-3">Contenido de {m.provider}. <a href={url ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">Abrir en una pestaña nueva<ExternalLink className="h-3 w-3" /></a></p>
        </div>
      )}
    </Dialog>
  );
}

/** Botón que abre un enlace externo (si no se puede incrustar) */
export function MediaLinkButton({ url, children, className }: { url: string; children: React.ReactNode; className?: string }) {
  const m = parseMedia(url);
  if (m.kind !== "link") return null;
  return <Button href={m.href} target="_blank" rel="noopener noreferrer" variant="white" size="sm" className={className}>{children}</Button>;
}
