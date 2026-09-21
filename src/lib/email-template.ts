const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface EmailContent {
  /** Título grande del correo. */
  heading: string;
  /** Párrafos de texto (se escapan). */
  paragraphs?: string[];
  /** Tabla de datos clave: etiqueta y valor. */
  rows?: Array<[string, string]>;
  /** Botón principal. */
  cta?: { label: string; url: string };
  /** Texto pequeño bajo el botón. */
  note?: string;
}

/**
 * Correo con la marca de Win Condition. Usa tablas e estilos en línea porque los clientes de correo
 * (Gmail, Outlook) ignoran casi todo el CSS moderno.
 */
export function renderEmail(c: EmailContent, origin: string): string {
  const rows = (c.rows ?? [])
    .map(
      ([k, v]) => `<tr>
        <td style="padding:8px 0;color:#6b7280;font-size:13px;width:42%;vertical-align:top">${esc(k)}</td>
        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;vertical-align:top">${esc(v)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f3f4f6;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
    <tr><td style="background:#080b16;border-radius:16px 16px 0 0;padding:20px 28px">
      <span style="color:#f5c451;font-weight:800;font-size:15px;letter-spacing:.06em">WIN CONDITION TCG</span>
    </td></tr>
    <tr><td style="background:#ffffff;padding:30px 28px;border-radius:0 0 16px 16px">
      <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;color:#0b0f1a">${esc(c.heading)}</h1>
      ${(c.paragraphs ?? []).map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151">${esc(p)}</p>`).join("")}
      ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb">${rows}</table>` : ""}
      ${
        c.cta
          ? `<p style="margin:22px 0 6px"><a href="${esc(c.cta.url)}" style="display:inline-block;background:#c22443;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:12px">${esc(c.cta.label)}</a></p>`
          : ""
      }
      ${c.note ? `<p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#6b7280">${esc(c.note)}</p>` : ""}
    </td></tr>
    <tr><td style="padding:16px 8px;text-align:center;font-size:11px;line-height:1.6;color:#9ca3af">
      Recibes este correo porque tienes una cuenta en Win Condition TCG.<br>
      <a href="${esc(origin)}/politica-de-privacidad" style="color:#9ca3af">Privacidad</a> ·
      <a href="${esc(origin)}/terminos-y-condiciones" style="color:#9ca3af">Términos</a>
    </td></tr>
  </table>
</body></html>`;
}
