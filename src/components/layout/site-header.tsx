"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutGrid, Search, ShoppingCart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { buttonStyles } from "@/components/ui/button";
import { CategoryIcon } from "@/components/home/category-icon";
import { useCart } from "@/hooks/use-cart";
import type { Category } from "@/types";
import { ThemeToggle } from "./theme-toggle";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";

export interface HeaderUser {
  id: string;
  name: string;
  isAdmin: boolean;
}

function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  return (
    <form
      role="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/productos${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
      }}
    >
      <label className="flex h-11 items-center gap-2 rounded-full border border-border bg-surface-2/70 pl-4 pr-1.5 transition focus-within:border-brand focus-within:bg-surface focus-within:ring-4 focus-within:ring-[var(--ring)]">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="¿Qué necesitas hoy? Arroz, leche, gaseosa…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" aria-label="Buscar productos" maxLength={60} />
        <button type="submit" className="hidden h-8 shrink-0 rounded-full bg-brand px-4 text-xs font-semibold text-brand-fg sm:block">Buscar</button>
      </label>
    </form>
  );
}

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link href="/carrito" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" aria-label={`Carrito (${count} productos)`}>
      <ShoppingCart className="h-5 w-5" />
      <AnimatePresence>
        {ready && count > 0 && (
          <motion.span key={count} initial={{ scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

function CategoriesMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-surface-2" aria-expanded={open}>
        <LayoutGrid className="h-4 w-4 text-brand" /> Categorías <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute left-0 top-12 z-50 grid w-[min(44rem,90vw)] grid-cols-2 gap-1 rounded-3xl border border-border bg-surface p-3 shadow-2xl md:grid-cols-3">
            {categories.map((c) => (
              <Link key={c.id} href={`/categoria/${c.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition hover:bg-brand/10">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><CategoryIcon name={c.icon} className="h-4 w-4" /></span>
                <span className="font-medium">{c.name}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SiteHeader({ user, categories }: { user: HeaderUser | null; categories: Category[] }) {
  return (
    <header className="glass sticky top-0 z-40 border-b border-border/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 md:h-[72px]">
        <Logo className="shrink-0" />
        <nav className="ml-2 hidden items-center lg:flex" aria-label="Principal">
          <CategoriesMenu categories={categories} />
          <Link href="/productos?ofertas=1" className="h-10 rounded-full px-3 text-sm font-semibold leading-10 text-accent hover:bg-accent/10">Ofertas</Link>
        </nav>
        <Suspense fallback={<div className="hidden flex-1 md:block" />}>
          <SearchBox className="hidden flex-1 md:block" />
        </Suspense>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <ThemeToggle />
          {user && <NotificationsBell userId={user.id} />}
          <div className="hidden md:block"><CartButton /></div>
          {user ? (
            <UserMenu name={user.name} isAdmin={user.isAdmin} />
          ) : (
            <Link href="/login" className={buttonStyles({ variant: "primary", size: "sm" })}>Ingresar</Link>
          )}
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <Suspense fallback={null}>
          <SearchBox />
        </Suspense>
      </div>
    </header>
  );
}
