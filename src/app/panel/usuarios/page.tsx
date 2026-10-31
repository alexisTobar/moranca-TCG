import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { safeQuery } from "@/lib/catalog";
import { clp } from "@/lib/format";
import { UsersManager, type ManagedUser, type SellerStats } from "@/components/UsersManager";
import { SellerRequestsPanel, type SellerRequestRow } from "@/components/SellerRequestsPanel";
import { StatTile } from "@/components/charts/Charts";
import { PageHeader } from "@/components/panel/PageKit";

export const dynamic = "force-dynamic";

interface SalesRow { sellerId: string; sales30: number; orders30: number; salesTotal: number; lastSaleAt: Date | null }

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/panel");
  const since = new Date(Date.now() - 30 * 86_400_000);

  const [users, requests, sales, active, ratings] = await Promise.all([
    safeQuery(
      () =>
        prisma.user.findMany({
          where: { role: { in: ["ADMIN", "SELLER"] } },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            email: true,
            slug: true,
            role: true,
            active: true,
            city: true,
            phone: true,
            bio: true,
            createdAt: true,
            _count: { select: { listings: true } },
          },
        }),
      [] as ManagedUser[]
    ),
    safeQuery(
      () =>
        prisma.user.findMany({
          where: { sellerRequestStatus: "PENDING" },
          orderBy: { sellerRequestAt: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            sellerRequestMessage: true,
            sellerRequestAt: true,
          },
        }),
      [] as SellerRequestRow[]
    ),
    // Ventas con pago confirmado por vendedor: últimos 30 días, histórico y fecha de la última.
    safeQuery(() => prisma.$queryRaw<SalesRow[]>`
      SELECT "sellerId",
        COALESCE(SUM(total) FILTER (WHERE "paidAt" >= ${since}), 0)::int AS "sales30",
        COUNT(*) FILTER (WHERE "paidAt" >= ${since})::int AS "orders30",
        COALESCE(SUM(total), 0)::int AS "salesTotal",
        MAX("paidAt") AS "lastSaleAt"
      FROM "Order" WHERE status IN ('PAID','SHIPPED','DELIVERED') AND "sellerId" IS NOT NULL
      GROUP BY "sellerId"`, [] as SalesRow[]),
    safeQuery(() => prisma.listing.groupBy({ by: ["sellerId"], where: { status: "ACTIVE" }, _count: { _all: true } }), [] as Array<{ sellerId: string; _count: { _all: number } }>),
    safeQuery(() => prisma.review.groupBy({ by: ["sellerId"], _avg: { rating: true }, _count: { _all: true } }), [] as Array<{ sellerId: string; _avg: { rating: number | null }; _count: { _all: number } }>),
  ]);

  const statsOf = (id: string): SellerStats => {
    const s = sales.find((r) => r.sellerId === id);
    const r = ratings.find((x) => x.sellerId === id);
    return {
      activeListings: active.find((a) => a.sellerId === id)?._count._all ?? 0,
      sales30: s?.sales30 ?? 0, orders30: s?.orders30 ?? 0, salesTotal: s?.salesTotal ?? 0,
      rating: r?._avg.rating ?? null, reviews: r?._count._all ?? 0,
      lastSaleAt: s?.lastSaleAt ? new Date(s.lastSaleAt).toISOString() : null,
    };
  };
  const sellers = users.filter((u) => u.active);
  const selling = sellers.filter((u) => (sales.find((s) => s.sellerId === u.id)?.orders30 ?? 0) > 0).length;
  const withStock = sellers.filter((u) => active.some((a) => a.sellerId === u.id)).length;
  const sales30 = sales.reduce((n, s) => n + s.sales30, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Solo administración"
        title="Vendedores"
        description="Rendimiento de cada vendedor, solicitudes de compradores que quieren vender y creación manual de cuentas."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Vendedores activos" value={String(sellers.length)} hint={`${users.length - sellers.length} desactivados`} />
        <StatTile label="Con stock publicado" value={String(withStock)} hint={`${sellers.length - withStock} sin publicaciones activas`} />
        <StatTile label="Vendieron en 30 días" value={String(selling)} hint={sellers.length ? `${Math.round((100 * selling) / sellers.length)}% de los activos` : undefined} />
        <StatTile label="Ventas en 30 días" value={clp(sales30)} hint={`${requests.length} solicitudes pendientes`} />
      </div>

      <SellerRequestsPanel requests={requests} />

      <UsersManager
        users={users.map((u) => ({ ...u, createdAt: u.createdAt, stats: statsOf(u.id) }))}
        currentUserId={user.id}
      />
    </div>
  );
}
