/** FNV-1a de 32 bits: hash estable y barato para derivar el desplazamiento de coordenadas. */
function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Desplaza (≈100–200 m) de forma determinista a partir del id: la misma publicación siempre cae en el mismo punto. */
export function blurCoords(lat: number, lng: number, id: string): { lat: number; lng: number } {
  const angle = (fnv(`${id}:a`) / 0xffffffff) * Math.PI * 2;
  const dist = 100 + (fnv(`${id}:b`) / 0xffffffff) * 100;
  const dLat = (dist * Math.cos(angle)) / 111_320;
  const dLng = (dist * Math.sin(angle)) / (111_320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return { lat: round6(lat + dLat), lng: round6(lng + dLng) };
}

/** "oeste,sur,este,norte" → límites o null si no es válido. */
export function parseBbox(raw?: string): { west: number; south: number; east: number; north: number } | null {
  if (!raw) return null;
  const p = raw.split(",").map((s) => Number(s.trim()));
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) return null;
  const [west, south, east, north] = p as [number, number, number, number];
  if (south < -90 || north > 90 || south > north) return null;
  return { west, south, east, north };
}
