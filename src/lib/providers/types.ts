import type { GameId } from "@/lib/games";

export interface CardResult {
  externalId: string;
  name: string;
  imageUrl: string;
  imageLarge?: string;
  setName?: string;
  setCode?: string;
  cardNumber?: string;
  /** Código completo tal como se imprime en la carta (ej. "OP01-024", "MH2 #123"). */
  code?: string;
  rarity?: string;
  game: GameId;
  extra?: string;
  /** Precio referencial de mercado en USD (fuente: TCGplayer). */
  priceUsd?: number | null;
  /** Precio referencial de la versión foil/holo en USD. */
  priceUsdFoil?: number | null;
  /** De dónde viene el precio referencial. */
  priceSource?: string;
  /** productId de TCGplayer, cuando el catálogo lo entrega. */
  tcgplayerId?: number | null;
}

export interface CardProvider {
  search(query: string, limit: number): Promise<CardResult[]>;
}

export const UA = "DreamDeckTCG/1.0 (+https://dreamdecktcg.cl)";

export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  revalidate = 60 * 60 * 24,
  retries = 0
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Espera creciente entre reintentos: 350ms, 700ms, 1050ms…
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 350 * attempt));
    }

    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          "User-Agent": UA,
          Accept: "application/json",
          ...(init.headers ?? {}),
        },
        next: { revalidate },
      });

      if (res.ok) return (await res.json()) as T;

      // 4xx (salvo 429) es un error nuestro: reintentar no ayuda.
      if (res.status < 500 && res.status !== 429) {
        throw new Error(`${url} respondió ${res.status}`);
      }
      lastError = new Error(`${url} respondió ${res.status}`);
    } catch (error) {
      lastError = error as Error;
      if (attempt === retries) break;
    }
  }

  throw lastError ?? new Error(`${url} falló`);
}

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Convierte a número los precios que las APIs entregan como texto. */
export function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}
