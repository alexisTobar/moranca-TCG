import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { safeQuery } from "@/lib/catalog";
import { clp, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  PAID: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  CANCELLED: "border-rose-500/40 bg-rose-500/10 text-brand-600",
  SHIPPED: "border-sky-500/40 bg-sky-500/10 text-sky-700",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  CANCELLED: "Cancelada",
  SHIPPED: "Enviada",
};

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const orders = await safeQuery(
    () =>
      prisma.order.findMany({
        where:
          user.role === "ADMIN"
            ? {}
            : { items: { some: { listing: { sellerId: user.id } } } },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          items: {
            include: { listing: { select: { slug: true, seller: { select: { name: true } } } } },
          },
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
    }>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Órdenes</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Reservas y compras generadas desde la tienda.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-700 p-16 text-center">
          <p className="text-sm text-ink-400">Todavía no hay órdenes.</p>
        </div>
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
                <span className="text-[12px] text-ink-400">{o.buyerName}</span>
                <span className="rounded-full border border-ink-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                  {o.paymentMethod === "TRANSFER" ? "Transferencia" : "Mercado Pago"}
                </span>
                <span className="ml-auto font-display text-sm font-bold text-accent-400">
                  {clp(o.total)}
                </span>
                <span className="text-[11px] text-ink-400">{timeAgo(o.createdAt)}</span>
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
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-accent-300">
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
                    {o.discount > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-emerald-700">Descuento transferencia</dt>
                        <dd className="text-emerald-700">-{clp(o.discount)}</dd>
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
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
