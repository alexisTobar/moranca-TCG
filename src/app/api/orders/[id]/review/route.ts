import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { reviewSchema, reviewReplySchema } from "@/lib/validators";
import { containsProfanity } from "@/lib/profanity";
import { memoryRateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVIEWABLE_STATUSES = ["PAID", "SHIPPED"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, buyerId: true, sellerId: true, status: true, review: { select: { id: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    if (order.buyerId !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (!order.sellerId) {
      return NextResponse.json({ error: "Esta orden no tiene vendedor asociado" }, { status: 400 });
    }
    if (!REVIEWABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: "Solo puedes calificar órdenes pagadas o enviadas" },
        { status: 409 }
      );
    }
    if (order.review) {
      return NextResponse.json({ error: "Ya calificaste esta orden" }, { status: 409 });
    }

    const limiter = memoryRateLimit(clientKey(req, `review:${user.id}`), 10, 300);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Demasiadas reseñas seguidas." }, { status: 429 });
    }

    const parsed = reviewSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const data = parsed.data;
    if (data.comment && containsProfanity(data.comment)) {
      return NextResponse.json(
        { error: "Evita groserías o lenguaje ofensivo, reformula tu comentario." },
        { status: 400 }
      );
    }

    const review = await prisma.review.create({
      data: {
        orderId: id,
        sellerId: order.sellerId,
        buyerId: user.id,
        rating: data.rating,
        comment: data.comment?.trim() || null,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        sellerReply: true,
        createdAt: true,
        buyer: { select: { name: true } },
      },
    });

    return NextResponse.json({ ok: true, review }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Ya calificaste esta orden" }, { status: 409 });
    }
    console.error("[orders/review:POST]", error);
    return NextResponse.json({ error: "No se pudo guardar tu reseña" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, sellerId: true, review: { select: { id: true } } },
    });
    if (!order || !order.review) {
      return NextResponse.json({ error: "Esta orden no tiene reseña" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && order.sellerId !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const parsed = reviewReplySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    if (containsProfanity(parsed.data.sellerReply)) {
      return NextResponse.json(
        { error: "Evita groserías o lenguaje ofensivo, reformula tu respuesta." },
        { status: 400 }
      );
    }

    const review = await prisma.review.update({
      where: { id: order.review.id },
      data: { sellerReply: parsed.data.sellerReply.trim() },
      select: { id: true, rating: true, comment: true, sellerReply: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, review });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[orders/review:PATCH]", error);
    return NextResponse.json({ error: "No se pudo guardar la respuesta" }, { status: 500 });
  }
}
