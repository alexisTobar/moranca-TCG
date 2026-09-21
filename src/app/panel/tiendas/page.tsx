import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureAdminPro, ensureDefaultPlans, isStoreActive } from "@/lib/store";
import { StoresAdmin, type AdminPending, type AdminStore, type AdminPlan } from "@/components/store/StoresAdmin";

export const dynamic = "force-dynamic";

export default async function StoresAdminPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/panel");

  await ensureDefaultPlans();
  await ensureAdminPro();

  // Todos los vendedores aparecen en la lista, tengan o no tienda todavía, para poder regalarles un plan.
  const sellers = await prisma.user.findMany({
    where: { role: { in: ["SELLER", "ADMIN"] }, active: true },
    select: { id: true },
  });
  await prisma.store.createMany({ data: sellers.map((s) => ({ sellerId: s.id })), skipDuplicates: true });

  const since = new Date(Date.now() - 30 * 86_400_000);
  const [plans, stores, pendingRows, visits] = await Promise.all([
    prisma.storePlan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.store.findMany({
      where: { seller: { active: true } },
      orderBy: { updatedAt: "desc" },
      include: {
        plan: { select: { code: true, name: true, showcase: true, priceMonthly: true } },
        seller: { select: { name: true, slug: true, email: true, role: true, _count: { select: { listings: { where: { status: "ACTIVE" } } } } } },
      },
    }),
    prisma.storeSubscription.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        plan: { select: { name: true } },
        store: { select: { seller: { select: { name: true, email: true } } } },
      },
    }),
    prisma.storeVisitDay.groupBy({
      by: ["storeId"],
      where: { day: { gte: since } },
      _sum: { views: true },
    }),
  ]);

  const viewsByStore = new Map(visits.map((v) => [v.storeId, v._sum.views ?? 0]));

  const adminStores: AdminStore[] = stores.map((s) => ({
    id: s.id,
    sellerName: s.seller.name,
    email: s.seller.email,
    slug: s.seller.slug,
    planCode: s.plan?.code ?? null,
    planName: s.plan?.name ?? null,
    planShowcase: s.plan?.showcase ?? false,
    activeUntil: s.activeUntil?.toISOString() ?? null,
    status: s.status,
    active: isStoreActive(s),
    featured: s.featured,
    isAdminAccount: s.seller.role === "ADMIN",
    views30: viewsByStore.get(s.id) ?? 0,
    listings: s.seller._count.listings,
  }));

  const pending: AdminPending[] = pendingRows.map((p) => ({
    id: p.id,
    sellerName: p.store.seller.name,
    email: p.store.seller.email,
    planName: p.plan.name,
    months: p.months,
    amount: p.amount,
    reference: p.reference,
    hasReceipt: Boolean(p.receiptUploadedAt),
    createdAt: p.createdAt.toISOString(),
  }));

  const adminPlans: AdminPlan[] = plans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description ?? "",
    priceMonthly: p.priceMonthly,
    maxFeatured: p.maxFeatured,
    advancedStats: p.advancedStats,
    showcase: p.showcase,
    active: p.active,
  }));

  const monthlyIncome = stores
    .filter((s) => isStoreActive(s) && s.seller.role !== "ADMIN")
    .reduce((sum, s) => sum + (s.plan?.priceMonthly ?? 0), 0);

  return (
    <div className="max-w-5xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Tiendas premium</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Aquí controlas todo: apruebas pagos, activas o suspendes tiendas, eliges cuáles se destacan y
          defines los planes y sus precios. Cada vendedor personaliza su propia tienda desde su panel.
        </p>
      </header>
      <StoresAdmin
        pending={pending}
        stores={adminStores}
        plans={adminPlans}
        monthlyIncome={monthlyIncome}
      />
    </div>
  );
}
