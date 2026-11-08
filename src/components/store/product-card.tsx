import Link from "next/link";
import type { Product } from "@/types";
import { SmartImage } from "@/components/ui/smart-image";
import { AddToCart } from "./add-to-cart";
import { Price, discountOf } from "./price";
import { cn } from "@/lib/utils";

const NEW_DAYS = 14;

export function isNewProduct(p: Pick<Product, "created_at">) {
  return Date.now() - new Date(p.created_at).getTime() < NEW_DAYS * 86400000;
}

export function ProductCard({ product: p, className, priority }: { product: Product; className?: string; priority?: boolean }) {
  const discount = discountOf(p);
  const out = p.stock <= 0;
  const low = !out && p.stock <= p.min_stock;
  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-surface transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card", className)}>
      <Link href={`/producto/${p.slug}`} className="relative block aspect-square overflow-hidden bg-surface-2" aria-label={p.name}>
        <SmartImage
          src={p.image_url}
          alt={p.name}
          fill
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className={cn("object-cover transition duration-700 group-hover:scale-110", out && "grayscale")}
        />
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {discount > 0 && <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-white shadow">-{discount}%</span>}
          {isNewProduct(p) && <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-brand-fg shadow">Nuevo</span>}
        </div>
        {out && <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1.5 text-center text-xs font-bold text-white">Agotado</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        {p.brand && <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">{p.brand}</p>}
        <Link href={`/producto/${p.slug}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight hover:text-brand">
          {p.name}
        </Link>
        <Price product={p} className="mt-auto pt-1" />
        <p className={cn("text-[11px] font-medium", out ? "text-danger" : low ? "text-warning" : "text-success")}>
          {out ? "Sin stock" : low ? `¡Quedan ${p.stock}!` : "Disponible"}
        </p>
        <AddToCart
          size="sm"
          className="mt-1.5"
          item={{ product_id: p.id, slug: p.slug, name: p.name, image_url: p.image_url, price: Number(p.final_price), stock: p.stock }}
        />
      </div>
    </article>
  );
}

export function ProductGrid({ products, className }: { products: Product[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5", className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}

/** Carrusel horizontal en móvil / cuadrícula en escritorio. */
export function ProductRail({ products }: { products: Product[] }) {
  return (
    <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} className="w-44 shrink-0 snap-start sm:w-auto" />
      ))}
    </div>
  );
}
