import { fetchJson, num, type CardProvider, type CardResult } from "./types";
import { normalizeExternalId } from "@/lib/external-id";

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
  artist?: string;
  rules?: string[];
  abilities?: Array<{ name?: string; text?: string }>;
  attacks?: Array<{ name?: string; text?: string; damage?: string }>;
  images?: { small?: string; large?: string };
  set?: { name?: string; ptcgoCode?: string; id?: string; printedTotal?: number };
  tcgplayer?: { prices?: Record<string, TcgPlayerPrice> };
}

function describePokeCard(c: PokeCard): string | undefined {
  const parts: string[] = [];
  if (c.rules?.length) parts.push(...c.rules);
  for (const a of c.abilities ?? []) {
    if (a.name && a.text) parts.push(`${a.name}: ${a.text}`);
  }
  for (const a of c.attacks ?? []) {
    if (a.name) parts.push(`${a.name}${a.damage ? ` (${a.damage})` : ""}${a.text ? ` — ${a.text}` : ""}`);
  }
  return parts.length ? parts.join("\n") : undefined;
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

function pokeCardToResult(c: PokeCard): CardResult {
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
    family: c.supertype,
    description: describePokeCard(c),
    illustrator: c.artist,
    priceUsd: pick(c.tcgplayer?.prices, NORMAL_KEYS),
    priceUsdFoil: pick(c.tcgplayer?.prices, FOIL_KEYS),
    priceSource: "TCGplayer vía pokemontcg.io",
  };
}

function pokeHeaders(): Record<string, string> {
  return process.env.POKEMONTCG_API_KEY ? { "X-Api-Key": process.env.POKEMONTCG_API_KEY } : {};
}

/** Carta por su id de pokemontcg.io (ej. "sv1-57"). Null si no existe o la API no responde. */
export async function pokemonById(id: string): Promise<CardResult | null> {
  try {
    const json = await fetchJson<{ data?: PokeCard }>(
      `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(id)}`,
      { headers: pokeHeaders() },
      60 * 60 * 6,
      2
    );
    return json.data ? pokeCardToResult(json.data) : null;
  } catch {
    return null;
  }
}

interface TcgdexSetDetail {
  id: string;
  name: string;
  abbreviation?: { official?: string };
  cards?: Array<{ id: string; localId: string; name: string }>;
}

interface TcgdexCardDetail {
  id: string;
  name: string;
  localId?: string;
  image?: string;
  rarity?: string;
  illustrator?: string;
  category?: string;
  set?: { name?: string; cardCount?: { official?: number } };
  pricing?: { tcgplayer?: Record<string, unknown> };
}

const TCGDEX = "https://api.tcgdex.net/v2/en";
/** Índice código de Pokémon TCG Live → expansión de TCGdex, armado a demanda y reutilizado. */
const setByCode = new Map<string, TcgdexSetDetail | null>();

async function tcgdexSetByPtcgo(code: string): Promise<TcgdexSetDetail | null> {
  const key = code.toUpperCase();
  if (setByCode.has(key)) return setByCode.get(key) ?? null;

  const list = await fetchJson<Array<{ id: string }>>(`${TCGDEX}/sets`, {}, 60 * 60 * 24 * 7, 1);
  // Las expansiones nuevas están al final de la lista y son las que más se piden.
  const ids = list.map((s) => s.id).reverse();
  for (let i = 0; i < ids.length; i += 12) {
    const batch = await Promise.all(
      ids.slice(i, i + 12).map((id) =>
        fetchJson<TcgdexSetDetail>(`${TCGDEX}/sets/${encodeURIComponent(id)}`, {}, 60 * 60 * 24 * 7).catch(
          () => null
        )
      )
    );
    for (const set of batch) {
      const abbr = set?.abbreviation?.official?.toUpperCase();
      if (set && abbr && !setByCode.has(abbr)) setByCode.set(abbr, set);
    }
    if (setByCode.has(key)) return setByCode.get(key) ?? null;
  }
  setByCode.set(key, null);
  return null;
}

/** Precio de TCGplayer (USD) que TCGdex entrega dentro de la carta, por tipo de impresión. */
function tcgdexPrice(pricing: TcgdexCardDetail["pricing"], keys: string[]): number | null {
  const tp = pricing?.tcgplayer;
  if (!tp) return null;
  for (const k of keys) {
    const v = tp[k] as { marketPrice?: unknown; midPrice?: unknown; lowPrice?: unknown } | undefined;
    if (v && typeof v === "object") {
      const n = num(v.marketPrice ?? v.midPrice ?? v.lowPrice);
      if (n) return n;
    }
  }
  return null;
}

async function pokemonByPtcgoTcgdex(code: string, number: string): Promise<CardResult | null> {
  const set = await tcgdexSetByPtcgo(code);
  if (!set?.cards) return null;
  const wanted = number.replace(/^0+/, "").toLowerCase();
  const hit = set.cards.find((c) => c.localId.replace(/^0+/, "").toLowerCase() === wanted);
  if (!hit) return null;

  const c = await fetchJson<TcgdexCardDetail>(`${TCGDEX}/cards/${encodeURIComponent(hit.id)}`, {}, 60 * 60 * 6, 1);
  if (!c.image) return null;
  const official = c.set?.cardCount?.official;
  return {
    externalId: normalizeExternalId("pokemon", c.id) ?? c.id,
    name: c.name,
    imageUrl: `${c.image}/low.webp`,
    imageLarge: `${c.image}/high.webp`,
    setName: c.set?.name ?? set.name,
    setCode: code.toUpperCase(),
    cardNumber: c.localId?.replace(/^0+/, "") || undefined,
    code: `${code.toUpperCase()} ${c.localId?.replace(/^0+/, "") ?? number}${official ? `/${official}` : ""}`,
    rarity: c.rarity,
    game: "pokemon",
    extra: c.category,
    family: c.category,
    illustrator: c.illustrator,
    priceUsd: tcgdexPrice(c.pricing, ["normal", "holofoil", "reverse-holofoil"]),
    priceUsdFoil: tcgdexPrice(c.pricing, ["holofoil", "reverse-holofoil", "normal"]),
    priceSource: "TCGplayer vía TCGdex",
  };
}

/**
 * Carta por código de expansión de Pokémon TCG Live y número (ej. "SVI", "57").
 * Usa TCGdex y, si no responde, pokemontcg.io.
 */
export async function pokemonByPtcgo(setCode: string, number: string): Promise<CardResult | null> {
  const safeSet = setCode.replace(/[^A-Za-z0-9-]/g, "");
  const safeNum = number.replace(/[^A-Za-z0-9]/g, "");
  if (!safeSet || !safeNum) return null;

  try {
    const viaTcgdex = await pokemonByPtcgoTcgdex(safeSet, safeNum);
    if (viaTcgdex) return viaTcgdex;
  } catch {
    /* cae a pokemontcg.io */
  }

  try {
    const json = await fetchJson<{ data?: PokeCard[] }>(
      `https://api.pokemontcg.io/v2/cards?q=set.ptcgoCode:${safeSet} number:${safeNum}&pageSize=3`,
      { headers: pokeHeaders() },
      60 * 60 * 24,
      2
    );
    const card = json.data?.[0];
    return card ? pokeCardToResult(card) : null;
  } catch {
    return null;
  }
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
        .map<CardResult>(pokeCardToResult)
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
