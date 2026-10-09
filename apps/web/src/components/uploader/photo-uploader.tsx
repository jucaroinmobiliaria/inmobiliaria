"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { TypeKind } from "@/components/wizard/steps";
import { DropZone } from "./drop-zone";
import { Camera, CheckCheck, CircleAlert, ImagePlus, Keyboard, Lightbulb, Plus, Smartphone, Sparkles, Star, Sun, Tag, Trash2, Upload, HomeIcon } from "./icons";
import { PhotoGrid } from "./photo-grid";
import { PhotoMeter } from "./photo-meter";
import { INPUT_ACCEPT, collectDroppedFiles } from "./pipeline";
import { AnchoredMenu, useMediaQuery } from "./popover";
import { buildSuggestions, type Suggestion, type SuggestionIcon } from "./suggestions";
import { LabelChips, TileMenu } from "./tile-menu";
import { MAX_PHOTOS } from "./types";
import { UndoBar } from "./undo-bar";
import type { UploaderController } from "./use-uploader";

const CropEditor = dynamic(() => import("./crop-editor"), { ssr: false });

interface Props {
  uploader: UploaderController;
  kind: TypeKind;
  bedrooms: number | null;
  /** Mensaje de validación del paso (ya formateado) */
  error?: string | null;
}

const SUG_ICON: Record<SuggestionIcon, typeof Sun> = { camera: Camera, tag: Tag, star: Star, phone: Smartphone, res: CircleAlert, sun: Sun, ok: CheckCheck, home: HomeIcon };

export function PhotoUploader({ uploader, kind, bedrooms, error }: Props) {
  const { engine, items, readyCount, busyCount, total, failedCount } = uploader;
  const touch = useMediaQuery("(pointer: coarse)");

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ key: string; anchor: HTMLElement } | null>(null);
  const [bulk, setBulk] = useState<HTMLElement | null>(null);
  const [cropKey, setCropKey] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const replace = useRef<HTMLInputElement>(null);
  const replaceKey = useRef<string | null>(null);

  const pick = useCallback(() => gallery.current?.click(), []);

  /* ---- archivos: input, arrastrar y soltar (incluye carpetas), pegar ---- */
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; setDragOver(true); };
    const over = (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; };
    const leave = (e: DragEvent) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (depth === 0) setDragOver(false); };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragOver(false);
      if (e.dataTransfer) void collectDroppedFiles(e.dataTransfer).then((f) => engine.addFiles(f));
    };
    const paste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      engine.addFiles(files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
      window.removeEventListener("paste", paste);
    };
  }, [engine]);

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) engine.addFiles(files);
  };
  const onReplaceInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    const k = replaceKey.current;
    replaceKey.current = null;
    if (f && k) void engine.reuploadFile(k, f);
  };
  const pickFor = useCallback((key: string) => { replaceKey.current = key; replace.current?.click(); }, []);

  /* ---------------------------- menú, selección --------------------------- */
  const openMenu = useCallback((key: string, anchor: HTMLElement) => {
    setMenu((m) => (m?.key === key && m.anchor === anchor ? null : { key, anchor }));
  }, []);
  const toggle = useCallback((key: string) => {
    setSelected((s) => {
      const it = engine.getSnapshot().items.find((i) => i.key === key);
      if (!it || it.status !== "ready") return s;
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }, [engine]);
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); setBulk(null); };

  // Si desaparecen fotos seleccionadas, las quitamos de la selección.
  useEffect(() => {
    setSelected((s) => {
      if (!s.size) return s;
      const keys = new Set(items.map((i) => i.key));
      const n = new Set([...s].filter((k) => keys.has(k)));
      return n.size === s.size ? s : n;
    });
  }, [items]);

  const menuItem = menu ? items.find((i) => i.key === menu.key) ?? null : null;
  const menuIndex = menuItem ? items.indexOf(menuItem) : -1;
  useEffect(() => { if (menu && !menuItem) setMenu(null); }, [menu, menuItem]);

  const suggestions = useMemo(() => buildSuggestions(items, { kind, bedrooms }), [items, kind, bedrooms]);
  const readyKeys = useMemo(() => items.filter((i) => i.status === "ready").map((i) => i.key), [items]);

  const act = (s: Suggestion) => {
    const a = s.action;
    if (!a) return;
    if (a.kind === "add") pick();
    else if (a.kind === "cover" && a.key) engine.setCover(a.key);
    else if (a.kind === "select") setSelectMode(true);
  };

  const uploading = items.filter((i) => i.status === "processing" || i.status === "queued" || i.status === "uploading" || i.status === "confirming").length;
  const full = total >= MAX_PHOTOS;

  return (
    <section aria-label="Fotos del inmueble" className="relative grid gap-6">
      {items.length === 0 ? (
        <>
          <DropZone onPick={pick} onCamera={() => camera.current?.click()} touch={touch} max={MAX_PHOTOS} />
          <TipCards />
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <PhotoMeter ready={readyCount} total={Math.max(readyCount, total - failedCount)} uploading={uploading} />
            <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
              {selectMode ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(selected.size === readyKeys.length ? new Set() : new Set(readyKeys))}>
                    {selected.size === readyKeys.length ? "Quitar selección" : "Seleccionar todo"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={exitSelect}>Listo</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setSelectMode(true)} disabled={readyCount < 2}>
                    <CheckCheck className="h-4 w-4" /> Seleccionar
                  </Button>
                  <Button variant="soft" size="sm" onClick={pick} disabled={full}>
                    <Plus className="h-4 w-4" /> Subir más
                  </Button>
                </>
              )}
            </div>
          </div>

          <p className="-mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-ink-2">
            <Star className="h-4 w-4 text-sun-ink" fill="currentColor" />
            <span>La primera es tu <b className="font-semibold text-ink">foto principal</b>.</span>
            <span className="text-ink-3">{touch ? "Mantén presionada una foto y arrástrala para cambiar el orden." : "Arrastra las fotos para cambiar el orden."}</span>
          </p>

          <PhotoGrid
            items={items} engine={engine} selectMode={selectMode} selected={selected}
            onToggle={toggle} onMenu={openMenu} onPickFile={pickFor}
            trailing={!full && !selectMode ? <AddTile onClick={pick} /> : null}
          />

          {error && (
            <p role="alert" className="flex items-center gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger"><CircleAlert className="h-4 w-4 shrink-0" />{error}</p>
          )}

          <SuggestionsPanel suggestions={suggestions} onAct={act} />
          <KeyboardHelp />
        </>
      )}

      {items.length === 0 && error && (
        <p role="alert" className="flex items-center gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger"><CircleAlert className="h-4 w-4 shrink-0" />{error}</p>
      )}

      {/* Barra de selección */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="sticky bottom-3 z-30 mx-auto flex w-full max-w-md items-center justify-between gap-2 rounded-full border border-line bg-white/95 py-2 pl-5 pr-2 shadow-[var(--shadow-pop)] backdrop-blur"
          >
            <span className="text-sm font-semibold tabular">{selected.size} {selected.size === 1 ? "seleccionada" : "seleccionadas"}</span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" disabled={!selected.size} onClick={(e) => setBulk(e.currentTarget)}><Tag className="h-4 w-4" /> Etiquetar</Button>
              <Button variant="danger" size="sm" disabled={!selected.size} onClick={() => { engine.remove([...selected]); exitSelect(); }}><Trash2 className="h-4 w-4" /> Eliminar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnchoredMenu open={!!bulk} anchor={bulk} onClose={() => setBulk(null)} title="Etiquetar fotos" width={300}>
        <p className="px-3 pb-2 pt-1 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Etiqueta para {selected.size} {selected.size === 1 ? "foto" : "fotos"}</p>
        <LabelChips className="px-2 pb-2" current={null} onPick={(l) => { void engine.setLabel([...selected], l); setBulk(null); }} />
      </AnchoredMenu>

      <TileMenu
        item={menuItem} index={menuIndex} total={items.length} anchor={menu?.anchor ?? null} engine={engine}
        onClose={() => setMenu(null)} onCrop={(k) => setCropKey(k)}
      />
      {cropKey && <CropEditor open itemKey={cropKey} engine={engine} onClose={() => setCropKey(null)} />}

      <UndoBar undo={uploader.state.undo} onUndo={(id) => engine.undoRemove(id)} />

      {/* Entradas de archivo ocultas */}
      <input ref={gallery} type="file" accept={INPUT_ACCEPT} multiple className="sr-only" tabIndex={-1} aria-hidden onChange={onInput} data-testid="photo-input" />
      <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={onInput} />
      <input ref={replace} type="file" accept={INPUT_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={onReplaceInput} />

      {/* Anuncios para lectores de pantalla */}
      <div className="sr-only" aria-live="polite" role="status">{uploader.state.announcement}</div>

      {/* Capa al arrastrar archivos sobre la ventana */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-white/80 p-6 backdrop-blur-sm"
          >
            <div className="grid max-w-md justify-items-center gap-3 rounded-[32px] border-2 border-dashed border-brand-600 bg-brand-50 px-10 py-12 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-white"><Upload className="h-7 w-7" /></span>
              <p className="font-display text-3xl text-ink">Suelta para agregar</p>
              <p className="text-[15px] text-ink-2">Las prepararemos y las subiremos por ti.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ------------------------------------------------------------------------ */

function AddTile({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      layout="position" type="button" onClick={onClick} aria-label="Agregar más fotos"
      className="group/add grid place-items-center rounded-[18px] border-2 border-dashed border-line-strong bg-surface text-ink-2 outline-none transition-colors hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700 focus-visible:ring-4 focus-visible:ring-brand-600/25"
    >
      <span className="grid justify-items-center gap-1.5">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm transition-transform group-hover/add:scale-110"><ImagePlus className="h-5 w-5" /></span>
        <span className="text-[13px] font-semibold">Agregar</span>
      </span>
    </motion.button>
  );
}

function TipCards() {
  const tips = [
    { icon: Sun, title: "Luz natural", text: "Fotografía de día con las cortinas abiertas. La luz hace que todo se vea más amplio." },
    { icon: Sparkles, title: "Orden", text: "Despeja las superficies y deja las camas tendidas. Menos objetos, más espacio." },
    { icon: Camera, title: "Todos los espacios", text: "Fachada, sala, cocina, habitaciones, baños y zonas comunes. Mientras más completo, mejor." },
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-3" aria-label="Consejos para tus fotos">
      {tips.map((t) => (
        <li key={t.title} className="flex gap-3.5 rounded-[20px] border border-line bg-white p-4 sm:block">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><t.icon className="h-5 w-5" /></span>
          <div className="sm:mt-3">
            <p className="text-[15px] font-semibold text-ink">{t.title}</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{t.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SuggestionsPanel({ suggestions, onAct }: { suggestions: Suggestion[]; onAct: (s: Suggestion) => void }) {
  if (!suggestions.length) return null;
  return (
    <div className="rounded-[24px] border border-line bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-[18px] w-[18px] text-sun-ink" />
        <h3 className="text-[15px] font-semibold text-ink">Sugerencias para tus fotos</h3>
      </div>
      <ul className="grid gap-2">
        <AnimatePresence initial={false}>
          {suggestions.map((s) => {
            const Icon = SUG_ICON[s.icon];
            return (
              <motion.li
                key={s.id} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className={cn("flex items-start gap-3 rounded-2xl bg-white px-3.5 py-3 text-[14px] leading-snug text-ink-2", s.tone === "must" && "ring-1 ring-sun/60", s.tone === "ok" && "ring-1 ring-brand-200")}
              >
                <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full", s.tone === "must" ? "bg-sun-soft text-sun-ink" : s.tone === "ok" ? "bg-success-soft text-success" : "bg-brand-50 text-brand-600")}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 pt-0.5">{s.text}</span>
                {s.action && (
                  <button type="button" onClick={() => onAct(s)} className="shrink-0 rounded-full bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-700 transition hover:bg-brand-100 active:scale-95">{s.action.label}</button>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function KeyboardHelp() {
  return (
    <details className="group/kb text-[13px] text-ink-3">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full px-1 py-1 font-medium hover:text-ink [&::-webkit-details-marker]:hidden">
        <Keyboard className="h-4 w-4" /> Atajos de teclado
      </summary>
      <ul className="mt-2 grid gap-1 pl-6 sm:grid-cols-2">
        <li><kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-sans text-[12px] text-ink">← → ↑ ↓</kbd> moverte entre fotos</li>
        <li><kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-sans text-[12px] text-ink">Espacio</kbd> levantar y soltar para reordenar</li>
        <li><kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-sans text-[12px] text-ink">Enter</kbd> abrir opciones de la foto</li>
        <li><kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-sans text-[12px] text-ink">Supr</kbd> eliminar (con opción de deshacer)</li>
        <li><kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-sans text-[12px] text-ink">Ctrl + V</kbd> pegar fotos del portapapeles</li>
      </ul>
    </details>
  );
}

