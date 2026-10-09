import type { Operation } from "../generated/prisma/client.js";

export const opSegment = (op: Operation) => (op === "SALE" ? "venta" : "arriendo");
export const segmentToOp = (seg: string): Operation | null => (seg === "venta" ? "SALE" : seg === "arriendo" ? "RENT" : null);

export interface PathParts {
  operation: Operation;
  typeSlug: string;
  citySlug: string;
  neighborhoodSlug?: string | null;
  slug?: string | null;
  code: number;
}

/** `/{venta|arriendo}/{tipo}/{ciudad}[/{barrio}]/{slug}-{code}` */
export function buildPath(p: PathParts): string {
  const parts = [opSegment(p.operation), p.typeSlug, p.citySlug];
  if (p.neighborhoodSlug) parts.push(p.neighborhoodSlug);
  parts.push(`${p.slug || "inmueble"}-${p.code}`);
  return `/${parts.join("/")}`;
}

/** Ruta de aterrizaje SEO: `/{venta|arriendo}/{tipo|-}/{ciudad}[/{barrio}]`. */
export function landingPath(operation: Operation, typeSlug?: string | null, citySlug?: string | null, neighborhoodSlug?: string | null): string {
  const parts = [opSegment(operation), typeSlug || "-"];
  if (citySlug) {
    parts.push(citySlug);
    if (neighborhoodSlug) parts.push(neighborhoodSlug);
  }
  return `/${parts.join("/")}`;
}
