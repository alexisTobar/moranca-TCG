import { audit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser, verifyPassword } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { buildQr } from "@/lib/qr";
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  otpauthUrl,
  verifyTotp,
} from "@/lib/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setup") }),
  z.object({ action: z.literal("enable"), code: z.string().trim().length(6) }),
  z.object({ action: z.literal("disable"), password: z.string().min(1).max(200), code: z.string().trim().min(6).max(20) }),
]);

/** Activar o desactivar la verificación en dos pasos de la propia cuenta. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const limiter = await rateLimit(clientKey(req, `2fa-manage:${user.id}`), 12, 900);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
    }
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    const data = parsed.data;

    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true, totpSecret: true, totpEnabledAt: true, totpLastStep: true, totpRecoveryHashes: true },
    });
    if (!row) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    if (data.action === "setup") {
      if (row.totpEnabledAt) return NextResponse.json({ error: "La verificación en dos pasos ya está activa" }, { status: 409 });
      const secret = generateTotpSecret();
      await prisma.user.update({ where: { id: user.id }, data: { totpSecret: encryptSecret(secret), totpEnabledAt: null, totpLastStep: null } });
      const url = otpauthUrl(user.email, secret);
      return NextResponse.json({ ok: true, secret, otpauth: url, qr: buildQr(url, false) });
    }

    if (data.action === "enable") {
      if (row.totpEnabledAt) return NextResponse.json({ error: "Ya está activa" }, { status: 409 });
      if (!row.totpSecret) return NextResponse.json({ error: "Primero genera el código QR" }, { status: 400 });
      const step = verifyTotp(decryptSecret(row.totpSecret), data.code, null);
      if (step === null) return NextResponse.json({ error: "El código no es correcto. Revisa la hora de tu teléfono." }, { status: 400 });
      const recovery = generateRecoveryCodes(8);
      await prisma.user.update({
        where: { id: user.id },
        data: { totpEnabledAt: new Date(), totpLastStep: step, totpRecoveryHashes: recovery.map(hashRecoveryCode) },
      });
      await audit({ id: user.id, name: user.name }, "security.2fa_enabled", { type: "User", id: user.id });
      return NextResponse.json({ ok: true, recoveryCodes: recovery });
    }

    // disable
    if (!row.totpEnabledAt || !row.totpSecret) return NextResponse.json({ error: "La verificación en dos pasos no está activa" }, { status: 409 });
    if (!(await verifyPassword(data.password, row.password))) {
      return NextResponse.json({ error: "La contraseña no es correcta" }, { status: 400 });
    }
    let ok = false;
    if (/^\d{6}$/.test(data.code)) ok = verifyTotp(decryptSecret(row.totpSecret), data.code, row.totpLastStep) !== null;
    else ok = row.totpRecoveryHashes.includes(hashRecoveryCode(data.code));
    if (!ok) return NextResponse.json({ error: "El código no es correcto" }, { status: 400 });
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabledAt: null, totpLastStep: null, totpRecoveryHashes: [] },
    });
    await audit({ id: user.id, name: user.name }, "security.2fa_disabled", { type: "User", id: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/2fa]", error);
    return NextResponse.json({ error: "No se pudo completar la acción" }, { status: 500 });
  }
}
