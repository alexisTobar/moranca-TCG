import { mailReceiptUploaded } from "@/lib/order-mail";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { memoryRateLimit, clientKey } from "@/lib/rate-limit";
import {
  IMAGE_SIGNATURES,
  PDF_SIGNATURE,
  detectSignature,
} from "@/lib/file-signature";
import { recordOrderEvent } from "@/lib/order-payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED = [...IMAGE_SIGNATURES, PDF_SIGNATURE];

/** El comprador sube el comprobante de su transferencia. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const limiter = memoryRateLimit(clientKey(req, `receipt:${user.id}`), 10, 300);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos, espera un momento." },
        { status: 429 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        buyerId: true,
        paymentMethod: true,
        paymentReference: true,
        receiptUploadId: true,
      },
    });
    if (!order || order.buyerId !== user.id) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    if (order.paymentMethod !== "TRANSFER") {
      return NextResponse.json(
        { error: "Esta orden no se paga por transferencia." },
        { status: 400 }
      );
    }
    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Esta orden ya no admite comprobantes." },
        { status: 409 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No llegó ningún archivo" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "El comprobante pesa más de 4 MB." },
        { status: 413 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const firma = detectSignature(bytes, ALLOWED);
    if (!firma) {
      return NextResponse.json(
        { error: "El comprobante debe ser una imagen (JPG, PNG, WEBP) o un PDF." },
        { status: 415 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const upload = await tx.upload.create({
        data: {
          mimeType: firma.mime,
          size: bytes.length,
          data: bytes,
          filename: `receipt:${order.id}`,
          uploadedBy: user.id,
        },
        select: { id: true },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { receiptUploadId: upload.id, receiptUploadedAt: new Date() },
      });

      await recordOrderEvent(
        tx,
        order.id,
        user.id,
        "RECEIPT_UPLOADED",
        order.receiptUploadId ? "Comprobante reemplazado" : "Comprobante subido"
      );
      await tx.orderMessage.create({
        data: {
          orderId: order.id,
          senderId: user.id,
          body: `El comprador subió el comprobante de transferencia${
            order.paymentReference ? ` (referencia ${order.paymentReference})` : ""
          }. Revisa tu cuenta bancaria y confirma el pago.`,
        },
      });
    });

    await mailReceiptUploaded(order.id);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[orders/receipt:POST]", error);
    return NextResponse.json({ error: "No se pudo subir el comprobante" }, { status: 500 });
  }
}

/** Solo el comprador, el vendedor de la orden o un admin pueden ver el comprobante. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: { buyerId: true, sellerId: true, receiptUploadId: true },
    });
    const allowed =
      order && (user.role === "ADMIN" || order.buyerId === user.id || order.sellerId === user.id);
    if (!order || !allowed || !order.receiptUploadId) {
      return new Response("No encontrado", { status: 404 });
    }

    const upload = await prisma.upload.findUnique({
      where: { id: order.receiptUploadId },
      select: { data: true, mimeType: true },
    });
    if (!upload) return new Response("No encontrado", { status: 404 });

    return new Response(new Uint8Array(upload.data), {
      headers: {
        "Content-Type": upload.mimeType,
        "Content-Length": String(upload.data.length),
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return new Response("No autorizado", { status: error.status });
    }
    console.error("[orders/receipt:GET]", error);
    return new Response("Error", { status: 500 });
  }
}
