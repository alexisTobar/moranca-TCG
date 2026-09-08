import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["PAID", "SHIPPED", "CANCELLED"]),
});

/** Qué estados puede seguir cada estado actual. */
const ALLOWED_FROM: Record<string, string[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED", "CANCELLED"],
};

const SYSTEM_MESSAGE: Record<string, string> = {
  PAID: "✅ Pago confirmado por el vendedor. Preparando tu pedido.",
  SHIPPED: "📦 Pedido enviado / listo para retiro.",
  CANCELLED: "❌ Pedido cancelado.",
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        sellerId: true,
        items: { select: { listingId: true, quantity: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && order.sellerId !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    const next = parsed.data.status;

    const allowed = ALLOWED_FROM[order.status] ?? [];
    if (!allowed.includes(next)) {
      return NextResponse.json(
        { error: `No se puede pasar de ${order.status} a ${next}` },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Al aceptar el pedido (confirmar pago) recién se descuenta stock: antes
      // de eso el producto sigue disponible para otros compradores, porque el
      // checkout no reserva nada.
      if (next === "PAID") {
        for (const item of order.items) {
          const listing = await tx.listing.findUnique({
            where: { id: item.listingId },
            select: { stock: true, title: true },
          });
          if (!listing || listing.stock < item.quantity) {
            throw new Error(
              `"${listing?.title ?? "una carta"}" ya no tiene stock suficiente`
            );
          }
        }
        for (const item of order.items) {
          await tx.listing.update({
            where: { id: item.listingId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      // Cancelar un pedido ya aceptado devuelve el stock que se había descontado.
      if (next === "CANCELLED" && order.status === "PAID") {
        for (const item of order.items) {
          await tx.listing.update({
            where: { id: item.listingId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      await tx.order.update({ where: { id }, data: { status: next } });
      await tx.orderMessage.create({
        data: { orderId: id, senderId: user.id, body: SYSTEM_MESSAGE[next] },
      });
    });

    return NextResponse.json({ ok: true, status: next });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message.includes("stock suficiente")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[orders/status:PATCH]", error);
    return NextResponse.json({ error: "No se pudo actualizar la orden" }, { status: 500 });
  }
}
