import Link from "next/link";
import { Suspense } from "react";
import { Sparkles, UserRound, LogIn } from "lucide-react";
import { Logo } from "./Logo";
import { GAME_LIST } from "@/lib/games";
import { getCurrentUser } from "@/lib/auth";
import { discountPctFor, getSiteSettings } from "@/lib/site-settings";
import { SearchBox } from "./SearchBox";
import { MobileNav } from "./MobileNav";
import { CartButton } from "./cart/CartDrawer";
import { LogoutButton } from "./LogoutButton";

const NAV = [
  { href: "/cartas", label: "Cartas" },
  { href: "/cartas?type=SEALED", label: "Sellados" },
  { href: "/cartas?type=DECK", label: "Mazos" },
  { href: "/vendedores", label: "Vendedores" },
  { href: "/tiendas", label: "Abre tu tienda" },
  { href: "/noticias", label: "Noticias" },
  { href: "/ayuda", label: "Ayuda" },
];

export async function SiteHeader() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSiteSettings()]);
  const transferPct = discountPctFor(settings, "TRANSFER");

  return (
    <>
      {/* Barra de anuncio: refleja el descuento que define el administrador */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-brand-700 text-white">
        <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-[12px] font-semibold tracking-wide">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold-300" strokeWidth={2} />
          {transferPct > 0
            ? `${transferPct}% de descuento pagando por transferencia · Despacho a todo Chile`
            : "Compra segura con reserva de stock · Despacho a todo Chile"}
        </p>
      </div>

      {/* Solo esta barra queda fija al hacer scroll; lo demás se desplaza */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-carbon/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-4 px-4">
          <Link href="/" aria-label="Win Condition TCG - inicio" className="shrink-0">
            <Logo height={54} tone="light" />
          </Link>

          <div className="ml-2 hidden flex-1 lg:block">
            <Suspense fallback={null}>
              <SearchBox />
            </Suspense>
          </div>

          <nav className="hidden items-center xl:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="nav-link">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Link
                href={user.role === "BUYER" ? "/cuenta" : "/panel"}
                className="btn btn-glass btn-sm hidden sm:inline-flex"
              >
                <UserRound className="h-4 w-4" strokeWidth={2} />
                {user.role === "BUYER" ? "Mi cuenta" : "Mi panel"}
              </Link>
            ) : (
              <Link href="/ingresar" className="btn btn-glass btn-sm hidden sm:inline-flex">
                <LogIn className="h-4 w-4" strokeWidth={2} />
                Ingresar
              </Link>
            )}
            {user?.role === "BUYER" && (
              <LogoutButton className="hidden !rounded-full !border-white/20 !px-3.5 !py-2 !text-[13px] !font-semibold !text-white/80 sm:block" />
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
      </header>

      <div className="bg-carbon">
        {/* Juegos */}
        <div className="border-t border-white/[0.06]">
          <div className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-4 py-2 no-scrollbar">
            <Link
              href="/cartas"
              className="whitespace-nowrap rounded-full bg-white/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-white/20"
            >
              Todos los juegos
            </Link>
            {GAME_LIST.map((g) => (
              <Link
                key={g.id}
                href={`/cartas?game=${g.id}`}
                className="whitespace-nowrap rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                {g.short}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-white/[0.06] px-4 py-2.5 lg:hidden">
          <div className="mx-auto max-w-7xl">
            <Suspense fallback={null}>
              <SearchBox className="max-w-none" />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
