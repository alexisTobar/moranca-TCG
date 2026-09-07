import { fetchJson, normalize, type CardProvider, type CardResult } from "./types";

/**
 * Mitos y Leyendas — api.myl.cl
 *
 * La API no expone índice de ediciones ni búsqueda global, así que los slugs se
 * listan a mano y se cachean en memoria. Se descubrieron sondeando la API.
 *
 * Dos trampas que cuestan caro:
 *  1. Los slugs mezclan separadores sin criterio: `espada-sagrada` con guion,
 *     pero `hijos_de_daana` con guion bajo. Van escritos tal cual responde el
 *     servidor.
 *  2. La API se cae de a ratos. Sin reintentos se pierden ediciones que sí
 *     existen (en el primer sondeo aparecieron 33 de 57 por esta razón).
 *
 * Para agregar una edición: pruébala en
 * https://api.myl.cl/cards/edition/TU-SLUG — si responde `"status": "OK"`,
 * agrégala a MYL_EDITIONS.
 */

/** Primer Bloque: 4 ediciones base + sus 4 extensiones (blog.myl.cl). */
export const PRIMER_BLOQUE = [
  "espada-sagrada",
  "cruzadas",
  "helenica",
  "imperio",
  "dominios-de-ra",
  "encrucijada",
  "hijos_de_daana",
  "tierras_altas",
];

/**
 * Imperio: desde Bestiarium en adelante.
 * Al salir una edición nueva de Imperio, agrégala aquí y a MYL_EDITIONS.
 * Verificado contra tor.myl.cl/cartas/imperio (filtro oficial de edición) el 2026-09-06.
 */
export const IMPERIO = [
  "bestiarium",
  "secretos_arcanos",
  "lootbox_2024",
  "toolkit_hielo_inmortal",
  "toolkit_cenizas_de_fuego",
  "onyria",
  "libertadores",
  "kvsm_titanes",
  "dia_de_muertos",
  "ritual_vudu",
  "chile_oculto",
  "ayd_vigilantes",
  "mazo_imp_dragon",
  "mazo_imp_eterno",
  "mazo_imp_guerrero",
];

export const MYL_FORMATOS = [
  "Primer Bloque",
  "Imperio",
  "Segundo Bloque",
  "Furia Extendido",
  "Primera Era",
];

export const MYL_EDITIONS = [
  // ---- Primer Bloque ----
  "espada-sagrada",
  "cruzadas",
  "helenica",
  "imperio",
  "dominios-de-ra",
  "encrucijada",
  "hijos_de_daana",
  "tierras_altas",
  // ---- Imperio (Bestiarium en adelante) ----
  "bestiarium",
  "secretos_arcanos",
  "lootbox_2024",
  "toolkit_hielo_inmortal",
  "toolkit_cenizas_de_fuego",
  "onyria",
  "libertadores",
  "kvsm_titanes",
  "dia_de_muertos",
  "ritual_vudu",
  "chile_oculto",
  "ayd_vigilantes",
  "mazo_imp_dragon",
  "mazo_imp_eterno",
  "mazo_imp_guerrero",
  // ---- Resto del catálogo ----
  "raciales_imp_2024",
  "giger",
  "zodiaco",
  "amenazakaiju",
  "escuadronmecha",
  "furia",
  "sumeria",
  "rebelion",
  "asgard",
  "midgard",
  "camelot",
  "templarios",
  "bushido",
  "sol-naciente",
  "dominio",
  "contraataque",
  "aguila-imperial",
  "steampunk",
  "axis-mundi",
  "hijos-del-sol",
  "kemet",
  "dharma",
  "olimpia",
  "calavera",
  "kilimanjaro",
  "arsenal",
  "tinta-inmortal",
  "terrores-nocturnos",
  "invasion-oscura",
  "dinastia-del-dragon",
  "hermanos-grimm",
  "keltoi",
  "cuentos-de-ultratumba",
  "tierra-austral",
  "conjuros",
  "angeles-demonios",
  "ajedrez",
  "acero",
  "el_reto",
  "mundo_gotico",
  "ragnarok",
  "despertar_gotico",
  "explorandum",
  "leyendas_segundo_bloque",
  "roma",
  "valhalla",
  "excalibur",
  "guerrero_jaguar",
  "hordas",
  "la_venganza_de_horus",
  "troya",
  "napoleon",
  "guerreros_del_sol",
  "espiritu_samurai",
  "guardianes_de_daana",
  "leyendas_primera_era",
];

/** La propia API marca el formato en el título: "IMP - Bestiarium". */
const PREFIJOS: Record<string, string> = {
  "IMP": "Imperio",
  "2B": "Segundo Bloque",
  "FX": "Furia Extendido",
  "PE": "Primera Era",
  "PB": "Primer Bloque",
};

function parseTitulo(titulo: string, slug: string) {
  const m = titulo.match(/^([A-Z0-9]{2,3})\s*-\s*(.+)$/);
  const limpio = m && PREFIJOS[m[1]] ? m[2].trim() : titulo;

  // Primer Bloque manda: es una lista cerrada y verificada.
  if (PRIMER_BLOQUE.includes(slug)) return { title: limpio, formato: "Primer Bloque" };

  // Imperio va desde Bestiarium en adelante. La API marca "IMP -" también en
  // temporadas ya rotadas (Napoleón, La Venganza de Horus), así que no basta
  // con el prefijo: solo cuenta lo que esté en la lista vigente.
  if (m && PREFIJOS[m[1]] === "Imperio") {
    return { title: limpio, formato: IMPERIO.includes(slug) ? "Imperio" : null };
  }
  if (IMPERIO.includes(slug)) return { title: limpio, formato: "Imperio" };

  if (m && PREFIJOS[m[1]]) return { title: limpio, formato: PREFIJOS[m[1]] };
  return { title: limpio, formato: null };
}

interface MylCard {
  id: string;
  edid: string;
  slug: string;
  name: string;
  rarity?: string;
  type?: string;
  cost?: string;
  ability?: string;
  ed_edid: string;
  ed_slug: string;
}

interface MylResponse {
  status: string;
  cards?: MylCard[];
  rarities?: Array<{ id: string; name: string }>;
  types?: Array<{ id: string; name: string }>;
  edition?: { id: string; slug: string; title: string };
}

interface EditionData {
  slug: string;
  title: string;
  formato: string | null;
  cards: MylCard[];
  rarities: Map<string, string>;
  types: Map<string, string>;
}

let cache: { at: number; ttl: number; editions: Map<string, EditionData> } | null = null;
const TTL = 1000 * 60 * 60 * 24;
/** Si la carga quedó incompleta se reintenta pronto en vez de esperar 24h. */
const PARTIAL_TTL = 1000 * 60 * 5;

async function loadAll(): Promise<Map<string, EditionData>> {
  if (cache && Date.now() - cache.at < cache.ttl) return cache.editions;

  const editions = new Map<string, EditionData>();
  const LOTE = 6;

  for (let i = 0; i < MYL_EDITIONS.length; i += LOTE) {
    const results = await Promise.allSettled(
      MYL_EDITIONS.slice(i, i + LOTE).map((slug) =>
        fetchJson<MylResponse>(
          `https://api.myl.cl/cards/edition/${slug}`,
          {},
          60 * 60 * 24,
          2
        ).then((r) => ({ slug, r }))
      )
    );

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { slug, r } = result.value;
      if (r.status !== "OK" || !r.cards) continue;
      const { title, formato } = parseTitulo(r.edition?.title ?? slug, slug);
      editions.set(slug, {
        slug,
        title,
        formato,
        cards: r.cards,
        rarities: new Map((r.rarities ?? []).map((x) => [x.id, x.name])),
        types: new Map((r.types ?? []).map((x) => [x.id, x.name])),
      });
    }
  }

  // Si cargó todo, se cachea 24h. Si cargó solo una porción razonable (la API
  // de MyL se cae de a ratos), se cachea poco tiempo para reintentar pronto en
  // vez de servir un catálogo incompleto durante todo un día. Por debajo del
  // umbral no se cachea nada, para no repetir un mal momento en cada consulta.
  if (editions.size === MYL_EDITIONS.length) {
    cache = { at: Date.now(), ttl: TTL, editions };
  } else if (editions.size >= MYL_EDITIONS.length * 0.7) {
    cache = { at: Date.now(), ttl: PARTIAL_TTL, editions };
  }
  return editions;
}

export function mylImageUrl(editionId: string, cardNumber: string): string {
  return `https://api.myl.cl/static/cards/${editionId}/${cardNumber}.png`;
}

function titleCase(name: string): string {
  return name.replace(/\b\w/g, (m) => m.toUpperCase());
}

export const mylProvider: CardProvider = {
  async search(query, limit) {
    let editions: Map<string, EditionData>;
    try {
      editions = await loadAll();
    } catch {
      return [];
    }

    // MyL guarda los nombres sin tildes y con la "ñ" borrada en vez de
    // convertida ("bretaña" quedó como "bretaa"), así que probamos ambas
    // variantes. Se descompone primero porque la ñ puede llegar precompuesta
    // (U+00F1) o como "n" + tilde combinante, según el navegador.
    const sinEnie = query.normalize("NFD").replace(/ñ/gi, "");
    const variantes = [...new Set([normalize(query), normalize(sinEnie)])];

    const coincide = (nombre: string) =>
      variantes.reduce<number>((mejor, q) => {
        let score = -1;
        if (nombre === q) score = 0;
        else if (nombre.startsWith(q)) score = 1;
        else if (nombre.includes(q)) score = 2;
        if (score < 0) return mejor;
        return mejor < 0 ? score : Math.min(mejor, score);
      }, -1);

    const scored: Array<{ score: number; card: CardResult }> = [];

    for (const data of editions.values()) {
      for (const c of data.cards) {
        const score = coincide(normalize(c.name ?? ""));
        if (score < 0) continue;

        scored.push({
          score,
          card: {
            externalId: `myl-${c.ed_slug}-${c.edid}`,
            name: titleCase(c.name),
            imageUrl: mylImageUrl(c.ed_edid, c.edid),
            imageLarge: mylImageUrl(c.ed_edid, c.edid),
            setName: data.title,
            setCode: c.ed_slug,
            cardNumber: c.edid,
            code: `${data.title} Nº${c.edid}`,
            rarity: c.rarity ? data.rarities.get(c.rarity) : undefined,
            game: "myl",
            extra: [c.type ? data.types.get(c.type) : null, data.formato]
              .filter(Boolean)
              .join(" · "),
          },
        });
      }
    }

    return scored
      .sort(
        (a, b) =>
          a.score - b.score ||
          a.card.name.localeCompare(b.card.name) ||
          (a.card.setName ?? "").localeCompare(b.card.setName ?? "")
      )
      .slice(0, limit)
      .map((x) => x.card);
  },
};
