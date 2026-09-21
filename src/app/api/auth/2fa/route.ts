import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPurposeToken } from "@/lib/auth";
import { PENDING_2FA_COOKIE } from "@/lib/login";
import { clearRateLimit, clientKey, rateLimit } from "@/lib/rate-limit";
import { decryptSecret, hashRecoveryCode, verifyTotp } from "@/lib/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().trim().min(6).max(20) });

/** Segunda etapa del login: valida el código de la app (o un código de respaldo) y recién ahí abre la sesión. */
export async function POST(req: Request) {
  const store = await cookies();
  const pending = await verifyPurposeToken("2fa", store.get(PENDING_2FA_COOKIE)?.value ?? "");
  if (!pending || typeof pending.sub !== "string") {
    return NextResponse.json({ error: "Tu verificación expiró. Vuelve a iniciar sesión." }, { status: 401 });
  }
  const userId = pending.sub;

  const key = clientKey(req, `2fa:${userId}`);
  const limit = await rateLimit(key, 6, 300);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Escribe el código" }, { status: 400 });
  const code = parsed.data.code;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, role: true, active: true, tokenVersion: true,
      totpSecret: true, totpEnabledAt: true, totpLastStep: true, totpRecoveryHashes: true,
    },
  });
  if (!user || !user.active || !user.totpEnabledAt || !user.totpSecret) {
    return NextResponse.json({ error: "No se pudo verificar la cuenta" }, { status: 401 });
  }

  let ok = false;
  if (/^\d{6}$/.test(code)) {
    const step = verifyTotp(decryptSecret(user.totpSecret), code, user.totpLastStep);
    if (step !== null) {
      // Guarda el paso usado: el mismo código no vale dos veces.
      await prisma.user.update({ where: { id: user.id }, data: { totpLastStep: step } });
      ok = true;
    }
  } else {
    const hash = hashRecoveryCode(code);
    if (user.totpRecoveryHashes.includes(hash)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { totpRecoveryHashes: user.totpRecoveryHashes.filter((h) => h !== hash) },
      });
      ok = true;
    }
  }
  if (!ok) return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });

  await clearRateLimit(key);
  store.delete(PENDING_2FA_COOKIE);
  await createSession(
    { sub: user.id, email: user.email, name: user.name, role: user.role, tv: user.tokenVersion },
    pending.remember === true
  );
  return NextResponse.json({ ok: true, role: user.role, recoveryLeft: user.totpRecoveryHashes.length });
}
