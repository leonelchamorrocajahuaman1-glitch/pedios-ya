import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getMyOrders } from "@/lib/services/account";
import { OrderList } from "@/components/account/order-list";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = { title: "Mis pedidos" };

export default async function MyOrdersPage() {
  const orders = await getMyOrders();
  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const past = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));
  if (!orders.length) {
    return <EmptyState icon={<ClipboardList />} title="Aún no tienes pedidos" description="Cuando hagas tu primer pedido podrás seguirlo aquí." action={<Link href="/buscar" className={buttonStyles()}>Hacer un pedido</Link>} />;
  }
  return (
    <div className="space-y-8">
      {active.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">En curso</h2>
          <OrderList orders={active} />
        </section>
      )}
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Historial de compras</h2>
        {past.length ? <OrderList orders={past} /> : <p className="text-sm text-muted">Sin pedidos anteriores.</p>}
      </section>
    </div>
  );
}
