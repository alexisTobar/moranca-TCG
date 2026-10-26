"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { CONTACT_TOPICS } from "@/lib/contact-shared";

/** Contacto con soporte sin necesidad de cuenta. Si tienes cuenta, el soporte con historial está en Mi cuenta. */
export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos enviar tu consulta.");
      setCode(data.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos enviar tu consulta.");
    } finally {
      setBusy(false);
    }
  }

  if (code) {
    return <div role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-[14px] text-carbon">
      <p className="font-semibold">Consulta enviada. Tu número es {code}.</p>
      <p className="mt-1 text-ink-400">Te enviamos una copia y te responderemos al correo que indicaste.</p>
    </div>;
  }
  const field = "mt-1 w-full rounded-xl border border-ink-700 bg-white px-3 py-2.5 text-[14px] font-normal text-carbon outline-none focus:border-brand-600";
  return <form onSubmit={submit} className="relative grid gap-4 sm:grid-cols-2">
    <label className="text-[13px] font-semibold text-carbon">Nombre<input name="name" required minLength={2} maxLength={80} autoComplete="name" className={field} /></label>
    <label className="text-[13px] font-semibold text-carbon">Correo<input name="email" type="email" required maxLength={160} autoComplete="email" className={field} /></label>
    <label className="text-[13px] font-semibold text-carbon sm:col-span-2">Tema<select name="topic" className={field} defaultValue="CUENTA">{CONTACT_TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
    <label className="text-[13px] font-semibold text-carbon sm:col-span-2">Asunto<input name="subject" required minLength={4} maxLength={120} className={field} /></label>
    <label className="text-[13px] font-semibold text-carbon sm:col-span-2">Mensaje<textarea name="body" required minLength={10} maxLength={2000} rows={5} className={field} /></label>
    <label aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">Sitio web<input name="website" tabIndex={-1} autoComplete="off" /></label>
    {error && <p role="alert" className="text-[13px] font-semibold text-red-700 sm:col-span-2">{error}</p>}
    <div className="sm:col-span-2"><button type="submit" disabled={busy} className="btn btn-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar consulta</button></div>
  </form>;
}
