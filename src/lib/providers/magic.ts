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

function toCardResult(c: ScryfallCard): CardResult {
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

    return cards.slice(0, limit).map(toCardResult).filter((c) => c.imageUrl);
  },
};

export interface CollectionIdentifier {
  setCode: string;
  collectorNumber: string;
}

interface ScryfallCollectionResponse {
  data?: ScryfallCard[];
  not_found?: Array<{ set?: string; collector_number?: string }>;
}

/**
 * Búsqueda masiva por set + número de coleccionista, para subir listas de
 * colección completas sin gastar una consulta por carta. Scryfall acepta
 * hasta 75 identificadores por llamada a /cards/collection.
 */
export async function fetchMagicCollection(
  identifiers: CollectionIdentifier[]
): Promise<{ found: Map<string, ScryfallCard>; notFound: CollectionIdentifier[] }> {
  const found = new Map<string, ScryfallCard>();
  const notFound: CollectionIdentifier[] = [];
  const BATCH = 75;

  const key = (setCode: string, collectorNumber: string) =>
    `${setCode.toLowerCase()}:${collectorNumber}`;

  for (let i = 0; i < identifiers.length; i += BATCH) {
    const chunk = identifiers.slice(i, i + BATCH);
    try {
      const res = await fetchJson<ScryfallCollectionResponse>(
        "https://api.scryfall.com/cards/collection",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifiers: chunk.map((c) => ({
              set: c.setCode,
              collector_number: c.collectorNumber,
            })),
          }),
        },
        0,
        2
      );

      for (const card of res.data ?? []) {
        if (card.set && card.collector_number) {
          found.set(key(card.set, card.collector_number), card);
        }
      }
      for (const miss of res.not_found ?? []) {
        if (miss.set && miss.collector_number) {
          notFound.push({ setCode: miss.set, collectorNumber: miss.collector_number });
        }
      }
    } catch {
      notFound.push(...chunk);
    }
  }

  return { found, notFound };
}

export function magicCollectionKey(setCode: string, collectorNumber: string): string {
  return `${setCode.toLowerCase()}:${collectorNumber}`;
}

export function magicCardToResult(c: ScryfallCard): CardResult {
  return toCardResult(c);
}

export interface MagicSet {
  code: string;
  name: string;
  releasedAt: string | null;
}

interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  digital: boolean;
  released_at?: string | null;
}

interface ScryfallSetList {
  data?: ScryfallSet[];
}

/** Tipos de edición con cartas físicas vendibles; deja fuera tokens, arte, etc. */
const SELLABLE_SET_TYPES = new Set([
  "core",
  "expansion",
  "masters",
  "commander",
  "draft_innovation",
  "funny",
  "starter",
  "box",
  "premium_deck",
  "duel_deck",
  "from_the_vault",
  "spellbook",
  "arsenal",
  "planechase",
  "archenemy",
  "vanguard",
]);

let setsCache: { at: number; sets: MagicSet[] } | null = null;
const SETS_TTL = 1000 * 60 * 60 * 24;

/** Lista de ediciones de Magic para el filtro del buscador, más recientes primero. */
export async function fetchMagicSets(): Promise<MagicSet[]> {
  if (setsCache && Date.now() - setsCache.at < SETS_TTL) return setsCache.sets;

  const res = await fetchJson<ScryfallSetList>(
    "https://api.scryfall.com/sets",
    {},
    60 * 60 * 24,
    2
  );

  const sets = (res.data ?? [])
    .filter((s) => !s.digital && SELLABLE_SET_TYPES.has(s.set_type))
    .map((s) => ({ code: s.code, name: s.name, releasedAt: s.released_at ?? null }))
    .sort((a, b) => (b.releasedAt ?? "").localeCompare(a.releasedAt ?? ""));

  setsCache = { at: Date.now(), sets };
  return sets;
}
