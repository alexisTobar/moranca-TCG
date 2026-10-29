import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth";
import { mailConfigured, sendEmail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Envía un correo de prueba al administrador que lo pide, para comprobar que Resend está bien configurado. */
export async function POST() {
  try {
    const admin = await requireAdmin();
    if (!mailConfigured()) {
      return NextResponse.json({ ok: false, error: "RESEND_API_KEY no está configurada en este entorno: los correos no se envían." }, { status: 200 });
    }
    const { sent } = await sendEmail({ to: admin.email, subject: "Prueba de correo · TCG Cardeck", html: "<p>Si ves este mensaje, el envío de correos funciona.</p>" });
    return NextResponse.json({
      ok: sent,
      to: admin.email,
      error: sent ? undefined : "Resend rechazó el envío. Revisa los logs del servidor: suele ser un dominio sin verificar o un remitente no permitido.",
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: "No se pudo probar el correo" }, { status: 500 });
  }
}
