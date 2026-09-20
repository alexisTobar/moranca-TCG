import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth";
import { paymentDiscountSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER = [{ method: "asc" }, { percent: "asc" }] as const;

async function listAll() {
  return prisma.paymentDiscount.findMany({
    orderBy: [...ORDER],
    select: { id: true, method: true, percent: true, label: true, active: true },
  });
}

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ ok: true, discounts: await listAll() });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/payment-discounts:GET]", error);
    return NextResponse.json({ error: "No se pudieron cargar los descuentos" }, { status: 500 });
  }
}

/** Crea un descuento por método de pago. Si se crea activo, desactiva el que estaba activo en ese método. */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const parsed = paymentDiscountSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const duplicate = await prisma.paymentDiscount.findFirst({
      where: { method: data.method, percent: data.percent },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Ya existe un descuento de ${data.percent}% para ese método.` },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (data.active) {
        await tx.paymentDiscount.updateMany({
          where: { method: data.method, active: true },
          data: { active: false },
        });
      }
      await tx.paymentDiscount.create({
        data: {
          method: data.method,
          percent: data.percent,
          label: data.label?.trim() || null,
          active: data.active,
        },
      });
    });

    return NextResponse.json({ ok: true, discounts: await listAll() }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/payment-discounts:POST]", error);
    return NextResponse.json({ error: "No se pudo crear el descuento" }, { status: 500 });
  }
}
