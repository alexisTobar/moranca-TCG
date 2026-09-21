import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { supportTicketSchema } from "@/lib/validators";
import { containsProfanity } from "@/lib/profanity";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isStoreActive } from "@/lib/store";
import { generateTicketCode, notifyAdmins } from "@/lib/notify";
import { MAX_OPEN_TICKETS, categoryLabel } from "@/lib/support-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lista de tickets: el admin ve todos, el vendedor solo los suyos. */
export async function GET() {
  try {
    const user = await requireUser();
    if (user.role === "BUYER") return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    const tickets = await prisma.supportTicket.findMany({
      where: user.role === "ADMIN" ? {} : { sellerId: user.id },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      select: {
        id: true,
        code: true,
        subject: true,
        category: true,
        status: true,
        adminUnread: true,
        sellerUnread: true,
        lastMessageAt: true,
        seller: { select: { name: true } },
      },
    });
    return NextResponse.json({ tickets });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[support:GET]", error);
    return NextResponse.json({ error: "No se pudieron cargar los tickets" }, { status: 500 });
  }
}

/** Abrir un ticket: exclusivo de vendedores con membresía de tienda vigente. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "SELLER") {
      return NextResponse.json({ error: "Solo los vendedores con tienda pueden abrir tickets." }, { status: 403 });
    }

    const store = await prisma.store.findUnique({
      where: { sellerId: user.id },
      select: { status: true, planId: true, activeUntil: true, plan: { select: { name: true } } },
    });
    if (!store || !isStoreActive(store)) {
      return NextResponse.json(
        { error: "El soporte directo es parte de la membresía de tienda. Activa un plan para usarlo." },
        { status: 403 }
      );
    }

    const limiter = await rateLimit(clientKey(req, `ticket:${user.id}`), 6, 3600);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Abriste muchos tickets seguidos. Intenta más tarde." }, { status: 429 });
    }

    const parsed = supportTicketSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    const { subject, category, body } = parsed.data;
    if (containsProfanity(subject) || containsProfanity(body)) {
      return NextResponse.json({ error: "Evita groserías o lenguaje ofensivo, reformula tu mensaje." }, { status: 400 });
    }

    const open = await prisma.supportTicket.count({ where: { sellerId: user.id, status: { not: "CLOSED" } } });
    if (open >= MAX_OPEN_TICKETS) {
      return NextResponse.json(
        { error: `Ya tienes ${MAX_OPEN_TICKETS} tickets abiertos. Espera respuesta o cierra alguno.` },
        { status: 409 }
      );
    }

    let ticket = null;
    for (let i = 0; i < 5 && !ticket; i++) {
      try {
        ticket = await prisma.supportTicket.create({
          data: {
            code: generateTicketCode(),
            sellerId: user.id,
            subject,
            category,
            adminUnread: true,
            sellerUnread: false,
            messages: { create: { authorId: user.id, fromAdmin: false, body } },
          },
          select: { id: true, code: true },
        });
      } catch (error) {
        // Código repetido (muy improbable): se reintenta con otro.
        if ((error as { code?: string }).code !== "P2002") throw error;
      }
    }
    if (!ticket) throw new Error("No se pudo generar el código del ticket");

    await notifyAdmins(
      `Nuevo ticket ${ticket.code} de ${user.name}`,
      [`Plan: ${store.plan?.name ?? "—"} · ${categoryLabel(category)}`, `Asunto: ${subject}`, body.slice(0, 400)],
      `/panel/soporte/${ticket.id}`
    );

    return NextResponse.json({ ok: true, ticket }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[support:POST]", error);
    return NextResponse.json({ error: "No se pudo crear el ticket" }, { status: 500 });
  }
}
