import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** El vendedor cancela su propia solicitud mientras siga pendiente. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const sub = await prisma.storeSubscription.findUnique({
      where: { id },
      select: { status: true, store: { select: { sellerId: true } } },
    });
    if (!sub || sub.store.sellerId !== user.id) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }
    if (sub.status !== "PENDING") {
      return NextResponse.json({ error: "Solo se pueden cancelar solicitudes pendientes." }, { status: 409 });
    }
    await prisma.storeSubscription.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[store/subscriptions:DELETE]", error);
    return NextResponse.json({ error: "No se pudo cancelar" }, { status: 500 });
  }
}
