import "server-only";
import { prisma } from "@/lib/db";

/** Idioma vacío se agrupa como "Sin idioma". "*" es el resumen de todos. */
export const ALL_LANGUAGES = "*";

export interface CardOffer {
  id: string;
  slug: string;
  /** Precio vigente (con oferta si la hay). */
  price: number;
  listPrice: number;
  stock: number;
  condition: string | null;
  language: string | null;
  isFoil: boolean;
  createdAt: Date;
  seller: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    city: string | null;
    region: string | null;
    offersShipping: boolean;
    offersPickup: boolean;
  };
}

export interface LanguageStat {
  language: string;
  min: number;
  market: number;
  max: number;
  count: number;
  sellers: number;
}

/** Ofertas activas (con stock) de una misma carta, ordenadas de menor a mayor precio. */
export async function getCardOffers(game: string, externalId: string): Promise<CardOffer[]> {
  const rows = await prisma.listing.findMany({
    where: { game, externalId, type: "SINGLE", status: "ACTIVE", stock: { gt: 0 } },
    select: {
      id: true,
      slug: true,
      price: true,
      offerPrice: true,
      stock: true,
      condition: true,
      language: true,
      isFoil: true,
      createdAt: true,
      seller: {
        select: {
          id: true,
          name: true,
          slug: true,
          avatarUrl: true,
          city: true,
          region: true,
          offersShipping: true,
          offersPickup: true,
          active: true,
          role: true,
        },
      },
    },
  });

  return rows
    .filter((r) => r.seller.active && r.seller.role !== "BUYER")
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      price: r.offerPrice != null && r.offerPrice < r.price ? r.offerPrice : r.price,
      listPrice: r.price,
      stock: r.stock,
      condition: r.condition,
      language: r.language,
      isFoil: r.isFoil,
      createdAt: r.createdAt,
      seller: {
        id: r.seller.id,
        name: r.seller.name,
        slug: r.seller.slug,
        avatarUrl: r.seller.avatarUrl,
        city: r.seller.city,
        region: r.seller.region,
        offersShipping: r.seller.offersShipping,
        offersPickup: r.seller.offersPickup,
      },
    }))
    .sort((a, b) => a.price - b.price);
}

/** Datos de la carta (nombre, imagen, edición…) tomados de cualquier publicación suya, aunque esté agotada. */
export async function getCardSample(game: string, externalId: string) {
  return prisma.listing.findFirst({
    where: { game, externalId, type: "SINGLE", status: { not: "DRAFT" } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      title: true,
      imageUrl: true,
      setName: true,
      cardNumber: true,
      rarity: true,
      color: true,
      family: true,
      illustrator: true,
      description: true,
    },
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function statOf(language: string, offers: CardOffer[]): LanguageStat {
  const prices = offers.map((o) => o.price);
  return {
    language,
    min: Math.min(...prices),
    market: median(prices),
    max: Math.max(...prices),
    count: offers.length,
    sellers: new Set(offers.map((o) => o.seller.id)).size,
  };
}

/** Mínimo / mercado (mediana) / máximo de las ofertas activas, por idioma y en total. */
export function computeStats(offers: CardOffer[]): { all: LanguageStat | null; byLanguage: LanguageStat[] } {
  if (offers.length === 0) return { all: null, byLanguage: [] };
  const groups = new Map<string, CardOffer[]>();
  for (const o of offers) {
    const key = o.language ?? "";
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  return {
    all: statOf(ALL_LANGUAGES, offers),
    byLanguage: [...groups.entries()]
      .map(([lang, list]) => statOf(lang, list))
      .sort((a, b) => b.count - a.count),
  };
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Guarda (o actualiza) la foto de hoy de los precios de una carta. */
export async function recordSnapshot(
  game: string,
  externalId: string,
  stats: { all: LanguageStat | null; byLanguage: LanguageStat[] }
) {
  if (!stats.all) return;
  const day = todayUtc();
  for (const s of [stats.all, ...stats.byLanguage]) {
    await prisma.priceSnapshot.upsert({
      where: { game_externalId_language_day: { game, externalId, language: s.language, day } },
      create: {
        game,
        externalId,
        language: s.language,
        minPrice: s.min,
        marketPrice: s.market,
        maxPrice: s.max,
        listings: s.count,
        day,
      },
      update: { minPrice: s.min, marketPrice: s.market, maxPrice: s.max, listings: s.count },
    });
  }
}

export interface HistoryPoint {
  day: string;
  min: number;
  market: number;
  max: number;
  listings: number;
}

/** Historial diario de precios (hasta un año) de una carta, por idioma ("*" = todos). */
export async function getPriceHistory(
  game: string,
  externalId: string
): Promise<Record<string, HistoryPoint[]>> {
  const since = new Date(Date.now() - 366 * 86_400_000);
  const rows = await prisma.priceSnapshot.findMany({
    where: { game, externalId, day: { gte: since } },
    orderBy: { day: "asc" },
    select: { language: true, day: true, minPrice: true, marketPrice: true, maxPrice: true, listings: true },
  });
  const out: Record<string, HistoryPoint[]> = {};
  for (const r of rows) {
    (out[r.language] ??= []).push({
      day: r.day.toISOString().slice(0, 10),
      min: r.minPrice,
      market: r.marketPrice,
      max: r.maxPrice,
      listings: r.listings,
    });
  }
  return out;
}

export interface RecentSale {
  date: Date;
  language: string | null;
  condition: string | null;
  isFoil: boolean;
  quantity: number;
  unitPrice: number;
}

/** Últimas ventas reales de la carta (órdenes con pago confirmado). */
export async function getRecentSales(game: string, externalId: string, take = 8): Promise<RecentSale[]> {
  const rows = await prisma.orderItem.findMany({
    where: {
      listing: { game, externalId },
      order: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] } },
    },
    orderBy: { order: { createdAt: "desc" } },
    take,
    select: {
      quantity: true,
      unitPrice: true,
      order: { select: { createdAt: true, paidAt: true } },
      listing: { select: { language: true, condition: true, isFoil: true } },
    },
  });
  return rows.map((r) => ({
    date: r.order.paidAt ?? r.order.createdAt,
    language: r.listing.language,
    condition: r.listing.condition,
    isFoil: r.listing.isFoil,
    quantity: r.quantity,
    unitPrice: r.unitPrice,
  }));
}

/**
 * Foto diaria de todas las cartas con ofertas activas. La corre el cron diario
 * para que el historial no dependa de que alguien visite cada carta.
 */
export async function snapshotAllPrices(): Promise<number> {
  const groups = await prisma.listing.groupBy({
    by: ["game", "externalId"],
    where: { type: "SINGLE", status: "ACTIVE", stock: { gt: 0 }, externalId: { not: null } },
  });
  let done = 0;
  for (const g of groups) {
    if (!g.externalId) continue;
    try {
      const offers = await getCardOffers(g.game, g.externalId);
      await recordSnapshot(g.game, g.externalId, computeStats(offers));
      done++;
    } catch (error) {
      console.error("[price-snapshot]", g.game, g.externalId, error);
    }
  }
  return done;
}
