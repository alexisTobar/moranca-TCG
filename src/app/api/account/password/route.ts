import { audit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, createSession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { passwordSchema } from "@/lib/validators";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(1, "Escribe tu contraseña actual").max(200),
  newPassword: passwordSchema,
});

/** Cambiar la contraseña estando con sesión. Cierra las demás sesiones y deja abierta la actual. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();

    const limiter = await rateLimit(clientKey(req, `change-password:${user.id}`), 6, 900);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    const { currentPassword, newPassword } = parsed.data;

    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });
    if (!row || !(await verifyPassword(currentPassword, row.password))) {
      return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: "La nueva contraseña debe ser distinta a la actual" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
      select: { id: true, email: true, name: true, role: true, tokenVersion: true },
    });
    // Las demás sesiones (otros dispositivos) quedan cerradas; esta se renueva.
    await createSession({ sub: updated.id, email: updated.email, name: updated.name, role: updated.role, tv: updated.tokenVersion });

    await audit({ id: user.id, name: user.name }, "security.password_changed", { type: "User", id: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/password]", error);
    return NextResponse.json({ error: "No se pudo cambiar la contraseña" }, { status: 500 });
  }
}
