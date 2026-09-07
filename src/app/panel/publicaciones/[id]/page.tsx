import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { safeQuery } from "@/lib/catalog";
import {
  ListingForm,
  type ListingFormValues,
  type SellerOption,
} from "@/components/ListingForm";
import type { GameId } from "@/lib/games";

export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;
  const isAdmin = user.role === "ADMIN";

  const listing = await safeQuery(
    () =>
      prisma.listing.findUnique({
        where: { id },
        include: { deckCards: { orderBy: { position: "asc" } } },
      }),
    null
  );

  if (!listing) notFound();
  if (!isAdmin && listing.sellerId !== user.id) notFound();

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

  const initial: Partial<ListingFormValues> = {
    id: listing.id,
    type: listing.type,
    status: listing.status,
    game: listing.game as GameId,
    title: listing.title,
    imageUrl: listing.imageUrl,
    price: listing.price,
    stock: listing.stock,
    condition: listing.condition,
    language: listing.language,
    isFoil: listing.isFoil,
    description: listing.description,
    setName: listing.setName,
    cardNumber: listing.cardNumber,
    rarity: listing.rarity,
    externalId: listing.externalId,
    featured: listing.featured,
    sellerId: listing.sellerId,
    deckCards: listing.deckCards.map((c) => ({
      externalId: c.externalId,
      name: c.name,
      imageUrl: c.imageUrl,
      quantity: c.quantity,
      setName: c.setName,
      cardNumber: c.cardNumber,
    })),
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav className="text-[12px] text-ink-400">
            <Link href="/panel/publicaciones" className="hover:text-accent-300">
              Publicaciones
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink-300">Editar</span>
          </nav>
          <h1 className="mt-1 font-display text-3xl font-bold text-carbon">
            {listing.title}
          </h1>
        </div>
        <Link
          href={`/producto/${listing.slug}`}
          className="rounded-lg border border-ink-700 px-4 py-2 text-[12px] font-semibold text-ink-300 transition hover:text-accent-300"
        >
          Ver en la tienda ↗
        </Link>
      </header>

      <ListingForm
        initial={initial}
        sellers={sellers}
        isAdmin={isAdmin}
        currentUserId={user.id}
      />
    </div>
  );
}
