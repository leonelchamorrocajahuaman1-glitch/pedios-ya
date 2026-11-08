import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { requireUser } from "@/lib/auth";
import { getMyAddresses } from "@/lib/services/account";
import { getPaymentMethods, getStoreSettings } from "@/lib/services/store";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Finalizar compra" };

export default async function CheckoutPage() {
  const session = await requireUser("/checkout");
  const [addresses, settings, methods] = await Promise.all([getMyAddresses(), getStoreSettings(), getPaymentMethods()]);
  if (!settings) return <EmptyState className="m-8" title="La tienda aún no está configurada" />;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">Finalizar compra</h1>
      {session.profile.status === "suspended" ? (
        <EmptyState title="Cuenta suspendida" description="No puedes realizar pedidos. Contáctanos." />
      ) : (
        <CheckoutForm
          userId={session.userId}
          addresses={addresses}
          settings={settings}
          methods={methods}
          defaultName={session.profile.full_name}
          defaultPhone={session.profile.phone ?? ""}
        />
      )}
    </div>
  );
}
