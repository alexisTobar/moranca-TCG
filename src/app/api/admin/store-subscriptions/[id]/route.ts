import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth";
import { adminSubscriptionActionSchema } from "@/lib/validators";
import { applyPlanPeriod } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** El administrador aprueba (activa o extiende la tienda) o rechaza un pago de membresía. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const parsed = adminSubscriptionActionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }
    const { action, note } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // Cambio condicional: si dos administradores lo aprueban a la vez, solo uno se aplica.
      const claimed = await tx.storeSubscription.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: action === "approve" ? "APPROVED" : "REJECTED",
          reviewedById: admin.id,
          reviewedAt: new Date(),
          note: note?.trim() || null,
        },
      });
      if (claimed.count === 0) return null;

      if (action === "approve") {
        const sub = await tx.storeSubscription.findUniqueOrThrow({
          where: { id },
          select: { storeId: true, planId: true, months: true },
        });
        const period = await applyPlanPeriod(tx, sub.storeId, sub.planId, sub.months);
        await tx.storeSubscription.update({
          where: { id },
          data: { periodStart: period.start, periodEnd: period.end },
        });
        return { activeUntil: period.end };
      }
      return { activeUntil: null };
    });

    if (!result) {
      return NextResponse.json({ error: "Esta solicitud ya fue revisada." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/store-subscriptions:PATCH]", error);
    return NextResponse.json({ error: "No se pudo procesar la solicitud" }, { status: 500 });
  }
}
