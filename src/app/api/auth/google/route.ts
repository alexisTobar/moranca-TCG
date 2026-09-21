import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { signPurposeToken } from "@/lib/auth";
import { OAUTH_COOKIE, authorizationUrl, googleEnabled, newPkce } from "@/lib/google";
import { siteOrigin } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Inicio del login con Google: guarda state y verificador PKCE en una cookie firmada y manda a Google. */
export async function GET(req: Request) {
  const origin = await siteOrigin();
  if (!googleEnabled()) return NextResponse.redirect(`${origin}/ingresar?error=google_off`);

  const url = new URL(req.url);
  const rawNext = url.searchParams.get("next") ?? "";
  // Solo rutas internas: nunca redirigir a otro sitio.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";

  const state = crypto.randomBytes(24).toString("hex");
  const { verifier, challenge } = newPkce();
  const token = await signPurposeToken("oauth", { state, verifier, next }, 600);

  const res = NextResponse.redirect(authorizationUrl(origin, state, challenge));
  res.cookies.set(OAUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
