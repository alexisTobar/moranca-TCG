import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { couponUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadOwnedCoupon(id: string, userId: string, isAdmin: boolean) {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) return { error: "Cupón no encontrado", status: 404 as const };
  if (!isAdmin && coupon.sellerId !== userId) {
    return { error: "No puedes modificar este cupón", status: 403 as const };
  }
  return { coupon };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const owned = await loadOwnedCoupon(id, user.id, user.role === "ADMIN");
    if ("error" in owned) {
      return NextResponse.json({ error: owned.error }, { status: owned.status });
    }

    const parsed = couponUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const data = parsed.data;
    if (data.type === "PERCENT" && data.value !== undefined && data.value > 100) {
      return NextResponse.json(
        { error: "El porcentaje no puede superar 100%" },
        { status: 400 }
      );
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.value !== undefined ? { value: data.value } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
    return NextResponse.json({ ok: true, coupon: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Ya tienes un cupón con ese código." }, { status: 409 });
    }
    console.error("[seller/coupons/[id]:PATCH]", error);
    return NextResponse.json({ error: "No se pudo actualizar el cupón" }, { status: 500 });
  }
}
