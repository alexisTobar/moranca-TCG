import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isStoreActive } from "@/lib/store";
import { categoryLabel } from "@/lib/support-shared";
import { TicketThread } from "@/components/support/TicketThread";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "BUYER") redirect("/cuenta");
  const isAdmin = user.role === "ADMIN";
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      sellerId: true,
      subject: true,
      category: true,
      status: true,
      createdAt: true,
      seller: {
        select: {
          name: true,
          email: true,
          slug: true,
          store: { select: { status: true, planId: true, activeUntil: true, plan: { select: { name: true } } } },
        },
      },
    },
  });
  if (!ticket || (!isAdmin && ticket.sellerId !== user.id)) notFound();

  const sellerActive = Boolean(ticket.seller.store && isStoreActive(ticket.seller.store));

  return (
    <div className="max-w-3xl space-y-5">
      <Link
        href="/panel/soporte"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-400 transition hover:text-carbon"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Volver a soporte
      </Link>

      <header>
        <p className="text-[12px] font-bold uppercase tracking-widest text-brand-600">
          {ticket.code} · {categoryLabel(ticket.category)}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-carbon">{ticket.subject}</h1>
        {isAdmin && (
          <p className="mt-2 text-[13px] text-ink-400">
            <Link href={`/vendedor/${ticket.seller.slug}`} className="font-semibold text-ink-300 hover:text-brand-600">
              {ticket.seller.name}
            </Link>{" "}
            · {ticket.seller.email} ·{" "}
            {sellerActive
              ? `Plan ${ticket.seller.store?.plan?.name ?? ""} vigente`
              : "Sin membresía vigente"}
          </p>
        )}
      </header>

      <TicketThread
        ticketId={ticket.id}
        viewer={isAdmin ? "admin" : "seller"}
        initialStatus={ticket.status}
        canWrite={isAdmin || sellerActive}
        blockedReason="Tu membresía no está vigente. Renuévala en Mi tienda para seguir escribiendo."
      />
    </div>
  );
}
