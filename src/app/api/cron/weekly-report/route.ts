import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usageSummary } from "@/lib/usage";
import { previousWeek } from "@/lib/usage-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { start, end } = previousWeek();
    const data = await usageSummary(start, end);
    // Una ejecución repetida no altera el informe cerrado de esa semana.
    await prisma.usageReport.upsert({ where: { weekStart: start }, create: { weekStart: start, weekEnd: end, data }, update: {} });
    await prisma.usageEvent.deleteMany({ where: { day: { lt: new Date(Date.now() - 90 * 86400000) } } });
    await prisma.usageReport.deleteMany({ where: { weekStart: { lt: new Date(Date.now() - 364 * 86400000) } } });
    const consentCutoff = new Date();
    consentCutoff.setUTCFullYear(consentCutoff.getUTCFullYear() - 2);
    await prisma.consentRecord.deleteMany({ where: { createdAt: { lt: consentCutoff } } });
    return NextResponse.json({ ok: true, weekStart: start.toISOString() });
  } catch (error) {
    console.error("[weekly-report]", error);
    return NextResponse.json({ error: "No se pudo generar el informe semanal" }, { status: 503 });
  }
}
