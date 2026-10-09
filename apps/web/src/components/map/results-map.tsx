"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as MLMap, Marker, Popup } from "maplibre-gl";
import { cn } from "@/lib/cn";
import { formatPrice, formatPriceShort } from "@/lib/format";
import type { PublicationCard } from "@/lib/types";
import { Photo } from "@/components/ui/photo";
import { Bath, Bed, Maximize2, Search, X } from "@/components/ui/icon";
import { LocateFixed } from "@/components/search/icons";
import { COLOMBIA_CENTER, boundsToBbox, createMap } from "./maplibre";
import "./map.css";

type Props = {
  items: PublicationCard[];
  activeId: string | null;
  onActive: (id: string | null) => void;
  /** Si se pasa, al hacer clic en un pin se notifica en vez de abrir el popup. */
  onSelect?: (id: string | null) => void;
  selectedId?: string | null;
  bbox?: string;
  onSearchArea: (bbox: string) => void;
  onClearArea: () => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
  loading?: boolean;
  /** Mueve la cámara a este punto cuando cambia (p. ej. al elegir ciudad). */
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
};

export function ResultsMap({ items, activeId, onActive, onSelect, selectedId, bbox, onSearchArea, onClearArea, center, zoom, className, loading, padding }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>());
  const popupRef = useRef<Popup | null>(null);
  const [popupEl] = useState(() => (typeof document === "undefined" ? null : document.createElement("div")));
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [popupItem, setPopupItem] = useState<PublicationCard | null>(null);
  const cb = useRef({ onActive, onSelect });
  useEffect(() => { cb.current = { onActive, onSelect }; });
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; });
  const bboxRef = useRef(bbox);
  useEffect(() => { bboxRef.current = bbox; });
  const padRef = useRef(padding);
  useEffect(() => { padRef.current = padding; });

  // Crear mapa
  useEffect(() => {
    if (!box.current) return;
    let disposed = false;
    let ro: ResizeObserver | null = null;
    createMap(box.current, { center: center ?? COLOMBIA_CENTER, zoom: zoom ?? 5 })
      .then(({ map, ml }) => {
        if (disposed) { map.remove(); return; }
        mapRef.current = map; mlRef.current = ml;
        map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        // Solo los movimientos hechos por la persona (con originalEvent) habilitan "Buscar en esta zona".
        map.on("moveend", (e) => { if ((e as { originalEvent?: unknown }).originalEvent) setDirty(true); });
        ro = new ResizeObserver(() => map.resize());
        ro.observe(box.current!);
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      disposed = true; ro?.disconnect();
      markers.current.forEach(({ marker }) => marker.remove()); markers.current.clear();
      popupRef.current?.remove(); popupRef.current = null;
      mapRef.current?.remove(); mapRef.current = null; setReady(false);
    };
    // El mapa se crea una sola vez; el centro inicial no vuelve a aplicarse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizar pines
  useEffect(() => {
    const map = mapRef.current, ml = mlRef.current;
    if (!ready || !map || !ml) return;
    const want = new Set<string>();
    for (const it of items) {
      if (it.lat == null || it.lng == null) continue;
      want.add(it.id);
      const cur = markers.current.get(it.id);
      const label = formatPriceShort(it.price, it.currency);
      if (cur) { cur.marker.setLngLat([it.lng, it.lat]); if (cur.el.textContent !== label) cur.el.textContent = label; continue; }
      const el = document.createElement("button");
      el.type = "button"; el.className = "price-pin"; el.textContent = label; el.setAttribute("aria-label", `${it.title}, ${formatPrice(it.price, it.currency)}`);
      el.addEventListener("mouseenter", () => cb.current.onActive(it.id));
      el.addEventListener("mouseleave", () => cb.current.onActive(null));
      el.addEventListener("focus", () => cb.current.onActive(it.id));
      el.addEventListener("blur", () => cb.current.onActive(null));
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        el.dataset.viewed = "true";
        if (cb.current.onSelect) cb.current.onSelect(it.id);
        else setPopupItem(itemsRef.current.find((x) => x.id === it.id) ?? it);
      });
      const marker = new ml.Marker({ element: el, anchor: "center" }).setLngLat([it.lng, it.lat]).addTo(map);
      markers.current.set(it.id, { marker, el });
    }
    for (const [id, m] of markers.current) if (!want.has(id)) { m.marker.remove(); markers.current.delete(id); }
  }, [items, ready]);

  // Pin activo / seleccionado
  useEffect(() => {
    markers.current.forEach(({ el }, id) => {
      el.dataset.active = String(id === activeId);
      el.dataset.selected = String(id === selectedId);
    });
  }, [activeId, selectedId, items, ready]);

  // Ajustar a resultados cuando cambia el conjunto de pines (si no hay zona aplicada)
  const idsKey = items.map((i) => i.id).join(",");
  const fit = useCallback(() => {
    const map = mapRef.current, ml = mlRef.current;
    if (!map || !ml) return;
    const pts = itemsRef.current.filter((i) => i.lat != null && i.lng != null);
    if (!pts.length) return;
    const b = new ml.LngLatBounds();
    pts.forEach((i) => b.extend([i.lng!, i.lat!]));
    const p = padRef.current ?? {};
    map.fitBounds(b, { padding: { top: 70 + (p.top ?? 0), bottom: 70 + (p.bottom ?? 0), left: 60, right: 60 }, maxZoom: pts.length === 1 ? 15 : 14, duration: 700 });
    setDirty(false);
  }, []);
  useEffect(() => {
    if (!ready || bboxRef.current) return;
    fit();
  }, [idsKey, ready, fit]);

  // Centrar el pin seleccionado (carrusel inferior en móvil)
  useEffect(() => {
    if (!ready || !selectedId) return;
    const it = itemsRef.current.find((i) => i.id === selectedId);
    if (it?.lat != null && it.lng != null) mapRef.current?.easeTo({ center: [it.lng, it.lat], duration: 450 });
  }, [selectedId, ready]);

  // Popup de mini tarjeta
  useEffect(() => {
    const map = mapRef.current, ml = mlRef.current;
    popupRef.current?.remove(); popupRef.current = null;
    if (!ready || !map || !ml || !popupItem || popupItem.lat == null || popupItem.lng == null || !popupEl) return;
    const popup = new ml.Popup({ closeButton: false, closeOnClick: true, offset: 20, className: "nido-popup", maxWidth: "280px", anchor: "bottom" })
      .setLngLat([popupItem.lng, popupItem.lat]).setDOMContent(popupEl).addTo(map);
    popup.on("close", () => setPopupItem((cur) => (cur?.id === popupItem.id ? null : cur)));
    popupRef.current = popup;
    map.easeTo({ center: [popupItem.lng, popupItem.lat], offset: [0, 90], duration: 450 });
    return () => { popup.remove(); };
  }, [popupItem, ready, popupEl]);

  // Si cambia el centro externo (ciudad elegida sin resultados aún)
  useEffect(() => {
    if (ready && center && !items.length) mapRef.current?.easeTo({ center, zoom: zoom ?? 11, duration: 700 });
  }, [center?.[0], center?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchArea = () => {
    const map = mapRef.current; if (!map) return;
    onSearchArea(boundsToBbox(map.getBounds()));
    setDirty(false);
  };

  return (
    <div className={cn("nido-map relative isolate overflow-hidden bg-surface-2", className)}>
      <div ref={box} className="absolute inset-0" />
      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-surface p-6 text-center text-sm text-ink-2">No pudimos cargar el mapa en este navegador. Puedes seguir explorando la lista.</div>
      )}
      {/* Acciones flotantes */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
        {(dirty || (bbox && !dirty)) && ready && (
          <div className="pointer-events-auto flex items-center gap-2">
            {dirty && (
              <button type="button" onClick={searchArea} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-[var(--shadow-pop)] transition hover:bg-brand-900 active:scale-95">
                <Search className="h-4 w-4" />Buscar en esta zona
              </button>
            )}
            {bbox && !dirty && (
              <button type="button" onClick={() => { onClearArea(); }} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink shadow-[var(--shadow-pop)] transition hover:bg-surface active:scale-95">
                <X className="h-4 w-4" />Quitar zona
              </button>
            )}
          </div>
        )}
      </div>
      <button type="button" aria-label="Ajustar el mapa a los resultados" onClick={fit}
        className="absolute bottom-6 right-2.5 z-10 grid h-[38px] w-[38px] place-items-center rounded-[14px] border border-line bg-white text-ink shadow-[0_4px_16px_rgb(14_21_18/0.14)] hover:bg-surface"><LocateFixed className="h-[18px] w-[18px]" /></button>
      {loading && <div className="absolute inset-x-0 top-0 z-10 h-1 overflow-hidden bg-brand-100"><div className="h-full w-1/3 animate-[shimmer_1.1s_linear_infinite] bg-brand-600" style={{ backgroundSize: "200% 100%" }} /></div>}
      {ready && !items.length && !loading && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center px-6"><p className="rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-ink-2 shadow-[var(--shadow-card)]">No hay inmuebles en esta zona</p></div>
      )}
      {popupEl && popupItem && createPortal(<MiniCard item={popupItem} onClose={() => popupRef.current?.remove()} />, popupEl)}
    </div>
  );
}

export function MiniCard({ item, onClose, className }: { item: PublicationCard; onClose?: () => void; className?: string }) {
  const where = [item.neighborhood?.name, item.city.name].filter(Boolean).join(", ");
  return (
    <div className={cn("relative bg-white", className)}>
      <Link href={item.path} className="block">
        <Photo src={item.coverUrl ?? item.images[0]?.url} alt={item.title} seed={item.code} className="aspect-[16/10] w-full" sizes="264px" widths={[300, 520]} />
        <div className="grid gap-1 px-4 pb-4 pt-3">
          <p className="font-display text-[1.7rem] leading-none tabular">{formatPrice(item.price, item.currency)}{item.operation === "RENT" && <span className="ml-1 font-sans text-sm text-ink-3">/ mes</span>}</p>
          <p className="line-clamp-1 text-[15px] font-semibold">{item.title}</p>
          <p className="line-clamp-1 text-[13px] text-ink-3">{where}</p>
          <p className="mt-1 flex items-center gap-3 text-[13px] text-ink-2">
            {item.bedrooms != null && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{item.bedrooms}</span>}
            {item.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{item.bathrooms}</span>}
            {item.area != null && <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{Math.round(item.area)} m²</span>}
          </p>
          <span className="mt-2 inline-flex h-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">Ver inmueble</span>
        </div>
      </Link>
      {onClose && <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow"><X className="h-4 w-4" /></button>}
    </div>
  );
}
