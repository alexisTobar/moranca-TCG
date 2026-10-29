import "server-only";

/**
 * Envío de correo vía Resend. Sin RESEND_API_KEY, el correo no se manda de
 * verdad: se deja el contenido en los logs del servidor para poder probar el
 * flujo igual (la app funciona sin la clave configurada, solo que degradada).
 */
/** ¿Está configurado el envío real de correos? (Sin esto, lo que exige correo se relaja para no dejar a nadie afuera.) */
export function mailConfigured(): boolean {
  if (process.env.NODE_ENV !== "production" && process.env.TEST_FORCE_MAIL === "1") return true;
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "TCG Cardeck <onboarding@resend.dev>";

  if (!apiKey) {
    // El cuerpo lleva enlaces con tokens (recuperar clave, verificar correo): solo se muestra fuera de producción.
    const body = process.env.NODE_ENV === "production" ? "(cuerpo omitido en producción)" : html;
    console.warn(`[mail] RESEND_API_KEY no configurado. Correo no enviado.\nAsunto: ${subject}\n${body}`);
    return { sent: false };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error("[mail] Resend respondió", res.status, await res.text());
    }
    return { sent: res.ok };
  } catch (error) {
    console.error("[mail] error enviando correo", error);
    return { sent: false };
  }
}
