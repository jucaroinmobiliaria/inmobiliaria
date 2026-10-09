import type { Prisma } from "./prisma.service.js";

/** Relaciones necesarias para pintar tarjetas y detalle. */
export const cardInclude = (imageTake: number | undefined = 6) =>
  ({
    property: {
      include: {
        type: true,
        location: { include: { city: true, neighborhood: true } },
        images: {
          where: { status: "READY" },
          orderBy: [{ isCover: "desc" }, { position: "asc" }, { createdAt: "asc" }],
          ...(imageTake ? { take: imageTake } : {}),
        },
        owner: { include: { profile: true, agent: { include: { agency: true } } } },
        _count: { select: { images: { where: { status: "READY" } } } },
      },
    },
  }) satisfies Prisma.PublicationInclude;

export type CardRow = Prisma.PublicationGetPayload<{ include: ReturnType<typeof cardInclude> }>;

export const detailInclude = () =>
  ({
    property: {
      include: {
        type: true,
        location: { include: { city: true, neighborhood: true } },
        images: {
          where: { status: "READY" },
          orderBy: [{ isCover: "desc" }, { position: "asc" }, { createdAt: "asc" }],
        },
        owner: { include: { profile: true, agent: { include: { agency: true } } } },
        features: { include: { amenity: true } },
        _count: { select: { images: { where: { status: "READY" } } } },
      },
    },
    priceHistory: { orderBy: { createdAt: "asc" } },
    _count: { select: { favorites: true } },
  }) satisfies Prisma.PublicationInclude;

export type DetailRow = Prisma.PublicationGetPayload<{ include: ReturnType<typeof detailInclude> }>;

/** Todo lo necesario para el borrador del wizard (incluye imágenes PENDING). */
export const draftInclude = () =>
  ({
    property: {
      include: {
        type: true,
        location: { include: { city: true, neighborhood: true } },
        images: { orderBy: [{ isCover: "desc" }, { position: "asc" }, { createdAt: "asc" }] },
        features: true,
      },
    },
  }) satisfies Prisma.PublicationInclude;

export type DraftRow = Prisma.PublicationGetPayload<{ include: ReturnType<typeof draftInclude> }>;

export const myRowInclude = () => ({ ...draftInclude(), _count: { select: { favorites: true, inquiries: true } } }) satisfies Prisma.PublicationInclude;
export type MyRow = Prisma.PublicationGetPayload<{ include: ReturnType<typeof myRowInclude> }>;
