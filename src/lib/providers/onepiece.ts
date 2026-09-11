import { fetchJson, normalize, num, type CardProvider, type CardResult } from "./types";

interface DotggCard {
  id: string;
  name: string;
  rarity?: string;
  cardType?: string;
  Color?: string;
  Type?: string;
  Effect?: string;
  set?: string;
  CardSets?: string;
  language?: string;
  price?: string;
  foilPrice?: string;
  marketIds?: string;
}

let cache: { at: number; cards: DotggCard[] } | null = null;
const TTL = 1000 * 60 * 60 * 12;

async function allCards(): Promise<DotggCard[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.cards;
  const data = await fetchJson<DotggCard[]>(
    "https://api.dotgg.gg/cgfw/getcards?game=onepiece",
    {},
    60 * 60 * 12
  );
  const cards = Array.isArray(data) ? data.filter((c) => c.language !== "jp") : [];
  cache = { at: Date.now(), cards };
  return cards;
}

/**
 * One Piece Card Game — catálogo dotGG (público, sin API key).
 * Incluye el precio de mercado de TCGplayer por carta.
 */
export const onePieceProvider: CardProvider = {
  async search(query, limit) {
    let cards: DotggCard[];
    try {
      cards = await allCards();
    } catch {
      return [];
    }

    const q = normalize(query);
    const seen = new Set<string>();

    const scored = cards
      .map((c) => {
        const name = normalize(c.name ?? "");
        const id = normalize(c.id ?? "");
        let score = -1;
        if (name === q || id === q) score = 0;
        else if (name.startsWith(q) || id.startsWith(q)) score = 1;
        else if (name.includes(q) || id.includes(q)) score = 2;
        return { c, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score || a.c.id.localeCompare(b.c.id));

    const results: CardResult[] = [];
    for (const { c } of scored) {
      if (results.length >= limit) break;
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      results.push({
        externalId: c.id,
        name: c.name,
        imageUrl: `https://static.dotgg.gg/onepiece/card/${c.id}.webp`,
        imageLarge: `https://static.dotgg.gg/onepiece/card/${c.id}.webp`,
        setName: c.CardSets ?? c.set,
        setCode: c.set,
        cardNumber: c.id,
        code: c.id,
        rarity: c.rarity,
        game: "onepiece",
        extra: [c.cardType, c.Color].filter(Boolean).join(" · "),
        color: c.Color,
        family: c.Type,
        description: c.Effect,
        priceUsd: num(c.price),
        priceUsdFoil: num(c.foilPrice),
        priceSource: "TCGplayer vía dotGG",
        tcgplayerId: Number(c.marketIds?.split(",")[0]) || null,
      });
    }
    return results;
  },
};
