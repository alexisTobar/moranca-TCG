/**
 * Parser de listas de colección estilo Moxfield/Archidekt/TCGplayer:
 *   "1 Aang, Swift Savior / Aang and La, Ocean's Fury (TLA) 204"
 *   "1 Aesi, Tyrant of Gyre Strait (CMR) 365 *F*"
 *
 * Formato: <cantidad> <nombre> (<código de edición>) <número de coleccionista> [*F*]
 * El número de coleccionista puede traer letras y guion (ej. reimpresiones de
 * The List: "CMR-365"), y el sufijo "*F*" marca la copia como foil.
 */
const LINE_RE =
  /^(\d+)\s+(.+?)\s+\(([A-Za-z0-9]{2,6})\)\s+([A-Za-z0-9-]+)\s*(\*F\*)?\s*$/;

export interface DecklistEntry {
  raw: string;
  quantity: number;
  name: string;
  setCode: string;
  collectorNumber: string;
  isFoil: boolean;
}

export interface ParsedDecklist {
  entries: DecklistEntry[];
  /** Líneas no vacías que no calzaron con el formato esperado. */
  unrecognized: string[];
}

export function parseDecklist(text: string): ParsedDecklist {
  const entries: DecklistEntry[] = [];
  const unrecognized: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const raw = rawLine.trim();
    if (!raw) continue;

    const m = raw.match(LINE_RE);
    if (!m) {
      unrecognized.push(raw);
      continue;
    }

    const [, qty, name, setCode, collectorNumber, foilFlag] = m;
    const quantity = Math.min(9999, Math.max(1, parseInt(qty, 10)));

    entries.push({
      raw,
      quantity,
      name: name.trim(),
      setCode: setCode.toLowerCase(),
      collectorNumber,
      isFoil: Boolean(foilFlag),
    });
  }

  return { entries, unrecognized };
}

/* ---------- Pokémon (formato de Pokémon TCG Live) y One Piece ---------- */

export interface ListEntry {
  raw: string;
  quantity: number;
  name: string;
  /** Código de expansión (Pokémon) o vacío (One Piece). */
  setCode: string;
  /** Número de la carta (Pokémon) o código completo, ej. "OP01-024" (One Piece). */
  number: string;
  isFoil: boolean;
}

export interface ParsedList {
  entries: ListEntry[];
  unrecognized: string[];
}

/** "4 Pikachu ex SVI 57" — cantidad, nombre, código de expansión y número. */
const PTCG_RE = /^(\d+)\s+(.+?)\s+([A-Za-z0-9-]{2,8})\s+(\d{1,3}[A-Za-z]?)\s*(\*F\*)?\s*$/;
/** Encabezados de sección de la exportación ("Pokémon: 12", "Total Cards: 60"). */
const SECTION_RE = /^[\p{L}\s#]+:\s*\d*$/u;

export function parsePokemonList(text: string): ParsedList {
  const entries: ListEntry[] = [];
  const unrecognized: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const raw = rawLine.trim();
    if (!raw || SECTION_RE.test(raw)) continue;
    const m = raw.match(PTCG_RE);
    if (!m) {
      unrecognized.push(raw);
      continue;
    }
    const [, qty, name, setCode, number, foil] = m;
    entries.push({
      raw,
      quantity: Math.min(9999, Math.max(1, parseInt(qty, 10))),
      name: name.trim(),
      setCode: setCode.toUpperCase(),
      number,
      isFoil: Boolean(foil),
    });
  }
  return { entries, unrecognized };
}

/** "4xOP01-001", "4 OP01-001" (el código puede llevar sufijo de variante, ej. OP05-119_p1) */
const OP_QTY_FIRST = /^(\d+)\s*[xX]?\s*([A-Za-z]{1,4}\d{0,2}-\d{2,4}(?:_p\d+)?)\s*(\*F\*)?(?:\s+.*)?$/;
/** "OP01-001", "OP01-001 x4" */
const OP_CODE_FIRST = /^([A-Za-z]{1,4}\d{0,2}-\d{2,4}(?:_p\d+)?)\s*(?:[xX]\s*(\d+))?\s*(\*F\*)?(?:\s+.*)?$/;

export function parseOnePieceList(text: string): ParsedList {
  const entries: ListEntry[] = [];
  const unrecognized: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const raw = rawLine.trim();
    if (!raw || SECTION_RE.test(raw)) continue;

    let qty = 1;
    let code = "";
    let foil = false;
    const a = raw.match(OP_QTY_FIRST);
    const b = a ? null : raw.match(OP_CODE_FIRST);
    if (a) {
      qty = parseInt(a[1], 10);
      code = a[2];
      foil = Boolean(a[3]);
    } else if (b) {
      code = b[1];
      qty = b[2] ? parseInt(b[2], 10) : 1;
      foil = Boolean(b[3]);
    } else {
      unrecognized.push(raw);
      continue;
    }
    entries.push({
      raw,
      quantity: Math.min(9999, Math.max(1, qty)),
      name: code,
      setCode: "",
      number: code.toUpperCase(),
      isFoil: foil,
    });
  }
  return { entries, unrecognized };
}
