"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveRestaurantAction, deleteRestaurantAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "./image-upload";
import { DAYS, RESTAURANT_STATUS_LABEL } from "@/lib/constants";
import { slugify } from "@/lib/utils";
import type { Category, Restaurant } from "@/types";

export function RestaurantForm({ restaurant: r, categories, selectedCategories, defaultCommission }: { restaurant?: Restaurant; categories: Category[]; selectedCategories: string[]; defaultCommission: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-6"
      action={(fd) =>
        start(async () => {
          if (!fd.get("slug")) fd.set("slug", slugify(String(fd.get("name") ?? "")));
          const res = await saveRestaurantAction(fd);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          if (!r) router.replace(`/admin/restaurantes/${res.data!.id}`);
          else router.refresh();
        })
      }
    >
      {r && <input type="hidden" name="id" value={r.id} />}
      <Card>
        <CardHeader><CardTitle>Información</CardTitle></CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre" htmlFor="name"><Input id="name" name="name" defaultValue={r?.name} required maxLength={100} /></Field>
          <Field label="Slug (URL)" htmlFor="slug" hint="Se genera del nombre si lo dejas vacío"><Input id="slug" name="slug" defaultValue={r?.slug} pattern="[a-z0-9-]{2,80}" /></Field>
          <Field label="Descripción" htmlFor="description" className="md:col-span-2"><Textarea id="description" name="description" defaultValue={r?.description} maxLength={600} /></Field>
          <ImageUpload name="logo_url" folder="restaurants" label="Logo" defaultValue={r?.logo_url} />
          <ImageUpload name="cover_url" folder="restaurants" label="Fotografía de portada" defaultValue={r?.cover_url} />
          <Field label="Teléfono" htmlFor="phone"><Input id="phone" name="phone" defaultValue={r?.phone ?? ""} maxLength={20} /></Field>
          <Field label="Correo" htmlFor="email"><Input id="email" name="email" type="email" defaultValue={r?.email ?? ""} /></Field>
          <Field label="Dirección" htmlFor="address"><Input id="address" name="address" defaultValue={r?.address} required maxLength={200} /></Field>
          <Field label="Distrito" htmlFor="district"><Input id="district" name="district" defaultValue={r?.district} maxLength={80} /></Field>
          <Field label="Latitud" htmlFor="lat" hint="Necesaria para calcular envío por distancia"><Input id="lat" name="lat" type="number" step="any" defaultValue={r?.lat ?? ""} /></Field>
          <Field label="Longitud" htmlFor="lng"><Input id="lng" name="lng" type="number" step="any" defaultValue={r?.lng ?? ""} /></Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Operación y comisiones</CardTitle></CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-3">
          <Field label="Entrega mín. (min)" htmlFor="dtmin"><Input id="dtmin" name="delivery_time_min" type="number" min={5} defaultValue={r?.delivery_time_min ?? 25} required /></Field>
          <Field label="Entrega máx. (min)" htmlFor="dtmax"><Input id="dtmax" name="delivery_time_max" type="number" min={5} defaultValue={r?.delivery_time_max ?? 40} required /></Field>
          <Field label="Costo de envío base (S/)" htmlFor="fee"><Input id="fee" name="delivery_fee" type="number" step="0.10" min={0} defaultValue={r?.delivery_fee ?? 4.9} required /></Field>
          <Field label="Pedido mínimo (S/)" htmlFor="min"><Input id="min" name="min_order_amount" type="number" step="0.10" min={0} defaultValue={r?.min_order_amount ?? 0} required /></Field>
          <Field label="Comisión (%)" htmlFor="commission"><Input id="commission" name="commission_rate" type="number" step="0.5" min={0} max={50} defaultValue={((r?.commission_rate ?? defaultCommission) * 100).toFixed(1)} required /></Field>
          <Field label="Estado" htmlFor="status">
            <Select id="status" name="status" defaultValue={r?.status ?? "approved"}>
              {Object.entries(RESTAURANT_STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Abre" htmlFor="opens"><Input id="opens" name="opens_at" type="time" defaultValue={r?.opens_at?.slice(0, 5) ?? "10:00"} required /></Field>
          <Field label="Cierra" htmlFor="closes" hint="Igual a la apertura = 24 h"><Input id="closes" name="closes_at" type="time" defaultValue={r?.closes_at?.slice(0, 5) ?? "23:00"} required /></Field>
          <div className="space-y-2">
            <span className="text-sm font-medium">Días de atención</span>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => (
                <label key={d} className="cursor-pointer">
                  <input type="checkbox" name="open_days" value={i} defaultChecked={r ? r.open_days.includes(i) : true} className="peer sr-only" />
                  <span className="inline-block rounded-full border border-border px-2.5 py-1 text-xs peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:text-brand">{d}</span>
                </label>
              ))}
            </div>
          </div>
          <Checkbox name="is_accepting_orders" defaultChecked={r?.is_accepting_orders ?? true} label="Recibiendo pedidos" />
          <Checkbox name="is_featured" defaultChecked={r?.is_featured} label="Destacado en portada" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Categorías</CardTitle></CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <label key={c.id} className="cursor-pointer">
              <input type="checkbox" name="category_ids" value={c.id} defaultChecked={selectedCategories.includes(c.id)} className="peer sr-only" />
              <span className="inline-block rounded-full border border-border px-3 py-1.5 text-sm peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:text-brand">{c.name}</span>
            </label>
          ))}
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-between gap-3">
        {r ? (
          <ConfirmButton
            variant="outline"
            className="text-danger"
            title="¿Eliminar restaurante?"
            description="Solo es posible si no tiene pedidos. Si los tiene, cámbialo a «Suspendido»."
            confirmLabel="Eliminar"
            onConfirm={async () => {
              const res = await deleteRestaurantAction(r.id);
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              router.replace("/admin/restaurantes");
            }}
          >
            Eliminar
          </ConfirmButton>
        ) : <span />}
        <Button type="submit" size="lg" loading={pending}>Guardar restaurante</Button>
      </div>
    </form>
  );
}
