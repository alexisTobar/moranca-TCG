import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { safeQuery } from "@/lib/catalog";
import { BulkImportForm, type SellerOption } from "@/components/BulkImportForm";

export const dynamic = "force-dynamic";

export default async function BulkPublishPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const isAdmin = user.role === "ADMIN";

  const sellers = isAdmin
    ? await safeQuery(
        () =>
          prisma.user.findMany({
            where: { active: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          }),
        [] as SellerOption[]
      )
    : [{ id: user.id, name: user.name }];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">
          Carga masiva · Magic
        </h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Sube tu lista de colección en .txt y publica muchas cartas de una vez,
          cada una con su stock y precio.
        </p>
      </header>

      <BulkImportForm sellers={sellers} isAdmin={isAdmin} currentUserId={user.id} />
    </div>
  );
}
