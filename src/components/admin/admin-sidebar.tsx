"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Boxes, ClipboardList, LayoutDashboard, LogOut, Menu, Package, ScrollText, Settings, Tags, Ticket, Users, X, ExternalLink } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/categorias", label: "Categorías", icon: Tags },
  { href: "/admin/inventario", label: "Inventario", icon: Boxes },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/promociones", label: "Promociones", icon: Ticket },
  { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
  { href: "/admin/auditoria", label: "Auditoría", icon: ScrollText },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                active ? "text-white" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-2xl bg-gradient-to-r from-brand to-accent" transition={{ type: "spring", damping: 30, stiffness: 300 }} />}
              <Icon className="relative h-4.5 w-4.5" />
              <span className="relative">{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Footer({ name }: { name: string }) {
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <Link href="/" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted hover:bg-surface-2"><ExternalLink className="h-4 w-4" /> Ver tienda</Link>
      <div className="flex items-center justify-between px-3">
        <span className="truncate text-xs text-muted">{name}</span>
        <ThemeToggle />
      </div>
      <form action={signOutAction}>
        <button className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm text-danger hover:bg-danger/10"><LogOut className="h-4 w-4" /> Cerrar sesión</button>
      </form>
    </div>
  );
}

export function AdminSidebar({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface p-4 lg:flex">
        <div className="px-2 pt-2">
          <Logo href="/admin" />
          <p className="mt-2 inline-flex rounded-full bg-brand/12 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand">Panel de administración</p>
        </div>
        <nav className="flex-1 overflow-y-auto" aria-label="Administración"><NavLinks /></nav>
        <Footer name={name} />
      </aside>

      <header className="glass sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
        <Logo href="/admin" />
        <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" aria-label="Abrir menú"><Menu className="h-5 w-5" /></button>
      </header>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-surface p-4">
              <div className="flex items-center justify-between">
                <Logo href="/admin" />
                <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" aria-label="Cerrar menú"><X className="h-5 w-5" /></button>
              </div>
              <nav className="flex-1 overflow-y-auto"><NavLinks onNavigate={() => setOpen(false)} /></nav>
              <Footer name={name} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
