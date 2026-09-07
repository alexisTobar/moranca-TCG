import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { safeQuery, LISTING_CARD_SELECT } from "@/lib/catalog";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";

export const revalidate = 30;

async function getSeller(slug: string) {
  return safeQuery(
    () =>
      prisma.user.findFirst({
        where: { slug, active: true },
        select: {
          id: true,
          name: true,
          slug: true,
          bio: true,
          city: true,
          role: true,
          createdAt: true,
        },
      }),
    null
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const seller = await getSeller(slug);
  return {
    title: seller ? seller.name : "Vendedor",
    description: seller?.bio ?? `Publicaciones de ${seller?.name ?? ""} en Comarca TCG.`,
  };
}

export default async function SellerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const seller = await getSeller(slug);
  if (!seller) notFound();

  const listings = await safeQuery(
    () =>
      prisma.listing.findMany({
        where: { sellerId: seller.id, status: "ACTIVE" },
        select: LISTING_CARD_SELECT,
        orderBy: { createdAt: "desc" },
      }),
    [] as ListingCardData[]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="mb-6 text-[12px] text-ink-400">
        <Link href="/vendedores" className="hover:text-accent-300">
          Vendedores
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-300">{seller.name}</span>
      </nav>

      <header className="flex flex-wrap items-center gap-5 rounded-2xl card-surface p-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-display text-2xl font-bold text-paper">
          {seller.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-carbon">{seller.name}</h1>
            {seller.role === "ADMIN" && (
              <span className="rounded-full border border-accent-500/40 bg-accent-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-300">
                Oficial
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-ink-400">
            {listings.length} publicaciones activas
            {seller.city ? ` · ${seller.city}` : ""} · Miembro desde{" "}
            {seller.createdAt.toLocaleDateString("es-CL", {
              month: "long",
              year: "numeric",
            })}
          </p>
          {seller.bio && (
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-300">
              {seller.bio}
            </p>
          )}
        </div>
      </header>

      {listings.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-ink-700 p-12 text-center text-sm text-ink-400">
          Este vendedor aún no tiene publicaciones activas.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
