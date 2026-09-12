import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { PanelNav } from "@/components/PanelNav";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?next=/panel");
  // Chequeo con el rol recién leído de la base (no el que quedó guardado en
  // la cookie), para que a alguien recién aprobado como vendedor no le quede
  // bloqueado el panel hasta que vuelva a iniciar sesión.
  if (user.role === "BUYER") redirect("/cuenta");

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-ink-800 bg-ink-200/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center gap-4 px-4">
          <Link href="/">
            <Logo height={64} tone="light" />
          </Link>
          <span className="hidden rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/80 sm:inline">
            {isAdmin ? "Administrador" : "Vendedor"}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/"
              className="hidden text-[13px] text-white/80 transition hover:text-carbon sm:block"
            >
              Ver tienda ↗
            </Link>
            <span className="hidden text-[13px] font-medium text-white/80 md:block">
              {user.name}
            </span>
            <LogoutButton className="!border-white/20 !text-white/80" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        <PanelNav isAdmin={isAdmin} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
