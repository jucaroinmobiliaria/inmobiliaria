import type { Catalog, DraftDTO, ImageDTO, PublicationCard, SessionUser } from "@/lib/types";
import { findCity, findType } from "./steps";

/** Convierte el borrador en una tarjeta pública (para mostrar la vista previa sin tocar el servidor). */
export function draftToCard(d: DraftDTO, catalog: Catalog, images: ImageDTO[], user: SessionUser): PublicationCard {
  const type = findType(catalog, d.typeId);
  const city = findCity(catalog, d.cityId);
  const hood = city?.neighborhoods.find((n) => n.id === d.neighborhoodId) ?? null;
  const where = hood?.name ?? city?.name;
  const title = d.title.trim() || (type ? `${type.name}${where ? ` en ${where}` : ""}` : "Tu título aparecerá aquí");
  return {
    id: d.id, code: d.code, slug: "", path: "#", title, operation: d.operation, status: d.status,
    // Sin precio todavía: la tarjeta muestra "—" (formatPrice acepta null).
    price: (d.price > 0 ? d.price : null) as unknown as number,
    currency: d.currency, negotiable: d.negotiable, adminFee: d.adminFee,
    type: { slug: type?.slug ?? "", name: type?.name ?? "Inmueble" }, condition: d.condition,
    area: d.area, bedrooms: d.bedrooms, bathrooms: d.bathrooms, parking: d.parking, stratum: d.stratum,
    city: { slug: city?.slug ?? "", name: city?.name ?? "Tu ciudad" },
    neighborhood: hood ? { slug: hood.slug, name: hood.name } : null,
    address: d.hideAddress ? null : d.address, lat: d.lat, lng: d.lng, approximateLocation: d.hideAddress,
    coverUrl: images[0]?.url ?? null, images: images.slice(0, 6), imageCount: images.length,
    featured: false, isNew: false, hasVideo: !!d.videoUrl, hasTour: !!d.tourUrl, publishedAt: d.publishedAt, isFavorite: false,
    advertiser: { id: user.id, name: user.name, avatarUrl: user.avatarUrl, verified: user.verified, company: user.profile.company, role: user.role },
  };
}
