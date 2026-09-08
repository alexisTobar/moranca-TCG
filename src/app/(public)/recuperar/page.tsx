import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[600px] -translate-x-1/2 rounded-full bg-accent-500/10 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size={46} />
        </div>

        <div className="rounded-2xl card-surface p-7">
          <h1 className="font-display text-2xl font-bold text-carbon">
            Recuperar contraseña
          </h1>
          <p className="mt-1 text-[13px] text-ink-400">
            Escribe tu email y te mandamos un link para elegir una nueva.
          </p>

          <ForgotPasswordForm />
        </div>

        <p className="mt-6 text-center text-[12px] text-ink-400">
          <Link href="/ingresar" className="font-semibold text-accent-300 hover:text-accent-400">
            Volver a Ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}
