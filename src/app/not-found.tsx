import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo variant="full" height={120} />
      <p className="mt-10 font-display text-6xl font-bold text-ink-700">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-carbon">
        Esta carta no está en el mazo
      </h1>
      <p className="mt-2 max-w-sm text-[14px] text-ink-400">
        La página que buscas no existe o la publicación ya fue retirada.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-paper transition hover:bg-brand-500"
        >
          Ir al inicio
        </Link>
        <Link
          href="/cartas"
          className="rounded-xl border border-ink-600 px-6 py-3 text-sm font-semibold text-ink-200 transition hover:border-carbon"
        >
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}
