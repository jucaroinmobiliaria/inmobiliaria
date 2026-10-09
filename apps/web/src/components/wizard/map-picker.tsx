"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MLMap, MapMouseEvent, Marker as MLMarker } from "maplibre-gl";
import { BLANK_STYLE, MAP_STYLE, loadMapLibre } from "@/components/map/maplibre";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import { LocateFixed, MapPin, Minus, Plus, TriangleAlert } from "@/components/uploader/icons";

/** Si el estilo remoto no carga, el mapa sigue siendo usable sobre el lienzo de respaldo del mapa público. */
const STYLE = MAP_STYLE;
const BLANK = BLANK_STYLE;

interface Props {
  /** Centro de referencia (ciudad / barrio). Al cambiar `flyKey`, el mapa vuela hasta aquí. */
  center: { lat: number; lng: number; zoom: number };
  flyKey: string;
  value: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
  /** Dibuja una zona aproximada en lugar de un punto exacto. */
  approximate: boolean;
}

function circle(lat: number, lng: number, meters: number) {
  const pts: [number, number][] = [];
  const dLat = meters / 111_320;
  const dLng = meters / (111_320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    pts.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [pts] } };
}

function pinElement() {
  const el = document.createElement("div");
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", "Ubicación del inmueble. Arrástrala para ajustar.");
  el.style.cssText = "width:44px;height:52px;cursor:grab;filter:drop-shadow(0 6px 8px rgba(14,21,18,.35));transition:transform .2s cubic-bezier(.34,1.56,.64,1);transform-origin:50% 100%";
  el.innerHTML = `<svg viewBox="0 0 44 52" width="44" height="52" aria-hidden="true"><path d="M22 51C22 51 4 33.5 4 21A18 18 0 0 1 40 21C40 33.5 22 51 22 51Z" fill="#0b6b57" stroke="#fff" stroke-width="3"/><circle cx="22" cy="21" r="7" fill="#fff"/></svg>`;
  return el;
}

export default function MapPicker({ center, flyKey, value, onChange, approximate }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const marker = useRef<MLMarker | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [locating, setLocating] = useState(false);
  const latest = useRef({ onChange, approximate, value, center });
  latest.current = { onChange, approximate, value, center };
  const blanked = useRef(false);

  const syncZone = useCallback(() => {
    const m = map.current;
    if (!m) return;
    const v = latest.current.value;
    const on = latest.current.approximate && v;
    try {
      const src = m.getSource("zone") as GeoJSONSource | undefined;
      if (!on) {
        if (m.getLayer("zone-fill")) m.removeLayer("zone-fill");
        if (m.getLayer("zone-line")) m.removeLayer("zone-line");
        if (src) m.removeSource("zone");
        return;
      }
      const data = circle(v.lat, v.lng, 260);
      if (src) { src.setData(data); return; }
      if (!m.isStyleLoaded() && !blanked.current) return;
      m.addSource("zone", { type: "geojson", data });
      m.addLayer({ id: "zone-fill", type: "fill", source: "zone", paint: { "fill-color": "#138a71", "fill-opacity": 0.18 } });
      m.addLayer({ id: "zone-line", type: "line", source: "zone", paint: { "line-color": "#0b6b57", "line-width": 2, "line-dasharray": [2, 2] } });
    } catch { /* el estilo aún no está listo: se reintenta en styledata */ }
  }, []);

  // Crear el mapa (solo en el cliente, import dinámico).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ml = await loadMapLibre();
      if (cancelled || !box.current) return;
      const start = latest.current.value ?? latest.current.center;
      const m = new ml.Map({
        container: box.current, style: STYLE, center: [start.lng, start.lat], zoom: latest.current.value ? 15 : latest.current.center.zoom,
        attributionControl: { compact: true }, cooperativeGestures: false, dragRotate: false, pitchWithRotate: false,
      });
      map.current = m;
      m.touchZoomRotate.disableRotation();

      const el = pinElement();
      const mk = new ml.Marker({ element: el, draggable: true, anchor: "bottom" }).setLngLat([start.lng, start.lat]);
      if (latest.current.value) mk.addTo(m);
      marker.current = mk;
      mk.on("dragstart", () => { el.style.cursor = "grabbing"; el.style.transform = "scale(1.12) translateY(-4px)"; });
      mk.on("drag", () => { const p = mk.getLngLat(); const v = { lat: p.lat, lng: p.lng }; latest.current.value = v; syncZone(); });
      mk.on("dragend", () => {
        el.style.cursor = "grab"; el.style.transform = "";
        const p = mk.getLngLat();
        latest.current.onChange(p.lat, p.lng);
      });

      m.on("click", (e: MapMouseEvent) => {
        const { lat, lng } = e.lngLat;
        mk.setLngLat([lng, lat]).addTo(m);
        latest.current.value = { lat, lng };
        latest.current.onChange(lat, lng);
      });
      m.on("load", () => { setReady(true); syncZone(); });
      m.on("styledata", () => syncZone());
      m.on("error", () => {
        // Si el estilo remoto falla (sin internet, bloqueado…), seguimos con un lienzo vacío.
        if (!m.isStyleLoaded() && !blanked.current) {
          blanked.current = true;
          setOffline(true);
          m.setStyle(BLANK, { diff: false });
          setReady(true);
          setTimeout(syncZone, 50);
        }
      });
      // Si pasa demasiado tiempo sin estilo, también pasamos al lienzo vacío.
      setTimeout(() => {
        if (!cancelled && !m.isStyleLoaded() && !blanked.current) {
          blanked.current = true;
          setOffline(true);
          m.setStyle(BLANK, { diff: false });
          setReady(true);
        }
      }, 6000);
    })();
    return () => {
      cancelled = true;
      marker.current?.remove();
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, [syncZone]);

  // Mantener el marcador y la zona alineados con el valor externo.
  useEffect(() => {
    const m = map.current;
    const mk = marker.current;
    if (!m || !mk) return;
    if (value) { mk.setLngLat([value.lng, value.lat]); if (!mk.getElement().isConnected) mk.addTo(m); } else mk.remove();
    syncZone();
  }, [value, approximate, ready, syncZone]);

  // Volar al centro cuando cambia ciudad / barrio.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    m.flyTo({ center: [center.lng, center.lat], zoom: center.zoom, duration: 1200, essential: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyKey, ready]);

  const locate = () => {
    if (!navigator.geolocation) { toast.error("Tu navegador no permite obtener la ubicación."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        marker.current && map.current && marker.current.setLngLat([lng, lat]).addTo(map.current);
        map.current?.flyTo({ center: [lng, lat], zoom: 16, duration: 1200 });
        latest.current.value = { lat, lng };
        latest.current.onChange(lat, lng);
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === err.PERMISSION_DENIED ? "No tenemos permiso para ver tu ubicación. Puedes tocar el mapa para ubicar el punto." : "No pudimos obtener tu ubicación. Toca el mapa para ubicar el punto.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-line bg-surface">
      <div
        ref={box}
        className="h-[300px] w-full sm:h-[340px]"
        role="application" aria-label="Mapa para ubicar el inmueble. Toca el mapa o arrastra el pin."
      />
      {!ready && <div className="skeleton pointer-events-none absolute inset-0 rounded-none" aria-hidden />}

      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
        <button type="button" onClick={locate} disabled={locating} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-ink shadow-[0_2px_10px_rgb(14_21_18/0.2)] transition hover:bg-surface active:scale-95 disabled:opacity-60">
          <LocateFixed className={cn("h-4 w-4 text-brand-600", locating && "animate-pulse")} /> {locating ? "Buscando…" : "Usar mi ubicación"}
        </button>
      </div>
      <div className="absolute right-3 top-3 z-10 hidden flex-col overflow-hidden rounded-full bg-white shadow-[0_2px_10px_rgb(14_21_18/0.2)] sm:flex">
        <button type="button" aria-label="Acercar" onClick={() => map.current?.zoomIn()} className="grid h-10 w-10 place-items-center hover:bg-surface"><Plus className="h-4 w-4" /></button>
        <span className="h-px bg-line" />
        <button type="button" aria-label="Alejar" onClick={() => map.current?.zoomOut()} className="grid h-10 w-10 place-items-center hover:bg-surface"><Minus className="h-4 w-4" /></button>
      </div>

      {!value && ready && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-ink/85 px-4 py-2 text-[13px] font-medium text-white shadow-lg backdrop-blur"><MapPin className="h-4 w-4" /> Toca el mapa para colocar el pin</span>
        </div>
      )}
      {offline && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-[12.5px] font-medium text-ink-2 shadow">
          <TriangleAlert className="h-4 w-4 shrink-0 text-sun-ink" /> El mapa base no cargó. Aun así puedes ubicar el punto.
        </div>
      )}
    </div>
  );
}
