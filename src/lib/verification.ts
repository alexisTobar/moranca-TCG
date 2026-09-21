import "server-only";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mailConfigured, sendEmail } from "@/lib/mail";
import { renderEmail } from "@/lib/email-template";
import { siteOrigin } from "@/lib/store";

/**
 * Las cuentas creadas desde esta fecha deben confirmar su email para comprar o pedir ser vendedor.
 * Las anteriores quedan exentas para no dejar a nadie afuera de golpe.
 */
export const VERIFICATION_START = new Date("2026-09-21T00:00:00Z");
const TOKEN_HOURS = 24;

export interface VerifiableUser {
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

/** ¿Esta persona tiene que confirmar su email antes de seguir? Solo si el correo real está configurado. */
export function emailVerificationRequired(user: VerifiableUser): boolean {
  return mailConfigured() && !user.emailVerifiedAt && user.createdAt >= VERIFICATION_START;
}

/** Respuesta 403 estándar para las acciones que exigen email confirmado, o null si puede seguir. */
export function emailNotVerifiedResponse(user: VerifiableUser): NextResponse | null {
  if (!emailVerificationRequired(user)) return null;
  return NextResponse.json(
    {
      error:
        "Confirma tu email para continuar. Te enviamos un link a tu correo; también puedes pedir uno nuevo desde Mi cuenta.",
      code: "EMAIL_NOT_VERIFIED",
    },
    { status: 403 }
  );
}

/** Crea un link de verificación y lo manda por correo. Nunca lanza: si falla, se registra y se sigue. */
export async function sendVerificationEmail(user: { id: string; email: string; name: string }) {
  try {
    const raw = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        tokenHash: crypto.createHash("sha256").update(raw).digest("hex"),
        expiresAt: new Date(Date.now() + TOKEN_HOURS * 3600_000),
      },
    });
    const origin = await siteOrigin();
    await sendEmail({
      to: user.email,
      subject: "Confirma tu email en Win Condition TCG",
      html: renderEmail(
        {
          heading: "Confirma tu email",
          paragraphs: [
            `Hola ${user.name.split(" ")[0]}, para poder comprar y vender necesitamos confirmar que este correo es tuyo.`,
          ],
          cta: { label: "Confirmar mi email", url: `${origin}/verificar/${raw}` },
          note: `El link vale ${TOKEN_HOURS} horas y solo se puede usar una vez. Si no creaste esta cuenta, ignora este correo.`,
        },
        origin
      ),
    });
  } catch (error) {
    console.error("[verification] no se pudo enviar el link", error);
  }
}
