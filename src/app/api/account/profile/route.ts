import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { accountUpdateSchema } from "@/lib/validators";
import { REGIONS } from "@/lib/regions";

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

    if (data.region && !REGIONS.some((r) => r.name === data.region)) {
      return NextResponse.json({ error: "La región no es válida" }, { status: 400 });
    }
    if (
      canHaveBank &&
      data.offersShipping === false &&
      data.offersPickup === false
    ) {
      return NextResponse.json(
        { error: "Debes ofrecer al menos una forma de entrega: envío o retiro en persona." },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.rut !== undefined ? { rut: data.rut } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.region !== undefined ? { region: data.region } : {}),
        ...(canHaveBank && data.offersShipping !== undefined
          ? { offersShipping: data.offersShipping }
          : {}),
        ...(canHaveBank && data.offersPickup !== undefined
          ? { offersPickup: data.offersPickup }
          : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
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
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        rut: true,
        city: true,
        avatarUrl: true,
        bankName: true,
        bankAccountType: true,
        bankAccountNumber: true,
        bankHolderName: true,
        bankRut: true,
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
