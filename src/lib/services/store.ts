import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Category, Coupon, PaymentMethodConfig, Product, Promotion, StoreSettings } from "@/types";

/** Columnas del producto para la tienda (incluye precio final con promociones). */
export const PRODUCT_CARD_FIELDS =
  "id, slug, name, brand, image_url, price, compare_at_price, final_price, discount_percent, stock, min_stock, unit, weight, is_featured, is_available, created_at, category_id, subcategory_id";

export function sanitizeQuery(q: string) {
  return q
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export const getStoreSettings = cache(async (): Promise<StoreSettings | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle();
  return data as StoreSettings | null;
});

export async function getPaymentMethods(): Promise<PaymentMethodConfig[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("payment_methods").select("*").eq("is_enabled", true).neq("code", "card").order("sort_order");
  return (data ?? []) as PaymentMethodConfig[];
}

/** Árbol de categorías activas (padres con sus subcategorías). */
export const getCategoryTree = cache(async (): Promise<Category[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, icon, image_url, description, sort_order, is_active, parent_id")
    .eq("catalog", "store")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  const all = (data ?? []) as Category[];
  const parents = all.filter((c) => !c.parent_id);
  return parents.map((p) => ({ ...p, children: all.filter((c) => c.parent_id === p.id) }));
});

export type ProductSort = "relevancia" | "precio-asc" | "precio-desc" | "nuevos" | "nombre" | "stock";

export interface ProductFilters {
  q?: string;
  categoryIds?: string[];
  subcategoryId?: string;
  offers?: boolean;
  featured?: boolean;
  inStock?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

export async function listProducts(f: ProductFilters = {}): Promise<{ products: Product[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const pageSize = f.pageSize ?? 24;
  const page = Math.max(1, f.page ?? 1);
  let query = supabase.from("products").select(PRODUCT_CARD_FIELDS, { count: "exact" }).eq("catalog", "store").eq("is_available", true);

  if (f.categoryIds?.length) query = query.in("category_id", f.categoryIds);
  if (f.subcategoryId) query = query.eq("subcategory_id", f.subcategoryId);
  if (f.featured) query = query.eq("is_featured", true);
  if (f.inStock) query = query.gt("stock", 0);
  const q = f.q ? sanitizeQuery(f.q) : "";
  if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,description.ilike.%${q}%,sku.ilike.%${q}%`);

  switch (f.sort) {
    case "precio-asc":
      query = query.order("final_price", { ascending: true });
      break;
    case "precio-desc":
      query = query.order("final_price", { ascending: false });
      break;
    case "nuevos":
      query = query.order("created_at", { ascending: false });
      break;
    case "nombre":
      query = query.order("name");
      break;
    case "stock":
      query = query.order("stock", { ascending: false });
      break;
    default:
      query = query.order("is_featured", { ascending: false }).order("sort_order");
  }

  // Las ofertas dependen de promociones vigentes (precio calculado): se filtran tras la consulta
  if (f.offers) {
    const { data, error } = await query.limit(500);
    if (error) throw error;
    const offers = ((data ?? []) as unknown as Product[]).filter(isOnSale);
    return { products: offers.slice((page - 1) * pageSize, page * pageSize), total: offers.length };
  }
  const { data, count, error } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  return { products: (data ?? []) as unknown as Product[], total: count ?? 0 };
}

export function isOnSale(p: Pick<Product, "discount_percent" | "compare_at_price" | "price">) {
  return p.discount_percent > 0 || (p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price));
}

export async function getProductBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select(`${PRODUCT_CARD_FIELDS}, description, sku, barcode, image_credit, product_images(id, url, alt, sort_order), categories!products_category_id_fkey(id, slug, name)`)
    .eq("catalog", "store")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const product = data as unknown as Product;
  const { data: related } = await supabase
    .from("products")
    .select(PRODUCT_CARD_FIELDS)
    .eq("catalog", "store")
    .eq("is_available", true)
    .eq("category_id", product.category_id ?? "")
    .neq("id", product.id)
    .gt("stock", 0)
    .limit(8);
  return { product, related: (related ?? []) as unknown as Product[] };
}

export async function getHomeData() {
  const supabase = await createSupabaseServerClient();
  const [featured, newest, offersRes, bestRes, promos, coupons] = await Promise.all([
    supabase.from("products").select(PRODUCT_CARD_FIELDS).eq("catalog", "store").eq("is_available", true).eq("is_featured", true).gt("stock", 0).order("sort_order").limit(10),
    supabase.from("products").select(PRODUCT_CARD_FIELDS).eq("catalog", "store").eq("is_available", true).gt("stock", 0).order("created_at", { ascending: false }).limit(10),
    supabase.from("products").select(PRODUCT_CARD_FIELDS).eq("catalog", "store").eq("is_available", true).gt("stock", 0).limit(300),
    supabase.rpc("store_best_sellers", { p_limit: 10 }),
    supabase.from("promotions").select("*").eq("show_on_home", true).order("created_at", { ascending: false }).limit(6),
    supabase.from("coupons").select("*").eq("catalog", "store").eq("is_public", true).limit(4),
  ]);
  const all = (offersRes.data ?? []) as unknown as Product[];
  const offers = all.filter(isOnSale).sort((a, b) => b.discount_percent - a.discount_percent).slice(0, 10);
  const bestIds = ((bestRes.data ?? []) as { product_id: string }[]).map((b) => b.product_id);
  let bestSellers = bestIds.map((id) => all.find((p) => p.id === id)).filter(Boolean) as Product[];
  const bestFromSales = bestSellers.length > 0;
  if (bestSellers.length < 4) {
    // Sin ventas suficientes todavía: se muestran los destacados (y se indica en la UI)
    bestSellers = [...bestSellers, ...((featured.data ?? []) as unknown as Product[]).filter((p) => !bestIds.includes(p.id))].slice(0, 10);
  }
  return {
    featured: (featured.data ?? []) as unknown as Product[],
    newest: (newest.data ?? []) as unknown as Product[],
    offers,
    bestSellers,
    bestFromSales,
    promotions: (promos.data ?? []) as Promotion[],
    coupons: (coupons.data ?? []) as Coupon[],
  };
}
