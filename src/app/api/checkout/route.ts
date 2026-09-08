import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validators";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { shippingCost, zoneOf, comunasOf } from "@/lib/regions";
import { mercadoPagoEnabled, createPreference } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Descuento por pagar con transferencia (único método disponible hoy). */
const TRANSFER_DISCOUNT_RATE = 0.02;

function bankNotice(
  total: number,
  seller: {
    name: string;
    bankName: string | null;
    bankAccountType: string | null;
    bankAccountNumber: string | null;
    bankHolderName: string | null;
    bankRut: string | null;
  }
): string {
  if (!seller.bankName || !seller.bankAccountNumber) {
    return `Guardamos tu orden con ${seller.name}. Todavía no configuró su cuenta bancaria: te contactaremos por email para coordinar el pago de ${total.toLocaleString("es-CL")} CLP.`;
  }
  return `Transfiere ${total.toLocaleString("es-CL")} CLP a ${seller.name} — ${seller.bankName}, cuenta ${seller.bankAccountType} N° ${seller.bankAccountNumber}, RUT ${seller.bankRut}, a nombre de ${seller.bankHolderName}. Manda el comprobante por el chat de la orden.`;
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Debes iniciar sesión para comprar" }, { status: 401 });
    }
    throw error;
  }

  const limiter = await rateLimit(clientKey(req, `checkout:${user.id}`), 12, 600);
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
    select: { id: true, title: true, price: true, stock: true, status: true, sellerId: true },
  });

  const byId = new Map(listings.map((l) => [l.id, l]));
  const bySeller = new Map<
    string,
    Array<{ listingId: string; title: string; unitPrice: number; quantity: number }>
  >();

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
    const group = bySeller.get(listing.sellerId) ?? [];
    group.push({
      listingId: listing.id,
      title: listing.title,
      unitPrice: listing.price,
      quantity: item.quantity,
    });
    bySeller.set(listing.sellerId, group);
  }

  // Mercado Pago cobra a través de la cuenta del sitio, no de cada vendedor
  // por separado, así que hoy solo se puede ofrecer cuando el carrito trae
  // cartas de un único vendedor (si no, cada vendedor necesitaría su propia
  // orden y su propio pago en Mercado Pago, cosa que la integración actual
  // no soporta). Con más de un vendedor la única opción es transferencia.
  if (data.paymentMethod === "MP") {
    if (!mercadoPagoEnabled()) {
      return NextResponse.json(
        { error: "Mercado Pago no está disponible por ahora. Usa transferencia bancaria." },
        { status: 400 }
      );
    }
    if (bySeller.size > 1) {
      return NextResponse.json(
        {
          error:
            "Mercado Pago solo está disponible cuando compras a un solo vendedor. Usa transferencia bancaria o compra por separado.",
        },
        { status: 400 }
      );
    }
  }

  const sellers = await prisma.user.findMany({
    where: { id: { in: [...bySeller.keys()] } },
    select: {
      id: true,
      name: true,
      bankName: true,
      bankAccountType: true,
      bankAccountNumber: true,
      bankHolderName: true,
      bankRut: true,
    },
  });
  const sellerById = new Map(sellers.map((s) => [s.id, s]));

  // Un carrito con cartas de varios vendedores queda como una orden por
  // vendedor: cada uno tiene su propia cuenta bancaria y su propio chat.
  const orders = [];
  for (const [sellerId, items] of bySeller) {
    const seller = sellerById.get(sellerId);
    if (!seller) continue;

    const subtotal = items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
    const ship = shippingCost(data.shipMethod, data.shipRegion ?? null, subtotal);
    // El 2% de descuento es un incentivo para pagar por transferencia (evita
    // la comisión de la pasarela); con Mercado Pago se cobra el precio lleno.
    const discount =
      data.paymentMethod === "TRANSFER" ? Math.round(subtotal * TRANSFER_DISCOUNT_RATE) : 0;
    const total = subtotal - discount + ship;

    const order = await prisma.order.create({
      data: {
        buyerId: user.id,
        sellerId: seller.id,
        buyerName: user.name,
        buyerEmail: user.email,
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
        items: { create: items },
      },
      select: { id: true },
    });

    if (data.paymentMethod === "MP") {
      try {
        const preference = await createPreference({
          orderId: order.id,
          items: items.map((i) => ({
            title: i.title,
            quantity: i.quantity,
            unit_price: i.unitPrice,
          })),
          payer: { name: user.name, email: user.email },
        });
        if (!preference) throw new Error("Mercado Pago no respondió con una preferencia");

        await prisma.order.update({
          where: { id: order.id },
          data: { preferenceId: preference.id },
        });

        // Solo puede haber una orden cuando se paga con Mercado Pago (carrito
        // de un único vendedor), así que se corta acá y se manda a pagar.
        return NextResponse.json({ ok: true, initPoint: preference.init_point });
      } catch (err) {
        // No dejamos una orden viva sin forma de pagarla: se cancela y el
        // comprador puede reintentar (o usar transferencia) sin quedar con
        // una orden fantasma pendiente para siempre.
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });
        console.error("[checkout] Mercado Pago", err);
        return NextResponse.json(
          { error: "No se pudo iniciar el pago con Mercado Pago. Intenta de nuevo o usa transferencia." },
          { status: 502 }
        );
      }
    }

    orders.push({
      orderId: order.id,
      sellerName: seller.name,
      total,
      notice: bankNotice(total, seller),
    });
  }

  if (orders.length === 0) {
    return NextResponse.json({ error: "No se pudo procesar la orden" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orders });
}
