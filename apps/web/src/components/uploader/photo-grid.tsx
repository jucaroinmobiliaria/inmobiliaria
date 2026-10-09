"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "motion/react";
import { Photo } from "@/components/ui/photo";
import type { UploadEngine } from "./engine";
import { PhotoTile, type TileHandlers } from "./photo-tile";
import type { PhotoItem } from "./types";

interface Props {
  items: PhotoItem[];
  engine: UploadEngine;
  selectMode: boolean;
  selected: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onMenu: (key: string, anchor: HTMLElement) => void;
  onPickFile: (key: string) => void;
  trailing?: ReactNode;
}

interface DragState {
  key: string;
  pointerId: number;
  startX: number; startY: number;
  x: number; y: number;
  offX: number; offY: number;
  w: number; h: number;
  active: boolean;
  touch: boolean;
  timer: number | null;
  raf: number | null;
  scroller: HTMLElement | null;
  origin: string[];
  lastSwap: number;
  swapX: number; swapY: number;
  armed: boolean;
}

interface Ghost { key: string; src: string | null; w: number; h: number; x: number; y: number }

function scrollParent(el: HTMLElement | null): HTMLElement | null {
  let n = el?.parentElement ?? null;
  while (n) {
    const o = getComputedStyle(n).overflowY;
    if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n;
    n = n.parentElement;
  }
  return null;
}

const draggable = (i: PhotoItem) => i.status === "ready" && !i.busy;

export function PhotoGrid({ items, engine, selectMode, selected, onToggle, onMenu, onPickFile, trailing }: Props) {
  const refs = useRef(new Map<string, HTMLElement>());
  const gridRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [roving, setRoving] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [grabKey, setGrabKey] = useState<string | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const ghostEl = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const grabOrigin = useRef<string[] | null>(null);
  const grabKeyRef = useRef<string | null>(null);
  grabKeyRef.current = grabKey;
  const latest = useRef({ selectMode, onToggle, onMenu, onPickFile, engine });
  latest.current = { selectMode, onToggle, onMenu, onPickFile, engine };
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  /* ------------------------------ arrastre ------------------------------- */

  const positionGhost = useCallback(() => {
    const d = dragRef.current;
    const g = ghostEl.current;
    if (!d || !g) return;
    g.style.transform = `translate3d(${d.x - d.offX}px, ${d.y - d.offY}px, 0) scale(1.04)`;
  }, []);

  const hitTest = useCallback(() => {
    const d = dragRef.current;
    if (!d?.active) return;
    const now = performance.now();
    if (now - d.lastSwap < 160) return;
    const mine = refs.current.get(d.key);
    if (!mine) return;
    const pr = mine.getBoundingClientRect();
    const inMine = d.x >= pr.left && d.x <= pr.right && d.y >= pr.top && d.y <= pr.bottom;
    if (inMine) { d.armed = true; return; }
    if (!d.armed && Math.hypot(d.x - d.swapX, d.y - d.swapY) < 36) return;
    let target: string | null = null;
    for (const [k, el] of refs.current) {
      if (k === d.key) continue;
      const r = el.getBoundingClientRect();
      if (d.x >= r.left - 4 && d.x <= r.right + 4 && d.y >= r.top - 4 && d.y <= r.bottom + 4) { target = k; break; }
    }
    if (!target) return;
    const keys = itemsRef.current.map((i) => i.key);
    const from = keys.indexOf(d.key);
    const to = keys.indexOf(target);
    if (from < 0 || to < 0 || from === to) return;
    keys.splice(to, 0, keys.splice(from, 1)[0]!);
    latest.current.engine.setOrder(keys, false);
    d.lastSwap = now;
    d.swapX = d.x;
    d.swapY = d.y;
    d.armed = false;
  }, []);

  const stopListening = useCallback((onMove: (e: PointerEvent) => void, onUp: (e: PointerEvent) => void, onCancel: (e: PointerEvent) => void, blockTouch: (e: TouchEvent) => void) => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("touchmove", blockTouch);
  }, []);

  const endDrag = useCallback((commit: boolean, cleanup: () => void) => {
    const d = dragRef.current;
    cleanup();
    if (!d) return;
    if (d.timer) clearTimeout(d.timer);
    if (d.raf) cancelAnimationFrame(d.raf);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    dragRef.current = null;
    if (!d.active) return;
    const eng = latest.current.engine;
    const g = ghostEl.current;
    const done = () => { setGhost(null); setDragKey(null); };
    if (!commit) {
      eng.setOrder(d.origin, false);
      done();
      return;
    }
    const mine = refs.current.get(d.key);
    if (g && mine && typeof g.animate === "function") {
      const r = mine.getBoundingClientRect();
      const a = g.animate(
        [{ transform: g.style.transform }, { transform: `translate3d(${r.left}px, ${r.top}px, 0) scale(1)` }],
        { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
      );
      a.onfinish = done;
      a.oncancel = done;
    } else done();
    const keys = itemsRef.current.map((i) => i.key);
    const pos = keys.indexOf(d.key);
    if (keys.join() !== d.origin.join()) {
      eng.commitOrder();
      eng.announce(`Foto movida a la posición ${pos + 1} de ${keys.length}.`);
    }
  }, []);

  const beginPointer = useCallback((e: React.PointerEvent<HTMLElement>, item: PhotoItem) => {
    const L = latest.current;
    if (L.selectMode || e.button !== 0 || !draggable(item)) return;
    if ((e.target as HTMLElement).closest("button, a, input, [data-nodrag]")) return;
    const el = refs.current.get(item.key);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const touch = e.pointerType !== "mouse";
    const d: DragState = {
      key: item.key, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY,
      offX: e.clientX - r.left, offY: e.clientY - r.top, w: r.width, h: r.height, active: false, touch, timer: null, raf: null,
      scroller: null, origin: itemsRef.current.map((i) => i.key), lastSwap: 0, swapX: e.clientX, swapY: e.clientY, armed: true,
    };
    dragRef.current = d;

    const blockTouch = (ev: TouchEvent) => { if (dragRef.current?.active && ev.cancelable) ev.preventDefault(); };
    const cleanup = () => stopListening(onMove, onUp, onCancel, blockTouch);

    const start = () => {
      const cur = dragRef.current;
      if (!cur || cur !== d || d.active) return;
      d.active = true;
      d.scroller = scrollParent(el);
      const it = itemsRef.current.find((i) => i.key === d.key);
      setGhost({ key: d.key, src: it?.thumb ?? null, w: d.w, h: d.h, x: r.left, y: r.top });
      setDragKey(d.key);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      if (touch) navigator.vibrate?.(12);
      latest.current.engine.announce("Arrastrando foto. Suéltala en la posición que quieras.");
      requestAnimationFrame(positionGhost);
      const loop = () => {
        const c = dragRef.current;
        if (!c?.active) return;
        const sc = c.scroller;
        if (sc) {
          const sr = sc.getBoundingClientRect();
          const edge = 90;
          let dy = 0;
          if (c.y < sr.top + edge) dy = -Math.ceil((sr.top + edge - c.y) / 6);
          else if (c.y > sr.bottom - edge) dy = Math.ceil((c.y - (sr.bottom - edge)) / 6);
          if (dy) sc.scrollTop += Math.max(-22, Math.min(22, dy));
        }
        // Cada cuadro: si el puntero quedó quieto sobre otra foto (p. ej. tras el tiempo de espera del último intercambio), se intercambia.
        hitTest();
        c.raf = requestAnimationFrame(loop);
      };
      d.raf = requestAnimationFrame(loop);
    };

    function onMove(ev: PointerEvent) {
      if (ev.pointerId !== d.pointerId) return;
      d.x = ev.clientX;
      d.y = ev.clientY;
      if (!d.active) {
        const dist = Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY);
        if (touch) { if (dist > 9) endDrag(false, cleanup); return; }
        if (dist > 5) start();
        return;
      }
      positionGhost();
      hitTest();
    }
    function onUp(ev: PointerEvent) {
      if (ev.pointerId !== d.pointerId) return;
      endDrag(true, cleanup);
    }
    function onCancel(ev: PointerEvent) {
      if (ev.pointerId !== d.pointerId) return;
      endDrag(false, cleanup);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    if (touch) {
      window.addEventListener("touchmove", blockTouch, { passive: false });
      d.timer = window.setTimeout(start, 240);
    }
  }, [endDrag, hitTest, positionGhost, stopListening]);

  // Esc durante un arrastre con puntero: cancela y restaura el orden.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = dragRef.current;
      if (e.key === "Escape" && d?.active) {
        latest.current.engine.setOrder(d.origin, false);
        if (d.timer) clearTimeout(d.timer);
        if (d.raf) cancelAnimationFrame(d.raf);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        dragRef.current = null;
        setGhost(null);
        setDragKey(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ------------------------------ teclado -------------------------------- */

  const focusTile = useCallback((key: string) => {
    requestAnimationFrame(() => {
      const el = refs.current.get(key);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, []);

  const gridCols = () => {
    const g = gridRef.current;
    if (!g) return 3;
    return Math.max(1, getComputedStyle(g).gridTemplateColumns.split(" ").length);
  };

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>, item: PhotoItem) => {
    const eng = latest.current.engine;
    if (e.key === "Escape" && grabOrigin.current) {
      eng.setOrder(grabOrigin.current, false);
      grabOrigin.current = null;
      setGrabKey(null);
      eng.announce("Movimiento cancelado.");
      return;
    }
    if (e.target !== e.currentTarget) return;
    const keys = itemsRef.current.map((i) => i.key);
    const idx = keys.indexOf(item.key);
    const grabbed = grabKeyRef.current === item.key;
    const step = (delta: number) => {
      if (grabbed) { eng.move(item.key, delta); focusTile(item.key); return; }
      const next = keys[Math.max(0, Math.min(keys.length - 1, idx + delta))];
      if (next) focusTile(next);
    };
    switch (e.key) {
      case " ":
      case "Spacebar": {
        if (!draggable(item)) return;
        e.preventDefault();
        if (grabOrigin.current) {
          const pos = keys.indexOf(item.key);
          const changed = grabOrigin.current.join() !== keys.join();
          grabOrigin.current = null;
          setGrabKey(null);
          if (changed) eng.commitOrder();
          eng.announce(`Foto soltada en la posición ${pos + 1} de ${keys.length}.`);
        } else {
          grabOrigin.current = keys;
          setGrabKey(item.key);
          eng.announce(`Foto ${idx + 1} levantada. Usa las flechas para moverla y Espacio para soltarla.`);
        }
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (latest.current.selectMode) latest.current.onToggle(item.key);
        else if (item.status === "ready") {
          const btn = e.currentTarget.querySelector<HTMLElement>('button[aria-haspopup="menu"]');
          if (btn) latest.current.onMenu(item.key, btn);
        }
        break;
      }
      case "Delete":
      case "Backspace":
        e.preventDefault();
        eng.remove([item.key]);
        break;
      case "ArrowLeft": e.preventDefault(); step(-1); break;
      case "ArrowRight": e.preventDefault(); step(1); break;
      case "ArrowUp": e.preventDefault(); step(-gridCols()); break;
      case "ArrowDown": e.preventDefault(); step(gridCols()); break;
      case "Home": e.preventDefault(); if (keys[0]) focusTile(keys[0]); break;
      case "End": e.preventDefault(); if (keys.length) focusTile(keys[keys.length - 1]!); break;
      default: break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTile]);

  /* ------------------------------ manejadores ---------------------------- */

  const h = useMemo<TileHandlers>(() => ({
    setRef: (key, el) => { if (el) refs.current.set(key, el); else refs.current.delete(key); },
    onPointerDown: beginPointer,
    onKeyDown,
    onFocus: (item) => setRoving(item.key),
    onMenu: (item, anchor) => latest.current.onMenu(item.key, anchor),
    onCover: (item) => latest.current.engine.setCover(item.key),
    onToggle: (item) => latest.current.onToggle(item.key),
    onRetry: (item) => latest.current.engine.retry(item.key),
    onRemove: (item) => latest.current.engine.remove([item.key]),
    onPickFile: (item) => latest.current.onPickFile(item.key),
  }), [beginPointer, onKeyDown]);

  const activeKey = items.some((i) => i.key === roving) ? roving : items[0]?.key ?? null;
  const total = items.length;
  const firstReadyKey = items.find((i) => i.status === "ready")?.key;

  return (
    <div className="@container">
      <div
        ref={gridRef}
        role="group"
        aria-label="Fotos del aviso"
        className="grid grid-cols-[repeat(var(--c),minmax(0,1fr))] gap-[var(--g)] [--c:2] [--g:12px] @md:[--c:3] @4xl:[--c:4]"
        style={{ gridAutoRows: "calc((100cqw - (var(--c) - 1) * var(--g)) / var(--c) * 0.75)" } as CSSProperties}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item, i) => (
            <PhotoTile
              key={item.key}
              item={item}
              index={i}
              total={total}
              big={i === 0 && item.key === firstReadyKey}
              selected={selected.has(item.key)}
              selectMode={selectMode}
              dragging={dragKey === item.key}
              grabbed={grabKey === item.key}
              active={activeKey === item.key}
              h={h}
            />
          ))}
        </AnimatePresence>
        {trailing}
      </div>
      {ghost && typeof document !== "undefined" && createPortal(
        <div
          ref={ghostEl}
          aria-hidden
          style={{ position: "fixed", left: 0, top: 0, width: ghost.w, height: ghost.h, transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0) scale(1.04)`, zIndex: 130, pointerEvents: "none", willChange: "transform" }}
          className="overflow-hidden rounded-[18px] bg-surface-2 shadow-[var(--shadow-lift)] ring-2 ring-brand-600"
        >
          <Photo src={ghost.src} alt="" className="h-full w-full" />
        </div>,
        document.body,
      )}
    </div>
  );
}
