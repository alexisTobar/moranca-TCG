import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Inbox, LifeBuoy } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { REQUESTER_LABEL, TICKET_STATUS_LABEL, categoryLabel } from "@/lib/support-shared";
import { NewTicketForm } from "@/components/support/NewTicketForm";
import { StatTile } from "@/components/charts/Charts";
import { PageHeader, SearchBox } from "@/components/panel/PageKit";

/** Un ticket sin respuesta por más de un día se marca como atrasado. */
const LATE_MS = 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "pendientes", label: "Por responder", where: { status: "OPEN" } },
  { key: "respondidos", label: "Respondidos", where: { status: "ANSWERED" } },
  { key: "cerrados", label: "Cerrados", where: { status: "CLOSED" } },
  { key: "todos", label: "Todos", where: {} },
] as const;

const KINDS = [
  { key: "todos", label: "Todos", where: {} },
  { key: "vendedores", label: "Vendedores", where: { requesterRole: "SELLER" } },
  { key: "compradores", label: "Compradores", where: { requesterRole: "BUYER" } },
] as const;

const REQUESTER_STYLE: Record<string, string> = {
  SELLER: "bg-brand-500/10 text-brand-700",
  BUYER: "bg-sky-500/15 text-sky-700",
};

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
  const kind = KINDS.find((k) => k.key === sp.tipo) ?? KINDS[0];
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const filterHref = (estado: string, tipo: string) =>
    `/panel/soporte?estado=${estado}${tipo !== "todos" ? `&tipo=${tipo}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const search = q && isAdmin ? { OR: [
    { code: { contains: q, mode: "insensitive" as const } },
    { subject: { contains: q, mode: "insensitive" as const } },
    { seller: { name: { contains: q, mode: "insensitive" as const } } },
    { seller: { email: { contains: q, mode: "insensitive" as const } } },
  ] } : {};
  const now = new Date();

  const [tickets, counts, late, closedRecent] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { ...(isAdmin ? {} : { sellerId: user.id }), ...(isAdmin ? { ...filter.where, ...kind.where, ...search } : {}) },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      select: {
        id: true,
        code: true,
        subject: true,
        category: true,
        status: true,
        requesterRole: true,
        adminUnread: true,
        sellerUnread: true,
        lastMessageAt: true,
        seller: { select: { name: true, store: { select: { plan: { select: { name: true } } } } } },
      },
    }),
    isAdmin
      ? prisma.supportTicket.groupBy({ by: ["status"], where: { ...kind.where, ...search }, _count: { _all: true } })
      : Promise.resolve([] as Array<{ status: string; _count: { _all: number } }>),
    isAdmin ? prisma.supportTicket.count({ where: { status: "OPEN", lastMessageAt: { lt: new Date(now.getTime() - LATE_MS) } } }) : Promise.resolve(0),
    isAdmin ? prisma.supportTicket.count({ where: { status: "CLOSED", updatedAt: { gte: new Date(now.getTime() - 30 * LATE_MS) } } }) : Promise.resolve(0),
  ]);
  const countOf = (s?: string) =>
    s ? counts.find((c) => c.status === s)?._count._all ?? 0 : counts.reduce((n, c) => n + c._count._all, 0);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Soporte"
        description={isAdmin
          ? "Tickets de vendedores y de compradores. Al responder, el usuario recibe el aviso por correo y en su panel o cuenta."
          : "Canal directo con el administrador de TCG Cardeck. Escríbenos por pedidos, pagos, tu cuenta, tu tienda o tu plan. Respondemos normalmente dentro de 24 horas."}
      />

      {isAdmin && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Por responder" value={String(countOf("OPEN"))} hint="esperan tu respuesta" href={filterHref("pendientes", kind.key)} />
        <StatTile label="Atrasados" value={String(late)} hint="más de 24 h sin respuesta" />
        <StatTile label="Esperando al usuario" value={String(countOf("ANSWERED"))} hint="ya respondiste" href={filterHref("respondidos", kind.key)} />
        <StatTile label="Cerrados" value={String(closedRecent)} hint="en los últimos 30 días" href={filterHref("cerrados", kind.key)} />
      </div>}

      {!isAdmin && <NewTicketForm />}

      {isAdmin && (
        <div className="space-y-2">
          <SearchBox action="/panel/soporte" defaultValue={q} placeholder="Buscar por código, asunto, nombre o correo" keep={{ estado: filter.key, tipo: kind.key !== "todos" ? kind.key : undefined }} />
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => {
              const n = f.key === "pendientes" ? countOf("OPEN") : f.key === "respondidos" ? countOf("ANSWERED") : f.key === "cerrados" ? countOf("CLOSED") : countOf();
              return (
                <Link
                  key={f.key}
                  href={filterHref(f.key, kind.key)}
                  data-active={filter.key === f.key}
                  className="pill shrink-0"
                >
                  {f.label} <span className="opacity-60">{n}</span>
                </Link>
              );
            })}
          </div>
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
            <span className="shrink-0 text-[12px] font-semibold text-ink-400">Quién escribe:</span>
            {KINDS.map((k) => (
              <Link key={k.key} href={filterHref(filter.key, k.key)} data-active={kind.key === k.key} className="pill shrink-0">
                {k.label}
              </Link>
            ))}
          </div>
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
                          <span
                            className={`mr-1.5 inline-block rounded-full px-1.5 py-px text-[10px] font-bold uppercase tracking-wide ${REQUESTER_STYLE[t.requesterRole] ?? REQUESTER_STYLE.SELLER}`}
                          >
                            {REQUESTER_LABEL[t.requesterRole] ?? "Vendedor"}
                          </span>
                          {t.seller.name}
                          {t.requesterRole !== "BUYER" && t.seller.store?.plan ? ` · ${t.seller.store.plan.name}` : ""} ·{" "}
                        </>
                      )}
                      {t.code} · {categoryLabel(t.category)} · {timeAgo(t.lastMessageAt)}
                    </span>
                    {isAdmin && t.status === "OPEN" && <span className={`mt-1 inline-block rounded-full px-2 py-px text-[10.5px] font-bold ${now.getTime() - t.lastMessageAt.getTime() > LATE_MS ? "bg-rose-500/10 text-rose-700" : "bg-amber-500/10 text-amber-800"}`}>
                      Esperando respuesta {timeAgo(t.lastMessageAt)}
                    </span>}
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
