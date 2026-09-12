import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ImageOff } from "lucide-react";
import { prisma } from "@/lib/db";
import { clp, timeAgo } from "@/lib/format";
import { gameName, CONDITIONS, LANGUAGES } from "@/lib/games";
import { GameChip } from "@/components/GameChip";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { LISTING_CARD_SELECT, safeQuery } from "@/lib/catalog";
import { AddToCartPanel } from "@/components/cart/AddToCart";
import { effectiveListingPrice } from "@/lib/order-pricing";

export const revalidate = 30;

const TYPE_LABEL: Record<string, string> = {
  SINGLE: "Carta individual",
  SEALED: "Producto sellado",
  DECK: "Mazo armado",
};

async function getListing(slug: string) {
  return safeQuery(
    () =>
      prisma.listing.findUnique({
        where: { slug },
        include: {
          seller: {
            select: { name: true, slug: true, city: true, bio: true, createdAt: true, avatarUrl: true },
          },
          deckCards: { orderBy: { position: "asc" } },
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
  const listing = await getListing(slug);
  if (!listing) return { title: "Publicación no encontrada" };
  return {
    title: listing.title,
    description:
      listing.description ??
      `${listing.title} — ${gameName(listing.game)} en Win Condition TCG por ${clp(listing.price)}.`,
    openGraph: {
      images: listing.imageUrl ? [listing.imageUrl] : undefined,
      title: listing.title,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing || listing.status === "DRAFT") notFound();

  const related = await safeQuery(async () => {
    const baseWhere = { status: "ACTIVE" as const, game: listing.game, id: { not: listing.id }, stock: { gt: 0 } };
    const sameSet = listing.setName
      ? await prisma.listing.findMany({
          where: { ...baseWhere, setName: listing.setName },
          select: LISTING_CARD_SELECT,
          take: 6,
          orderBy: { createdAt: "desc" },
        })
      : [];
    if (sameSet.length >= 6) return sameSet;
    const fallback = await prisma.listing.findMany({
      where: { ...baseWhere, id: { notIn: [listing.id, ...sameSet.map((l) => l.id)] } },
      select: LISTING_CARD_SELECT,
      take: 6 - sameSet.length,
      orderBy: { createdAt: "desc" },
    });
    return [...sameSet, ...fallback];
  }, [] as ListingCardData[]);

  // Otros vendedores que tienen exactamente esta misma carta: por externalId si
  // viene de un proveedor externo, si no por título+edición+juego.
  const sameCardWhere = listing.externalId
    ? { externalId: listing.externalId, game: listing.game, type: listing.type }
    : {
        title: listing.title,
        game: listing.game,
        type: listing.type,
        ...(listing.setName ? { setName: listing.setName } : {}),
      };

  const sameCardListings =
    listing.type === "SINGLE"
      ? await safeQuery(
          () =>
            prisma.listing.findMany({
              where: { ...sameCardWhere, status: "ACTIVE", stock: { gt: 0 } },
              select: {
                id: true,
                slug: true,
                price: true,
                offerPrice: true,
                stock: true,
                condition: true,
                language: true,
                isFoil: true,
                seller: { select: { name: true, slug: true, avatarUrl: true } },
              },
              orderBy: { price: "asc" },
              take: 20,
            }),
          [] as Array<{
            id: string;
            slug: string;
            price: number;
            offerPrice: number | null;
            stock: number;
            condition: string | null;
            language: string | null;
            isFoil: boolean;
            seller: { name: string; slug: string; avatarUrl: string | null };
          }>
        )
      : [];

  const otherSellerListings = sameCardListings.filter((l) => l.id !== listing.id);
  const marketPrices = sameCardListings.map((l) =>
    l.offerPrice != null && l.offerPrice < l.price ? l.offerPrice : l.price
  );
  const priceStats =
    marketPrices.length > 1
      ? {
          min: Math.min(...marketPrices),
          max: Math.max(...marketPrices),
          avg: Math.round(marketPrices.reduce((a, p) => a + p, 0) / marketPrices.length),
          sellers: new Set(sameCardListings.map((l) => l.seller.slug)).size,
        }
      : null;

  const totalCards = listing.deckCards.reduce((a, c) => a + c.quantity, 0);
  const conditionLabel =
    CONDITIONS.find((c) => c.value === listing.condition)?.label ?? listing.condition;
  const languageLabel =
    LANGUAGES.find((l) => l.value === listing.language)?.label ?? listing.language;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-400">
        <Link href="/" className="hover:text-accent-300">
          Inicio
        </Link>
        <span>/</span>
        <Link href="/cartas" className="hover:text-accent-300">
          Catálogo
        </Link>
        <span>/</span>
        <Link href={`/cartas?game=${listing.game}`} className="hover:text-accent-300">
          {gameName(listing.game)}
        </Link>
        <span>/</span>
        <span className="truncate text-ink-300">{listing.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        {/* IMAGEN */}
        <div className="lg:sticky lg:top-40 lg:h-fit">
          <div className="relative aspect-[63/88] overflow-hidden rounded-2xl border border-ink-700 bg-ink-950 tcg-card-shadow">
            {listing.imageUrl ? (
              <Image
                src={listing.imageUrl}
                alt={listing.title}
                fill
                sizes="380px"
                className="object-contain"
                priority
            unoptimized
          />
            ) : (
              <div className="flex h-full items-center justify-center text-ink-700">
                <ImageOff className="h-14 w-14" strokeWidth={1.5} />
              </div>
            )}
            {listing.isFoil && (
              <>
                <span className="foil-shimmer foil-shimmer-auto" aria-hidden="true" />
                <span className="absolute right-3 top-3 rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-2.5 py-1 text-[11px] font-bold uppercase text-paper">
                  Foil
                </span>
              </>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <Spec label="Juego" value={gameName(listing.game)} />
            <Spec label="Tipo" value={TYPE_LABEL[listing.type] ?? listing.type} />
            {listing.setName && (
              <SpecWide label="Edición" value={listing.setName} />
            )}
            {listing.cardNumber && <Spec label="Número" value={listing.cardNumber} />}
            {listing.rarity && <Spec label="Rareza" value={listing.rarity} />}
            {listing.color && <Spec label="Color" value={listing.color} />}
            {listing.family && <SpecWide label="Familia" value={listing.family} />}
            {listing.illustrator && (
              <SpecWide label="Ilustrador" value={listing.illustrator} />
            )}
            {conditionLabel && <Spec label="Estado" value={conditionLabel} />}
            {languageLabel && <Spec label="Idioma" value={languageLabel} />}
            {listing.type === "DECK" && (
              <Spec label="Cartas" value={`${totalCards} unidades`} />
            )}
          </div>
        </div>

        {/* DETALLE */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <GameChip game={listing.game} />
            <span className="rounded-full border border-ink-700 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-300">
              {TYPE_LABEL[listing.type] ?? listing.type}
            </span>
            <span className="text-[11px] text-ink-400">
              Publicado {timeAgo(listing.createdAt)}
            </span>
          </div>

          <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-carbon sm:text-4xl">
            {listing.title}
          </h1>

          <AddToCartPanel
            listingId={listing.id}
            slug={listing.slug}
            title={listing.title}
            price={effectiveListingPrice(listing)}
            originalPrice={listing.offerPrice != null ? listing.price : null}
            imageUrl={listing.imageUrl}
            game={listing.game}
            type={listing.type}
            maxStock={listing.stock}
            sellerId={listing.sellerId}
            sellerName={listing.seller.name}
          />

          {/* VENDEDOR */}
          <Link
            href={`/vendedor/${listing.seller.slug}`}
            className="mt-4 flex items-center gap-3 rounded-xl card-surface p-4 transition hover:border-accent-500/50"
          >
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-display text-lg font-bold text-paper">
              {listing.seller.avatarUrl ? (
                <Image
                  src={listing.seller.avatarUrl}
                  alt={listing.seller.name}
                  fill
                  sizes="44px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                listing.seller.name.charAt(0).toUpperCase()
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink-200">
                {listing.seller.name}
              </span>
              <span className="block text-[11px] text-ink-400">
                Vendedor en Win Condition
                {listing.seller.city ? ` · ${listing.seller.city}` : ""}
              </span>
            </span>
            <span className="text-[12px] font-semibold text-accent-300">Ver perfil →</span>
          </Link>

          {priceStats && (
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl card-surface p-4 text-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Mínimo</p>
                <p className="mt-0.5 text-sm font-bold text-emerald-600">{clp(priceStats.min)}</p>
              </div>
              <div className="border-x border-ink-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Promedio</p>
                <p className="mt-0.5 text-sm font-bold text-ink-200">{clp(priceStats.avg)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Máximo</p>
                <p className="mt-0.5 text-sm font-bold text-ink-200">{clp(priceStats.max)}</p>
              </div>
              <p className="col-span-3 mt-1 text-[11px] text-ink-400">
                Entre {priceStats.sellers} vendedores que tienen esta carta
              </p>
            </div>
          )}

          {otherSellerListings.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-300">
                Otros vendedores con esta carta
              </h2>
              <ul className="divide-y divide-ink-800 overflow-hidden rounded-xl card-surface">
                {otherSellerListings.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 p-3.5">
                    <Link
                      href={`/vendedor/${l.seller.slug}`}
                      className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-paper"
                    >
                      {l.seller.avatarUrl ? (
                        <Image
                          src={l.seller.avatarUrl}
                          alt={l.seller.name}
                          fill
                          sizes="32px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        l.seller.name.charAt(0).toUpperCase()
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/vendedor/${l.seller.slug}`}
                        className="block truncate text-[12px] font-semibold text-ink-200 hover:text-accent-300"
                      >
                        {l.seller.name}
                      </Link>
                      <p className="text-[11px] text-ink-400">
                        {[l.condition, l.language, l.isFoil ? "Foil" : null]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                        {" · "}
                        {l.stock} {l.stock === 1 ? "unidad" : "unidades"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-sm font-bold text-accent-400">
                        {clp(l.offerPrice != null && l.offerPrice < l.price ? l.offerPrice : l.price)}
                      </p>
                      <Link
                        href={`/producto/${l.slug}`}
                        className="text-[11px] font-semibold text-accent-300 hover:text-accent-400"
                      >
                        Ver →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {listing.description && (
            <section className="mt-6">
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-300">
                Descripción
              </h2>
              <p className="whitespace-pre-line rounded-xl card-surface p-4 text-[14px] leading-relaxed text-ink-300">
                {listing.description}
              </p>
            </section>
          )}

          {/* LISTA DEL MAZO */}
          {listing.type === "DECK" && listing.deckCards.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-end justify-between">
                <h2 className="font-display text-xl font-bold text-carbon">
                  Lista del mazo
                </h2>
                <span className="text-[12px] text-ink-400">
                  {listing.deckCards.length} cartas distintas · {totalCards} en total
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
                {listing.deckCards.map((card) => (
                  <div
                    key={card.id}
                    className="group relative overflow-hidden rounded-lg border border-ink-700 bg-ink-950"
                  >
                    <div className="relative aspect-[63/88]">
                      {card.imageUrl ? (
                        <Image
                          src={card.imageUrl}
                          alt={card.name}
                          fill
                          sizes="150px"
                          className="object-cover transition group-hover:scale-105"
            unoptimized
          />
                      ) : (
                        <div className="flex h-full items-center justify-center text-ink-700">
                          <ImageOff className="h-6 w-6" strokeWidth={1.5} />
                        </div>
                      )}
                      {card.quantity > 1 && (
                        <span className="absolute right-1 top-1 rounded-md bg-ink-950/90 px-1.5 py-0.5 text-[10px] font-bold text-accent-300">
                          ×{card.quantity}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 px-1.5 py-1 text-[10px] leading-tight text-ink-300">
                      {card.name}
                    </p>
                  </div>
                ))}
              </div>

              <details className="mt-4 rounded-xl card-surface p-4">
                <summary className="cursor-pointer text-[12px] font-semibold text-ink-300">
                  Ver lista en texto (para copiar)
                </summary>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-950 p-3 text-[12px] leading-relaxed text-ink-300">
                  {listing.deckCards
                    .map((c) => `${c.quantity} ${c.name}`)
                    .join("\n")}
                </pre>
              </details>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 font-display text-2xl font-bold text-carbon">
            También de {gameName(listing.game)}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {related.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-ink-200">
        {value}
      </p>
    </div>
  );
}

/** Igual que Spec, pero ocupa toda la fila — para valores largos (edición, familia, ilustrador). */
function SpecWide({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-2 rounded-lg border border-ink-800 bg-ink-900/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-0.5 text-[12px] font-medium leading-snug text-ink-200">{value}</p>
    </div>
  );
}
