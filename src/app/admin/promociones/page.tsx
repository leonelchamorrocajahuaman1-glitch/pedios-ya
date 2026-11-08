import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CouponManager } from "@/components/admin/coupon-manager";
import { PageHeader } from "@/components/ui/page-header";
import type { Coupon, Restaurant } from "@/types";

export const metadata: Metadata = { title: "Promociones" };

export default async function AdminPromotionsPage() {
  const supabase = await createSupabaseServerClient();
  const now = new Date().getTime();
  const [{ data }, { data: restaurants }] = await Promise.all([
    supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    supabase.from("restaurants").select("id, name").order("name"),
  ]);
  return (
    <div>
      <PageHeader title="Promociones y cupones" description="Descuentos porcentuales, por monto, envíos gratis, vigencias y límites de uso." />
      <CouponManager coupons={(data ?? []) as Coupon[]} restaurants={(restaurants ?? []) as Pick<Restaurant, "id" | "name">[]} now={now} />
    </div>
  );
}
