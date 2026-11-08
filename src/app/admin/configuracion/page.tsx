import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/ui/page-header";
import { isMercadoPagoConfigured } from "@/lib/payments/mercadopago";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { isMapConfigured } from "@/lib/env";
import type { PlatformSettings } from "@/types";

export const metadata: Metadata = { title: "Configuración" };

export default async function AdminSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("platform_settings").select("*").eq("id", 1).single();
  const integrations = [
    { label: "Supabase service role", ok: isServiceRoleConfigured(), hint: "SUPABASE_SERVICE_ROLE_KEY · webhooks y enlaces de repartidor" },
    { label: "Mercado Pago (tarjetas)", ok: isMercadoPagoConfigured(), hint: "MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_WEBHOOK_SECRET" },
    { label: "Mapbox (mapas y geocodificación)", ok: isMapConfigured, hint: "NEXT_PUBLIC_MAPBOX_TOKEN" },
    { label: "URL pública del sitio", ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL), hint: "NEXT_PUBLIC_SITE_URL · usada en correos, webhooks y enlaces" },
  ];
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Configuración" description="Parámetros generales de la plataforma." />
      <SettingsForm settings={data as PlatformSettings} integrations={integrations} />
    </div>
  );
}
