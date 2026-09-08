"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  Package,
  Users,
  UserCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ITEMS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
}> = [
  { href: "/panel", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/panel/publicar", label: "Publicar", icon: PlusCircle },
  { href: "/panel/publicaciones", label: "Publicaciones", icon: ListChecks },
  { href: "/panel/ordenes", label: "Órdenes", icon: Package },
  { href: "/panel/perfil", label: "Mi perfil", icon: UserCircle },
  { href: "/panel/usuarios", label: "Vendedores", icon: Users, adminOnly: true },
];

export function PanelNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="lg:w-56 lg:shrink-0">
      <ul className="flex gap-1.5 overflow-x-auto no-scrollbar lg:sticky lg:top-24 lg:flex-col lg:overflow-visible">
        {ITEMS.filter((i) => !i.adminOnly || isAdmin).map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition ${
                  active
                    ? "border border-accent-500/40 bg-accent-500/10 text-accent-300"
                    : "border border-transparent text-ink-300 hover:bg-ink-850 hover:text-carbon"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
