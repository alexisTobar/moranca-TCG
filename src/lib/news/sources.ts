import "server-only";
import type { NewsCategory } from "@prisma/client";

export interface NewsSource {
  category: NewsCategory;
  name: string;
  url: string;
  language: "es" | "en";
  format: "rss" | "playlatam" | "pokemon" | "onepiece";
  country?: "CL";
  limit: number;
}

export const NEWS_SOURCES: NewsSource[] = [
  { category: "POKEMON", name: "PlayLatam Chile", url: "https://www.playlatam.net/", language: "es", format: "playlatam", country: "CL", limit: 12 },
  { category: "GENERAL", name: "Google Noticias · Cardfest y eventos de Chile", url: "https://news.google.com/rss/search?q=%28Cardfest%20OR%20%22TCG%20Family%20Fest%22%29%20Chile%20when%3A90d&hl=es-419&gl=CL&ceid=CL%3Aes-419", language: "es", format: "rss", country: "CL", limit: 4 },
  { category: "POKEMON", name: "Play! Pokémon", url: "https://play.pokemon.com/es-es/news/", language: "es", format: "pokemon", limit: 6 },
  { category: "ONEPIECE", name: "Bandai · One Piece", url: "https://en.onepiece-cardgame.com/topics/", language: "en", format: "onepiece", limit: 4 },
  { category: "ONEPIECE", name: "OnePiece.gg", url: "https://onepiece.gg/news/feed/", language: "en", format: "rss", limit: 4 },
  { category: "POKEMON", name: "Pokémon oficial · vía Google Noticias", url: "https://news.google.com/rss/search?q=site%3Apokemon.com%2Fes%2F%20%28JCC%20OR%20cartas%29%20%28expansi%C3%B3n%20OR%20lanzamiento%29%20when%3A90d&hl=es-419&gl=CL&ceid=CL%3Aes-419", language: "es", format: "rss", limit: 4 },
  { category: "MAGIC", name: "MTGGoldfish", url: "https://www.mtggoldfish.com/feed.rss", language: "en", format: "rss", limit: 2 },
];

/** Organizer links remain available even when their social network has no public feed. */
export const CHILE_AGENDA = [
  { name: "Cardfest Chile", text: "Anuncios y próximas ediciones del organizador.", url: "https://www.instagram.com/cardfestchile/" },
  { name: "Torneos en Chile", text: "Inscripciones, fechas y ciudades en PlayLatam.", url: "https://www.playlatam.net/" },
  { name: "Eventos Play! Pokémon", text: "Busca ligas y torneos cercanos en el localizador oficial.", url: "https://events.pokemon.com/es-es/" },
  { name: "One Piece · Latinoamérica", text: "Regionales y eventos oficiales de Bandai.", url: "https://en.onepiece-cardgame.com/events/" },
];
