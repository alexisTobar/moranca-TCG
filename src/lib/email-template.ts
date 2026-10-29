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
 * Correo con la marca de TCG Cardeck. Usa tablas e estilos en línea porque los clientes de correo
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
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;background:#eef0f4;padding:28px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(c.paragraphs?.[0] ?? c.heading)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
    <tr><td align="center" style="background:#080b16;border-radius:18px 18px 0 0;padding:26px 28px 22px;border-bottom:3px solid #f5c451">
      <a href="${esc(origin)}" style="text-decoration:none"><img src="${esc(origin)}/email-logo.png" width="150" alt="TCG Cardeck" style="display:block;border:0;outline:none;height:auto;max-width:150px"></a>
    </td></tr>
    <tr><td style="background:#ffffff;padding:32px 30px 34px;border-radius:0 0 18px 18px;box-shadow:0 1px 0 #e5e7eb">
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
    <tr><td style="padding:20px 8px 4px;text-align:center;font-size:12px;line-height:1.7;color:#6b7280">
      <strong style="color:#374151">TCG Cardeck</strong> · Cartas TCG en Chile<br>
      <a href="mailto:contacto@tcgcardeck.cl" style="color:#6b7280">contacto@tcgcardeck.cl</a><br>
      <span style="color:#9ca3af">Recibes este correo porque tienes una cuenta en TCG Cardeck.</span><br>
      <a href="${esc(origin)}/politica-de-privacidad" style="color:#9ca3af">Privacidad</a> ·
      <a href="${esc(origin)}/terminos-y-condiciones" style="color:#9ca3af">Términos</a>
    </td></tr>
  </table>
</body></html>`;
}
