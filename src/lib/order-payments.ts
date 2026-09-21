import { mailOrdersExpired } from "@/lib/order-mail";
import "server-only";
import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Sin 0/O/1/I/L para que el código se pueda dictar o copiar sin errores. */
const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Código único de la orden. El comprador lo pone en el comentario de la transferencia. */
export function generatePaymentReference(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += REFERENCE_ALPHABET[crypto.randomInt(REFERENCE_ALPHABET.length)];
  }
  return `DD-${code}`;
}

export function paymentDueDate(hours: number, from = new Date()): Date {
  return new Date(from.getTime() + hours * 3_600_000);
}

type Tx = Prisma.TransactionClient;

export async function recordOrderEvent(
  tx: Tx | typeof prisma,
  orderId: string,
  actorId: string | null,
  type: string,
  detail?: string
) {
  await tx.orderEvent.create({
    data: { orderId, actorId, type, detail: detail ?? null },
  });
}

/** Devuelve al inventario lo que la orden tenía reservado. */
export async function releaseOrderStock(
  tx: Tx,
  items: Array<{ listingId: string; quantity: number }>
) {
  for (const item of items) {
    await tx.listing.update({
      where: { id: item.listingId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

/**
 * Cancela las órdenes pendientes cuyo plazo de pago venció y devuelve el
 * stock. Cada orden se procesa en su propia transacción y con un cambio de
 * estado condicional, así que correrlo dos veces a la vez no duplica nada.
 */
export async function expireOverdueOrders(now = new Date()): Promise<number> {
  const expiredIds: string[] = [];
  const overdue = await prisma.order.findMany({
    where: { status: "PENDING", paymentDueAt: { lt: now } },
    select: {
      id: true,
      stockReserved: true,
      items: { select: { listingId: true, quantity: true } },
    },
    take: 200,
  });

  let expired = 0;
  for (const order of overdue) {
    try {
      const done = await prisma.$transaction(async (tx) => {
        const { count } = await tx.order.updateMany({
          where: { id: order.id, status: "PENDING" },
          data: { status: "CANCELLED", stockReserved: false },
        });
        if (count === 0) return false;
        if (order.stockReserved) await releaseOrderStock(tx, order.items);
        await recordOrderEvent(
          tx,
          order.id,
          null,
          "EXPIRED",
          "Se venció el plazo de pago; la orden se canceló y el stock volvió a la tienda."
        );
        return true;
      });
      if (done) {
        expired++;
        expiredIds.push(order.id);
      }
    } catch (error) {
      console.error("[orders] no se pudo expirar la orden", order.id, error);
    }
  }
  if (expiredIds.length > 0) await mailOrdersExpired(expiredIds);
  return expired;
}
