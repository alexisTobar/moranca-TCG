import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { usageSummary } from "@/lib/usage";
import { utcDay } from "@/lib/usage-policy";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const week = new URL(req.url).searchParams.get("week");
    let data;
    if (week) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !Number.isFinite(Date.parse(week))) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
      data = (await prisma.usageReport.findUnique({ where: { weekStart: new Date(`${week}T00:00:00Z`) } }))?.data;
      if (!data) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
    } else {
      const end = new Date(utcDay().getTime() + 86400000);
      data = await usageSummary(new Date(end.getTime() - 30 * 86400000), end);
    }
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store", "Content-Disposition": 'attachment; filename="informe-uso.json"' } });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "No se pudo obtener la analítica" }, { status: 503 });
  }
}
