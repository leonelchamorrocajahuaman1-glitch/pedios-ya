"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/productos", label: "Productos", icon: LayoutGrid },
  { href: "/carrito", label: "Carrito", icon: ShoppingCart },
  { href: "/cuenta/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/cuenta", label: "Cuenta", icon: User },
];

/** Navegación inferior para celulares (zona del pulgar). */
export function MobileNav() {
  const pathname = usePathname();
  const { count } = useCart();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : href === "/cuenta" ? pathname === "/cuenta" || pathname === "/cuenta/direcciones" : href === "/productos" ? pathname.startsWith("/productos") || pathname.startsWith("/categoria") || pathname.startsWith("/producto/") : pathname.startsWith(href);
  return (
    <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/70 md:hidden" aria-label="Navegación principal">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link href={href} className={cn("relative flex flex-col items-center gap-1 pt-2.5 text-[11px] font-medium", active ? "text-brand" : "text-muted")}>
                {active && <motion.span layoutId="mobile-nav-pill" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" />}
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {href === "/carrito" && count > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{count}</span>
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
