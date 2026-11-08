import Link from "next/link";
import type { Product } from "@/types";
import { SmartImage } from "@/components/ui/smart-image";
import { formatPEN } from "@/lib/format";

/** Tarjeta de producto popular: lleva al menú del restaurante con el producto abierto. */
export function PopularProductCard({ product: p }: { product: Product }) {
  return (
    <Link
      href={`/restaurante/${p.restaurants?.slug}?producto=${p.id}`}
      className="group flex w-64 shrink-0 flex-col overflow-hidden rounded-3xl border border-border bg-surface transition duration-300 hover:-translate-y-1 hover:shadow-card sm:w-auto"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <SmartImage src={p.image_url} alt={p.name} fill sizes="(max-width: 640px) 256px, 25vw" className="object-cover transition duration-700 group-hover:scale-110" />
        {p.compare_at_price && p.compare_at_price > p.price && (
          <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
            -{Math.round((1 - p.price / p.compare_at_price) * 100)}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs font-semibold text-brand">{p.restaurants?.name}</p>
        <h3 className="line-clamp-1 font-semibold">{p.name}</h3>
        <p className="line-clamp-2 text-xs text-muted">{p.description}</p>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-display text-lg font-bold">{formatPEN(p.price)}</span>
          {p.compare_at_price && p.compare_at_price > p.price && (
            <span className="text-xs text-muted line-through">{formatPEN(p.compare_at_price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
