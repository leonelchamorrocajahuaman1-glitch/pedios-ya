import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CourierApp, type CourierOrder } from "@/components/courier/courier-app";
import { findCourierByToken } from "@/lib/courier";
import { getSupabaseServiceClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Repartidor", robots: { index: false, follow: false } };

/** Enlace personal del repartidor (sin contraseña; el token es secreto y revocable por el admin). */
export default async function CourierPage({ params }: { params: Promise<{ token: string }> }) {
  if (!isServiceRoleConfigured()) {
    return <p className="p-8 text-center text-sm text-muted">Configura SUPABASE_SERVICE_ROLE_KEY para habilitar el módulo de repartidores.</p>;
  }
  const { token } = await params;
  const courier = await findCourierByToken(token);
  if (!courier) notFound();

  const { data } = await getSupabaseServiceClient()
    .from("orders")
    .select("id, code, status, delivery_address, delivery_district, delivery_reference, delivery_lat, delivery_lng, contact_phone, total, payment_method, payment_status, restaurants(name, address, phone), order_items(product_name, quantity)")
    .eq("courier_id", courier.id)
    .in("status", ["courier_assigned", "picked_up", "on_the_way"])
    .order("created_at");

  const orders: CourierOrder[] = (data ?? []).map((o) => ({
    ...(o as unknown as CourierOrder),
    restaurant: o.restaurants as unknown as CourierOrder["restaurant"],
    items: o.order_items as CourierOrder["items"],
  }));

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-5">
      <div className="mb-6 flex items-center justify-between">
        <Logo href="#" />
        <ThemeToggle />
      </div>
      <CourierApp token={token} name={courier.full_name} consent={courier.location_consent} available={courier.is_available} orders={orders} />
    </div>
  );
}
