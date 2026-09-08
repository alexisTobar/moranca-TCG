import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { safeQuery } from "@/lib/catalog";
import { UsersManager, type ManagedUser } from "@/components/UsersManager";
import { SellerRequestsPanel, type SellerRequestRow } from "@/components/SellerRequestsPanel";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/panel");

  const [users, requests] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Vendedores</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Crea cuentas de vendedor a mano, o aprueba las solicitudes de los
          compradores que quieren empezar a vender.
        </p>
      </header>

      <SellerRequestsPanel requests={requests} />

      <UsersManager
        users={users.map((u) => ({ ...u, createdAt: u.createdAt }))}
        currentUserId={user.id}
      />
    </div>
  );
}
