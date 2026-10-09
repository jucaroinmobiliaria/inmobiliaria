"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@/components/ui/misc";
import { Button, Spinner } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { UploadEngine } from "./engine";
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, TriangleAlert } from "./icons";

type Aspect = "free" | "4:3" | "16:9" | "1:1";
const ASPECTS: { id: Aspect; label: string; ratio: number | null }[] = [
  { id: "free", label: "Libre", ratio: null },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "1:1", label: "1:1", ratio: 1 },
];

interface Rect { x: number; y: number; w: number; h: number }
type Rot = 0 | 90 | 180 | 270;
type Handle = { hx: -1 | 0 | 1; hy: -1 | 0 | 1 };
type Drag =
  | { kind: "move"; sx: number; sy: number; r0: Rect }
  | { kind: "resize"; handle: Handle; r0: Rect }
  | { kind: "pan"; sx: number; sy: number; p0: { x: number; y: number } };

interface Decoded { source: CanvasImageSource; width: number; height: number; close: () => void }

const MIN = 48;
const HANDLE_R = 9;

interface Props { open: boolean; itemKey: string | null; engine: UploadEngine; onClose: () => void }

export default function CropEditor({ open, itemKey, engine, onClose }: Props) {
  const [img, setImg] = useState<Decoded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rot, setRot] = useState<Rot>(0);
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [aspect, setAspect] = useState<Aspect>("free");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 640, h: 400 });
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);

  // Carga la foto al abrir.
  useEffect(() => {
    if (!open || !itemKey) return;
    let dead = false;
    let dec: Decoded | null = null;
    setImg(null); setError(null); setRot(0); setAspect("free"); setZoom(1); setPan({ x: 0, y: 0 });
    engine.openEditor(itemKey).then((d) => {
      if (dead) { d.close(); return; }
      dec = d;
      setImg(d);
      setRect({ x: 0, y: 0, w: d.width, h: d.height });
    }).catch((e: unknown) => { if (!dead) setError(e instanceof Error ? e.message : "No pudimos abrir la foto."); });
    return () => { dead = true; dec?.close(); };
  }, [open, itemKey, engine]);

  // Tamaño del escenario.
  useEffect(() => {
    const el = wrap.current;
    if (!el || !open) return;
    const ro = new ResizeObserver(() => {
      const w = Math.max(240, Math.floor(el.clientWidth));
      setSize({ w, h: Math.round(Math.min(w * 0.68, 440)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, img]);

  const rw = img ? (rot % 180 === 0 ? img.width : img.height) : 1;
  const rh = img ? (rot % 180 === 0 ? img.height : img.width) : 1;
  const geo = useMemo(() => {
    const pad = 20;
    const fit = Math.min((size.w - pad * 2) / rw, (size.h - pad * 2) / rh);
    const s = fit * zoom;
    return { s, ox: (size.w - rw * s) / 2 + pan.x, oy: (size.h - rh * s) / 2 + pan.y };
  }, [size, rw, rh, zoom, pan]);

  /* ------------------------------ dibujo -------------------------------- */

  useEffect(() => {
    const c = canvas.current;
    if (!c || !img) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(size.w * dpr);
    c.height = Math.round(size.h * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    const { s, ox, oy } = geo;

    ctx.save();
    ctx.shadowColor = "rgba(14,21,18,0.25)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#fff";
    ctx.fillRect(ox, oy, rw * s, rh * s);
    ctx.restore();

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    if (rot === 90) { ctx.translate(rw, 0); ctx.rotate(Math.PI / 2); }
    else if (rot === 180) { ctx.translate(rw, rh); ctx.rotate(Math.PI); }
    else if (rot === 270) { ctx.translate(0, rh); ctx.rotate(-Math.PI / 2); }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img.source, 0, 0);
    ctx.restore();

    const cx = ox + rect.x * s, cy = oy + rect.y * s, cw = rect.w * s, ch = rect.h * s;
    // Máscara fuera del recorte.
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, rw * s, rh * s);
    ctx.rect(cx, cy, cw, ch);
    ctx.fillStyle = "rgba(14,21,18,0.58)";
    ctx.fill("evenodd");
    ctx.restore();
    // Borde y regla de tercios.
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    for (let i = 1; i < 3; i++) {
      ctx.moveTo(cx + (cw * i) / 3, cy); ctx.lineTo(cx + (cw * i) / 3, cy + ch);
      ctx.moveTo(cx, cy + (ch * i) / 3); ctx.lineTo(cx + cw, cy + (ch * i) / 3);
    }
    ctx.stroke();
    // Tiradores.
    for (const hd of handlesFor(aspect)) {
      const px = cx + ((hd.hx + 1) / 2) * cw;
      const py = cy + ((hd.hy + 1) / 2) * ch;
      ctx.beginPath();
      ctx.arc(px, py, HANDLE_R - 1, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#0b6b57";
      ctx.stroke();
    }
  }, [img, geo, rect, rot, size, rw, rh, aspect]);

  /* ------------------------------ geometría ----------------------------- */

  const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;

  const fitAspect = useCallback((r: number | null, from: Rect): Rect => {
    if (!r) return from;
    const cxm = from.x + from.w / 2;
    const cym = from.y + from.h / 2;
    let w = Math.min(rw, rh * r);
    let h = w / r;
    if (from.w / from.h > r) { h = Math.min(from.h, rh); w = h * r; } else { w = Math.min(from.w, rw); h = w / r; }
    if (w > rw) { w = rw; h = w / r; }
    if (h > rh) { h = rh; w = h * r; }
    return { x: Math.max(0, Math.min(rw - w, cxm - w / 2)), y: Math.max(0, Math.min(rh - h, cym - h / 2)), w, h };
  }, [rw, rh]);

  const chooseAspect = (a: Aspect) => {
    setAspect(a);
    const r = ASPECTS.find((x) => x.id === a)?.ratio ?? null;
    if (r) setRect((cur) => fitAspect(r, cur));
  };

  const rotate = (dir: 1 | -1) => {
    if (!img) return;
    // Gira también el recorte para no perderlo.
    setRect((r) => (dir === 1 ? { x: rh - (r.y + r.h), y: r.x, w: r.h, h: r.w } : { x: r.y, y: rw - (r.x + r.w), w: r.h, h: r.w }));
    setRot((v) => ((v + (dir === 1 ? 90 : 270)) % 360) as Rot);
    setPan({ x: 0, y: 0 });
    // 4:3 y 16:9 dejarían de coincidir con el recorte girado: pasa a libre (1:1 se conserva).
    setAspect((a) => (a === "4:3" || a === "16:9" ? "free" : a));
  };

  const reset = () => {
    if (!img) return;
    setRot(0); setAspect("free"); setZoom(1); setPan({ x: 0, y: 0 });
    setRect({ x: 0, y: 0, w: img.width, h: img.height });
  };

  const changeZoom = (z: number, anchor?: { vx: number; vy: number }) => {
    const nz = Math.max(1, Math.min(4, z));
    const a = anchor ?? { vx: size.w / 2, vy: size.h / 2 };
    // Mantiene fijo el punto de la imagen bajo el ancla.
    const ix = (a.vx - geo.ox) / geo.s;
    const iy = (a.vy - geo.oy) / geo.s;
    const fit = geo.s / zoom;
    const s2 = fit * nz;
    const ox2 = a.vx - ix * s2;
    const oy2 = a.vy - iy * s2;
    setPan({ x: ox2 - (size.w - rw * s2) / 2, y: oy2 - (size.h - rh * s2) / 2 });
    setZoom(nz);
  };

  /* ------------------------------ punteros ------------------------------ */

  const local = (e: React.PointerEvent | React.WheelEvent) => {
    const b = canvas.current!.getBoundingClientRect();
    return { vx: e.clientX - b.left, vy: e.clientY - b.top };
  };

  const hitHandle = (vx: number, vy: number): Handle | null => {
    const { s, ox, oy } = geo;
    const cx = ox + rect.x * s, cy = oy + rect.y * s, cw = rect.w * s, ch = rect.h * s;
    for (const hd of handlesFor(aspect)) {
      const px = cx + ((hd.hx + 1) / 2) * cw;
      const py = cy + ((hd.hy + 1) / 2) * ch;
      if (Math.hypot(vx - px, vy - py) <= HANDLE_R + 8) return hd;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!img) return;
    const { vx, vy } = local(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    const hd = hitHandle(vx, vy);
    const { s, ox, oy } = geo;
    const ix = (vx - ox) / s, iy = (vy - oy) / s;
    if (hd) drag.current = { kind: "resize", handle: hd, r0: rect };
    else if (ix >= rect.x && ix <= rect.x + rect.w && iy >= rect.y && iy <= rect.y + rect.h) drag.current = { kind: "move", sx: vx, sy: vy, r0: rect };
    else drag.current = { kind: "pan", sx: vx, sy: vy, p0: pan };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!img) return;
    const { vx, vy } = local(e);
    const d = drag.current;
    const c = canvas.current!;
    if (!d) {
      const hd = hitHandle(vx, vy);
      const { s, ox, oy } = geo;
      const ix = (vx - ox) / s, iy = (vy - oy) / s;
      c.style.cursor = hd ? cursorFor(hd) : ix >= rect.x && ix <= rect.x + rect.w && iy >= rect.y && iy <= rect.y + rect.h ? "move" : zoom > 1 ? "grab" : "default";
      return;
    }
    const { s, ox, oy } = geo;
    if (d.kind === "pan") {
      setPan({ x: d.p0.x + (vx - d.sx), y: d.p0.y + (vy - d.sy) });
    } else if (d.kind === "move") {
      const dx = (vx - d.sx) / s, dy = (vy - d.sy) / s;
      setRect({ ...d.r0, x: Math.max(0, Math.min(rw - d.r0.w, d.r0.x + dx)), y: Math.max(0, Math.min(rh - d.r0.h, d.r0.y + dy)) });
    } else {
      const px = Math.max(0, Math.min(rw, (vx - ox) / s));
      const py = Math.max(0, Math.min(rh, (vy - oy) / s));
      setRect(resize(d.handle, d.r0, px, py, ratio, rw, rh));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ya liberado */ }
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const { vx, vy } = local(e);
    changeZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), { vx, vy });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const step = Math.max(1, Math.round(Math.min(rw, rh) * (e.shiftKey ? 0.05 : 0.01)));
    const mv = (dx: number, dy: number) => setRect((r) => ({ ...r, x: Math.max(0, Math.min(rw - r.w, r.x + dx)), y: Math.max(0, Math.min(rh - r.h, r.y + dy)) }));
    if (e.key === "ArrowLeft") { e.preventDefault(); mv(-step, 0); }
    else if (e.key === "ArrowRight") { e.preventDefault(); mv(step, 0); }
    else if (e.key === "ArrowUp") { e.preventDefault(); mv(0, -step); }
    else if (e.key === "ArrowDown") { e.preventDefault(); mv(0, step); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); changeZoom(zoom * 1.15); }
    else if (e.key === "-") { e.preventDefault(); changeZoom(zoom / 1.15); }
  };

  /* ------------------------------ aplicar ------------------------------- */

  const full = !!img && rect.x <= 0.5 && rect.y <= 0.5 && rect.w >= rw - 1 && rect.h >= rh - 1;
  const unchanged = rot === 0 && full;
  const outLong = Math.min(2400, Math.round(Math.max(rect.w, rect.h)));
  const outW = Math.round(rect.w * (outLong / Math.max(rect.w, rect.h)));
  const outH = Math.round(rect.h * (outLong / Math.max(rect.w, rect.h)));

  const apply = () => {
    if (!img || !itemKey) return;
    onClose();
    if (unchanged) return;
    void engine.applyCrop(itemKey, { rotate: rot, crop: full ? undefined : rect });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Recortar y rotar" size="lg" sheet>
      <div className="grid gap-5 p-5 sm:p-6">
        <div ref={wrap} className="relative overflow-hidden rounded-[20px] bg-surface" style={{ height: size.h }}>
          {!img && !error && <div className="absolute inset-0 grid place-items-center"><Spinner className="h-8 w-8 text-brand-600" /></div>}
          {error && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="grid max-w-sm gap-2"><TriangleAlert className="mx-auto h-8 w-8 text-sun-ink" /><p className="text-[15px] text-ink-2">{error}</p></div>
            </div>
          )}
          {img && (
            <canvas
              ref={canvas}
              tabIndex={0}
              aria-label="Área de recorte. Usa las flechas para mover el recorte y más o menos para acercar."
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
              onWheel={onWheel} onKeyDown={onKeyDown}
              style={{ width: size.w, height: size.h, touchAction: "none" }}
              className="block rounded-[20px] outline-none focus-visible:ring-4 focus-visible:ring-brand-600/25"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex items-center gap-2" role="group" aria-label="Rotar">
            <button type="button" onClick={() => rotate(-1)} disabled={!img} aria-label="Rotar 90° a la izquierda" className="grid h-11 w-11 place-items-center rounded-full border border-line-strong transition hover:border-ink disabled:opacity-40"><RotateCcw className="h-5 w-5" /></button>
            <button type="button" onClick={() => rotate(1)} disabled={!img} aria-label="Rotar 90° a la derecha" className="grid h-11 w-11 place-items-center rounded-full border border-line-strong transition hover:border-ink disabled:opacity-40"><RotateCw className="h-5 w-5" /></button>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Proporción del recorte">
            {ASPECTS.map((a) => (
              <button
                key={a.id} type="button" aria-pressed={aspect === a.id} onClick={() => chooseAspect(a.id)} disabled={!img}
                className={cn("h-10 rounded-full border px-4 text-sm font-semibold transition disabled:opacity-40", aspect === a.id ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-white text-ink hover:border-ink")}
              >{a.label}</button>
            ))}
          </div>
          <div className="flex min-w-[180px] flex-1 items-center gap-3">
            <ZoomOut className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
            <input
              type="range" min={1} max={4} step={0.05} value={zoom} disabled={!img} aria-label="Zoom"
              onChange={(e) => changeZoom(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer accent-brand-600"
            />
            <ZoomIn className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-[13px] text-ink-3" aria-live="polite">
            {img ? <>Resultado: <span className="font-semibold text-ink">{outW} × {outH} px</span>{Math.max(outW, outH) < 1200 && <span className="ml-2 text-sun-ink">· resolución baja</span>}</> : "Cargando…"}
            <span className="ml-2 hidden sm:inline">Arrastra para mover · Rueda para acercar</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={reset} disabled={!img}>Restablecer</Button>
            <Button variant="outline" size="md" onClick={onClose}>Cancelar</Button>
            <Button size="md" onClick={apply} disabled={!img}>Aplicar</Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------- */

function handlesFor(aspect: Aspect): Handle[] {
  const corners: Handle[] = [{ hx: -1, hy: -1 }, { hx: 1, hy: -1 }, { hx: -1, hy: 1 }, { hx: 1, hy: 1 }];
  if (aspect !== "free") return corners;
  return [...corners, { hx: 0, hy: -1 }, { hx: 0, hy: 1 }, { hx: -1, hy: 0 }, { hx: 1, hy: 0 }];
}

function cursorFor(h: Handle) {
  if (h.hx === 0) return "ns-resize";
  if (h.hy === 0) return "ew-resize";
  return h.hx === h.hy ? "nwse-resize" : "nesw-resize";
}

function resize(h: Handle, r0: Rect, px: number, py: number, ratio: number | null, W: number, H: number): Rect {
  let left = r0.x, right = r0.x + r0.w, top = r0.y, bottom = r0.y + r0.h;
  if (h.hx < 0) left = Math.min(px, right - MIN);
  if (h.hx > 0) right = Math.max(px, left + MIN);
  if (h.hy < 0) top = Math.min(py, bottom - MIN);
  if (h.hy > 0) bottom = Math.max(py, top + MIN);
  if (ratio && h.hx !== 0 && h.hy !== 0) {
    // Esquina con proporción fija: el ancla es la esquina opuesta.
    const ax = h.hx < 0 ? r0.x + r0.w : r0.x;
    const ay = h.hy < 0 ? r0.y + r0.h : r0.y;
    let w = Math.abs(px - ax);
    let hh = Math.abs(py - ay);
    if (w / ratio > hh) w = hh * ratio; else hh = w / ratio;
    const maxW = h.hx < 0 ? ax : W - ax;
    const maxH = h.hy < 0 ? ay : H - ay;
    if (w > maxW) { w = maxW; hh = w / ratio; }
    if (hh > maxH) { hh = maxH; w = hh * ratio; }
    w = Math.max(MIN, w);
    hh = Math.max(MIN / ratio, hh);
    left = h.hx < 0 ? ax - w : ax;
    right = h.hx < 0 ? ax : ax + w;
    top = h.hy < 0 ? ay - hh : ay;
    bottom = h.hy < 0 ? ay : ay + hh;
  }
  left = Math.max(0, left); top = Math.max(0, top); right = Math.min(W, right); bottom = Math.min(H, bottom);
  return { x: left, y: top, w: right - left, h: bottom - top };
}
