import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword, uniqueUserSlug, verifyPurposeToken } from "@/lib/auth";
import { completeLogin } from "@/lib/login";
import { OAUTH_COOKIE, exchangeCode, googleEnabled } from "@/lib/google";
import { LEGAL_VERSION } from "@/lib/legal";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { siteOrigin } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vuelta desde Google: valida, encuentra o crea la cuenta y abre la sesión (o pide el código 2FA). */
export async function GET(req: Request) {
  const origin = await siteOrigin();
  const fail = (code: string) => {
    const res = NextResponse.redirect(`${origin}/ingresar?error=${code}`);
    res.cookies.delete(OAUTH_COOKIE);
    return res;
  };
  if (!googleEnabled()) return fail("google_off");

  const url = new URL(req.url);
  if (url.searchParams.get("error")) return fail("google_cancelled");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("google_failed");

  const cookieHeader = req.headers.get("cookie") ?? "";
  const raw = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${OAUTH_COOKIE}=`))?.slice(OAUTH_COOKIE.length + 1);
  const saved = raw ? await verifyPurposeToken("oauth", raw) : null;
  if (!saved || typeof saved.state !== "string" || typeof saved.verifier !== "string") return fail("google_state");
  const a = Buffer.from(saved.state);
  const b = Buffer.from(state);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fail("google_state");

  const limit = await rateLimit(clientKey(req, "google-callback"), 20, 900);
  if (!limit.allowed) return fail("google_failed");

  let profile;
  try {
    profile = await exchangeCode(code, saved.verifier, origin);
  } catch (error) {
    console.error("[google] intercambio de código", error);
    return fail((error as Error).message === "EMAIL_NOT_VERIFIED" ? "google_unverified" : "google_failed");
  }

  // 1) ¿Ya vinculó esta cuenta de Google? 2) ¿Existe una cuenta con ese email? 3) Cuenta nueva.
  const linked = await prisma.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: profile.sub } },
    select: { user: { select: { id: true } } },
  });
  let userId = linked?.user.id ?? null;

  if (!userId) {
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email }, select: { id: true, emailVerifiedAt: true } });
    if (byEmail) {
      userId = byEmail.id;
      // Si esa cuenta nunca confirmó su email, alguien pudo haberla creado con un correo ajeno (y conoce su clave).
      // Google acaba de demostrar que el correo es de esta persona: se invalida la clave y las sesiones anteriores.
      if (!byEmail.emailVerifiedAt) {
        await prisma.user.update({
          where: { id: byEmail.id },
          data: { password: await hashPassword(crypto.randomBytes(32).toString("hex")), tokenVersion: { increment: 1 } },
        });
      }
    } else {
      const created = await prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          slug: await uniqueUserSlug(profile.name),
          // Clave aleatoria imposible de adivinar: quien entra con Google puede fijar una propia con "olvidé mi contraseña".
          password: await hashPassword(crypto.randomBytes(32).toString("hex")),
          role: "BUYER",
          termsAcceptedAt: new Date(),
          termsVersion: LEGAL_VERSION,
        },
        select: { id: true },
      });
      userId = created.id;
    }
    await prisma.oAuthAccount.create({ data: { userId, provider: "google", providerAccountId: profile.sub } });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, active: true, tokenVersion: true, totpEnabledAt: true, emailVerifiedAt: true },
  });
  if (!user || !user.active) return fail("google_inactive");
  // Google ya verificó este email.
  if (!user.emailVerifiedAt) await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });

  const next = typeof saved.next === "string" && saved.next.startsWith("/") && !saved.next.startsWith("//") ? saved.next : "";
  const { needs2fa } = await completeLogin(user, false);
  const dest = needs2fa
    ? `/ingresar/verificacion${next ? `?next=${encodeURIComponent(next)}` : ""}`
    : next || (user.role === "BUYER" ? "/cuenta" : "/panel");

  const res = NextResponse.redirect(`${origin}${dest}`);
  res.cookies.delete(OAUTH_COOKIE);
  return res;
}
