import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { couponSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role !== "SELLER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const coupons = await prisma.coupon.findMany({
      where: { sellerId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, coupons });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[seller/coupons:GET]", error);
    return NextResponse.json({ error: "No se pudieron cargar tus cupones" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "SELLER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const parsed = couponSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const coupon = await prisma.coupon.create({
      data: {
        sellerId: user.id,
        code: data.code,
        type: data.type,
        value: data.value,
        active: data.active,
      },
    });
    return NextResponse.json({ ok: true, coupon });
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
    console.error("[seller/coupons:POST]", error);
    return NextResponse.json({ error: "No se pudo crear el cupón" }, { status: 500 });
  }
}
