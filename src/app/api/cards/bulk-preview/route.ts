import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { bulkPreviewSchema } from "@/lib/validators";
import { memoryRateLimit, clientKey } from "@/lib/rate-limit";
import { parseDecklist, parseOnePieceList, parsePokemonList } from "@/lib/decklist";
import {
  fetchMagicCollection,
  magicCardToResult,
  magicCollectionKey,
} from "@/lib/providers/magic";
import { onePieceByCodes } from "@/lib/providers/onepiece";
import { pokemonByPtcgo } from "@/lib/providers/pokemon";
import type { CardResult } from "@/lib/providers/types";
import { usdToClp, toClp } from "@/lib/fx";

export const runtime = "nodejs";

export interface BulkPreviewItem {
  raw: string;
  quantity: number;
  isFoil: boolean;
  matched: boolean;
  title: string;
  imageUrl: string | null;
  setName: string | null;
  cardNumber: string | null;
  rarity: string | null;
  externalId: string | null;
  priceUsd: number | null;
  priceClp: number | null;
  error: string | null;
}

/** Arma la fila de vista previa a partir de una carta encontrada en el catálogo. */
function matchedItem(
  raw: string,
  quantity: number,
  isFoil: boolean,
  result: CardResult,
  rate: number
): BulkPreviewItem {
  // Si la impresión no tiene precio para la variante pedida (ej. una carta
  // sin versión foil), se usa la otra variante como mejor referencia.
  const priceUsd = isFoil
    ? (result.priceUsdFoil ?? result.priceUsd)
    : (result.priceUsd ?? result.priceUsdFoil);

  return {
    raw,
    quantity,
    isFoil,
    matched: true,
    title: result.code ? `${result.name} · ${result.code}` : result.name,
    imageUrl: result.imageLarge ?? result.imageUrl,
    setName: result.setName ?? null,
    cardNumber: result.cardNumber ?? null,
    rarity: result.rarity ?? null,
    externalId: result.externalId,
    priceUsd: priceUsd ?? null,
    priceClp: priceUsd != null ? toClp(priceUsd, rate) : null,
    error:
      priceUsd == null ? "Sin precio de referencia; ingresa uno antes de publicar." : null,
  };
}

function notFoundItem(raw: string, quantity: number, isFoil: boolean, title: string, error: string): BulkPreviewItem {
  return {
    raw,
    quantity,
    isFoil,
    matched: false,
    title,
    imageUrl: null,
    setName: null,
    cardNumber: null,
    rarity: null,
    externalId: null,
    priceUsd: null,
    priceClp: null,
    error,
  };
}

function summarize(items: BulkPreviewItem[], unrecognized: string[], rate: number) {
  return {
    items,
    unrecognized,
    usdClp: Math.round(rate),
    totals: {
      lines: items.length,
      matched: items.filter((i) => i.matched).length,
      noPrice: items.filter((i) => i.matched && i.priceClp == null).length,
      notFound: items.filter((i) => !i.matched).length,
    },
  };
}

const MAX_LOOKUPS = 80;

/** Pokémon TCG Live y One Piece: buscan en su catálogo por código exacto. */
async function previewOtherGame(game: "pokemon" | "onepiece", text: string) {
  const parsed = game === "pokemon" ? parsePokemonList(text) : parseOnePieceList(text);
  if (parsed.entries.length === 0) {
    return NextResponse.json(
      {
        error:
          game === "pokemon"
            ? "No se reconoció ninguna línea. Usa el formato de Pokémon TCG Live: 4 Pikachu ex SVI 57."
            : "No se reconoció ninguna línea. Usa el código de cada carta: 4xOP01-024.",
      },
      { status: 400 }
    );
  }

  const rate = await usdToClp();
  const items: BulkPreviewItem[] = [];

  if (game === "onepiece") {
    const codes = [...new Set(parsed.entries.map((e) => e.number))];
    const found = await onePieceByCodes(codes);
    for (const e of parsed.entries) {
      const card = found.get(e.number.toLowerCase());
      items.push(
        card
          ? matchedItem(e.raw, e.quantity, e.isFoil, card, rate)
          : notFoundItem(e.raw, e.quantity, e.isFoil, e.name, `No se encontró ${e.number} en el catálogo de One Piece.`)
      );
    }
    return NextResponse.json(summarize(items, parsed.unrecognized, rate));
  }

  // Pokémon: una consulta por carta distinta, de a pocas a la vez para no saturar la API.
  const keys = [...new Set(parsed.entries.map((e) => `${e.setCode}|${e.number}`))];
  if (keys.length > MAX_LOOKUPS) {
    return NextResponse.json(
      { error: `La lista tiene ${keys.length} cartas distintas. Súbela en partes de hasta ${MAX_LOOKUPS}.` },
      { status: 400 }
    );
  }
  const found = new Map<string, CardResult | null>();
  for (let i = 0; i < keys.length; i += 4) {
    await Promise.all(
      keys.slice(i, i + 4).map(async (key) => {
        const [setCode, number] = key.split("|");
        found.set(key, await pokemonByPtcgo(setCode, number));
      })
    );
  }
  for (const e of parsed.entries) {
    const card = found.get(`${e.setCode}|${e.number}`);
    items.push(
      card
        ? matchedItem(e.raw, e.quantity, e.isFoil, card, rate)
        : notFoundItem(e.raw, e.quantity, e.isFoil, e.name, `No se encontró ${e.setCode} ${e.number} en el catálogo de Pokémon.`)
    );
  }
  return NextResponse.json(summarize(items, parsed.unrecognized, rate));
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = bulkPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const limiter = memoryRateLimit(clientKey(req, `bulk-preview:${user.id}`), 10, 60);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Demasiadas cargas seguidas, espera unos segundos." },
        { status: 429 }
      );
    }

    if (parsed.data.game !== "magic") {
      return await previewOtherGame(parsed.data.game, parsed.data.text);
    }

    const { entries, unrecognized } = parseDecklist(parsed.data.text);
    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No se reconoció ninguna línea con el formato esperado." },
        { status: 400 }
      );
    }

    const identifiers = [
      ...new Map(
        entries.map((e) => [
          magicCollectionKey(e.setCode, e.collectorNumber),
          { setCode: e.setCode, collectorNumber: e.collectorNumber },
        ])
      ).values(),
    ];

    const [{ found }, rate] = await Promise.all([
      fetchMagicCollection(identifiers),
      usdToClp(),
    ]);

    const items: BulkPreviewItem[] = entries.map((e) => {
      const card = found.get(magicCollectionKey(e.setCode, e.collectorNumber));
      return card
        ? matchedItem(e.raw, e.quantity, e.isFoil, magicCardToResult(card), rate)
        : notFoundItem(
            e.raw,
            e.quantity,
            e.isFoil,
            e.name,
            `No se encontró ${e.setCode.toUpperCase()} #${e.collectorNumber} en Scryfall.`
          );
    });

    return NextResponse.json(summarize(items, unrecognized, rate));
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[cards/bulk-preview]", error);
    return NextResponse.json(
      { error: "No se pudo procesar el archivo. Intenta nuevamente." },
      { status: 502 }
    );
  }
}
