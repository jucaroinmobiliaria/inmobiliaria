"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import type { ImageDTO } from "@/lib/types";
import { Photo } from "@/components/ui/photo";
import { ChevronLeft, ChevronRight, X } from "@/components/ui/icon";
import { ZoomIn, ZoomOut } from "@/components/search/icons";
import { useBodyLock, useFocusTrap } from "@/components/search/hooks";

type Props = { images: ImageDTO[]; index: number; open: boolean; onClose: () => void; onIndex: (i: number) => void; title: string };

export function Lightbox({ images, index, open, onClose, onIndex, title }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const root = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const n = images.length;
  const [zoom, setZoom] = useState({ s: 1, x: 0, y: 0 });
  const [drag, setDrag] = useState(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ startX: 0, startY: 0, pinch: 0, startScale: 1, base: { x: 0, y: 0 }, moved: false, lastTap: 0 });
  useBodyLock(open);
  useFocusTrap(root, open);

  const go = useCallback((d: number) => { onIndex((index + d + n) % n); }, [index, n, onIndex]);
  useEffect(() => setZoom({ s: 1, x: 0, y: 0 }), [index, open]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Home") onIndex(0);
      else if (e.key === "End") onIndex(n - 1);
      else if (e.key === "+" || e.key === "=") setZoom((z) => ({ ...z, s: Math.min(4, z.s + 0.5) }));
      else if (e.key === "-") setZoom((z) => (z.s <= 1.5 ? { s: 1, x: 0, y: 0 } : { ...z, s: z.s - 0.5 }));
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, go, onClose, onIndex, n]);

  useEffect(() => {
    if (!open) return;
    rail.current?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    for (const d of [-1, 1]) { const im = images[(index + d + n) % n]; if (im) { const p = new Image(); p.src = im.url; } }
  }, [open, index, images, n]);

  if (!mounted || !open || !n) return null;
  const cur = images[index]!;
  const caption = [cur.roomLabel, cur.caption].filter(Boolean).join(" · ");

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    g.startX = e.clientX; g.startY = e.clientY; g.moved = false; g.base = { x: zoom.x, y: zoom.y };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      g.pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y); g.startScale = zoom.s;
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (g.pinch) setZoom((z) => ({ ...z, s: Math.max(1, Math.min(4, g.startScale * (d / g.pinch))) }));
      g.moved = true;
      return;
    }
    const dx = e.clientX - g.startX, dy = e.clientY - g.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true;
    if (zoom.s > 1) setZoom((z) => ({ ...z, x: g.base.x + dx, y: g.base.y + dy }));
    else setDrag(dx);
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size) return;
    if (zoom.s <= 1.02 && zoom.s !== 1) setZoom({ s: 1, x: 0, y: 0 });
    if (zoom.s === 1 && Math.abs(drag) > 70 && Math.abs(e.clientY - g.startY) < 90) go(drag < 0 ? 1 : -1);
    setDrag(0);
    if (!g.moved) {
      const now = Date.now();
      if (now - g.lastTap < 320) {
        setZoom((z) => (z.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: (window.innerWidth / 2 - e.clientX) * 1.5, y: (window.innerHeight / 2 - e.clientY) * 1.5 }));
        g.lastTap = 0;
      } else g.lastTap = now;
    }
  };

  return createPortal(
    <div ref={root} role="dialog" aria-modal="true" aria-label={`Galería de fotos: ${title}`} tabIndex={-1} className="fixed inset-0 z-[130] flex flex-col bg-[#0a0f0d] text-white focus:outline-none">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="text-sm font-semibold tabular" aria-live="polite">{index + 1} / {n}</p>
        <p className="hidden min-w-0 truncate text-sm text-white/70 sm:block">{title}</p>
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Alejar" onClick={() => setZoom((z) => (z.s <= 1.5 ? { s: 1, x: 0, y: 0 } : { ...z, s: z.s - 0.5 }))} disabled={zoom.s === 1} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10 disabled:opacity-30"><ZoomOut className="h-5 w-5" /></button>
          <button type="button" aria-label="Acercar" onClick={() => setZoom((z) => ({ ...z, s: Math.min(4, z.s + 0.75) }))} disabled={zoom.s >= 4} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10 disabled:opacity-30"><ZoomIn className="h-5 w-5" /></button>
          <button type="button" data-autofocus aria-label="Cerrar galería" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 select-none overflow-hidden" style={{ touchAction: "none" }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onWheel={(e) => { if (e.ctrlKey || e.metaKey) setZoom((z) => ({ ...z, s: Math.max(1, Math.min(4, z.s - e.deltaY * 0.01)) })); }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={cur.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="absolute inset-0">
            <div className="flex h-full w-full items-center justify-center px-2 sm:px-16"
              style={{ transform: `translate3d(${zoom.s > 1 ? zoom.x : drag}px, ${zoom.s > 1 ? zoom.y : 0}px, 0) scale(${zoom.s})`, transition: drag || pointers.current.size ? "none" : "transform 0.25s var(--ease-out-expo)", cursor: zoom.s > 1 ? "grab" : "zoom-in" }}>
              <Photo src={cur.url} alt={caption || `${title} — foto ${index + 1}`} seed={index} priority sizes="100vw" widths={[900, 1400, 2000, 2800]} className="h-full w-full !bg-transparent" imgClassName="!object-contain pointer-events-none" />
            </div>
          </motion.div>
        </AnimatePresence>
        {n > 1 && (
          <>
            <button type="button" aria-label="Foto anterior" onClick={() => go(-1)} onPointerDown={(e) => e.stopPropagation()} className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/25 sm:grid"><ChevronLeft className="h-6 w-6" /></button>
            <button type="button" aria-label="Foto siguiente" onClick={() => go(1)} onPointerDown={(e) => e.stopPropagation()} className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/25 sm:grid"><ChevronRight className="h-6 w-6" /></button>
          </>
        )}
      </div>

      <div className="px-4 pb-3 pt-2 sm:px-6">
        <p className="mb-2 h-5 text-center text-sm text-white/80">{caption}</p>
        <div ref={rail} className="no-scrollbar flex gap-2 overflow-x-auto pb-[max(4px,env(safe-area-inset-bottom))] sm:justify-center" role="tablist" aria-label="Miniaturas">
          {images.map((im, i) => (
            <button key={im.id} type="button" data-i={i} role="tab" aria-selected={i === index} aria-label={`Ver foto ${i + 1}`} onClick={() => onIndex(i)}
              className={cn("h-14 w-[76px] shrink-0 overflow-hidden rounded-xl border-2 transition-all", i === index ? "border-white opacity-100" : "border-transparent opacity-55 hover:opacity-90")}>
              <Photo src={im.url} alt="" seed={i} sizes="80px" widths={[160, 240]} className="h-full w-full" />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
