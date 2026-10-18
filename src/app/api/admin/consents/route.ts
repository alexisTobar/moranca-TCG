import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const cursor = new URL(req.url).searchParams.get("cursor");
    if (new URL(req.url).searchParams.get("kind") === "legacy") {
      const records = await prisma.user.findMany({ where: { termsAcceptedAt: { not: null } }, select: { id: true, name: true, email: true, termsAcceptedAt: true, termsVersion: true }, orderBy: { id: "asc" }, take: 1000, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
      return NextResponse.json({ generatedAt: new Date().toISOString(), source: "User.termsAcceptedAt", records, nextCursor: records.length === 1000 ? records.at(-1)?.id : null, note: "Siguiente página: ?kind=legacy&cursor=nextCursor. Campos históricos; no acreditan la existencia de un evento detallado." }, { headers: { "Cache-Control": "no-store", "Content-Disposition": 'attachment; filename="aceptaciones-cuentas.json"' } });
    }
    const records = await prisma.consentRecord.findMany({ take: 1000, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    return NextResponse.json({ generatedAt: new Date().toISOString(), records, nextCursor: records.length === 1000 ? records.at(-1)?.id : null, note: "Para continuar la descarga usa ?cursor=nextCursor. Las fechas están en UTC." }, { headers: { "Cache-Control": "no-store", "Content-Disposition": 'attachment; filename="consentimientos.json"' } });
  } catch (err) { return NextResponse.json({ error: err instanceof AuthError ? err.message : "No se pudo generar el respaldo." }, { status: err instanceof AuthError ? err.status : 503 }); }
}
