import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, PackageCheck, Scale, ShieldCheck, Truck } from "lucide-react";
import { getProductBySlug, getStoreSettings } from "@/lib/services/store";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductBuyBox } from "@/components/store/product-buy-box";
import { ProductRail } from "@/components/store/product-card";
import { Price, discountOf, oldPriceOf } from "@/components/store/price";
import { Section } from "@/components/store/section";
import { UNITS } from "@/lib/constants";
import { formatPEN } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getProductBySlug((await params).slug);
  if (!data) return { title: "Producto no encontrado" };
  return {
    title: data.product.name,
    description: data.product.description || `${data.product.name} a ${formatPEN(data.product.final_price)}`,
    openGraph: { images: data.product.image_url ? [data.product.image_url] : [] },
  };
}

function presentation(weight: number | null, unit: string) {
  const label = UNITS.find((u) => u.value === unit)?.label ?? unit;
  if (weight == null) return `Presentación: ${label.toLowerCase()}`;
  const short: Record<string, string> = { kg: "kg", g: "g", l: "L", ml: "ml" };
  return short[unit] ? `${Number(weight)} ${short[unit]}` : `${Number(weight)} · ${label.toLowerCase()}`;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [data, settings] = await Promise.all([getProductBySlug(slug), getStoreSettings()]);
  if (!data) notFound();
  const { product: p, related } = data;
  const images = [p.image_url, ...(p.product_images ?? []).sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url)].filter(Boolean) as string[];
  const discount = discountOf(p);
  const out = p.stock <= 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <nav className="mb-5 flex flex-wrap items-center gap-1 text-sm text-muted" aria-label="Ruta">
        <Link href="/" className="hover:text-fg">Inicio</Link>
        <ChevronRight className="h-4 w-4" />
        {p.categories ? <Link href={`/categoria/${p.categories.slug}`} className="hover:text-fg">{p.categories.name}</Link> : <Link href="/productos">Productos</Link>}
        <ChevronRight className="h-4 w-4" />
        <span className="line-clamp-1 text-fg">{p.name}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={images.length ? images : [""]} name={p.name} badge={discount > 0 ? `-${discount}%` : undefined} />
        <div className="space-y-6">
          <div className="space-y-2">
            {p.brand && <p className="text-sm font-semibold uppercase tracking-wide text-accent">{p.brand}</p>}
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{p.name}</h1>
            <Price product={p} size="lg" />
            {discount > 0 && <p className="text-sm font-semibold text-accent">Ahorras {formatPEN((oldPriceOf(p) ?? 0) - Number(p.final_price))}</p>}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className={`rounded-full px-3 py-1.5 font-semibold ${out ? "bg-danger/10 text-danger" : p.stock <= p.min_stock ? "bg-warning/15 text-warning" : "bg-success/10 text-success"}`}>
              {out ? "Agotado" : p.stock <= p.min_stock ? `Últimas ${p.stock} unidades` : "Disponible"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5"><Scale className="h-4 w-4" /> {presentation(p.weight, p.unit)}</span>
            {p.sku && <span className="rounded-full bg-surface-2 px-3 py-1.5 text-muted">SKU {p.sku}</span>}
          </div>
          {p.description && <p className="leading-relaxed text-muted">{p.description}</p>}
          <ProductBuyBox item={{ product_id: p.id, slug: p.slug, name: p.name, image_url: p.image_url, price: Number(p.final_price), stock: p.stock }} />
          <ul className="grid gap-3 rounded-3xl border border-border bg-surface p-5 text-sm sm:grid-cols-3">
            <li className="flex items-center gap-2"><Truck className="h-5 w-5 text-brand" /> {settings?.free_delivery_threshold ? `Delivery gratis desde ${formatPEN(settings.free_delivery_threshold)}` : "Delivery a domicilio"}</li>
            <li className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-brand" /> Recojo en tienda</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand" /> Pago verificado</li>
          </ul>
          {p.image_credit && <p className="text-xs text-muted">{p.image_credit}</p>}
        </div>
      </div>
      {related.length > 0 && (
        <div className="mt-16">
          <Section title="También te puede interesar" href={p.categories ? `/categoria/${p.categories.slug}` : "/productos"}>
            <ProductRail products={related} />
          </Section>
        </div>
      )}
    </div>
  );
}
