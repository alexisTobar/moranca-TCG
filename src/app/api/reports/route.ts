import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { containsProfanity } from "@/lib/profanity";
import { notifyAdmins } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPORT_REASONS = ["FALSIFICADO", "ENGANOSO", "PRECIO", "FRAUDE", "INAPROPIADO", "OTRO"] as const;

const schema = z.object({
  targetType: z.enum(["LISTING", "USER"]),
  targetId: z.string().min(5).max(60),
  reason: z.enum(REPORT_REASONS),
  detail: z.string().trim().max(1000).optional().nullable(),
});

/** Cualquier persona con sesión puede reportar una publicación o a un usuario. Lo revisa el administrador. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const limiter = await rateLimit(clientKey(req, `report:${user.id}`), 10, 3600);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Has enviado muchos reportes seguidos. Intenta más tarde." }, { status: 429 });
    }
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    const { targetType, targetId, reason, detail } = parsed.data;
    if (detail && containsProfanity(detail)) {
      return NextResponse.json({ error: "Evita groserías o lenguaje ofensivo en el detalle." }, { status: 400 });
    }

    let label: string;
    if (targetType === "LISTING") {
      const l = await prisma.listing.findUnique({ where: { id: targetId }, select: { title: true, sellerId: true } });
      if (!l) return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
      if (l.sellerId === user.id) return NextResponse.json({ error: "No puedes reportar tu propia publicación" }, { status: 400 });
      label = `publicación “${l.title}”`;
    } else {
      const u = await prisma.user.findUnique({ where: { id: targetId }, select: { name: true } });
      if (!u) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      if (targetId === user.id) return NextResponse.json({ error: "No puedes reportarte a ti mismo" }, { status: 400 });
      label = `usuario ${u.name}`;
    }

    const dup = await prisma.report.findFirst({
      where: { reporterId: user.id, targetType, targetId, status: "OPEN" },
      select: { id: true },
    });
    if (dup) return NextResponse.json({ error: "Ya reportaste esto y lo estamos revisando. ¡Gracias!" }, { status: 409 });

    await prisma.report.create({
      data: { reporterId: user.id, targetType, targetId, reason, detail: detail?.trim() || null },
    });
    await notifyAdmins(`Nuevo reporte: ${label}`, [`Motivo: ${reason}`, detail?.trim() || "Sin detalle."], "/panel/reportes");

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[reports:POST]", error);
    return NextResponse.json({ error: "No se pudo enviar el reporte" }, { status: 500 });
  }
}
