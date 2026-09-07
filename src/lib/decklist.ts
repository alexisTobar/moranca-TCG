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
