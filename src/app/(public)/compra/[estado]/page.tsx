import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle, type LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";

const STATES: Record<
  string,
  { title: string; body: string; tone: string; icon: LucideIcon }
> = {
  exito: {
    title: "¡Pago confirmado!",
    body: "Recibimos tu pago. Te enviamos un correo con el detalle y coordinaremos el despacho a la brevedad.",
    tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
    icon: CheckCircle2,
  },
  pendiente: {
    title: "Pago pendiente",
    body: "Tu pago está siendo procesado. Cuando Mercado Pago lo confirme, activaremos el despacho automáticamente.",
    tone: "border-amber-500/40 bg-amber-500/10 text-amber-700",
    icon: Clock,
  },
  error: {
    title: "No pudimos procesar el pago",
    body: "El pago fue rechazado o cancelado. Tu reserva sigue guardada: puedes intentarlo nuevamente desde la publicación.",
    tone: "border-rose-500/40 bg-rose-500/10 text-rose-700",
    icon: XCircle,
  },
};

export default async function PurchaseStatePage({
  params,
  searchParams,
}: {
  params: Promise<{ estado: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { estado } = await params;
  const sp = await searchParams;
  const state = STATES[estado];
  if (!state) notFound();

  const order = typeof sp.order === "string" ? sp.order : undefined;
  const Icon = state.icon;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <span
        className={`flex h-16 w-16 items-center justify-center rounded-full border ${state.tone}`}
      >
        <Icon className="h-7 w-7" strokeWidth={2} />
      </span>
      <h1 className="mt-6 font-display text-3xl font-bold text-carbon">{state.title}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-400">{state.body}</p>
      {order && (
        <p className="mt-4 rounded-lg border border-ink-700 bg-ink-900 px-4 py-2 text-[12px] text-ink-300">
          Orden <strong className="text-carbon">#{order.slice(-6).toUpperCase()}</strong>
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/cartas"
          className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-paper transition hover:bg-brand-500"
        >
          Seguir comprando
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-ink-600 px-6 py-3 text-sm font-semibold text-ink-200 transition hover:border-carbon"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
