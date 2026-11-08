"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { useCart } from "@/hooks/use-cart";
import { formatPEN } from "@/lib/format";
import type { QuoteLine } from "@/types";

export function CartLines({ editable = true, lines }: { editable?: boolean; lines?: QuoteLine[] }) {
  const cart = useCart();
  return (
    <ul className="divide-y divide-border">
      {cart.items.map((i) => {
        const line = lines?.find((l) => l.product_id === i.product_id);
        const unit = line ? Number(line.unit_price) : i.price;
        const promo = line && Number(line.unit_price) < Number(line.original_price);
        return (
          <li key={i.product_id} className="flex gap-4 py-4">
            <Link href={`/producto/${i.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
              <SmartImage src={i.image_url} alt={i.name} fill sizes="80px" className="object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2">
                <Link href={`/producto/${i.slug}`} className="font-semibold leading-tight hover:text-brand">{i.name}</Link>
                <p className="shrink-0 font-semibold">{formatPEN(unit * i.quantity)}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {formatPEN(unit)} c/u{promo && <span className="ml-1 text-accent line-through">{formatPEN(line.original_price)}</span>}
                {i.stock <= 5 && <span className="ml-2 text-warning">· quedan {i.stock}</span>}
              </p>
              {editable ? (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-full border border-border">
                    <button className="grid h-9 w-9 place-items-center" onClick={() => cart.setQuantity(i.product_id, i.quantity - 1)} aria-label="Restar"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-7 text-center text-sm font-semibold">{i.quantity}</span>
                    <button className="grid h-9 w-9 place-items-center disabled:opacity-40" onClick={() => cart.setQuantity(i.product_id, i.quantity + 1)} disabled={i.quantity >= i.stock} aria-label="Sumar"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button onClick={() => cart.remove(i.product_id)} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-danger"><Trash2 className="h-3.5 w-3.5" /> Eliminar</button>
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
