import Link from "next/link";
import { CardArtwork } from "@/components/CardArtwork";
import type { ListingCardData } from "@/components/ListingCard";
import { clp } from "@/lib/format";
import { cardHref } from "@/lib/card-url";

/** Abanico de cartas reales en venta, repartidas sobre el tapete al cargar. Solo CSS: no agrega JavaScript al cliente. */
export function HeroHand({ cards }: { cards: ListingCardData[] }) {
  const middle = (cards.length - 1) / 2;
  return <ul className="hero-hand" aria-label="Cartas destacadas a la venta">
    {cards.map((card, index) => {
      const offset = index - middle;
      const href = card.market ? cardHref(card.game, card.market.identity) : card.externalId ? cardHref(card.game, card.externalId) : `/producto/${card.slug}`;
      const price = card.offerPrice != null && card.offerPrice < card.price ? card.offerPrice : card.price;
      return <li key={card.id} style={{ "--o": offset, "--i": index } as React.CSSProperties}>
        <Link href={href} className="hero-hand-card">
          <span className="hero-hand-art"><CardArtwork src={card.imageUrl} alt={card.title} sizes="(max-width:639px) 34vw, 220px" className="object-cover" priority={Math.abs(offset) < 1} /></span>
          <span className="hero-hand-tag"><strong>{card.market ? "Desde " : ""}{clp(price)}</strong><small>{card.title}</small></span>
        </Link>
      </li>;
    })}
  </ul>;
}
