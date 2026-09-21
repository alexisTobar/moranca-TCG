import "server-only";
import { prisma } from "@/lib/db";

/** Avisos pendientes del panel. Cada número es "cosas que esperan una acción tuya". */
export interface PanelCounts {
  /** Admin: solicitudes de membresía con comprobante por revisar. */
  subscriptions: number;
  /** Admin: tickets con mensajes nuevos del vendedor. Vendedor: respuestas del admin sin leer. */
  tickets: number;
  /** Admin: compradores que piden ser vendedores. */
  sellerRequests: number;
  /** Órdenes propias con comprobante subido, esperando que confirmes el pago. */
  orders: number;
}

export const EMPTY_COUNTS: PanelCounts = { subscriptions: 0, tickets: 0, sellerRequests: 0, orders: 0 };

export async function getPanelCounts(user: { id: string; role: string }): Promise<PanelCounts> {
  const isAdmin = user.role === "ADMIN";
  try {
    const [subscriptions, tickets, sellerRequests, orders] = await Promise.all([
      isAdmin
        ? prisma.storeSubscription.count({ where: { status: "PENDING", receiptUploadedAt: { not: null } } })
        : 0,
      isAdmin
        ? prisma.supportTicket.count({ where: { adminUnread: true, status: { not: "CLOSED" } } })
        : prisma.supportTicket.count({ where: { sellerId: user.id, sellerUnread: true } }),
      isAdmin ? prisma.user.count({ where: { sellerRequestStatus: "PENDING" } }) : 0,
      prisma.order.count({
        where: { sellerId: user.id, status: "PENDING", receiptUploadedAt: { not: null } },
      }),
    ]);
    return { subscriptions, tickets, sellerRequests, orders };
  } catch (error) {
    console.error("[panel-counts]", error);
    return EMPTY_COUNTS;
  }
}
