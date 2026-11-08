import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CategoryManager } from "@/components/admin/category-manager";
import { PageHeader } from "@/components/ui/page-header";
import type { Category } from "@/types";

export const metadata: Metadata = { title: "Categorías" };

export default async function AdminCategoriesPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").eq("catalog", "store").order("sort_order").order("name"),
    supabase.from("products").select("category_id, subcategory_id").eq("catalog", "store").limit(5000),
  ]);
  const counts: Record<string, number> = {};
  for (const p of products ?? []) {
    if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
    if (p.subcategory_id) counts[p.subcategory_id] = (counts[p.subcategory_id] ?? 0) + 1;
  }
  return (
    <div>
      <PageHeader title="Categorías" description="Categorías y subcategorías del catálogo: imagen, orden y visibilidad." />
      <CategoryManager categories={(data ?? []) as Category[]} counts={counts} />
    </div>
  );
}
