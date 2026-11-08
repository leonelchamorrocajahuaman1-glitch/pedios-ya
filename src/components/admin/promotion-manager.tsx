"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableWrap, Td, Th, Tr } from "./table";
import { useRun } from "./use-run";
import { toLimaInput } from "./date-input";
import { deletePromotionAction, savePromotionAction, togglePromotionAction } from "@/lib/actions/admin";
import { formatDate, formatPEN } from "@/lib/format";
import type { Promotion } from "@/types";

type Opt = { id: string; name: string };
const SCOPE_LABEL = { product: "Un producto", category: "Una categoría", order: "Todo el pedido" } as const;

/**
 * Promociones automáticas (sin código): rebajan el precio de un producto o de una categoría,
 * o descuentan el total del pedido al superar un monto. El precio final se calcula en la BD.
 */
export function PromotionManager({ promotions, products, categories, now }: { promotions: Promotion[]; products: Opt[]; categories: Opt[]; now: number }) {
  const { pending, run } = useRun();
  const [editing, setEditing] = useState<Promotion | "new" | null>(null);
  const [scope, setScope] = useState<Promotion["scope"]>("category");
  const [type, setType] = useState<Promotion["discount_type"]>("percentage");
  const [flags, setFlags] = useState({ active: true, home: true });
  const p = editing && editing !== "new" ? editing : undefined;
  const name = (list: Opt[], id: string | null) => list.find((x) => x.id === id)?.name ?? "—";

  const open = (v: Promotion | "new") => {
    setScope(v === "new" ? "category" : v.scope);
    setType(v === "new" ? "percentage" : v.discount_type);
    setFlags({ active: v === "new" ? true : v.is_active, home: v === "new" ? true : v.show_on_home });
    setEditing(v);
  };

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => open("new")}><Plus className="h-4 w-4" /> Nueva promoción</Button></div>
      {promotions.length === 0 ? <EmptyState title="Sin promociones" description="Crea ofertas por producto, por categoría o por monto de compra." /> : (
        <TableWrap>
          <thead><tr><Th>Promoción</Th><Th>Descuento</Th><Th>Aplica a</Th><Th>Vigencia</Th><Th>Usos</Th><Th>Activa</Th><Th className="text-right">Acciones</Th></tr></thead>
          <tbody>
            {promotions.map((k) => {
              const expired = k.ends_at && new Date(k.ends_at).getTime() < now;
              const future = new Date(k.starts_at).getTime() > now;
              return (
                <Tr key={k.id}>
                  <Td>
                    <p className="font-semibold">{k.name}</p>
                    <p className="max-w-64 truncate text-xs text-muted">{k.description}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {k.show_on_home && <Badge tone="info">En el inicio</Badge>}
                      {k.is_demo && <Badge tone="accent">DEMO</Badge>}
                      {expired && <Badge tone="danger">Vencida</Badge>}
                      {future && <Badge tone="warning">Programada</Badge>}
                    </div>
                  </Td>
                  <Td>{k.discount_type === "percentage" ? `${Number(k.discount_value)}%` : formatPEN(k.discount_value)}{k.max_discount && <p className="text-xs text-muted">Tope {formatPEN(k.max_discount)}</p>}</Td>
                  <Td className="text-sm">
                    {SCOPE_LABEL[k.scope]}
                    <p className="text-xs text-muted">
                      {k.scope === "product" ? name(products, k.product_id) : k.scope === "category" ? name(categories, k.category_id) : `Compras desde ${formatPEN(k.min_order_amount)}`}
                    </p>
                  </Td>
                  <Td className="text-xs text-muted">{formatDate(k.starts_at)} → {k.ends_at ? formatDate(k.ends_at) : "sin fin"}</Td>
                  <Td>{k.scope === "order" ? <>{k.usage_count}{k.usage_limit ? ` / ${k.usage_limit}` : ""}</> : <span className="text-xs text-muted">—</span>}</Td>
                  <Td><Switch checked={k.is_active} disabled={pending} onChange={(v) => run(() => togglePromotionAction(k.id, v))} /></Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => open(k)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                      <ConfirmButton size="icon" variant="ghost" aria-label="Eliminar" title={`¿Eliminar «${k.name}»?`} description="Los pedidos anteriores conservan el descuento aplicado." confirmLabel="Eliminar" onConfirm={() => run(() => deletePromotionAction(k.id))}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </ConfirmButton>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={p ? `Editar «${p.name}»` : "Nueva promoción"} size="lg">
        <form key={p?.id ?? "new"} className="space-y-4 p-6" action={(fd) => void run(() => savePromotionAction(fd), () => setEditing(null))}>
          {p && <input type="hidden" name="id" value={p.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="pn" className="sm:col-span-2"><Input id="pn" name="name" defaultValue={p?.name} required maxLength={80} /></Field>
            <Field label="Aplica a" htmlFor="ps">
              <Select id="ps" name="scope" value={scope} onChange={(e) => setScope(e.target.value as Promotion["scope"])}>
                {Object.entries(SCOPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            {scope === "product" && (
              <Field label="Producto" htmlFor="pp">
                <Select id="pp" name="product_id" defaultValue={p?.product_id ?? ""} required>
                  <option value="">Selecciona…</option>
                  {products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
              </Field>
            )}
            {scope === "category" && (
              <Field label="Categoría" htmlFor="pc">
                <Select id="pc" name="category_id" defaultValue={p?.category_id ?? ""} required>
                  <option value="">Selecciona…</option>
                  {categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
              </Field>
            )}
            {scope === "order" && (
              <Field label="Compra mínima (S/)" htmlFor="pmin"><Input id="pmin" name="min_order_amount" type="number" step="0.10" min={0} defaultValue={p?.min_order_amount ?? 50} required /></Field>
            )}
            <Field label="Tipo de descuento" htmlFor="pt">
              <Select id="pt" name="discount_type" value={type} onChange={(e) => setType(e.target.value as Promotion["discount_type"])}>
                <option value="percentage">Porcentaje</option>
                <option value="fixed">Monto fijo</option>
              </Select>
            </Field>
            <Field label={type === "percentage" ? "Porcentaje (máx. 90%)" : "Monto (S/)"} htmlFor="pv"><Input id="pv" name="discount_value" type="number" step="0.01" min={0.01} max={type === "percentage" ? 90 : undefined} defaultValue={p?.discount_value ?? ""} required /></Field>
            <Field label="Descuento máximo (S/)" htmlFor="pmx" hint="Opcional"><Input id="pmx" name="max_discount" type="number" step="0.10" min={0} defaultValue={p?.max_discount ?? ""} /></Field>
            <Field label="Inicio (hora de Lima)" htmlFor="pstart"><Input id="pstart" name="starts_at" type="datetime-local" defaultValue={toLimaInput(p?.starts_at ?? new Date(now).toISOString())} required /></Field>
            <Field label="Fin" htmlFor="pend" hint="Opcional"><Input id="pend" name="ends_at" type="datetime-local" defaultValue={toLimaInput(p?.ends_at)} /></Field>
            {scope === "order" && (
              <Field label="Límite de usos" htmlFor="pl" hint="Vacío = ilimitado"><Input id="pl" name="usage_limit" type="number" min={1} defaultValue={p?.usage_limit ?? ""} /></Field>
            )}
          </div>
          <Field label="Descripción" htmlFor="pd"><Textarea id="pd" name="description" defaultValue={p?.description} maxLength={300} className="min-h-16" /></Field>
          <div className="flex flex-wrap gap-6">
            <Switch name="is_active" checked={flags.active} onChange={(v) => setFlags({ ...flags, active: v })} label="Activa" />
            <Switch name="show_on_home" checked={flags.home} onChange={(v) => setFlags({ ...flags, home: v })} label="Mostrar en el inicio" />
          </div>
          <div className="flex justify-end"><Button type="submit" loading={pending}>Guardar promoción</Button></div>
        </form>
      </Dialog>
    </>
  );
}
