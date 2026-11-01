import "server-only";
import type { GameId } from "@/lib/games";
import { fetchJson } from "@/lib/providers/types";
import { onePieceDetails } from "@/lib/providers/onepiece";
import { pokemonById } from "@/lib/providers/pokemon";
import { translateCardText } from "@/lib/card-translate";

/** Lo que muestra el visor de una carta: datos de juego y habilidad en inglés y español. */
export interface CardText {
  name: string;
  /** Línea corta de datos: "Personaje · Rojo · Costo 5 · 6000 de poder". */
  stats: string[];
  family?: string;
  text?: string;
  textEs?: string;
  /** "official" si el español viene impreso por el fabricante; "translated" si es traducción nuestra. */
  esSource?: "official" | "translated";
}

const OP_TYPES: Record<string, string> = {
  LEADER: "Líder",
  CHARACTER: "Personaje",
  EVENT: "Evento",
  STAGE: "Escenario",
  "DON!!": "DON!!",
};
const OP_COLORS: Record<string, string> = {
  Red: "Rojo",
  Green: "Verde",
  Blue: "Azul",
  Purple: "Morado",
  Black: "Negro",
  Yellow: "Amarillo",
};

async function onePieceText(id: string): Promise<CardText | null> {
  const c = await onePieceDetails(id);
  if (!c) return null;
  const stats = [
    c.cardType ? (OP_TYPES[c.cardType.toUpperCase()] ?? c.cardType) : null,
    c.color ? c.color.split(/[\s/]+/).map((x) => OP_COLORS[x] ?? x).join(" / ") : null,
    c.life ? `Vida ${c.life}` : c.cost ? `Costo ${c.cost}` : null,
    c.power ? `${c.power} de poder` : null,
    c.counter ? `Contraataque +${c.counter}` : null,
  ].filter((x): x is string => !!x);

  const text = [c.effect, c.trigger ? `[Trigger] ${c.trigger}` : null].filter(Boolean).join("\n") || undefined;
  return {
    name: c.name,
    stats,
    family: c.family,
    text,
    textEs: text ? (await translateCardText(text, "onepiece")) ?? undefined : undefined,
    esSource: "translated",
  };
}

interface TcgdexText {
  name: string;
  category?: string;
  hp?: number;
  types?: string[];
  stage?: string;
  effect?: string;
  trainerType?: string;
  abilities?: Array<{ type?: string; name?: string; effect?: string }>;
  attacks?: Array<{ name?: string; damage?: number | string; effect?: string; cost?: string[] }>;
}

/** TCGdex numera distinto que pokemontcg.io ("sv1-57" ↔ "sv01-057"): se prueban las formas posibles. */
function tcgdexIds(id: string): string[] {
  const out = new Set([id]);
  const m = id.toLowerCase().match(/^([a-z]+)(\d+)(?:pt(\d+))?-([a-z]*)(\d+)([a-z]*)$/);
  if (m) {
    const [, series, set, half, pre, num, post] = m;
    const setPart = (pad: boolean) => `${series}${pad ? set.padStart(2, "0") : set}${half ? `.${half}` : ""}`;
    for (const pad of [true, false]) {
      out.add(`${setPart(pad)}-${pre}${num.padStart(3, "0")}${post}`);
      out.add(`${setPart(pad)}-${pre}${num}${post}`);
    }
  }
  return [...out];
}

function describeTcgdex(c: TcgdexText, abilityWord: string): string | undefined {
  const parts: string[] = [];
  if (c.effect) parts.push(c.effect);
  for (const a of c.abilities ?? []) {
    if (a.name) parts.push(`[${a.type ?? abilityWord}] ${a.name}: ${a.effect ?? ""}`.trim());
  }
  for (const a of c.attacks ?? []) {
    if (!a.name) continue;
    const cost = a.cost?.length ? `(${a.cost.join(", ")}) ` : "";
    parts.push(`${cost}${a.name}${a.damage ? ` ${a.damage}` : ""}${a.effect ? `: ${a.effect}` : ""}`);
  }
  return parts.length ? parts.join("\n") : undefined;
}

async function tcgdexCard(lang: "en" | "es", id: string): Promise<TcgdexText | null> {
  for (const candidate of tcgdexIds(id)) {
    try {
      return await fetchJson<TcgdexText>(
        `https://api.tcgdex.net/v2/${lang}/cards/${encodeURIComponent(candidate)}`,
        {},
        60 * 60 * 24 * 7
      );
    } catch {
      /* siguiente forma */
    }
  }
  return null;
}

async function pokemonText(id: string): Promise<CardText | null> {
  const [en, es] = await Promise.all([tcgdexCard("en", id), tcgdexCard("es", id)]);
  const text = en ? describeTcgdex(en, "Ability") : (await pokemonById(id))?.description;
  const officialEs = es ? describeTcgdex(es, "Habilidad") : undefined;
  if (!en && !text) return null;

  const ref = es ?? en;
  const stats = [
    ref?.category,
    ref?.stage,
    ref?.trainerType,
    ref?.types?.join(" / "),
    ref?.hp ? `${ref.hp} PS` : null,
  ].filter((x): x is string => !!x);

  return {
    name: en?.name ?? es?.name ?? "",
    stats,
    text,
    textEs: officialEs ?? (text ? (await translateCardText(text, "pokemon")) ?? undefined : undefined),
    esSource: officialEs ? "official" : "translated",
  };
}

interface ScryfallText {
  name: string;
  type_line?: string;
  mana_cost?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  card_faces?: Array<{ name?: string; oracle_text?: string }>;
}

async function magicText(id: string): Promise<CardText | null> {
  try {
    const c = await fetchJson<ScryfallText>(`https://api.scryfall.com/cards/${encodeURIComponent(id)}`, {}, 60 * 60 * 24 * 7);
    const text =
      c.oracle_text ??
      (c.card_faces?.map((f) => `${f.name}\n${f.oracle_text ?? ""}`).join("\n\n") || undefined);
    return {
      name: c.name,
      stats: [c.type_line, c.mana_cost, c.power ? `${c.power}/${c.toughness}` : null].filter((x): x is string => !!x),
      text,
      textEs: text ? (await translateCardText(text, "magic")) ?? undefined : undefined,
      esSource: "translated",
    };
  } catch {
    return null;
  }
}

/** Texto de una carta del mazo para el visor. Mitos y Leyendas no tiene API de texto. */
export async function cardText(game: GameId, externalId: string): Promise<CardText | null> {
  if (game === "onepiece") return onePieceText(externalId);
  if (game === "pokemon") return pokemonText(externalId);
  if (game === "magic") return magicText(externalId);
  return null;
}
