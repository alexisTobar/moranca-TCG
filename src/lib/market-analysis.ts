import "server-only";
import { prisma } from "@/lib/db";

const PAID = ["PAID", "SHIPPED", "DELIVERED"] as const;

export interface MarketRow { label: string; units: number; amount: number }

/** Análisis de mercado calculado desde operaciones reales: qué se vende, qué se mira, dónde se compra y qué falta. */
export async function marketAnalysis(days: number) {
  const since = new Date(Date.now() - days * 86400000);
  const paidWhere = { status: { in: [...PAID] }, paidAt: { gte: since } };

  const [items, regions, statuses, supply, viewed, tickets, ticketCats, sellers, newBuyers, carts, searches, emptySearches, paid] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: paidWhere },
      select: { quantity: true, unitPrice: true, title: true, listing: { select: { game: true, type: true, externalId: true } } },
    }),
    prisma.order.groupBy({ by: ["shipRegion"], where: paidWhere, _count: { _all: true }, _sum: { total: true } }),
    prisma.order.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.listing.groupBy({ by: ["game", "type"], where: { status: "ACTIVE", stock: { gt: 0 } }, _count: { _all: true }, _avg: { price: true }, _sum: { stock: true } }),
    prisma.listing.findMany({ where: { status: "ACTIVE" }, orderBy: { views: "desc" }, take: 10, select: { id: true, title: true, slug: true, game: true, views: true, stock: true, price: true } }),
    prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.supportTicket.groupBy({ by: ["category"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ["sellerId"], where: paidWhere, _count: { _all: true }, _sum: { total: true }, orderBy: { _sum: { total: "desc" } }, take: 8 }),
    prisma.user.count({ where: { role: "BUYER", createdAt: { gte: since } } }),
    prisma.order.count({ where: { createdAt: { gte: since } } }),
    prisma.searchEvent.groupBy({ by: ["term"], where: { day: { gte: since } }, _count: { _all: true }, _avg: { results: true }, orderBy: { _count: { term: "desc" } }, take: 15 }),
    prisma.searchEvent.groupBy({ by: ["term"], where: { day: { gte: since }, results: 0 }, _count: { _all: true }, orderBy: { _count: { term: "desc" } }, take: 15 }),
    // Lo que pagaron los compradores (con descuentos y envío): misma base que el ranking de vendedores.
    prisma.order.aggregate({ where: paidWhere, _sum: { total: true }, _count: { _all: true } }),
  ]);

  const sum = (rows: Map<string, MarketRow>, label: string, units: number, amount: number) => {
    const row = rows.get(label) ?? { label, units: 0, amount: 0 };
    row.units += units; row.amount += amount; rows.set(label, row);
  };
  const byGame = new Map<string, MarketRow>(), byType = new Map<string, MarketRow>(), byProduct = new Map<string, MarketRow>();
  for (const item of items) {
    const amount = item.unitPrice * item.quantity;
    sum(byGame, item.listing.game, item.quantity, amount);
    sum(byType, item.listing.type, item.quantity, amount);
    sum(byProduct, item.title, item.quantity, amount);
  }
  const sorted = (rows: Map<string, MarketRow>) => [...rows.values()].sort((a, b) => b.amount - a.amount);

  const sellerNames = new Map((await prisma.user.findMany({ where: { id: { in: sellers.map((s) => s.sellerId).filter((id): id is string => !!id) } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  const paidCount = statuses.filter((s) => (PAID as readonly string[]).includes(s.status)).reduce((n, s) => n + s._count._all, 0);

  // Demanda frente a oferta: juegos con ventas pero poco stock publicado.
  const supplyByGame = new Map<string, number>();
  for (const row of supply) supplyByGame.set(row.game, (supplyByGame.get(row.game) ?? 0) + (row._sum.stock ?? 0));
  const gaps = sorted(byGame).map((row) => ({ game: row.label, sold: row.units, stock: supplyByGame.get(row.label) ?? 0 }))
    .map((row) => ({ ...row, ratio: row.stock ? row.sold / row.stock : row.sold }))
    .sort((a, b) => b.ratio - a.ratio);

  return {
    days,
    revenue: paid._sum.total ?? 0,
    paidOrders: paid._count._all,
    units: items.reduce((n, i) => n + i.quantity, 0),
    orders: carts, paidCount, newBuyers,
    conversion: carts ? paidCount / carts : 0,
    byGame: sorted(byGame), byType: sorted(byType), topProducts: sorted(byProduct).slice(0, 10),
    regions: regions.map((r) => ({ label: r.shipRegion || "Retiro / sin región", orders: r._count._all, amount: r._sum.total ?? 0 })).sort((a, b) => b.amount - a.amount),
    statuses: statuses.map((s) => ({ status: s.status, count: s._count._all })),
    supply: supply.map((s) => ({ game: s.game, type: s.type, listings: s._count._all, stock: s._sum.stock ?? 0, avgPrice: Math.round(s._avg.price ?? 0) })).sort((a, b) => b.listings - a.listings),
    viewed, gaps,
    searches: searches.map((r) => ({ term: r.term, count: r._count._all, avgResults: Math.round(r._avg.results ?? 0) })),
    emptySearches: emptySearches.map((r) => ({ term: r.term, count: r._count._all })),
    tickets: tickets.map((t) => ({ status: t.status, count: t._count._all })),
    ticketCategories: ticketCats.map((t) => ({ category: t.category, count: t._count._all })).sort((a, b) => b.count - a.count),
    sellers: sellers.map((s) => ({ name: (s.sellerId && sellerNames.get(s.sellerId)) || "Vendedor eliminado", orders: s._count._all, amount: s._sum.total ?? 0 })),
  };
}
