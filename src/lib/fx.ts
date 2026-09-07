import "server-only";

/** Valor de respaldo si el indicador no responde. */
export const FALLBACK_USD_CLP = 950;

let cache: { at: number; value: number } | null = null;
const TTL = 1000 * 60 * 60 * 6;

/**
 * Dólar observado (mindicador.cl, Banco Central) para convertir los precios
 * referenciales de TCGplayer a pesos chilenos.
 */
export async function usdToClp(): Promise<number> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;

  try {
    const res = await fetch("https://mindicador.cl/api/dolar", {
      next: { revalidate: 21600 },
    });
    if (res.ok) {
      const json = (await res.json()) as { serie?: Array<{ valor?: number }> };
      const value = json.serie?.[0]?.valor;
      if (typeof value === "number" && value > 100) {
        cache = { at: Date.now(), value };
        return value;
      }
    }
  } catch {
    /* usa el respaldo */
  }

  return cache?.value ?? FALLBACK_USD_CLP;
}

/** Convierte USD a CLP y redondea a la centena más cercana. */
export function toClp(usd: number, rate: number): number {
  return Math.max(100, Math.round((usd * rate) / 100) * 100);
}
