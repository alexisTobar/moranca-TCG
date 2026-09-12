"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteListingButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function remove() {
    setLoading(true);
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo eliminar");
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={remove}
          disabled={loading}
          className="rounded-lg bg-brand-700 px-2.5 py-1.5 text-[11px] font-bold text-paper disabled:opacity-60"
          title={`Eliminar ${title}`}
        >
          {loading ? "…" : "Sí"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-ink-700 px-2.5 py-1.5 text-[11px] font-semibold text-ink-300"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-ink-700 px-2.5 py-1.5 text-[11px] font-semibold text-ink-400 transition hover:border-rose-500/50 hover:text-rose-600"
    >
      Borrar
    </button>
  );
}
