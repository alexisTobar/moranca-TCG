import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Estados en que una orden ya cuenta como venta (pago confirmado por el vendedor). */
const SOLD = Prisma.sql`status IN ('PAID','SHIPPED','DELIVERED')`;
const TZ = "America/Santiago";
const DAY = 86_400_000;

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Esperando pago", PAID: "Pagadas", SHIPPED: "Enviadas", DELIVERED: "Entregadas", CANCELLED: "Canceladas",
};

/** Días del período en hora de Chile, de más antiguo a hoy, como "YYYY-MM-DD". */
function dayKeys(days: number, now = new Date()) {
  const today = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getTime() - (days - 1 - i) * DAY);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

/** Etiqueta corta del eje: "31 oct". */
export function shortDay(key: string) {
  const [, m, d] = key.split("-").map(Number);
  return `${d} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][m - 1]}`;
}

function fill(keys: string[], rows: Array<{ d: string; v: number }>) {
  const map = new Map(rows.map((r) => [r.d, Number(r.v)]));
  return keys.map((k) => map.get(k) ?? 0);
}

async function daily(sql: Prisma.Sql, keys: string[]) {
  return fill(keys, await prisma.$queryRaw<Array<{ d: string; v: number }>>(sql));
}

/**
 * Métricas de ventas de los últimos `days` días frente al período anterior.
 * Con `sellerId` se limitan a ese vendedor; sin él, a todo el marketplace (solo administración).
 */
export async function salesMetrics(sellerId: string | null, days = 30) {
  const now = new Date();
  const start = new Date(now.getTime() - days * DAY);
  const prevStart = new Date(start.getTime() - days * DAY);
  const keys = dayKeys(days, now);
  const seller = sellerId ? Prisma.sql`AND o."sellerId" = ${sellerId}` : Prisma.empty;

  const [amount, count, prev, statuses, topProducts, byGame, pendingShip, reviews] = await Promise.all([
    daily(Prisma.sql`SELECT to_char(o."paidAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}, 'YYYY-MM-DD') d, COALESCE(SUM(o.total),0)::int v
      FROM "Order" o WHERE o.${SOLD} AND o."paidAt" >= ${start} ${seller} GROUP BY 1`, keys),
    daily(Prisma.sql`SELECT to_char(o."paidAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}, 'YYYY-MM-DD') d, COUNT(*)::int v
      FROM "Order" o WHERE o.${SOLD} AND o."paidAt" >= ${start} ${seller} GROUP BY 1`, keys),
    prisma.$queryRaw<Array<{ amount: number; count: number }>>(Prisma.sql`SELECT COALESCE(SUM(o.total),0)::int amount, COUNT(*)::int count
      FROM "Order" o WHERE o.${SOLD} AND o."paidAt" >= ${prevStart} AND o."paidAt" < ${start} ${seller}`),
    prisma.$queryRaw<Array<{ status: string; n: number }>>(Prisma.sql`SELECT o.status::text status, COUNT(*)::int n
      FROM "Order" o WHERE o."createdAt" >= ${start} ${seller} GROUP BY 1`),
    prisma.$queryRaw<Array<{ title: string; qty: number; amount: number }>>(Prisma.sql`SELECT i.title, SUM(i.quantity)::int qty, SUM(i.quantity * i."unitPrice")::int amount
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" WHERE o.${SOLD} AND o."paidAt" >= ${start} ${seller}
      GROUP BY i.title ORDER BY amount DESC LIMIT 6`),
    prisma.$queryRaw<Array<{ game: string; amount: number }>>(Prisma.sql`SELECT l.game, SUM(i.quantity * i."unitPrice")::int amount
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" JOIN "Listing" l ON l.id = i."listingId"
      WHERE o.${SOLD} AND o."paidAt" >= ${start} ${seller} GROUP BY l.game ORDER BY amount DESC`),
    prisma.order.count({ where: { status: "PAID", ...(sellerId ? { sellerId } : {}) } }),
    prisma.review.aggregate({ where: sellerId ? { sellerId } : {}, _avg: { rating: true }, _count: { _all: true } }),
  ]);

  const total = amount.reduce((a, b) => a + b, 0);
  const orders = count.reduce((a, b) => a + b, 0);
  return {
    keys, amount, count, total, orders,
    prevTotal: prev[0]?.amount ?? 0, prevOrders: prev[0]?.count ?? 0,
    avgTicket: orders ? Math.round(total / orders) : 0,
    prevAvgTicket: prev[0]?.count ? Math.round(prev[0].amount / prev[0].count) : 0,
    statuses: Object.keys(STATUS_LABELS).map((s) => ({ status: s, n: statuses.find((r) => r.status === s)?.n ?? 0 })),
    topProducts, byGame, pendingShip,
    rating: reviews._avg.rating, reviewCount: reviews._count._all,
  };
}

/** Publicaciones más vistas (contador acumulado de la ficha). */
export async function topViewedListings(sellerId: string | null, take = 6) {
  return prisma.listing.findMany({
    where: { status: "ACTIVE", views: { gt: 0 }, ...(sellerId ? { sellerId } : {}) },
    orderBy: { views: "desc" }, take, select: { id: true, title: true, views: true, stock: true },
  });
}

/** Crecimiento del marketplace para la administración: cuentas, publicaciones, vendedores y búsquedas. */
export async function marketplaceMetrics(days = 30) {
  const now = new Date();
  const start = new Date(now.getTime() - days * DAY);
  const prevStart = new Date(start.getTime() - days * DAY);
  const keys = dayKeys(days, now);
  const [signups, listings, prevSignups, prevListings, totals, topSellers, searches, noResults] = await Promise.all([
    daily(Prisma.sql`SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}, 'YYYY-MM-DD') d, COUNT(*)::int v FROM "User" WHERE "createdAt" >= ${start} GROUP BY 1`, keys),
    daily(Prisma.sql`SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}, 'YYYY-MM-DD') d, COUNT(*)::int v FROM "Listing" WHERE "createdAt" >= ${start} GROUP BY 1`, keys),
    prisma.user.count({ where: { createdAt: { gte: prevStart, lt: start } } }),
    prisma.listing.count({ where: { createdAt: { gte: prevStart, lt: start } } }),
    prisma.$queryRaw<Array<{ users: number; sellers: number; active_sellers: number; listings: number; stock_value: number }>>(Prisma.sql`SELECT
      (SELECT COUNT(*)::int FROM "User" WHERE active) users,
      (SELECT COUNT(*)::int FROM "User" WHERE role IN ('SELLER','ADMIN') AND active) sellers,
      (SELECT COUNT(DISTINCT "sellerId")::int FROM "Listing" WHERE status = 'ACTIVE') active_sellers,
      (SELECT COUNT(*)::int FROM "Listing" WHERE status = 'ACTIVE') listings,
      (SELECT COALESCE(SUM(price * stock),0)::bigint::float8 FROM "Listing" WHERE status = 'ACTIVE') stock_value`),
    prisma.$queryRaw<Array<{ name: string; slug: string; amount: number; orders: number }>>(Prisma.sql`SELECT u.name, u.slug, SUM(o.total)::int amount, COUNT(*)::int orders
      FROM "Order" o JOIN "User" u ON u.id = o."sellerId" WHERE o.${SOLD} AND o."paidAt" >= ${start}
      GROUP BY u.id ORDER BY amount DESC LIMIT 6`),
    prisma.searchEvent.groupBy({ by: ["term"], where: { createdAt: { gte: start } }, _count: { _all: true }, orderBy: { _count: { term: "desc" } }, take: 8 }),
    prisma.searchEvent.groupBy({ by: ["term"], where: { createdAt: { gte: start }, results: 0 }, _count: { _all: true }, orderBy: { _count: { term: "desc" } }, take: 8 }),
  ]);
  return {
    keys, signups, listings,
    signupTotal: signups.reduce((a, b) => a + b, 0), prevSignups,
    listingTotal: listings.reduce((a, b) => a + b, 0), prevListings,
    totals: totals[0], topSellers,
    searches: searches.map((s) => ({ term: s.term, n: s._count._all })),
    noResults: noResults.map((s) => ({ term: s.term, n: s._count._all })),
  };
}
