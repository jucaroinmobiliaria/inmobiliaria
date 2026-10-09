"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { ImageDTO } from "@/lib/types";
import { Photo, PhotoFallback } from "@/components/ui/photo";
import { Camera } from "@/components/ui/icon";
import { CirclePlay, Images, Orbit } from "@/components/search/icons";
import { Lightbox } from "./lightbox";
import { MediaDialog } from "./media-dialog";
import { parseMedia } from "./media";

export function Gallery({ images, title, seed, videoUrl, tourUrl }: { images: ImageDTO[]; title: string; seed: number; videoUrl: string | null; tourUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [media, setMedia] = useState<"video" | "tour" | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [mIdx, setMIdx] = useState(0);
  const n = images.length;
  const show = (i: number) => { setIndex(i); setOpen(true); };

  const pill = (kind: "video" | "tour", url: string | null) => {
    const m = parseMedia(url);
    if (m.kind === "none") return null;
    const cls = "inline-flex h-10 items-center gap-2 rounded-full bg-white/95 px-4 text-sm font-semibold text-ink shadow-lg backdrop-blur transition hover:bg-white active:scale-95";
    const content = kind === "video" ? <><CirclePlay className="h-[18px] w-[18px]" />Video</> : <><Orbit className="h-[18px] w-[18px]" />Tour 360°</>;
    if (m.kind === "link") return <a key={kind} href={m.href} target="_blank" rel="noopener noreferrer" className={cls}>{content}</a>;
    return <button key={kind} type="button" onClick={() => setMedia(kind)} className={cls}>{content}</button>;
  };
  const mediaPills = <div className="flex flex-wrap gap-2">{pill("video", videoUrl)}{pill("tour", tourUrl)}</div>;

  if (!n) {
    return <div className="relative aspect-[16/9] max-h-[520px] w-full overflow-hidden rounded-[28px] bg-surface-2 md:aspect-[21/9]"><PhotoFallback seed={seed} /><div className="absolute bottom-4 left-4">{mediaPills}</div><MediaDialogs media={media} setMedia={setMedia} videoUrl={videoUrl} tourUrl={tourUrl} title={title} /></div>;
  }

  // Plantillas del mosaico según la cantidad de fotos
  const tpl = n === 1 ? ["col-span-4 row-span-2"] : n === 2 ? ["col-span-2 row-span-2", "col-span-2 row-span-2"] : n === 3 ? ["col-span-2 row-span-2", "col-span-2", "col-span-2"]
    : n === 4 ? ["col-span-2 row-span-2", "col-span-2", "", ""] : ["col-span-2 row-span-2", "", "", "", ""];
  const tiles = images.slice(0, Math.min(n, 5));

  return (
    <>
      {/* Escritorio: mosaico */}
      <div className="relative hidden h-[min(540px,58vh)] min-h-[380px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[28px] md:grid">
        {tiles.map((im, i) => (
          <button key={im.id} type="button" onClick={() => show(i)} aria-label={i === 0 ? `Abrir galería: ${title}` : `Ver foto ${i + 1}`} className={cn("group relative overflow-hidden bg-surface-2 outline-offset-[-3px]", tpl[i])}>
            <Photo src={im.url} alt={im.roomLabel ?? (i === 0 ? title : `${title} — foto ${i + 1}`)} seed={seed + i} priority={i === 0} sizes={i === 0 ? "(min-width:1024px) 50vw, 100vw" : "25vw"} widths={i === 0 ? [800, 1200, 1800] : [400, 700]} className="absolute inset-0" imgClassName="transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]" />
            <span className="absolute inset-0 bg-ink/0 transition-colors group-hover:bg-ink/10" />
          </button>
        ))}
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between">
          <div className="pointer-events-auto">{mediaPills}</div>
          <button type="button" onClick={() => show(0)} className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink shadow-lg transition hover:bg-surface active:scale-95">
            <Images className="h-[18px] w-[18px]" />Ver todas las fotos ({n})
          </button>
        </div>
      </div>

      {/* Móvil: carrusel deslizable */}
      <div className="relative -mx-5 md:hidden">
        <div ref={scroller} onScroll={() => { const el = scroller.current; if (el) setMIdx(Math.round(el.scrollLeft / el.clientWidth)); }} className="no-scrollbar flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto bg-surface-2">
          {images.map((im, i) => (
            <button key={im.id} type="button" onClick={() => show(i)} aria-label={`Ver foto ${i + 1} de ${n}`} className="relative h-full w-full shrink-0 snap-center">
              <Photo src={im.url} alt={i === 0 ? title : `${title} — foto ${i + 1}`} seed={seed + i} priority={i === 0} sizes="100vw" widths={[480, 800, 1200]} className="absolute inset-0" />
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute bottom-3 right-4 inline-flex items-center gap-1.5 rounded-full bg-ink/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"><Camera className="h-3.5 w-3.5" />{mIdx + 1} / {n}</span>
        <div className="absolute bottom-3 left-4">{mediaPills}</div>
      </div>

      <Lightbox images={images} index={index} open={open} onClose={() => setOpen(false)} onIndex={setIndex} title={title} />
      <MediaDialogs media={media} setMedia={setMedia} videoUrl={videoUrl} tourUrl={tourUrl} title={title} />
    </>
  );
}

function MediaDialogs({ media, setMedia, videoUrl, tourUrl, title }: { media: "video" | "tour" | null; setMedia: (m: "video" | "tour" | null) => void; videoUrl: string | null; tourUrl: string | null; title: string }) {
  return (
    <>
      <MediaDialog open={media === "video"} onClose={() => setMedia(null)} url={videoUrl} title={title} kind="video" />
      <MediaDialog open={media === "tour"} onClose={() => setMedia(null)} url={tourUrl} title={title} kind="tour" />
    </>
  );
}
