import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/lib/services/store";
import { OrderTracker } from "@/components/tracking/order-tracker";
import type { Order, OrderStatusHistory, PaymentMethodConfig } from "@/types";

export const metadata: Metadata = { title: "Seguimiento del pedido" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string }> }) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  const session = await requireUser(`/pedidos/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  // RLS: solo el dueño (o un admin) puede leer el pedido
  const [{ data: order }, { data: history }, settings] = await Promise.all([
    supabase.from("orders").select("*, order_items(*), payments(*)").eq("id", id).eq("catalog", "store").maybeSingle(),
    supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at"),
    getStoreSettings(),
  ]);
  if (!order) notFound();
  const o = order as Order;
  let walletMethod: PaymentMethodConfig | null = null;
  if (o.payment_method === "yape" || o.payment_method === "plin") {
    const { data } = await supabase.from("payment_methods").select("*").eq("code", o.payment_method).maybeSingle();
    walletMethod = data as PaymentMethodConfig | null;
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <OrderTracker
        initialOrder={o}
        initialHistory={(history ?? []) as OrderStatusHistory[]}
        walletMethod={walletMethod}
        isNew={nuevo === "1"}
        confirmationMessage={settings?.order_confirmation_message ?? ""}
        userId={session.userId}
      />
    </div>
  );
}
