import "server-only";

/**
 * Envío de correo vía Resend. Sin RESEND_API_KEY, el correo no se manda de
 * verdad: se deja el contenido en los logs del servidor para poder probar el
 * flujo igual (mismo patrón que Mercado Pago / la cuenta bancaria: la app
 * funciona sin la clave configurada, solo que degradada).
 */
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
  const from = process.env.RESEND_FROM_EMAIL || "Dream Deck TCG <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(
      `[mail] RESEND_API_KEY no configurado. Correo no enviado a ${to}.\nAsunto: ${subject}\n${html}`
    );
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
