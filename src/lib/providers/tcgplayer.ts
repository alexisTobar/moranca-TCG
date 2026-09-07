import "server-only";
import type { CardResult } from "./types";

/**
 * Cliente de la API oficial de TCGplayer.
 *
 * TCGplayer dejó de entregar llaves nuevas ("We are no longer granting new API
 * access at this time", docs.tcgplayer.com/docs/getting-started), así que esta
 * integración queda inactiva mientras no existan credenciales.
 *
 * Cuando tengas TCGPLAYER_PUBLIC_KEY y TCGPLAYER_PRIVATE_KEY en el entorno,
 * los precios de Magic y One Piece pasan a venir directo de TCGplayer, usando
 * el productId exacto que ya entregan Scryfall (tcgplayer_id) y dotGG
 * (marketIds). No hay coincidencia por nombre, así que no hay falsos positivos.
 *
 * Si no hay llaves, se mantienen los precios redistribuidos por Scryfall,
 * pokemontcg.io y dotGG, que son los mismos de TCGplayer con un día de rezago.
 */

const TOKEN_URL = "https://api.tcgplayer.com/token";
const API = "https://api.tcgplayer.com/v1.39.0";

export function tcgplayerEnabled(): boolean {
  return Boolean(
    process.env.TCGPLAYER_PUBLIC_KEY && process.env.TCGPLAYER_PRIVATE_KEY
  );
}

let token: { value: string; expiresAt: number } | null = null;

async function getBearerToken(): Promise<string | null> {
  if (!tcgplayerEnabled()) return null;
  if (token && Date.now() < token.expiresAt - 60_000) return token.value;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.TCGPLAYER_PUBLIC_KEY!,
    client_secret: process.env.TCGPLAYER_PRIVATE_KEY!,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[tcgplayer] no se pudo obtener el token:", res.status);
    return null;
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) return null;

  token = {
    value: json.access_token,
    // El token dura ~14 días; lo guardamos con margen.
    expiresAt: Date.now() + (json.expires_in ?? 1_209_599) * 1000,
  };
  return token.value;
}

interface TcgPrice {
  productId: number;
  lowPrice: number | null;
  midPrice: number | null;
  marketPrice: number | null;
  subTypeName: string;
}

/** Precios por productId. La API acepta hasta 250 ids por llamada. */
export async function fetchPrices(
  productIds: number[]
): Promise<Map<number, { normal: number | null; foil: number | null }>> {
  const out = new Map<number, { normal: number | null; foil: number | null }>();
  const bearer = await getBearerToken();
  if (!bearer || productIds.length === 0) return out;

  const unique = [...new Set(productIds)];

  for (let i = 0; i < unique.length; i += 250) {
    const batch = unique.slice(i, i + 250);
    try {
      const res = await fetch(`${API}/pricing/product/${batch.join(",")}`, {
        headers: { Accept: "application/json", Authorization: `bearer ${bearer}` },
        next: { revalidate: 3600 },
      });
      if (!res.ok) continue;

      const json = (await res.json()) as { Results?: TcgPrice[] };
      for (const row of json.Results ?? []) {
        const price = row.marketPrice ?? row.midPrice ?? row.lowPrice;
        if (!price) continue;
        const entry = out.get(row.productId) ?? { normal: null, foil: null };
        const isFoil = /foil/i.test(row.subTypeName);
        if (isFoil) entry.foil = entry.foil ?? price;
        else entry.normal = entry.normal ?? price;
        out.set(row.productId, entry);
      }
    } catch (error) {
      console.error("[tcgplayer] error consultando precios", error);
    }
  }

  return out;
}

/**
 * Reemplaza los precios referenciales por los oficiales de TCGplayer
 * en las cartas que traen productId. Si no hay llaves, devuelve la lista igual.
 */
export async function enrichWithTcgplayer(
  cards: CardResult[]
): Promise<CardResult[]> {
  if (!tcgplayerEnabled()) return cards;

  const ids = cards
    .map((c) => c.tcgplayerId)
    .filter((id): id is number => typeof id === "number");
  if (ids.length === 0) return cards;

  const prices = await fetchPrices(ids);
  if (prices.size === 0) return cards;

  return cards.map((c) => {
    const found = c.tcgplayerId ? prices.get(c.tcgplayerId) : undefined;
    if (!found) return c;
    return {
      ...c,
      priceUsd: found.normal ?? c.priceUsd ?? null,
      priceUsdFoil: found.foil ?? c.priceUsdFoil ?? null,
      priceSource: "TCGplayer (API oficial)",
    };
  });
}
