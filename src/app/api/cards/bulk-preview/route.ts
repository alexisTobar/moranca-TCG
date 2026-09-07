import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { bulkPreviewSchema } from "@/lib/validators";
import { memoryRateLimit, clientKey } from "@/lib/rate-limit";
import { parseDecklist } from "@/lib/decklist";
import {
  fetchMagicCollection,
  magicCardToResult,
  magicCollectionKey,
} from "@/lib/providers/magic";
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
      if (!card) {
        return {
          raw: e.raw,
          quantity: e.quantity,
          isFoil: e.isFoil,
          matched: false,
          title: e.name,
          imageUrl: null,
          setName: null,
          cardNumber: null,
          rarity: null,
          externalId: null,
          priceUsd: null,
          priceClp: null,
          error: `No se encontró ${e.setCode.toUpperCase()} #${e.collectorNumber} en Scryfall.`,
        };
      }

      const result = magicCardToResult(card);
      // Si la impresión no tiene precio para la variante pedida (ej. una carta
      // sin versión foil), se usa la otra variante como mejor referencia.
      const priceUsd = e.isFoil
        ? (result.priceUsdFoil ?? result.priceUsd)
        : (result.priceUsd ?? result.priceUsdFoil);

      return {
        raw: e.raw,
        quantity: e.quantity,
        isFoil: e.isFoil,
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
          priceUsd == null
            ? "Sin precio de referencia; ingresa uno antes de publicar."
            : null,
      };
    });

    return NextResponse.json({
      items,
      unrecognized,
      usdClp: Math.round(rate),
      totals: {
        lines: entries.length,
        matched: items.filter((i) => i.matched).length,
        noPrice: items.filter((i) => i.matched && i.priceClp == null).length,
        notFound: items.filter((i) => !i.matched).length,
      },
    });
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
