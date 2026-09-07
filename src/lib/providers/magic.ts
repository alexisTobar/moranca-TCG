import { fetchJson, num, type CardProvider, type CardResult } from "./types";

interface ScryfallCard {
  id: string;
  name: string;
  set_name?: string;
  set?: string;
  collector_number?: string;
  rarity?: string;
  type_line?: string;
  image_uris?: { normal?: string; large?: string; small?: string; png?: string };
  card_faces?: Array<{
    image_uris?: { normal?: string; large?: string; png?: string };
  }>;
  tcgplayer_id?: number;
  prices?: { usd?: string | null; usd_foil?: string | null };
}

interface ScryfallList {
  data?: ScryfallCard[];
  has_more?: boolean;
  next_page?: string;
}

/**
 * Magic: The Gathering — Scryfall (pública, sin API key).
 * Devuelve todas las impresiones de la carta con su set, número y el precio
 * referencial de TCGplayer que Scryfall redistribuye.
 */
export const magicProvider: CardProvider = {
  async search(query, limit) {
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
      query
    )}&unique=prints&order=released&dir=desc`;

    const cards: ScryfallCard[] = [];
    let next: string | null = url;

    // Scryfall pagina de 175 en 175; traemos lo necesario para el límite pedido.
    while (next && cards.length < limit) {
      let page: ScryfallList;
      try {
        page = await fetchJson<ScryfallList>(next);
      } catch {
        break;
      }
      cards.push(...(page.data ?? []));
      next = page.has_more && page.next_page ? page.next_page : null;
    }

    return cards
      .slice(0, limit)
      .map<CardResult>((c) => {
        const uris = c.image_uris ?? c.card_faces?.[0]?.image_uris ?? {};
        const setCode = c.set?.toUpperCase();
        return {
          externalId: c.id,
          name: c.name,
          imageUrl: uris.normal ?? uris.large ?? uris.png ?? "",
          imageLarge: uris.large ?? uris.png ?? uris.normal,
          setName: c.set_name,
          setCode,
          cardNumber: c.collector_number,
          code:
            setCode && c.collector_number
              ? `${setCode} ${c.collector_number}`
              : (setCode ?? c.collector_number),
          rarity: c.rarity,
          game: "magic",
          extra: c.type_line,
          priceUsd: num(c.prices?.usd),
          priceUsdFoil: num(c.prices?.usd_foil),
          priceSource: "TCGplayer vía Scryfall",
          tcgplayerId: c.tcgplayer_id ?? null,
        };
      })
      .filter((c) => c.imageUrl);
  },
};
