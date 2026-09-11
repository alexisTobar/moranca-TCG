import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validators";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { shippingCost } from "@/lib/regions";
import { effectiveListingPrice, computeSellerOrderTotals } from "@/lib/order-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recalcula, sin crear ninguna orden, cómo quedaría el total por vendedor.
 * El frontend lo usa para mostrar en vivo el efecto de un cupón o del método
 * de pago elegido — el checkout real (POST /api/checkout) es quien manda.
 */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Debes iniciar sesión para cotizar" }, { status: 401 });
    }
    throw error;
  }

  const limiter = await rateLimit(clientKey(req, `checkout-quote:${user.id}`), 30, 60);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Demasiadas cotizaciones seguidas." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = checkoutSchema.pick({
    items: true,
    shipMethod: true,
    shipRegion: true,
    paymentMethod: true,
    couponCode: true,
  }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const listings = await prisma.listing.findMany({
    where: { id: { in: data.items.map((i) => i.listingId) } },
    select: { id: true, price: true, offerPrice: true, status: true, sellerId: true },
  });
  const byId = new Map(listings.map((l) => [l.id, l]));
  const bySeller = new Map<string, Array<{ unitPrice: number; quantity: number }>>();

  for (const item of data.items) {
    const listing = byId.get(item.listingId);
    if (!listing || listing.status !== "ACTIVE") continue;
    const group = bySeller.get(listing.sellerId) ?? [];
    group.push({ unitPrice: effectiveListingPrice(listing), quantity: item.quantity });
    bySeller.set(listing.sellerId, group);
  }

  if (bySeller.size === 0) {
    return NextResponse.json({ ok: true, sellers: [] });
  }

  const sellers = await prisma.user.findMany({
    where: { id: { in: [...bySeller.keys()] } },
    select: { id: true, name: true, transferDiscountPct: true, cashDiscountPct: true },
  });

  let couponBySeller = new Map<
    string,
    { type: "PERCENT" | "FIXED"; value: number; code: string }
  >();
  let couponError: string | null = null;
  if (data.couponCode) {
    const code = data.couponCode.trim().toUpperCase();
    const matches = await prisma.coupon.findMany({
      where: { code, active: true, sellerId: { in: [...bySeller.keys()] } },
    });
    if (matches.length === 0) {
      couponError = "El cupón no existe o no aplica a los vendedores de tu carrito.";
    } else {
      couponBySeller = new Map(matches.map((c) => [c.sellerId, c]));
    }
  }

  const result = sellers.map((seller) => {
    const items = bySeller.get(seller.id) ?? [];
    const ship = shippingCost(
      data.shipMethod,
      data.shipRegion ?? null,
      items.reduce((a, i) => a + i.unitPrice * i.quantity, 0)
    );
    const coupon = couponBySeller.get(seller.id) ?? null;
    const totals = computeSellerOrderTotals({
      items,
      coupon,
      paymentMethod: data.paymentMethod,
      transferDiscountPct: seller.transferDiscountPct,
      cashDiscountPct: seller.cashDiscountPct,
      shipCost: ship,
    });
    return {
      sellerId: seller.id,
      sellerName: seller.name,
      ...totals,
      shipCost: ship,
      couponApplied: coupon != null,
    };
  });

  return NextResponse.json({ ok: true, sellers: result, couponError });
}
