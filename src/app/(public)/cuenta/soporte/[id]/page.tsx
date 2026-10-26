import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/support-shared";
import { TicketThread } from "@/components/support/TicketThread";

export const metadata: Metadata = { title: "Consulta de soporte", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BuyerTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?next=/cuenta/soporte");
  if (user.role !== "BUYER") redirect("/panel/soporte");
  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true, code: true, sellerId: true, requesterRole: true, subject: true, category: true, status: true },
  });
  if (!ticket || ticket.sellerId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <Link href="/cuenta/soporte" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-400 hover:text-carbon">
        <ArrowLeft className="h-4 w-4" /> Volver a soporte
      </Link>
      <header>
        <p className="text-[13px] font-semibold text-brand-600">{ticket.code} — {categoryLabel(ticket.category)}</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-carbon">{ticket.subject}</h1>
      </header>
      <TicketThread
        ticketId={ticket.id}
        viewer="buyer"
        requesterRole={ticket.requesterRole}
        initialStatus={ticket.status}
        canWrite
        blockedReason=""
      />
    </div>
  );
}
