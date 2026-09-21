import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth";
import { adminStoreActionSchema } from "@/lib/validators";
import { applyPlanPeriod, ensureDefaultPlans } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Acciones del administrador sobre una tienda: regalar/extender, suspender, reanudar, cortar, destacar. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const parsed = adminStoreActionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }
    const data = parsed.data;

    const store = await prisma.store.findUnique({ where: { id }, select: { id: true, seller: { select: { role: true } } } });
    if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

    // La cuenta de administrador tiene el plan Pro incluido: no se regala, suspende ni corta.
    if (store.seller.role === "ADMIN" && data.action !== "feature") {
      return NextResponse.json(
        { error: "La cuenta de administrador tiene el plan Pro incluido y no se puede modificar." },
        { status: 409 }
      );
    }

    switch (data.action) {
      case "grant": {
        await ensureDefaultPlans();
        const plan = await prisma.storePlan.findUnique({ where: { code: data.planCode } });
        if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
        await prisma.$transaction(async (tx) => {
          const period = await applyPlanPeriod(tx, store.id, plan.id, data.months);
          // Queda registrado como una suscripción aprobada sin cobro, para el historial.
          await tx.storeSubscription.create({
            data: {
              storeId: store.id,
              planId: plan.id,
              months: data.months,
              amount: 0,
              status: "APPROVED",
              reference: "CORTESIA",
              note: data.note?.trim() || "Cortesía del administrador",
              reviewedById: admin.id,
              reviewedAt: new Date(),
              periodStart: period.start,
              periodEnd: period.end,
            },
          });
        });
        break;
      }
      case "suspend":
        await prisma.store.update({ where: { id }, data: { status: "SUSPENDED" } });
        break;
      case "resume":
        await prisma.store.update({ where: { id }, data: { status: "ACTIVE" } });
        break;
      case "revoke":
        await prisma.store.update({ where: { id }, data: { activeUntil: new Date(), featured: false } });
        break;
      case "feature":
        await prisma.store.update({ where: { id }, data: { featured: data.value } });
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/stores:PATCH]", error);
    return NextResponse.json({ error: "No se pudo completar la acción" }, { status: 500 });
  }
}
