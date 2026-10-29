import { emailNotVerifiedResponse } from "@/lib/verification";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { sellerRequestSchema } from "@/lib/validators";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { notifyAdmins } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "BUYER") {
      return NextResponse.json(
        { error: "Solo los compradores pueden pedir pasar a vendedor" },
        { status: 400 }
      );
    }

    const unverified = emailNotVerifiedResponse(user);
    if (unverified) return unverified;

    const limiter = await rateLimit(clientKey(req, `seller-request:${user.id}`), 5, 3600);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });
    }

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { sellerRequestStatus: true },
    });
    if (current?.sellerRequestStatus === "PENDING") {
      return NextResponse.json(
        { error: "Ya tienes una solicitud pendiente" },
        { status: 409 }
      );
    }

    const parsed = sellerRequestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        sellerRequestStatus: "PENDING",
        sellerRequestMessage: parsed.data.message ?? null,
        sellerRequestAt: new Date(),
      },
    });

    await notifyAdmins(
      "Nueva solicitud para ser vendedor",
      ["Un comprador quiere empezar a vender en TCG Cardeck. Revisa su solicitud y apruébala o recházala."],
      "/panel/usuarios",
      [["Nombre", user.name], ["Correo", user.email], ...(parsed.data.message ? [["Mensaje", parsed.data.message] as [string, string]] : [])]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/seller-request:POST]", error);
    return NextResponse.json({ error: "No se pudo enviar tu solicitud" }, { status: 500 });
  }
}
