import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { recordOrderEvent, releaseOrderStock } from "@/lib/order-payments";
import { z } from "zod";
import { mailOrderStatus } from "@/lib/order-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["PAID", "SHIPPED", "DELIVERED", "CANCELLED"]),
  /** Solo se usan al marcar el envío. */
  trackingCourier: z.string().trim().max(40).optional().nullable(),
  trackingCode: z
    .string()
    .trim()
    .max(60)
    .regex(/^[\w .\-/#]*$/, "El número de seguimiento tiene caracteres no válidos")
    .optional()
    .nullable(),
});

/** Qué estados puede seguir cada estado actual. */
const ALLOWED_FROM: Record<string, string[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
};

const SYSTEM_MESSAGE: Record<string, string> = {
  PAID: "Pago confirmado por el vendedor. Preparando tu pedido.",
  SHIPPED: "Pedido enviado o listo para retiro.",
  DELIVERED: "El comprador confirmó la recepción del pedido.",
  CANCELLED: "Pedido cancelado.",
};

/** Estados en los que el inventario de la orden ya está descontado. */
const STOCK_HELD_STATUSES = ["PAID", "SHIPPED", "DELIVERED"];

class ConflictError extends Error {}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        buyerId: true,
        sellerId: true,
        stockReserved: true,
        items: { select: { listingId: true, quantity: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    const next = parsed.data.status;

    const isAdmin = user.role === "ADMIN";
    const isBuyer = order.buyerId === user.id;
    const isSeller = order.sellerId === user.id;

    // Quién puede hacer cada cambio:
    //  - Confirmar pago y marcar envío: solo el vendedor (o un admin). El
    //    comprador nunca puede darse a sí mismo por pagada la orden.
    //  - Confirmar recepción: solo el comprador (o un admin).
    //  - Cancelar: el vendedor o un admin en cualquier momento; el comprador
    //    solo mientras la orden siga pendiente de pago.
    let authorized = isAdmin;
    if (!authorized) {
      if (next === "DELIVERED") authorized = isBuyer;
      else if (next === "CANCELLED") authorized = isSeller || (isBuyer && order.status === "PENDING");
      else authorized = isSeller;
    }
    if (!authorized) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const allowed = ALLOWED_FROM[order.status] ?? [];
    if (!allowed.includes(next)) {
      return NextResponse.json(
        { error: `No se puede pasar de ${order.status} a ${next}` },
        { status: 409 }
      );
    }

    const holdsStock = order.stockReserved || STOCK_HELD_STATUSES.includes(order.status);

    await prisma.$transaction(async (tx) => {
      // Cambio condicional: si otro proceso (o un doble clic) ya movió la
      // orden, no pisamos nada ni tocamos el stock dos veces.
      const data: Record<string, unknown> = { status: next };
      if (next === "PAID") data.paidAt = new Date();
      if (next === "SHIPPED") {
        data.shippedAt = new Date();
        data.trackingCourier = parsed.data.trackingCourier?.trim() || null;
        data.trackingCode = parsed.data.trackingCode?.trim() || null;
      }
      if (next === "CANCELLED") data.stockReserved = false;
      if (next === "PAID" && !holdsStock) data.stockReserved = true;

      const { count } = await tx.order.updateMany({
        where: { id, status: order.status },
        data,
      });
      if (count === 0) {
        throw new ConflictError("La orden cambió mientras la editabas. Recarga la página.");
      }

      // Órdenes antiguas (creadas antes de reservar stock al comprar): el stock
      // recién se descuenta al confirmar el pago.
      if (next === "PAID" && !holdsStock) {
        for (const item of order.items) {
          const { count: ok } = await tx.listing.updateMany({
            where: { id: item.listingId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (ok === 0) {
            throw new ConflictError("Una de las cartas ya no tiene stock suficiente");
          }
        }
      }

      // Cancelar devuelve el stock reservado o ya descontado.
      if (next === "CANCELLED" && holdsStock) {
        await releaseOrderStock(tx, order.items);
      }

      await recordOrderEvent(tx, id, user.id, next, `Cambio de ${order.status} a ${next}`);
      await tx.orderMessage.create({
        data: { orderId: id, senderId: user.id, body: SYSTEM_MESSAGE[next] },
      });
    });

    await mailOrderStatus(id, next, isAdmin && !isBuyer && !isSeller ? "admin" : isBuyer ? "buyer" : "seller");

    return NextResponse.json({ ok: true, status: next });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[orders/status:PATCH]", error);
    return NextResponse.json({ error: "No se pudo actualizar la orden" }, { status: 500 });
  }
}
