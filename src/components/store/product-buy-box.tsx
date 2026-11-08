"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonStyles } from "@/components/ui/button";
import { useCart, type CartItem } from "@/hooks/use-cart";
import { formatPEN } from "@/lib/format";

export function ProductBuyBox({ item }: { item: Omit<CartItem, "quantity"> }) {
  const cart = useCart();
  const router = useRouter();
  const inCart = cart.quantityOf(item.product_id);
  const max = Math.max(0, Math.min(99, item.stock - inCart));
  const [qty, setQty] = useState(1);
  if (item.stock <= 0) {
    return <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">Producto agotado por el momento.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 items-center rounded-full border border-border bg-surface">
          <button className="grid h-12 w-12 place-items-center disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Restar"><Minus className="h-4 w-4" /></button>
          <span className="w-10 text-center font-display text-lg font-bold" aria-live="polite">{qty}</span>
          <button className="grid h-12 w-12 place-items-center disabled:opacity-40" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} aria-label="Sumar"><Plus className="h-4 w-4" /></button>
        </div>
        <Button
          size="lg"
          className="flex-1"
          disabled={max <= 0}
          onClick={() => {
            const n = cart.add(item, qty);
            toast.success(`${qty} × ${item.name} en tu carrito`, { description: `Ahora tienes ${n} en total`, action: { label: "Ver carrito", onClick: () => router.push("/carrito") } });
            setQty(1);
          }}
        >
          <ShoppingCart className="h-5 w-5" /> Agregar · {formatPEN(item.price * qty)}
        </Button>
      </div>
      {inCart > 0 && (
        <p className="text-sm text-muted">
          Ya tienes {inCart} en tu carrito. <Link href="/carrito" className="font-semibold text-brand hover:underline">Ir al carrito</Link>
        </p>
      )}
      {max <= 0 && inCart > 0 && <p className="text-sm text-warning">Agregaste todo el stock disponible.</p>}
      <Link href="/checkout" className={buttonStyles({ variant: "outline" }) + " w-full"} onClick={() => inCart === 0 && cart.add(item, qty)}>
        Comprar ahora
      </Link>
    </div>
  );
}
