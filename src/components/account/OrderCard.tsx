"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, PackageCheck } from "lucide-react";
import { clp } from "@/lib/format";
import { PICKUP_POINT } from "@/lib/regions";
import { OrderChatToggle } from "@/components/OrderChatToggle";
import { TransferInstructions, type BankInfo } from "./TransferInstructions";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  CANCELLED: "Cancelada",
  SHIPPED: "Enviada",
  DELIVERED: "Recibida",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  PAID: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  CANCELLED: "border-rose-500/40 bg-rose-500/10 text-rose-700",
  SHIPPED: "border-sky-500/40 bg-sky-500/10 text-sky-700",
  DELIVERED: "border-violet-500/40 bg-violet-500/10 text-violet-700",
};

export type BankTransferInfo = BankInfo;

export interface OrderReview {
  id: string;
  rating: number;
  comment: string | null;
  sellerReply: string | null;
}

export interface AccountOrder {
  id: string;
  status: string;
  total: number;
  paymentMethod: string;
  sellerName: string;
  bankTransfer: BankTransferInfo | null;
  paymentReference: string | null;
  paymentDueAt: string | null;
  receiptUploadedAt: string | null;
  createdAt: string;
  items: Array<{ id: string; title: string; quantity: number; unitPrice: number }>;
  review: OrderReview | null;
}

const REVIEWABLE_STATUSES = ["DELIVERED"];

export function OrderCard({ order, userId }: { order: AccountOrder; userId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function cancelOrder() {
    if (!confirm("¿Cancelar esta orden? Las cartas volverán a la tienda.")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo cancelar la orden");
      router.refresh();
    } catch (err) {
      setCancelError((err as Error).message);
    } finally {
      setCancelling(false);
    }
  }

  async function submitReview() {
    if (rating < 1) {
      setError("Elige una calificación de 1 a 5 estrellas.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar tu reseña");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function confirmReceived() {
    setConfirming(true);
    setConfirmError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo confirmar la recepción");
      router.refresh();
    } catch (err) {
      setConfirmError((err as Error).message);
    } finally {
      setConfirming(false);
    }
  }

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
        <div className="mt-3 rounded-2xl border border-ink-800 bg-ink-900/60 p-4">
          <TransferInstructions
            payment={{
              orderId: order.id,
              method: order.paymentMethod,
              total: order.total,
              reference: order.paymentReference,
              dueAt: order.paymentDueAt,
              bank: order.bankTransfer,
              pickupPoint: PICKUP_POINT,
              receiptUploadedAt: order.receiptUploadedAt,
            }}
          />
          {cancelError && <p className="mt-3 text-[12px] text-rose-700">{cancelError}</p>}
          <button
            type="button"
            disabled={cancelling}
            onClick={cancelOrder}
            className="mt-3 text-[12px] font-semibold text-ink-400 transition hover:text-rose-700 disabled:opacity-60"
          >
            {cancelling ? "Cancelando…" : "Cancelar esta orden"}
          </button>
        </div>
      )}

      {order.status === "SHIPPED" && (
        <div className="mt-3 rounded-lg border border-sky-600/30 bg-sky-500/5 p-3">
          <div className="flex items-start gap-2">
            <PackageCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-700" strokeWidth={2} />
            <p className="text-[11px] leading-relaxed text-ink-300">
              ¿Ya te llegó tu pedido? Confírmalo para poder calificar al vendedor.
            </p>
          </div>
          {confirmError && <p className="mt-1.5 text-[11px] text-rose-700">{confirmError}</p>}
          <button
            type="button"
            disabled={confirming}
            onClick={confirmReceived}
            className="mt-2 rounded-lg bg-sky-600 px-4 py-1.5 text-[12px] font-bold text-paper transition hover:bg-sky-500 disabled:opacity-60"
          >
            {confirming ? "Confirmando…" : "Confirmar recepción"}
          </button>
        </div>
      )}

      {order.review ? (
        <div className="mt-3 rounded-lg border border-ink-800 bg-ink-900/60 p-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${i < order.review!.rating ? "fill-current" : "fill-transparent text-ink-700"}`}
                  strokeWidth={i < order.review!.rating ? 0 : 1.5}
                />
              ))}
            </span>
            <span className="text-[11px] font-semibold text-ink-300">Ya calificaste esta compra</span>
          </div>
          {order.review.comment && (
            <p className="mt-1.5 text-[12px] text-ink-300">{order.review.comment}</p>
          )}
          {order.review.sellerReply && (
            <p className="mt-1.5 rounded-md bg-ink-950 p-2 text-[11px] text-ink-400">
              <strong className="text-ink-300">Respuesta del vendedor:</strong> {order.review.sellerReply}
            </p>
          )}
        </div>
      ) : (
        REVIEWABLE_STATUSES.includes(order.status) && (
          <div className="mt-3 rounded-lg border border-ink-800 bg-ink-900/60 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">
              Calificar vendedor
            </p>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  aria-label={`${i + 1} estrellas`}
                  className="p-0.5"
                >
                  <Star
                    className={`h-5 w-5 transition ${i < rating ? "fill-amber-500 text-amber-500" : "fill-transparent text-ink-600 hover:text-amber-500/60"}`}
                    strokeWidth={i < rating ? 0 : 1.5}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Comentario (opcional)"
              className="mt-2 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-[12px] text-ink-200 outline-none focus:border-carbon"
            />
            {error && <p className="mt-1.5 text-[11px] text-rose-700">{error}</p>}
            <button
              type="button"
              disabled={sending}
              onClick={submitReview}
              className="btn btn-primary btn-sm mt-2"
            >
              {sending ? "Enviando…" : "Enviar reseña"}
            </button>
          </div>
        )
      )}

      <OrderChatToggle orderId={order.id} currentUserId={userId} className="mt-3" />
    </div>
  );
}

