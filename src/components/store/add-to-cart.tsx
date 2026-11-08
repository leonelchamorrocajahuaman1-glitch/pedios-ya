"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useCart, type CartItem } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

/** Botón «Agregar» que se transforma en selector de cantidad cuando el producto ya está en el carrito. */
export function AddToCart({ item, className, size = "md" }: { item: Omit<CartItem, "quantity">; className?: string; size?: "sm" | "md" }) {
  const cart = useCart();
  const qty = cart.quantityOf(item.product_id);
  const out = item.stock <= 0;
  const h = size === "sm" ? "h-9" : "h-11";

  if (out) {
    return (
      <button disabled className={cn("w-full rounded-full bg-surface-2 text-sm font-semibold text-muted", h, className)}>
        Agotado
      </button>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {qty === 0 ? (
        <motion.button
          key="add"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={() => {
            cart.add(item, 1);
            toast.success("Agregado al carrito", { description: item.name, duration: 1800 });
          }}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-brand-fg shadow-[0_8px_20px_-10px_var(--brand)] transition hover:bg-brand-strong active:scale-95",
            h,
            className,
          )}
          aria-label={`Agregar ${item.name} al carrito`}
        >
          <ShoppingCart className="h-4 w-4" /> Agregar
        </motion.button>
      ) : (
        <motion.div
          key="stepper"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={cn("flex w-full items-center justify-between rounded-full bg-brand/10 p-1 text-brand", h, className)}
        >
          <button className="grid aspect-square h-full place-items-center rounded-full bg-surface text-fg shadow-sm transition hover:bg-brand hover:text-white" onClick={() => cart.setQuantity(item.product_id, qty - 1)} aria-label="Quitar uno">
            <Minus className="h-4 w-4" />
          </button>
          <span className="font-display text-base font-bold" aria-live="polite">{qty}</span>
          <button
            className="grid aspect-square h-full place-items-center rounded-full bg-surface text-fg shadow-sm transition hover:bg-brand hover:text-white disabled:opacity-40"
            onClick={() => {
              if (qty >= item.stock) toast.message(`Solo hay ${item.stock} unidades disponibles`);
              else cart.setQuantity(item.product_id, qty + 1);
            }}
            disabled={qty >= item.stock}
            aria-label="Agregar uno"
          >
            <Plus className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
