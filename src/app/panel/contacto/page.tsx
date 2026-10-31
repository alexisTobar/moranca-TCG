import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { PRIVACY_REQUEST_DAYS, contactTopicLabel } from "@/lib/contact-shared";
import { ContactReply } from "@/components/panel/ContactReply";

export const dynamic = "force-dynamic";
export const metadata = { title: "Consultas de contacto", robots: { index: false } };

const FILTERS = [
  { key: "pendientes", label: "Por responder", status: "OPEN" },
  { key: "respondidas", label: "Respondidas", status: "ANSWERED" },
  { key: "cerradas", label: "Cerradas", status: "CLOSED" },
] as const;

/** Consultas del formulario público (/ayuda): personas sin cuenta o que no pueden ingresar. */
export default async function ContactInboxPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");
  if (user.role !== "ADMIN") redirect("/panel");
  const requested = (await searchParams).estado;
  const filter = FILTERS.find((f) => f.key === requested) ?? FILTERS[0];
  const [messages, counts] = await Promise.all([
    prisma.contactMessage.findMany({ where: { status: filter.status }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.contactMessage.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (status: string) => counts.find((c) => c.status === status)?._count._all ?? 0;
  return <div className="space-y-6">
    <header>
      <h1 className="font-display text-3xl font-bold">Consultas de contacto</h1>
      <p className="mt-2 text-sm text-ink-400">Mensajes del formulario de Ayuda, de personas sin cuenta o que no pueden ingresar. La respuesta llega por correo. Los tickets de compradores y vendedores están en <Link href="/panel/soporte" className="underline">Soporte</Link>.</p>
    </header>
    <nav aria-label="Estado" className="flex gap-1.5">{FILTERS.map((f) => <Link key={f.key} href={`/panel/contacto?estado=${f.key}`} data-active={f.key === filter.key} className="pill">{f.label} <span className="opacity-60">{count(f.status)}</span></Link>)}</nav>
    {messages.length === 0 ? <p className="rounded-2xl border border-dashed border-ink-700 p-8 text-center text-sm text-ink-400">No hay consultas en esta bandeja.</p> :
    <ul className="space-y-3">{messages.map((m) => <li key={m.id} className="rounded-2xl card-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-semibold">{m.subject}</h2><span className="text-xs text-ink-400">{m.code}, {timeAgo(m.createdAt)}</span></div>
      <p className="mt-1 text-[13px] text-ink-400">{m.name}, <a href={`mailto:${m.email}`} className="underline">{m.email}</a>. {contactTopicLabel(m.topic)}</p>
      {m.topic === "DATOS" && <PrivacyDeadline createdAt={m.createdAt} answered={m.status !== "OPEN"} />}
      <p className="mt-3 whitespace-pre-wrap text-[14px]">{m.body}</p>
      {m.reply && <div className="mt-3 rounded-xl bg-ink-900/40 p-3 text-[13px]"><p className="font-semibold">Respuesta enviada {m.repliedAt ? timeAgo(m.repliedAt) : ""}</p><p className="mt-1 whitespace-pre-wrap">{m.reply}</p></div>}
      <ContactReply id={m.id} closed={m.status === "CLOSED"} />
    </li>)}</ul>}
  </div>;
}

/** Solicitudes de derechos sobre datos personales: la ley da 30 días corridos para responder (prorrogables una vez) y 2 días hábiles para un bloqueo temporal. */
function PrivacyDeadline({ createdAt, answered }: { createdAt: Date; answered: boolean }) {
  const due = new Date(createdAt.getTime() + PRIVACY_REQUEST_DAYS * 86400000);
  const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86400000);
  const tone = answered ? "border-emerald-500/30 bg-emerald-500/10" : daysLeft <= 5 ? "border-rose-600/40 bg-rose-500/10" : "border-amber-500/40 bg-amber-500/10";
  return <p className={`mt-3 rounded-xl border p-3 text-[13px] ${tone}`}>
    <strong>Solicitud de datos personales (Ley 21.719).</strong>{" "}
    {answered ? "Respondida." : daysLeft >= 0 ? `Plazo legal: ${daysLeft} día${daysLeft === 1 ? "" : "s"} (vence el ${due.toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}).` : `Plazo legal vencido el ${due.toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}.`}{" "}
    Si piden bloqueo temporal, contesta en 2 días hábiles. Si rechazas, explica el motivo e indica que pueden reclamar ante la Agencia de Protección de Datos Personales dentro de 30 días hábiles.
  </p>;
}
