import { audit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, createSession, requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cierra la sesión en todos los demás dispositivos (la de este navegador sigue abierta). */
export async function DELETE() {
  try {
    const user = await requireUser();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
      select: { id: true, email: true, name: true, role: true, tokenVersion: true },
    });
    await createSession({ sub: updated.id, email: updated.email, name: updated.name, role: updated.role, tv: updated.tokenVersion });
    await audit({ id: user.id, name: user.name }, "security.sessions_closed", { type: "User", id: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/sessions]", error);
    return NextResponse.json({ error: "No se pudieron cerrar las sesiones" }, { status: 500 });
  }
}
