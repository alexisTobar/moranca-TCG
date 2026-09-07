import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verifica la firma `x-signature` que envía Mercado Pago.
 * Si MP_WEBHOOK_SECRET no está configurado, se rechaza la notificación
 * para no aceptar avisos de pago no verificados.
 */
function verifySignature(req: Request, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;

  const signature = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!signature) return false;

  const parts = Object.fromEntries(
    signature.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    })
  ) as { ts?: string; v1?: string };

  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${dataId};request-id:${requestId ?? ""};ts:${parts.ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(parts.v1, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  let payload: { data?: { id?: string }; type?: string; action?: string } = {};

  try {
    payload = await req.json();
  } catch {
    /* Mercado Pago a veces notifica solo por query string */
  }

  const paymentId = payload.data?.id ?? searchParams.get("data.id") ?? "";
  const type = payload.type ?? searchParams.get("type") ?? "";

  if (!paymentId || type !== "payment") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!verifySignature(req, paymentId)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ ok: true });

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "No se pudo verificar el pago" }, { status: 502 });
  }

  const payment = (await res.json()) as {
    status?: string;
    external_reference?: string;
  };
  const orderId = payment.external_reference;
  if (!orderId) return NextResponse.json({ ok: true });

  if (payment.status === "approved") {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order || order.status === "PAID") return;

      await tx.order.update({
        where: { id: orderId },
        data: { status: "PAID", paymentId: String(paymentId) },
      });

      for (const item of order.items) {
        await tx.listing.update({
          where: { id: item.listingId },
          data: { stock: { decrement: item.quantity } },
        });
      }
      await tx.listing.updateMany({
        where: {
          id: { in: order.items.map((i) => i.listingId) },
          stock: { lte: 0 },
        },
        data: { status: "SOLD" },
      });
    });
  } else if (["cancelled", "rejected"].includes(payment.status ?? "")) {
    await prisma.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "CANCELLED", paymentId: String(paymentId) },
    });
  }

  return NextResponse.json({ ok: true });
}
