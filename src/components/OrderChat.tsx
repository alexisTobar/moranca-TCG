"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, Loader2 } from "lucide-react";

interface OrderMessage {
  id: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
  senderId: string;
  sender: { name: string };
}

const POLL_MS = 5000;

export function OrderChat({
  orderId,
  currentUserId,
}: {
  orderId: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<OrderMessage[] | null>(null);
  const [body, setBody] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch(`/api/orders/${orderId}/messages`);
      const data = await res.json();
      if (res.ok) setMessages(data.messages ?? []);
    } catch {
      /* silencioso: el polling reintenta solo */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo subir el archivo");
      setAttachmentUrl(data.url as string);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    if (!body.trim() && !attachmentUrl) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() || "Comprobante adjunto", attachmentUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar el mensaje");
      setBody("");
      setAttachmentUrl(null);
      setMessages((prev) => [...(prev ?? []), data.message]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-950 p-3">
      <div ref={listRef} className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
        {messages === null ? (
          <p className="py-6 text-center text-[12px] text-ink-400">Cargando mensajes…</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-ink-400">
            Todavía no hay mensajes. Manda el comprobante de tu transferencia acá.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-[12px] ${
                    mine
                      ? "bg-brand-600 text-paper"
                      : "border border-ink-700 bg-ink-900 text-ink-200"
                  }`}
                >
                  {!mine && (
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
                      {m.sender.name}
                    </p>
                  )}
                  {m.attachmentUrl && (
                    <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer">
                      <span className="relative mb-1.5 block h-32 w-full overflow-hidden rounded-lg bg-ink-950/40">
                        <Image
                          src={m.attachmentUrl}
                          alt="Comprobante"
                          fill
                          sizes="240px"
                          className="object-contain"
                          unoptimized
                        />
                      </span>
                    </a>
                  )}
                  <p className="leading-snug">{m.body}</p>
                  <p className="mt-0.5 text-[9px] opacity-60">
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

      {attachmentUrl && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-[11px] text-ink-300">
          <span className="flex-1 truncate">Comprobante listo para enviar</span>
          <button
            type="button"
            onClick={() => setAttachmentUrl(null)}
            className="font-bold hover:text-carbon"
          >
            Quitar
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-brand-600">{error}</p>}

      <div className="mt-2.5 flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 rounded-lg border border-ink-700 p-2.5 text-ink-400 transition hover:border-carbon hover:text-carbon disabled:opacity-50"
          aria-label="Adjuntar comprobante"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <Paperclip className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Escribe un mensaje…"
          className="min-h-[38px] flex-1 resize-none rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-[12px] text-ink-200 outline-none focus:border-carbon"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || (!body.trim() && !attachmentUrl)}
          className="shrink-0 rounded-lg bg-brand-600 p-2.5 text-paper transition hover:bg-brand-500 disabled:opacity-50"
          aria-label="Enviar mensaje"
        >
          <Send className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
