import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { supportTicketActionSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Devuelve el ticket solo si el usuario es el admin o el vendedor dueño. */
async function loadTicket(id: string, user: { id: string; role: string }) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      sellerId: true,
      subject: true,
      category: true,
      status: true,
      createdAt: true,
      seller: {
        select: { name: true, email: true, slug: true, store: { select: { plan: { select: { name: true } } } } },
      },
    },
  });
  if (!ticket) return null;
  if (user.role !== "ADMIN" && ticket.sellerId !== user.id) return null;
  return ticket;
}

/** Ticket con todos sus mensajes. Al abrirlo, se marca como leído para quien lo mira. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const ticket = await loadTicket(id, user);
    if (!ticket) return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });

    const messages = await prisma.supportMessage.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, body: true, fromAdmin: true, createdAt: true },
    });

    await prisma.supportTicket.update({
      where: { id },
      data: user.role === "ADMIN" ? { adminUnread: false } : { sellerUnread: false },
      select: { id: true },
    });

    return NextResponse.json({ ticket, messages });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[support/id:GET]", error);
    return NextResponse.json({ error: "No se pudo cargar el ticket" }, { status: 500 });
  }
}

/** Cerrar o reabrir. El vendedor puede cerrar el suyo; reabrir es cosa del admin. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const ticket = await loadTicket(id, user);
    if (!ticket) return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });

    const parsed = supportTicketActionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Acción inválida" }, { status: 400 });

    if (parsed.data.action === "reopen") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Solo el administrador puede reabrir un ticket." }, { status: 403 });
      }
      await prisma.supportTicket.update({ where: { id }, data: { status: "OPEN", sellerUnread: true } });
    } else {
      await prisma.supportTicket.update({
        where: { id },
        data: {
          status: "CLOSED",
          adminUnread: false,
          // Si lo cierra el admin, el vendedor se entera; si lo cierra el vendedor no hace falta avisarle.
          ...(user.role === "ADMIN" ? { sellerUnread: true } : { sellerUnread: false }),
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[support/id:PATCH]", error);
    return NextResponse.json({ error: "No se pudo actualizar el ticket" }, { status: 500 });
  }
}
