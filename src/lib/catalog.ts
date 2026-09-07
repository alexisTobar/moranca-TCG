import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { slugify } from "@/lib/format";

export const LISTING_CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  game: true,
  type: true,
  price: true,
  imageUrl: true,
  condition: true,
  language: true,
  isFoil: true,
  stock: true,
  setName: true,
  createdAt: true,
  seller: { select: { name: true, slug: true } },
  _count: { select: { deckCards: true } },
} satisfies Prisma.ListingSelect;

/**
 * Ejecuta una consulta tolerando que la base de datos aún no exista
 * (útil en el primer despliegue o en desarrollo sin DATABASE_URL).
 */
export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[comarca] consulta omitida:", (error as Error).message);
    }
    return fallback;
  }
}

/** Genera un slug único agregando -2, -3… si ya existe otra publicación con ese slug. */
export async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "publicacion";
  let candidate = root;
  for (let i = 2; i < 200; i++) {
    const exists = await prisma.listing.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export function activeListings(where: Prisma.ListingWhereInput = {}) {
  return prisma.listing.findMany({
    where: { status: "ACTIVE", ...where },
    select: LISTING_CARD_SELECT,
    orderBy: { createdAt: "desc" },
  });
}
