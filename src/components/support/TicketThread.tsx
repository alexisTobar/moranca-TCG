"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Lock, RotateCcw, Send } from "lucide-react";
import { usePanelCounts } from "@/components/panel/PanelCounts";
import { TICKET_STATUS_LABEL } from "@/lib/support-shared";

interface Msg {
  id: string;
  body: string;
  fromAdmin: boolean;
  createdAt: string;
}

const POLL_MS = 8000;

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-500/15 text-amber-700",
  ANSWERED: "bg-emerald-500/15 text-emerald-700",
  CLOSED: "bg-ink-800 text-ink-400",
};

export function TicketThread({
  ticketId,
  viewer,
  initialStatus,
  canWrite,
  blockedReason,
}: {
  ticketId: string;
  viewer: "admin" | "seller";
  initialStatus: string;
  /** Un vendedor sin membresía vigente puede leer pero no escribir. */
  canWrite: boolean;
  blockedReason?: string;
}) {
  const { refresh } = usePanelCounts();
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const count = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages as Msg[]);
      setStatus(data.ticket.status as string);
    } catch {
      /* el siguiente ciclo reintenta */
    }
  }, [ticketId]);

  // Al abrir se marca como leído; se refresca la campana para que el contador baje.
  useEffect(() => {
    load().then(refresh);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [load, refresh]);

  useEffect(() => {
    if (messages && messages.length !== count.current) {
      count.current = messages.length;
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar el mensaje");
      setBody("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function act(action: "close" | "reopen") {
    setError(null);
    const res = await fetch(`/api/support/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "No se pudo actualizar el ticket");
      return;
    }
    await load();
  }

  const closed = status === "CLOSED";
  const canReply = canWrite && (!closed || viewer === "admin");

  return (
    <div className="rounded-2xl card-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 px-4 py-3">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[status] ?? STATUS_STYLE.OPEN}`}>
          {TICKET_STATUS_LABEL[status] ?? status}
        </span>
        <div className="flex gap-2">
          {closed && viewer === "admin" && (
            <button onClick={() => act("reopen")} className="btn btn-secondary btn-sm">
              <RotateCcw className="h-4 w-4" strokeWidth={2} /> Reabrir
            </button>
          )}
          {!closed && (
            <button onClick={() => act("close")} className="btn btn-secondary btn-sm">
              <Lock className="h-4 w-4" strokeWidth={2} /> Cerrar ticket
            </button>
          )}
        </div>
      </div>

      <div ref={listRef} className="max-h-[28rem] space-y-3 overflow-y-auto px-4 py-4">
        {messages === null ? (
          <p className="py-8 text-center text-[13px] text-ink-400">Cargando conversación…</p>
        ) : (
          messages.map((m) => {
            const mine = viewer === "admin" ? m.fromAdmin : !m.fromAdmin;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] ${
                    mine ? "bg-brand-600 text-white" : "border border-ink-700 bg-ink-900 text-ink-200"
                  }`}
                >
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
                    {m.fromAdmin ? "Administrador" : viewer === "admin" ? "Vendedor" : "Tú"}
                  </p>
                  <p className="whitespace-pre-line leading-relaxed">{m.body}</p>
                  <p className="mt-1 text-[10px] opacity-60">
                    {new Date(m.createdAt).toLocaleString("es-CL", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-ink-800 p-4">
        {canReply ? (
          <form onSubmit={send} className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={2}
              placeholder={viewer === "admin" ? "Responder al vendedor…" : "Escribe tu mensaje…"}
              className="input min-h-12 flex-1 resize-y"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e);
              }}
            />
            <button disabled={sending || !body.trim()} className="btn btn-primary btn-sm shrink-0">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2} />}
              Enviar
            </button>
          </form>
        ) : (
          <p className="text-center text-[13px] text-ink-400">
            {closed
              ? "Este ticket está cerrado. Si aún necesitas ayuda, abre uno nuevo."
              : blockedReason ?? "No puedes responder este ticket."}
          </p>
        )}
        {error && <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-[12px] font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
}
