"use client";

import { useState } from "react";
import { Loader2, MailWarning } from "lucide-react";

/** Aviso para quien todavía no confirmó su email: explica el motivo y deja reenviar el link. */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/account/verify-email", { method: "POST" });
      const data = await res.json();
      setMsg(res.ok ? `Listo, te enviamos un link a ${email}.` : data.error ?? "No se pudo enviar");
    } catch {
      setMsg("No se pudo enviar. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
        <MailWarning className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[14px] font-bold text-carbon">Confirma tu email para comprar y vender</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-400">
          Te enviamos un link a <strong className="text-ink-300">{email}</strong>. Revisa también la carpeta de spam.
        </p>
        <button onClick={resend} disabled={busy} className="btn btn-secondary btn-sm mt-3">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Reenviar correo
        </button>
        {msg && <p className="mt-2 text-[12px] text-ink-400">{msg}</p>}
      </div>
    </div>
  );
}
