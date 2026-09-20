import "server-only";
import type { GameId } from "@/lib/games";
import { usdToClp, toClp } from "@/lib/fx";
import { fetchJson } from "./types";
import { magicCardToResult } from "./magic";
import { pokemonById } from "./pokemon";
import { onePieceByCodes } from "./onepiece";

export interface ExternalPrice {
  usd: number | null;
  usdFoil: number | null;
  clp: number | null;
  clpFoil: number | null;
  source: string;
  usdClp: number;
}

/**
 * Precio de referencia de una carta en el mercado de afuera (TCGplayer, vía el
 * catálogo de cada juego), convertido a pesos. Es solo una referencia para
 * comparar: null si el juego no tiene precios (Mitos y Leyendas) o la API no responde.
 */
export async function externalPrice(game: GameId, externalId: string): Promise<ExternalPrice | null> {
  try {
    let usd: number | null = null;
    let usdFoil: number | null = null;
    let source = "";

    if (game === "magic") {
      const card = await fetchJson<Parameters<typeof magicCardToResult>[0]>(
        `https://api.scryfall.com/cards/${encodeURIComponent(externalId)}`,
        {},
        60 * 60 * 6,
        1
      );
      const r = magicCardToResult(card);
      usd = r.priceUsd ?? null;
      usdFoil = r.priceUsdFoil ?? null;
      source = "TCGplayer vía Scryfall";
    } else if (game === "pokemon") {
      const r = await pokemonById(externalId);
      if (!r) return null;
      usd = r.priceUsd ?? null;
      usdFoil = r.priceUsdFoil ?? null;
      source = r.priceSource ?? "TCGplayer";
    } else if (game === "onepiece") {
      const r = (await onePieceByCodes([externalId])).get(externalId.toLowerCase());
      if (!r) return null;
      usd = r.priceUsd ?? null;
      usdFoil = r.priceUsdFoil ?? null;
      source = r.priceSource ?? "TCGplayer";
    } else {
      return null;
    }

    if (usd == null && usdFoil == null) return null;
    const rate = await usdToClp();
    return {
      usd,
      usdFoil,
      clp: usd != null ? toClp(usd, rate) : null,
      clpFoil: usdFoil != null ? toClp(usdFoil, rate) : null,
      source,
      usdClp: Math.round(rate),
    };
  } catch {
    return null;
  }
}
