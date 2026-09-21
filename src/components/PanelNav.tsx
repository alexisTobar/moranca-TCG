"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  Package,
  Percent,
  Users,
  UserCircle,
  ShieldCheck,
  Store,
  Gem,
  LifeBuoy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CountBadge, usePanelCounts, type Counts } from "@/components/panel/PanelCounts";

const ITEMS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
  /** Qué contador de avisos se muestra en este ítem. */
  badge?: keyof Counts;
}> = [
  { href: "/panel", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/panel/publicar", label: "Publicar", icon: PlusCircle },
  { href: "/panel/publicaciones", label: "Publicaciones", icon: ListChecks },
  { href: "/panel/ordenes", label: "Órdenes", icon: Package, badge: "orders" },
  { href: "/panel/descuentos", label: "Descuentos", icon: Percent },
  { href: "/panel/tienda", label: "Mi tienda", icon: Store },
  { href: "/panel/soporte", label: "Soporte", icon: LifeBuoy, badge: "tickets" },
  { href: "/panel/perfil", label: "Mi perfil", icon: UserCircle },
  { href: "/panel/usuarios", label: "Vendedores", icon: Users, adminOnly: true, badge: "sellerRequests" },
  { href: "/panel/tiendas", label: "Tiendas premium", icon: Gem, adminOnly: true, badge: "subscriptions" },
  { href: "/panel/configuracion", label: "Pagos y descuentos", icon: ShieldCheck, adminOnly: true },
];

export function PanelNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const { counts } = usePanelCounts();

  return (
    <nav className="lg:w-56 lg:shrink-0">
      <ul className="flex gap-1.5 overflow-x-auto no-scrollbar lg:sticky lg:top-24 lg:flex-col lg:overflow-visible">
        {ITEMS.filter((i) => !i.adminOnly || isAdmin).map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition ${
                  active
                    ? "bg-carbon text-paper shadow-lg shadow-carbon/20"
                    : "text-ink-300 hover:bg-ink-850 hover:text-carbon"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {item.label}
                {item.badge && <CountBadge value={counts[item.badge]} className="ml-auto" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
