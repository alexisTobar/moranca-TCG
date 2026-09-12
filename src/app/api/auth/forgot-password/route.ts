import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email().max(160) });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ingresa un email válido" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  const limiter = await rateLimit(clientKey(req, `forgot:${email}`), 5, 900);
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, active: true },
  });

  // La respuesta es siempre la misma exista o no la cuenta, para no dejar
  // adivinar qué emails están registrados.
  if (user?.active) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
      /\/$/,
      ""
    );
    const link = `${siteUrl}/recuperar/${token}`;

    await sendEmail({
      to: email,
      subject: "Recupera tu contraseña — Win Condition TCG",
      html: `<p>Hola ${user.name},</p><p>Haz clic en el link para elegir una contraseña nueva. Vence en 1 hora.</p><p><a href="${link}">${link}</a></p><p>Si no pediste esto, ignora este correo.</p>`,
    });
  }

  return NextResponse.json({ ok: true });
}
