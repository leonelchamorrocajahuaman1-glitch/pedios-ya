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
import { EmptyState } from "@/components/ui/empty-state";
import { TableWrap, Td, Th, Tr } from "./table";
import { deleteCouponAction, saveCouponAction, toggleCouponAction } from "@/lib/actions/admin";
import { DISCOUNT_TYPE_LABEL } from "@/lib/constants";
import { formatDate, formatPEN } from "@/lib/format";
import type { Coupon, DiscountType, Restaurant } from "@/types";

/** Fecha ISO -> valor para <input type="datetime-local"> en hora de Lima */
function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

export function CouponManager({ coupons, restaurants, now }: { coupons: Coupon[]; restaurants: Pick<Restaurant, "id" | "name">[]; now: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [type, setType] = useState<DiscountType>("percentage");
  const [pending, start] = useTransition();
  const c = editing && editing !== "new" ? editing : undefined;

  const open = (v: Coupon | "new") => {
    setType(v === "new" ? "percentage" : v.discount_type);
    setEditing(v);
  };

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => open("new")}><Plus className="h-4 w-4" /> Crear cupón</Button></div>
      {coupons.length === 0 ? <EmptyState title="Sin cupones" description="Crea descuentos porcentuales, montos fijos o envíos gratis." /> : (
        <TableWrap>
          <thead><tr><Th>Código</Th><Th>Descuento</Th><Th>Condiciones</Th><Th>Vigencia</Th><Th>Usos</Th><Th>Activo</Th><Th className="text-right">Acciones</Th></tr></thead>
          <tbody>
            {coupons.map((k) => {
              const expired = k.expires_at && new Date(k.expires_at).getTime() < now;
              return (
                <Tr key={k.id}>
                  <Td><p className="font-mono font-bold">{k.code}</p><p className="text-xs text-muted">{k.description}</p>
                    <div className="mt-1 flex gap-1">{k.is_public && <Badge tone="info">Público</Badge>}{k.is_demo && <Badge tone="accent">Demo</Badge>}{expired && <Badge tone="danger">Vencido</Badge>}</div></Td>
                  <Td>{k.discount_type === "percentage" ? `${Number(k.discount_value)}%` : k.discount_type === "fixed" ? formatPEN(k.discount_value) : "Envío gratis"}{k.max_discount && <p className="text-xs text-muted">Tope {formatPEN(k.max_discount)}</p>}</Td>
                  <Td className="text-xs text-muted">Mín. {formatPEN(k.min_order_amount)}<br />{k.per_user_limit} por cliente{k.restaurant_id && <><br />{restaurants.find((r) => r.id === k.restaurant_id)?.name}</>}</Td>
                  <Td className="text-xs text-muted">{formatDate(k.starts_at)} → {k.expires_at ? formatDate(k.expires_at) : "sin fin"}</Td>
                  <Td>{k.usage_count}{k.usage_limit ? ` / ${k.usage_limit}` : ""}</Td>
                  <Td><Switch checked={k.is_active} onChange={(v) => start(async () => { const r = await toggleCouponAction(k.id, v); if (!r.ok) toast.error(r.error); router.refresh(); })} /></Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => open(k)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                      <ConfirmButton size="icon" variant="ghost" aria-label="Eliminar" title={`¿Eliminar ${k.code}?`} confirmLabel="Eliminar" onConfirm={async () => {
                        const r = await deleteCouponAction(k.id);
                        if (!r.ok) toast.error(r.error); else { toast.success(r.message); router.refresh(); }
                      }}><Trash2 className="h-4 w-4 text-danger" /></ConfirmButton>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={c ? `Editar ${c.code}` : "Nuevo cupón"} size="lg">
        <form key={c?.id ?? "new"} className="space-y-4 p-6" action={(fd) => start(async () => {
          const res = await saveCouponAction(fd);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          setEditing(null);
          router.refresh();
        })}>
          {c && <input type="hidden" name="id" value={c.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Código" htmlFor="kc"><Input id="kc" name="code" defaultValue={c?.code} required className="font-mono uppercase" maxLength={30} /></Field>
            <Field label="Tipo de descuento" htmlFor="kt">
              <Select id="kt" name="discount_type" value={type} onChange={(e) => setType(e.target.value as DiscountType)}>
                {Object.entries(DISCOUNT_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            {type !== "free_delivery" ? (
              <Field label={type === "percentage" ? "Porcentaje (%)" : "Monto (S/)"} htmlFor="kv"><Input id="kv" name="discount_value" type="number" step="0.01" min={0} defaultValue={c?.discount_value ?? ""} required /></Field>
            ) : <input type="hidden" name="discount_value" value="0" />}
            <Field label="Descuento máximo (S/)" htmlFor="km" hint="Opcional"><Input id="km" name="max_discount" type="number" step="0.10" min={0} defaultValue={c?.max_discount ?? ""} /></Field>
            <Field label="Pedido mínimo (S/)" htmlFor="kmin"><Input id="kmin" name="min_order_amount" type="number" step="0.10" min={0} defaultValue={c?.min_order_amount ?? 0} required /></Field>
            <Field label="Restaurante" htmlFor="kr">
              <Select id="kr" name="restaurant_id" defaultValue={c?.restaurant_id ?? ""}>
                <option value="">Todos</option>
                {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Inicio (hora de Lima)" htmlFor="ks"><Input id="ks" name="starts_at" type="datetime-local" defaultValue={toLocalInput(c?.starts_at ?? new Date(now).toISOString())} required /></Field>
            <Field label="Vencimiento" htmlFor="ke" hint="Opcional"><Input id="ke" name="expires_at" type="datetime-local" defaultValue={toLocalInput(c?.expires_at)} /></Field>
            <Field label="Límite total de usos" htmlFor="kl" hint="Vacío = ilimitado"><Input id="kl" name="usage_limit" type="number" min={1} defaultValue={c?.usage_limit ?? ""} /></Field>
            <Field label="Usos por cliente" htmlFor="kpu"><Input id="kpu" name="per_user_limit" type="number" min={1} defaultValue={c?.per_user_limit ?? 1} required /></Field>
          </div>
          <Field label="Descripción" htmlFor="kd"><Textarea id="kd" name="description" defaultValue={c?.description} maxLength={200} className="min-h-16" /></Field>
          <div className="flex flex-wrap gap-6">
            <Checkbox name="is_active" defaultChecked={c?.is_active ?? true} label="Activo" />
            <Checkbox name="is_public" defaultChecked={c?.is_public ?? false} label="Mostrar en promociones" />
          </div>
          <div className="flex justify-end"><Button type="submit" loading={pending}>Guardar cupón</Button></div>
        </form>
      </Dialog>
    </>
  );
}
