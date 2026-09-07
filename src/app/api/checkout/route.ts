import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkoutSchema } from "@/lib/validators";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { createPreference, mercadoPagoEnabled } from "@/lib/mercadopago";
import { shippingCost, zoneOf, comunasOf } from "@/lib/regions";
import { BANK_TRANSFER, TRANSFER_DISCOUNT_RATE } from "@/lib/bank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limiter = await rateLimit(clientKey(req, "checkout"), 12, 600);
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiadas órdenes seguidas. Intenta en unos minutos." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Validación de dirección chilena.
  if (data.shipMethod === "SHIPPING") {
    if (!data.shipRegion || !zoneOf(data.shipRegion)) {
      return NextResponse.json({ error: "Región no válida" }, { status: 400 });
    }
    if (!data.shipCity || !comunasOf(data.shipRegion).includes(data.shipCity)) {
      return NextResponse.json(
        { error: "La comuna no corresponde a la región seleccionada" },
        { status: 400 }
      );
    }
    if (!data.shipAddress || data.shipAddress.trim().length < 5) {
      return NextResponse.json(
        { error: "Ingresa una dirección de despacho válida" },
        { status: 400 }
      );
    }
  }

  // Los precios y el stock siempre se leen de la base de datos.
  const listings = await prisma.listing.findMany({
    where: { id: { in: data.items.map((i) => i.listingId) } },
    select: { id: true, title: true, price: true, stock: true, status: true },
  });

  const byId = new Map(listings.map((l) => [l.id, l]));
  const orderItems: Array<{
    listingId: string;
    title: string;
    unitPrice: number;
    quantity: number;
  }> = [];

  for (const item of data.items) {
    const listing = byId.get(item.listingId);
    if (!listing || listing.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `Una de las publicaciones ya no está disponible` },
        { status: 409 }
      );
    }
    if (listing.stock < item.quantity) {
      return NextResponse.json(
        {
          error: `"${listing.title}" solo tiene ${listing.stock} unidades disponibles`,
        },
        { status: 409 }
      );
    }
    orderItems.push({
      listingId: listing.id,
      title: listing.title,
      unitPrice: listing.price,
      quantity: item.quantity,
    });
  }

  const subtotal = orderItems.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
  const ship = shippingCost(data.shipMethod, data.shipRegion ?? null, subtotal);
  // El descuento por transferencia se recalcula acá, nunca se confía en el
  // monto que mande el cliente.
  const discount =
    data.paymentMethod === "TRANSFER" ? Math.round(subtotal * TRANSFER_DISCOUNT_RATE) : 0;
  const total = subtotal - discount + ship;

  const order = await prisma.order.create({
    data: {
      buyerName: data.buyerName,
      buyerEmail: data.buyerEmail.toLowerCase().trim(),
      buyerPhone: data.buyerPhone ?? null,
      paymentMethod: data.paymentMethod,
      shipMethod: data.shipMethod,
      shipAddress: data.shipAddress ?? null,
      shipCity: data.shipCity ?? null,
      shipRegion: data.shipRegion ?? null,
      shipCost: ship,
      discount,
      subtotal,
      total,
      notes: data.notes ?? null,
      items: { create: orderItems },
    },
    select: { id: true },
  });

  // Transferencia: no pasa por Mercado Pago, se le muestran los datos de la
  // cuenta y queda pendiente hasta que llegue el comprobante.
  if (data.paymentMethod === "TRANSFER") {
    return NextResponse.json({
      ok: true,
      orderId: order.id,
      notice: `Transfiere ${total.toLocaleString("es-CL")} CLP a ${BANK_TRANSFER.bank}, cuenta ${BANK_TRANSFER.accountType} N° ${BANK_TRANSFER.accountNumber}, RUT ${BANK_TRANSFER.rut}, a nombre de ${BANK_TRANSFER.holderName}. Envía el comprobante a ${BANK_TRANSFER.email} indicando el N° de orden. Despachamos apenas confirmemos el pago.`,
    });
  }

  if (!mercadoPagoEnabled()) {
    return NextResponse.json({
      ok: true,
      orderId: order.id,
      notice:
        "Mercado Pago aún no está configurado: te contactaremos por email para coordinar el pago.",
    });
  }

  try {
    const preference = await createPreference({
      orderId: order.id,
      items: [
        ...orderItems.map((i) => ({
          title: i.title,
          quantity: i.quantity,
          unit_price: i.unitPrice,
        })),
        ...(ship > 0
          ? [{ title: "Despacho", quantity: 1, unit_price: ship }]
          : []),
      ],
      payer: { name: data.buyerName, email: data.buyerEmail },
    });

    if (preference) {
      await prisma.order.update({
        where: { id: order.id },
        data: { preferenceId: preference.id },
      });
      return NextResponse.json({
        ok: true,
        orderId: order.id,
        checkoutUrl: preference.init_point,
      });
    }
  } catch (error) {
    console.error("[checkout] Mercado Pago", error);
  }

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    notice:
      "No pudimos abrir Mercado Pago en este momento. Guardamos tu orden y te contactaremos.",
  });
}
