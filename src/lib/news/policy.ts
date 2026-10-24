export const NEWS_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;
export const NEWS_MAX_AGE_DAYS = 90;

export function newsKind(title: string, excerpt: string): "TOURNAMENT" | "RELEASE" | "NEWS" {
  const text = `${title} ${excerpt}`;
  if (/torneo|campeonato|regional|championship|tournament|league|liga|cardfest|family fest|festival|copa|\bcup\b/i.test(text)) return "TOURNAMENT";
  if (/lanzamiento|expansi[oó]n|pr[eé]venta|booster|starter deck|release|collection|colecci[oó]n|announced|anunciad/i.test(text)) return "RELEASE";
  return "NEWS";
}

export function newsImage(url: string | null | undefined): string | null {
  if (!url || !/^https?:\/\//i.test(url) || /logo|badge|avatar|tracking|pixel/i.test(url)) return null;
  return url;
}

export function isChileNews(title: string, excerpt: string): boolean {
  return /\bchile\b|\bchileno|\bsantiago\b|cardfest|viña del mar|valpara[ií]so|concepci[oó]n|tcg family fest/i.test(`${title} ${excerpt}`);
}
