import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Vendedores",
  description: "Tiendas y coleccionistas que publican en Win Condition TCG.",
};

export const revalidate = 60;

export default async function SellersPage() {
  const sellers = await safeQuery(
    () =>
      prisma.user.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          bio: true,
          role: true,
          avatarUrl: true,
          _count: { select: { listings: true } },
          receivedReviews: { select: { rating: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    [] as Array<{
      id: string;
      name: string;
      slug: string;
      city: string | null;
      bio: string | null;
      role: string;
      avatarUrl: string | null;
      _count: { listings: number };
      receivedReviews: Array<{ rating: number }>;
    }>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-carbon">Vendedores</h1>
      <p className="mt-1 text-[13px] text-ink-400">
        Perfiles habilitados para publicar en Win Condition TCG.
      </p>

      {sellers.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-ink-700 p-12 text-center text-sm text-ink-400">
          Todavía no hay vendedores registrados.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sellers.map((s) => {
            const reviewCount = s.receivedReviews.length;
            const avgRating =
              reviewCount > 0
                ? s.receivedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
                : 0;
            return (
              <Link
                key={s.id}
                href={`/vendedor/${s.slug}`}
                className="rounded-2xl card-surface p-5 transition hover:-translate-y-1 hover:border-carbon"
              >
                <div className="flex items-center gap-3">
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-carbon font-display text-xl font-bold text-paper">
                    {s.avatarUrl ? (
                      <Image src={s.avatarUrl} alt={s.name} fill sizes="48px" className="object-cover" unoptimized />
                    ) : (
                      s.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-200">{s.name}</p>
                    <p className="text-[11px] text-ink-400">
                      {s._count.listings} publicaciones
                      {s.city ? ` · ${s.city}` : ""}
                    </p>
                    {reviewCount > 0 && (
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                        <Star className="h-3 w-3 fill-current" strokeWidth={0} />
                        {avgRating.toFixed(1)}
                        <span className="font-normal text-ink-400">
                          ({reviewCount})
                        </span>
                      </span>
                    )}
                  </div>
                  {s.role === "ADMIN" && (
                    <span className="ml-auto rounded-full border border-carbon bg-carbon px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-paper">
                      Oficial
                    </span>
                  )}
                </div>
                {s.bio && (
                  <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-ink-400">
                    {s.bio}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
