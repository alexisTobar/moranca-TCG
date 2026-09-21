import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { siteOrigin } from "@/lib/store";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Código legible del ticket, por ejemplo SP-K7Q2M9XA. */
export function generateTicketCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `SP-${Array.from(crypto.randomBytes(8), (b) => alphabet[b % alphabet.length]).join("")}`;
}

/**
 * Aviso por correo a los administradores (opcional: sin RESEND_API_KEY solo queda en el log).
 * Nunca rompe la acción principal: cualquier falla se ignora.
 */
export async function notifyAdmins(subject: string, lines: string[], path: string) {
  try {
    const [admins, origin] = await Promise.all([
      prisma.user.findMany({ where: { role: "ADMIN", active: true }, select: { email: true } }),
      siteOrigin(),
    ]);
    const html = `<div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2 style="margin:0 0 12px">${esc(subject)}</h2>
      ${lines.map((l) => `<p style="margin:6px 0">${esc(l)}</p>`).join("")}
      <p style="margin-top:18px"><a href="${origin}${path}">Abrir en el panel</a></p></div>`;
    await Promise.all(admins.map((a) => sendEmail({ to: a.email, subject, html })));
  } catch (error) {
    console.error("[notify] no se pudo avisar a los administradores", error);
  }
}

/** Aviso por correo a un vendedor (por ejemplo, cuando el admin responde su ticket). */
export async function notifyUser(email: string, subject: string, lines: string[], path: string) {
  try {
    const origin = await siteOrigin();
    const html = `<div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2 style="margin:0 0 12px">${esc(subject)}</h2>
      ${lines.map((l) => `<p style="margin:6px 0">${esc(l)}</p>`).join("")}
      <p style="margin-top:18px"><a href="${origin}${path}">Abrir en el panel</a></p></div>`;
    await sendEmail({ to: email, subject, html });
  } catch (error) {
    console.error("[notify] no se pudo avisar al usuario", error);
  }
}
