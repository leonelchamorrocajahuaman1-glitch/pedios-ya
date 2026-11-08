import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Address, Order, Review } from "@/types";

export async function getFavoriteIds(userId: string | undefined): Promise<string[]> {
  if (!userId) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("favorites").select("restaurant_id").eq("user_id", userId);
  return (data ?? []).map((f) => f.restaurant_id as string);
}

export async function getMyAddresses(): Promise<Address[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
  return (data ?? []) as Address[];
}

export async function getMyOrders(limit = 50): Promise<Order[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, restaurants(id, slug, name, logo_url), order_items(id, product_name, quantity), reviews(id, rating)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function getMyReviews(): Promise<Review[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("reviews")
    .select("*, restaurants(name, slug)")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .order("created_at", { ascending: false });
  return (data ?? []) as Review[];
}
