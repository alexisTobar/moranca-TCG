import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  password: z.string().min(1).max(200),
  confirm: z.literal("ELIMINAR"),
});

const IN_PROGRESS: Array<"PENDING" | "PAID" | "SHIPPED"> = ["PENDING", "PAID", "SHIPPED"];

/**
 * Elimina la cuenta: se anonimizan los datos personales y se cierra el acceso. Las órdenes ya finalizadas
 * se conservan sin datos del comprador (el vendedor las necesita para su contabilidad).
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "Una cuenta de administrador no se elimina desde aquí." }, { status: 403 });
    }
    const limiter = await rateLimit(clientKey(req, `delete-account:${user.id}`), 5, 3600);
    if (!limiter.allowed) return NextResponse.json({ error: "Demasiados intentos. Espera un momento." }, { status: 429 });

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Escribe tu contraseña y la palabra ELIMINAR para confirmar." }, { status: 400 });
    }

    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });
    if (!row || !(await verifyPassword(parsed.data.password, row.password))) {
      return NextResponse.json({ error: "La contraseña no es correcta" }, { status: 400 });
    }

    const open = await prisma.order.count({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }], status: { in: IN_PROGRESS } },
    });
    if (open > 0) {
      return NextResponse.json(
        { error: `Tienes ${open} orden(es) en curso. Termínalas o cancélalas antes de eliminar tu cuenta.` },
        { status: 409 }
      );
    }

    const tag = crypto.randomBytes(4).toString("hex");
    await prisma.$transaction(async (tx) => {
      // Tienda, cupones y publicaciones dejan de existir/mostrarse.
      await tx.store.deleteMany({ where: { sellerId: user.id } });
      await tx.coupon.deleteMany({ where: { sellerId: user.id } });
      await tx.listing.updateMany({ where: { sellerId: user.id }, data: { status: "PAUSED" } });
      await tx.oAuthAccount.deleteMany({ where: { userId: user.id } });
      await tx.emailVerification.deleteMany({ where: { userId: user.id } });
      await tx.passwordReset.deleteMany({ where: { userId: user.id } });
      await tx.report.updateMany({ where: { reporterId: user.id, status: "OPEN" }, data: { status: "DISMISSED", resolution: "Cuenta eliminada" } });

      // Compras terminadas: se borran los datos personales del comprador.
      await tx.order.updateMany({
        where: { buyerId: user.id },
        data: { buyerName: "Cuenta eliminada", buyerEmail: `eliminada-${tag}@deleted.invalid`, buyerPhone: null, shipAddress: null, shipCity: null, notes: null },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          name: "Cuenta eliminada",
          email: `eliminada-${user.id}@deleted.invalid`,
          slug: `eliminada-${tag}`,
          password: await hashPassword(crypto.randomBytes(32).toString("hex")),
          active: false,
          avatarUrl: null, bio: null, phone: null, city: null, region: null, rut: null, address: null,
          bankName: null, bankAccountType: null, bankAccountNumber: null, bankHolderName: null, bankRut: null,
          sellerRequestStatus: null, sellerRequestMessage: null, sellerRequestAt: null,
          totpSecret: null, totpEnabledAt: null, totpLastStep: null, totpRecoveryHashes: [],
          emailVerifiedAt: null,
          tokenVersion: { increment: 1 },
        },
      });
    });

    await audit({ id: user.id, name: "Cuenta eliminada" }, "security.account_deleted", { type: "User", id: user.id });
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/delete]", error);
    return NextResponse.json({ error: "No se pudo eliminar la cuenta" }, { status: 500 });
  }
}
