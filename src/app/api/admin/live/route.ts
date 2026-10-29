import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Actividad en vivo (solo administración): visitantes con estadísticas aceptadas y búsquedas recientes, sin identificar a nadie. */
export async function GET() {
  try {
    await requireAdmin();
    const now = Date.now();
    const fiveMin = new Date(now - 5 * 60_000);
    const hour = new Date(now - 60 * 60_000);
    const day = new Date(now - 24 * 3_600_000);
    const [visitors, pages, recent, top, empty] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(DISTINCT visitor) AS count FROM "UsageEvent" WHERE "createdAt" >= ${fiveMin}`,
      prisma.usageEvent.groupBy({ by: ["page"], where: { createdAt: { gte: fiveMin } }, _count: { _all: true }, orderBy: { _count: { page: "desc" } }, take: 6 }),
      prisma.searchEvent.findMany({ where: { createdAt: { gte: hour } }, orderBy: { createdAt: "desc" }, take: 15, select: { id: true, term: true, game: true, results: true, createdAt: true } }),
      prisma.searchEvent.groupBy({ by: ["term"], where: { createdAt: { gte: day } }, _count: { _all: true }, orderBy: { _count: { term: "desc" } }, take: 10 }),
      prisma.searchEvent.groupBy({ by: ["term"], where: { createdAt: { gte: day }, results: 0 }, _count: { _all: true }, orderBy: { _count: { term: "desc" } }, take: 5 }),
    ]);
    return NextResponse.json(
      {
        at: new Date(now).toISOString(),
        visitors: Number(visitors[0]?.count ?? 0),
        pages: pages.map((p) => ({ page: p.page, views: p._count._all })),
        recent: recent.map((r) => ({ id: r.id, term: r.term, game: r.game, results: r.results, at: r.createdAt.toISOString() })),
        top: top.map((t) => ({ term: t.term, count: t._count._all })),
        empty: empty.map((t) => ({ term: t.term, count: t._count._all })),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[admin/live]", error);
    return NextResponse.json({ error: "No se pudo leer la actividad" }, { status: 503 });
  }
}
