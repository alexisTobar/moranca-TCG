"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="mx-auto flex min-h-[50dvh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
    <span className="mb-5 rounded-2xl bg-ink-850 p-4"><RefreshCw className="h-7 w-7 text-brand-600" aria-hidden="true" /></span>
    <h1 className="font-display text-2xl font-bold">No pudimos cargar esta sección</h1>
    <p className="mt-3 text-sm leading-relaxed text-ink-400">Puede ser una interrupción temporal. Vuelve a intentarlo en unos momentos.</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" className="btn btn-primary" onClick={reset}>Intentar nuevamente</button><Link href="/" className="btn btn-secondary">Volver al inicio</Link></div>
  </section>;
}
