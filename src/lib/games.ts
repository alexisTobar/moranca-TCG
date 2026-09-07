export type GameId = "magic" | "pokemon" | "onepiece" | "myl";

export interface GameMeta {
  id: GameId;
  name: string;
  short: string;
  /** Color identificador del juego (puntos, bordes, degradados). */
  accent: string;
  gradient: string;
  provider: string;
  /** Carta real del catálogo oficial, usada como imagen del juego. */
  cardImage: string;
  /** Arte horizontal para banners; si no existe se usa la carta. */
  artImage?: string;
  tagline: string;
}

export const GAMES: Record<GameId, GameMeta> = {
  magic: {
    id: "magic",
    name: "Magic: The Gathering",
    short: "Magic",
    accent: "#c2410c",
    gradient: "from-orange-100 to-amber-50",
    provider: "Scryfall",
    cardImage:
      "https://cards.scryfall.io/normal/front/9/1/91fdb56b-54d5-4272-8319-505ff987fe9b.jpg",
    artImage:
      "https://cards.scryfall.io/art_crop/front/9/1/91fdb56b-54d5-4272-8319-505ff987fe9b.jpg",
    tagline: "Singles, commander y sellados",
  },
  pokemon: {
    id: "pokemon",
    name: "Pokémon TCG",
    short: "Pokémon",
    accent: "#ca8a04",
    gradient: "from-yellow-100 to-sky-50",
    provider: "pokemontcg.io",
    cardImage: "https://assets.tcgdex.net/en/pl/pl4/1/high.webp",
    tagline: "Cartas, ETB y booster boxes",
  },
  onepiece: {
    id: "onepiece",
    name: "One Piece Card Game",
    short: "One Piece",
    accent: "#dc2626",
    gradient: "from-red-100 to-rose-50",
    provider: "dotGG",
    cardImage: "https://static.dotgg.gg/onepiece/card/OP01-001.webp",
    tagline: "Líderes, mazos y singles",
  },
  myl: {
    id: "myl",
    name: "Mitos y Leyendas",
    short: "Mitos y Leyendas",
    accent: "#7c3aed",
    gradient: "from-violet-100 to-indigo-50",
    provider: "api.myl.cl",
    cardImage: "https://api.myl.cl/static/cards/44/001.png",
    tagline: "El TCG chileno de siempre",
  },
};

export const GAME_LIST = Object.values(GAMES);

export function isGameId(value: string): value is GameId {
  return value in GAMES;
}

export function gameName(id: string): string {
  return isGameId(id) ? GAMES[id].name : id;
}

export const CONDITIONS = [
  { value: "M", label: "Mint (M)" },
  { value: "NM", label: "Near Mint (NM)" },
  { value: "EX", label: "Excellent (EX)" },
  { value: "GD", label: "Good (GD)" },
  { value: "LP", label: "Light Played (LP)" },
  { value: "PL", label: "Played (PL)" },
  { value: "PO", label: "Poor (PO)" },
];

export const LANGUAGES = [
  { value: "ES", label: "Español" },
  { value: "EN", label: "Inglés" },
  { value: "JP", label: "Japonés" },
  { value: "PT", label: "Portugués" },
  { value: "IT", label: "Italiano" },
  { value: "FR", label: "Francés" },
  { value: "DE", label: "Alemán" },
];

export const LISTING_TYPES = [
  { value: "SINGLE", label: "Single", hint: "Una carta individual" },
  { value: "SEALED", label: "Sellado", hint: "Sobres, cajas, bundles" },
  { value: "DECK", label: "Mazo", hint: "Un deck completo con su lista" },
];
