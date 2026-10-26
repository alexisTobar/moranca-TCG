"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** Responder por correo o cerrar una consulta del formulario público. */
export function ContactReply({ id, closed }: { id: string; closed: boolean }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(body: Record<string, string>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/contact/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      toast.success(body.action === "close" ? "Consulta cerrada" : data.emailed ? "Respuesta enviada por correo" : "Respuesta guardada, pero el correo no está configurado");
      setReply("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }
  if (closed) return null;
  return <div className="mt-3 space-y-2">
    <label className="sr-only" htmlFor={`reply-${id}`}>Respuesta</label>
    <textarea id={`reply-${id}`} value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Escribe la respuesta que recibirá por correo" className="w-full rounded-xl border border-ink-700 bg-white px-3 py-2 text-[14px]" />
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn btn-primary btn-sm" disabled={busy || reply.trim().length < 2} onClick={() => send({ action: "reply", reply })}>Responder por correo</button>
      <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => send({ action: "close" })}>Cerrar sin responder</button>
    </div>
  </div>;
}
