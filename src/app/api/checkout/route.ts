import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validators";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { shippingCost, zoneOf, comunasOf, PICKUP_POINT } from "@/lib/regions";
import { effectiveListingPrice, computeSellerOrderTotals } from "@/lib/order-pricing";
import { getSiteSettings, discountPctFor } from "@/lib/site-settings";
import {
  expireOverdueOrders,
  generatePaymentReference,
  paymentDueDate,
  recordOrderEvent,
} from "@/lib/order-payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class StockError extends Error {}

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

  if (data.paymentMethod === "CASH" && data.shipMethod !== "PICKUP") {
    return NextResponse.json(
      { error: "El pago en efectivo solo está disponible con retiro en persona." },
      { status: 400 }
    );
  }

  // Libera primero el stock de órdenes vencidas, así no queda "reservado" por
  // compradores que nunca pagaron.
  await expireOverdueOrders();

  const settings = await getSiteSettings();
  const paymentDiscountPct = discountPctFor(settings, data.paymentMethod);

  // Los precios y el stock siempre se leen de la base de datos.
  const listings = await prisma.listing.findMany({
    where: { id: { in: data.items.map((i) => i.listingId) } },
    select: {
      id: true,
      title: true,
      price: true,
      offerPrice: true,
      stock: true,
      status: true,
      sellerId: true,
    },
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
      unitPrice: effectiveListingPrice(listing),
      quantity: item.quantity,
    });
    bySeller.set(listing.sellerId, group);
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

  // El cupón se resuelve contra los vendedores presentes en el carrito: solo
  // aplica al subtotal del vendedor dueño del código, el resto no se ve
  // afectado.
  const couponBySeller = new Map<
    string,
    { id: string; type: "PERCENT" | "FIXED"; value: number; code: string }
  >();
  if (data.couponCode) {
    const code = data.couponCode.trim().toUpperCase();
    const matches = await prisma.coupon.findMany({
      where: { code, active: true, sellerId: { in: [...bySeller.keys()] } },
    });
    if (matches.length === 0) {
      return NextResponse.json(
        { error: "El cupón no existe o no aplica a los vendedores de tu carrito." },
        { status: 400 }
      );
    }
    for (const c of matches) {
      couponBySeller.set(c.sellerId, { id: c.id, type: c.type, value: c.value, code: c.code });
    }
  }

  const dueAt = paymentDueDate(settings.paymentWindowHours);

  // Un carrito con cartas de varios vendedores queda como una orden por
  // vendedor: cada uno tiene su propia cuenta bancaria y su propio chat.
  // Todo ocurre en una sola transacción: o se reserva el stock y se crean
  // todas las órdenes, o no se crea nada.
  try {
    const created = await prisma.$transaction(
      async (tx) => {
        const results = [];
        for (const [sellerId, items] of bySeller) {
          const seller = sellerById.get(sellerId);
          if (!seller) continue;

          // Reserva atómica: el descuento solo ocurre si todavía hay stock, así
          // dos compradores a la vez nunca pueden llevarse la misma carta.
          for (const item of items) {
            const { count } = await tx.listing.updateMany({
              where: { id: item.listingId, status: "ACTIVE", stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (count === 0) {
              throw new StockError(`"${item.title}" se acaba de agotar`);
            }
          }

          const ship = shippingCost(
            data.shipMethod,
            data.shipRegion ?? null,
            items.reduce((a, i) => a + i.unitPrice * i.quantity, 0)
          );
          const coupon = couponBySeller.get(sellerId) ?? null;
          const totals = computeSellerOrderTotals({
            items,
            coupon,
            paymentDiscountPct,
            shipCost: ship,
          });

          // El código se genera al azar y se verifica que nadie lo tenga ya
          // (no es un @unique en la base para poder desplegar sin migración destructiva).
          let reference = generatePaymentReference();
          for (let attempt = 0; attempt < 5; attempt++) {
            const taken = await tx.order.findFirst({
              where: { paymentReference: reference },
              select: { id: true },
            });
            if (!taken) break;
            reference = generatePaymentReference();
          }
          const order = await tx.order.create({
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
              discount: totals.discount,
              couponId: coupon?.id ?? null,
              couponCode: coupon?.code ?? null,
              couponDiscount: totals.couponDiscount,
              paymentDiscountPct: totals.paymentDiscountPct,
              subtotal: totals.subtotal,
              total: totals.total,
              notes: data.notes ?? null,
              paymentReference: reference,
              paymentDueAt: dueAt,
              stockReserved: true,
              items: { create: items },
            },
            select: { id: true },
          });

          await recordOrderEvent(
            tx,
            order.id,
            user.id,
            "CREATED",
            `Orden creada (${data.paymentMethod === "CASH" ? "efectivo" : "transferencia"}), total ${totals.total}`
          );

          results.push({
            orderId: order.id,
            sellerName: seller.name,
            total: totals.total,
            method: data.paymentMethod,
            reference,
            dueAt: dueAt.toISOString(),
            discountPct: totals.paymentDiscountPct,
            pickupPoint: data.paymentMethod === "CASH" ? PICKUP_POINT : null,
            bank:
              data.paymentMethod === "TRANSFER" && seller.bankName && seller.bankAccountNumber
                ? {
                    bankName: seller.bankName,
                    accountType: seller.bankAccountType,
                    accountNumber: seller.bankAccountNumber,
                    holderName: seller.bankHolderName,
                    rut: seller.bankRut,
                  }
                : null,
          });
        }
        return results;
      },
      { maxWait: 10_000, timeout: 20_000 }
    );

    if (created.length === 0) {
      return NextResponse.json({ error: "No se pudo procesar la orden" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, orders: created });
  } catch (error) {
    if (error instanceof StockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[checkout:POST]", error);
    return NextResponse.json({ error: "No se pudo procesar la orden" }, { status: 500 });
  }
}
