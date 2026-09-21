import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { getPanelCounts } from "@/lib/panel-counts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Contadores de avisos del panel (los consulta la campana cada cierto tiempo). */
export async function GET() {
  try {
    const user = await requireUser();
    if (user.role === "BUYER") return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    return NextResponse.json(await getPanelCounts(user), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "No se pudieron cargar los avisos" }, { status: 500 });
  }
}
