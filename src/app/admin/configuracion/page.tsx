import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { PaymentMethodsForm } from "@/components/admin/payment-methods-form";
import { DeliveryZones } from "@/components/admin/delivery-zones";
import { DemoPurge } from "@/components/admin/demo-purge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { DeliveryZone, PaymentMethodConfig, StoreSettings } from "@/types";

export const metadata: Metadata = { title: "Configuración" };

export default async function AdminSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const head = { count: "exact" as const, head: true };
  const [{ data: settings, error }, { data: methods }, { data: zones }, demoProducts, demoPromos, demoCoupons] = await Promise.all([
    supabase.from("store_settings").select("*").eq("id", 1).single(),
    supabase.from("payment_methods").select("*").order("sort_order"),
    supabase.from("delivery_zones").select("*").order("sort_order").order("name"),
    supabase.from("products").select("id", head).eq("catalog", "store").eq("is_demo", true),
    supabase.from("promotions").select("id", head).eq("is_demo", true),
    supabase.from("coupons").select("id", head).eq("catalog", "store").eq("is_demo", true),
  ]);
  if (error || !settings) return <p className="text-danger">No se pudo cargar la configuración: {error?.message}</p>;
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <section>
        <PageHeader title="Configuración del negocio" description="Datos visibles en la tienda, horario, delivery, mensajes y redes sociales." />
        <SettingsForm settings={settings as StoreSettings} />
      </section>
      <section>
        <PageHeader title="Métodos de pago" description="Efectivo, Yape y Plin con verificación manual. Los pagos con tarjeta aún no están habilitados." />
        <PaymentMethodsForm methods={(methods ?? []) as PaymentMethodConfig[]} />
      </section>
      <Card>
        <CardHeader><CardTitle>Zonas de reparto</CardTitle></CardHeader>
        <CardBody><DeliveryZones zones={(zones ?? []) as DeliveryZone[]} /></CardBody>
      </Card>
      <Card className="border-danger/40">
        <CardHeader><CardTitle>Datos de demostración</CardTitle></CardHeader>
        <CardBody><DemoPurge counts={{ products: demoProducts.count ?? 0, promotions: demoPromos.count ?? 0, coupons: demoCoupons.count ?? 0 }} /></CardBody>
      </Card>
    </div>
  );
}
