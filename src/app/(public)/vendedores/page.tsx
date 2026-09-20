import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { MapPin, Star, Store, Truck } from "lucide-react";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/catalog";
import { formatSales, getSellerStats } from "@/lib/seller-stats";
import { REGION_COOKIE, isValidRegion, sellerRegion } from "@/lib/location";
import { LocationPicker } from "@/components/LocationPicker";

export const metadata: Metadata = {
  title: "Vendedores",
  description: "Tiendas y coleccionistas que publican en Win Condition TCG.",
};

// Depende de la ubicación del visitante (cookie), así que no se puede cachear.
export const dynamic = "force-dynamic";

export default async function SellersPage() {
  const sellers = await safeQuery(
    () =>
      prisma.user.findMany({
        where: { active: true, role: { in: ["SELLER", "ADMIN"] } },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          region: true,
          bio: true,
          role: true,
          avatarUrl: true,
          offersShipping: true,
          offersPickup: true,
          _count: { select: { listings: { where: { status: "ACTIVE" } } } },
        },
        orderBy: { createdAt: "asc" },
      }),
    [] as Array<{
      id: string;
      name: string;
      slug: string;
      city: string | null;
      region: string | null;
      bio: string | null;
      role: string;
      avatarUrl: string | null;
      offersShipping: boolean;
      offersPickup: boolean;
      _count: { listings: number };
    }>
  );

  const [stats, cookieStore] = await Promise.all([getSellerStats(sellers.map((s) => s.id)), cookies()]);
  const regionCookie = cookieStore.get(REGION_COOKIE)?.value;
  const buyerRegion = isValidRegion(regionCookie) ? regionCookie : null;

  const enriched = sellers
    .map((s) => {
      const st = stats.get(s.id) ?? { sales: 0, rating: 0, reviews: 0 };
      const region = sellerRegion(s);
      return { ...s, st, region, near: Boolean(buyerRegion && region === buyerRegion) };
    })
    // Primero los de tu región, después los que más venden.
    .sort((a, b) => Number(b.near) - Number(a.near) || b.st.sales - a.st.sales || b.st.reviews - a.st.reviews);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-carbon">Vendedores</h1>
          <p className="mt-1 text-[13px] text-ink-400">
            Perfiles habilitados para publicar en Win Condition TCG.
          </p>
        </div>
        <LocationPicker region={buyerRegion} />
      </div>

      {enriched.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-ink-700 p-12 text-center text-sm text-ink-400">
          Todavía no hay vendedores registrados.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enriched.map((s) => {
            const salesLabel = formatSales(s.st.sales);
            return (
              <Link
                key={s.id}
                href={`/vendedor/${s.slug}`}
                className="group lift rounded-2xl card-surface p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-carbon font-display text-xl font-bold text-paper">
                    {s.avatarUrl ? (
                      <Image src={s.avatarUrl} alt={s.name} fill sizes="48px" className="object-cover" unoptimized />
                    ) : (
                      s.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-200">{s.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                      {s.st.reviews > 0 && (
                        <span className="inline-flex items-center gap-0.5 font-bold text-amber-500">
                          <Star className="h-3 w-3 fill-current" strokeWidth={0} />
                          {s.st.rating.toFixed(1)}
                          <span className="font-normal text-ink-400">({s.st.reviews})</span>
                        </span>
                      )}
                      {salesLabel && <span className="font-semibold text-ink-400">{salesLabel}</span>}
                      {!salesLabel && s.st.reviews === 0 && (
                        <span className="text-ink-400">Vendedor nuevo</span>
                      )}
                    </div>
                  </div>
                  {s.role === "ADMIN" && (
                    <span className="rounded-full border border-carbon bg-carbon px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-paper">
                      Oficial
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-ink-400">
                  {(s.city || s.region) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" strokeWidth={2} />
                      {s.city ?? s.region}
                    </span>
                  )}
                  {s.near && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Cerca mío
                    </span>
                  )}
                  <span>{s._count.listings} publicaciones</span>
                  {s.offersShipping && (
                    <span className="inline-flex items-center gap-1">
                      <Truck className="h-3 w-3" strokeWidth={2} /> Envío
                    </span>
                  )}
                  {s.offersPickup && (
                    <span className="inline-flex items-center gap-1">
                      <Store className="h-3 w-3" strokeWidth={2} /> Retiro
                    </span>
                  )}
                </div>

                {s.bio && (
                  <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-ink-400">{s.bio}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
