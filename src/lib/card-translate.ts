import "server-only";
import type { GameId } from "@/lib/games";

/**
 * Traducción al español del texto de habilidad de una carta.
 *
 * El traductor automático no conoce la jerga de cada juego ("DON!!", "Bench",
 * "[On Play]"...), así que antes de traducir esas palabras se sacan del texto
 * con marcadores numerados y se reponen después ya con el término que usa la
 * comunidad hispana / la versión oficial en español. Lo que queda (la frase)
 * lo traduce Google y al final se corrigen sus errores típicos ("tarjeta" → "carta").
 */

/** Palabras clave de One Piece entre corchetes: [On Play] → [Al jugar]. */
const OP_KEYWORDS: Record<string, string> = {
  "on play": "Al jugar",
  "when attacking": "Al atacar",
  "activate: main": "Activar: Principal",
  main: "Principal",
  counter: "Contraataque",
  blocker: "Bloqueador",
  rush: "Prisa",
  "rush: character": "Prisa: Personaje",
  "double attack": "Ataque doble",
  banish: "Desterrar",
  "on k.o.": "Al ser K.O.",
  "end of your turn": "Final de tu turno",
  "once per turn": "Una vez por turno",
  "your turn": "Tu turno",
  "opponent's turn": "Turno del oponente",
  "on block": "Al bloquear",
  "on your opponent's attack": "Al atacar tu oponente",
  trigger: "Activador",
  unblockable: "Imbloqueable",
};

/** Términos que se sacan antes de traducir y se reponen tal cual (Google rompía "DON!!" y "K.O."). */
const OP_TERMS: Array<[RegExp, string]> = [
  [/\bDON!! cards?/g, "DON!!"],
  [/\bDON!!/g, "DON!!"],
  [/\bK\.O\.(?!\w)/g, "K.O."],
];
const OP_POST: Array<[RegExp, string]> = [
  [/\btarjeta(s?)\b/gi, "carta$1"],
  [/\bpersonaje(s?)\b/g, "Personaje$1"],
  [/\blíder(es)?\b/g, "Líder$1"],
  [/\bcartas de vida\b/gi, "cartas de Vida"],
  [/\b(?:cubierta|baraja)\b/gi, "mazo"],
];

/** Términos oficiales de Pokémon TCG en español. */
const PKM_TERMS: Array<[RegExp, string]> = [
  [/\bPokémon Tools?\b/g, "Herramienta Pokémon"],
  [/\bSpecial Conditions?\b/g, "Condiciones Especiales"],
  [/\bdamage counters?\b/g, "contadores de daño"],
  [/\bPrize cards?\b/g, "cartas de Premio"],
  [/\bdiscard pile\b/g, "pila de descartes"],
  [/\bBenched Pokémon\b/g, "Pokémon en Banca"],
  [/\bBench\b/g, "Banca"],
  [/\bActive Pokémon\b/g, "Pokémon Activo"],
  [/\bSupporter\b/g, "Partidario"],
  [/\bStadium\b/g, "Estadio"],
];
const PKM_POST: Array<[RegExp, string]> = [
  [/\btarjeta(s?)\b/gi, "carta$1"],
  [/\benergía\b/g, "Energía"],
  [/\bcubierta\b/gi, "baraja"],
];

/** Términos de las reglas de Magic en su versión oficial en español. */
const MTG_TERMS: Array<[RegExp, string]> = [
  [/\bUntap\b/g, "Endereza"],
  [/\buntap\b/g, "endereza"],
  [/\bTap\b/g, "Gira"],
  [/\btap\b/g, "gira"],
  [/\bbattlefield\b/g, "campo de batalla"],
  [/\bgraveyard\b/g, "cementerio"],
  [/\blibrary\b/g, "biblioteca"],
];
const MTG_POST: Array<[RegExp, string]> = [
  [/\btarjeta(s?)\b/gi, "carta$1"],
  [/\bcubierta\b/gi, "biblioteca"],
];

const cache = new Map<string, string>();

/** Llamada al traductor público de Google (sin llave). Devuelve null si falla. */
async function machineTranslate(text: string): Promise<string | null> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", "es");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 30 } });
    if (!res.ok) return null;
    const data = (await res.json()) as [Array<[string]>];
    return data[0].map((part) => part[0]).join("");
  } catch {
    return null;
  }
}

/**
 * Traduce una línea. Los corchetes de One Piece son palabras clave ([On Play])
 * o nombres de carta ([Nami]); las llaves son tipos ({Straw Hat Crew}). Nombres
 * y tipos se dejan en inglés, igual que se buscan las cartas.
 */
async function translateLine(line: string, game: GameId): Promise<string> {
  const tokens: string[] = [];
  const keep = (s: string) => {
    tokens.push(s);
    return `[${tokens.length - 1}]`;
  };

  let pre = line.replace(/\[([^\]]+)\]|\{[^}]+\}/g, (m, inner?: string) => {
    if (inner && game === "onepiece") {
      const kw = OP_KEYWORDS[inner.toLowerCase()];
      if (kw) return keep(`[${kw}]`);
    }
    return keep(m);
  });
  for (const [re, to] of game === "onepiece" ? OP_TERMS : game === "pokemon" ? PKM_TERMS : game === "magic" ? MTG_TERMS : []) {
    pre = pre.replace(re, () => keep(to));
  }

  // Una línea que es solo palabras clave no necesita traductor.
  const bare = pre.replace(/\[\d+\]/g, "").replace(/[\s:.,()]/g, "");
  let out = bare ? await machineTranslate(pre) : pre;
  if (out == null) throw new Error("traductor no disponible");

  for (const [re, to] of game === "onepiece" ? OP_POST : game === "pokemon" ? PKM_POST : MTG_POST) {
    out = out.replace(re, to);
  }
  // Google a veces separa el marcador; se acepta "[ 3 ]" y "[3]".
  return out.replace(/\[\s*(\d+)\s*\]/g, (m, i: string) => tokens[Number(i)] ?? m);
}

/** Traduce el texto completo (línea por línea). Null si el traductor no responde. */
export async function translateCardText(text: string, game: GameId): Promise<string | null> {
  const key = `${game}:${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const lines = await Promise.all(text.split("\n").map((l) => (l.trim() ? translateLine(l, game) : l)));
    const result = lines.join("\n");
    if (cache.size > 2000) cache.clear();
    cache.set(key, result);
    return result;
  } catch {
    return null;
  }
}
