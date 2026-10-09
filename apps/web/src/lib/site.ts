export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Jucaro",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  tagline: "Inmuebles con raíz en Colombia",
  description:
    "Jucaro publica cada aviso solo después de que un administrador lo aprueba. Encuentra apartamentos, casas, fincas y locales para comprar o arrendar, con fotos, mapa y contacto directo.",
  locale: "es_CO",
  email: "hola@jucaro.co",
  whatsapp: "573000000000",
} as const;

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;

export const OPERATION_LABEL = { SALE: "Venta", RENT: "Arriendo" } as const;
export const OPERATION_VERB = { SALE: "Comprar", RENT: "Arrendar" } as const;
export const OPERATION_SLUG = { SALE: "venta", RENT: "arriendo" } as const;
export const slugToOperation = (s: string) => (s === "venta" ? "SALE" : s === "arriendo" ? "RENT" : null);

export const STATUS_LABEL: Record<string, { label: string; tone: "neutral" | "success" | "warn" | "danger" | "info" }> = {
  DRAFT: { label: "Borrador", tone: "neutral" },
  PENDING_REVIEW: { label: "En revisión", tone: "info" },
  PUBLISHED: { label: "Publicado", tone: "success" },
  PAUSED: { label: "Pausado", tone: "warn" },
  REJECTED: { label: "Requiere cambios", tone: "danger" },
  SOLD: { label: "Vendido", tone: "neutral" },
  RENTED: { label: "Arrendado", tone: "neutral" },
  EXPIRED: { label: "Vencido", tone: "neutral" },
};
