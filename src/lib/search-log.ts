import "server-only";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { CONSENT_VERSION } from "@/lib/consent-policy";
import { utcDay } from "@/lib/usage-policy";

/** Solo se registran búsquedas de quien aceptó estadísticas (misma regla que /api/usage) y no pide no ser rastreado. */
export async function searchLogAllowed(): Promise<boolean> {
  try {
    const [store, h] = await Promise.all([cookies(), headers()]);
    if (store.get("wc_consent_version")?.value !== CONSENT_VERSION || store.get("wc_analytics")?.value !== "yes") return false;
    return h.get("dnt") !== "1" && h.get("sec-gpc") !== "1";
  } catch {
    return false;
  }
}

/**
 * Anota una búsqueda del catálogo para el análisis de mercado: término normalizado, juego y cantidad de
 * resultados, nunca quién buscó. Llamar solo si searchLogAllowed() fue verdadero. Nunca rompe la página.
 */
export async function logSearch(term: string, game: string | undefined, results: number) {
  try {
    const normalized = term.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
    if (normalized.length < 2) return;
    await prisma.searchEvent.create({ data: { day: utcDay(), term: normalized, game: game ?? null, results } });
  } catch (error) {
    console.error("[search-log]", error);
  }
}
