import "server-only";
import type { NewsCategory } from "@prisma/client";

export interface NewsSource {
  category: NewsCategory;
  name: string;
  url: string;
  language: "es" | "en";
  /** gnews: Google Noticias, cuyo título trae " - Medio" y cuyo resumen repite el título. */
  format: "rss" | "gnews" | "playlatam" | "pokemon" | "onepiece";
  country?: "CL";
  /** Descarta lo que no hable de cartas (las búsquedas amplias traen notas ajenas al TCG). */
  onlyTcg?: boolean;
  limit: number;
}

const gnews = (query: string) => `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=es-419&gl=CL&ceid=CL%3Aes-419`;

export const NEWS_SOURCES: NewsSource[] = [
  { category: "POKEMON", name: "PlayLatam Chile", url: "https://www.playlatam.net/", language: "es", format: "playlatam", country: "CL", limit: 16 },
  { category: "MYL", name: "Mitos y Leyendas", url: "https://blog.myl.cl/feed", language: "es", format: "rss", country: "CL", limit: 6 },
  { category: "GENERAL", name: "Prensa chilena", url: gnews('(TCG OR "cartas coleccionables" OR "Mitos y Leyendas" OR "Pokémon TCG" OR "cartas Pokémon" OR "One Piece Card Game" OR "Yu-Gi-Oh" OR Cardfest OR "Trading Fest") Chile when:45d'), language: "es", format: "gnews", onlyTcg: true, limit: 8 },
  { category: "POKEMON", name: "Play! Pokémon", url: "https://play.pokemon.com/es-es/news/", language: "es", format: "pokemon", limit: 6 },
  { category: "POKEMON", name: "CulturaGeek", url: "https://culturageek.com.ar/tag/pokemon-tcg/feed/", language: "es", format: "rss", onlyTcg: true, limit: 6 },
  { category: "POKEMON", name: "Pokémon oficial", url: gnews("site:pokemon.com/es/ (JCC OR cartas) when:60d"), language: "es", format: "gnews", onlyTcg: true, limit: 4 },
  { category: "ONEPIECE", name: "Bandai · One Piece", url: "https://en.onepiece-cardgame.com/topics/", language: "en", format: "onepiece", limit: 4 },
  { category: "ONEPIECE", name: "OnePiece.gg", url: "https://onepiece.gg/news/feed/", language: "en", format: "rss", limit: 4 },
  { category: "MAGIC", name: "MTGGoldfish", url: "https://www.mtggoldfish.com/feed.rss", language: "en", format: "rss", limit: 3 },
];

/** Organizer links remain available even when their social network has no public feed. */
export const CHILE_AGENDA = [
  { name: "Cardfest Chile", text: "Anuncios y próximas ediciones del organizador.", url: "https://www.instagram.com/cardfestchile/" },
  { name: "Torneos en Chile", text: "Inscripciones, fechas y ciudades en PlayLatam.", url: "https://www.playlatam.net/" },
  { name: "Eventos Play! Pokémon", text: "Busca ligas y torneos cercanos en el localizador oficial.", url: "https://events.pokemon.com/es-es/" },
  { name: "Mitos y Leyendas", text: "Novedades, torneos y comunicados oficiales.", url: "https://blog.myl.cl/" },
];
