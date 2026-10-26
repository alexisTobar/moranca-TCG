import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { TICKET_STATUS_LABEL, categoryLabel } from "@/lib/support-shared";
import { NewTicketForm } from "@/components/support/NewTicketForm";

export const metadata: Metadata = { title: "Soporte", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-500/15 text-amber-700",
  ANSWERED: "bg-emerald-500/15 text-emerald-700",
  CLOSED: "bg-ink-800 text-ink-400",
};

/** Soporte del comprador: sus tickets y el formulario para abrir uno nuevo. */
export default async function BuyerSupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?next=/cuenta/soporte");
  if (user.role !== "BUYER") redirect("/panel/soporte");

  const tickets = await prisma.supportTicket.findMany({
    where: { sellerId: user.id },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    select: { id: true, code: true, subject: true, category: true, status: true, sellerUnread: true, lastMessageAt: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Link href="/cuenta" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-400 hover:text-carbon">
        <ArrowLeft className="h-4 w-4" /> Volver a mi cuenta
      </Link>
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Soporte</h1>
        <p className="mt-1 text-[14px] text-ink-400">
          ¿Problemas con un pedido, un pago o tu cuenta? Escríbenos y te respondemos por aquí y por correo.
        </p>
      </header>

      <section className="rounded-2xl card-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-carbon">Nueva consulta</h2>
        <NewTicketForm requester="BUYER" />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-carbon">Mis consultas</h2>
        {tickets.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink-700 p-8 text-center text-[13px] text-ink-400">
            Todavía no has abierto consultas.
          </p>
        ) : (
          <ul className="divide-y divide-ink-800 rounded-2xl card-surface">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/cuenta/soporte/${t.id}`} className="flex items-center gap-3 p-4 hover:bg-ink-900/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-carbon">
                      {t.sellerUnread && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-600" aria-label="Respuesta nueva" />}
                      {t.subject}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-400">
                      {t.code} — {categoryLabel(t.category)} — {timeAgo(t.lastMessageAt)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[t.status] ?? ""}`}>
                    {TICKET_STATUS_LABEL[t.status] ?? t.status}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
