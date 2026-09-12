import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "./Logo";
import { GAME_LIST } from "@/lib/games";
import { getCurrentUser } from "@/lib/auth";
import { SearchBox } from "./SearchBox";
import { MobileNav } from "./MobileNav";
import { CartButton } from "./cart/CartDrawer";
import { LogoutButton } from "./LogoutButton";

const NAV = [
  { href: "/cartas", label: "Cartas" },
  { href: "/cartas?type=SEALED", label: "Sellados" },
  { href: "/cartas?type=DECK", label: "Mazos" },
  { href: "/vendedores", label: "Vendedores" },
  { href: "/noticias", label: "Noticias" },
  { href: "/ayuda", label: "Ayuda" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-800 bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href="/" aria-label="Win Condition TCG - inicio">
          <Logo height={54} />
        </Link>

        <div className="ml-2 hidden flex-1 lg:block">
          <Suspense fallback={null}>
            <SearchBox />
          </Suspense>
        </div>

        <nav className="hidden items-center gap-1 xl:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-ink-300 transition hover:bg-ink-850 hover:text-carbon"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Link
              href={user.role === "BUYER" ? "/cuenta" : "/panel"}
              className="hidden rounded-lg border border-accent-500/50 bg-accent-500/10 px-3.5 py-2 text-[13px] font-semibold text-accent-300 transition hover:bg-accent-500/20 sm:block"
            >
              {user.role === "BUYER" ? "Mi cuenta" : "Mi panel"}
            </Link>
          ) : null}
          {user?.role === "BUYER" && (
            <LogoutButton className="hidden !px-3.5 !py-2 !text-[13px] !font-medium sm:block" />
          )}
          {!user && (
            <Link
              href="/ingresar"
              className="hidden rounded-lg border border-ink-700 px-3.5 py-2 text-[13px] font-medium text-ink-200 transition hover:border-accent-500/60 hover:text-accent-300 sm:block"
            >
              Ingresar
            </Link>
          )}
          <CartButton />
          <MobileNav
            nav={NAV}
            isLogged={Boolean(user)}
            accountHref={user?.role === "BUYER" ? "/cuenta" : "/panel"}
            accountLabel={user?.role === "BUYER" ? "Mi cuenta" : "Mi panel"}
            showLogout={user?.role === "BUYER"}
          />
        </div>
      </div>

      <div className="border-t border-ink-850/80">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 no-scrollbar">
          <Link
            href="/cartas"
            className="whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400 transition hover:text-accent-300"
          >
            Todos los juegos
          </Link>
          {GAME_LIST.map((g) => (
            <Link
              key={g.id}
              href={`/cartas?game=${g.id}`}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400 transition hover:text-carbon"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: g.accent }}
              />
              {g.short}
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-ink-850/80 px-4 py-2 lg:hidden">
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={null}>
            <SearchBox />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
