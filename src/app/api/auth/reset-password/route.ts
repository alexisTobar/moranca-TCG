import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { passwordSchema } from "@/lib/validators";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(10).max(200),
  password: passwordSchema,
});

export async function POST(req: Request) {
  const limiter = await rateLimit(clientKey(req, "reset-password"), 10, 900);
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const record = await prisma.passwordReset.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "El link expiró o ya se usó. Pide uno nuevo." },
      { status: 400 }
    );
  }

  const hashed = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true });
}
