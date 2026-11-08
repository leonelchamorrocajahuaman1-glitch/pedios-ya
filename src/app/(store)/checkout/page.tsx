import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { requireUser } from "@/lib/auth";
import { getMyAddresses } from "@/lib/services/account";
import { getSettings } from "@/lib/services/catalog";
import { isMercadoPagoConfigured } from "@/lib/payments/mercadopago";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await requireUser("/checkout");
  const [addresses, settings] = await Promise.all([getMyAddresses(), getSettings()]);
  if (!settings) return <EmptyState className="m-8" title="Configuración no disponible" />;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">Finalizar pedido</h1>
      {session.profile.status === "suspended" ? (
        <EmptyState title="Cuenta suspendida" description="No puedes realizar pedidos. Contacta a soporte." />
      ) : (
        <CheckoutForm addresses={addresses} settings={settings} defaultPhone={session.profile.phone ?? ""} cardAvailable={isMercadoPagoConfigured()} />
      )}
    </div>
  );
}
