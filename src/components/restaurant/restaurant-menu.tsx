"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Product } from "@/types";
import { SmartImage } from "@/components/ui/smart-image";
import { EmptyState } from "@/components/ui/empty-state";
import { useCart, type CartRestaurant } from "@/hooks/use-cart";
import { formatPEN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProductDialog, isOutOfStock } from "./product-dialog";

export function RestaurantMenu({ products, restaurant, isOpen }: { products: Product[]; restaurant: CartRestaurant; isOpen: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [selected, setActive] = useState<Product | null>(null);
  // Abrir producto desde ?producto=<id> (enlaces de "Productos populares")
  const fromUrl = useMemo(() => products.find((p) => p.id === params.get("producto")) ?? null, [params, products]);
  const active = selected ?? fromUrl;

  const close = () => {
    setActive(null);
    if (params.get("producto")) router.replace(pathname, { scroll: false });
  };

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? products.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(q)) : products;
    const map = new Map<string, Product[]>();
    for (const p of filtered) map.set(p.section, [...(map.get(p.section) ?? []), p]);
    return [...map.entries()];
  }, [products, query]);

  const inThisCart = cart.restaurant?.id === restaurant.id ? cart.count : 0;

  return (
    <>
      <div className="z-30 -mx-4 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0 md:sticky md:top-[72px]">
        <div className="flex items-center gap-3">
          <label className="flex h-10 w-full max-w-xs shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 sm:w-64">
            <Search className="h-4 w-4 text-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en el menú" className="w-full bg-transparent text-sm outline-none" aria-label="Buscar en el menú" />
          </label>
          <nav className="scrollbar-none hidden gap-2 overflow-x-auto sm:flex" aria-label="Secciones del menú">
            {sections.map(([name]) => (
              <a key={name} href={`#sec-${encodeURIComponent(name)}`} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg">
                {name}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {sections.length === 0 && <EmptyState className="mt-8" icon={<Search />} title="Sin productos" description={query ? "No hay coincidencias en este menú." : "Este negocio aún no publicó su menú."} />}

      <div className="space-y-10 pt-6">
        {sections.map(([name, items]) => (
          <section key={name} id={`sec-${encodeURIComponent(name)}`} className="scroll-mt-48">
            <h2 className="mb-4 font-display text-xl font-bold">{name}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((p) => {
                const out = isOutOfStock(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => setActive(p)}
                    className={cn(
                      "group flex gap-4 rounded-3xl border border-border bg-surface p-3 text-left transition duration-300 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-card",
                      out && "opacity-60",
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-1 p-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold leading-tight">{p.name}</h3>
                        {p.is_popular && <span className="rounded-full bg-brand/12 px-2 py-0.5 text-[10px] font-bold text-brand">Popular</span>}
                      </div>
                      <p className="line-clamp-2 text-sm text-muted">{p.description}</p>
                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="font-display font-bold">{formatPEN(p.price)}</span>
                        {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
                          <span className="text-xs text-muted line-through">{formatPEN(p.compare_at_price)}</span>
                        )}
                        {out && <span className="text-xs font-semibold text-danger">Agotado</span>}
                      </div>
                    </div>
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
                      <SmartImage src={p.image_url} alt={p.name} fill sizes="112px" className="object-cover transition duration-500 group-hover:scale-110" />
                      {!out && (
                        <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-surface text-brand shadow-lg transition group-hover:bg-brand group-hover:text-white">
                          <Plus className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <ProductDialog product={active} restaurant={restaurant} restaurantOpen={isOpen} onClose={close} />

      <AnimatePresence>
        {inThisCart > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed inset-x-0 bottom-20 z-30 px-4 md:bottom-6">
            <Link
              href="/carrito"
              className="mx-auto flex h-14 max-w-md items-center justify-between rounded-full bg-brand px-6 font-semibold text-white shadow-[0_12px_40px_-10px_var(--brand)]"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" /> Ver carrito ({inThisCart})
              </span>
              <span>{formatPEN(cart.estimatedSubtotal)}</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
