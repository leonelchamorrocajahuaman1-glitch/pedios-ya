import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CourierManager, type CourierRow } from "@/components/admin/courier-manager";
import { PageHeader } from "@/components/ui/page-header";
import type { Courier } from "@/types";

export const metadata: Metadata = { title: "Repartidores" };

export default async function AdminCouriersPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: stats }] = await Promise.all([
    supabase.from("couriers").select("*").order("created_at", { ascending: false }),
    supabase.rpc("admin_courier_stats"),
  ]);
  const map = new Map(((stats ?? []) as { courier_id: string; deliveries: number; active_orders: number; earnings: number }[]).map((s) => [s.courier_id, s]));
  const rows: CourierRow[] = ((data ?? []) as (Courier & { access_token_hash: string | null })[]).map(({ access_token_hash, ...c }) => ({
    ...c,
    has_link: Boolean(access_token_hash),
    deliveries: Number(map.get(c.id)?.deliveries ?? 0),
    active_orders: Number(map.get(c.id)?.active_orders ?? 0),
    earnings: Number(map.get(c.id)?.earnings ?? 0),
  }));
  return (
    <div>
      <PageHeader title="Repartidores" description="Registro, activación, entregas, ganancias y ubicación (solo con autorización del repartidor)." />
      <CourierManager couriers={rows} />
    </div>
  );
}
