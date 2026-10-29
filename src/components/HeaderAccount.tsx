"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogIn, UserRound } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { MobileNav } from "./MobileNav";
import { CartButton } from "./cart/CartDrawer";

type Role = "ADMIN" | "SELLER" | "BUYER" | null;
const KEY = "wc_role";

/**
 * Botón de cuenta del encabezado. El rol se pide al navegador (no al servidor) para que el resto de la página
 * no dependa de la cookie de sesión y pueda servirse desde caché. Se recuerda el último valor para no parpadear.
 */
export function HeaderAccount({ nav }: { nav: { href: string; label: string }[] }) {
  const [role, setRole] = useState<Role>(null);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved === "ADMIN" || saved === "SELLER" || saved === "BUYER") setRole(saved);
    } catch { /* sin almacenamiento */ }
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { role: Role } | null) => {
        if (!alive || !d) return;
        setRole(d.role);
        try { d.role ? sessionStorage.setItem(KEY, d.role) : sessionStorage.removeItem(KEY); } catch { /* ignorar */ }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [pathname]); // al navegar se revalida: cubre iniciar y cerrar sesión

  const buyer = role === "BUYER";
  const href = buyer ? "/cuenta" : "/panel";
  const label = buyer ? "Mi cuenta" : "Mi panel";
  return (
    <>
      {role ? (
        <Link href={href} className="btn btn-glass btn-sm hidden sm:inline-flex">
          <UserRound className="h-4 w-4" strokeWidth={2} />
          {label}
        </Link>
      ) : (
        <Link href="/ingresar" className="btn btn-glass btn-sm hidden sm:inline-flex">
          <LogIn className="h-4 w-4" strokeWidth={2} />
          Ingresar
        </Link>
      )}
      {buyer && <LogoutButton className="hidden !rounded-full !border-white/20 !px-3.5 !py-2 !text-[13px] !font-semibold !text-white/80 sm:block" />}
      <CartButton />
      <MobileNav nav={nav} isLogged={Boolean(role)} accountHref={href} accountLabel={label} showLogout={buyer} />
    </>
  );
}
