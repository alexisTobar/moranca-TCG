import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["resolve", "dismiss"]),
  note: z.string().trim().max(500).optional().nullable(),
  /** Al resolver un reporte de publicación: pausarla. */
  pauseListing: z.boolean().optional(),
  /** Al resolver un reporte de usuario: suspender la cuenta. */
  suspendUser: z.boolean().optional(),
});

/** El administrador resuelve o descarta un reporte, con la opción de pausar la publicación o suspender la cuenta. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    const { action, note, pauseListing, suspendUser } = parsed.data;

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });

    // Se valida la medida ANTES de cerrar el reporte: si es inválida, el reporte sigue abierto.
    if (action === "resolve" && report.targetType === "USER" && suspendUser) {
      const target = await prisma.user.findUnique({ where: { id: report.targetId }, select: { role: true } });
      if (target?.role === "ADMIN") {
        return NextResponse.json({ error: "No se puede suspender a un administrador desde un reporte." }, { status: 400 });
      }
    }

    // Cambio condicional: si dos administradores lo cierran a la vez, solo uno se aplica.
    const claimed = await prisma.report.updateMany({
      where: { id, status: "OPEN" },
      data: {
        status: action === "resolve" ? "RESOLVED" : "DISMISSED",
        resolution: note?.trim() || null,
        resolvedById: admin.id,
        resolvedAt: new Date(),
      },
    });
    if (claimed.count === 0) return NextResponse.json({ error: "Este reporte ya fue revisado." }, { status: 409 });

    const effects: string[] = [];
    if (action === "resolve") {
      if (report.targetType === "LISTING" && pauseListing) {
        await prisma.listing.updateMany({ where: { id: report.targetId }, data: { status: "PAUSED" } });
        effects.push("publicación pausada");
      }
      if (report.targetType === "USER" && suspendUser) {
        await prisma.user.updateMany({ where: { id: report.targetId }, data: { active: false, tokenVersion: { increment: 1 } } });
        effects.push("cuenta suspendida");
      }
    }

    await audit(admin, `report.${action}`, {
      type: report.targetType === "LISTING" ? "Listing" : "User",
      id: report.targetId,
      detail: [report.reason, ...effects, note?.trim()].filter(Boolean).join(" · "),
    });
    return NextResponse.json({ ok: true, effects });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/reports:PATCH]", error);
    return NextResponse.json({ error: "No se pudo actualizar el reporte" }, { status: 500 });
  }
}
