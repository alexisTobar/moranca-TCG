import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reply"), reply: z.string().trim().min(2, "Escribe la respuesta").max(4000) }),
  z.object({ action: z.literal("close") }),
]);

/** El administrador responde por correo una consulta del formulario público, o la cierra. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Acción inválida" }, { status: 400 });
    const message = await prisma.contactMessage.findUnique({ where: { id } });
    if (!message) return NextResponse.json({ error: "Consulta no encontrada" }, { status: 404 });

    if (parsed.data.action === "close") {
      await prisma.contactMessage.update({ where: { id }, data: { status: "CLOSED" } });
      await audit(admin, "contact.close", { type: "ContactMessage", id, detail: message.code });
      return NextResponse.json({ ok: true });
    }
    const { reply } = parsed.data;
    const sent = await sendEmail({
      to: message.email,
      subject: `Respuesta a tu consulta ${message.code}`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:520px"><h2 style="margin:0 0 12px">Hola ${esc(message.name)}</h2>${reply.split(/\n+/).map((p) => `<p style="margin:8px 0">${esc(p)}</p>`).join("")}<hr style="border:0;border-top:1px solid #d8dee7;margin:18px 0"><p style="color:#586174;font-size:13px">Tu consulta (${message.code}): ${esc(message.subject)}</p></div>`,
    });
    await prisma.contactMessage.update({ where: { id }, data: { status: "ANSWERED", reply, repliedAt: new Date() } });
    await audit(admin, "contact.reply", { type: "ContactMessage", id, detail: message.code });
    return NextResponse.json({ ok: true, emailed: sent.sent });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[admin/contact]", error);
    return NextResponse.json({ error: "No se pudo guardar la respuesta" }, { status: 500 });
  }
}
