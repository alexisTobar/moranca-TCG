import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { clp } from "@/lib/format";
import { GameChip } from "./GameChip";
import { AddToCartMini } from "./cart/AddToCart";

export interface ListingCardData {
  id: string;
  slug: string;
  title: string;
  game: string;
  type: string;
  price: number;
  offerPrice: number | null;
  imageUrl: string | null;
  condition: string | null;
  language: string | null;
  isFoil: boolean;
  stock: number;
  setName: string | null;
  sellerId: string;
  seller: { name: string; slug: string };
  _count?: { deckCards: number };
}

const TYPE_LABEL: Record<string, string> = {
  SINGLE: "Single",
  SEALED: "Sellado",
  DECK: "Mazo",
};

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const isDeck = listing.type === "DECK";
  const hasOffer = listing.offerPrice != null && listing.offerPrice < listing.price;
  const effectivePrice = hasOffer ? listing.offerPrice! : listing.price;

  return (
    <div className="group lift flex flex-col overflow-hidden rounded-2xl card-surface">
      <Link href={`/producto/${listing.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[63/88] overflow-hidden bg-gradient-to-b from-ink-900 to-ink-850">
          {listing.imageUrl ? (
            <Image
              src={listing.imageUrl}
              alt={listing.title}
              fill
              sizes="(max-width:640px) 45vw, (max-width:1024px) 22vw, 200px"
              className="object-cover transition duration-500 group-hover:scale-[1.06]"
            unoptimized
          />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-600">
              <ImageOff className="h-9 w-9" strokeWidth={1.5} />
            </div>
          )}

          {listing.isFoil && <span className="foil-shimmer" aria-hidden="true" />}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
            <span className="rounded-full bg-carbon/75 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
              {TYPE_LABEL[listing.type] ?? listing.type}
            </span>
            {listing.isFoil && (
              <span className="rounded-full bg-gradient-to-r from-gold-300 to-gold-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#2a1d00] shadow">
                Foil
              </span>
            )}
          </div>

          {isDeck && listing._count && (
            <span className="absolute bottom-2 left-2 rounded-full bg-carbon/75 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
              {listing._count.deckCards} cartas
            </span>
          )}

          {listing.stock <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-sm font-bold uppercase tracking-widest text-ink-300 backdrop-blur-[2px]">
              Vendido
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3 pb-2">
          <GameChip game={listing.game} />
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink-200 transition group-hover:text-brand-600">
            {listing.title}
          </h3>
          <p className="line-clamp-1 text-[11px] text-ink-400">
            {listing.setName ?? "—"}
            {listing.condition ? ` · ${listing.condition}` : ""}
            {listing.language ? ` · ${listing.language}` : ""}
          </p>
          <div className="mt-auto pt-2">
            <span className="flex items-baseline gap-1.5">
              {hasOffer && (
                <span className="text-[11px] font-medium text-ink-500 line-through">
                  {clp(listing.price)}
                </span>
              )}
              <span className="font-display text-[17px] font-bold tracking-tight text-carbon">
                {clp(effectivePrice)}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-ink-400">
              {listing.seller.name}
            </span>
          </div>
        </div>
      </Link>

      <div className="px-3 pb-3">
        <AddToCartMini
          listingId={listing.id}
          slug={listing.slug}
          title={listing.title}
          price={effectivePrice}
          originalPrice={hasOffer ? listing.price : null}
          imageUrl={listing.imageUrl}
          game={listing.game}
          type={listing.type}
          maxStock={listing.stock}
          sellerId={listing.sellerId}
          sellerName={listing.seller.name}
        />
      </div>
    </div>
  );
}
