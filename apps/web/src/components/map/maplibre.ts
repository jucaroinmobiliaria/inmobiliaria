import type { Map as MLMap, StyleSpecification } from "maplibre-gl";

export type ML = typeof import("maplibre-gl");
let lib: Promise<ML> | null = null;
/** Carga diferida de maplibre-gl (solo en el navegador). */
export const loadMapLibre = () => (lib ??= import("maplibre-gl").then((m) => { m.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs"); return m; }));

export const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE ?? "https://tiles.openfreemap.org/styles/positron";
/** Estilo de respaldo sin teselas: el mapa sigue siendo usable (pines, zoom) si el proveedor no responde. */
const graticule = (): GeoJSON.FeatureCollection => {
  const features: GeoJSON.Feature[] = [];
  for (let x = -82; x <= -66; x += 1) features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[x, -5], [x, 14]] } });
  for (let y = -5; y <= 14; y += 1) features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[-82, y], [-66, y]] } });
  return { type: "FeatureCollection", features };
};
export const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: { grid: { type: "geojson", data: graticule() } },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#eaf0ed" } },
    { id: "grid", type: "line", source: "grid", paint: { "line-color": "#d5dfda", "line-width": 1 } },
  ],
};

export const COLOMBIA_CENTER: [number, number] = [-74.2, 4.6];

export async function createMap(container: HTMLElement, opts: { center: [number, number]; zoom: number; scrollZoom?: boolean; onFallback?: () => void }): Promise<{ map: MLMap; ml: ML }> {
  const ml = await loadMapLibre();
  const map = new ml.Map({
    container, style: MAP_STYLE, center: opts.center, zoom: opts.zoom, attributionControl: { compact: true }, cooperativeGestures: false,
    scrollZoom: opts.scrollZoom ?? true, dragRotate: false, pitchWithRotate: false, maxPitch: 0,
  });
  map.touchZoomRotate.disableRotation();
  let ready = false;
  let fell = false;
  const fallback = () => { if (ready || fell) return; fell = true; opts.onFallback?.(); map.setStyle(BLANK_STYLE, { diff: false }); };
  map.once("load", () => { ready = true; });
  map.on("error", (e) => {
    const msg = String((e as unknown as { error?: { message?: string } }).error?.message ?? "");
    if (!ready && (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("status") || msg.includes("Load failed") || msg === "")) fallback();
  });
  setTimeout(fallback, 7000);
  return { map, ml };
}

/** Polígono circular (GeoJSON) para mostrar zonas aproximadas. */
export function circlePolygon(lng: number, lat: number, radiusM: number, steps = 72): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    coords.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

export function boundsToBbox(b: { getWest(): number; getSouth(): number; getEast(): number; getNorth(): number }) {
  const r = (n: number) => Math.round(n * 1e5) / 1e5;
  return `${r(b.getWest())},${r(b.getSouth())},${r(b.getEast())},${r(b.getNorth())}`;
}
