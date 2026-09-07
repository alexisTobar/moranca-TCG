import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { safeQuery } from "@/lib/catalog";
import { UsersManager, type ManagedUser } from "@/components/UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/panel");

  const users = await safeQuery(
    () =>
      prisma.user.findMany({
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
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Perfiles</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Crea cuentas para que otras personas publiquen y vendan en Comarca TCG.
        </p>
      </header>

      <UsersManager
        users={users.map((u) => ({ ...u, createdAt: u.createdAt }))}
        currentUserId={user.id}
      />
    </div>
  );
}
