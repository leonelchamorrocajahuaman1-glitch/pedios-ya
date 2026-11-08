"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/ui/smart-image";
import { EmptyState } from "@/components/ui/empty-state";
import { TableWrap, Td, Th, Tr } from "./table";
import { ImageUpload } from "./image-upload";
import { OptionGroupsEditor } from "./option-groups-editor";
import { deleteProductAction, quickUpdateProductAction, saveProductAction } from "@/lib/actions/admin";
import type { Category, Product, Restaurant } from "@/types";

type Rest = Pick<Restaurant, "id" | "name">;

export function ProductManager({ products, restaurants, categories, defaultRestaurant }: { products: Product[]; restaurants: Rest[]; categories: Category[]; defaultRestaurant?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [pending, start] = useTransition();
  const restName = new Map(restaurants.map((r) => [r.id, r.name]));

  const quick = (id: string, patch: Parameters<typeof quickUpdateProductAction>[1]) =>
    start(async () => {
      const res = await quickUpdateProductAction(id, patch);
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });

  const p = editing && editing !== "new" ? editing : undefined;

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setEditing("new")} disabled={!restaurants.length}><Plus className="h-4 w-4" /> Nuevo producto</Button></div>
      {products.length === 0 ? <EmptyState title="No hay productos" description="Crea el primer producto del catálogo." /> : (
        <TableWrap>
          <thead><tr><Th>Producto</Th><Th>Restaurante</Th><Th>Precio</Th><Th>Stock</Th><Th>Disponible</Th><Th className="text-right">Acciones</Th></tr></thead>
          <tbody>
            {products.map((prod) => (
              <Tr key={prod.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-surface-2"><SmartImage src={prod.image_url} alt="" fill sizes="44px" className="object-cover" /></span>
                    <span>
                      <span className="block font-semibold">{prod.name}</span>
                      <span className="text-xs text-muted">{prod.section}{prod.is_popular && " · Popular"}{prod.options?.length ? ` · ${prod.options.length} grupo(s) de opciones` : ""}</span>
                    </span>
                  </div>
                </Td>
                <Td className="text-muted">{restName.get(prod.restaurant_id)}</Td>
                <Td>
                  <input
                    type="number" step="0.10" min={0} defaultValue={prod.price} aria-label="Precio"
                    className="h-9 w-24 rounded-xl border border-border bg-surface px-2"
                    onBlur={(e) => Number(e.target.value) !== Number(prod.price) && quick(prod.id, { price: Number(e.target.value) })}
                  />
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} defaultValue={prod.stock ?? ""} placeholder="∞" aria-label="Stock"
                      className="h-9 w-20 rounded-xl border border-border bg-surface px-2"
                      onBlur={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        if (v !== prod.stock) quick(prod.id, { stock: v });
                      }}
                    />
                    {prod.stock === 0 && <Badge tone="danger">Agotado</Badge>}
                    {prod.stock !== null && prod.stock > 0 && prod.stock <= 5 && <Badge tone="warning">Bajo</Badge>}
                  </div>
                </Td>
                <Td><Switch checked={prod.is_available} onChange={(v) => quick(prod.id, { is_available: v })} disabled={pending} /></Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(prod)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                    <ConfirmButton size="icon" variant="ghost" title={`¿Eliminar ${prod.name}?`} description="Los pedidos anteriores conservan el nombre y precio." confirmLabel="Eliminar" aria-label="Eliminar" onConfirm={async () => {
                      const res = await deleteProductAction(prod.id);
                      if (!res.ok) toast.error(res.error); else { toast.success(res.message); router.refresh(); }
                    }}><Trash2 className="h-4 w-4 text-danger" /></ConfirmButton>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={p ? "Editar producto" : "Nuevo producto"} size="lg">
        <form
          key={p?.id ?? "new"}
          className="space-y-4 p-6"
          action={(fd) => start(async () => {
            const res = await saveProductAction(fd);
            if (!res.ok) return void toast.error(res.error);
            toast.success(res.message);
            setEditing(null);
            router.refresh();
          })}
        >
          {p && <input type="hidden" name="id" value={p.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Restaurante" htmlFor="prest">
              <Select id="prest" name="restaurant_id" defaultValue={p?.restaurant_id ?? defaultRestaurant ?? ""} required>
                <option value="">Selecciona…</option>
                {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Categoría" htmlFor="pcat">
              <Select id="pcat" name="category_id" defaultValue={p?.category_id ?? ""}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Nombre" htmlFor="pname"><Input id="pname" name="name" defaultValue={p?.name} required maxLength={120} /></Field>
            <Field label="Sección del menú" htmlFor="psec"><Input id="psec" name="section" defaultValue={p?.section ?? "Menú"} required maxLength={60} /></Field>
            <Field label="Descripción" htmlFor="pdesc" className="sm:col-span-2"><Textarea id="pdesc" name="description" defaultValue={p?.description} maxLength={500} /></Field>
            <Field label="Precio (S/)" htmlFor="pprice"><Input id="pprice" name="price" type="number" step="0.10" min={0} defaultValue={p?.price} required /></Field>
            <Field label="Precio anterior (tachado)" htmlFor="pcmp"><Input id="pcmp" name="compare_at_price" type="number" step="0.10" min={0} defaultValue={p?.compare_at_price ?? ""} /></Field>
            <Field label="Stock" htmlFor="pstock" hint="Vacío = sin control de inventario"><Input id="pstock" name="stock" type="number" min={0} defaultValue={p?.stock ?? ""} /></Field>
            <Field label="Orden" htmlFor="pord"><Input id="pord" name="sort_order" type="number" min={0} defaultValue={p?.sort_order ?? 0} /></Field>
          </div>
          <ImageUpload name="image_url" folder="products" label="Fotografía" defaultValue={p?.image_url} />
          <div className="flex flex-wrap gap-6">
            <Checkbox name="is_available" defaultChecked={p?.is_available ?? true} label="Disponible" />
            <Checkbox name="is_popular" defaultChecked={p?.is_popular} label="Marcar como popular" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Opciones adicionales</p>
            <OptionGroupsEditor name="options" initial={p?.options ?? []} />
          </div>
          <div className="flex justify-end"><Button type="submit" loading={pending}>Guardar producto</Button></div>
        </form>
      </Dialog>
    </>
  );
}
