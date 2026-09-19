"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Check,
  Clock,
  Copy,
  FileCheck2,
  Landmark,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { clp } from "@/lib/format";

export interface BankInfo {
  bankName: string | null;
  accountType: string | null;
  accountNumber: string;
  holderName: string | null;
  rut: string | null;
}

export interface PaymentInfo {
  orderId: string;
  method: string;
  total: number;
  reference: string | null;
  dueAt: string | null;
  bank: BankInfo | null;
  pickupPoint?: string | null;
  receiptUploadedAt: string | null;
}

function CopyRow({
  label,
  value,
  display,
  strong = false,
}: {
  label: string;
  /** Lo que se copia al portapapeles. */
  value: string;
  /** Lo que se muestra, si es distinto (ej. monto con formato $88.102). */
  display?: string;
  strong?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* si el navegador bloquea el portapapeles, el usuario puede seleccionar el texto */
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-800 bg-white px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{label}</p>
        <p
          className={`truncate select-all ${
            strong ? "font-display text-[15px] font-bold text-carbon" : "text-[13px] font-medium text-ink-200"
          }`}
        >
          {display ?? value}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copiar ${label}`}
        className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition ${
          copied
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700"
            : "border-ink-700 text-ink-300 hover:border-brand-500 hover:text-brand-600"
        }`}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={2} />
        )}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function DueBadge({ dueAt }: { dueAt: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const due = new Date(dueAt);
    const left = due.getTime() - Date.now();
    if (left <= 0) {
      setText("El plazo de pago venció");
      return;
    }
    const hours = Math.floor(left / 3_600_000);
    const days = Math.ceil(left / 86_400_000);
    setText(
      days >= 1
        ? `Paga antes del ${due.toLocaleDateString("es-CL", { day: "numeric", month: "long" })} (${days} ${days === 1 ? "día" : "días"})`
        : `Te quedan ${Math.max(1, hours)} h para pagar`
    );
  }, [dueAt]);

  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-800">
      <Clock className="h-3.5 w-3.5" strokeWidth={2} />
      {text}
    </span>
  );
}

function ReceiptUploader({ orderId, uploadedAt }: { orderId: string; uploadedAt: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(Boolean(uploadedAt));

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/orders/${orderId}/receipt`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo subir el comprobante");
      setSent(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-ink-600 bg-ink-900/60 p-4">
      {sent ? (
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
            <FileCheck2 className="h-4.5 w-4.5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-carbon">Comprobante enviado</p>
            <p className="mt-0.5 text-[12px] text-ink-400">
              El vendedor revisará su cuenta y confirmará tu pago. Te avisaremos por el chat de la
              orden.
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-[12px] font-semibold">
              <a
                href={`/api/orders/${orderId}/receipt`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700"
              >
                Ver comprobante
              </a>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-ink-400 hover:text-carbon"
              >
                Reemplazar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-carbon">Sube tu comprobante</p>
            <p className="mt-0.5 text-[12px] text-ink-400">
              Foto o captura (JPG, PNG, WEBP) o PDF, máximo 4 MB. Solo lo ven tú y el vendedor.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="btn btn-primary btn-sm"
          >
            <Upload className="h-4 w-4" strokeWidth={2} />
            {busy ? "Subiendo…" : "Subir comprobante"}
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
      {error && <p className="mt-2 text-[12px] font-medium text-rose-700">{error}</p>}
    </div>
  );
}

/**
 * Instrucciones de pago de una orden pendiente: cuenta del vendedor, monto
 * exacto, código de referencia y comprobante. Se usa al terminar la compra y
 * dentro de "Mi cuenta".
 */
export function TransferInstructions({ payment }: { payment: PaymentInfo }) {
  if (payment.method === "CASH") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-ink-800 bg-ink-900/60 p-4">
        <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" strokeWidth={1.75} />
        <div className="text-[13px] leading-relaxed text-ink-300">
          <p>
            Prepara <strong className="text-carbon">{clp(payment.total)}</strong> en efectivo. Pagas
            al retirar tu pedido
            {payment.pickupPoint ? (
              <>
                {" "}
                en <strong className="text-carbon">{payment.pickupPoint}</strong>
              </>
            ) : null}
            .
          </p>
          {payment.reference && (
            <p className="mt-1.5 text-[12px] text-ink-400">
              Código de tu orden: <strong className="text-carbon">{payment.reference}</strong>
            </p>
          )}
          {payment.dueAt && (
            <div className="mt-2">
              <DueBadge dueAt={payment.dueAt} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">
          <Landmark className="h-3.5 w-3.5" strokeWidth={2} />
          Pago por transferencia
        </span>
        {payment.dueAt && <DueBadge dueAt={payment.dueAt} />}
      </div>

      {payment.bank ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <CopyRow
            label="Monto exacto"
            value={String(payment.total)}
            display={clp(payment.total)}
            strong
          />
          {payment.reference && (
            <CopyRow label="Referencia (ponla en el comentario)" value={payment.reference} strong />
          )}
          {payment.bank.bankName && <CopyRow label="Banco" value={payment.bank.bankName} />}
          {payment.bank.accountType && (
            <CopyRow label="Tipo de cuenta" value={payment.bank.accountType} />
          )}
          <CopyRow label="N° de cuenta" value={payment.bank.accountNumber} strong />
          {payment.bank.rut && <CopyRow label="RUT" value={payment.bank.rut} />}
          {payment.bank.holderName && <CopyRow label="Titular" value={payment.bank.holderName} />}
        </div>
      ) : (
        <p className="rounded-xl border border-ink-800 bg-ink-900/60 p-3.5 text-[12px] leading-relaxed text-ink-400">
          El vendedor todavía no configura su cuenta bancaria. Te escribirá por el chat de la
          orden para coordinar el pago. Tus cartas quedan reservadas hasta que venza el plazo.
        </p>
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" strokeWidth={2} />
        <p className="text-[12px] leading-relaxed text-ink-300">
          <strong className="text-carbon">Transfiere solo a los datos de esta pantalla.</strong>{" "}
          Verifica que el titular y el RUT coincidan. Nadie de la tienda te pedirá pagar a otra
          cuenta ni fuera de la plataforma.
        </p>
      </div>

      <ReceiptUploader orderId={payment.orderId} uploadedAt={payment.receiptUploadedAt} />
    </div>
  );
}
