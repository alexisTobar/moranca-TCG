import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Descarga de los datos personales de la propia cuenta (derecho de acceso y portabilidad), en JSON. */
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const limiter = await rateLimit(clientKey(req, `export:${user.id}`), 3, 3600);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Ya descargaste tus datos varias veces. Intenta más tarde." }, { status: 429 });
    }

    const [profile, oauth, ordersAsBuyer, ordersAsSeller, listings, reviewsWritten, reviewsReceived, messages, tickets, reports, store] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true, name: true, email: true, slug: true, role: true, phone: true, address: true, rut: true,
            city: true, region: true, bio: true, avatarUrl: true, createdAt: true,
            bankName: true, bankAccountType: true, bankAccountNumber: true, bankHolderName: true, bankRut: true,
            offersShipping: true, offersPickup: true,
            termsAcceptedAt: true, termsVersion: true, emailVerifiedAt: true, totpEnabledAt: true,
            sellerRequestStatus: true, sellerRequestMessage: true, sellerRequestAt: true,
          },
        }),
        prisma.oAuthAccount.findMany({ where: { userId: user.id }, select: { provider: true, createdAt: true } }),
        prisma.order.findMany({
          where: { buyerId: user.id },
          orderBy: { createdAt: "desc" },
          take: 500,
          select: {
            id: true, status: true, total: true, subtotal: true, shipCost: true, discount: true, paymentMethod: true,
            paymentReference: true, shipMethod: true, shipAddress: true, shipCity: true, shipRegion: true, notes: true,
            trackingCourier: true, trackingCode: true, createdAt: true, paidAt: true,
            seller: { select: { name: true } },
            items: { select: { title: true, quantity: true, unitPrice: true } },
          },
        }),
        prisma.order.findMany({
          where: { sellerId: user.id },
          orderBy: { createdAt: "desc" },
          take: 500,
          select: {
            id: true, status: true, total: true, paymentMethod: true, paymentReference: true, shipMethod: true,
            buyerName: true, buyerEmail: true, buyerPhone: true, shipAddress: true, shipCity: true, shipRegion: true,
            createdAt: true, paidAt: true,
            items: { select: { title: true, quantity: true, unitPrice: true } },
          },
        }),
        prisma.listing.findMany({
          where: { sellerId: user.id },
          take: 2000,
          select: { id: true, title: true, game: true, type: true, price: true, offerPrice: true, stock: true, status: true, createdAt: true },
        }),
        prisma.review.findMany({ where: { buyerId: user.id }, select: { rating: true, comment: true, createdAt: true } }),
        prisma.review.findMany({ where: { sellerId: user.id }, select: { rating: true, comment: true, sellerReply: true, createdAt: true } }),
        prisma.orderMessage.findMany({ where: { senderId: user.id }, orderBy: { createdAt: "desc" }, take: 2000, select: { orderId: true, body: true, createdAt: true } }),
        prisma.supportTicket.findMany({
          where: { sellerId: user.id },
          select: { code: true, subject: true, category: true, status: true, createdAt: true, messages: { select: { fromAdmin: true, body: true, createdAt: true } } },
        }),
        prisma.report.findMany({ where: { reporterId: user.id }, select: { targetType: true, reason: true, detail: true, status: true, createdAt: true } }),
        prisma.store.findUnique({
          where: { sellerId: user.id },
          select: {
            status: true, activeUntil: true, displayName: true, tagline: true, about: true, accentColor: true, instagram: true,
            facebook: true, whatsapp: true, website: true, announcement: true, createdAt: true,
            subscriptions: { select: { months: true, amount: true, status: true, reference: true, createdAt: true } },
          },
        }),
      ]);

    await audit({ id: user.id, name: user.name }, "security.data_exported", { type: "User", id: user.id });

    const body = {
      generadoEl: new Date().toISOString(),
      nota: "Copia de los datos personales de tu cuenta en Win Condition TCG. No incluye contraseñas ni claves secretas.",
      perfil: profile,
      cuentasVinculadas: oauth,
      comprasComoComprador: ordersAsBuyer,
      ventasComoVendedor: ordersAsSeller,
      publicaciones: listings,
      reseñasEscritas: reviewsWritten,
      reseñasRecibidas: reviewsReceived,
      mensajesEnOrdenes: messages,
      ticketsDeSoporte: tickets,
      reportesEnviados: reports,
      tienda: store,
    };
    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="mis-datos-win-condition.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/export]", error);
    return NextResponse.json({ error: "No se pudo generar la descarga" }, { status: 500 });
  }
}
