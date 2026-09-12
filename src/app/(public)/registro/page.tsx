import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Regístrate para comprar en Win Condition TCG.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12 sm:py-16">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[600px] -translate-x-1/2 rounded-full bg-accent-500/10 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo variant="full" height={120} />
        </div>

        <div className="rounded-2xl card-surface p-7">
          <h1 className="font-display text-2xl font-bold text-carbon">Crear cuenta</h1>
          <p className="mt-1 text-[13px] text-ink-400">
            Solo los compradores registrados pueden comprar en Win Condition.
          </p>

          <Suspense fallback={null}>
            <RegisterForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-[12px] text-ink-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/ingresar" className="font-semibold text-accent-300 hover:text-accent-400">
            Ingresa
          </Link>
        </p>
      </div>
    </div>
  );
}
