import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/ui/page-header";
import type { Category } from "@/types";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: cats }, { data: settings }] = await Promise.all([
    supabase.from("categories").select("id, name, parent_id").eq("catalog", "store").order("sort_order").order("name"),
    supabase.from("store_settings").select("low_stock_default").eq("id", 1).maybeSingle(),
  ]);
  return (
    <div>
      <Link href="/admin/productos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Productos</Link>
      <PageHeader title="Nuevo producto" description="Completa los datos y sube las fotos desde tu equipo o celular." />
      <ProductForm categories={(cats ?? []) as Pick<Category, "id" | "name" | "parent_id">[]} defaultMinStock={settings?.low_stock_default ?? 5} />
    </div>
  );
}
