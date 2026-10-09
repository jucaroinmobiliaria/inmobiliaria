import type {
  Advertiser, AdvertiserMini, AmenityCategory as AmenityCat, CatalogAmenity, Condition as ConditionDTO, DraftDTO, ImageDTO, MyPublicationRow,
  Operation as OperationDTO, PublicationCard, PublicationDetail, PublicationStatus as StatusDTO, Role as RoleDTO,
} from "../contract.js";
import { num, num0 } from "./bigint.js";
import { computeCompletion } from "./completion.js";
import { blurCoords } from "./geo.js";
import type { CardRow, DetailRow, DraftRow, MyRow } from "./include.js";
import { buildPath } from "./seo.js";
import type { Amenity, PropertyImage } from "../generated/prisma/client.js";

export const DAY_MS = 86_400_000;

type OwnerRow = CardRow["property"]["owner"];

export function toImageDTO(i: Pick<PropertyImage, "id" | "url" | "width" | "height" | "position" | "isCover" | "roomLabel" | "caption" | "status">): ImageDTO {
  return {
    id: i.id, url: i.url, width: i.width, height: i.height, position: i.position, isCover: i.isCover,
    roomLabel: i.roomLabel, caption: i.caption, status: i.status,
  };
}

export function toAmenityDTO(a: Amenity): CatalogAmenity {
  return { id: a.id, slug: a.slug, name: a.name, icon: a.icon, category: a.category as AmenityCat };
}

export function advertiserName(o: OwnerRow): string {
  return o.profile?.displayName?.trim() || o.name;
}
export function advertiserCompany(o: OwnerRow): string | null {
  return o.profile?.company?.trim() || o.agent?.agency?.name || null;
}

export function toAdvertiserMini(o: OwnerRow): AdvertiserMini {
  return {
    id: o.id, name: advertiserName(o), avatarUrl: o.avatarUrl, verified: o.verified || !!o.agent?.verified,
    company: advertiserCompany(o), role: o.role as RoleDTO,
  };
}

/** Destaque efectivo: respeta featuredUntil. */
export const isFeatured = (p: { featured: boolean; featuredUntil: Date | null }, now = new Date()) =>
  p.featured && (!p.featuredUntil || p.featuredUntil > now);

export function cardPath(p: CardRow): string {
  const loc = p.property.location;
  return buildPath({
    operation: p.operation,
    typeSlug: p.property.type?.slug ?? "inmueble",
    citySlug: loc?.city?.slug ?? "colombia",
    neighborhoodSlug: loc?.neighborhood?.slug ?? null,
    slug: p.slug,
    code: p.code,
  });
}

export function toCard(p: CardRow, favIds?: ReadonlySet<string>, now = new Date()): PublicationCard {
  const prop = p.property;
  const loc = prop.location;
  const hide = loc?.hideAddress ?? true;
  let lat: number | null = loc?.lat ?? null;
  let lng: number | null = loc?.lng ?? null;
  if (hide && lat !== null && lng !== null) ({ lat, lng } = blurCoords(lat, lng, p.id));
  const images = prop.images.map(toImageDTO);
  const cover = images.find((i) => i.isCover) ?? images[0] ?? null;
  return {
    id: p.id,
    code: p.code,
    slug: p.slug ?? "inmueble",
    path: cardPath(p),
    title: p.title ?? "",
    operation: p.operation as OperationDTO,
    status: p.status as StatusDTO,
    price: num0(p.price),
    currency: p.currency === "USD" ? "USD" : "COP",
    negotiable: p.negotiable,
    adminFee: num(prop.adminFee),
    type: { slug: prop.type?.slug ?? "inmueble", name: prop.type?.name ?? "Inmueble" },
    condition: prop.condition as ConditionDTO,
    area: prop.area,
    bedrooms: prop.bedrooms,
    bathrooms: prop.bathrooms,
    parking: prop.parking,
    stratum: prop.stratum,
    city: { slug: loc?.city?.slug ?? "", name: loc?.city?.name ?? "" },
    neighborhood: loc?.neighborhood ? { slug: loc.neighborhood.slug, name: loc.neighborhood.name } : null,
    address: hide ? null : (loc?.address ?? null),
    lat,
    lng,
    approximateLocation: hide,
    coverUrl: cover?.url ?? null,
    images,
    imageCount: prop._count.images,
    featured: isFeatured(p, now),
    isNew: !!p.publishedAt && now.getTime() - p.publishedAt.getTime() < 7 * DAY_MS,
    hasVideo: !!p.videoUrl,
    hasTour: !!p.tourUrl,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    isFavorite: favIds?.has(p.id) ?? false,
    advertiser: toAdvertiserMini(prop.owner),
  };
}

export function toDetail(
  p: DetailRow,
  extras: { favIds?: ReadonlySet<string>; activeListings: number; similar: PublicationCard[] },
  now = new Date(),
): PublicationDetail {
  const base = toCard(p, extras.favIds, now);
  const prop = p.property;
  const owner = prop.owner;
  const history = p.priceHistory.map((h) => ({ date: h.createdAt.toISOString(), price: num0(h.price) }));
  if (history.length === 0 && p.price !== null) {
    history.push({ date: (p.publishedAt ?? p.createdAt).toISOString(), price: num0(p.price) });
  }
  const advertiser: Advertiser = {
    ...base.advertiser,
    memberSince: owner.createdAt.toISOString(),
    activeListings: extras.activeListings,
    bio: owner.profile?.bio ?? null,
  };
  return {
    ...base,
    description: p.description ?? "",
    images: prop.images.map(toImageDTO),
    amenities: prop.features.map((f) => toAmenityDTO(f.amenity)).sort((a, b) => a.name.localeCompare(b.name, "es")),
    videoUrl: p.videoUrl,
    tourUrl: p.tourUrl,
    floor: prop.floor,
    totalFloors: prop.totalFloors,
    ageYears: prop.ageYears,
    landArea: prop.landArea,
    furnished: prop.furnished,
    petFriendly: prop.petFriendly,
    availableFrom: p.availableFrom?.toISOString() ?? null,
    minContractMonths: p.minContractMonths,
    viewCount: p.viewCount,
    favoriteCount: p._count.favorites,
    contact: {
      phone: p.showPhone ? (owner.phone ?? null) : null,
      whatsapp: p.showWhatsapp ? (owner.profile?.whatsapp ?? null) : null,
    },
    advertiser,
    priceHistory: history,
    similar: extras.similar,
  };
}

export function draftCompletion(d: DraftRow) {
  const prop = d.property;
  const ready = prop.images.filter((i) => i.status === "READY");
  const loc = prop.location;
  return computeCompletion({
    typeId: prop.typeId,
    cityId: loc?.cityId ?? null,
    price: num0(d.price),
    title: d.title ?? "",
    description: d.description ?? "",
    readyImages: ready.length,
    hasCover: ready.some((i) => i.isCover),
    neighborhoodId: loc?.neighborhoodId ?? null,
    hasLocation: !!(loc?.address || (loc?.lat != null && loc?.lng != null)),
    area: prop.area,
    amenities: prop.features.length,
  });
}

export function draftPath(d: DraftRow): string | null {
  if (d.status !== "PUBLISHED" && d.status !== "PAUSED" && d.status !== "SOLD" && d.status !== "RENTED") return null;
  const loc = d.property.location;
  if (!d.property.type || !loc?.city) return null;
  return buildPath({
    operation: d.operation, typeSlug: d.property.type.slug, citySlug: loc.city.slug,
    neighborhoodSlug: loc.neighborhood?.slug ?? null, slug: d.slug, code: d.code,
  });
}

/** El dueño ve sus propias coordenadas exactas y la dirección aunque esté oculta al público. */
export function toDraft(d: DraftRow): DraftDTO {
  const prop = d.property;
  const loc = prop.location;
  return {
    id: d.id,
    code: d.code,
    status: d.status as StatusDTO,
    moderationNote: d.moderationNote,
    operation: d.operation as OperationDTO,
    typeId: prop.typeId,
    cityId: loc?.cityId ?? null,
    currency: d.currency === "USD" ? "USD" : "COP",
    condition: prop.condition as ConditionDTO,
    title: d.title ?? "",
    description: d.description ?? "",
    price: num0(d.price),
    negotiable: d.negotiable,
    adminFee: num(prop.adminFee),
    area: prop.area,
    landArea: prop.landArea,
    bedrooms: prop.bedrooms,
    bathrooms: prop.bathrooms,
    parking: prop.parking,
    floor: prop.floor,
    totalFloors: prop.totalFloors,
    stratum: prop.stratum,
    ageYears: prop.ageYears,
    furnished: prop.furnished,
    petFriendly: prop.petFriendly,
    amenityIds: prop.features.map((f) => f.amenityId),
    neighborhoodId: loc?.neighborhoodId ?? null,
    address: loc?.address ?? null,
    hideAddress: loc?.hideAddress ?? true,
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
    videoUrl: d.videoUrl,
    tourUrl: d.tourUrl,
    availableFrom: d.availableFrom?.toISOString() ?? null,
    minContractMonths: d.minContractMonths,
    showPhone: d.showPhone,
    showWhatsapp: d.showWhatsapp,
    images: prop.images.map(toImageDTO),
    path: draftPath(d),
    completion: (({ percent, missing }) => ({ percent, missing }))(draftCompletion(d)),
    updatedAt: d.updatedAt.toISOString(),
    createdAt: d.createdAt.toISOString(),
    publishedAt: d.publishedAt?.toISOString() ?? null,
    viewCount: d.viewCount,
  };
}

export function toMyRow(d: MyRow): MyPublicationRow {
  const cover = d.property.images.find((i) => i.status === "READY" && i.isCover) ?? d.property.images.find((i) => i.status === "READY");
  const loc = d.property.location;
  return {
    id: d.id, code: d.code, title: d.title ?? "", operation: d.operation as OperationDTO, status: d.status as StatusDTO,
    price: num0(d.price), currency: d.currency === "USD" ? "USD" : "COP", coverUrl: cover?.url ?? null, path: draftPath(d),
    city: loc?.city?.name ?? null, neighborhood: loc?.neighborhood?.name ?? null, type: d.property.type?.name ?? null,
    views: d.viewCount, favorites: d._count.favorites, inquiries: d._count.inquiries, featured: isFeatured(d),
    moderationNote: d.moderationNote, updatedAt: d.updatedAt.toISOString(), publishedAt: d.publishedAt?.toISOString() ?? null,
    completion: draftCompletion(d).percent,
  };
}
