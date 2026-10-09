"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { Photo } from "@/components/ui/photo";
import { Spinner } from "@/components/ui/button";
import { Check, CircleAlert, Ellipsis, RotateCw, Star, Tag, TriangleAlert, Trash2, Upload, X } from "./icons";
import { ProgressRing } from "./progress-ring";
import type { PhotoItem } from "./types";

export interface TileHandlers {
  setRef(key: string, el: HTMLElement | null): void;
  onPointerDown(e: React.PointerEvent<HTMLElement>, item: PhotoItem): void;
  onKeyDown(e: React.KeyboardEvent<HTMLElement>, item: PhotoItem): void;
  onFocus(item: PhotoItem): void;
  onMenu(item: PhotoItem, anchor: HTMLElement): void;
  onCover(item: PhotoItem): void;
  onToggle(item: PhotoItem): void;
  onRetry(item: PhotoItem): void;
  onRemove(item: PhotoItem): void;
  onPickFile(item: PhotoItem): void;
}

interface Props {
  item: PhotoItem;
  index: number;
  total: number;
  big: boolean;
  selected: boolean;
  selectMode: boolean;
  dragging: boolean;
  grabbed: boolean;
  active: boolean;
  h: TileHandlers;
}

const seedOf = (s: string) => Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0);

function describe(item: PhotoItem, index: number, total: number) {
  const parts = [`Foto ${index + 1} de ${total}`];
  if (item.isCover && item.status === "ready") parts.push("foto principal");
  if (item.roomLabel) parts.push(item.roomLabel);
  switch (item.status) {
    case "processing": parts.push("preparando"); break;
    case "queued": parts.push("en cola para subir"); break;
    case "uploading": parts.push(`subiendo ${Math.round(item.progress * 100)} por ciento`); break;
    case "confirming": parts.push("guardando"); break;
    case "error": parts.push(`error: ${item.error ?? "no se pudo subir"}`); break;
    case "stale": parts.push("subida incompleta"); break;
    case "duplicate": parts.push("repetida"); break;
    default: break;
  }
  return parts.join(", ");
}

const reveal = "opacity-0 transition-opacity duration-200 group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 [@media(hover:none)]:opacity-100";
const glassBtn = "grid h-9 w-9 place-items-center rounded-full bg-white/92 text-ink shadow-[0_1px_6px_rgb(14_21_18/0.28)] backdrop-blur transition hover:scale-105 hover:bg-white active:scale-95 before:absolute before:-inset-1 before:content-['']";

function TileInner({ item, index, total, big, selected, selectMode, dragging, grabbed, active, h }: Props) {
  const ready = item.status === "ready";
  const prev = useRef(item.status);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const was = prev.current;
    prev.current = item.status;
    if (item.status === "ready" && (was === "uploading" || was === "confirming" || was === "queued")) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(t);
    }
  }, [item.status]);

  const tabIndex = active ? 0 : -1;
  const showControls = ready && !selectMode && !item.busy;

  return (
    <motion.div
      layout="position"
      ref={(el) => h.setRef(item.key, el)}
      role="group"
      aria-roledescription="foto ordenable"
      aria-label={describe(item, index, total)}
      aria-grabbed={grabbed || undefined}
      data-photo-key={item.key}
      tabIndex={tabIndex}
      onPointerDown={(e) => h.onPointerDown(e, item)}
      onKeyDown={(e) => h.onKeyDown(e, item)}
      onFocus={() => h.onFocus(item)}
      onClick={selectMode ? () => h.onToggle(item) : undefined}
      onDragStart={(e) => e.preventDefault()}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
      transition={{ layout: { type: "spring", stiffness: 520, damping: 44 }, opacity: { duration: 0.22 }, scale: { duration: 0.22 } }}
      className={cn(
        "group/tile relative touch-manipulation select-none rounded-[18px] outline-none [-webkit-touch-callout:none]",
        big && "col-span-2 row-span-2",
        !selectMode && ready && "cursor-grab",
        selectMode && "cursor-pointer",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-[18px] bg-surface-2 shadow-[0_1px_3px_rgb(14_21_18/0.12)] transition-[box-shadow,opacity,transform] duration-200",
          ready && item.isCover && !selectMode && "ring-[3px] ring-brand-600 ring-offset-2",
          selected && "ring-[3px] ring-brand-600 ring-offset-2",
          grabbed && "ring-[3px] ring-sun ring-offset-2",
          "group-focus-visible/tile:ring-[3px] group-focus-visible/tile:ring-ink group-focus-visible/tile:ring-offset-2",
          dragging && "opacity-35 [&_img]:grayscale",
        )}
      >
        {item.thumb ? (
          <Photo src={item.thumb} alt="" seed={seedOf(item.key)} className="absolute inset-0 h-full w-full" imgClassName={cn("pointer-events-none transition-transform duration-500", ready && !dragging && "group-hover/tile:scale-[1.04]")} sizes="(min-width:1024px) 300px, 50vw" />
        ) : item.status === "processing" ? (
          <div className="skeleton absolute inset-0 rounded-none" aria-hidden />
        ) : (
          <Photo src={null} alt="" seed={seedOf(item.key)} className="absolute inset-0 h-full w-full" />
        )}

        {ready && !selectMode && <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent opacity-0 transition-opacity group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 [@media(hover:none)]:opacity-100" />}
        {ready && item.roomLabel && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/45 to-transparent" />}

        <Overlay item={item} h={h} />

        {flash && (
          <motion.div
            className="pointer-events-none absolute inset-0 grid place-items-center"
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.12, 1, 1] }} transition={{ duration: 1.1, times: [0, 0.22, 0.7, 1] }}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-lg"><Check className="h-6 w-6" strokeWidth={3} /></span>
          </motion.div>
        )}
      </div>

      {/* --- Controles --- */}
      {ready && item.isCover && !selectMode && (
        <span className="pointer-events-none absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-sun-soft px-2.5 py-1.5 text-[11px] font-bold uppercase leading-none tracking-wide text-sun-ink shadow-[0_1px_4px_rgb(14_21_18/0.2)]">
          <Star className="h-3.5 w-3.5" fill="currentColor" strokeWidth={1.5} /> Foto principal
        </span>
      )}
      {showControls && !item.isCover && (
        <button
          type="button" tabIndex={tabIndex} aria-label="Hacer principal" title="Hacer principal"
          onClick={() => h.onCover(item)}
          className={cn("absolute left-2.5 top-2.5", glassBtn, reveal)}
        >
          <Star className="h-[18px] w-[18px]" />
        </button>
      )}
      {showControls && (
        <button
          type="button" tabIndex={tabIndex} aria-label="Opciones de la foto" aria-haspopup="menu"
          onClick={(e) => h.onMenu(item, e.currentTarget)}
          className={cn("absolute right-2.5 top-2.5", glassBtn)}
        >
          <Ellipsis className="h-5 w-5" />
        </button>
      )}
      {selectMode && ready && (
        <span aria-hidden className={cn("absolute left-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full border-2 transition", selected ? "border-brand-600 bg-brand-600 text-white" : "border-white bg-black/25 text-transparent")}>
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      )}
      {ready && !selectMode && (
        <button
          type="button" tabIndex={tabIndex} onClick={(e) => h.onMenu(item, e.currentTarget)} aria-label={item.roomLabel ? `Etiqueta: ${item.roomLabel}. Cambiar` : "Agregar etiqueta de estancia"}
          className={cn(
            "absolute bottom-2.5 left-2.5 inline-flex max-w-[calc(100%-3.5rem)] items-center gap-1 truncate rounded-full px-2.5 py-1.5 text-[12px] font-semibold leading-none transition",
            item.roomLabel ? "bg-white/92 text-ink shadow-[0_1px_4px_rgb(14_21_18/0.2)] hover:bg-white" : cn("border border-dashed border-white/90 bg-black/25 text-white backdrop-blur hover:bg-black/40", reveal),
          )}
        >
          {item.roomLabel ? item.roomLabel : <><Tag className="h-3 w-3" /> Etiqueta</>}
        </button>
      )}
      {ready && item.hints.includes("lowres") && !selectMode && (
        <span title="Resolución baja: se verá menos nítida" className="pointer-events-none absolute bottom-2.5 right-2.5 grid h-7 w-7 place-items-center rounded-full bg-sun-soft text-sun-ink shadow">
          <TriangleAlert className="h-4 w-4" />
          <span className="sr-only">Resolución baja</span>
        </span>
      )}
    </motion.div>
  );
}

function Overlay({ item, h }: { item: PhotoItem; h: TileHandlers }) {
  if (item.busy === "rotate" || item.busy === "crop") {
    return <div className="absolute inset-0 grid place-items-center bg-ink/35"><Spinner className="h-7 w-7 text-white" /></div>;
  }
  if (item.busy === "replace" && item.status !== "error") {
    return (
      <div className="absolute inset-0 grid place-items-center bg-ink/30">
        <div className="grid place-items-center gap-1 text-white">
          <ProgressRing value={item.progress > 0 ? item.progress : undefined} size={44} label={`Guardando cambios de ${item.name}`} />
          <span className="text-[11px] font-semibold">Guardando</span>
        </div>
      </div>
    );
  }
  switch (item.status) {
    case "processing":
      return (
        <div className="absolute inset-0 grid place-items-center bg-white/55">
          <div className="grid place-items-center gap-1.5 text-ink-2"><Spinner className="h-6 w-6 text-brand-600" /><span className="text-[11px] font-semibold">Preparando…</span></div>
        </div>
      );
    case "queued":
      return <div className="absolute inset-0 grid place-items-center bg-ink/35 text-[11px] font-semibold text-white">En cola…</div>;
    case "uploading":
      return (
        <div className="absolute inset-0 grid place-items-center bg-ink/45">
          <ProgressRing value={item.progress} size={52} label={`Subiendo ${item.name}`} />
        </div>
      );
    case "confirming":
      return (
        <div className="absolute inset-0 grid place-items-center bg-ink/40">
          <div className="grid place-items-center gap-1 text-white"><ProgressRing size={40} showValue={false} label={`Guardando ${item.name}`} /><span className="text-[11px] font-semibold">Guardando</span></div>
        </div>
      );
    case "duplicate":
      return (
        <div className="absolute inset-0 grid place-items-center bg-white/85 p-2 text-center">
          <div className="grid place-items-center gap-1"><CircleAlert className="h-5 w-5 text-sun-ink" /><span className="text-[12px] font-semibold leading-tight text-ink">Ya la habías subido</span></div>
        </div>
      );
    case "error":
      return (
        <div className="absolute inset-0 grid place-items-center bg-white/92 p-2 text-center" role="alert">
          <div className="grid w-full place-items-center gap-1.5">
            <CircleAlert className="h-5 w-5 text-danger" />
            <p className="line-clamp-3 text-[11.5px] font-medium leading-snug text-ink">{item.error ?? "No se pudo subir"}</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {item.stage !== "process" && (
                <button type="button" onClick={() => h.onRetry(item)} className="inline-flex h-8 items-center gap-1 rounded-full bg-ink px-3 text-xs font-semibold text-white hover:bg-brand-900"><RotateCw className="h-3.5 w-3.5" />Reintentar</button>
              )}
              <button type="button" onClick={() => h.onRemove(item)} className="inline-flex h-8 items-center gap-1 rounded-full border border-line-strong bg-white px-3 text-xs font-semibold text-ink hover:border-ink"><Trash2 className="h-3.5 w-3.5" />Quitar</button>
            </div>
          </div>
        </div>
      );
    case "stale":
      return (
        <div className="absolute inset-0 grid place-items-center bg-sun-soft/95 p-2 text-center">
          <div className="grid w-full place-items-center gap-1.5">
            <Upload className="h-5 w-5 text-sun-ink" />
            <p className="text-[12px] font-semibold leading-tight text-sun-ink">Subida incompleta</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              <button type="button" onClick={() => h.onPickFile(item)} className="inline-flex h-8 items-center gap-1 rounded-full bg-ink px-3 text-xs font-semibold text-white hover:bg-brand-900"><Upload className="h-3.5 w-3.5" />Elegir foto</button>
              <button type="button" onClick={() => h.onRemove(item)} className="inline-flex h-8 items-center gap-1 rounded-full border border-line-strong bg-white px-3 text-xs font-semibold text-ink hover:border-ink"><X className="h-3.5 w-3.5" />Quitar</button>
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export const PhotoTile = memo(TileInner);
