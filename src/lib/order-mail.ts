import "server-only";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { renderEmail, type EmailContent } from "@/lib/email-template";
import { siteOrigin } from "@/lib/store";
import { clp } from "@/lib/format";

/**
 * Correos de una orden. Regla de oro: un correo que falla NUNCA debe romper la compra ni el cambio de estado,
 * por eso todo se atrapa aquí y se registra en el log.
 */

const SHIP_LABEL: Record<string, string> = { SHIPPING: "Envío a domicilio", PICKUP: "Retiro en persona" };
const PAY_LABEL: Record<string, string> = { TRANSFER: "Transferencia bancaria", CASH: "Efectivo al retirar" };

async function loadOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      total: true,
      paymentMethod: true,
      shipMethod: true,
      shipAddress: true,
      shipCity: true,
      paymentReference: true,
      paymentDueAt: true,
      trackingCourier: true,
      trackingCode: true,
      buyerName: true,
      buyerEmail: true,
      seller: { select: { name: true, email: true } },
      items: { select: { title: true, quantity: true } },
    },
  });
}
type LoadedOrder = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

const shortId = (o: LoadedOrder) => o.paymentReference ?? `#${o.id.slice(-6).toUpperCase()}`;
const itemsText = (o: LoadedOrder) => o.items.map((i) => `${i.quantity} × ${i.title}`).join(", ");
const fmtDate = (d: Date | null) =>
  d ? d.toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santiago" }) : "—";

async function send(to: string, subject: string, content: EmailContent, origin: string) {
  await sendEmail({ to, subject, html: renderEmail(content, origin) });
}

async function safely(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    console.error(`[order-mail] ${label}`, error);
  }
}

/** Nueva compra: aviso al vendedor y confirmación al comprador. */
export async function mailOrderCreated(orderIds: string[]) {
  await safely("created", async () => {
    const origin = await siteOrigin();
    await Promise.allSettled(
      orderIds.map(async (id) => {
        const o = await loadOrder(id);
        if (!o) return;
        const ref = shortId(o);
        const rows: Array<[string, string]> = [
          ["Orden", ref],
          ["Productos", itemsText(o)],
          ["Total", clp(o.total)],
          ["Pago", PAY_LABEL[o.paymentMethod] ?? o.paymentMethod],
          ["Entrega", SHIP_LABEL[o.shipMethod] ?? o.shipMethod],
        ];
        await Promise.allSettled([
          o.seller?.email
            ? send(
                o.seller.email,
                `Nueva orden ${ref}: ${clp(o.total)}`,
                {
                  heading: "¡Tienes una nueva orden!",
                  paragraphs: [
                    `${o.buyerName} reservó productos tuyos. Cuando te transfiera, sube el comprobante y verás el aviso en tu panel.`,
                  ],
                  rows: [...rows, ["Comprador", o.buyerName], ...(o.shipMethod === "SHIPPING" && o.shipCity ? ([["Comuna", o.shipCity]] as Array<[string, string]>) : [])],
                  cta: { label: "Ver la orden", url: `${origin}/panel/ordenes` },
                  note: "El stock queda reservado hasta que venza el plazo de pago.",
                },
                origin
              )
            : null,
          o.buyerEmail
            ? send(
                o.buyerEmail,
                `Reservamos tu pedido ${ref}`,
                {
                  heading: "Tu pedido está reservado",
                  paragraphs:
                    o.paymentMethod === "TRANSFER"
                      ? [
                          `Para confirmarlo, transfiere ${clp(o.total)} a la cuenta de ${o.seller?.name ?? "el vendedor"} usando el código ${ref} y sube el comprobante desde Mi cuenta.`,
                          `Tienes hasta el ${fmtDate(o.paymentDueAt)} para pagar; después la orden se cancela sola y el stock se libera.`,
                        ]
                      : [`Pagas en efectivo al retirar. Coordina el retiro con ${o.seller?.name ?? "el vendedor"} por el chat de la orden.`],
                  rows,
                  cta: { label: "Ver mi pedido", url: `${origin}/cuenta` },
                },
                origin
              )
            : null,
        ]);
      })
    );
  });
}

/** El comprador subió el comprobante: aviso al vendedor. */
export async function mailReceiptUploaded(orderId: string) {
  await safely("receipt", async () => {
    const o = await loadOrder(orderId);
    if (!o?.seller?.email) return;
    const origin = await siteOrigin();
    await send(
      o.seller.email,
      `Comprobante recibido en la orden ${shortId(o)}`,
      {
        heading: "Subieron un comprobante de pago",
        paragraphs: [`${o.buyerName} dice haber transferido ${clp(o.total)}. Revisa tu cuenta bancaria y, si el dinero llegó, confirma el pago.`],
        rows: [["Orden", shortId(o)], ["Total", clp(o.total)]],
        cta: { label: "Revisar y confirmar", url: `${origin}/panel/ordenes` },
      },
      origin
    );
  });
}

/** Cambio de estado hecho por una persona: pago confirmado, enviada, entregada o cancelada. */
export async function mailOrderStatus(orderId: string, status: string, actorRole: "buyer" | "seller" | "admin") {
  await safely(`status ${status}`, async () => {
    const o = await loadOrder(orderId);
    if (!o) return;
    const origin = await siteOrigin();
    const ref = shortId(o);
    const base: Array<[string, string]> = [["Orden", ref], ["Productos", itemsText(o)], ["Total", clp(o.total)]];
    const toBuyer = (subject: string, c: EmailContent) => (o.buyerEmail ? send(o.buyerEmail, subject, { cta: { label: "Ver mi pedido", url: `${origin}/cuenta` }, ...c }, origin) : null);
    const toSeller = (subject: string, c: EmailContent) => (o.seller?.email ? send(o.seller.email, subject, { cta: { label: "Ver la orden", url: `${origin}/panel/ordenes` }, ...c }, origin) : null);

    if (status === "PAID") {
      await toBuyer(`Pago confirmado · orden ${ref}`, {
        heading: "¡Pago confirmado!",
        paragraphs: [`${o.seller?.name ?? "El vendedor"} confirmó tu pago y está preparando tu pedido.`],
        rows: base,
      });
    } else if (status === "SHIPPED") {
      const tracking: Array<[string, string]> = [];
      if (o.trackingCourier) tracking.push(["Courier", o.trackingCourier]);
      if (o.trackingCode) tracking.push(["N° de seguimiento", o.trackingCode]);
      await toBuyer(`Tu pedido va en camino · orden ${ref}`, {
        heading: o.shipMethod === "PICKUP" ? "Tu pedido está listo para retiro" : "Tu pedido va en camino",
        paragraphs: [
          o.shipMethod === "PICKUP"
            ? `${o.seller?.name ?? "El vendedor"} dejó tu pedido listo. Coordina el retiro por el chat de la orden.`
            : `${o.seller?.name ?? "El vendedor"} despachó tu pedido. Cuando lo recibas, confírmalo en Mi cuenta para poder calificar.`,
        ],
        rows: [...base, ...tracking],
      });
    } else if (status === "DELIVERED") {
      await toSeller(`Entrega confirmada · orden ${ref}`, {
        heading: "El comprador confirmó la recepción",
        paragraphs: [`${o.buyerName} recibió su pedido. Ahora puede dejarte una reseña.`],
        rows: base,
      });
    } else if (status === "CANCELLED") {
      const reason = actorRole === "buyer" ? `${o.buyerName} canceló la orden.` : actorRole === "seller" ? `${o.seller?.name ?? "El vendedor"} canceló la orden.` : "La administración canceló la orden.";
      const content: EmailContent = {
        heading: "Orden cancelada",
        paragraphs: [`${reason} Las cartas volvieron a estar disponibles.`],
        rows: base,
      };
      await Promise.allSettled([
        actorRole !== "buyer" ? toBuyer(`Orden cancelada · ${ref}`, content) : null,
        actorRole !== "seller" ? toSeller(`Orden cancelada · ${ref}`, content) : null,
      ]);
    }
  });
}

/** Órdenes canceladas por vencer el plazo de pago (las llama el cron diario). */
export async function mailOrdersExpired(orderIds: string[]) {
  await safely("expired", async () => {
    if (orderIds.length === 0) return;
    const origin = await siteOrigin();
    await Promise.allSettled(
      orderIds.map(async (id) => {
        const o = await loadOrder(id);
        if (!o) return;
        const ref = shortId(o);
        const rows: Array<[string, string]> = [["Orden", ref], ["Productos", itemsText(o)], ["Total", clp(o.total)]];
        await Promise.allSettled([
          o.buyerEmail
            ? send(o.buyerEmail, `Se venció el plazo de tu orden ${ref}`, {
                heading: "Tu orden se canceló por falta de pago",
                paragraphs: ["Pasó el plazo para pagar, así que liberamos las cartas. Si aún las quieres, puedes volver a comprarlas si siguen disponibles."],
                rows,
                cta: { label: "Ver el catálogo", url: `${origin}/cartas` },
              }, origin)
            : null,
          o.seller?.email
            ? send(o.seller.email, `Orden vencida ${ref}`, {
                heading: "Una orden venció sin pago",
                paragraphs: ["El comprador no pagó a tiempo. Las cartas volvieron a tu stock."],
                rows,
              }, origin)
            : null,
        ]);
      })
    );
  });
}
