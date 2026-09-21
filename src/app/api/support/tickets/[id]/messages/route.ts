import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { supportMessageSchema } from "@/lib/validators";
import { containsProfanity } from "@/lib/profanity";
import { clientKey, memoryRateLimit } from "@/lib/rate-limit";
import { isStoreActive } from "@/lib/store";
import { notifyAdmins, notifyUser } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Responder en un ticket. El admin responde siempre; el vendedor solo mientras tenga membresía vigente. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const isAdmin = user.role === "ADMIN";

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true, code: true, subject: true, sellerId: true, status: true, seller: { select: { name: true, email: true } } },
    });
    if (!ticket || (!isAdmin && ticket.sellerId !== user.id)) {
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
    }

    if (!isAdmin) {
      if (user.role !== "SELLER") return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
      const store = await prisma.store.findUnique({
        where: { sellerId: user.id },
        select: { status: true, planId: true, activeUntil: true },
      });
      if (!store || !isStoreActive(store)) {
        return NextResponse.json(
          { error: "Tu membresía no está vigente. Renuévala para seguir escribiendo en soporte." },
          { status: 403 }
        );
      }
      if (ticket.status === "CLOSED") {
        return NextResponse.json({ error: "Este ticket está cerrado. Abre uno nuevo si aún necesitas ayuda." }, { status: 409 });
      }
    }

    const limiter = memoryRateLimit(clientKey(req, `ticket-msg:${user.id}`), 20, 60);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Estás mandando mensajes muy rápido, espera un poco." }, { status: 429 });
    }

    const parsed = supportMessageSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Mensaje inválido" }, { status: 400 });
    }
    if (!isAdmin && containsProfanity(parsed.data.body)) {
      return NextResponse.json({ error: "Evita groserías o lenguaje ofensivo, reformula tu mensaje." }, { status: 400 });
    }

    const now = new Date();
    const [message] = await prisma.$transaction([
      prisma.supportMessage.create({
        data: { ticketId: id, authorId: user.id, fromAdmin: isAdmin, body: parsed.data.body },
        select: { id: true, body: true, fromAdmin: true, createdAt: true },
      }),
      prisma.supportTicket.update({
        where: { id },
        data: isAdmin
          ? { status: "ANSWERED", sellerUnread: true, adminUnread: false, lastMessageAt: now }
          : { status: "OPEN", adminUnread: true, sellerUnread: false, lastMessageAt: now },
        select: { id: true },
      }),
    ]);

    if (isAdmin) {
      await notifyUser(
        ticket.seller.email,
        `Respondieron tu ticket ${ticket.code}`,
        [`Asunto: ${ticket.subject}`, parsed.data.body.slice(0, 400)],
        `/panel/soporte/${ticket.id}`
      );
    } else {
      await notifyAdmins(
        `Nuevo mensaje en ${ticket.code} de ${ticket.seller.name}`,
        [`Asunto: ${ticket.subject}`, parsed.data.body.slice(0, 400)],
        `/panel/soporte/${ticket.id}`
      );
    }

    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[support/messages:POST]", error);
    return NextResponse.json({ error: "No se pudo enviar el mensaje" }, { status: 500 });
  }
}
