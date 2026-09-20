import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { memoryRateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sugerencias del buscador: publicaciones activas cuyo nombre o edición
 * coincide con lo que se va escribiendo. Es público (lo usa cualquier visitante)
 * y solo devuelve datos que ya se muestran en el catálogo.
 */
export async function GET(req: Request) {
  const limiter = memoryRateLimit(clientKey(req, "suggest"), 90, 60);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Demasiadas búsquedas, espera un momento." }, { status: 429 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ ok: true, results: [], total: 0 });

  try {
    const where = {
      status: "ACTIVE" as const,
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { setName: { contains: q, mode: "insensitive" as const } },
        { cardNumber: { contains: q, mode: "insensitive" as const } },
      ],
    };

    const [rows, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        select: {
          slug: true,
          title: true,
          game: true,
          type: true,
          imageUrl: true,
          price: true,
          offerPrice: true,
          stock: true,
          setName: true,
          condition: true,
          isFoil: true,
        },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        take: 24,
      }),
      prisma.listing.count({ where }),
    ]);

    // Primero lo que se puede comprar ahora, después lo agotado.
    const results = [...rows.filter((r) => r.stock > 0), ...rows.filter((r) => r.stock <= 0)]
      .slice(0, 7)
      .map((r) => ({
        slug: r.slug,
        title: r.title,
        game: r.game,
        type: r.type,
        imageUrl: r.imageUrl,
        price: r.offerPrice != null && r.offerPrice < r.price ? r.offerPrice : r.price,
        stock: r.stock,
        setName: r.setName,
        condition: r.condition,
        isFoil: r.isFoil,
      }));

    return NextResponse.json({ ok: true, results, total });
  } catch (error) {
    console.error("[search/suggest]", error);
    return NextResponse.json({ ok: true, results: [], total: 0 });
  }
}
