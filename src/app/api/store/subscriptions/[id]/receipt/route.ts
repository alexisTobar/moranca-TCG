import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { memoryRateLimit, clientKey } from "@/lib/rate-limit";
import { notifyAdmins } from "@/lib/notify";
import { IMAGE_SIGNATURES, PDF_SIGNATURE, detectSignature } from "@/lib/file-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = [...IMAGE_SIGNATURES, PDF_SIGNATURE];

/** El vendedor sube el comprobante de la transferencia de su membresía. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const limiter = memoryRateLimit(clientKey(req, `store-receipt:${user.id}`), 10, 300);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Demasiados intentos, espera un momento." }, { status: 429 });
    }

    const sub = await prisma.storeSubscription.findUnique({
      where: { id },
      select: { id: true, status: true, store: { select: { sellerId: true } } },
    });
    if (!sub || sub.store.sellerId !== user.id) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }
    if (sub.status !== "PENDING") {
      return NextResponse.json({ error: "Esta solicitud ya fue revisada." }, { status: 409 });
    }

    const file = (await req.formData()).get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No llegó ningún archivo" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El comprobante pesa más de 4 MB." }, { status: 413 });
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
          filename: `store-receipt:${sub.id}`,
          uploadedBy: user.id,
        },
        select: { id: true },
      });
      await tx.storeSubscription.update({
        where: { id: sub.id },
        data: { receiptUploadId: upload.id, receiptUploadedAt: new Date() },
      });
    });

    await notifyAdmins(
      `Comprobante de membresía de ${user.name}`,
      ["Subió el comprobante de transferencia y espera tu aprobación."],
      "/panel/tiendas"
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[store/receipt:POST]", error);
    return NextResponse.json({ error: "No se pudo subir el comprobante" }, { status: 500 });
  }
}

/** Lo puede ver el dueño de la tienda y el administrador. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const sub = await prisma.storeSubscription.findUnique({
      where: { id },
      select: { receiptUploadId: true, store: { select: { sellerId: true } } },
    });
    const allowed = sub && (user.role === "ADMIN" || sub.store.sellerId === user.id);
    if (!sub || !allowed || !sub.receiptUploadId) return new Response("No encontrado", { status: 404 });

    const upload = await prisma.upload.findUnique({
      where: { id: sub.receiptUploadId },
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
    if (error instanceof AuthError) return new Response("No autorizado", { status: error.status });
    console.error("[store/receipt:GET]", error);
    return new Response("Error", { status: 500 });
  }
}
