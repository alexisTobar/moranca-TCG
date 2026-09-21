import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { TwoFactorLoginForm } from "@/components/TwoFactorLoginForm";

export const metadata: Metadata = {
  title: "Verificación en dos pasos",
  robots: { index: false, follow: false },
};

export default function TwoFactorPage() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl card-surface p-7">
          <h1 className="font-display text-2xl font-bold text-carbon">Verificación en dos pasos</h1>
          <p className="mt-1 text-[13px] text-ink-400">Confirma que eres tú para terminar de ingresar.</p>
          <Suspense fallback={null}>
            <TwoFactorLoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-[12px] text-ink-400">
          <Link href="/ingresar" className="font-semibold text-brand-600 hover:text-brand-700">
            Volver a ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}
