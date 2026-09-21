import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reenvía el link de confirmación al email de la cuenta. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } });
    if (row?.emailVerifiedAt) return NextResponse.json({ ok: true, already: true });

    const limiter = await rateLimit(clientKey(req, `resend-verify:${user.id}`), 3, 3600);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Ya pediste varios correos. Revisa tu bandeja (y spam) o inténtalo más tarde." },
        { status: 429 }
      );
    }
    await sendVerificationEmail({ id: user.id, email: user.email, name: user.name });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/verify-email]", error);
    return NextResponse.json({ error: "No se pudo enviar el correo" }, { status: 500 });
  }
}
