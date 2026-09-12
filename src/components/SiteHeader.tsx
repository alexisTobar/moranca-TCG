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
    <header className="sticky top-0 z-50 border-b border-ink-800 bg-ink-200/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4">
        <Link href="/" aria-label="Win Condition TCG - inicio">
          <Logo height={72} tone="light" />
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
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Link
              href={user.role === "BUYER" ? "/cuenta" : "/panel"}
              className="hidden rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-[13px] font-semibold text-white/90 transition hover:bg-white/15 sm:block"
            >
              {user.role === "BUYER" ? "Mi cuenta" : "Mi panel"}
            </Link>
          ) : null}
          {user?.role === "BUYER" && (
            <LogoutButton className="hidden !border-white/20 !px-3.5 !py-2 !text-[13px] !font-medium !text-white/80 sm:block" />
          )}
          {!user && (
            <Link
              href="/ingresar"
              className="hidden rounded-lg border border-white/20 px-3.5 py-2 text-[13px] font-medium text-white/80 transition hover:border-carbon hover:text-carbon sm:block"
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

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 no-scrollbar">
          <Link
            href="/cartas"
            className="whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/60 transition hover:text-white"
          >
            Todos los juegos
          </Link>
          {GAME_LIST.map((g) => (
            <Link
              key={g.id}
              href={`/cartas?game=${g.id}`}
              className="whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/60 transition hover:text-white"
            >
              {g.short}
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-2 lg:hidden">
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={null}>
            <SearchBox />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
