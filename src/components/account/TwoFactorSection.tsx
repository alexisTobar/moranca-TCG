"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

interface QrData {
  size: number;
  rows: string[];
}

const QUIET = 4;

function qrPath(qr: QrData): string {
  let d = "";
  for (let r = 0; r < qr.size; r++) {
    let c = 0;
    while (c < qr.size) {
      if (qr.rows[r][c] === "1") {
        let end = c;
        while (end < qr.size && qr.rows[r][end] === "1") end++;
        d += `M${c + QUIET} ${r + QUIET}h${end - c}v1h${-(end - c)}z`;
        c = end;
      } else c++;
    }
  }
  return d;
}

/** Verificación en dos pasos: activar con una app (Google Authenticator, Authy…), guardar códigos de respaldo y desactivar. */
export function TwoFactorSection({ enabled, recommended = false }: { enabled: boolean; recommended?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "scan" | "codes" | "disable">("idle");
  const [setup, setSetup] = useState<{ secret: string; qr: QrData } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const path = useMemo(() => (setup ? qrPath(setup.qr) : ""), [setup]);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo completar");
      return data;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    const data = await call({ action: "setup" });
    if (data) {
      setSetup({ secret: data.secret, qr: data.qr });
      setStep("scan");
    }
  }
  async function enable() {
    const data = await call({ action: "enable", code });
    if (data) {
      setRecovery(data.recoveryCodes);
      setCode("");
      setStep("codes");
    }
  }
  async function disable() {
    const data = await call({ action: "disable", password, code });
    if (data) {
      setPassword("");
      setCode("");
      setStep("idle");
      router.refresh();
    }
  }
  async function copyCodes() {
    await navigator.clipboard.writeText(recovery.join("\n")).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-5 border-t border-ink-800 pt-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {enabled || step === "codes" ? (
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" strokeWidth={2} />
        ) : (
          <ShieldAlert className="h-4.5 w-4.5 text-amber-600" strokeWidth={2} />
        )}
        <p className="text-[13px] font-semibold text-carbon">
          Verificación en dos pasos: {enabled || step === "codes" ? "activa" : "desactivada"}
        </p>
      </div>
      {!enabled && step === "idle" && (
        <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
          {recommended
            ? "Como administrador controlas pagos y usuarios: te recomendamos activarla. "
            : ""}
          Además de tu contraseña, te pediremos un código de una app en tu teléfono al iniciar sesión.
        </p>
      )}

      {!enabled && step === "idle" && (
        <button onClick={start} disabled={busy} className="btn btn-secondary btn-sm mt-3">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" strokeWidth={2} />} Activar
        </button>
      )}

      {step === "scan" && setup && (
        <div className="mt-4 grid gap-5 sm:grid-cols-[180px_1fr]">
          <div className="rounded-2xl border border-ink-800 bg-white p-2">
            <svg viewBox={`0 0 ${setup.qr.size + QUIET * 2} ${setup.qr.size + QUIET * 2}`} role="img" aria-label="Código QR para la app autenticadora" className="h-auto w-full">
              <rect width="100%" height="100%" fill="#fff" />
              <path d={path} fill="#0b0f1a" />
            </svg>
          </div>
          <div>
            <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-ink-300">
              <li>Abre una app como Google Authenticator, Microsoft Authenticator o Authy.</li>
              <li>Escanea el código QR (o ingresa la clave a mano).</li>
              <li>Escribe aquí el código de 6 dígitos que muestra la app.</li>
            </ol>
            <p className="mt-2 break-all rounded-lg bg-ink-900 px-3 py-2 font-mono text-[12px] text-ink-300">{setup.secret}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="input !w-32 text-center font-mono tracking-widest"
              />
              <button onClick={enable} disabled={busy || code.length !== 6} className="btn btn-primary btn-sm">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar y activar
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "codes" && (
        <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-4">
          <p className="font-display text-[14px] font-bold text-carbon">Guarda tus códigos de respaldo</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">
            Si pierdes tu teléfono, cada uno de estos códigos te deja entrar una vez. Se muestran <strong>solo ahora</strong>: guárdalos en un lugar seguro.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-[13px] text-carbon sm:grid-cols-4">
            {recovery.map((c) => (
              <li key={c} className="rounded-lg bg-white px-2.5 py-1.5 text-center ring-1 ring-ink-800">{c}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={copyCodes} className="btn btn-secondary btn-sm">
              {copied ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Copy className="h-4 w-4" strokeWidth={2} />} {copied ? "Copiados" : "Copiar códigos"}
            </button>
            <button onClick={() => { setStep("idle"); router.refresh(); }} className="btn btn-primary btn-sm">Ya los guardé</button>
          </div>
        </div>
      )}

      {enabled && step === "idle" && (
        <button onClick={() => setStep("disable")} className="btn btn-secondary btn-sm mt-3">Desactivar…</button>
      )}

      {step === "disable" && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-ink-400">Contraseña</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input !w-44 !py-2 text-[13px]" autoComplete="current-password" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-ink-400">Código de la app o de respaldo</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} className="input !w-44 !py-2 font-mono text-[13px]" autoComplete="one-time-code" />
          </label>
          <button onClick={disable} disabled={busy || !password || code.length < 6} className="btn btn-primary btn-sm">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Desactivar
          </button>
          <button onClick={() => { setStep("idle"); setError(null); }} className="btn btn-secondary btn-sm">Cancelar</button>
        </div>
      )}

      {error && <p className="mt-2 text-[12px] font-medium text-rose-700">{error}</p>}
    </div>
  );
}
