import "server-only";
import { prisma } from "@/lib/db";

export interface SellerStats {
  /** Órdenes con pago confirmado (pagadas, enviadas o recibidas). */
  sales: number;
  /** Promedio de estrellas (0 si aún no tiene reseñas). */
  rating: number;
  reviews: number;
}

const EMPTY: SellerStats = { sales: 0, rating: 0, reviews: 0 };

/** Ventas y calificación de varios vendedores en dos consultas. */
export async function getSellerStats(ids: string[]): Promise<Map<string, SellerStats>> {
  const map = new Map<string, SellerStats>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return map;

  try {
    const [sales, reviews] = await Promise.all([
      prisma.order.groupBy({
        by: ["sellerId"],
        where: { sellerId: { in: unique }, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } },
        _count: { _all: true },
      }),
      prisma.review.groupBy({
        by: ["sellerId"],
        where: { sellerId: { in: unique } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    for (const id of unique) map.set(id, { ...EMPTY });
    for (const s of sales) {
      if (s.sellerId) map.set(s.sellerId, { ...(map.get(s.sellerId) ?? EMPTY), sales: s._count._all });
    }
    for (const r of reviews) {
      map.set(r.sellerId, {
        ...(map.get(r.sellerId) ?? EMPTY),
        rating: r._avg.rating ?? 0,
        reviews: r._count._all,
      });
    }
  } catch (error) {
    console.error("[seller-stats]", error);
    for (const id of unique) map.set(id, { ...EMPTY });
  }
  return map;
}

/** "+50 ventas": por debajo de 10 el número exacto, después el escalón alcanzado. */
export function formatSales(count: number): string | null {
  if (count <= 0) return null;
  if (count < 10) return `${count} ${count === 1 ? "venta" : "ventas"}`;
  const tiers = [10, 30, 50, 100, 300, 500, 1000, 3000, 5000];
  const tier = [...tiers].reverse().find((t) => count >= t) ?? 10;
  return `+${tier.toLocaleString("es-CL")} ventas`;
}
