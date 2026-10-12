import "server-only";
import { prisma } from "@/lib/db";
export async function usageSummary(start: Date, end: Date) {
  const range = { gte: start, lt: end };
  const [pages, days, sessions, registrations, orders, paid] = await Promise.all([
    prisma.usageEvent.groupBy({ by: ["page"], where: { day: range }, _count: { _all: true }, orderBy: { _count: { page: "desc" } } }),
    prisma.usageEvent.groupBy({ by: ["day"], where: { day: range }, _count: { _all: true }, orderBy: { day: "asc" } }),
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(DISTINCT visitor) AS count FROM "UsageEvent" WHERE day >= ${start} AND day < ${end}`,
    prisma.user.count({ where: { createdAt: range } }),
    prisma.order.groupBy({ by: ["status"], where: { createdAt: range }, _count: { _all: true } }),
    prisma.order.aggregate({ where: { paidAt: range, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } }, _sum: { total: true }, _count: { _all: true } }),
  ]);
  return {
    start: start.toISOString(), end: end.toISOString(), views: pages.reduce((n, row) => n + row._count._all, 0),
    dailySessions: Number(sessions[0]?.count ?? 0), registrations,
    orders: orders.reduce((n, row) => n + row._count._all, 0), paidOrders: paid._count._all, paidAmount: paid._sum.total ?? 0,
    pages: pages.map((r) => ({ page: r.page, views: r._count._all })),
    days: days.map((r) => ({ day: r.day.toISOString().slice(0, 10), views: r._count._all })),
    statuses: orders.map((r) => ({ status: r.status, count: r._count._all })),
  };
}
