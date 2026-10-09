/**
 * CONTRATO DE LA API — fuente de verdad de las formas JSON.
 * El backend (apps/api) debe devolver exactamente estas formas; el frontend las consume tal cual.
 * - Fechas: ISO 8601 (string). Dinero: números enteros en COP (el API convierte BigInt -> number).
 * - Errores: { statusCode, message, errors?: Record<campo, string[]> }
 */

export type Role = "USER" | "AGENT" | "OWNER" | "ADMIN";
export type Operation = "SALE" | "RENT";
export type Condition = "NEW" | "USED" | "OFF_PLAN";
export type PublicationStatus =
  | "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "PAUSED" | "REJECTED" | "SOLD" | "RENTED" | "EXPIRED";
export type InquiryStatus = "NEW" | "REPLIED" | "CLOSED";
export type VisitStatus = "REQUESTED" | "CONFIRMED" | "DONE" | "CANCELLED";
export type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";
export type AlertFrequency = "NONE" | "INSTANT" | "DAILY" | "WEEKLY";
export type AmenityCategory = "INTERIOR" | "BUILDING" | "EXTERIOR" | "SURROUNDINGS";

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ---------- Sesión ---------- */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  verified: boolean;
  createdAt: string;
  profile: {
    displayName: string | null;
    bio: string | null;
    whatsapp: string | null;
    company: string | null;
    website: string | null;
    city: string | null;
  };
  unreadNotifications: number;
}

export interface RegisterPendingDTO {
  ok: true;
  needsVerification: true;
  email: string;
  name: string;
  /** Solo en desarrollo, para pruebas. Nunca se envía en producción. */
  verifyToken?: string;
}

/* ---------- Catálogo ---------- */
export interface CatalogType { id: string; slug: string; name: string; pluralName: string; icon: string; group: string }
export interface CatalogAmenity { id: string; slug: string; name: string; icon: string; category: AmenityCategory }
export interface CatalogNeighborhood { id: string; slug: string; name: string; lat: number; lng: number }
export interface CatalogCity {
  id: string; slug: string; name: string; department: string; lat: number; lng: number;
  coverUrl: string | null;
  count: number; // publicaciones PUBLISHED
  neighborhoods: CatalogNeighborhood[];
}
/** Ciudad sin barrios anidados (búsqueda / listado ligero). */
export interface CatalogCityHit {
  id: string; slug: string; name: string; department: string; lat: number; lng: number;
}
export interface Catalog { types: CatalogType[]; amenities: CatalogAmenity[]; cities: CatalogCity[] }

export interface SuggestItem {
  kind: "city" | "neighborhood" | "type" | "code";
  label: string;       // "El Poblado"
  sublabel: string;    // "Medellín, Antioquia"
  city?: string;       // slug
  neighborhood?: string; // slug
  type?: string;       // slug
  path?: string;       // para kind=code: ruta de la publicación
}

/* ---------- Imágenes ---------- */
export interface ImageDTO {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  position: number;
  isCover: boolean;
  roomLabel: string | null;
  caption: string | null;
  status: "PENDING" | "READY";
}

/* ---------- Publicaciones ---------- */
export interface AdvertiserMini {
  id: string; name: string; avatarUrl: string | null; verified: boolean; company: string | null; role: Role;
}
export interface Advertiser extends AdvertiserMini {
  memberSince: string;
  activeListings: number;
  bio: string | null;
}

export interface PublicationCard {
  id: string;
  code: number;
  slug: string;
  /** Ruta SEO completa, p. ej. /venta/apartamento/medellin/el-poblado/apartamento-3-habitaciones-123 */
  path: string;
  title: string;
  operation: Operation;
  status: PublicationStatus;
  price: number;
  currency: "COP" | "USD";
  negotiable: boolean;
  adminFee: number | null;
  type: { slug: string; name: string };
  condition: Condition;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  stratum: number | null;
  city: { slug: string; name: string };
  neighborhood: { slug: string; name: string } | null;
  address: string | null;        // null si el anunciante oculta la dirección
  lat: number | null;
  lng: number | null;
  approximateLocation: boolean;  // true => lat/lng desplazados (~150 m)
  coverUrl: string | null;
  images: ImageDTO[];            // en tarjetas: máx. 6
  imageCount: number;
  featured: boolean;
  isNew: boolean;                // publicada hace < 7 días
  hasVideo: boolean;
  hasTour: boolean;
  publishedAt: string | null;
  isFavorite: boolean;
  advertiser: AdvertiserMini;
}

export interface PublicationDetail extends PublicationCard {
  description: string;
  images: ImageDTO[];            // todas, ordenadas, portada primero
  amenities: CatalogAmenity[];
  videoUrl: string | null;
  tourUrl: string | null;
  floor: number | null;
  totalFloors: number | null;
  ageYears: number | null;
  landArea: number | null;
  furnished: boolean;
  petFriendly: boolean;
  availableFrom: string | null;
  minContractMonths: number | null;
  viewCount: number;
  favoriteCount: number;
  contact: { phone: string | null; whatsapp: string | null };
  /** Solo ADMIN: teléfono y WhatsApp reales del anunciante. Ausente para el resto. */
  ownerContact?: { phone: string | null; whatsapp: string | null };
  advertiser: Advertiser;
  priceHistory: { date: string; price: number }[];
  similar: PublicationCard[];
}

/** Lo que edita el wizard. Todos los campos son opcionales en PATCH. */
export interface DraftInput {
  operation?: Operation;
  typeId?: string;
  condition?: Condition;
  title?: string;
  description?: string;
  price?: number;
  currency?: "COP" | "USD";
  negotiable?: boolean;
  adminFee?: number | null;
  area?: number | null;
  landArea?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  stratum?: number | null;
  ageYears?: number | null;
  furnished?: boolean;
  petFriendly?: boolean;
  amenityIds?: string[];
  cityId?: string;
  neighborhoodId?: string | null;
  address?: string | null;
  hideAddress?: boolean;
  lat?: number | null;
  lng?: number | null;
  videoUrl?: string | null;
  tourUrl?: string | null;
  availableFrom?: string | null;
  minContractMonths?: number | null;
  showPhone?: boolean;
  showWhatsapp?: boolean;
}

export interface DraftDTO extends Required<Omit<DraftInput, "operation" | "typeId" | "cityId" | "currency" | "condition">> {
  id: string;
  code: number;
  status: PublicationStatus;
  moderationNote: string | null;
  operation: Operation;
  typeId: string | null;
  cityId: string | null;
  currency: "COP" | "USD";
  condition: Condition;
  images: ImageDTO[];
  path: string | null;          // ruta pública si está publicada
  completion: { percent: number; missing: string[] }; // campos que faltan para enviar a revisión
  updatedAt: string;
  createdAt: string;
  publishedAt: string | null;
  viewCount: number;
}

export interface MyPublicationRow {
  id: string; code: number; title: string; operation: Operation; status: PublicationStatus;
  price: number; currency: "COP" | "USD"; coverUrl: string | null; path: string | null;
  city: string | null; neighborhood: string | null; type: string | null;
  views: number; favorites: number; inquiries: number; featured: boolean;
  moderationNote: string | null; updatedAt: string; publishedAt: string | null; completion: number;
}

/* ---------- Subida de imágenes ---------- */
export interface PresignRequestFile { name: string; mime: string; size: number; checksum: string; width?: number; height?: number }
export interface PresignedUpload {
  imageId: string;
  duplicate: boolean;            // si true, no hay que subir: ya existe una imagen con ese checksum
  uploadUrl: string | null;
  method: "PUT";
  headers: Record<string, string>;
  key: string;
  publicUrl: string;
}
export interface ConfirmImageItem { imageId: string; width?: number; height?: number }

/* ---------- Interacción ---------- */
export interface InquiryRow {
  id: string; status: InquiryStatus; name: string; email: string; phone: string | null;
  lastMessageAt: string; createdAt: string; unread: boolean;
  lastMessage: string;
  publication: { id: string; code: number; title: string; path: string | null; coverUrl: string | null };
}
export interface InquiryMessageDTO { id: string; body: string; fromOwner: boolean; createdAt: string; senderName: string }
export interface InquiryThread extends InquiryRow { messages: InquiryMessageDTO[] }

export interface VisitRow {
  id: string; status: VisitStatus; name: string; email: string; phone: string | null; note: string | null;
  scheduledAt: string; createdAt: string;
  publication: { id: string; code: number; title: string; path: string | null; coverUrl: string | null };
}

export interface SavedSearchDTO { id: string; name: string; query: SearchQuery; frequency: AlertFrequency; createdAt: string; newCount: number }
export interface NotificationDTO { id: string; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string }

/* ---------- Búsqueda ---------- */
export interface SearchQuery {
  operation?: Operation;
  type?: string;            // slug o lista separada por comas
  city?: string;
  neighborhood?: string;    // slug o lista
  q?: string;
  minPrice?: number; maxPrice?: number;
  bedrooms?: number; bathrooms?: number; parking?: number;   // mínimos
  minArea?: number; maxArea?: number;
  stratum?: string;         // "3,4,5"
  amenities?: string;       // slugs separados por coma (todas)
  condition?: Condition;
  furnished?: boolean; petFriendly?: boolean; featured?: boolean; withVideo?: boolean; withTour?: boolean;
  bbox?: string;            // "oeste,sur,este,norte"
  sort?: "relevance" | "newest" | "price_asc" | "price_desc" | "area_desc";
  page?: number; pageSize?: number;
}
export interface SearchResult extends Paginated<PublicationCard> {
  facets: { types: { slug: string; name: string; count: number }[] };
  priceRange: { min: number; max: number };
}

/* ---------- Home, SEO ---------- */
export interface HomeData {
  totals: { published: number; cities: number; advertisers: number };
  featured: PublicationCard[];
  latestSale: PublicationCard[];
  latestRent: PublicationCard[];
  cities: { slug: string; name: string; department: string; coverUrl: string | null; count: number }[];
  types: { slug: string; name: string; pluralName: string; icon: string; count: number }[];
}
export interface SitemapEntry { path: string; lastmod: string; images: string[] }
export interface LandingData {
  title: string; intro: string; city?: { slug: string; name: string }; neighborhood?: { slug: string; name: string };
  type?: { slug: string; name: string; pluralName: string }; operation: Operation;
  total: number; averagePrice: number | null; averagePricePerM2: number | null;
  related: { label: string; path: string; count: number }[];
}

/* ---------- Panel ---------- */
export interface DashboardSummary {
  kpis: {
    activeListings: number; pendingReview: number; drafts: number;
    views30d: number; favorites30d: number; inquiries30d: number; visitsPending: number;
    viewsDelta: number; inquiriesDelta: number;       // % vs 30 días anteriores
  };
  series: { date: string; views: number; favorites: number; inquiries: number }[]; // 30 días
  top: { id: string; title: string; path: string | null; coverUrl: string | null; views: number; inquiries: number; favorites: number }[];
  recentInquiries: InquiryRow[];
  upcomingVisits: VisitRow[];
  tips: { id: string; tone: "info" | "warn"; text: string; cta?: { label: string; href: string } }[];
}

/* ---------- Admin ---------- */
export interface AdminOverview {
  users: number; publications: number; published: number; pendingReview: number; openReports: number;
  inquiries30d: number; newUsers30d: number;
  series: { date: string; users: number; publications: number; inquiries: number }[];
  byCity: { name: string; count: number }[];
}
export interface AdminPublicationRow extends MyPublicationRow {
  owner: { id: string; name: string; email: string; verified: boolean; phone: string | null; whatsapp: string | null };
  reportCount: number;
}
export interface AdminUserRow {
  id: string; name: string; email: string; phone: string | null; role: Role; status: "ACTIVE" | "BLOCKED";
  verified: boolean; createdAt: string; lastLoginAt: string | null; listings: number;
}
export interface AdminReportRow {
  id: string; reason: string; details: string | null; status: ReportStatus; createdAt: string;
  reporter: { id: string; name: string } | null;
  publication: { id: string; code: number; title: string; path: string | null; status: PublicationStatus };
}
export interface AuditRow { id: string; action: string; entity: string; entityId: string | null; actor: string | null; createdAt: string; meta: unknown }

export interface AiDescriptionRequest {
  operation: Operation; type: string; city: string; neighborhood?: string;
  bedrooms?: number; bathrooms?: number; area?: number; parking?: number; stratum?: number; condition?: Condition;
  amenities?: string[]; extras?: string; tone?: "cercano" | "formal" | "premium";
}
export interface AiDescriptionResponse { title: string; description: string; highlights: string[]; source: "template" | "llm" }
