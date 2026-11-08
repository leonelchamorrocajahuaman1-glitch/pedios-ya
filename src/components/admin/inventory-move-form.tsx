"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { inventoryMoveAction } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";
import { useRun } from "./use-run";

type P = { id: string; name: string; sku: string | null; stock: number; min_stock: number };
const TYPES = [
  { value: "in", label: "Entrada", hint: "Compra o reposición de mercadería" },
  { value: "out", label: "Salida", hint: "Merma, vencimiento, consumo interno…" },
  { value: "adjustment", label: "Ajuste", hint: "Fija el stock exacto tras un conteo" },
] as const;

/** Registra entradas, salidas y ajustes. La BD bloquea la fila y valida que el stock no quede negativo. */
export function InventoryMoveForm({ products, defaultProduct }: { products: P[]; defaultProduct?: string }) {
  const { pending, run } = useRun();
  const [filter, setFilter] = useState("");
  const [productId, setProductId] = useState(defaultProduct ?? "");
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("in");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const list = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? products.filter((p) => p.name.toLowerCase().includes(f) || p.sku?.toLowerCase().includes(f)) : products;
  }, [products, filter]);
  const selected = products.find((p) => p.id === productId);
  const q = Number(qty);
  const preview = selected && qty !== "" && Number.isInteger(q) ? (type === "in" ? selected.stock + q : type === "out" ? selected.stock - q : q) : null;

  return (
    <form
      className="space-y-4"
      action={(fd) => void run(() => inventoryMoveAction(fd), () => { setQty(""); setReason(""); })}
    >
      <Field label="Buscar producto" htmlFor="invq"><Input id="invq" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Nombre o SKU" className="h-10" /></Field>
      <Field label="Producto" htmlFor="invp">
        <Select id="invp" name="product_id" required value={productId} onChange={(e) => setProductId(e.target.value)} className="h-10">
          <option value="">Selecciona… ({list.length})</option>
          {list.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` · ${p.sku}` : ""} — stock {p.stock}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de movimiento">
        {TYPES.map((t) => (
          <button key={t.value} type="button" role="radio" aria-checked={type === t.value} onClick={() => setType(t.value)}
            className={cn("rounded-2xl border px-3 py-2 text-sm font-semibold transition", type === t.value ? "border-brand bg-brand/10 text-brand" : "border-border hover:bg-surface-2")}>
            {t.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />
      <p className="text-xs text-muted">{TYPES.find((t) => t.value === type)!.hint}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={type === "adjustment" ? "Stock real contado" : "Cantidad"} htmlFor="invc">
          <Input id="invc" name="quantity" type="number" min={type === "adjustment" ? 0 : 1} step={1} required value={qty} onChange={(e) => setQty(e.target.value)} className="h-10" />
        </Field>
        <div className="rounded-2xl bg-surface-2 p-3 text-sm">
          <p className="text-xs text-muted">Stock actual → nuevo</p>
          <p className="font-display text-lg font-bold">
            {selected ? selected.stock : "—"} → <span className={preview != null && preview < 0 ? "text-danger" : ""}>{preview ?? "—"}</span>
          </p>
        </div>
      </div>
      <Field label={type === "in" ? "Motivo (opcional)" : "Motivo"} htmlFor="invr" hint="Queda guardado en el historial con tu usuario y la fecha">
        <Input id="invr" name="reason" maxLength={200} required={type !== "in"} minLength={type !== "in" ? 3 : undefined} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={type === "in" ? "Factura 001-2345" : "Producto vencido"} className="h-10" />
      </Field>
      <Button type="submit" loading={pending} disabled={preview != null && preview < 0}>Registrar movimiento</Button>
    </form>
  );
}
