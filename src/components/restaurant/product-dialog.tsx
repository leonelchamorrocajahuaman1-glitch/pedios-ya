"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import type { OptionGroup, Product, SelectedOption } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { SmartImage } from "@/components/ui/smart-image";
import { useCart, type CartRestaurant } from "@/hooks/use-cart";
import { formatPEN } from "@/lib/format";
import { cn } from "@/lib/utils";

export function isOutOfStock(p: Pick<Product, "stock" | "is_available">) {
  return !p.is_available || (p.stock !== null && p.stock <= 0);
}

export function ProductDialog({
  product,
  restaurant,
  restaurantOpen,
  onClose,
}: {
  product: Product | null;
  restaurant: CartRestaurant;
  restaurantOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(product)} onClose={onClose} size="md">
      {product && (
        <ProductForm key={product.id} product={product} restaurant={restaurant} restaurantOpen={restaurantOpen} onDone={onClose} />
      )}
    </Dialog>
  );
}

function ProductForm({
  product,
  restaurant,
  restaurantOpen,
  onDone,
}: {
  product: Product;
  restaurant: CartRestaurant;
  restaurantOpen: boolean;
  onDone: () => void;
}) {
  const cart = useCart();
  const groups: OptionGroup[] = useMemo(() => (Array.isArray(product.options) ? product.options : []), [product.options]);
  const [selected, setSelected] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(groups.map((g) => [g.name, g.required && g.max === 1 && g.choices[0] ? [g.choices[0].name] : []])),
  );
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [conflict, setConflict] = useState(false);

  const out = isOutOfStock(product);
  const maxQty = Math.min(50, product.stock ?? 50);

  const options: SelectedOption[] = useMemo(
    () =>
      groups.flatMap((g) =>
        (selected[g.name] ?? []).map((choice) => ({
          group: g.name,
          choice,
          price: Number(g.choices.find((c) => c.name === choice)?.price ?? 0),
        })),
      ),
    [groups, selected],
  );
  const unit = Number(product.price) + options.reduce((a, o) => a + o.price, 0);
  const missing = groups.filter((g) => g.required && !(selected[g.name]?.length));

  function toggle(g: OptionGroup, choice: string) {
    setSelected((s) => {
      const current = s[g.name] ?? [];
      if (g.max === 1) return { ...s, [g.name]: current[0] === choice && !g.required ? [] : [choice] };
      if (current.includes(choice)) return { ...s, [g.name]: current.filter((c) => c !== choice) };
      if (current.length >= g.max) {
        toast.message(`Puedes elegir hasta ${g.max} en «${g.name}»`);
        return s;
      }
      return { ...s, [g.name]: [...current, choice] };
    });
  }

  const item = {
    product_id: product.id,
    name: product.name,
    image_url: product.image_url,
    unit_price: Number(product.price),
    options,
    quantity,
    notes: notes.trim() || undefined,
    max_stock: product.stock,
  };

  function add() {
    if (missing.length) {
      toast.error(`Elige una opción de «${missing[0].name}»`);
      return;
    }
    const res = cart.add(restaurant, item);
    if (res === "conflict") {
      setConflict(true);
      return;
    }
    toast.success(`${product.name} agregado al carrito`);
    onDone();
  }

  if (conflict) {
    return (
      <div className="space-y-5 p-6">
        <h2 className="font-display text-xl font-semibold">¿Empezar un carrito nuevo?</h2>
        <p className="text-sm text-muted">
          Tu carrito tiene productos de <strong>{cart.restaurant?.name}</strong>. Cada pedido es de un solo negocio para que llegue
          rápido y caliente.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConflict(false)}>Mantener carrito</Button>
          <Button
            onClick={() => {
              cart.replaceWith(restaurant, item);
              toast.success("Carrito actualizado");
              onDone();
            }}
          >
            Vaciar y agregar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="relative aspect-[16/9] w-full bg-surface-2">
        <SmartImage src={product.image_url} alt={product.name} fill sizes="(max-width: 640px) 100vw, 512px" className="object-cover" />
        <button onClick={onDone} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white" aria-label="Cerrar">
          ×
        </button>
      </div>
      <div className="space-y-5 p-6">
        <div>
          <h2 className="font-display text-2xl font-bold">{product.name}</h2>
          <p className="mt-1 text-sm text-muted">{product.description}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-xl font-bold">{formatPEN(product.price)}</span>
            {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
              <span className="text-sm text-muted line-through">{formatPEN(product.compare_at_price)}</span>
            )}
            {product.stock !== null && product.stock > 0 && product.stock <= 10 && (
              <span className="text-xs font-semibold text-warning">¡Quedan {product.stock}!</span>
            )}
          </div>
        </div>

        {groups.map((g) => (
          <fieldset key={g.name} className="space-y-2">
            <legend className="flex w-full items-center justify-between">
              <span className="font-semibold">{g.name}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", g.required ? "bg-brand/12 text-brand" : "bg-surface-2 text-muted")}>
                {g.required ? "Obligatorio" : `Opcional${g.max > 1 ? ` · hasta ${g.max}` : ""}`}
              </span>
            </legend>
            <div className="space-y-2">
              {g.choices.map((c) => {
                const active = selected[g.name]?.includes(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggle(g, c.name)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition",
                      active ? "border-brand bg-brand/5" : "border-border hover:border-fg/30",
                    )}
                    aria-pressed={active}
                  >
                    <span className="flex items-center gap-3">
                      <span className={cn("grid h-5 w-5 place-items-center border-2", g.max === 1 ? "rounded-full" : "rounded-md", active ? "border-brand bg-brand" : "border-border")}>
                        {active && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                      {c.name}
                    </span>
                    {Number(c.price) > 0 && <span className="text-muted">+{formatPEN(c.price)}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-semibold">Instrucciones especiales</label>
          <Textarea id="notes" value={notes} maxLength={200} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. sin cebolla, salsas aparte…" className="min-h-16" />
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-surface p-4 pb-safe">
        <div className="flex items-center rounded-full border border-border">
          <button className="grid h-11 w-11 place-items-center disabled:opacity-40" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Restar">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center font-semibold" aria-live="polite">{quantity}</span>
          <button className="grid h-11 w-11 place-items-center disabled:opacity-40" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty} aria-label="Sumar">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <Button className="flex-1" size="lg" onClick={add} disabled={out || !restaurantOpen}>
          {out ? "Agotado" : !restaurantOpen ? "Restaurante cerrado" : <>Agregar · {formatPEN(unit * quantity)}</>}
        </Button>
      </div>
    </div>
  );
}
