import { Landmark, CreditCard } from "lucide-react";
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

export interface BankTransferInfo {
  bankName: string | null;
  accountType: string | null;
  accountNumber: string;
  holderName: string | null;
  rut: string | null;
}

export interface AccountOrder {
  id: string;
  status: string;
  total: number;
  paymentMethod: string;
  sellerName: string;
  bankTransfer: BankTransferInfo | null;
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

      {order.status === "PENDING" && (
        <div className="mt-3 rounded-lg border border-ink-800 bg-ink-900/60 p-3">
          {order.paymentMethod === "MP" ? (
            <div className="flex items-start gap-2">
              <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-400" strokeWidth={2} />
              <p className="text-[11px] leading-relaxed text-ink-300">
                Pagando con <strong className="text-ink-200">Mercado Pago</strong>. Si no
                alcanzaste a completar el pago, vuelve a intentarlo desde el carrito.
              </p>
            </div>
          ) : order.bankTransfer ? (
            <div className="flex items-start gap-2">
              <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-400" strokeWidth={2} />
              <div className="min-w-0 text-[11px] leading-relaxed text-ink-300">
                <p className="mb-1 font-bold uppercase tracking-wider text-ink-400">
                  Transferir a
                </p>
                <p>
                  {order.bankTransfer.bankName} · cuenta {order.bankTransfer.accountType} N°{" "}
                  {order.bankTransfer.accountNumber}
                </p>
                <p>
                  RUT {order.bankTransfer.rut} · {order.bankTransfer.holderName}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500" strokeWidth={2} />
              <p className="text-[11px] leading-relaxed text-ink-400">
                El vendedor todavía no configura su cuenta bancaria. Te contactará por el
                chat de la orden para coordinar el pago.
              </p>
            </div>
          )}
        </div>
      )}

      <OrderChatToggle orderId={order.id} currentUserId={userId} className="mt-3" />
    </div>
  );
}
