"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Search, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { buttonStyles } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { ThemeToggle } from "./theme-toggle";
import { AddressPicker } from "./address-picker";
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
        router.push(`/buscar${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
      }}
    >
      <label className="flex h-11 items-center gap-2 rounded-full border border-border bg-surface-2/70 px-4 transition focus-within:border-brand focus-within:bg-surface focus-within:ring-4 focus-within:ring-[var(--ring)]">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busca restaurantes, platos o productos"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          aria-label="Buscar"
          maxLength={60}
        />
      </label>
    </form>
  );
}

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link href="/carrito" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" aria-label={`Carrito (${count})`}>
      <ShoppingBag className="h-5 w-5" />
      <AnimatePresence>
        {ready && count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-white"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

export function SiteHeader({ user, platformName }: { user: HeaderUser | null; platformName: string }) {
  return (
    <header className="glass sticky top-0 z-40 border-b border-border/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 md:h-[72px]">
        <Logo name={platformName} className="shrink-0" />
        <AddressPicker userId={user?.id ?? null} className="hidden max-w-64 lg:flex" />
        <Suspense fallback={<div className="hidden flex-1 md:block" />}>
          <SearchBox className="hidden flex-1 md:block" />
        </Suspense>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <ThemeToggle />
          {user && <NotificationsBell userId={user.id} />}
          <div className="hidden md:block">
            <CartButton />
          </div>
          {user ? (
            <UserMenu name={user.name} isAdmin={user.isAdmin} />
          ) : (
            <Link href="/login" className={buttonStyles({ variant: "primary", size: "sm" })}>
              Ingresar
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 pb-3 md:hidden">
        <Suspense fallback={null}>
          <SearchBox className="flex-1" />
        </Suspense>
      </div>
      <div className="border-t border-border/70 px-2 lg:hidden">
        <AddressPicker userId={user?.id ?? null} className="w-full" />
      </div>
    </header>
  );
}
