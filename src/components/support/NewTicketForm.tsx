"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { TICKET_CATEGORIES } from "@/lib/support-shared";

export function NewTicketForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>("PLAN");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, category, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear el ticket");
      router.push(`/panel/soporte/${data.ticket.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl card-surface p-5">
      <div>
        <h2 className="font-display text-lg font-bold text-carbon">Nuevo ticket</h2>
        <p className="mt-0.5 text-[12px] text-ink-400">
          Te responde directamente el administrador de Win Condition. Recibirás el aviso en tu panel.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[12px] font-semibold text-ink-300">Tema</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input mt-1.5">
            {TICKET_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-ink-300">Asunto</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            required
            placeholder="Ej: Mi QR no muestra el logo"
            className="input mt-1.5"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[12px] font-semibold text-ink-300">Cuéntanos qué pasa</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          required
          rows={5}
          placeholder="Entre más detalle, más rápido podemos ayudarte."
          className="input mt-1.5 min-h-28 resize-y"
        />
        <span className="mt-1 block text-right text-[11px] text-ink-500">{body.length}/2000</span>
      </label>

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] font-medium text-red-600">{error}</p>}

      <button disabled={busy} className="btn btn-primary btn-sm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2} />}
        Enviar ticket
      </button>
    </form>
  );
}
