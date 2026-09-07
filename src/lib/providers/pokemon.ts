import { fetchJson, num, type CardProvider, type CardResult } from "./types";

interface TcgPlayerPrice {
  low?: number | null;
  mid?: number | null;
  market?: number | null;
  high?: number | null;
}

interface PokeCard {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  supertype?: string;
  images?: { small?: string; large?: string };
  set?: { name?: string; ptcgoCode?: string; id?: string; printedTotal?: number };
  tcgplayer?: { prices?: Record<string, TcgPlayerPrice> };
}

interface TcgdexCard {
  id: string;
  name: string;
  image?: string;
  localId?: string;
}

/** Orden de preferencia al elegir qué variante muestra el precio referencial. */
const NORMAL_KEYS = ["normal", "1stEdition", "unlimited"];
const FOIL_KEYS = [
  "holofoil",
  "reverseHolofoil",
  "1stEditionHolofoil",
  "unlimitedHolofoil",
];

function pick(
  prices: Record<string, TcgPlayerPrice> | undefined,
  keys: string[]
): number | null {
  if (!prices) return null;
  for (const key of keys) {
    const value = prices[key]?.market ?? prices[key]?.mid ?? prices[key]?.low;
    const n = num(value);
    if (n) return n;
  }
  return null;
}

/**
 * Pokémon TCG — pokemontcg.io (incluye precios de TCGplayer) con respaldo
 * en TCGdex cuando la API principal no responde.
 */
export const pokemonProvider: CardProvider = {
  async search(query, limit) {
    const headers: Record<string, string> = {};
    if (process.env.POKEMONTCG_API_KEY) {
      headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;
    }
    const safe = query.replace(/["\\]/g, "");

    try {
      const json = await fetchJson<{ data?: PokeCard[] }>(
        `https://api.pokemontcg.io/v2/cards?q=name:"*${encodeURIComponent(
          safe
        )}*"&pageSize=${Math.min(250, limit)}&orderBy=-set.releaseDate`,
        { headers },
        60 * 60 * 24,
        3
      );

      const cards = (json.data ?? [])
        .map<CardResult>((c) => {
          const setCode = c.set?.ptcgoCode ?? c.set?.id?.toUpperCase();
          const total = c.set?.printedTotal;
          return {
            externalId: c.id,
            name: c.name,
            imageUrl: c.images?.small ?? c.images?.large ?? "",
            imageLarge: c.images?.large ?? c.images?.small,
            setName: c.set?.name,
            setCode,
            cardNumber: c.number,
            code: c.number
              ? `${setCode ? `${setCode} ` : ""}${c.number}${total ? `/${total}` : ""}`
              : setCode,
            rarity: c.rarity,
            game: "pokemon",
            extra: c.supertype,
            priceUsd: pick(c.tcgplayer?.prices, NORMAL_KEYS),
            priceUsdFoil: pick(c.tcgplayer?.prices, FOIL_KEYS),
            priceSource: "TCGplayer vía pokemontcg.io",
          };
        })
        .filter((c) => c.imageUrl);

      if (cards.length) return cards;
    } catch {
      /* cae al respaldo */
    }

    try {
      const json = await fetchJson<TcgdexCard[]>(
        `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(safe)}`
      );
      return json
        .filter((c) => c.image)
        .slice(0, limit)
        .map<CardResult>((c) => ({
          externalId: c.id,
          name: c.name,
          imageUrl: `${c.image}/low.webp`,
          imageLarge: `${c.image}/high.webp`,
          cardNumber: c.localId,
          code: c.id.toUpperCase(),
          game: "pokemon",
        }));
    } catch {
      return [];
    }
  },
};
