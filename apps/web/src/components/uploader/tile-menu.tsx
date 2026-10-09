"use client";

import { Fragment } from "react";
import { cn } from "@/lib/cn";
import type { UploadEngine } from "./engine";
import { ChevronLeft, ChevronRight, Crop, RotateCw, Star, Trash2 } from "./icons";
import { AnchoredMenu, MenuItem } from "./popover";
import { ROOM_LABELS, type PhotoItem } from "./types";

export function LabelChips({ current, onPick, className }: { current: string | null; onPick: (label: string | null) => void; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} role="group" aria-label="Etiqueta de estancia">
      {ROOM_LABELS.map((l) => (
        <button
          key={l} type="button" aria-pressed={current === l} onClick={() => onPick(current === l ? null : l)}
          className={cn("h-9 rounded-full border px-3.5 text-[13px] font-semibold transition active:scale-95", current === l ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-white text-ink hover:border-ink")}
        >{l}</button>
      ))}
    </div>
  );
}

interface Props {
  item: PhotoItem | null;
  index: number;
  total: number;
  anchor: HTMLElement | null;
  engine: UploadEngine;
  onClose: () => void;
  onCrop: (key: string) => void;
}

export function TileMenu({ item, index, total, anchor, engine, onClose, onCrop }: Props) {
  if (!item) return null;
  const run = (fn: () => void) => () => { onClose(); fn(); };
  return (
    <AnchoredMenu open anchor={anchor} onClose={onClose} title="Opciones de la foto">
      <Fragment>
        <MenuItem icon={<Star className="h-[18px] w-[18px]" />} disabled={item.isCover} onClick={run(() => engine.setCover(item.key))} hint={item.isCover ? "Actual" : undefined}>Hacer principal</MenuItem>
        <div className="grid grid-cols-2 gap-1">
          <MenuItem icon={<ChevronLeft className="h-[18px] w-[18px]" />} disabled={index === 0} ariaLabel="Mover antes" onClick={run(() => engine.move(item.key, -1))}>Antes</MenuItem>
          <MenuItem icon={<ChevronRight className="h-[18px] w-[18px]" />} disabled={index >= total - 1} ariaLabel="Mover después" onClick={run(() => engine.move(item.key, 1))}>Después</MenuItem>
        </div>
        <MenuItem icon={<RotateCw className="h-[18px] w-[18px]" />} onClick={run(() => void engine.rotate(item.key, 1))}>Rotar 90°</MenuItem>
        <MenuItem icon={<Crop className="h-[18px] w-[18px]" />} onClick={run(() => onCrop(item.key))}>Recortar…</MenuItem>
        <div className="my-1.5 border-t border-line" />
        <p className="px-3 pb-1.5 pt-1 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Etiqueta de estancia</p>
        <LabelChips className="px-2 pb-2" current={item.roomLabel} onPick={(l) => { onClose(); void engine.setLabel([item.key], l); }} />
        <div className="my-1.5 border-t border-line" />
        <MenuItem danger icon={<Trash2 className="h-[18px] w-[18px]" />} onClick={run(() => engine.remove([item.key]))}>Eliminar</MenuItem>
      </Fragment>
    </AnchoredMenu>
  );
}
