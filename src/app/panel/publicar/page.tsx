import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { safeQuery } from "@/lib/catalog";
import { ListingForm, type SellerOption } from "@/components/ListingForm";

export const dynamic = "force-dynamic";

export default async function PublishPage() {
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
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-carbon">
            Nueva publicación
          </h1>
          <p className="mt-1 text-[13px] text-ink-400">
            Busca la carta por nombre y la imagen se trae sola desde el catálogo oficial.
            El precio lo pones tú.
          </p>
        </div>
        <Link
          href="/panel/publicar/masivo"
          className="rounded-lg border border-ink-700 px-3.5 py-2 text-[12px] font-semibold text-ink-200 transition hover:border-accent-500/70"
        >
          ¿Muchas cartas de Magic? Carga masiva desde .txt →
        </Link>
      </header>

      <ListingForm sellers={sellers} isAdmin={isAdmin} currentUserId={user.id} />
    </div>
  );
}
