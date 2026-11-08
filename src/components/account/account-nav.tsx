"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Heart, MapPin, Star, Ticket, User } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/cuenta", label: "Perfil", icon: User },
  { href: "/cuenta/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/cuenta/direcciones", label: "Direcciones", icon: MapPin },
  { href: "/cuenta/favoritos", label: "Favoritos", icon: Heart },
  { href: "/cuenta/cupones", label: "Cupones", icon: Ticket },
  { href: "/cuenta/calificaciones", label: "Calificaciones", icon: Star },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" aria-label="Mi cuenta">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/cuenta" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition",
              active ? "bg-fg text-bg" : "bg-surface hover:bg-surface-2 lg:bg-transparent",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
