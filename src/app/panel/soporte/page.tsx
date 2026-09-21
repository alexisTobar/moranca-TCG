import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Inbox, LifeBuoy, LockKeyhole } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { isStoreActive } from "@/lib/store";
import { TICKET_STATUS_LABEL, categoryLabel } from "@/lib/support-shared";
import { NewTicketForm } from "@/components/support/NewTicketForm";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "pendientes", label: "Por responder", where: { status: "OPEN" } },
  { key: "respondidos", label: "Respondidos", where: { status: "ANSWERED" } },
  { key: "cerrados", label: "Cerrados", where: { status: "CLOSED" } },
  { key: "todos", label: "Todos", where: {} },
] as const;

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-500/15 text-amber-700",
  ANSWERED: "bg-emerald-500/15 text-emerald-700",
  CLOSED: "bg-ink-800 text-ink-400",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "BUYER") redirect("/cuenta");
  const isAdmin = user.role === "ADMIN";

  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.estado) ?? FILTERS[0];

  const store = isAdmin
    ? null
    : await prisma.store.findUnique({
        where: { sellerId: user.id },
        select: { status: true, planId: true, activeUntil: true, plan: { select: { name: true } } },
      });
  const active = Boolean(store && isStoreActive(store));

  const [tickets, counts] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { ...(isAdmin ? {} : { sellerId: user.id }), ...(isAdmin ? filter.where : {}) },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      select: {
        id: true,
        code: true,
        subject: true,
        category: true,
        status: true,
        adminUnread: true,
        sellerUnread: true,
        lastMessageAt: true,
        seller: { select: { name: true, store: { select: { plan: { select: { name: true } } } } } },
      },
    }),
    isAdmin
      ? prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } })
      : Promise.resolve([] as Array<{ status: string; _count: { _all: number } }>),
  ]);
  const countOf = (s?: string) =>
    s ? counts.find((c) => c.status === s)?._count._all ?? 0 : counts.reduce((n, c) => n + c._count._all, 0);

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Soporte</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          {isAdmin
            ? "Tickets de los vendedores con tienda. Al responder, el vendedor recibe el aviso en su panel."
            : "Canal directo con el administrador de Win Condition, exclusivo para vendedores con tienda."}
        </p>
      </header>

      {!isAdmin &&
        (active ? (
          <NewTicketForm />
        ) : (
          <div className="flex items-start gap-4 rounded-2xl border border-dashed border-ink-700 p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-850 text-ink-500">
              <LockKeyhole className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <p className="font-display text-base font-bold text-carbon">Soporte directo con la membresía de tienda</p>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-400">
                Con un plan Tienda o Pro puedes escribirle al administrador y hacer seguimiento de tus consultas aquí
                mismo.{" "}
                <Link href="/panel/tienda" className="font-semibold text-brand-600 hover:text-brand-700">
                  Ver planes
                </Link>
                . Mientras tanto, revisa el{" "}
                <Link href="/ayuda" className="font-semibold text-brand-600 hover:text-brand-700">
                  centro de ayuda
                </Link>
                .
              </p>
            </div>
          </div>
        ))}

      {isAdmin && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => {
            const n = f.key === "pendientes" ? countOf("OPEN") : f.key === "respondidos" ? countOf("ANSWERED") : f.key === "cerrados" ? countOf("CLOSED") : countOf();
            return (
              <Link
                key={f.key}
                href={`/panel/soporte?estado=${f.key}`}
                data-active={filter.key === f.key}
                className="pill shrink-0"
              >
                {f.label} <span className="opacity-60">{n}</span>
              </Link>
            );
          })}
        </div>
      )}

      {!isAdmin && tickets.length > 0 && (
        <h2 className="font-display text-lg font-bold text-carbon">Tus tickets</h2>
      )}

      {tickets.length === 0 ? (
        isAdmin ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-700 px-6 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-850 text-ink-500">
              <Inbox className="h-7 w-7" strokeWidth={1.5} />
            </span>
            <p className="mt-4 font-display text-lg font-bold text-carbon">Bandeja vacía</p>
            <p className="mt-1 text-[13px] text-ink-400">No hay tickets en esta vista.</p>
          </div>
        ) : null
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => {
            const unread = isAdmin ? t.adminUnread && t.status !== "CLOSED" : t.sellerUnread;
            return (
              <li key={t.id}>
                <Link
                  href={`/panel/soporte/${t.id}`}
                  className="group lift flex items-center gap-3.5 rounded-2xl card-surface p-4"
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-850 text-brand-600">
                    <LifeBuoy className="h-5 w-5" strokeWidth={1.75} />
                    {unread && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-brand-500 ring-2 ring-white" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[14px] text-carbon ${unread ? "font-bold" : "font-semibold"}`}>
                      {t.subject}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-ink-400">
                      {isAdmin && (
                        <>
                          {t.seller.name}
                          {t.seller.store?.plan ? ` · ${t.seller.store.plan.name}` : ""} ·{" "}
                        </>
                      )}
                      {t.code} · {categoryLabel(t.category)} · {timeAgo(t.lastMessageAt)}
                    </span>
                  </span>
                  <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold sm:inline ${STATUS_STYLE[t.status]}`}>
                    {TICKET_STATUS_LABEL[t.status]}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-500 transition group-hover:translate-x-0.5" strokeWidth={2} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
