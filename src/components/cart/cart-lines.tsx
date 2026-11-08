"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { useCart } from "@/hooks/use-cart";
import { formatPEN } from "@/lib/format";

export function CartLines({ editable = true }: { editable?: boolean }) {
  const cart = useCart();
  return (
    <ul className="divide-y divide-border">
      {cart.items.map((i) => {
        const unit = i.unit_price + i.options.reduce((a, o) => a + o.price, 0);
        return (
          <li key={i.key} className="flex gap-4 py-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
              <SmartImage src={i.image_url} alt={i.name} fill sizes="80px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2">
                <p className="font-semibold leading-tight">{i.name}</p>
                <p className="shrink-0 font-semibold">{formatPEN(unit * i.quantity)}</p>
              </div>
              {i.options.length > 0 && <p className="mt-0.5 text-xs text-muted">{i.options.map((o) => o.choice).join(" · ")}</p>}
              {i.notes && <p className="mt-0.5 text-xs italic text-muted">“{i.notes}”</p>}
              {editable ? (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-full border border-border">
                    <button className="grid h-8 w-8 place-items-center" onClick={() => cart.setQuantity(i.key, i.quantity - 1)} aria-label="Restar"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
                    <button
                      className="grid h-8 w-8 place-items-center disabled:opacity-40"
                      onClick={() => cart.setQuantity(i.key, i.quantity + 1)}
                      disabled={i.quantity >= (i.max_stock ?? 50)}
                      aria-label="Sumar"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button onClick={() => cart.remove(i.key)} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted">Cantidad: {i.quantity}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
