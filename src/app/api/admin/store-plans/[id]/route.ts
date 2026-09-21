import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth";
import { storePlanUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** El administrador cambia precio, beneficios o disponibilidad de un plan. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const parsed = storePlanUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const plan = await prisma.storePlan.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.priceMonthly !== undefined ? { priceMonthly: data.priceMonthly } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.maxFeatured !== undefined ? { maxFeatured: data.maxFeatured } : {}),
        ...(data.advancedStats !== undefined ? { advancedStats: data.advancedStats } : {}),
        ...(data.showcase !== undefined ? { showcase: data.showcase } : {}),
      },
    });
    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }
    console.error("[admin/store-plans:PATCH]", error);
    return NextResponse.json({ error: "No se pudo guardar el plan" }, { status: 500 });
  }
}
