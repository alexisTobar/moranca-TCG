import type { GameId } from "@/lib/games";
import { magicProvider } from "./magic";
import { pokemonProvider } from "./pokemon";
import { onePieceProvider } from "./onepiece";
import { mylProvider } from "./myl";
import { enrichWithTcgplayer } from "./tcgplayer";
import type { CardProvider, CardResult } from "./types";

const providers: Record<GameId, CardProvider> = {
  magic: magicProvider,
  pokemon: pokemonProvider,
  onepiece: onePieceProvider,
  myl: mylProvider,
};

export async function searchCards(
  game: GameId,
  query: string,
  limit = 24
): Promise<CardResult[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  const results = await providers[game].search(term, limit);
  // Si hay llaves de TCGplayer, sus precios oficiales reemplazan a los redistribuidos.
  return enrichWithTcgplayer(results);
}

export type { CardResult };
