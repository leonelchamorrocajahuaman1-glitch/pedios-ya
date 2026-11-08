"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, LayoutDashboard, LogOut, MapPin, User } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";

export function UserMenu({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const links = [
    { href: "/cuenta", label: "Mi perfil", icon: User },
    { href: "/cuenta/pedidos", label: "Mis pedidos", icon: ClipboardList },
    { href: "/cuenta/direcciones", label: "Mis direcciones", icon: MapPin },
  ];
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-strong text-sm font-bold text-white" aria-label="Menú de usuario" aria-expanded={open}>
        {initials}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-3xl border border-border bg-surface p-2 shadow-2xl">
            <p className="truncate px-3 py-2 text-sm font-semibold">{name || "Mi cuenta"}</p>
            {isAdmin && (
              <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl bg-accent/10 px-3 py-2.5 text-sm font-semibold text-accent">
                <LayoutDashboard className="h-4 w-4" /> Panel administrativo
              </Link>
            )}
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm hover:bg-surface-2">
                <Icon className="h-4 w-4 text-muted" /> {label}
              </Link>
            ))}
            <form action={signOutAction}>
              <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-danger hover:bg-danger/10"><LogOut className="h-4 w-4" /> Cerrar sesión</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
