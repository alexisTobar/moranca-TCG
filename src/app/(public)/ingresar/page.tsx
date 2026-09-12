import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Ingresar",
  description: "Acceso al panel de administración de Win Condition TCG.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const registerHref = next ? `/registro?next=${encodeURIComponent(next)}` : "/registro";

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12 sm:py-16">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[600px] -translate-x-1/2 rounded-full bg-accent-500/10 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size={46} />
        </div>

        <div className="rounded-2xl card-surface p-7">
          <h1 className="font-display text-2xl font-bold text-carbon">Ingresar</h1>
          <p className="mt-1 text-[13px] text-ink-400">
            Inicia sesión para comprar, vender o revisar tus órdenes.
          </p>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-[12px] text-ink-400">
          ¿No tienes cuenta?{" "}
          <Link
            href={registerHref}
            className="font-semibold text-accent-300 hover:text-accent-400"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
