"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";

export function SellerRequestBox({
  status,
}: {
  status: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "PENDING") {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-[13px] text-amber-800">
        Tu solicitud para vender está pendiente de revisión.
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="rounded-2xl card-surface p-5">
        <p className="text-[13px] text-ink-300">
          Tu solicitud anterior no fue aprobada. Puedes volver a intentarlo.
        </p>
        <RequestForm />
      </div>
    );
  }

  return (
    <div className="rounded-2xl card-surface p-5">
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 text-accent-400" strokeWidth={2} />
        <h3 className="text-sm font-semibold text-carbon">¿Quieres vender en Dream Deck?</h3>
      </div>
      <p className="mt-1 text-[12px] text-ink-400">
        Manda una solicitud y el equipo la revisa para habilitarte a publicar.
      </p>
      <RequestForm />
    </div>
  );

  function RequestForm() {
    if (!open) {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-lg border border-accent-500/60 bg-accent-500/10 px-4 py-2 text-[12px] font-bold text-accent-300 transition hover:bg-accent-500/20"
        >
          Quiero vender
        </button>
      );
    }
    return (
      <div className="mt-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Cuéntanos qué quieres vender (opcional)"
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-[12px] text-ink-200 outline-none focus:border-accent-500/70"
        />
        {error && <p className="mt-1.5 text-[11px] text-brand-600">{error}</p>}
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const res = await fetch("/api/account/seller-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: message.trim() || null }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error ?? "No se pudo enviar");
              router.refresh();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setLoading(false);
            }
          }}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-[12px] font-bold text-paper transition hover:bg-brand-500 disabled:opacity-60"
        >
          {loading ? "Enviando…" : "Enviar solicitud"}
        </button>
      </div>
    );
  }
}
