import type { Metadata } from "next";
import { Ticket } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getPublicCoupons } from "@/lib/services/catalog";
import { CouponCard, couponHeadline } from "@/components/home/coupon-card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatPEN } from "@/lib/format";

export const metadata: Metadata = { title: "Mis cupones" };

export default async function CouponsPage() {
  const { userId } = await requireUser("/cuenta/cupones");
  const supabase = await createSupabaseServerClient();
  const [available, { data: used }] = await Promise.all([
    getPublicCoupons(),
    supabase
      .from("coupon_usages")
      .select("id, discount_amount, used_at, coupons(code, discount_type, discount_value), orders(code)")
      .eq("user_id", userId)
      .order("used_at", { ascending: false }),
  ]);
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 font-display text-xl font-bold">Cupones disponibles</h2>
        {available.length ? (
          <div className="grid gap-4 sm:grid-cols-2">{available.map((c) => <CouponCard key={c.id} coupon={c} />)}</div>
        ) : (
          <EmptyState icon={<Ticket />} title="No hay cupones disponibles" />
        )}
      </section>
      <section>
        <h2 className="mb-4 font-display text-xl font-bold">Cupones usados</h2>
        {used?.length ? (
          <ul className="divide-y divide-border rounded-3xl border border-border bg-surface">
            {used.map((u) => {
              const c = u.coupons as unknown as { code: string; discount_type: "percentage" | "fixed" | "free_delivery"; discount_value: number } | null;
              const o = u.orders as unknown as { code: string } | null;
              return (
                <li key={u.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <div>
                    <p className="font-mono font-bold">{c?.code}</p>
                    <p className="text-xs text-muted">{c && couponHeadline(c)} · Pedido {o?.code} · {formatDateTime(u.used_at)}</p>
                  </div>
                  <span className="font-semibold text-success">− {formatPEN(u.discount_amount)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aún no usaste cupones.</p>
        )}
      </section>
    </div>
  );
}
