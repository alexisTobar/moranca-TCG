import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ token: z.string().min(10).max(200) });

/** Confirma el email con el token del link. No exige sesión: el link puede abrirse en otro dispositivo. */
export async function POST(req: Request) {
  const limiter = await rateLimit(clientKey(req, "verify-email"), 20, 900);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Link inválido" }, { status: 400 });

  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const record = await prisma.emailVerification.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "El link expiró o ya se usó. Pide uno nuevo desde Mi cuenta." },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.emailVerification.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  return NextResponse.json({ ok: true });
}
