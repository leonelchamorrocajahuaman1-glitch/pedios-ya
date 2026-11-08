import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/services/catalog";
import { OrderTracker } from "@/components/tracking/order-tracker";
import { hasReview, type Order, type OrderStatusHistory } from "@/types";

export const metadata: Metadata = { title: "Seguimiento del pedido" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pago?: string }> }) {
  const { id } = await params;
  const { pago } = await searchParams;
  await requireUser(`/pedidos/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createSupabaseServerClient();
  // RLS: solo el dueño del pedido (o un admin) puede leerlo
  const [{ data: order }, { data: history }, settings] = await Promise.all([
    supabase
      .from("orders")
      .select("*, restaurants(id, slug, name, logo_url, lat, lng, address, phone, delivery_time_min, delivery_time_max), order_items(*), payments(*), reviews(id, rating)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at"),
    getSettings(),
  ]);
  if (!order) notFound();
  const o = order as Order;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <OrderTracker
        initialOrder={o}
        initialHistory={(history ?? []) as OrderStatusHistory[]}
        hasReview={hasReview(o)}
        paymentFlag={pago}
        settings={{
          yape_phone: settings?.yape_phone ?? null,
          plin_phone: settings?.plin_phone ?? null,
          wallet_holder_name: settings?.wallet_holder_name ?? null,
          support_phone: settings?.support_phone ?? null,
        }}
      />
    </div>
  );
}
