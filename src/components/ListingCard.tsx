import Link from "next/link";
import { clp } from "@/lib/format";
import { GAMES, isGameId } from "@/lib/games";
import { AddToCartMini } from "./cart/AddToCart";
import { CardArtwork } from "./CardArtwork";

export interface ListingCardData {
  id: string; slug: string; title: string; game: string; type: string;
  price: number; offerPrice: number | null; imageUrl: string | null;
  condition: string | null; language: string | null; isFoil: boolean;
  stock: number; setName: string | null; sellerId: string;
  seller: { name: string; slug: string }; _count?: { deckCards: number };
}
const TYPE_LABEL: Record<string, string> = { SINGLE: "Single", SEALED: "Sellado", DECK: "Mazo" };

export function ListingCard({ listing, href }: { listing: ListingCardData; href?: string }) {
  const hasOffer = listing.offerPrice != null && listing.offerPrice < listing.price;
  const price = hasOffer ? listing.offerPrice! : listing.price;
  return <article className="listing-sheet">
    <Link href={href ?? `/producto/${listing.slug}`} className="listing-art" aria-label={`Ver ${listing.title}`}>
      <CardArtwork src={listing.imageUrl} alt={listing.title} sizes="(max-width:639px) 45vw, (max-width:1023px) 30vw, 230px" className="object-contain" />
      {listing.stock <= 0 && <span className="listing-sold">Vendido</span>}
    </Link>
    <div className="listing-copy">
      <p className="listing-game">{isGameId(listing.game) ? GAMES[listing.game].short : listing.game} · {TYPE_LABEL[listing.type] || listing.type}{listing.isFoil ? " · Foil" : ""}</p>
      <h3><Link href={href ?? `/producto/${listing.slug}`}>{listing.title}</Link></h3>
      <p className="listing-set" title={listing.setName || undefined}>{listing.setName || "Edición no informada"}</p>
      <dl className="listing-specs"><div><dt>Estado</dt><dd>{listing.condition || "—"}</dd></div><div><dt>Idioma</dt><dd>{listing.language || "—"}</dd></div><div><dt>Stock</dt><dd>{Math.max(0, listing.stock)}</dd></div></dl>
      <p className="listing-price">{hasOffer && <del>{clp(listing.price)}</del>}<strong>{clp(price)}</strong></p>
      <p className="listing-seller">{listing.seller.name}</p>
    </div>
    <AddToCartMini listingId={listing.id} slug={listing.slug} title={listing.title} price={price} originalPrice={hasOffer ? listing.price : null} imageUrl={listing.imageUrl} game={listing.game} type={listing.type} maxStock={listing.stock} sellerId={listing.sellerId} sellerName={listing.seller.name} />
  </article>;
}
