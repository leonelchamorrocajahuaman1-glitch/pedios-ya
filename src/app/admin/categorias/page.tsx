import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CategoryManager } from "@/components/admin/category-manager";
import { PageHeader } from "@/components/ui/page-header";
import type { Category } from "@/types";

export const metadata: Metadata = { title: "Categorías" };

export default async function AdminCategoriesPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: links }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("restaurant_categories").select("category_id"),
  ]);
  const counts: Record<string, number> = {};
  for (const l of links ?? []) counts[l.category_id] = (counts[l.category_id] ?? 0) + 1;
  return (
    <div>
      <PageHeader title="Categorías" description="Organiza el catálogo que ven los clientes." />
      <CategoryManager categories={(data ?? []) as Category[]} counts={counts} />
    </div>
  );
}
