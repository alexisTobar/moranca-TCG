export const NEWS_INTERVAL_MS = 20 * 60 * 60 * 1000;
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

const TCG_GAMES = /pok[eé]mon|one piece|yu-?gi-?oh|magic|mitos y leyendas|lorcana|digimon|dragon ball|union arena|flesh and blood/i;
const TCG_TERMS = /\bTCG\b|\bJCC\b|\bcartas?\b|card game|\bmazos?\b|\bsobres?\b|booster|torneo|campeonato|coleccionable/i;

const CRIME_NEWS = /crimen|asesin|homicid|femicid|detenid|imputad|sospechoso|baleado|apu[ñn]al/i;

/** Una nota es de cartas si nombra un juego y habla de cartas, o si es de un evento TCG conocido. */
export function isTcgNews(title: string, excerpt: string): boolean {
  const text = `${title} ${excerpt}`;
  // Notas policiales que solo mencionan cartas de pasada no son noticias para la comunidad.
  if (CRIME_NEWS.test(text)) return false;
  if (/cardfest|trading fest|tcg family fest|mitos y leyendas/i.test(text)) return true;
  return TCG_GAMES.test(text) && TCG_TERMS.test(text);
}

/** Google Noticias: "Título - Medio" → título limpio y nombre del medio. */
export function splitGoogleNewsTitle(raw: string): { title: string; outlet: string | null } {
  const match = /^(.*\S)\s+-\s+([^-]{2,60})$/.exec(raw.trim());
  return match ? { title: match[1], outlet: match[2].trim() } : { title: raw.trim(), outlet: null };
}

/** Firma de los eventos que el administrador carga a mano; la agenda los marca como destacados. */
export const MANUAL_NEWS_SOURCE = "TCG Cardeck";
