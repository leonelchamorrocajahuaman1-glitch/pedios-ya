"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, Search, ShoppingBag, User } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/carrito", label: "Carrito", icon: ShoppingBag },
  { href: "/cuenta/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/cuenta", label: "Cuenta", icon: User },
];

/** Navegación inferior para móviles (prioridad móvil del panel de clientes). */
export function MobileNav() {
  const pathname = usePathname();
  const { count } = useCart();
  return (
    <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/70 md:hidden" aria-label="Navegación principal">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : href === "/cuenta" ? pathname === "/cuenta" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className={cn("relative flex flex-col items-center gap-1 pt-2.5 text-[11px] font-medium", active ? "text-brand" : "text-muted")}>
                {active && <motion.span layoutId="mobile-nav-pill" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" />}
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {href === "/carrito" && count > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                      {count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
