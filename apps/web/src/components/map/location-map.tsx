"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { cn } from "@/lib/cn";
import { ExternalLink } from "@/components/search/icons";
import { circlePolygon, createMap } from "./maplibre";
import "./map.css";

/** Mini mapa de la ficha: círculo (~250 m) si la ubicación es aproximada, pin si es exacta. */
export function LocationMap({ lat, lng, approximate, label, className }: { lat: number; lng: number; approximate: boolean; label: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!box.current) return;
    let disposed = false;
    let map: MLMap | null = null;
    createMap(box.current, { center: [lng, lat], zoom: approximate ? 14.4 : 15.5, scrollZoom: false })
      .then(({ map: m, ml }) => {
        if (disposed) { m.remove(); return; }
        map = m;
        m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        if (approximate) {
          const add = () => {
            if (m.getSource("approx")) return;
            m.addSource("approx", { type: "geojson", data: circlePolygon(lng, lat, 260) });
            m.addLayer({ id: "approx-fill", type: "fill", source: "approx", paint: { "fill-color": "#0a6b50", "fill-opacity": 0.16 } });
            m.addLayer({ id: "approx-line", type: "line", source: "approx", paint: { "line-color": "#0a6b50", "line-width": 2, "line-opacity": 0.75 } });
          };
          if (m.isStyleLoaded()) add();
          m.on("style.load", add);
        } else {
          const el = document.createElement("div"); el.className = "nido-pin-dot";
          new ml.Marker({ element: el }).setLngLat([lng, lat]).addTo(m);
        }
        // Un punto central discreto cuando es aproximado, para dar referencia
        if (approximate) { const dot = document.createElement("div"); dot.className = "nido-pin-dot"; dot.style.transform = "scale(.55)"; new ml.Marker({ element: dot }).setLngLat([lng, lat]).addTo(m); }
      })
      .catch(() => setFailed(true));
    return () => { disposed = true; map?.remove(); };
  }, [lat, lng, approximate]);

  return (
    <div className={cn("relative isolate overflow-hidden rounded-[24px] border border-line bg-surface-2", className)}>
      <div ref={box} className="absolute inset-0" role="img" aria-label={`Mapa de ${label}`} />
      {failed && <div className="absolute inset-0 grid place-items-center bg-surface p-6 text-center text-sm text-ink-2">No pudimos cargar el mapa.</div>}
      <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
        className="absolute bottom-3 left-3 z-10 inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold shadow-[var(--shadow-card)] hover:bg-surface">
        Abrir en Google Maps<ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
