import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, Eye } from "lucide-react";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { PageHeader } from "@/components/ui/page-header";
import { buttonStyles } from "@/components/ui/button";
import type { Category, Product } from "@/types";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: cats }, { data: cost }] = await Promise.all([
    supabase.from("products").select("*, final_price, discount_percent, product_images(*)").eq("id", id).eq("catalog", "store").maybeSingle(),
    supabase.from("categories").select("id, name, parent_id").eq("catalog", "store").order("sort_order").order("name"),
    supabase.from("product_costs").select("cost_price").eq("product_id", id).maybeSingle(),
  ]);
  if (!data) notFound();
  const p = { ...(data as Product), cost_price: cost?.cost_price ?? null };
  return (
    <div>
      <Link href="/admin/productos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Productos</Link>
      <PageHeader
        title={p.name}
        description={[p.brand, p.sku].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <Link href={`/admin/inventario?producto=${p.id}`} className={buttonStyles({ variant: "outline", size: "sm" })}><Boxes className="h-4 w-4" /> Movimientos</Link>
            <Link href={`/producto/${p.slug}`} target="_blank" className={buttonStyles({ variant: "outline", size: "sm" })}><Eye className="h-4 w-4" /> Ver en tienda</Link>
            <ProductRowActions product={p} afterDelete="/admin/productos" />
          </>
        }
      />
      <ProductForm product={p} categories={(cats ?? []) as Pick<Category, "id" | "name" | "parent_id">[]} />
    </div>
  );
}
