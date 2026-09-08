import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { sellerRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "BUYER") {
      return NextResponse.json(
        { error: "Solo los compradores pueden pedir pasar a vendedor" },
        { status: 400 }
      );
    }

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { sellerRequestStatus: true },
    });
    if (current?.sellerRequestStatus === "PENDING") {
      return NextResponse.json(
        { error: "Ya tienes una solicitud pendiente" },
        { status: 409 }
      );
    }

    const parsed = sellerRequestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        sellerRequestStatus: "PENDING",
        sellerRequestMessage: parsed.data.message ?? null,
        sellerRequestAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/seller-request:POST]", error);
    return NextResponse.json({ error: "No se pudo enviar tu solicitud" }, { status: 500 });
  }
}
