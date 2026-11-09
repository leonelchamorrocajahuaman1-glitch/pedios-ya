"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/ui/smart-image";
import { ImageUpload } from "./image-upload";
import { GalleryUpload } from "./gallery-upload";
import { saveProductAction } from "@/lib/actions/admin";
import { UNITS } from "@/lib/constants";
import { formatDateTime, formatPEN } from "@/lib/format";
import { slugify } from "@/lib/utils";
import type { Category, Product } from "@/types";

type Cat = Pick<Category, "id" | "name" | "parent_id">;

export function ProductForm({ product: p, categories, defaultMinStock = 5 }: { product?: Product; categories: Cat[]; defaultMinStock?: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(p?.name ?? "");
  const [slug, setSlug] = useState(p?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(p));
  const [categoryId, setCategoryId] = useState(p?.category_id ?? "");
  const [price, setPrice] = useState(p ? String(p.price) : "");
  const [compare, setCompare] = useState(p?.compare_at_price != null ? String(p.compare_at_price) : "");
  const [cost, setCost] = useState(p?.cost_price != null ? String(p.cost_price) : "");
  const [image, setImage] = useState(p?.image_url ?? "");
  const [gallery, setGallery] = useState<string[]>((p?.product_images ?? []).slice().sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url));
  const [available, setAvailable] = useState(p?.is_available ?? true);
  const [featured, setFeatured] = useState(p?.is_featured ?? false);
  const [brand, setBrand] = useState(p?.brand ?? "");

  const parents = categories.filter((c) => !c.parent_id);
  const subs = useMemo(() => categories.filter((c) => c.parent_id === categoryId), [categories, categoryId]);
  const priceN = Number(price) || 0;
  const compareN = Number(compare) || 0;
  const costN = Number(cost) || 0;
  const discount = compareN > priceN && priceN > 0 ? Math.round(((compareN - priceN) / compareN) * 100) : 0;
  const margin = priceN > 0 && costN > 0 ? ((priceN - costN) / priceN) * 100 : null;

  async function onSubmit(fd: FormData) {
    setPending(true);
    const res = await saveProductAction(fd);
    setPending(false);
    if (!res.ok) return void toast.error(res.error);
    toast.success(res.message);
    if (!p) router.replace(`/admin/productos/${res.data!.id}`);
    else router.refresh();
  }

  return (
    <form action={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Información general</CardTitle></CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre" htmlFor="pn" className="md:col-span-2">
              <Input id="pn" name="name" required maxLength={120} value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
            </Field>
            <Field label="Descripción" htmlFor="pd" className="md:col-span-2"><Textarea id="pd" name="description" maxLength={500} defaultValue={p?.description ?? ""} /></Field>
            <Field label="Categoría" htmlFor="pc">
              <Select id="pc" name="category_id" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Selecciona…</option>
                {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Subcategoría" htmlFor="ps" hint={subs.length ? undefined : "Esta categoría no tiene subcategorías"}>
              <Select id="ps" name="subcategory_id" defaultValue={p?.subcategory_id ?? ""} disabled={!subs.length} key={categoryId}>
                <option value="">Ninguna</option>
                {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Marca" htmlFor="pb"><Input id="pb" name="brand" maxLength={80} value={brand} onChange={(e) => setBrand(e.target.value)} /></Field>
            <Field label="Slug (URL)" htmlFor="pu" hint="Se genera a partir del nombre">
              <Input id="pu" name="slug" maxLength={90} value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()); }} pattern="[a-z0-9-]{2,90}" />
            </Field>
            <Field label="SKU" htmlFor="pk"><Input id="pk" name="sku" maxLength={40} defaultValue={p?.sku ?? ""} placeholder="HY-0100" /></Field>
            <Field label="Código de barras" htmlFor="pbc"><Input id="pbc" name="barcode" inputMode="numeric" maxLength={14} defaultValue={p?.barcode ?? ""} /></Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Precios</CardTitle></CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-3">
            <Field label="Precio de compra (S/)" htmlFor="pcp" hint="Solo visible para el admin"><Input id="pcp" name="cost_price" type="number" step="0.01" min={0} value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
            <Field label="Precio de venta (S/)" htmlFor="pp"><Input id="pp" name="price" type="number" step="0.01" min={0.1} required value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
            <Field label="Precio anterior (S/)" htmlFor="pa" hint="Opcional: se muestra tachado como oferta"><Input id="pa" name="compare_at_price" type="number" step="0.01" min={0} value={compare} onChange={(e) => setCompare(e.target.value)} /></Field>
            <p className="text-sm text-muted md:col-span-3">
              {margin != null ? <>Margen: <strong className={margin < 0 ? "text-danger" : "text-fg"}>{margin.toFixed(1)}%</strong> ({formatPEN(priceN - costN)} por unidad)</> : "Ingresa el precio de compra para calcular el margen."}
              {discount > 0 && <> · Descuento mostrado: <strong className="text-accent">-{discount}%</strong></>}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Inventario y presentación</CardTitle></CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-4">
            {p ? (
              <Field label="Stock actual" htmlFor="pst" hint="Se modifica desde Inventario">
                <Input id="pst" value={p.stock} disabled />
              </Field>
            ) : (
              <Field label="Stock inicial" htmlFor="pst"><Input id="pst" name="stock" type="number" min={0} step={1} defaultValue={0} required /></Field>
            )}
            <Field label="Stock mínimo" htmlFor="pms" hint="Alerta de stock bajo"><Input id="pms" name="min_stock" type="number" min={0} step={1} defaultValue={p?.min_stock ?? defaultMinStock} /></Field>
            <Field label="Peso / contenido" htmlFor="pw"><Input id="pw" name="weight" type="number" step="0.001" min={0} defaultValue={p?.weight ?? ""} /></Field>
            <Field label="Unidad" htmlFor="pun">
              <Select id="pun" name="unit" defaultValue={p?.unit ?? "unidad"}>{UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</Select>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Fotos</CardTitle></CardHeader>
          <CardBody className="space-y-6">
            <ImageUpload name="image_url" folder="products" label="Imagen principal" defaultValue={p?.image_url} onChange={setImage} />
            <GalleryUpload name="gallery" value={gallery} onChange={setGallery} />
          </CardBody>
        </Card>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader><CardTitle>Publicación</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <Switch name="is_available" checked={available} onChange={setAvailable} label={available ? "Activo (visible en la tienda)" : "Desactivado (oculto)"} />
            <Switch name="is_featured" checked={featured} onChange={setFeatured} label="Destacado en el inicio" />
            {p && (
              <dl className="space-y-1 border-t border-border pt-3 text-xs text-muted">
                <div className="flex justify-between gap-2"><dt>ID</dt><dd className="truncate font-mono">{p.id}</dd></div>
                <div className="flex justify-between gap-2"><dt>Creado</dt><dd>{formatDateTime(p.created_at)}</dd></div>
                {p.is_demo && <div className="flex justify-between gap-2"><dt>Origen</dt><dd><Badge tone="info">DEMO</Badge></dd></div>}
              </dl>
            )}
            <Button type="submit" className="w-full" loading={pending}>{p ? "Guardar cambios" : "Crear producto"}</Button>
          </CardBody>
        </Card>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Vista previa en la tienda</p>
          <article className="overflow-hidden rounded-3xl border border-border bg-surface">
            <div className="relative aspect-square bg-surface-2">
              <SmartImage src={image || gallery[0] || null} alt={name || "Producto"} fill sizes="340px" className="object-cover" />
              {discount > 0 && <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">-{discount}%</span>}
              {!available && <span className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-semibold text-white">Oculto en la tienda</span>}
            </div>
            <div className="space-y-1 p-4">
              {brand && <p className="text-xs font-semibold uppercase tracking-wide text-muted">{brand}</p>}
              <p className="line-clamp-2 font-semibold">{name || "Nombre del producto"}</p>
              <p className="flex items-baseline gap-2">
                <span className="font-display text-xl font-bold text-brand">{formatPEN(priceN)}</span>
                {discount > 0 && <span className="text-sm text-muted line-through">{formatPEN(compareN)}</span>}
              </p>
            </div>
          </article>
          <p className="mt-2 text-xs text-muted">Las promociones activas pueden bajar el precio final que ve el cliente.</p>
        </div>
      </aside>
    </form>
  );
}
