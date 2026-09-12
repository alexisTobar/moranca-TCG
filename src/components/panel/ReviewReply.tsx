"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

export interface ReviewValue {
  id: string;
  rating: number;
  comment: string | null;
  sellerReply: string | null;
}

export function ReviewReply({ orderId, review }: { orderId: string; review: ReviewValue }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerReply: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar la respuesta");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-ink-800 bg-ink-900/60 p-3">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-0.5 text-amber-500">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${i < review.rating ? "fill-current" : "fill-transparent text-ink-700"}`}
              strokeWidth={i < review.rating ? 0 : 1.5}
            />
          ))}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
          Reseña del comprador
        </span>
      </div>
      {review.comment && <p className="mt-1.5 text-[12px] text-ink-300">{review.comment}</p>}

      {review.sellerReply ? (
        <p className="mt-2 rounded-md bg-ink-950 p-2 text-[11px] text-ink-400">
          <strong className="text-ink-300">Tu respuesta:</strong> {review.sellerReply}
        </p>
      ) : (
        <div className="mt-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Responder a esta reseña (opcional)"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-[12px] text-ink-200 outline-none focus:border-carbon"
          />
          {error && <p className="mt-1.5 text-[11px] text-brand-600">{error}</p>}
          <button
            type="button"
            disabled={sending || !reply.trim()}
            onClick={submit}
            className="mt-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-[11px] font-semibold text-ink-200 transition hover:border-carbon hover:text-carbon disabled:opacity-60"
          >
            {sending ? "Enviando…" : "Responder"}
          </button>
        </div>
      )}
    </div>
  );
}
