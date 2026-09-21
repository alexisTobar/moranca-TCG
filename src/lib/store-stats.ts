import "server-only";
import { prisma } from "@/lib/db";

export interface StoreStats {
  views30: number;
  qrScans30: number;
  activeListings: number;
  orders30: number;
  revenue30: number;
  /** Últimos 30 días, con ceros donde no hubo visitas. */
  series: Array<{ day: string; views: number; qrScans: number }>;
  topSold: Array<{ title: string; quantity: number }>;
}

const PAID = ["PAID", "SHIPPED", "DELIVERED"] as const;

/** Visitas, ventas y productos más vendidos de una tienda en los últimos 30 días. */
export async function getStoreStats(storeId: string, sellerId: string): Promise<StoreStats> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const sinceDay = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate()));

  const [visits, activeListings, sales, top] = await Promise.all([
    prisma.storeVisitDay.findMany({
      where: { storeId, day: { gte: sinceDay } },
      select: { day: true, views: true, qrScans: true },
    }),
    prisma.listing.count({ where: { sellerId, status: "ACTIVE", stock: { gt: 0 } } }),
    prisma.order.aggregate({
      where: { sellerId, status: { in: [...PAID] }, createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.orderItem.groupBy({
      by: ["title"],
      where: { order: { sellerId, status: { in: [...PAID] }, createdAt: { gte: since } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const byDay = new Map(visits.map((v) => [v.day.toISOString().slice(0, 10), v]));
  const series: StoreStats["series"] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
    const v = byDay.get(key);
    series.push({ day: key, views: v?.views ?? 0, qrScans: v?.qrScans ?? 0 });
  }

  return {
    views30: series.reduce((a, s) => a + s.views, 0),
    qrScans30: series.reduce((a, s) => a + s.qrScans, 0),
    activeListings,
    orders30: sales._count._all,
    revenue30: sales._sum.total ?? 0,
    series,
    topSold: top.map((t) => ({ title: t.title, quantity: t._sum.quantity ?? 0 })),
  };
}
