import { NextResponse } from "next/server";
import { isGameId } from "@/lib/games";
import { cardText } from "@/lib/card-text";
import { clientKey, memoryRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Habilidad de una carta (en inglés y español) para el visor de la lista del
 * mazo. Público: es el mismo texto impreso en la carta. Se cachea en la CDN
 * porque el texto de una carta no cambia.
 */
export async function GET(req: Request) {
  if (!memoryRateLimit(clientKey(req, "card-text"), 60, 60).allowed) {
    return NextResponse.json({ error: "Demasiadas consultas" }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game") ?? "";
  const id = (searchParams.get("id") ?? "").slice(0, 80);
  if (!isGameId(game) || !/^[\w.\-]+$/.test(id)) {
    return NextResponse.json({ error: "Carta no válida" }, { status: 400 });
  }

  const card = await cardText(game, id);
  if (!card) return NextResponse.json({ error: "Sin texto para esta carta" }, { status: 404 });
  return NextResponse.json(card, {
    headers: {
      "Cache-Control": card.textEs || !card.text
        ? "public, max-age=3600, s-maxage=2592000, stale-while-revalidate=86400"
        : "public, max-age=60, s-maxage=300",
    },
  });
}
