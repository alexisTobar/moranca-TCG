import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { clp, timeAgo } from "@/lib/format";
import { gameName, CONDITIONS, LANGUAGES } from "@/lib/games";
import { GameChip } from "@/components/GameChip";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { LISTING_CARD_SELECT, safeQuery } from "@/lib/catalog";
import { AddToCartPanel } from "@/components/cart/AddToCart";

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
            select: { name: true, slug: true, city: true, bio: true, createdAt: true },
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
      `${listing.title} — ${gameName(listing.game)} en Comarca TCG por ${clp(listing.price)}.`,
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

  const related = await safeQuery(
    () =>
      prisma.listing.findMany({
        where: {
          status: "ACTIVE",
          game: listing.game,
          id: { not: listing.id },
          stock: { gt: 0 },
        },
        select: LISTING_CARD_SELECT,
        take: 6,
        orderBy: { createdAt: "desc" },
      }),
    [] as ListingCardData[]
  );

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
              <div className="flex h-full items-center justify-center text-6xl text-ink-700">
                🂠
              </div>
            )}
            {listing.isFoil && (
              <span className="absolute right-3 top-3 rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-2.5 py-1 text-[11px] font-bold uppercase text-paper">
                Foil
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <Spec label="Juego" value={gameName(listing.game)} />
            <Spec label="Tipo" value={TYPE_LABEL[listing.type] ?? listing.type} />
            {listing.setName && <Spec label="Edición" value={listing.setName} />}
            {listing.cardNumber && <Spec label="Número" value={listing.cardNumber} />}
            {listing.rarity && <Spec label="Rareza" value={listing.rarity} />}
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
            price={listing.price}
            imageUrl={listing.imageUrl}
            game={listing.game}
            type={listing.type}
            maxStock={listing.stock}
            sellerName={listing.seller.name}
          />

          {/* VENDEDOR */}
          <Link
            href={`/vendedor/${listing.seller.slug}`}
            className="mt-4 flex items-center gap-3 rounded-xl card-surface p-4 transition hover:border-accent-500/50"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-display text-lg font-bold text-paper">
              {listing.seller.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink-200">
                {listing.seller.name}
              </span>
              <span className="block text-[11px] text-ink-400">
                Vendedor en Comarca
                {listing.seller.city ? ` · ${listing.seller.city}` : ""}
              </span>
            </span>
            <span className="text-[12px] font-semibold text-accent-300">Ver perfil →</span>
          </Link>

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
                        <div className="flex h-full items-center justify-center text-2xl text-ink-700">
                          🂠
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
      <p className="mt-0.5 truncate text-[12px] font-medium text-ink-200">{value}</p>
    </div>
  );
}
