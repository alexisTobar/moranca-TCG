import { NextResponse } from "next/server";
import { searchCards } from "@/lib/providers";
import { isGameId, GAME_LIST, type GameId } from "@/lib/games";
import { getSession } from "@/lib/auth";
import { memoryRateLimit, clientKey } from "@/lib/rate-limit";
import { usdToClp, toClp } from "@/lib/fx";

export const runtime = "nodejs";

const MAX_RESULTS = 120;
const GAME_IDS = GAME_LIST.map((g) => g.id) as GameId[];
const MAGIC_COLORS = new Set(["w", "u", "b", "r", "g", "c"]);

export async function GET(req: Request) {
  // Basta con validar la firma del token: buscar cartas es solo lectura y no
  // justifica una consulta a la base de datos en cada tecla escrita.
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game") ?? "";
  const q = (searchParams.get("q") ?? "").slice(0, 80);
  const formato = searchParams.get("format") ?? "";
  const colorParam = (searchParams.get("color") ?? "").toLowerCase();
  const editionParam = (searchParams.get("edition") ?? "").toLowerCase();
  const limit = Math.min(
    MAX_RESULTS,
    Math.max(1, Number(searchParams.get("limit") ?? 60))
  );

  if (!isGameId(game)) {
    return NextResponse.json({ error: "Juego no soportado" }, { status: 400 });
  }

  // Magic acepta filtrar por color y edición directo en la sintaxis de
  // Scryfall, incluso sin nombre — "c:r set:war" es una búsqueda válida sola.
  let searchTerm = q.trim();
  if (game === "magic") {
    const color = MAGIC_COLORS.has(colorParam) ? colorParam : "";
    const edition = /^[a-z0-9]{2,6}$/.test(editionParam) ? editionParam : "";
    searchTerm = [searchTerm, color && `c:${color}`, edition && `set:${edition}`]
      .filter(Boolean)
      .join(" ");
  }

  if (searchTerm.length < 2) {
    return NextResponse.json({ results: [], usdClp: null });
  }

  const limiter = memoryRateLimit(clientKey(req, `cards:${session.sub}`), 90, 60);
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiadas búsquedas seguidas, espera unos segundos." },
      { status: 429 }
    );
  }

  try {
    // Con filtro de formato pedimos de más y recortamos después, para que el
    // límite se aplique sobre lo ya filtrado y no antes.
    const [crudos, rate] = await Promise.all([
      searchCards(game, searchTerm, formato ? 500 : limit),
      usdToClp(),
    ]);

    const found = (
      formato ? crudos.filter((c) => c.extra?.includes(formato)) : crudos
    ).slice(0, limit);

    // Si el juego elegido no tiene resultados, revisamos los otros para poder
    // ofrecer "esta carta está en One Piece" en vez de un vacío sin explicación.
    if (found.length === 0) {
      const others = GAME_IDS.filter((g) => g !== game);
      const counts = await Promise.all(
        others.map(async (g) => {
          try {
            const hits = await searchCards(g, q, 12);
            return { game: g, count: hits.length, sample: hits[0]?.imageUrl ?? null };
          } catch {
            return { game: g, count: 0, sample: null };
          }
        })
      );

      return NextResponse.json({
        results: [],
        total: 0,
        usdClp: Math.round(rate),
        suggestions: counts.filter((c) => c.count > 0),
      });
    }

    // El precio referencial se convierte a pesos en el servidor para que el
    // formulario pueda sugerirlo directamente.
    const results = found.map((card) => ({
      ...card,
      priceClp: card.priceUsd ? toClp(card.priceUsd, rate) : null,
      priceClpFoil: card.priceUsdFoil ? toClp(card.priceUsdFoil, rate) : null,
    }));

    return NextResponse.json({
      results,
      total: results.length,
      truncated: results.length >= limit,
      usdClp: Math.round(rate),
    });
  } catch (error) {
    console.error("[cards/search]", error);
    return NextResponse.json(
      { error: "El catálogo externo no respondió. Intenta nuevamente." },
      { status: 502 }
    );
  }
}
