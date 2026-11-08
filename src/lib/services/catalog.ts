import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Category, Coupon, PlatformSettings, Product, Restaurant, Review } from "@/types";

const RESTAURANT_FIELDS = "*, is_open, restaurant_categories(category_id)";

/** Normaliza texto de búsqueda para usarlo de forma segura en filtros PostgREST. */
export function sanitizeQuery(q: string) {
  return q
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export async function getSettings(): Promise<PlatformSettings | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle();
  return data as PlatformSettings | null;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
  return data as Category | null;
}

export type RestaurantSort = "recommended" | "rating" | "delivery_time" | "delivery_fee";

export async function getRestaurants(opts: {
  categoryId?: string;
  q?: string;
  featured?: boolean;
  openOnly?: boolean;
  freeDelivery?: boolean;
  sort?: RestaurantSort;
  limit?: number;
} = {}): Promise<Restaurant[]> {
  const supabase = await createSupabaseServerClient();
  const select = opts.categoryId
    ? "*, is_open, restaurant_categories!inner(category_id)"
    : RESTAURANT_FIELDS;
  let query = supabase.from("restaurants").select(select).eq("status", "approved");

  if (opts.categoryId) query = query.eq("restaurant_categories.category_id", opts.categoryId);
  if (opts.featured) query = query.eq("is_featured", true);
  if (opts.freeDelivery) query = query.eq("delivery_fee", 0);

  const q = opts.q ? sanitizeQuery(opts.q) : "";
  if (q) {
    // Restaurantes cuyo nombre/descripcion coincide o que venden un producto que coincide
    const { data: productMatches } = await supabase
      .from("products")
      .select("restaurant_id")
      .ilike("name", `%${q}%`)
      .limit(200);
    const ids = [...new Set((productMatches ?? []).map((p) => p.restaurant_id as string))];
    const ors = [`name.ilike.%${q}%`, `description.ilike.%${q}%`, `district.ilike.%${q}%`];
    if (ids.length) ors.push(`id.in.(${ids.join(",")})`);
    query = query.or(ors.join(","));
  }

  switch (opts.sort) {
    case "rating":
      query = query.order("rating_avg", { ascending: false });
      break;
    case "delivery_time":
      query = query.order("delivery_time_min", { ascending: true });
      break;
    case "delivery_fee":
      query = query.order("delivery_fee", { ascending: true });
      break;
    default:
      query = query.order("is_featured", { ascending: false }).order("rating_avg", { ascending: false });
  }
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as unknown as Restaurant[];
  if (opts.openOnly) rows = rows.filter((r) => r.is_open);
  // Los abiertos primero, manteniendo el orden elegido
  return [...rows].sort((a, b) => Number(Boolean(b.is_open)) - Number(Boolean(a.is_open)));
}

export async function getRestaurantBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select(RESTAURANT_FIELDS)
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (!restaurant) return null;
  const [{ data: products }, { data: reviews }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("restaurant_id", (restaurant as Restaurant).id)
      .order("sort_order")
      .order("name"),
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at")
      .eq("restaurant_id", (restaurant as Restaurant).id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  return {
    restaurant: restaurant as unknown as Restaurant,
    products: (products ?? []) as Product[],
    reviews: (reviews ?? []) as Pick<Review, "id" | "rating" | "comment" | "created_at">[],
  };
}

export async function getPopularProducts(limit = 8): Promise<Product[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, restaurants!inner(id, slug, name, status)")
    .eq("is_popular", true)
    .eq("is_available", true)
    .eq("restaurants.status", "approved")
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function getPublicCoupons(): Promise<Coupon[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("coupons")
    .select("*")
    .eq("is_public", true)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(6);
  return (data ?? []) as Coupon[];
}
