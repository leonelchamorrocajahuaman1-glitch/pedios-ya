import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Address, Order } from "@/types";

export async function getMyAddresses(): Promise<Address[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
  return (data ?? []) as Address[];
}

export async function getMyOrders(limit = 50): Promise<Order[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, code, status, fulfillment, payment_method, payment_status, total, created_at, order_items(id, product_name, product_image, quantity)")
    .eq("catalog", "store")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Order[];
}
