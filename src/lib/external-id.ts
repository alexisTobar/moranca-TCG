import type { GameId } from "@/lib/games";

/**
 * Los distintos catálogos nombran igual una misma carta de Pokémon de formas
 * diferentes (pokemontcg.io: "sv3pt5-57"; TCGdex: "sv03.5-057"). Se guarda
 * siempre la forma de pokemontcg.io, así las publicaciones de una misma carta
 * quedan juntas en su página aunque vengan de fuentes distintas.
 */
export function normalizeExternalId(game: GameId | string, id: string | null | undefined): string | null {
  if (!id) return null;
  if (game !== "pokemon") return id;

  const m = id.toLowerCase().match(/^(sv|swsh|sm|xy|bw|me)0*(\d+)(?:\.(\d+))?-0*([a-z]*\d+[a-z]*)$/);
  if (!m) return id;
  const [, series, setNumber, half, cardNumber] = m;
  return `${series}${setNumber}${half ? `pt${half}` : ""}-${cardNumber}`;
}
