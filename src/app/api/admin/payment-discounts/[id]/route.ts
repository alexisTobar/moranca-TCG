import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth";
import { paymentDiscountUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function listAll() {
  return prisma.paymentDiscount.findMany({
    orderBy: [{ method: "asc" }, { percent: "asc" }],
    select: { id: true, method: true, percent: true, label: true, active: true },
  });
}

/** Activa, desactiva o edita un descuento. Activar uno desactiva el resto del mismo método. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const parsed = paymentDiscountUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const current = await prisma.paymentDiscount.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Descuento no encontrado" }, { status: 404 });
    }

    if (data.percent !== undefined && data.percent !== current.percent) {
      const duplicate = await prisma.paymentDiscount.findFirst({
        where: { method: current.method, percent: data.percent, NOT: { id } },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Ya existe un descuento de ${data.percent}% para ese método.` },
          { status: 409 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      if (data.active === true) {
        await tx.paymentDiscount.updateMany({
          where: { method: current.method, active: true, NOT: { id } },
          data: { active: false },
        });
      }
      await tx.paymentDiscount.update({
        where: { id },
        data: {
          ...(data.percent !== undefined ? { percent: data.percent } : {}),
          ...(data.label !== undefined ? { label: data.label?.trim() || null } : {}),
          ...(data.active !== undefined ? { active: data.active } : {}),
        },
      });
    });

    return NextResponse.json({ ok: true, discounts: await listAll() });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/payment-discounts:PATCH]", error);
    return NextResponse.json({ error: "No se pudo actualizar el descuento" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.paymentDiscount.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true, discounts: await listAll() });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/payment-discounts:DELETE]", error);
    return NextResponse.json({ error: "No se pudo eliminar el descuento" }, { status: 500 });
  }
}
