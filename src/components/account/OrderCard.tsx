import { clp } from "@/lib/format";
import { OrderChatToggle } from "@/components/OrderChatToggle";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  CANCELLED: "Cancelada",
  SHIPPED: "Enviada",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  PAID: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  CANCELLED: "border-rose-500/40 bg-rose-500/10 text-brand-600",
  SHIPPED: "border-sky-500/40 bg-sky-500/10 text-sky-700",
};

export interface AccountOrder {
  id: string;
  status: string;
  total: number;
  sellerName: string;
  createdAt: string;
  items: Array<{ id: string; title: string; quantity: number; unitPrice: number }>;
}

export function OrderCard({ order, userId }: { order: AccountOrder; userId: string }) {
  return (
    <div className="rounded-2xl card-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            STATUS_STYLE[order.status] ?? ""
          }`}
        >
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
        <span className="text-[13px] font-semibold text-ink-200">
          #{order.id.slice(-6).toUpperCase()}
        </span>
        <span className="text-[12px] text-ink-400">Vendedor: {order.sellerName}</span>
        <span className="ml-auto font-display text-sm font-bold text-accent-400">
          {clp(order.total)}
        </span>
      </div>

      <ul className="mt-3 space-y-1 border-t border-ink-800 pt-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between text-[12px]">
            <span className="min-w-0 truncate text-ink-200">
              {item.quantity}× {item.title}
            </span>
            <span className="shrink-0 text-ink-400">
              {clp(item.unitPrice * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <OrderChatToggle orderId={order.id} currentUserId={userId} className="mt-3" />
    </div>
  );
}
