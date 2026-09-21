import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Estado del sitio para monitores de disponibilidad (UptimeRobot, Better Stack…): responde 200 si la base contesta. */
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: true, ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[health] base de datos", error);
    return NextResponse.json({ ok: false, db: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
