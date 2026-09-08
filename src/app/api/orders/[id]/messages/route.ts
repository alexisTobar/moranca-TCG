import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { orderMessageSchema } from "@/lib/validators";
import { containsProfanity } from "@/lib/profanity";
import { memoryRateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorizeOrder(orderId: string, userId: string, isAdmin: boolean) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, buyerId: true, sellerId: true },
  });
  if (!order) return null;
  if (!isAdmin && order.buyerId !== userId && order.sellerId !== userId) return null;
  return order;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const order = await authorizeOrder(id, user.id, user.role === "ADMIN");
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const messages = await prisma.orderMessage.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        body: true,
        attachmentUrl: true,
        createdAt: true,
        senderId: true,
        sender: { select: { name: true } },
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[orders/messages:GET]", error);
    return NextResponse.json({ error: "No se pudieron cargar los mensajes" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const order = await authorizeOrder(id, user.id, user.role === "ADMIN");
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const limiter = memoryRateLimit(clientKey(req, `order-msg:${user.id}`), 20, 60);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Estás mandando mensajes muy rápido, espera un poco." },
        { status: 429 }
      );
    }

    const parsed = orderMessageSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Mensaje inválido" },
        { status: 400 }
      );
    }

    if (containsProfanity(parsed.data.body)) {
      return NextResponse.json(
        { error: "Evita groserías o lenguaje ofensivo, reformula tu mensaje." },
        { status: 400 }
      );
    }

    const message = await prisma.orderMessage.create({
      data: {
        orderId: id,
        senderId: user.id,
        body: parsed.data.body.trim(),
        attachmentUrl: parsed.data.attachmentUrl ?? null,
      },
      select: {
        id: true,
        body: true,
        attachmentUrl: true,
        createdAt: true,
        senderId: true,
        sender: { select: { name: true } },
      },
    });

    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[orders/messages:POST]", error);
    return NextResponse.json({ error: "No se pudo enviar el mensaje" }, { status: 500 });
  }
}
