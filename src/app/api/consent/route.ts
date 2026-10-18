import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clientKey, memoryRateLimit } from "@/lib/rate-limit";
import { CONSENT_VERSION, CONSENT_STATEMENTS } from "@/lib/consent-policy";

const schema = z.object({ accepted: z.boolean(), version: z.literal(CONSENT_VERSION) }).strict();
export async function POST(req: Request) {
  if (!memoryRateLimit(clientKey(req, "consent"), 30, 60).allowed)
    return NextResponse.json({ error: "Espera un minuto antes de reintentar." }, { status: 429 });
  let body;
  try { const raw = await req.text(); if (raw.length > 512) return new NextResponse(null, { status: 413 }); body = JSON.parse(raw); }
  catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Actualiza la página para revisar la política vigente." }, { status: 400 });
  try {
    const store = await cookies();
    const user = await getCurrentUser();
    const previous = store.get("wc_consent_subject")?.value;
    const subject = previous && z.string().uuid().safeParse(previous).success ? previous : randomUUID();
    const accepted = parsed.data.accepted && req.headers.get("dnt") !== "1" && req.headers.get("sec-gpc") !== "1";
    await prisma.consentRecord.create({ data: {
      subject, userId: user?.id, kind: "analytics", accepted,
      version: CONSENT_VERSION, statement: CONSENT_STATEMENTS.analytics, source: "privacy_preferences",
    } });
    const response = NextResponse.json({ accepted, version: CONSENT_VERSION });
    const options = { secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 15552000 };
    response.cookies.set("wc_consent_subject", subject, { ...options, httpOnly: true });
    response.cookies.set("wc_analytics", accepted ? "yes" : "no", options);
    response.cookies.set("wc_consent_version", CONSENT_VERSION, options);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch { return NextResponse.json({ error: "No pudimos guardar tu decisión. Intenta nuevamente; las estadísticas permanecen desactivadas." }, { status: 503 }); }
}
