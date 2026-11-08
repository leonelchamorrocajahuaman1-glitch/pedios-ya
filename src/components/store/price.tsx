import type { Product } from "@/types";
import { formatPEN } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Precio final con precio anterior tachado cuando hay promoción o precio de referencia. */
export function oldPriceOf(p: Pick<Product, "price" | "final_price" | "compare_at_price">) {
  if (Number(p.final_price) < Number(p.price)) return Number(p.price);
  if (p.compare_at_price && Number(p.compare_at_price) > Number(p.price)) return Number(p.compare_at_price);
  return null;
}

export function discountOf(p: Pick<Product, "price" | "final_price" | "compare_at_price">) {
  const old = oldPriceOf(p);
  return old ? Math.round((1 - Number(p.final_price) / old) * 100) : 0;
}

export function Price({ product, className, size = "md" }: { product: Pick<Product, "price" | "final_price" | "compare_at_price">; className?: string; size?: "md" | "lg" }) {
  const old = oldPriceOf(product);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-display font-bold tracking-tight", size === "lg" ? "text-3xl" : "text-lg", old && "text-accent")}>{formatPEN(product.final_price)}</span>
      {old && <span className={cn("text-muted line-through", size === "lg" ? "text-base" : "text-xs")}>{formatPEN(old)}</span>}
    </div>
  );
}
