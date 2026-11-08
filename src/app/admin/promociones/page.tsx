import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CouponManager } from "@/components/admin/coupon-manager";
import { PromotionManager } from "@/components/admin/promotion-manager";
import { PageHeader } from "@/components/ui/page-header";
import type { Coupon, Promotion } from "@/types";

export const metadata: Metadata = { title: "Promociones" };

export default async function AdminPromotionsPage() {
  const supabase = await createSupabaseServerClient();
  const now = new Date().getTime();
  const [{ data: promos }, { data: coupons }, { data: products }, { data: categories }] = await Promise.all([
    supabase.from("promotions").select("*").order("created_at", { ascending: false }),
    supabase.from("coupons").select("*").eq("catalog", "store").order("created_at", { ascending: false }),
    supabase.from("products").select("id, name").eq("catalog", "store").order("name").limit(2000),
    supabase.from("categories").select("id, name, parent_id").eq("catalog", "store").order("sort_order"),
  ]);
  return (
    <div className="space-y-10">
      <section>
        <PageHeader title="Promociones" description="Ofertas automáticas: rebajan el precio de productos o categorías, o el total de compras desde un monto." />
        <PromotionManager
          promotions={(promos ?? []) as Promotion[]}
          products={products ?? []}
          categories={(categories ?? []).map((c) => ({ id: c.id, name: c.parent_id ? `↳ ${c.name}` : c.name }))}
          now={now}
        />
      </section>
      <section>
        <PageHeader title="Cupones" description="Códigos que el cliente ingresa en el carrito: porcentaje, monto fijo o delivery gratis, con fechas y límites de uso." />
        <CouponManager coupons={(coupons ?? []) as Coupon[]} now={now} />
      </section>
    </div>
  );
}
