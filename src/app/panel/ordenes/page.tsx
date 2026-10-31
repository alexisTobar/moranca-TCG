import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { safeQuery } from "@/lib/catalog";
import { clp, timeAgo } from "@/lib/format";
import { OrderChatToggle } from "@/components/OrderChatToggle";
import { OrderStatusActions } from "@/components/OrderStatusActions";
import { ReviewReply } from "@/components/panel/ReviewReply";
import { expireOverdueOrders } from "@/lib/order-payments";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { FileCheck2, Hash, PackageOpen, Timer } from "lucide-react";
import { EmptyState, FilterTabs, PageHeader, Pager, SearchBox } from "@/components/panel/PageKit";
import { StatTile } from "@/components/charts/Charts";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  PAID: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  CANCELLED: "border-rose-500/40 bg-rose-500/10 text-rose-700",
  SHIPPED: "border-sky-500/40 bg-sky-500/10 text-sky-700",
  DELIVERED: "border-violet-500/40 bg-violet-500/10 text-violet-700",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Esperando pago",
  PAID: "Pagada",
  CANCELLED: "Cancelada",
  SHIPPED: "Enviada",
  DELIVERED: "Recibida",
};

const PAYMENT_LABEL: Record<string, string> = {
  TRANSFER: "Transferencia",
  MP: "Mercado Pago (antiguo)",
  CASH: "Efectivo",
};

const TAKE = 20;

const units = (items: Array<{ quantity: number }>) => items.reduce((n, i) => n + i.quantity, 0);

/** Qué le toca hacer al vendedor con cada orden; "alert" marca lo urgente. */
function nextStep(o: { status: string; receiptUploadedAt: Date | null; paymentMethod: string; shipMethod: string; review: { sellerReply: string | null } | null }): { text: string; tone?: "alert" | "ok" } {
  if (o.status === "PENDING") return o.receiptUploadedAt || o.paymentMethod === "CASH"
    ? { text: o.paymentMethod === "CASH" ? "Confirma el pago al entregar" : "Revisa el comprobante y confirma el pago", tone: "alert" }
    : { text: "Esperando que el comprador transfiera" };
  if (o.status === "PAID") return { text: o.shipMethod === "PICKUP" ? "Coordina el retiro con el comprador" : "Despacha y agrega el seguimiento", tone: "alert" };
  if (o.status === "SHIPPED") return { text: "En camino: espera la confirmación de entrega" };
  if (o.status === "DELIVERED") return o.review && !o.review.sellerReply ? { text: "Responde la reseña del comprador", tone: "alert" } : { text: "Completada", tone: "ok" };
  return { text: "Cancelada" };
}

function StepChip({ order }: { order: Parameters<typeof nextStep>[0] }) {
  const step = nextStep(order);
  return <span className={`order-step ${step.tone === "alert" ? "order-step-alert" : step.tone === "ok" ? "order-step-ok" : ""}`}>{step.text}</span>;
}

const TABS = [
  { key: "accion", label: "Requieren acción", where: { OR: [{ status: "PENDING", receiptUploadedAt: { not: null } }, { status: "PENDING", paymentMethod: "CASH" }, { status: "PAID" }] } },
  { key: "pendientes", label: "Esperando pago", where: { status: "PENDING" } },
  { key: "despachar", label: "Por despachar", where: { status: "PAID" } },
  { key: "enviadas", label: "Enviadas", where: { status: "SHIPPED" } },
  { key: "entregadas", label: "Entregadas", where: { status: "DELIVERED" } },
  { key: "canceladas", label: "Canceladas", where: { status: "CANCELLED" } },
  { key: "todas", label: "Todas", where: {} },
] as const satisfies ReadonlyArray<{ key: string; label: string; where: Prisma.OrderWhereInput }>;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const isAdmin = user.role === "ADMIN";

  await safeQuery(() => expireOverdueOrders(), 0);

  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const requestedPage = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const scope: Prisma.OrderWhereInput = isAdmin ? {} : {
    OR: [
      { sellerId: user.id },
      // Compatibilidad con órdenes de antes de vincular sellerId.
      { items: { some: { listing: { sellerId: user.id } } } },
    ],
  };
  const search: Prisma.OrderWhereInput = q ? { OR: [
    { buyerName: { contains: q, mode: "insensitive" } },
    { buyerEmail: { contains: q, mode: "insensitive" } },
    { paymentReference: { contains: q, mode: "insensitive" } },
    { id: { endsWith: q.replace(/^#/, "").toLowerCase() } },
    { items: { some: { title: { contains: q, mode: "insensitive" } } } },
  ] } : {};

  // Conteo de cada pestaña con el mismo alcance y búsqueda, para que los números cuadren con la lista.
  const tabCounts = await safeQuery(() => Promise.all(TABS.map((t) => prisma.order.count({ where: { AND: [scope, search, t.where] } }))), TABS.map(() => 0));
  const requested = TABS.find((t) => t.key === sp.estado);
  // Sin pestaña elegida: si hay algo urgente se abre ahí; si no, todas.
  const tab = requested ?? (tabCounts[0] > 0 ? TABS[0] : TABS[TABS.length - 1]);
  const total = tabCounts[TABS.indexOf(tab)];
  const pages = Math.max(1, Math.ceil(total / TAKE));
  const page = Math.min(requestedPage, pages);
  const where: Prisma.OrderWhereInput = { AND: [scope, search, tab.where] };
  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = { estado: tab.key, q: q || undefined, ...patch };
    for (const [k, v] of Object.entries(current)) if (v) params.set(k, v);
    return `/panel/ordenes?${params}`;
  };

  const orders = await safeQuery(
    () =>
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * TAKE,
        take: TAKE,
        include: {
          items: {
            include: { listing: { select: { slug: true, seller: { select: { name: true } } } } },
          },
          review: { select: { id: true, rating: true, comment: true, sellerReply: true } },
        },
      }),
    [] as Array<{
      id: string;
      status: string;
      buyerName: string;
      buyerEmail: string;
      buyerPhone: string | null;
      shipAddress: string | null;
      shipCity: string | null;
      shipRegion: string | null;
      notes: string | null;
      shipMethod: string;
      shipCost: number;
      paymentMethod: string;
      discount: number;
      couponCode: string | null;
      couponDiscount: number;
      paymentDiscountPct: number;
      paymentReference: string | null;
      trackingCourier: string | null;
      trackingCode: string | null;
      paymentDueAt: Date | null;
      receiptUploadedAt: Date | null;
      subtotal: number;
      total: number;
      createdAt: Date;
      items: Array<{
        id: string;
        title: string;
        quantity: number;
        unitPrice: number;
        listing: { slug: string; seller: { name: string } };
      }>;
      review: { id: string; rating: number; comment: string | null; sellerReply: string | null } | null;
    }>
  );

  // Resumen por estado de todas las órdenes del alcance.
  const byStatus = await safeQuery(
    () => prisma.order.groupBy({ by: ["status"], where: isAdmin ? {} : { sellerId: user.id }, _count: { _all: true }, _sum: { total: true } }),
    [] as Array<{ status: string; _count: { _all: number }; _sum: { total: number | null } }>
  );
  const stat = (st: string) => byStatus.find((r) => r.status === st);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Órdenes"
        description={isAdmin
          ? "Todas las compras del marketplace. Cada orden indica el próximo paso; las urgentes están en “Requieren acción”."
          : "Tus ventas. Cada orden te indica el próximo paso: confirmar el pago, despachar o responder la reseña."}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Esperando pago" value={String(stat("PENDING")?._count._all ?? 0)} hint={`${clp(stat("PENDING")?._sum.total ?? 0)} por cobrar`} href={href({ estado: "pendientes", page: undefined })} />
        <StatTile label="Por despachar" value={String(stat("PAID")?._count._all ?? 0)} hint="pagadas sin enviar" href={href({ estado: "despachar", page: undefined })} />
        <StatTile label="En camino" value={String(stat("SHIPPED")?._count._all ?? 0)} hint="enviadas, sin confirmar entrega" href={href({ estado: "enviadas", page: undefined })} />
        <StatTile label="Vendido en total" value={clp((stat("PAID")?._sum.total ?? 0) + (stat("SHIPPED")?._sum.total ?? 0) + (stat("DELIVERED")?._sum.total ?? 0))} hint={`${stat("DELIVERED")?._count._all ?? 0} entregadas · ${stat("CANCELLED")?._count._all ?? 0} canceladas`} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterTabs label="Estado de la orden" active={tab.key} tabs={TABS.map((t, i) => ({ key: t.key, label: t.label, count: tabCounts[i], href: href({ estado: t.key, page: undefined }), tone: t.key === "accion" ? "alert" as const : undefined }))} />
          <SearchBox action="/panel/ordenes" defaultValue={q} placeholder="Buscar comprador, correo, N° o producto" keep={{ estado: tab.key }} />
        </div>
        {q && <p className="text-[12px] text-ink-400">Resultados para “{q}” · <Link href={href({ q: undefined, page: undefined })} className="font-semibold text-brand-600">Quitar búsqueda</Link></p>}
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={PackageOpen} title={q ? "Sin resultados" : tab.key === "accion" ? "Todo al día" : "No hay órdenes aquí"}
          text={q ? "Prueba con otro nombre, correo o número de orden." : tab.key === "accion" ? "No tienes pagos por confirmar ni pedidos por despachar." : "Cuando haya órdenes en este estado aparecerán en esta lista."} />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <details key={o.id} className="rounded-2xl card-surface p-4">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    STATUS_STYLE[o.status] ?? ""
                  }`}
                >
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
                <span className="text-[13px] font-semibold text-ink-200">
                  #{o.id.slice(-6).toUpperCase()}
                </span>
                <span className="text-[12px] text-ink-400">{o.buyerName}{isAdmin && o.items[0] ? ` → ${o.items[0].listing.seller.name}` : ""}</span>
                <span className="text-[11px] text-ink-400">{units(o.items)} {units(o.items) === 1 ? "producto" : "productos"}</span>
                <span className="rounded-full border border-ink-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                  {PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}
                </span>
                <span className="ml-auto font-display text-sm font-bold text-accent-400">
                  {clp(o.total)}
                </span>
                <span className="text-[11px] text-ink-400">{timeAgo(o.createdAt)}</span>
                <StepChip order={o} />
              </summary>

              <div className="mt-4 grid gap-4 border-t border-ink-800 pt-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-400">
                    Comprador
                  </p>
                  <p className="text-[13px] text-ink-200">{o.buyerName}</p>
                  <p className="text-[12px] text-ink-400">{o.buyerEmail}</p>
                  {o.buyerPhone && (
                    <p className="text-[12px] text-ink-400">{o.buyerPhone}</p>
                  )}
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-300">
                    {o.shipMethod === "PICKUP" ? "Retiro en persona" : "Despacho a domicilio"}
                  </p>
                  {(o.shipAddress || o.shipCity) && (
                    <p className="text-[12px] text-ink-400">
                      {[o.shipAddress, o.shipCity, o.shipRegion]
                        .filter(Boolean)
                        .join(", ")}
                      , Chile
                    </p>
                  )}
                  {o.notes && (
                    <p className="mt-2 rounded-lg bg-ink-950 p-2 text-[12px] text-ink-300">
                      {o.notes}
                    </p>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-400">
                    Productos
                  </p>
                  <ul className="space-y-1.5">
                    {o.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 text-[12px]"
                      >
                        <span className="min-w-0 truncate text-ink-200">
                          {item.quantity}× {item.title}
                        </span>
                        <span className="shrink-0 text-ink-400">
                          {clp(item.unitPrice * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-3 space-y-1 border-t border-ink-800 pt-3 text-[12px]">
                    <div className="flex justify-between">
                      <dt className="text-ink-400">Subtotal</dt>
                      <dd className="text-ink-300">{clp(o.subtotal || o.total - o.shipCost)}</dd>
                    </div>
                    {o.couponDiscount > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-emerald-700">
                          Cupón {o.couponCode ?? ""}
                        </dt>
                        <dd className="text-emerald-700">-{clp(o.couponDiscount)}</dd>
                      </div>
                    )}
                    {o.discount - o.couponDiscount > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-emerald-700">
                          Descuento {o.paymentMethod === "CASH" ? "efectivo" : "transferencia"}
                          {o.paymentDiscountPct > 0 ? ` (${o.paymentDiscountPct}%)` : ""}
                        </dt>
                        <dd className="text-emerald-700">
                          -{clp(o.discount - o.couponDiscount)}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-ink-400">Despacho</dt>
                      <dd className="text-ink-300">
                        {o.shipMethod === "PICKUP"
                          ? "Gratis"
                          : o.shipCost
                            ? clp(o.shipCost)
                            : "Por pagar"}
                      </dd>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <dt className="text-ink-200">Total</dt>
                      <dd className="text-accent-400">{clp(o.total)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {o.status === "PENDING" && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-800 pt-4 text-[12px]">
                  {o.paymentReference && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1 font-semibold text-ink-300">
                      <Hash className="h-3.5 w-3.5" strokeWidth={2} />
                      Referencia <strong className="text-carbon">{o.paymentReference}</strong>
                    </span>
                  )}
                  {o.paymentMethod === "TRANSFER" &&
                    (o.receiptUploadedAt ? (
                      <a
                        href={`/api/orders/${o.id}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-700 hover:bg-emerald-500/20"
                      >
                        <FileCheck2 className="h-3.5 w-3.5" strokeWidth={2} />
                        Comprobante recibido, ver
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 font-semibold text-amber-800">
                        Esperando comprobante
                      </span>
                    ))}
                  {o.paymentDueAt && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1 font-semibold text-ink-300">
                      <Timer className="h-3.5 w-3.5" strokeWidth={2} />
                      Vence {o.paymentDueAt.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" })}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-4 border-t border-ink-800 pt-4">
                <OrderStatusActions
                  orderId={o.id}
                  status={o.status}
                  reference={o.paymentReference}
                  total={o.total}
                  shipMethod={o.shipMethod}
                />
                {(o.status === "SHIPPED" || o.status === "DELIVERED") && (o.trackingCourier || o.trackingCode) && (
                  <p className="mt-3 text-[12px] text-ink-400">
                    <span className="font-semibold text-ink-300">Seguimiento:</span>{" "}
                    {[o.trackingCourier, o.trackingCode].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>

              {o.review && <ReviewReply orderId={o.id} review={o.review} />}

              <OrderChatToggle
                orderId={o.id}
                currentUserId={user.id}
                className="mt-4 border-t border-ink-800 pt-4"
              />
            </details>
          ))}
        </div>
      )}

      <Pager page={page} pages={pages} total={total} take={TAKE} href={(p) => href({ page: String(p) })} />
    </div>
  );
}
