import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { containsProfanity } from "@/lib/profanity";
import { generateTicketCode, notifyAdmins } from "@/lib/notify";
import { sendEmail } from "@/lib/mail";
import { contactTopicLabel } from "@/lib/contact-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const schema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(80),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido").max(160),
  topic: z.enum(["CUENTA", "COMPRA", "VENDER", "OTRO"]),
  subject: z.string().trim().min(4, "Escribe un asunto de al menos 4 caracteres").max(120),
  body: z.string().trim().min(10, "Cuéntanos un poco más (mínimo 10 caracteres)").max(2000),
  /** Campo trampa: las personas no lo ven; si viene con texto, es un bot. */
  website: z.string().max(500).optional(),
});

/** Formulario público de contacto: no exige cuenta, así también sirve a quien no puede ingresar. */
export async function POST(req: Request) {
  const limiter = await rateLimit(clientKey(req, "contact"), 3, 3600);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Ya enviaste varias consultas. Intenta de nuevo en una hora." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { name, email, topic, subject, body, website } = parsed.data;
  // Bot: se responde como si todo saliera bien para no darle pistas.
  if (website) return NextResponse.json({ ok: true, code: "SP-RECIBIDO" });
  if (containsProfanity(subject) || containsProfanity(body)) {
    return NextResponse.json({ error: "Evita groserías o lenguaje ofensivo, reformula tu mensaje." }, { status: 400 });
  }
  try {
    const code = generateTicketCode();
    const message = await prisma.contactMessage.create({ data: { code, name, email, topic, subject, body } });
    await notifyAdmins(`Nueva consulta ${code} de ${name}`, [`Tema: ${contactTopicLabel(topic)}`, `Correo: ${email}`, `Asunto: ${subject}`, body.slice(0, 400)], "/panel/contacto");
    await sendEmail({
      to: email,
      subject: `Recibimos tu consulta ${code}`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:520px"><h2 style="margin:0 0 12px">Recibimos tu consulta</h2><p>Hola ${esc(name)}, tu número de consulta es <strong>${code}</strong>. Te responderemos a este correo.</p><p style="color:#586174">Asunto: ${esc(subject)}</p></div>`,
    }).catch(() => undefined);
    return NextResponse.json({ ok: true, code: message.code });
  } catch (error) {
    console.error("[contact]", error);
    return NextResponse.json({ error: "No pudimos guardar tu consulta. Intenta de nuevo en unos minutos." }, { status: 503 });
  }
}
