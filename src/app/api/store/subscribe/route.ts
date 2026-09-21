import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { storeSubscribeSchema } from "@/lib/validators";
import { ensureDefaultPlans, ensureStore, generateStoreReference } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** El vendedor pide comprar (o renovar) un plan. Queda pendiente hasta que el administrador confirme el pago. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "SELLER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo los vendedores pueden tener tienda" }, { status: 403 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Como administrador ya tienes el plan Pro incluido, sin vencimiento." },
        { status: 409 }
      );
    }

    const limiter = await rateLimit(clientKey(req, `store-subscribe:${user.id}`), 6, 3600);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });
    }

    const parsed = storeSubscribeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    await ensureDefaultPlans();
    const plan = await prisma.storePlan.findUnique({ where: { code: parsed.data.planCode } });
    if (!plan || !plan.active) {
      return NextResponse.json({ error: "Ese plan no está disponible." }, { status: 404 });
    }

    const store = await ensureStore(user.id);

    // Una solicitud pendiente a la vez: evita acumular pagos duplicados.
    const pending = await prisma.storeSubscription.findFirst({
      where: { storeId: store.id, status: "PENDING" },
      select: { id: true },
    });
    if (pending) {
      return NextResponse.json(
        { error: "Ya tienes una solicitud pendiente. Sube tu comprobante o cancélala antes de crear otra." },
        { status: 409 }
      );
    }

    const subscription = await prisma.storeSubscription.create({
      data: {
        storeId: store.id,
        planId: plan.id,
        months: parsed.data.months,
        amount: plan.priceMonthly * parsed.data.months,
        reference: generateStoreReference(),
      },
      select: { id: true, reference: true, amount: true, months: true },
    });

    return NextResponse.json({ ok: true, subscription }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[store/subscribe:POST]", error);
    return NextResponse.json({ error: "No se pudo crear la solicitud" }, { status: 500 });
  }
}
