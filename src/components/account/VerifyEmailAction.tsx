"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2, MailCheck, XCircle } from "lucide-react";

/** Pantalla del link del correo. Confirma con un botón (y no al abrir) para que los antivirus de correo no gasten el link. */
export function VerifyEmailAction({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [error, setError] = useState("");

  async function confirm() {
    setState("busy");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo confirmar");
      setState("ok");
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  }

  if (state === "ok")
    return (
      <>
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" strokeWidth={1.75} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-carbon">¡Email confirmado!</h1>
        <p className="mt-2 text-[14px] text-ink-400">Ya puedes comprar y vender en Win Condition TCG.</p>
        <Link href="/cuenta" className="btn btn-primary btn-lg mt-6">
          Ir a mi cuenta
        </Link>
      </>
    );

  if (state === "error")
    return (
      <>
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600">
          <XCircle className="h-8 w-8" strokeWidth={1.75} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-carbon">No pudimos confirmarlo</h1>
        <p className="mt-2 text-[14px] text-ink-400">{error}</p>
        <Link href="/cuenta" className="btn btn-secondary btn-lg mt-6">
          Ir a mi cuenta
        </Link>
      </>
    );

  return (
    <>
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
        <MailCheck className="h-8 w-8" strokeWidth={1.75} />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold text-carbon">Confirma tu email</h1>
      <p className="mt-2 text-[14px] text-ink-400">Un último paso para activar tu cuenta.</p>
      <button onClick={confirm} disabled={state === "busy"} className="btn btn-primary btn-lg mt-6">
        {state === "busy" && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar mi email
      </button>
    </>
  );
}
