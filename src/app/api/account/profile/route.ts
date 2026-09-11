import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { accountUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Autoservicio: cada usuario edita solo su propio perfil (nunca rol ni email). */
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const parsed = accountUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Los campos bancarios solo tienen sentido para vendedores/admin.
    const canHaveBank = user.role === "SELLER" || user.role === "ADMIN";

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.rut !== undefined ? { rut: data.rut } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(canHaveBank && data.bankName !== undefined ? { bankName: data.bankName } : {}),
        ...(canHaveBank && data.bankAccountType !== undefined
          ? { bankAccountType: data.bankAccountType }
          : {}),
        ...(canHaveBank && data.bankAccountNumber !== undefined
          ? { bankAccountNumber: data.bankAccountNumber }
          : {}),
        ...(canHaveBank && data.bankHolderName !== undefined
          ? { bankHolderName: data.bankHolderName }
          : {}),
        ...(canHaveBank && data.bankRut !== undefined ? { bankRut: data.bankRut } : {}),
        ...(canHaveBank && data.transferDiscountPct !== undefined
          ? { transferDiscountPct: data.transferDiscountPct }
          : {}),
        ...(canHaveBank && data.cashDiscountPct !== undefined
          ? { cashDiscountPct: data.cashDiscountPct }
          : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        rut: true,
        city: true,
        bankName: true,
        bankAccountType: true,
        bankAccountNumber: true,
        bankHolderName: true,
        bankRut: true,
        transferDiscountPct: true,
        cashDiscountPct: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/profile:PATCH]", error);
    return NextResponse.json({ error: "No se pudo actualizar tu perfil" }, { status: 500 });
  }
}
