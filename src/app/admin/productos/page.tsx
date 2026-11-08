import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProductManager } from "@/components/admin/product-manager";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { sanitizeQuery } from "@/lib/services/catalog";
import type { Category, Product, Restaurant } from "@/types";

export const metadata: Metadata = { title: "Productos" };

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; restaurante?: string; stock?: string }> }) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("products").select("*").order("restaurant_id").order("sort_order").limit(500);
  if (sp.restaurante && /^[0-9a-f-]{36}$/.test(sp.restaurante)) query = query.eq("restaurant_id", sp.restaurante);
  if (sp.stock === "agotado") query = query.or("stock.eq.0,is_available.eq.false");
  if (sp.stock === "bajo") query = query.lte("stock", 5);
  const q = sp.q ? sanitizeQuery(sp.q) : "";
  if (q) query = query.ilike("name", `%${q}%`);
  const [{ data: products }, { data: restaurants }, { data: categories }] = await Promise.all([
    query,
    supabase.from("restaurants").select("id, name").order("name"),
    supabase.from("categories").select("*").order("sort_order"),
  ]);
  const rests = (restaurants ?? []) as Pick<Restaurant, "id" | "name">[];
  return (
    <div>
      <PageHeader title="Productos e inventario" description="Precios, fotos, stock y disponibilidad. Los cambios en precio y stock se guardan al salir del campo." />
      <FilterBar
        searchPlaceholder="Nombre del producto"
        selects={[
          { name: "restaurante", label: "Restaurante", options: rests.map((r) => ({ value: r.id, label: r.name })) },
          { name: "stock", label: "Inventario", options: [{ value: "bajo", label: "Stock bajo (≤5)" }, { value: "agotado", label: "Agotados / no disponibles" }] },
        ]}
      />
      <ProductManager products={(products ?? []) as Product[]} restaurants={rests} categories={(categories ?? []) as Category[]} defaultRestaurant={sp.restaurante} />
    </div>
  );
}
