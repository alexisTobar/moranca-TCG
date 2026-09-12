import "server-only";
import type { NewsCategory } from "@prisma/client";

export interface NewsSource {
  category: NewsCategory;
  name: string;
  url: string;
}

/**
 * Fuentes RSS/Atom públicas verificadas manualmente (contenido real, feed activo)
 * antes de agregarlas acá. Solo se guarda título + extracto corto + link de vuelta
 * a la fuente — nunca el artículo completo.
 */
export const NEWS_SOURCES: NewsSource[] = [
  { category: "MAGIC", name: "MTGGoldfish", url: "https://www.mtggoldfish.com/feed.rss" },
  { category: "ONEPIECE", name: "OnePiece.gg", url: "https://onepiece.gg/news/feed/" },
  { category: "POKEMON", name: "PokémonDB", url: "https://pokemondb.net/news/feed" },
  {
    category: "POKEMON",
    name: "Bleeding Cool",
    url: "https://bleedingcool.com/tag/pokemon-tcg/feed/",
  },
  { category: "GENERAL", name: "ICv2", url: "https://icv2.com/rss" },
];
