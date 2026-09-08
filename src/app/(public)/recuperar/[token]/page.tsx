import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Elegir nueva contraseña",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[600px] -translate-x-1/2 rounded-full bg-accent-500/10 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size={46} />
        </div>

        <div className="rounded-2xl card-surface p-7">
          <h1 className="font-display text-2xl font-bold text-carbon">Nueva contraseña</h1>
          <p className="mt-1 text-[13px] text-ink-400">
            El link vence 1 hora después de haberlo pedido.
          </p>

          <ResetPasswordForm token={token} />
        </div>
      </div>
    </div>
  );
}
